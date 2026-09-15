# 发布清单

从"仓库已经在本地就好了"到"GitHub 上能被人搜到"，按顺序做。带 🔹 的是只有你能做的。

---

## 阶段 0 · 注册账号（🔹 只能你来）

1. 打开 https://github.com/signup
2. 邮箱 + 密码 + 用户名。**用户名就是你的永久 ID**，会出现在 `github.com/<用户名>` 和 npm 包名里，想好再定。
3. 过邮箱验证码，可能还要过一次人机校验。
4. 建议顺手把用户名告诉我，我把 package.json 和 LICENSE 里的占位符替换掉。

> ⚠️ 这台服务器**连不上 github.com**（`api.github.com` 通，但网页和 git 传输都不通）。所以注册必须在你自己的电脑/手机上做。如果你所在网络访问 GitHub 不稳定，这一步可能需要自备加速手段。

---

## 阶段 1 · 替换占位符

自检脚本会揪出全部 3 处，一个都别漏：

| 文件 | 占位符 | 换成 |
|---|---|---|
| `package.json` | `YOUR-GITHUB-USERNAME` | 你的 GitHub 用户名（2 处） |
| `LICENSE` | `YOUR NAME` | 你的名字或 ID |

一条命令搞定（把 `你的用户名` 换掉）：

```sh
cd dsh-followup-todo
sed -i 's/YOUR-GITHUB-USERNAME/你的用户名/g' package.json
sed -i 's/YOUR NAME/你的名字/g' LICENSE
```

---

## 阶段 2 · 跑自检

```sh
bash scripts/pre-release-check.sh
```

必须看到最后一行是 **✅ 全部通过，可以发布**。这一步会拦下：占位符没改、混进凭据、硬编码路径、`dsh.bundle` 缺失、`cordis.patch.yml` 被写了多个 `insert`（会导致重复路由）、语法错误。

---

## 阶段 3 · 建远程仓库（🔹 需要你的账号）

在 GitHub 网页上：右上角 `+` → **New repository**

- **Repository name**：`dsh-followup-todo`
- **Description**：`Cross-session follow-up todo list for DeepSeek Harness — each item carries a structured handoff so a new session can start without re-reading the old conversation.`
- 选 **Public**
- **不要**勾 Add a README / .gitignore / license —— 本地已经有了，勾了会冲突
- Create

---

## 阶段 4 · 推送

本地仓库已经 init、已经提交好、已经打好 `v0.1.0` tag 了（这些我在阶段 3 之前就做完了）。现在只差推到远程。两条路选一条：

### 路线 A · 你自己推（🔹 更安全，推荐）

在**一台能连上 github.com 的电脑**上：

```sh
# 1. 把本地仓库拷过去（U盘 / scp / 你顺手的方式）
# 2. 进去，加远程、推
cd dsh-followup-todo
git remote add origin https://github.com/你的用户名/dsh-followup-todo.git
git push -u origin main
git push origin v0.1.0
```

首次 push 会要你登录。推荐用 **Personal Access Token** 当密码（GitHub 早已不接受账号密码）：Settings → Developer settings → Personal access tokens → Fine-grained tokens → 只勾这一个仓库的 `Contents: Read and write`。

**优点**：你的凭据全程不经过我。**代价**：你得自己走一遍 git 配置。

### 路线 B · 我用 API 代推

这台机器 `api.github.com` 通，我可以用 GitHub 的 Git Data API（blobs → trees → commits → refs）把整个仓库推上去，绕过被封的 git 传输。

**前提**：你给我一个 token。安全要求，一条都不能省：

- 用 **Fine-grained token**，不是 classic
- 只授权 `dsh-followup-todo` **这一个仓库**
- 权限只给 `Contents: Read and write`
- 有效期设 **7 天**（或更短）
- 推完**立刻撤销**

token 会进入这个会话的运行环境。你要接受这一点再选这条路。

---

## 阶段 5 · 可选：让更多人能装到

推到 GitHub 只是"存在"，不等于"能被发现"。按投入产出排序：

1. **npm 发布**（让 `dsh plugin add dsh-followup-todo` 直接能用）
   ```sh
   npm publish --access public
   ```
   需要 npm 账号（另一个注册）。**注意 `dsh-followup-todo` 这个包名如果被别人占了就用不了**，发之前先 `npm view dsh-followup-todo` 查一下。

2. **提 PR 进精选列表** —— [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)。收录门槛：能用 `dsh plugin add` 装上、描述属实、仓库还在维护。**不排名、不给流量**，进去只是"存在"。

3. **别做**：为了涨 star 去堆功能或到处发帖。你已经知道这个生态里同类插件的星数分布了（中位数 3）。

---

## 附 · 本机环境备忘

| 项 | 值 |
|---|---|
| dsh | `~/.npm-global/bin/dsh`（不在 PATH，需 `export PATH="$HOME/.npm-global/bin:$PATH"`） |
| dsh 版本 | 0.1.5-rc.1 |
| pnpm | 不在 PATH，用 corepack shim：`export PATH="/usr/lib/node_modules/corepack/shims:$PATH"` |
| profile | `~/.dsh/profiles/web/`，自挂载层是里面的 `cordis.patch.yml` |
| github.com | ❌ 不通 |
| api.github.com | ✅ 通 |
| registry.npmjs.org | ✅ 通 |

**迁移提醒**：装新单包之前，必须从 profile 的 `cordis.patch.yml` 里删掉旧的双包挂载（`followup-todo-host` / `followup-todo-client` 两行 insert）。两套同时存在会重复注册 `/followup-todos` 前缀路由，整个插件树启动即失败。旧包在 `~/.dsh/profiles/node_modules/@anoslide/` 下。
