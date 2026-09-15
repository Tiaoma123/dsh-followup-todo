import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { defineTool } from "@deepseek-ai/dsh-tools";

const name = "followup-todo";
const inject = ["webServer", "tools"];
const DATA_DIR = join(homedir(), ".dsh");

/** 优先级档位：P0 最紧急 → P3 最低；新条目默认 P2。 */
const PRIORITIES = ["P0", "P1", "P2", "P3"];
const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };
const DEFAULT_PRIORITY = "P2";

function sendJson(res, code, value) {
  const body = JSON.stringify(value);
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}

function readJsonBody(req, cap = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > cap) { reject(new Error("body too large")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { reject(new Error("invalid JSON")); } });
    req.on("error", reject);
  });
}

/** 工作区绝对路径 → 文件名（与历史数据一致：base64(路径)，+/→-_，去 =） */
function keyOf(ws) {
  const s = typeof ws === "string" && ws.length > 0 ? ws : "default";
  try {
    return Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return String(s).replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 80);
  }
}

function fileOf(ws) {
  return join(DATA_DIR, `followup-todos-${keyOf(ws)}.json`);
}

function composePrompt(t) {
  const parts = [];
  if (t.title) parts.push("# 待办：" + t.title);
  if (t.context) parts.push("## 背景 / 上下文\n" + t.context);
  if (t.inject) parts.push("## 需要注入的内容\n" + t.inject);
  parts.push("请根据以上信息继续推进这项待办。");
  return parts.join("\n\n");
}

function normalize(t) {
  return {
    id: t.id,
    title: t.title,
    context: typeof t.context === "string" ? t.context : "",
    inject: typeof t.inject === "string" ? t.inject : "",
    prompt: typeof t.prompt === "string" ? t.prompt : composePrompt(t),
    done: !!t.done,
    priority: PRIORITY_RANK[t.priority] !== undefined ? t.priority : DEFAULT_PRIORITY,
    archived: !!t.archived,
    archivedAt: typeof t.archivedAt === "number" ? t.archivedAt : 0,
    createdAt: typeof t.createdAt === "number" ? t.createdAt : 0
  };
}

function nextId(list) {
  let max = 0;
  for (const t of list) {
    const m = /^t(\d+)-/.exec(t.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return "t" + (max + 1) + "-" + Date.now().toString(36);
}

async function loadList(ws) {
  try {
    const raw = await readFile(fileOf(ws), "utf8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((t) => t && typeof t.id === "string" && typeof t.title === "string").map(normalize);
  } catch {
    return [];
  }
}

async function saveList(ws, list) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(fileOf(ws), JSON.stringify(list), "utf8");
}

/** 每个工作区一条写链，串行化读-改-写，避免并发覆盖。 */
const chains = new Map();
function serialize(ws, fn) {
  const prev = chains.get(ws) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  chains.set(ws, next.catch(() => {}));
  return next;
}

async function addItem(ws, input) {
  return serialize(ws, async () => {
    const list = await loadList(ws);
    const title = (typeof input.title === "string" ? input.title : "").trim();
    if (!title) throw new Error("待办标题不能为空");
    const item = normalize({
      id: nextId(list),
      title,
      context: (typeof input.context === "string" ? input.context : "").trim(),
      inject: (typeof input.inject === "string" ? input.inject : "").trim(),
      priority: PRIORITY_RANK[input.priority] !== undefined ? input.priority : DEFAULT_PRIORITY,
      done: false,
      createdAt: Date.now()
    });
    list.push(item);
    await saveList(ws, list);
    return item;
  });
}

async function toggleItem(ws, id) {
  return serialize(ws, async () => {
    const list = await loadList(ws);
    const t = list.find((x) => x.id === id);
    if (!t) return null;
    t.done = !t.done;
    await saveList(ws, list);
    return t.done;
  });
}

async function removeItem(ws, id) {
  return serialize(ws, async () => {
    const list = await loadList(ws);
    await saveList(ws, list.filter((x) => x.id !== id));
  });
}

/** 标记某条为已完成（幂等；不存在返回 null）。 */
async function markDone(ws, id) {
  return serialize(ws, async () => {
    const list = await loadList(ws);
    const t = list.find((x) => x.id === id);
    if (!t) return null;
    t.done = true;
    await saveList(ws, list);
    return t;
  });
}

/** 完成并归档某条（移出活动清单，可经 filter=archived 查看；幂等；不存在返回 null）。 */
async function archiveItem(ws, id) {
  return serialize(ws, async () => {
    const list = await loadList(ws);
    const t = list.find((x) => x.id === id);
    if (!t) return null;
    t.done = true;
    t.archived = true;
    t.archivedAt = Date.now();
    await saveList(ws, list);
    return t;
  });
}

/** 工具执行时的工作区：显式 workspace 参数优先，否则取当前会话 cwd。 */
function wsOf(exec, args) {
  const ws = args && typeof args.workspace === "string" ? args.workspace.trim() : "";
  if (ws.length > 0) return ws;
  try {
    return exec?.agent?.session?.header?.cwd ?? "";
  } catch {
    return "";
  }
}

function apply(ctx) {
  ctx.effect(() => ctx.tools.register(defineTool({
    name: "todo_add",
    description: "在用户的「后续待办」清单里新增一条，记录这件事的相关上下文，以及稍后开新对话处理时需要注入的内容。当用户在对话中提出“这个后面再做 / 先记一下 / 待办 / 稍后处理”等希望稍后跟进的事项时调用。每条待办带 P0-P3 优先级标签（P0 最紧急，默认 P2）和加入时间。注意：这与 todo_write（Agent 拆解自己当前任务的步骤清单）不同，本工具面向“用户稍后要处理的事”。写入时按三点组织，让新会话读一遍就能直接推进：①携带上下文（context 只写已确定事实、结论、关键产物/文件路径、硬约束）；②指定新方向（inject 写清目标、下一步动作、期望产出、可检验的验收标准）；③结构化可执行（有歧义处显式标“待确认”，不写过程流水账）。",
    parameters: {
      title: { type: "string", required: true, description: "待办标题，一句话概括这件事。" },
      priority: { type: "string", enum: PRIORITIES, description: "优先级标签：P0 最紧急 / P1 高 / P2 中（默认）/ P3 低。" },
      context: { type: "string", description: "相关上下文：只写对后续有用的已确定事实——在讨论什么、已达成的结论、关键产物或文件路径、硬约束与边界；不要复述过程流水账。" },
      inject: { type: "string", description: "需要注入到新对话的内容：明确指定新方向——目标/使命一句话、下一步具体动作、期望产出物、可检验的验收标准；让新会话无需回查原对话、无需重新推导即可开工，有歧义处显式标“待确认”。" }
    },
    output: {
      schema: { type: "object", additionalProperties: false, properties: { id: { type: "string", required: true }, title: { type: "string", required: true }, priority: { type: "string", required: true }, createdAt: { type: "number", required: true } } },
      render: (_args, value) => [{ type: "text", text: "已新增待办：" + (value && value.title ? value.title : "") + (value && value.priority ? "（" + value.priority + "）" : "") }]
    },
    async execute(args, exec) {
      let ws = "";
      try { ws = exec?.agent?.session?.header?.cwd ?? ""; } catch {}
      const item = await addItem(ws, args ?? {});
      return { id: item.id, title: item.title, priority: item.priority, createdAt: item.createdAt };
    }
  })), "followup-todo: todo_add tool");

  ctx.effect(() => ctx.tools.register(defineTool({
    name: "todo_list",
    description: "读取用户的「后续待办」清单（todo_add 写入的条目）。默认列出当前会话工作区下未归档的全部待办（含已完成），可用 workspace 参数查其他工作区。filter：open=只看未完成（默认视图）；done=只看已完成；all=open+done（均不含归档）；archived=只看归档条目。返回的每条带 P0-P3 优先级（priority）和加入时间（createdAt）。新开对话的 agent 应先调用它了解有哪些待办，再决定推进哪一条；推进完成后用 todo_done 标记，并用 todo_archive 归档对应条目。注意：这不是 todo_write 的当前任务拆解清单。",
    parameters: {
      workspace: { type: "string", description: "工作区绝对路径；缺省用当前会话的工作区（cwd）。" },
      filter: { type: "string", enum: ["all", "open", "done", "archived"], description: "all=未归档全部（默认）；open=只看未完成；done=只看已完成；archived=只看归档条目。" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          workspace: { type: "string", required: true },
          items: {
            type: "array",
            required: true,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string", required: true },
                title: { type: "string", required: true },
                context: { type: "string", required: true },
                inject: { type: "string", required: true },
                prompt: { type: "string", required: true },
                done: { type: "boolean", required: true },
                priority: { type: "string", required: true },
                archived: { type: "boolean", required: true },
                archivedAt: { type: "number", required: true },
                createdAt: { type: "number", required: true }
              }
            }
          }
        }
      },
      render: (_args, value) => {
        const ws = value && typeof value.workspace === "string" ? value.workspace : "";
        const items = Array.isArray(value?.items) ? value.items : [];
        if (items.length === 0) return [{ type: "text", text: "待办清单为空" + (ws ? "（" + ws + "）" : "") }];
        const lines = items.map((t) => "- [" + (t.done ? "x" : " ") + "] [" + (t.priority || "?") + "] " + t.id + " " + t.title);
        return [{ type: "text", text: "待办清单" + (ws ? "（" + ws + "）" : "") + "：\n" + lines.join("\n") }];
      }
    },
    async execute(args, exec) {
      const ws = wsOf(exec, args);
      const filter = ["open", "done", "archived"].includes(args?.filter) ? args.filter : "all";
      let items = await loadList(ws);
      if (filter === "open") items = items.filter((t) => !t.done && !t.archived);
      else if (filter === "done") items = items.filter((t) => t.done && !t.archived);
      else if (filter === "archived") items = items.filter((t) => t.archived);
      else items = items.filter((t) => !t.archived);
      items = [...items].sort((a, b) => {
        if (filter === "archived") return (b.archivedAt || 0) - (a.archivedAt || 0);
        const pa = PRIORITY_RANK[a.priority] !== undefined ? PRIORITY_RANK[a.priority] : 9;
        const pb = PRIORITY_RANK[b.priority] !== undefined ? PRIORITY_RANK[b.priority] : 9;
        return pa - pb || (a.createdAt || 0) - (b.createdAt || 0);
      });
      return { workspace: ws, items };
    }
  })), "followup-todo: todo_list tool");

  ctx.effect(() => ctx.tools.register(defineTool({
    name: "todo_done",
    description: "把「后续待办」清单里的一条标记为已完成（条目仍留在清单里）。参数 id 来自 todo_list 返回的条目 id。任意会话的 agent 都可用它关闭已完成事项。完成一条待办的工作后，应随后调用 todo_archive 归档对应条目，把清单腾干净。",
    parameters: {
      id: { type: "string", required: true, description: "待办条目的 id（来自 todo_list）。" },
      workspace: { type: "string", description: "工作区绝对路径；缺省用当前会话的工作区（cwd）。" }
    },
    output: {
      schema: { type: "object", additionalProperties: false, properties: { id: { type: "string", required: true }, title: { type: "string", required: true }, done: { type: "boolean", required: true } } },
      render: (_args, value) => [{ type: "text", text: "已标记完成：" + (value && value.title ? value.title : "") }]
    },
    async execute(args, exec) {
      const ws = wsOf(exec, args);
      const id = typeof args?.id === "string" ? args.id.trim() : "";
      if (id.length === 0) throw new Error("id 不能为空");
      const t = await markDone(ws, id);
      if (t === null) throw new Error("未找到待办：" + id + (ws ? "（workspace: " + ws + "）" : ""));
      return { id: t.id, title: t.title, done: t.done };
    }
  })), "followup-todo: todo_done tool");

  ctx.effect(() => ctx.tools.register(defineTool({
    name: "todo_archive",
    description: "把一条待办标记为完成并归档：移出活动清单（todo_list 的 all/open/done 视图都不再显示），归档后可用 todo_list 的 filter=archived 查看。Agent 完成一条待办的工作后，必须调用本工具归档对应条目，保持清单只留未完成的事。",
    parameters: {
      id: { type: "string", required: true, description: "待办条目的 id（来自 todo_list）。" },
      workspace: { type: "string", description: "工作区绝对路径；缺省用当前会话的工作区（cwd）。" }
    },
    output: {
      schema: { type: "object", additionalProperties: false, properties: { id: { type: "string", required: true }, title: { type: "string", required: true }, done: { type: "boolean", required: true }, archived: { type: "boolean", required: true }, archivedAt: { type: "number", required: true } } },
      render: (_args, value) => [{ type: "text", text: "已归档：" + (value && value.title ? value.title : "") }]
    },
    async execute(args, exec) {
      const ws = wsOf(exec, args);
      const id = typeof args?.id === "string" ? args.id.trim() : "";
      if (id.length === 0) throw new Error("id 不能为空");
      const t = await archiveItem(ws, id);
      if (t === null) throw new Error("未找到待办：" + id + (ws ? "（workspace: " + ws + "）" : ""));
      return { id: t.id, title: t.title, done: t.done, archived: t.archived, archivedAt: t.archivedAt };
    }
  })), "followup-todo: todo_archive tool");

  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/followup-todos",
    handler: async (req, res) => {
      const url = new URL(req.url ?? "/", "http://x");
      const ws = url.searchParams.get("ws") ?? "";
      const ep = url.pathname;
      try {
        if (ep === "/followup-todos/list" && req.method === "GET") {
          return sendJson(res, 200, { ok: true, items: await loadList(ws) });
        }
        if (ep === "/followup-todos/add" && req.method === "POST") {
          const body = await readJsonBody(req);
          const item = await addItem(ws, body ?? {});
          return sendJson(res, 200, { ok: true, item });
        }
        if (ep === "/followup-todos/toggle" && req.method === "POST") {
          const body = await readJsonBody(req);
          const done = await toggleItem(ws, typeof body?.id === "string" ? body.id : "");
          if (done === null) return sendJson(res, 404, { ok: false, error: "not found" });
          return sendJson(res, 200, { ok: true, done });
        }
        if (ep === "/followup-todos/archive" && req.method === "POST") {
          const body = await readJsonBody(req);
          const item = await archiveItem(ws, typeof body?.id === "string" ? body.id : "");
          if (item === null) return sendJson(res, 404, { ok: false, error: "not found" });
          return sendJson(res, 200, { ok: true, item });
        }
        if (ep === "/followup-todos/remove" && req.method === "POST") {
          const body = await readJsonBody(req);
          await removeItem(ws, typeof body?.id === "string" ? body.id : "");
          return sendJson(res, 200, { ok: true });
        }
        return sendJson(res, 404, { ok: false, error: "unknown endpoint" });
      } catch (error) {
        return sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }), "followup-todo: /followup-todos routes");
}

export { name, inject, apply };
