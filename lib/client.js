window.__ModuleLoader__.load({
  id: "dsh-followup-todo",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const react = require("react");
    const h = react.createElement;

    // ═══════════════════════════════════════════════════════════════
    // 后续待办 · 0.1.5 客户端插件
    //
    // 数据完全走 host 的 /followup-todos 五个 HTTP 路由（永久插件没有
    // host.call 特权通道），文件名 key 由 host 用 base64url(cwd) 决定，
    // 前端只负责把 cwd 传过去 —— 因此 3 + 35 条历史数据天然可读。
    //
    // 落点：
    //   · conversation.session.header.utilities —— 会话标题栏「待办」按钮 + 弹出面板（CRUD + 切工作区）
    //   · conversation.input.dock              —— 输入框上方待办条（跟随当前会话工作区）
    // 注：文档里的 "conversation-todo-dock" 实测不是槽位名，而是官方 TodoDock
    // 插件条目名，它注册的真实槽位是 conversation.input.dock（kind: list）。
    //
    // 「注入」默认只把 inject/prompt 写进输入框，**不发送**；想立即开跑用
    // 单独的「注入并发送」。自动发送会误触发一整轮 Agent 调用，代价太高。
    // ═══════════════════════════════════════════════════════════════

    const NS = "dsh-followup-todo";
    const PRIORITY_OPTIONS = ["P0", "P1", "P2", "P3"];

    const zh = {
      "btn.title": "后续待办清单",
      "btn.label": "待办",
      "panel.title": "后续待办",
      "panel.add": "＋ 新增",
      "panel.cancel": "取消",
      "panel.close": "关闭",
      "filter.open": "待办",
      "filter.done": "已完成",
      "filter.archived": "归档",
      "filter.all": "全部",
      "ws.label": "工作区",
      "empty.open": "暂无待办。点「＋ 新增」手动加，或在对话里说“先记一下”由我记录。",
      "empty.done": "暂无已完成条目。",
      "empty.archived": "暂无归档条目。",
      "empty.all": "这个工作区还没有任何待办。",
      "form.title": "标题",
      "form.context": "相关上下文（可选）",
      "form.inject": "需要注入的内容（可选）",
      "form.priority": "优先级",
      "form.submit": "添加",
      "form.busy": "…",
      "item.inject": "注入输入框",
      "item.send": "注入并发送",
      "item.expand": "点击展开 / 收起全文",
      "item.done": "标记完成",
      "item.undone": "取消完成",
      "item.archive": "完成并归档",
      "item.remove": "删除",
      "time.created": "加入 {t}",
      "time.archived": "归档 {t}",
      "strip.title": "待办 · 点一条注入输入框",
      "strip.more": "还有 {n} 条",
      "err.auth": "未授权：请刷新页面重新登录",
      "err.net": "读取待办失败：{e}"
    };
    const en = {
      "btn.title": "Follow-up todo list",
      "btn.label": "Todo",
      "panel.title": "Follow-up todos",
      "panel.add": "＋ New",
      "panel.cancel": "Cancel",
      "panel.close": "Close",
      "filter.open": "Open",
      "filter.done": "Done",
      "filter.archived": "Archived",
      "filter.all": "All",
      "ws.label": "Workspace",
      "empty.open": "No open todos. Use “＋ New”, or tell me “note this down”.",
      "empty.done": "No completed entries.",
      "empty.archived": "No archived entries.",
      "empty.all": "This workspace has no todos yet.",
      "form.title": "Title",
      "form.context": "Context (optional)",
      "form.inject": "Content to inject (optional)",
      "form.priority": "Priority",
      "form.submit": "Add",
      "form.busy": "…",
      "item.inject": "Fill composer",
      "item.send": "Fill & send",
      "item.expand": "Click to expand / collapse",
      "item.done": "Mark done",
      "item.undone": "Mark not done",
      "item.archive": "Complete & archive",
      "item.remove": "Delete",
      "time.created": "added {t}",
      "time.archived": "archived {t}",
      "strip.title": "Todos · click to fill the composer",
      "strip.more": "{n} more",
      "err.auth": "Unauthorized: reload the page to sign in",
      "err.net": "Failed to load todos: {e}"
    };

    const CSS = `
.ft2-root{position:relative;display:inline-flex;align-items:center}
.ft2-btn{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 9px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);border-radius:8px;font-size:12px;line-height:1;cursor:pointer;font-family:inherit;white-space:nowrap}
.ft2-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.ft2-btn[aria-expanded=true]{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}
.ft2-badge{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:999px;font-size:11px;padding:0 6px;line-height:15px;min-width:16px;text-align:center;font-variant-numeric:tabular-nums}
.ft2-badge-hot{color:var(--dsw-alias-state-error-primary);border-color:currentColor}
.ft2-panel{position:fixed;z-index:2147483000;width:min(460px,calc(100vw - 24px));max-height:min(76vh,640px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay,var(--dsw-specific-menu,#fff));border:1px solid var(--dsw-alias-border-inverted,rgba(0,0,0,.14));border-radius:12px;box-shadow:var(--dsw-shadow-lv3,0 10px 34px rgba(0,0,0,.25));color:var(--dsw-alias-label-primary);overflow:hidden;font-size:13px;line-height:1.45;font-family:inherit;text-align:left}
.ft2-head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}
.ft2-title{font-weight:600;font-size:14px}
.ft2-head .ft2-spacer{flex:1}
.ft2-mini{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;padding:2px 8px;cursor:pointer;font-size:11px;font-family:inherit;line-height:18px}
.ft2-mini:hover{color:var(--dsw-alias-brand-primary);border-color:currentColor}
.ft2-mini-on{color:var(--dsw-alias-brand-primary);border-color:currentColor;font-weight:600}
.ft2-tabs{display:flex;gap:4px;padding:8px 12px 0;flex-wrap:wrap}
.ft2-ws{display:flex;align-items:center;gap:6px;padding:8px 12px 0;font-size:11px;color:var(--dsw-alias-label-secondary)}
.ft2-select{flex:1;min-width:0;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);border-radius:6px;padding:3px 6px;font-size:11px;font-family:inherit}
.ft2-form{padding:10px 12px;display:flex;flex-direction:column;gap:6px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.ft2-input,.ft2-textarea{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);border-radius:6px;padding:6px 8px;font-size:12px;font-family:inherit;box-sizing:border-box;width:100%}
.ft2-textarea{resize:vertical;min-height:42px}
.ft2-formrow{display:flex;gap:6px;justify-content:flex-end}
.ft2-priopick{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.ft2-priobtn{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:4px;padding:1px 7px;font-size:11px;cursor:pointer;font-family:inherit;line-height:16px}
.ft2-list{overflow:auto;flex:1;min-height:0}
.ft2-empty{padding:14px 12px;color:var(--dsw-alias-label-secondary);font-size:12px}
.ft2-err{margin:8px 12px 0;padding:6px 8px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);font-size:11px}
.ft2-item{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.ft2-item:last-child{border-bottom:none}
.ft2-body{flex:1;min-width:0}
.ft2-title-row{display:flex;align-items:flex-start;gap:6px;min-width:0}
/* 标题独占整行宽度、允许两行 —— 之前和四个文字按钮挤一行，标题被压成 2~5 个字 */
.ft2-item-title{flex:1;min-width:0;font-weight:500;line-height:1.4;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ft2-item-done .ft2-item-title{text-decoration:line-through;color:var(--dsw-alias-label-secondary)}
.ft2-prio{display:inline-block;border:1px solid;border-radius:4px;padding:0 5px;font-size:10px;line-height:15px;font-weight:700;flex:0 0 auto;white-space:nowrap;margin-top:1px}
.ft2-p0{color:var(--dsw-alias-state-error-primary)}
.ft2-p1{color:var(--dsw-alias-state-warn-primary)}
.ft2-p2{color:var(--dsw-alias-brand-primary)}
.ft2-p3{color:var(--dsw-alias-label-secondary)}
.ft2-priobtn-on.ft2-p0{color:var(--dsw-alias-state-error-primary);border-color:currentColor;font-weight:700}
.ft2-priobtn-on.ft2-p1{color:var(--dsw-alias-state-warn-primary);border-color:currentColor;font-weight:700}
.ft2-priobtn-on.ft2-p2{color:var(--dsw-alias-brand-primary);border-color:currentColor;font-weight:700}
.ft2-priobtn-on.ft2-p3{color:var(--dsw-alias-label-primary);border-color:currentColor;font-weight:700}
/* 上下文/注入：默认 3 行，点一下展开全文（旧版是固定 2 行截断，读不全） */
.ft2-meta{color:var(--dsw-alias-label-secondary);font-size:11px;margin-top:3px;line-height:1.5;word-break:break-word;white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;cursor:pointer}
.ft2-meta:hover{color:var(--dsw-alias-label-primary)}
.ft2-meta-open{display:block;-webkit-line-clamp:unset;overflow:visible}
.ft2-meta-inject{color:var(--dsw-alias-label-tertiary)}
.ft2-time{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:10px;margin-top:3px;font-variant-numeric:tabular-nums}
/* 操作另起一行，不再抢标题的宽度 */
.ft2-actions{display:flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:flex-end;margin-top:6px}
.ft2-act{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;padding:1px 7px;cursor:pointer;font-size:11px;font-family:inherit;white-space:nowrap;line-height:17px}
.ft2-act:hover{color:var(--dsw-alias-brand-primary);border-color:currentColor}
.ft2-act-danger:hover{color:var(--dsw-alias-state-error-primary)}
.ft2-check{flex:0 0 auto;width:16px;height:16px;margin-top:2px;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:transparent;cursor:pointer;color:var(--dsw-alias-label-primary-foreground,var(--dsw-alias-brand-primary));font-size:11px;line-height:1;padding:0;display:grid;place-items:center;font-family:inherit}
.ft2-check-on{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.ft2-strip{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance,16px) - var(--dsh-composer-side-clearance,16px));max-width:var(--dsh-composer-card-max-width,780px);margin:0 auto;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-tip,var(--dsw-alias-bg-layer-1));border-radius:12px;overflow:hidden;font-family:inherit;text-align:left;order:99}
.ft2-strip-head{display:flex;align-items:center;gap:8px;width:100%;padding:5px 12px;background:transparent;border:none;cursor:pointer;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:22px;text-align:left}
.ft2-strip-lead{color:var(--dsw-alias-label-tertiary);flex:none;display:grid;place-items:center}
.ft2-strip-count{min-width:0;flex:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* 默认展开、全部列出、可滚动 —— 旧版就是这么铺开的 */
.ft2-strip-list{display:flex;flex-direction:column;gap:6px;max-height:min(42vh,360px);overflow-y:auto;margin:0;padding:0 12px 8px;list-style:none;scrollbar-width:thin}
.ft2-note-row{display:flex;align-items:stretch;gap:4px}
.ft2-note{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;box-sizing:border-box;text-align:left;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-left:3px solid var(--dsw-alias-brand-primary);border-radius:8px;padding:6px 10px;cursor:pointer;font-family:inherit;color:var(--dsw-alias-label-primary);font-size:13px}
.ft2-note:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.ft2-note-send{flex:none;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:8px;padding:0 9px;cursor:pointer;font-size:13px;font-family:inherit}
.ft2-note-send:hover{color:var(--dsw-alias-brand-primary);border-color:currentColor}
.ft2-note-head{display:flex;align-items:flex-start;gap:6px;min-width:0}
/* 标题最多两行铺满，不用横向省略号（"显示不全"的另一半原因） */
.ft2-note-title{flex:1;min-width:0;font-weight:500;line-height:1.35;white-space:normal;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ft2-note-ctx{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.ft2-caret{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:1;transition:transform .15s ease}
.ft2-caret-open{transform:rotate(180deg)}
`;

    let styleInjected = false;
    function injectStyles() {
      if (styleInjected) return;
      styleInjected = true;
      const el = document.createElement("style");
      el.dataset.plugin = "dsh-followup-todo";
      el.textContent = CSS;
      document.head.appendChild(el);
    }

    // ── 纯函数 ──────────────────────────────────────────────────────
    function interp(s, p) {
      return String(s).replace(/\{(\w+)\}/g, (m, k) => (p !== undefined && k in p ? String(p[k]) : m));
    }
    function makeT(props) {
      if (props && typeof props.t === "function") return props.t;
      return (k, p) => interp(zh[k] !== undefined ? zh[k] : k, p);
    }
    function fmtTime(ms) {
      if (!ms || typeof ms !== "number") return "";
      const d = new Date(ms);
      const p = (n) => String(n).padStart(2, "0");
      return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
    }
    function prioClass(p) {
      return { P0: "ft2-p0", P1: "ft2-p1", P2: "ft2-p2", P3: "ft2-p3" }[p] || "ft2-p2";
    }
    function sortItems(items, filter) {
      const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return [...items].sort((a, b) => {
        if (filter === "archived") return (b.archivedAt || 0) - (a.archivedAt || 0);
        const pa = rank[a.priority] !== undefined ? rank[a.priority] : 9;
        const pb = rank[b.priority] !== undefined ? rank[b.priority] : 9;
        return pa - pb || (a.createdAt || 0) - (b.createdAt || 0);
      });
    }
    function visibleItems(items, filter) {
      if (filter === "open") return sortItems(items.filter((t) => !t.done && !t.archived), filter);
      if (filter === "done") return sortItems(items.filter((t) => t.done && !t.archived), filter);
      if (filter === "archived") return sortItems(items.filter((t) => t.archived), filter);
      return sortItems(items.filter((t) => !t.archived), filter);
    }
    function promptOf(item) {
      return item.prompt || item.inject || item.title || "";
    }
    /** 把 prompt 填进输入框（不发送）。 */
    function fillDraft(props, item) {
      try {
        const actions = props && props.inputActions;
        if (!actions || typeof actions.setDraft !== "function") return false;
        actions.setDraft(promptOf(item));
        return true;
      } catch (err) {
        return false;
      }
    }
    /** 填入并立即发送（真要开跑时才用；误触会触发一整轮 Agent 调用）。 */
    function fillAndSend(props, item) {
      if (!fillDraft(props, item)) return false;
      try {
        const actions = props && props.inputActions;
        if (typeof actions.submit === "function") actions.submit();
        return true;
      } catch (err) {
        return false;
      }
    }

    // ── 共享数据源：按工作区分片缓存，一个轮询刷全部 ──────────────────
    // 两个槽位各读自己那一份，互不抢 cwd（面板可切工作区，待办条只跟会话）。
    function createStore() {
      const cache = new Map(); // cwd -> { items, loaded, error }
      const subs = new Set();
      const inflight = new Set();
      const EMPTY = { items: [], loaded: false, error: "" };
      // 只认绝对路径：空串/undefined/"null" 之类一律不发请求，避免在 ~/.dsh 里
      // 造出 followup-todos-<base64("null")>.json 这种垃圾文件。
      const validWs = (cwd) => typeof cwd === "string" && cwd.charAt(0) === "/" && cwd.length > 1;
      const sliceOf = (cwd) => (typeof cwd === "string" && cache.has(cwd) ? cache.get(cwd) : EMPTY);
      const emit = () => {
        for (const fn of [...subs]) {
          try {
            fn();
          } catch (err) {
            /* 单个订阅者出错不影响其他订阅者 */
          }
        }
      };
      function load(cwd) {
        if (!validWs(cwd) || inflight.has(cwd)) return;
        inflight.add(cwd);
        fetch("/followup-todos/list?ws=" + encodeURIComponent(cwd), {
          method: "GET",
          headers: { accept: "application/json" },
          cache: "no-store",
          credentials: "same-origin"
        })
          .then(async (r) => {
            if (r.status === 401 || r.status === 403) throw new Error("__auth__");
            const j = await r.json().catch(() => null);
            if (!j || j.ok !== true || !Array.isArray(j.items)) throw new Error("bad response");
            cache.set(cwd, { items: j.items, loaded: true, error: "" });
          })
          .catch((e) => {
            const msg = String((e && e.message) || e);
            const prev = sliceOf(cwd);
            cache.set(cwd, { items: prev.items, loaded: prev.loaded, error: msg === "__auth__" ? "__auth__" : msg });
          })
          .then(() => {
            inflight.delete(cwd);
            emit();
          });
      }
      function post(cwd, path, body) {
        if (!validWs(cwd)) return Promise.resolve(null);
        return fetch(path + "?ws=" + encodeURIComponent(cwd), {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify(body || {}),
          credentials: "same-origin"
        })
          .then((r) => r.json().catch(() => null))
          .then(() => load(cwd))
          .catch(() => {});
      }
      return {
        subscribe(fn) {
          subs.add(fn);
          return () => subs.delete(fn);
        },
        slice: sliceOf,
        /** 首次用到某个工作区时登记并拉取。 */
        touch(cwd) {
          if (!validWs(cwd) || cache.has(cwd)) return;
          cache.set(cwd, { items: [], loaded: false, error: "" });
          load(cwd);
        },
        reloadAll() {
          for (const cwd of cache.keys()) load(cwd);
        },
        add(cwd, input) {
          return post(cwd, "/followup-todos/add", input);
        },
        toggle(cwd, id) {
          return post(cwd, "/followup-todos/toggle", { id });
        },
        archive(cwd, id) {
          return post(cwd, "/followup-todos/archive", { id });
        },
        remove(cwd, id) {
          return post(cwd, "/followup-todos/remove", { id });
        }
      };
    }

    /** 订阅共享 store 的某个工作区分片。 */
    function useTodos(store, cwd) {
      const [, bump] = react.useState(0);
      react.useEffect(() => store.subscribe(() => bump((n) => n + 1)), [store]);
      react.useEffect(() => {
        store.touch(cwd);
      }, [store, cwd]);
      return store.slice(cwd);
    }

    /** 会话工作区：0.1.5 的标准取法（useSessions 的 byId[sessionId].cwd）。 */
    function cwdOf(props) {
      try {
        const useSessions = props && props.useSessions;
        const sessionId = props && props.sessionId;
        if (typeof useSessions !== "function" || sessionId === undefined) return "";
        return useSessions((s) => (s && s.byId ? s.byId[sessionId] && s.byId[sessionId].cwd : "")) || "";
      } catch (err) {
        return "";
      }
    }

    /**
     * 是否「新对话」（空白会话）：旧版 HeroNotes 只在空白会话页显示待办便签，
     * 已有会话里不占位（那里用标题栏的「待办」按钮 + 面板）。
     * sessionId 缺失或该会话还没进列表时，按新对话处理。
     */
    function isBlankSession(props) {
      try {
        const useSessions = props && props.useSessions;
        const sessionId = props && props.sessionId;
        if (typeof useSessions !== "function" || sessionId === undefined) return true;
        return (
          useSessions((s) => {
            if (!s || !s.byId) return true;
            const row = s.byId[sessionId];
            return row === undefined ? true : row.blank === true;
          }) === true
        );
      } catch (err) {
        return true;
      }
    }

    /** 侧栏最近使用的工作区路径（旧版 HeroNotes 就是靠它在新会话页显示待办的）。 */
    function recentWorkspacePath(props) {
      try {
        const useWorkspaces = props && props.useWorkspaces;
        if (typeof useWorkspaces !== "function") return "";
        return (
          useWorkspaces((s) => {
            if (!s || !Array.isArray(s.items)) return "";
            const id = s.recentWorkspaceId;
            if (id === undefined) return "";
            const it = s.items.find((w) => w && w.id === id);
            return it && typeof it.path === "string" ? it.path : "";
          }) || ""
        );
      } catch (err) {
        return "";
      }
    }

    /**
     * 生效工作区：优先当前会话 cwd，新会话（还没绑工作区）时退回侧栏最近工作区。
     * 否则在一个未提交过消息的新会话里，待办会整块不显示 —— 旧版正是用最近工作区兜住的。
     */
    function useEffectiveCwd(props) {
      const sessionCwd = cwdOf(props);
      const recent = recentWorkspacePath(props);
      return sessionCwd !== "" ? sessionCwd : recent;
    }

    /** 工作区下拉项：生效工作区 + 侧栏已知工作区。 */
    function useWorkspaceOptions(props, primaryCwd) {
      const list = (() => {
        try {
          const useWorkspaces = props && props.useWorkspaces;
          if (typeof useWorkspaces !== "function") return [];
          return useWorkspaces((s) => (s && Array.isArray(s.items) ? s.items : [])) || [];
        } catch (err) {
          return [];
        }
      })();
      const seen = new Set();
      const out = [];
      if (primaryCwd !== "") {
        out.push({ path: primaryCwd, label: primaryCwd });
        seen.add(primaryCwd);
      }
      for (const w of list) {
        const p = w && typeof w.path === "string" ? w.path : w && typeof w.cwd === "string" ? w.cwd : "";
        if (p === "" || seen.has(p)) continue;
        seen.add(p);
        out.push({ path: p, label: p });
      }
      return out;
    }

    function useAnchoredPlacement(open, anchorRef, width) {
      const [pos, setPos] = react.useState(null);
      react.useEffect(() => {
        if (!open) {
          setPos(null);
          return undefined;
        }
        const place = () => {
          const el = anchorRef.current;
          if (el === null) return;
          const r = el.getBoundingClientRect();
          const w = Math.min(width, window.innerWidth - 24);
          const left = Math.max(12, Math.min(r.right - w, window.innerWidth - w - 12));
          setPos({ left: left, top: Math.min(r.bottom + 8, Math.max(12, window.innerHeight - 200)) });
        };
        place();
        window.addEventListener("resize", place);
        return () => window.removeEventListener("resize", place);
      }, [open, anchorRef, width]);
      return pos;
    }

    function useDismiss(open, setOpen, rootRef) {
      react.useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
          const root = rootRef.current;
          if (root !== null && root.contains(e.target)) return;
          if (e.target instanceof Element && e.target.closest(".ft2-panel") !== null) return;
          setOpen(false);
        };
        const onKey = (e) => {
          if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", onDown, true);
        document.addEventListener("keydown", onKey);
        return () => {
          document.removeEventListener("pointerdown", onDown, true);
          document.removeEventListener("keydown", onKey);
        };
      }, [open, setOpen, rootRef]);
    }

    // ── 组件工厂（身份在 apply 闭包中固定一次） ──────────────────────
    function makeComponents(store) {
      function AddForm(props) {
        const t = props.t;
        const cwd = props.cwd;
        const [title, setTitle] = react.useState("");
        const [context, setContext] = react.useState("");
        const [inject, setInject] = react.useState("");
        const [prio, setPrio] = react.useState("P2");
        const [busy, setBusy] = react.useState(false);
        const submit = () => {
          const value = title.trim();
          if (value === "" || busy) return;
          setBusy(true);
          store.add(cwd, { title: value, context: context, inject: inject, priority: prio }).then(() => {
            setTitle("");
            setContext("");
            setInject("");
            setPrio("P2");
            setBusy(false);
            props.onDone();
          });
        };
        return h(
          "div",
          { className: "ft2-form" },
          h("input", { className: "ft2-input", placeholder: t("form.title"), value: title, onChange: (e) => setTitle(e.target.value), onKeyDown: (e) => { if (e.key === "Enter") submit(); } }),
          h(
            "div",
            { className: "ft2-priopick" },
            h("span", null, t("form.priority")),
            PRIORITY_OPTIONS.map((p) => h("button", { key: p, type: "button", className: "ft2-priobtn " + prioClass(p) + (prio === p ? " ft2-priobtn-on" : ""), onClick: () => setPrio(p) }, p))
          ),
          h("textarea", { className: "ft2-textarea", placeholder: t("form.context"), value: context, onChange: (e) => setContext(e.target.value) }),
          h("textarea", { className: "ft2-textarea", placeholder: t("form.inject"), value: inject, onChange: (e) => setInject(e.target.value) }),
          h(
            "div",
            { className: "ft2-formrow" },
            h("button", { type: "button", className: "ft2-mini ft2-mini-on", disabled: busy, onClick: submit }, busy ? t("form.busy") : t("form.submit")),
            h("button", { type: "button", className: "ft2-mini", onClick: () => props.onDone() }, t("panel.cancel"))
          )
        );
      }

      function TodoItem(props) {
        const t = props.t;
        const item = props.item;
        const cwd = props.cwd;
        const archived = item.archived === true;
        // 正文默认 3 行，点一下看全文（旧版固定 2 行截断，长 context 读不全）
        const [open, setOpen] = react.useState(false);
        const metaCls = "ft2-meta" + (open ? " ft2-meta-open" : "");
        const toggleMeta = () => setOpen(!open);
        return h(
          "div",
          {
            className: "ft2-item" + (item.done && !archived ? " ft2-item-done" : ""),
            "data-ft2-item": item.id,
            "data-ft2-done": String(item.done === true),
            "data-ft2-archived": String(archived),
            "data-ft2-open": String(open)
          },
          archived
            ? null
            : h(
                "button",
                {
                  type: "button",
                  className: "ft2-check" + (item.done ? " ft2-check-on" : ""),
                  title: item.done ? t("item.undone") : t("item.done"),
                  "aria-pressed": item.done === true,
                  "data-ft2-act": "toggle",
                  onClick: () => store.toggle(cwd, item.id)
                },
                item.done ? "✓" : ""
              ),
          h(
            "div",
            { className: "ft2-body" },
            // 标题独占一行（可折两行）+ 优先级徽标；操作按钮挪到下面单独一行，
            // 不再和标题抢宽度把标题挤成两三个字。
            h(
              "div",
              { className: "ft2-title-row" },
              h("span", { className: "ft2-item-title", title: item.title }, item.title),
              h("span", { className: "ft2-prio " + prioClass(item.priority) }, item.priority || "P2")
            ),
            h("div", { className: "ft2-time" }, archived ? t("time.archived", { t: fmtTime(item.archivedAt) }) : t("time.created", { t: fmtTime(item.createdAt) })),
            item.context ? h("div", { className: metaCls, title: t("item.expand"), onClick: toggleMeta }, item.context) : null,
            item.inject ? h("div", { className: metaCls + " ft2-meta-inject", title: t("item.expand"), onClick: toggleMeta }, "↳ " + item.inject) : null,
            h(
              "div",
              { className: "ft2-actions" },
              archived
                ? null
                : h("button", { type: "button", className: "ft2-act", title: t("item.inject"), "data-ft2-act": "inject", onClick: () => props.onInject(item) }, t("item.inject")),
              archived
                ? null
                : h("button", { type: "button", className: "ft2-act", title: t("item.send"), "data-ft2-act": "send", onClick: () => props.onSend(item) }, t("item.send")),
              archived
                ? null
                : h("button", { type: "button", className: "ft2-act", title: t("item.archive"), "data-ft2-act": "archive", onClick: () => store.archive(cwd, item.id) }, t("item.archive")),
              h("button", { type: "button", className: "ft2-act ft2-act-danger", title: t("item.remove"), "data-ft2-act": "remove", onClick: () => store.remove(cwd, item.id) }, "×")
            )
          )
        );
      }

      /** 会话标题栏的「待办」按钮 + 弹出面板。 */
      function TodoButton(props) {
        const t = makeT(props);
        const effectiveCwd = useEffectiveCwd(props);
        const [override, setOverride] = react.useState("");
        const cwd = override !== "" ? override : effectiveCwd;
        const state = useTodos(store, cwd);
        const options = useWorkspaceOptions(props, effectiveCwd);
        const [open, setOpen] = react.useState(false);
        const [adding, setAdding] = react.useState(false);
        const [filter, setFilter] = react.useState("open");
        const rootRef = react.useRef(null);
        const pos = useAnchoredPlacement(open, rootRef, 460);
        useDismiss(open, setOpen, rootRef);

        const openCount = state.items.filter((x) => !x.done && !x.archived).length;
        const archivedCount = state.items.filter((x) => x.archived).length;
        const rows = visibleItems(state.items, filter);

        const tabs = [
          { id: "open", label: t("filter.open"), count: openCount },
          { id: "done", label: t("filter.done"), count: state.items.filter((x) => x.done && !x.archived).length },
          { id: "archived", label: t("filter.archived"), count: archivedCount },
          { id: "all", label: t("filter.all"), count: state.items.filter((x) => !x.archived).length }
        ].filter((x) => x.id !== "archived" || x.count > 0);

        const errText = state.error === "" ? "" : state.error === "__auth__" ? t("err.auth") : t("err.net", { e: state.error });

        const panel =
          open && pos !== null
            ? h(
                "div",
                { className: "ft2-panel", role: "dialog", "aria-label": t("panel.title"), style: { left: pos.left + "px", top: pos.top + "px" } },
                h(
                  "div",
                  { className: "ft2-head" },
                  h("span", { className: "ft2-title" }, t("panel.title")),
                  h("span", { className: "ft2-spacer" }),
                  h("button", { type: "button", className: "ft2-mini ft2-mini-on", onClick: () => setAdding(!adding) }, adding ? t("panel.cancel") : t("panel.add")),
                  h("button", { type: "button", className: "ft2-mini", title: t("panel.close"), onClick: () => setOpen(false) }, "×")
                ),
                h(
                  "div",
                  { className: "ft2-ws" },
                  h("span", null, t("ws.label")),
                  h(
                    "select",
                    { className: "ft2-select", value: cwd, onChange: (e) => setOverride(e.target.value), title: cwd },
                    options.length === 0 ? h("option", { value: cwd }, cwd || "—") : null,
                    options.map((o) => h("option", { key: o.path, value: o.path }, o.label))
                  )
                ),
                h(
                  "div",
                  { className: "ft2-tabs" },
                  tabs.map((x) =>
                    h(
                      "button",
                      { key: x.id, type: "button", className: "ft2-mini" + (filter === x.id ? " ft2-mini-on" : ""), "data-ft2-tab": x.id, "data-ft2-count": String(x.count), onClick: () => setFilter(x.id) },
                      x.label + (x.count > 0 ? " " + x.count : "")
                    )
                  )
                ),
                adding ? h(AddForm, { t: t, cwd: cwd, onDone: () => setAdding(false) }) : null,
                errText !== "" ? h("div", { className: "ft2-err" }, errText) : null,
                h(
                  "div",
                  { className: "ft2-list", "data-dsh-followup-todo-list": filter },
                  rows.length === 0
                    ? h("div", { className: "ft2-empty" }, t("empty." + filter))
                    : rows.map((item) => h(TodoItem, { key: item.id, t: t, item: item, cwd: cwd, onInject: (x) => fillDraft(props, x), onSend: (x) => fillAndSend(props, x) }))
                )
              )
            : null;

        return h(
          "div",
          { className: "ft2-root", ref: rootRef, "data-dsh-followup-todo": "button", "data-ft2-ws": effectiveCwd },
          h(
            "button",
            {
              type: "button",
              className: "ft2-btn",
              title: t("btn.title"),
              "aria-haspopup": "dialog",
              "aria-expanded": open,
              onClick: () => setOpen(!open)
            },
            h("span", null, t("btn.label")),
            openCount > 0 ? h("span", { className: "ft2-badge ft2-badge-hot" }, String(openCount)) : null
          ),
          panel
        );
      }

      /**
       * 新对话页（空白会话）的待办便签：
       *   · 只在**新对话**出现（已有会话里不显示，靠标题栏「待办」按钮+面板）；
       *   · 位置在**对话框下方** —— 本条目通过 display:contents 的 slot 包装器成为
       *     .composerStack（flex 列）的直接子项，靠 CSS 的 order:99 排到 inputBar 之后；
       *   · 默认就把未完成条目**全部**铺开（可滚动），不再只显示 3 条。
       */
      function TodoStrip(props) {
        const t = makeT(props);
        const cwd = useEffectiveCwd(props);
        const state = useTodos(store, cwd);
        const blank = isBlankSession(props);
        const [collapsed, setCollapsed] = react.useState(false);
        const open = state.items.filter((x) => !x.done && !x.archived);
        if (!blank || open.length === 0 || cwd === "") return null;
        const rows = sortItems(open, "open");
        return h(
          "div",
          { className: "ft2-strip", "data-dsh-followup-todo": "strip", "data-ft2-ws": cwd },
          h(
            "button",
            { type: "button", className: "ft2-strip-head", "aria-expanded": !collapsed, onClick: () => setCollapsed(!collapsed) },
            h("span", { className: "ft2-strip-lead" }, "☑"),
            h("span", { className: "ft2-strip-count" }, t("strip.title")),
            h("span", { className: "ft2-badge" }, String(open.length)),
            h("span", { className: "ft2-caret" + (collapsed ? "" : " ft2-caret-open"), "aria-hidden": true }, "▾")
          ),
          collapsed
            ? null
            : h(
                "ul",
                { className: "ft2-strip-list" },
                rows.map((item) =>
                  h(
                    "li",
                    { key: item.id, className: "ft2-note-row" },
                    h(
                      "button",
                      { type: "button", className: "ft2-note", title: item.title, "data-ft2-note": item.id, onClick: () => fillDraft(props, item) },
                      h(
                        "span",
                        { className: "ft2-note-head" },
                        h("span", { className: "ft2-prio " + prioClass(item.priority) }, item.priority || "P2"),
                        h("span", { className: "ft2-note-title" }, item.title)
                      ),
                      item.context ? h("span", { className: "ft2-note-ctx" }, item.context) : null
                    ),
                    h("button", { type: "button", className: "ft2-note-send", title: t("item.send"), "data-ft2-note-send": item.id, onClick: () => fillAndSend(props, item) }, "⏎")
                  )
                )
              )
        );
      }

      return { TodoButton: TodoButton, TodoStrip: TodoStrip };
    }

    const inject = ["slots", "locale", "timer"];
    function apply(ctx) {
      injectStyles();
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-followup-todo: dictionaries");

      const store = createStore();
      // 一个全局轮询：所有已登记的工作区分片一起刷。
      ctx.effect(() => {
        if (ctx.timer && typeof ctx.timer.interval === "function") return ctx.timer.interval(() => store.reloadAll(), 3000);
        return undefined;
      }, "dsh-followup-todo: poll");

      const C = makeComponents(store);

      ctx.effect(
        () =>
          ctx.slots.inject("conversation.session.header.utilities", () =>
            ctx.slots.register({ name: "conversation.session.header.utilities", id: "dsh-followup-todo", order: 20, locale: NS, label: () => "待办" }, C.TodoButton)
          ),
        "dsh-followup-todo: header button"
      );

      ctx.effect(
        () =>
          ctx.slots.inject("conversation.input.dock", () =>
            ctx.slots.register({ name: "conversation.input.dock", id: "dsh-followup-todo-strip", order: 40, locale: NS }, C.TodoStrip)
          ),
        "dsh-followup-todo: composer strip"
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
