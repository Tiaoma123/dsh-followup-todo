window.__ModuleLoader__.load({
	id: "dsh-followup-todo",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const react_dom = require("react-dom");
		const h = react.createElement;

		const CSS = `
.ftd-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;line-height:1;font-family:inherit}
.ftd-btn__label{font-weight:600}
.ftd-btn__badge{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:999px;font-size:11px;padding:0 6px;line-height:15px;min-width:16px;text-align:center}
.ftd-panel{position:fixed;width:360px;max-width:calc(100vw - 32px);max-height:72vh;display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;box-shadow:0 10px 34px rgba(0,0,0,.25);color:var(--dsw-alias-label-primary);z-index:9999;overflow:hidden;font-size:13px;line-height:1.45}
.ftd-panel__head{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.ftd-panel__title{font-weight:600;font-size:14px}
.ftd-panel__add{margin-left:auto;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-brand-primary);border-radius:6px;padding:3px 8px;cursor:pointer;font-size:12px;font-family:inherit}
.ftd-panel__close{border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:16px;line-height:1;padding:0 2px}
.ftd-panel__close:hover{color:var(--dsw-alias-state-error-primary)}
.ftd-form{padding:10px 12px;display:flex;flex-direction:column;gap:6px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.ftd-input,.ftd-textarea{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);border-radius:6px;padding:6px 8px;font-size:12px;font-family:inherit;box-sizing:border-box;width:100%}
.ftd-textarea{resize:vertical;min-height:44px}
.ftd-formrow{display:flex;gap:6px;justify-content:flex-end}
.ftd-btn--primary{background:var(--dsw-alias-button-primary-fill);border:1px solid transparent;color:var(--dsw-alias-label-primary-foreground);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;font-family:inherit}
.ftd-btn--ghost{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;font-family:inherit}
.ftd-list{overflow:auto;max-height:52vh}
.ftd-empty{padding:14px 12px;color:var(--dsw-alias-label-secondary);font-size:12px}
.ftd-item{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.ftd-item:last-child{border-bottom:none}
.ftd-body{flex:1;min-width:0}
.ftd-title{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.4}
.ftd-meta{color:var(--dsw-alias-label-secondary);font-size:11px;margin-top:3px;white-space:pre-wrap;word-break:break-word;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ftd-item--done .ftd-title{text-decoration:line-through;color:var(--dsw-alias-label-secondary)}
.ftd-actions{display:flex;align-items:center;gap:2px;flex:0 0 auto}
.ftd-continue{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-brand-primary);border-radius:6px;padding:2px 7px;cursor:pointer;font-size:11px;font-family:inherit;white-space:nowrap;display:none}
.ftd-item:hover .ftd-continue{display:inline-block}
.ftd-continue:hover{background:var(--dsw-alias-bg-layer-2)}
.ftd-del{border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:14px;padding:0 2px;line-height:1;opacity:.5;transition:opacity .12s ease}
.ftd-item:hover .ftd-del{opacity:1}
.ftd-del:hover{color:var(--dsw-alias-state-error-primary)}
.ftd-notes{display:flex;flex-direction:column;gap:8px;width:calc(100% - 2 * var(--dsh-composer-side-clearance, 16px));max-width:var(--dsh-composer-card-max-width, 780px);margin:0 auto;box-sizing:border-box;padding:0;text-align:left}
.ftd-notes__title{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;letter-spacing:.3px;padding:0 2px}
.ftd-notes__row{display:flex;flex-direction:column;gap:8px;max-height:42vh;overflow-y:auto;padding:2px;scrollbar-width:thin}
.ftd-note{display:flex;flex-direction:column;gap:3px;width:100%;box-sizing:border-box;text-align:left;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-left:3px solid var(--dsw-alias-brand-primary);border-radius:10px;padding:8px 12px;cursor:pointer;font-family:inherit;color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px rgba(0,0,0,.05),0 2px 8px rgba(0,0,0,.06);transition:box-shadow .16s ease,transform .16s ease,border-color .16s ease}
.ftd-note:hover{border-color:var(--dsw-alias-border-l2);box-shadow:0 6px 18px rgba(0,0,0,.14);transform:translateY(-2px)}
.ftd-note:active{transform:translateY(0);box-shadow:0 1px 4px rgba(0,0,0,.08)}
.ftd-note:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.ftd-note__title{display:flex;align-items:center;gap:8px;min-width:0;font-size:14px;font-weight:600;line-height:1.4}
.ftd-note__title-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}
.ftd-note__ctx{min-width:0;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ftd-title-row{display:flex;align-items:center;gap:6px}
.ftd-title{flex:1;min-width:0}
.ftd-prio{display:inline-block;border:1px solid;border-radius:4px;padding:0 5px;font-size:10px;line-height:15px;font-weight:700;flex:0 0 auto;white-space:nowrap}
.ftd-prio--P0{color:var(--dsw-alias-state-error-primary)}
.ftd-prio--P1{color:var(--dsw-alias-state-warn-primary)}
.ftd-prio--P2{color:var(--dsw-alias-brand-primary)}
.ftd-prio--P3{color:var(--dsw-alias-label-secondary)}
.ftd-time{color:var(--dsw-alias-label-secondary);font-size:10px;margin-top:2px;line-height:1.3}
.ftd-priopick{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.ftd-priobtn{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:4px;padding:1px 7px;font-size:11px;cursor:pointer;font-family:inherit;line-height:16px}
.ftd-priobtn--on.ftd-prio--P0{color:var(--dsw-alias-state-error-primary);border-color:currentColor;font-weight:700}
.ftd-priobtn--on.ftd-prio--P1{color:var(--dsw-alias-state-warn-primary);border-color:currentColor;font-weight:700}
.ftd-priobtn--on.ftd-prio--P2{color:var(--dsw-alias-brand-primary);border-color:currentColor;font-weight:700}
.ftd-priobtn--on.ftd-prio--P3{color:var(--dsw-alias-label-primary);border-color:currentColor;font-weight:700}
.ftd-arch{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;padding:2px 7px;cursor:pointer;font-size:11px;font-family:inherit;white-space:nowrap}
.ftd-arch:hover{color:var(--dsw-alias-brand-primary);border-color:currentColor}
.ftd-panel__filter{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;padding:2px 8px;cursor:pointer;font-size:11px;font-family:inherit}
.ftd-panel__filter:hover{color:var(--dsw-alias-brand-primary)}

`;

		let styleInjected = false;
		function injectStyles() {
			if (styleInjected) return;
			styleInjected = true;
			try {
				const id = "dsh-followup-todo/styles";
				if (document.getElementById(id)) return;
				const tag = document.createElement("style");
				tag.id = id;
				tag.textContent = CSS;
				document.head.appendChild(tag);
			} catch {}
		}

		function cwdOf(props) {
			try {
				if (typeof props.useSessions === "function") {
					return props.useSessions((s) => {
						const row = s && s.byId ? s.byId[props.sessionId] : null;
						return row && typeof row.cwd === "string" ? row.cwd : "";
					}) || "";
				}
			} catch {}
			return "";
		}

		function continueTodo(props, t) {
			try {
				if (props.inputActions && typeof props.inputActions.setDraft === "function") {
					props.inputActions.setDraft(t.prompt || t.title || "");
					if (typeof props.inputActions.submit === "function") props.inputActions.submit();
				}
			} catch {}
		}

		const PRIORITY_OPTIONS = ["P0", "P1", "P2", "P3"];

		function fmtTime(ms) {
			if (!ms || typeof ms !== "number") return "";
			const d = new Date(ms);
			const p = (n) => String(n).padStart(2, "0");
			return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
		}

		function TodoPanel(props) {
			const [todos, setTodos] = react.useState([]);
			const [open, setOpen] = react.useState(false);
			const [adding, setAdding] = react.useState(false);
			const [title, setTitle] = react.useState("");
			const [context, setContext] = react.useState("");
			const [inject, setInject] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const [prio, setPrio] = react.useState("P2");
			const [showArchived, setShowArchived] = react.useState(false);
			const [pos, setPos] = react.useState({ top: 64, left: 16 });
			const btnRef = react.useRef(null);
			const cwd = cwdOf(props);

			function reload() {
				fetch("/followup-todos/list?ws=" + encodeURIComponent(cwd))
					.then((r) => r.json())
					.then((j) => { if (j && Array.isArray(j.items)) setTodos(j.items); })
					.catch(() => {});
			}

			react.useEffect(() => {
				reload();
				const t = setInterval(reload, 2000);
				return () => clearInterval(t);
			}, [cwd]);

			function togglePanel() {
				if (!open && btnRef.current) {
					try {
						const rect = btnRef.current.getBoundingClientRect();
						if (rect && typeof rect.bottom === "number") {
							const vw = document.documentElement ? (document.documentElement.clientWidth || 100000) : 100000;
							setPos({ top: Math.max(8, rect.bottom + 8), left: Math.max(8, Math.min(rect.left, vw - 376)) });
						}
					} catch {}
				}
				setOpen(!open);
			}

			function post(path, body) {
				return fetch(path + "?ws=" + encodeURIComponent(cwd), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body)
				}).then((r) => r.json());
			}

			function doAdd() {
				const t = title.trim();
				if (!t) return;
				setBusy(true);
				post("/followup-todos/add", { title: t, context, inject, priority: prio })
					.then(() => { setTitle(""); setContext(""); setInject(""); setPrio("P2"); setAdding(false); setBusy(false); reload(); })
					.catch(() => setBusy(false));
			}
			function doToggle(t) { post("/followup-todos/toggle", { id: t.id }).then(reload).catch(() => {}); }
			function doArchive(t) { post("/followup-todos/archive", { id: t.id }).then(reload).catch(() => {}); }
			function doRemove(t) { post("/followup-todos/remove", { id: t.id }).then(reload).catch(() => {}); }

			const openCount = todos.filter((t) => !t.done && !t.archived).length;
			const archivedCount = todos.filter((t) => t.archived).length;

			const btn = h("button", { className: "ftd-btn", ref: btnRef, title: "待办清单", onClick: togglePanel },
				h("span", { className: "ftd-btn__label" }, "待办"),
				openCount > 0 ? h("span", { className: "ftd-btn__badge" }, String(openCount)) : null
			);

			let panel = null;
			if (open) {
				const visible = showArchived ? todos.filter((t) => t.archived) : todos.filter((t) => !t.archived);
				const items = visible.length === 0
					? [h("div", { className: "ftd-empty", key: "empty" }, showArchived ? "暂无归档条目。" : "暂无待办。点「＋ 新增」手动加，或在对话里说“先记一下”由我记录。")]
					: visible.map((t) => h("div", { className: "ftd-item" + (t.done ? " ftd-item--done" : ""), key: t.id },
						h("div", { className: "ftd-body" },
							h("div", { className: "ftd-title-row" },
								h("span", { className: "ftd-title" }, t.title),
								h("span", { className: "ftd-prio ftd-prio--" + (t.priority || "P2") }, t.priority || "P2"),
								h("div", { className: "ftd-actions" },
									showArchived ? null : h("button", { className: "ftd-continue", title: "注入当前会话继续推进", onClick: () => continueTodo(props, t) }, "继续"),
									showArchived ? null : h("button", { className: "ftd-arch", title: "完成并归档", onClick: () => doArchive(t) }, "归档"),
									h("button", { className: "ftd-del", title: "删除", onClick: () => doRemove(t) }, "×")
								)
							),
							t.context ? h("div", { className: "ftd-meta" }, t.context) : null,
							h("div", { className: "ftd-time" }, (showArchived ? "归档 " : "加入 ") + fmtTime(showArchived ? t.archivedAt : t.createdAt))
						),
					));

				panel = h("div", { className: "ftd-panel", style: { top: pos.top + "px", left: pos.left + "px" } },
					h("div", { className: "ftd-panel__head" },
						h("span", { className: "ftd-panel__title" }, "待办清单"),
						h("button", { className: "ftd-panel__add", onClick: () => setAdding(!adding) }, adding ? "取消" : "＋ 新增"),
						archivedCount > 0 ? h("button", { className: "ftd-panel__filter", onClick: () => setShowArchived(!showArchived) }, showArchived ? "← 待办" : "归档 " + archivedCount) : null,
						h("button", { className: "ftd-panel__close", title: "关闭", onClick: () => setOpen(false) }, "×")
					),
					adding ? h("div", { className: "ftd-form" },
						h("input", { className: "ftd-input", placeholder: "标题", value: title, onChange: (e) => setTitle(e.target.value) }),
						h("div", { className: "ftd-priopick" },
							h("span", null, "优先级"),
							PRIORITY_OPTIONS.map((p) => h("button", { key: p, type: "button", className: "ftd-priobtn ftd-prio--" + p + (prio === p ? " ftd-priobtn--on" : ""), onClick: () => setPrio(p) }, p))
						),
						h("textarea", { className: "ftd-textarea", placeholder: "相关上下文（可选）", value: context, onChange: (e) => setContext(e.target.value) }),
						h("textarea", { className: "ftd-textarea", placeholder: "需要注入的内容（可选）", value: inject, onChange: (e) => setInject(e.target.value) }),
						h("div", { className: "ftd-formrow" },
							h("button", { className: "ftd-btn--primary", disabled: busy, onClick: doAdd }, busy ? "…" : "添加"),
							h("button", { className: "ftd-btn--ghost", onClick: () => setAdding(false) }, "取消")
						)
					) : null,
					h("div", { className: "ftd-list" }, items)
				);
			}

			return h("div", null, btn, panel);
		}

		function HeroNotes(props) {
			const currentId = (typeof props.useSessions === "function") ? props.useSessions((s) => s.current) : undefined;
			const blank = (typeof props.useSessions === "function") ? props.useSessions((s) => {
				const id = s.current;
				return id ? (s.byId[id] ? s.byId[id].blank === true : false) : true;
			}) : true;
			const sessionCwd = (typeof props.useSessions === "function") ? props.useSessions((s) => {
				const id = s.current;
				const row = id ? s.byId[id] : null;
				return row && typeof row.cwd === "string" ? row.cwd : "";
			}) : "";
			const recentWsId = (typeof props.useWorkspaces === "function") ? props.useWorkspaces((s) => s.recentWorkspaceId) : undefined;
			const recentWsPath = (typeof props.useWorkspaces === "function") ? props.useWorkspaces((s) => {
				const it = s.recentWorkspaceId ? s.items.find((w) => w.id === s.recentWorkspaceId) : undefined;
				return it && typeof it.path === "string" ? it.path : "";
			}) : "";

			const show = currentId === undefined || blank === true;
			const cwd = sessionCwd || recentWsPath;
			const [todos, setTodos] = react.useState([]);
			const [portalEl, setPortalEl] = react.useState(null);

			react.useEffect(() => {
				if (!show) { setTodos([]); return; }
				let alive = true;
				const load = () => fetch("/followup-todos/list?ws=" + encodeURIComponent(cwd))
					.then((r) => r.json())
					.then((j) => { if (alive && j && Array.isArray(j.items)) setTodos(j.items); })
					.catch(() => {});
				load();
				const t = setInterval(load, 3000);
				return () => { alive = false; clearInterval(t); };
			}, [show, cwd]);
			react.useEffect(() => {
				if (!show) return;
				const seat = document.querySelector("[data-composer-seat]");
				if (!seat) return;
				const el = document.createElement("div");
				el.className = "ftd-notes-host";
				seat.appendChild(el);
				const card = document.querySelector("[data-composer-card]");
				if (card) { const gap = el.getBoundingClientRect().top - card.getBoundingClientRect().bottom; el.style.marginTop = (8 - gap) + "px"; }
				setPortalEl(el);
				return () => { if (el && el.parentNode) el.parentNode.removeChild(el); setPortalEl(null); };
			}, [show]);

			if (!show) return null;
			const open = todos.filter((t) => !t.done && !t.archived);
			if (open.length === 0) return null;

			async function start(t) {
				const prompt = t.prompt || t.title || "";
				try {
					const conv = props.ctx ? props.ctx.get("conversation") : undefined;
					let sid = currentId;
					if (sid === undefined && recentWsId) {
						const ws = props.ctx ? props.ctx.get("workspaces") : undefined;
						const sessions = props.ctx ? props.ctx.get("sessions") : undefined;
						if (ws && typeof ws.connectWorkspace === "function") {
							sid = await ws.connectWorkspace(recentWsId);
							if (sessions && typeof sessions.open === "function") sessions.open(sid);
						}
					}
					if (sid && conv && conv.input && typeof conv.input.shell === "function") {
						const shell = conv.input.shell(sid);
						if (shell && typeof shell.setDraft === "function") shell.setDraft(prompt);
						if (shell && typeof shell.submit === "function") shell.submit();
					}
				} catch {}
			}

			const content = h("div", { className: "ftd-notes" },
				h("div", { className: "ftd-notes__title" }, "待办 · 点一张开始处理"),
				h("div", { className: "ftd-notes__row" },
					open.map((t) => h("button", { className: "ftd-note", key: t.id, onClick: () => start(t) },
						h("span", { className: "ftd-note__title" },
							h("span", { className: "ftd-note__title-text" }, t.title),
							h("span", { className: "ftd-prio ftd-prio--" + (t.priority || "P2") }, t.priority || "P2")
						),
						t.context ? h("span", { className: "ftd-note__ctx" }, t.context) : null
					))
				)
			);
			if (!portalEl) return null;
			return react_dom.createPortal(content, portalEl);
		}

		const inject = ["slots"];
		function apply(ctx) {
			injectStyles();
			ctx.effect(() => ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "followup-todo",
				order: 0,
				label: () => "待办"
			}, TodoPanel)), "followup-todo: header button");
			ctx.effect(() => ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "followup-todo-notes",
				order: 0
			}, (props) => h(HeroNotes, { ...props, ctx }))), "followup-todo: hero notes");
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
