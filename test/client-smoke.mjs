/**
 * dsh-followup-todo — 浏览器半边冒烟测试。
 *
 * 浏览器半边是一个 `window.__ModuleLoader__.load({id, factory})` 包，正常情况
 * 下由 dsh web 在页面里加载。这里用一个最小桩把那条路径复现出来：造一个假
 * window/document，执行 client.js，取出 factory 并注入假 react 跑一遍，验证
 * 模块导出形状和两个插槽的注册。
 *
 * 注意：这**不能**替代真机页面验证（它不渲染组件、不跑 hooks、不碰 CSS 生效）。
 * 它拦的是"加载不进来 / 导出不对 / apply 报错 / 插槽名写错"这一类硬故障。
 *
 *   node test/client-smoke.mjs
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");

let passed = 0;
let failed = 0;

async function t(label, fn) {
  try {
    const v = await fn();
    passed++;
    console.log("  ✅ " + label);
    return v;
  } catch (error) {
    failed++;
    console.log("  ❌ " + label);
    console.log("     " + (error && error.message ? error.message : String(error)));
  }
}

// ── 浏览器环境桩 ───────────────────────────────────────────────────────────
const loaded = [];
const styleTags = [];

globalThis.window = {
  __ModuleLoader__: {
    load(entry) {
      loaded.push(entry);
    }
  }
};

globalThis.document = {
  getElementById: () => null,
  createElement: (tag) => ({ tag, id: "", textContent: "" }),
  head: {
    appendChild(el) {
      styleTags.push(el);
    }
  }
};

// ── 假 react / react-dom ───────────────────────────────────────────────────
// 只提供模块顶层真正会用到的那几个：客户端代码在 factory 里就取了
// react.createElement 和 react.useState/useEffect/useRef，组件体在渲染时才跑。
const reactStub = {
  createElement: (...args) => ({ __el: args }),
  useState: (v) => [v, () => {}],
  useEffect: () => {},
  useRef: () => ({ current: null })
};
const reactDomStub = {
  createPortal: (node) => node
};

function requireStub(name) {
  if (name === "react") return reactStub;
  if (name === "react-dom") return reactDomStub;
  throw new Error("client.js 依赖了未预期的模块：" + name);
}

// ── 加载 ───────────────────────────────────────────────────────────────────
console.log("\n== 1. 模块加载 ==");

await t("client.js 执行时向 __ModuleLoader__ 注册了一个包", async () => {
  await import(pathToFileURL(join(repo, "lib", "client.js")).href);
  assert.equal(loaded.length, 1, "注册了 " + loaded.length + " 次，应为 1");
});

await t("注册的 id 与包名一致", () => {
  assert.equal(loaded[0].id, "dsh-followup-todo");
});

await t("注册项带 factory 函数", () => {
  assert.equal(typeof loaded[0].factory, "function");
});

const entry = loaded[0];

// ── 工厂产出 ───────────────────────────────────────────────────────────────
console.log("\n== 2. factory 产出形状 ==");

const clientModule = entry.factory(requireStub);

await t("factory 返回带 apply 的模块", () => {
  assert.equal(typeof clientModule.apply, "function");
});

await t("inject 声明 slots 服务", () => {
  assert.deepEqual([...clientModule.inject], ["slots"]);
});

// ── 挂载 ───────────────────────────────────────────────────────────────────
console.log("\n== 3. apply() 挂载到插槽 ==");

const injected = [];
const registrations = [];

const ctx = {
  effect(fn, label) {
    return fn();
  },
  slots: {
    /** 真实现里 inject 会调用回调来完成注册 */
    inject(name, fn) {
      injected.push(name);
      return fn();
    },
    register(def, component) {
      registrations.push({ def, component });
      return { dispose() {} };
    }
  }
};

await t("apply(ctx) 不抛错", () => {
  clientModule.apply(ctx);
});

await t("注入两个插槽位", () => {
  assert.deepEqual(injected, [
    "conversation.session.header.utilities",
    "shell.overlay"
  ]);
});

await t("两个插槽各注册一个组件", () => {
  assert.equal(registrations.length, 2, "注册了 " + registrations.length + " 个");
  for (const r of registrations) {
    assert.equal(typeof r.component, "function", "组件不是函数");
    assert.ok(r.def && typeof r.def.name === "string", "缺插槽名");
    assert.ok(typeof r.def.id === "string" && r.def.id.length > 0, "缺插槽 id");
  }
});

await t("头部按钮插槽的 id 为 followup-todo", () => {
  const header = registrations.find(
    (r) => r.def.name === "conversation.session.header.utilities"
  );
  assert.ok(header, "没有注册头部按钮插槽");
  assert.equal(header.def.id, "followup-todo");
});

await t("overlay 插槽的 id 为 followup-todo-notes", () => {
  const overlay = registrations.find((r) => r.def.name === "shell.overlay");
  assert.ok(overlay, "没有注册 overlay 插槽");
  assert.equal(overlay.def.id, "followup-todo-notes");
});

// ── 样式注入 ───────────────────────────────────────────────────────────────
console.log("\n== 4. 样式注入 ==");

await t("apply 时向 <head> 注入了样式表", () => {
  assert.equal(styleTags.length, 1, "注入了 " + styleTags.length + " 次");
});

await t("样式 id 使用新的包名（已无私有 scope）", () => {
  assert.equal(styleTags[0].id, "dsh-followup-todo/styles");
  assert.ok(!/anoslide/.test(styleTags[0].id), "仍带旧 scope");
});

await t("样式内容包含面板与卡片带的关键类名", () => {
  const css = styleTags[0].textContent || "";
  for (const cls of [".ftd-btn", ".ftd-panel", ".ftd-notes", ".ftd-note", ".ftd-prio--P0"]) {
    assert.ok(css.includes(cls), "CSS 缺少 " + cls);
  }
});

await t("样式里没有未替换的模板变量", () => {
  const css = styleTags[0].textContent || "";
  assert.ok(!/\$\{/.test(css), "CSS 里残留了未求值的 ${}");
  assert.ok(!/undefined/.test(css), "CSS 里出现了 undefined");
});

// ── 收尾 ───────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(52));
if (failed === 0) {
  console.log(`✅ 全部通过：${passed} 项`);
} else {
  console.log(`❌ ${failed} 项失败，${passed} 项通过`);
}
console.log("─".repeat(52) + "\n");
process.exit(failed === 0 ? 0 : 1);
