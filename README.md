# dsh-followup-todo

> 给「你」用的待办清单，不是给 agent 用的。每条待办自带一份**跨会话交接说明**，让新开的对话不用回翻旧聊天就能直接开工。

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）插件。宿主端注册 4 个模型工具 + HTTP 接口，浏览器端在会话头部加一个待办按钮、一个悬浮面板，以及输入框上方的一条待办卡片带。

---

## 它和内置 `todo_write` 有什么区别

这是最容易混淆的一点，也是这个插件存在的理由：

| | 内置 `todo_write` | `dsh-followup-todo` |
|---|---|---|
| 清单属于谁 | **agent** 自己 | **你** |
| 装什么 | agent 拆解当前任务的步骤 | 你让它"先记一下"的事 |
| 生命周期 | 当前对话内 | 跨对话、跨会话 |
| 完成后 | 步骤走完就消失 | 标记完成 → 归档 → 可回查 |
| 存哪 | 会话内 | `~/.dsh/followup-todos-<工作区>.json` |

一句话：`todo_write` 是 agent 的工作台，`dsh-followup-todo` 是**你的交接单**。

## 核心设计：context + inject

每条待办有两个自由文本字段，这不是普通的备注，是刻意设计成"让下一个会话零回查开工"的契约：

- **`context`（背景）** —— 只写已确定的事实：在讨论什么、已达成了什么结论、关键产物或文件路径、硬约束与边界。不要写过程流水账。
- **`inject`（要注入的内容）** —— 明确指明新方向：目标一句话、下一步具体动作、期望产出、可检验的验收标准。有歧义的地方显式标「待确认」。

两者会拼成一条完整的 prompt。点面板里的「继续」或输入框上方的卡片，这条 prompt 就会被填进输入框，新会话开局即带着全部上下文。

## 安装

```sh
dsh plugin --profile <profile> add dsh-followup-todo
```

> ⚠️ **只挂一次。** 本包通过 `cordis.patch.yml` 自挂载（`dsh.bundle.patch`）。如果你的 profile 里还留着旧的双包挂载（`@anoslide/dsh-host-followup-todo` + `@anoslide/dsh-client-followup-todo`），**必须先删掉**。两个挂载都会注册 `/followup-todos` 前缀路由，同时存在会让整个插件树在启动时报「duplicate prefix route」而挂掉。

## 模型工具

| 工具 | 作用 |
|---|---|
| `todo_add` | 新增一条。`title` 必填，`priority` 为 P0–P3（默认 P2），另有 `context` / `inject`。 |
| `todo_list` | 读取清单。`filter`：`open`（未完成，默认视图）/ `done` / `all` / `archived`。按优先级排序，同级按加入时间。 |
| `todo_done` | 标记完成，条目仍留在清单里。 |
| `todo_archive` | 标记完成并归档，移出所有活动视图（`filter=archived` 仍可回查）。 |

工作区由当前会话的 cwd 决定，也可以用可选的 `workspace` 参数显式指定（`todo_add` 除外，它始终用当前会话工作区）。

## 浏览器端

- **会话头部按钮** —— 显示未完成数量的角标，点开是悬浮面板。
- **悬浮面板** —— 新增/勾选/归档/删除，P0–P3 优先级选择，归档视图切换。
- **输入框上方卡片带** —— 未完成待办铺成一行卡片，点一张就把它的 prompt 填进输入框，直接接着干。

## 数据存储

每条工作区一个文件：

```
~/.dsh/followup-todos-<base64url(工作区绝对路径)>.json
```

例如 `/home/me/proj` → `followup-todos-L2hvbWUvbWUvcHJvag.json`。文件是纯 JSON 数组，可以直接读、可以直接备份、删掉就等于清空该工作区的清单。

## 已知限制与安全说明

- **HTTP 接口没有鉴权。** `/followup-todos/*` 由 dsh 的 webServer 注册，任何能访问到该 web 服务端口的客户端都能读写任意工作区的待办（`ws` 参数直接取自 query，文件名经过 base64 编码，因此不存在路径穿越）。默认监听 `127.0.0.1` 时没问题；**如果你把 dsh web 暴露到非回环地址，请自行加一层访问控制。**
- **`todo_add` 不接受 `workspace` 参数**，另外三个工具接受。这是历史遗留的不一致，会在后续版本统一。
- 面板列表靠 2 秒轮询刷新，不是实时推送；多窗口同时打开时可能有短暂的显示延迟。
- 仅实现了 web 端界面。headless profile 里工具可用，但没有 UI。

## 维护状态

**个人自用项目，不承诺维护。** 我按自己的需要改，不保证响应 issue、PR 或兼容性请求。用 MIT 协议发布，你可以随意 fork 或自行修改，无需知会我。

## 开发与自测

```sh
npm test     # 冒烟测试，50 项：宿主 36（工具生命周期/排序/归档/5 个 HTTP 端点/并发写入）+ 浏览器 14（加载/导出/插槽注册/样式注入）
npm run check # 发布前自检：占位符、凭据、硬编码路径、bundle 清单、重复路由、语法
```

`npm test` 全程隔离：它会把 `HOME` 重定向到一个仓库内的临时目录，所以插件写的 `~/.dsh` 数据文件留在仓库里，**不会碰你真实的待办数据**。测试需要 `@deepseek-ai/dsh-tools` 可解析 —— 装了 dsh 的环境里直接可跑；独立 clone 的话先 `npm i -D @deepseek-ai/dsh-tools`。

浏览器半边用 `window.__ModuleLoader__` 桩加载，拦的是"加载不进来 / 导出不对 / 插槽名写错"这类硬故障；**它不渲染组件、不跑 hooks，不能替代真机页面验证**。上线前建议在本地 dsh 里实装一次，看一眼头部按钮和卡片带确实出现。

## License

[MIT](./LICENSE)

---

## English summary

A DSH plugin that gives the **human** a cross-session todo list — as opposed to the built-in `todo_write`, which tracks the agent's own task steps within a single conversation.

The distinguishing feature is a structured handoff per item: `context` (established facts, file paths, hard constraints) and `inject` (next action, expected output, acceptance criteria). Together they compose a prompt that lets a brand-new session start working without re-reading the original conversation.

Registers four model tools (`todo_add` / `todo_list` / `todo_done` / `todo_archive`) with P0–P3 priorities and an archive lifecycle, plus a browser half (header button, floating panel, composer-adjacent card strip). State lives in one JSON file per workspace under `~/.dsh/`.

**Personal project, no maintenance promised.** MIT licensed; fork freely.
