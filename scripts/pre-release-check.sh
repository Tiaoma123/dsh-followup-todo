#!/usr/bin/env bash
# 发布前自检。任何一项不过就别推上去。
#   用法： bash scripts/pre-release-check.sh
set -u
cd "$(dirname "$0")/.."
fail=0

say()  { printf '%s\n' "$*"; }
ok()   { printf '  ✅ %s\n' "$*"; }
bad()  { printf '  ❌ %s\n' "$*"; fail=1; }

say "== 1. 占位符是否已替换 =="
# 排除本脚本自身：它必须包含这些字面量才能检查它们
if grep -rn "YOUR-GITHUB-USERNAME\|YOUR NAME" . --exclude-dir=.git --exclude-dir=node_modules \
     --exclude="$(basename "$0")" >/dev/null 2>&1; then
  bad "仍有未替换的占位符："
  grep -rn "YOUR-GITHUB-USERNAME\|YOUR NAME" . --exclude-dir=.git --exclude-dir=node_modules \
     --exclude="$(basename "$0")" | sed 's/^/     /'
else
  ok "无占位符残留"
fi

say "== 2. 凭据 / 密钥扫描 =="
if grep -rniE '(api[_-]?key|secret|token|passwd|password|credential|bearer)[\"'\'':= ]' lib package.json cordis.patch.yml >/dev/null 2>&1; then
  bad "疑似凭据："
  grep -rniE '(api[_-]?key|secret|token|passwd|password|credential|bearer)[\"'\'':= ]' lib package.json cordis.patch.yml | sed 's/^/     /'
else
  ok "无凭据"
fi

say "== 3. 硬编码个人路径 =="
if grep -rnoE '/(home|Users)/[A-Za-z0-9_.-]+' lib package.json cordis.patch.yml >/dev/null 2>&1; then
  bad "发现绝对路径："
  grep -rnoE '/(home|Users)/[A-Za-z0-9_.-]+' lib package.json cordis.patch.yml | sed 's/^/     /'
else
  ok "无绝对路径"
fi

say "== 4. 私有 scope 残留（只看代码与包清单）=="
# cordis.patch.yml 里出现 @anoslide 是刻意的迁移警告注释，不算残留
if grep -rn "anoslide" lib package.json >/dev/null 2>&1; then
  bad "lib/ 或 package.json 里仍有 @anoslide："
  grep -rn "anoslide" lib package.json | sed 's/^/     /'
else
  ok "代码与包清单均无残留"
fi

say "== 5. package.json 必备字段 =="
for f in name version license main exports dsh files; do
  if node -e "const p=require('./package.json'); process.exit(p['$f']===undefined?1:0)" 2>/dev/null; then
    ok "$f"
  else
    bad "缺字段：$f"
  fi
done
if node -e "const p=require('./package.json'); process.exit(p.dsh&&p.dsh.bundle&&p.dsh.bundle.patch?0:1)" 2>/dev/null; then
  ok "dsh.bundle.patch"
else
  bad "缺 dsh.bundle.patch —— 装了也不会自挂载"
fi

say "== 6. cordis.patch.yml 只有一个 insert（防重复路由）=="
n=$(grep -c '^\- insert:' cordis.patch.yml 2>/dev/null || echo 0)
if [ "$n" = "1" ]; then ok "1 个 insert"; else bad "找到 $n 个 insert，应为 1"; fi

say "== 7. 语法检查 =="
if node --check lib/index.js 2>/dev/null; then ok "lib/index.js"; else bad "lib/index.js 语法错误"; fi
if node --check lib/client.js 2>/dev/null; then ok "lib/client.js"; else bad "lib/client.js 语法错误"; fi

say ""
if [ "$fail" = "0" ]; then
  say "✅ 全部通过，可以发布。"
else
  say "❌ 有未通过项，先修掉再发。"
fi
exit "$fail"
