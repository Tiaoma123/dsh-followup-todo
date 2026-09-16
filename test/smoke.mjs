/**
 * dsh-followup-todo — 宿主半边冒烟测试。
 *
 * 全程在仓库内部运行：import lib/index.js 之前把 HOME 重定向到一个临时目录，
 * 所以插件写入的 ~/.dsh 数据目录和它创建的每个文件都留在仓库里，不碰仓库外
 * 任何东西，也不会碰到你真实的待办数据。
 *
 *   node test/smoke.mjs
 *
 * 覆盖：模块导出形状、工具注册、HTTP 路由注册、四个工具的完整生命周期、
 * 优先级排序、归档语义、工作区隔离、以及 5 个 HTTP 端点的请求/响应。
 */
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");

// ── 隔离：必须在 import 插件之前设置 ────────────────────────────────────────
const fakeHome = await mkdtemp(join(repo, ".smoke-home-"));
process.env.HOME = fakeHome;
process.env.USERPROFILE = fakeHome;

const mod = await import("../lib/index.js");

// ── 迷你测试框架 ───────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

async function t(label, fn) {
  try {
    const value = await fn();
    passed++;
    console.log("  ✅ " + label);
    return value;
  } catch (error) {
    failed++;
    console.log("  ❌ " + label);
    console.log("     " + (error && error.message ? error.message : String(error)));
  }
}

async function throws(fn, re) {
  let threw = false;
  try {
    await fn();
  } catch (error) {
    threw = true;
    if (re && !re.test(String(error && error.message))) {
      throw new Error("抛错了但信息不匹配：" + error.message);
    }
  }
  if (!threw) throw new Error("预期抛错但没抛");
}

// ── mock 宿主 ──────────────────────────────────────────────────────────────
const tools = new Map();
const routes = [];
const effectLabels = [];

const ctx = {
  effect(fn, label) {
    effectLabels.push(label);
    return fn();
  },
  tools: {
    register(tool) {
      if (tools.has(tool.name)) throw new Error("重复注册工具：" + tool.name);
      tools.set(tool.name, tool);
    }
  },
  webServer: {
    register(route) {
      routes.push(route);
    }
  }
};

// ── 假 HTTP 请求/响应 ──────────────────────────────────────────────────────
function fakeReq(method, url, body) {
  const req =
    body === undefined
      ? Readable.from([])
      : Readable.from([Buffer.from(JSON.stringify(body), "utf8")]);
  req.method = method;
  req.url = url;
  return req;
}

function fakeRes() {
  return {
    code: 0,
    raw: "",
    writeHead(code) {
      this.code = code;
    },
    end(body) {
      this.raw = body ?? "";
    },
    get json() {
      try {
        return JSON.parse(this.raw);
      } catch {
        return null;
      }
    }
  };
}

const execAt = (cwd) => ({ agent: { session: { header: { cwd } } } });
const WS_A = "/smoke/workspace-a";
const WS_B = "/smoke/workspace-b";

// ── 开始 ───────────────────────────────────────────────────────────────────
console.log("\n== 1. 模块导出与注册 ==");

await t("导出 name = followup-todo", () => {
  assert.equal(mod.name, "followup-todo");
});

await t("导出 apply 函数", () => {
  assert.equal(typeof mod.apply, "function");
});

await t("inject 声明 tools 与 webServer", () => {
  assert.deepEqual([...mod.inject].sort(), ["tools", "webServer"]);
});

await t("apply() 不抛错", () => {
  mod.apply(ctx);
});

await t("注册了 4 个模型工具", () => {
  assert.deepEqual(
    [...tools.keys()].sort(),
    ["todo_add", "todo_archive", "todo_done", "todo_list"]
  );
});

await t("注册了 1 条 HTTP 前缀路由 /followup-todos", () => {
  assert.equal(routes.length, 1);
  assert.equal(routes[0].kind, "prefix");
  assert.equal(routes[0].path, "/followup-todos");
  assert.equal(typeof routes[0].handler, "function");
});

const handler = routes[0].handler;

console.log("\n== 2. todo_add ==");

const addedA = await t("新增返回 id / title / priority / createdAt", async () => {
  const r = await tools.get("todo_add").execute(
    { title: "上线前检查发布清单", priority: "P1", context: "仓库已就绪", inject: "跑自检脚本" },
    execAt(WS_A)
  );
  assert.ok(r.id && typeof r.id === "string", "缺 id");
  assert.equal(r.title, "上线前检查发布清单");
  assert.equal(r.priority, "P1");
  assert.ok(typeof r.createdAt === "number" && r.createdAt > 0, "createdAt 异常");
  return r;
});

await t("空标题被拒绝", async () => {
  await throws(() => tools.get("todo_add").execute({ title: "   " }, execAt(WS_A)), /不能为空/);
});

await t("缺省优先级为 P2", async () => {
  const r = await tools.get("todo_add").execute({ title: "杂事" }, execAt(WS_A));
  assert.equal(r.priority, "P2");
});

await t("非法优先级被工具参数校验挡下（进不到 execute）", async () => {
  await throws(
    () => tools.get("todo_add").execute({ title: "怪优先级", priority: "P9" }, execAt(WS_A)),
    /priority/
  );
});

console.log("\n== 3. 落盘与工作区隔离 ==");

const dataFileA = join(fakeHome, ".dsh", "followup-todos-" + Buffer.from(WS_A).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") + ".json");

await t("数据文件写在 $HOME/.dsh/ 下", async () => {
  const s = await stat(dataFileA);
  assert.ok(s.isFile(), "不是文件");
});

await t("文件内容是可解析的 JSON 数组", async () => {
  const arr = JSON.parse(await readFile(dataFileA, "utf8"));
  assert.ok(Array.isArray(arr));
  // 本节共 4 次 add：成功 2 次（addedA、杂事），被校验拒绝 2 次（空标题、P9）
  assert.equal(arr.length, 2, "WS_A 应恰好 2 条，实际 " + arr.length);
  const one = arr.find((x) => x.id === addedA.id);
  assert.ok(one, "找不到刚加的条目");
  assert.equal(one.context, "仓库已就绪");
  assert.equal(one.inject, "跑自检脚本");
  assert.ok(one.prompt.includes("仓库已就绪"), "prompt 未包含 context");
  assert.ok(one.prompt.includes("跑自检脚本"), "prompt 未包含 inject");
});

await t("不同工作区写到不同文件（隔离）", async () => {
  await tools.get("todo_add").execute({ title: "B 区的活" }, execAt(WS_B));
  const listA = await tools.get("todo_list").execute({ filter: "all" }, execAt(WS_A));
  assert.ok(
    listA.items.every((x) => x.title !== "B 区的活"),
    "A 区看到了 B 区的条目"
  );
  const listB = await tools.get("todo_list").execute({ filter: "all" }, execAt(WS_B));
  assert.equal(listB.items.length, 1);
  assert.equal(listB.items[0].title, "B 区的活");
});

console.log("\n== 4. todo_list 排序与过滤 ==");

await t("按优先级排序：P0 → P3", async () => {
  const ws = "/smoke/sort-test";
  for (const p of ["P3", "P0", "P2", "P1"]) {
    await tools.get("todo_add").execute({ title: "排序-" + p, priority: p }, execAt(ws));
  }
  const { items } = await tools.get("todo_list").execute({ filter: "open" }, execAt(ws));
  assert.deepEqual(items.map((x) => x.priority), ["P0", "P1", "P2", "P3"]);
});

await t("filter=all 不含归档条目", async () => {
  const { items } = await tools.get("todo_list").execute({ filter: "all" }, execAt(WS_A));
  assert.ok(items.every((x) => !x.archived), "all 视图混入了归档条目");
});

console.log("\n== 5. todo_done / todo_archive ==");

const doneTarget = await tools.get("todo_add").execute({ title: "待标记完成" }, execAt(WS_A));

await t("todo_done 置 done 且条目仍在清单里", async () => {
  const r = await tools.get("todo_done").execute({ id: doneTarget.id }, execAt(WS_A));
  assert.equal(r.done, true);
  const { items } = await tools.get("todo_list").execute({ filter: "done" }, execAt(WS_A));
  assert.ok(items.some((x) => x.id === doneTarget.id), "done 视图里找不到它");
});

await t("todo_done 幂等", async () => {
  const r = await tools.get("todo_done").execute({ id: doneTarget.id }, execAt(WS_A));
  assert.equal(r.done, true);
});

await t("todo_done 未知 id 抛错", async () => {
  await throws(() => tools.get("todo_done").execute({ id: "t999-nope" }, execAt(WS_A)), /未找到待办/);
});

const archTarget = await tools.get("todo_add").execute({ title: "待归档" }, execAt(WS_A));

await t("todo_archive 移出 all/open/done 三个视图", async () => {
  const r = await tools.get("todo_archive").execute({ id: archTarget.id }, execAt(WS_A));
  assert.equal(r.archived, true);
  assert.equal(r.done, true);
  assert.ok(r.archivedAt > 0, "缺 archivedAt");
  for (const f of ["all", "open", "done"]) {
    const { items } = await tools.get("todo_list").execute({ filter: f }, execAt(WS_A));
    assert.ok(!items.some((x) => x.id === archTarget.id), f + " 视图里还能看到归档条目");
  }
});

await t("filter=archived 能回查归档条目", async () => {
  const { items } = await tools.get("todo_list").execute({ filter: "archived" }, execAt(WS_A));
  assert.ok(items.some((x) => x.id === archTarget.id), "archived 视图里找不到它");
});

await t("todo_archive 未知 id 抛错", async () => {
  await throws(() => tools.get("todo_archive").execute({ id: "t999-nope" }, execAt(WS_A)), /未找到待办/);
});

await t("空白 id 被 execute 内的守卫拒绝", async () => {
  await throws(() => tools.get("todo_done").execute({ id: "  " }, execAt(WS_A)), /id 不能为空/);
  await throws(() => tools.get("todo_archive").execute({ id: "  " }, execAt(WS_A)), /id 不能为空/);
});

await t("完全缺 id 被工具参数校验拒绝", async () => {
  await throws(() => tools.get("todo_archive").execute({}, execAt(WS_A)), /missing required property|required/);
});

console.log("\n== 6. HTTP 路由 ==");

const q = (path, ws) => path + "?ws=" + encodeURIComponent(ws);

await t("GET /list 返回该工作区的条目", async () => {
  const res = fakeRes();
  await handler(fakeReq("GET", q("/followup-todos/list", WS_B)), res);
  assert.equal(res.code, 200);
  assert.equal(res.json.ok, true);
  assert.ok(Array.isArray(res.json.items));
  assert.equal(res.json.items.length, 1);
});

await t("POST /add 新增成功", async () => {
  const res = fakeRes();
  await handler(fakeReq("POST", q("/followup-todos/add", WS_B), { title: "HTTP 新增", priority: "P0" }), res);
  assert.equal(res.code, 200);
  assert.equal(res.json.ok, true);
  assert.equal(res.json.item.title, "HTTP 新增");
  assert.equal(res.json.item.priority, "P0");
});

await t("POST /add 非法优先级回落到 P2", async () => {
  // HTTP 路径绕过 defineTool 的 schema 校验，这里才是插件内部守卫真正生效的地方
  const res = fakeRes();
  await handler(fakeReq("POST", q("/followup-todos/add", WS_B), { title: "HTTP 怪优先级", priority: "P9" }), res);
  assert.equal(res.code, 200);
  assert.equal(res.json.item.priority, "P2");
});

await t("POST /add 空标题返回 500 且带错误信息", async () => {
  const res = fakeRes();
  await handler(fakeReq("POST", q("/followup-todos/add", WS_B), { title: "" }), res);
  assert.equal(res.code, 500);
  assert.equal(res.json.ok, false);
  assert.ok(/不能为空/.test(res.json.error), "错误信息不对：" + res.json.error);
});

await t("POST /toggle 切换完成态", async () => {
  const list = fakeRes();
  await handler(fakeReq("GET", q("/followup-todos/list", WS_B)), list);
  const id = list.json.items[0].id;
  const res = fakeRes();
  await handler(fakeReq("POST", q("/followup-todos/toggle", WS_B), { id }), res);
  assert.equal(res.code, 200);
  assert.equal(res.json.ok, true);
  assert.equal(typeof res.json.done, "boolean");
});

await t("POST /toggle 未知 id 返回 404", async () => {
  const res = fakeRes();
  await handler(fakeReq("POST", q("/followup-todos/toggle", WS_B), { id: "nope" }), res);
  assert.equal(res.code, 404);
  assert.equal(res.json.ok, false);
});

await t("POST /archive 归档成功", async () => {
  const list = fakeRes();
  await handler(fakeReq("GET", q("/followup-todos/list", WS_B)), list);
  const id = list.json.items[0].id;
  const res = fakeRes();
  await handler(fakeReq("POST", q("/followup-todos/archive", WS_B), { id }), res);
  assert.equal(res.code, 200);
  assert.equal(res.json.item.archived, true);
});

await t("POST /archive 未知 id 返回 404", async () => {
  const res = fakeRes();
  await handler(fakeReq("POST", q("/followup-todos/archive", WS_B), { id: "nope" }), res);
  assert.equal(res.code, 404);
});

await t("POST /remove 删除条目", async () => {
  const list = fakeRes();
  await handler(fakeReq("GET", q("/followup-todos/list", WS_B)), list);
  const id = list.json.items[0].id;
  const res = fakeRes();
  await handler(fakeReq("POST", q("/followup-todos/remove", WS_B), { id }), res);
  assert.equal(res.code, 200);
  assert.equal(res.json.ok, true);
  const after = fakeRes();
  await handler(fakeReq("GET", q("/followup-todos/list", WS_B)), after);
  assert.ok(!after.json.items.some((x) => x.id === id), "条目没被删掉");
});

await t("未知端点返回 404", async () => {
  const res = fakeRes();
  await handler(fakeReq("GET", q("/followup-todos/nope", WS_B)), res);
  assert.equal(res.code, 404);
  assert.equal(res.json.error, "unknown endpoint");
});

await t("缺 ws 参数时回落到 default 键，不崩", async () => {
  const res = fakeRes();
  await handler(fakeReq("GET", "/followup-todos/list"), res);
  assert.equal(res.code, 200);
  assert.equal(res.json.ok, true);
});

await t("响应带 nosniff 语义的 content-type 与 no-store", async () => {
  const res = fakeRes();
  let headers = null;
  res.writeHead = (code, h) => {
    res.code = code;
    headers = h;
  };
  await handler(fakeReq("GET", q("/followup-todos/list", WS_B)), res);
  assert.ok(/application\/json/.test(headers["content-type"]));
  assert.equal(headers["cache-control"], "no-store");
});

console.log("\n== 7. 并发写入不丢数据 ==");

await t("10 条并发 add 全部落盘", async () => {
  const ws = "/smoke/concurrent";
  await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      tools.get("todo_add").execute({ title: "并发-" + i }, execAt(ws))
    )
  );
  const { items } = await tools.get("todo_list").execute({ filter: "all" }, execAt(ws));
  assert.equal(items.length, 10, "期望 10 条，实际 " + items.length);
});

console.log("\n== 8. 浏览器鉴权 ==");

/**
 * 另起一个带 connection 服务的 mock ctx：鉴权发生在 apply(ctx) 闭包内，
 * 必须重新 apply 才能拿到带鉴权的 handler。
 */
function makeCtxWithConnection(connection) {
  const t2 = new Map();
  const r2 = [];
  const c = {
    effect(fn) {
      return fn();
    },
    tools: {
      register(tool) {
        t2.set(tool.name, tool);
      }
    },
    webServer: {
      register(route) {
        r2.push(route);
      }
    },
    get(name) {
      return name === "connection" ? connection : undefined;
    }
  };
  mod.apply(c);
  return r2[0].handler;
}

await t("connection 服务缺席时放行（保持旧行为）", async () => {
  const h = makeCtxWithConnection(undefined);
  const res = fakeRes();
  await h(fakeReq("GET", q("/followup-todos/list", WS_B)), res);
  assert.equal(res.code, 200);
});

await t("requestRejection 返回 undefined 时放行", async () => {
  const h = makeCtxWithConnection({ requestRejection: () => undefined });
  const res = fakeRes();
  await h(fakeReq("GET", q("/followup-todos/list", WS_B)), res);
  assert.equal(res.code, 200);
});

await t("401 时拒绝并返回 unauthorized", async () => {
  const h = makeCtxWithConnection({ requestRejection: () => 401 });
  const res = fakeRes();
  await h(fakeReq("GET", q("/followup-todos/list", WS_B)), res);
  assert.equal(res.code, 401);
  assert.equal(res.raw, "unauthorized");
});

await t("403 时拒绝并返回 forbidden", async () => {
  const h = makeCtxWithConnection({ requestRejection: () => 403 });
  const res = fakeRes();
  await h(fakeReq("POST", q("/followup-todos/add", WS_B), { title: "不该被写入" }), res);
  assert.equal(res.code, 403);
  assert.equal(res.raw, "forbidden");
});

await t("鉴权失败时路由逻辑不执行（没写入任何数据）", async () => {
  const ws = "/smoke/auth-guard";
  const h = makeCtxWithConnection({ requestRejection: () => 401 });
  const res = fakeRes();
  await h(fakeReq("POST", q("/followup-todos/add", ws), { title: "不该被写入" }), res);
  assert.equal(res.code, 401);
  const list = fakeRes();
  await handler(fakeReq("GET", q("/followup-todos/list", ws)), list);
  assert.equal(list.json.items.length, 0, "鉴权失败却写入了数据");
});

await t("requestRejection 抛错时放行（不因鉴权异常把功能锁死）", async () => {
  const h = makeCtxWithConnection({
    requestRejection: () => {
      throw new Error("boom");
    }
  });
  const res = fakeRes();
  await h(fakeReq("GET", q("/followup-todos/list", WS_B)), res);
  assert.equal(res.code, 200);
});

// ── 收尾 ───────────────────────────────────────────────────────────────────
await rm(fakeHome, { recursive: true, force: true });

console.log("\n" + "─".repeat(52));
if (failed === 0) {
  console.log(`✅ 全部通过：${passed} 项`);
} else {
  console.log(`❌ ${failed} 项失败，${passed} 项通过`);
}
console.log("─".repeat(52) + "\n");
process.exit(failed === 0 ? 0 : 1);
