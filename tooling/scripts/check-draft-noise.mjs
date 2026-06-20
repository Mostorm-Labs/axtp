#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? process.cwd());
const protocolRoot = path.join(root, "workspace", "protocol");
const errors = [];

const bannedLinePatterns = [
  {
    pattern: /^\|\s*`supportedMethods`\s*\|/,
    reason: "generic supportedMethods belongs in draft-conventions.md",
  },
  {
    pattern: /^\|\s*`supportedEvents`\s*\|/,
    reason: "generic supportedEvents belongs in draft-conventions.md",
  },
  {
    pattern: /supportedMethods\s*\/\s*supportedEvents/,
    reason: "generic supportedMethods/supportedEvents schema overview belongs in draft-conventions.md",
  },
  {
    pattern: /^\|\s*`<FEATURE_SPECIFIC_ERROR>`\s*\|/,
    reason: "placeholder feature-specific error must be removed or replaced with a named candidate",
  },
  {
    pattern: /^\|\s*method\/event 命名是否需要与已有 generated 事实合并？\s*\|/,
    reason: "generic registry merge review question belongs in draft-conventions.md",
  },
  {
    pattern: /^\|\s*legacy 命令和字段是否全部映射清楚？\s*\|/,
    reason: "generic legacy review question belongs in draft-conventions.md",
  },
  {
    pattern: /^\|\s*happy path\s*\|\s*capability discovery 后调用主要 query\/command\/action method，返回成功响应。\s*\|/,
    reason: "generic test matrix belongs in draft-conventions.md",
  },
  {
    pattern: /^\|\s*event path\s*\|\s*会改变状态的 method 成功后，按需产生 changed\/progress\/state event；客户端可更新 UI 或调用 get 校准。\s*\|/,
    reason: "generic test matrix belongs in draft-conventions.md",
  },
  {
    pattern: /^\|\s*boundary case\s*\|\s*省略可选字段、非法 target、非法枚举、越界值、空列表和最大对象数量。\s*\|/,
    reason: "generic test matrix belongs in draft-conventions.md",
  },
  {
    pattern: /^\|\s*error case\s*\|\s*unsupported feature\/method、permission denied、busy、invalid argument、version\/capability mismatch。\s*\|/,
    reason: "generic test matrix belongs in draft-conventions.md",
  },
  {
    pattern: /^\|\s*compatibility\s*\|\s*新旧 App \/ 设备组合下，未知可选字段可忽略，未知必填语义必须返回标准错误。\s*\|/,
    reason: "generic test matrix belongs in draft-conventions.md",
  },
  {
    pattern: /读法：成功响应仍然只展示 RPC `d` block，`id` 必须回显请求 `id`。/,
    reason: "generic success response explanation belongs in draft-conventions.md",
  },
  {
    pattern: /^### 7\.1 场景：读取或修改 `/,
    reason: "generic read-or-modify flow example belongs in draft-conventions.md",
  },
  {
    pattern: /^\|\s*registry\s*\|\s*not generated\s*\|\s*尚未写入正式 registry YAML。\s*\|/,
    reason: "generic registry status table belongs in draft-conventions.md",
  },
];

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) out.push(entryPath);
  }
  return out.sort();
}

function shouldSkip(file) {
  const base = path.basename(file);
  return base === "README.md" || base === "draft-conventions.md";
}

for (const file of walk(protocolRoot)) {
  if (shouldSkip(file)) continue;
  const relative = path.relative(root, file);
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const { pattern, reason } of bannedLinePatterns) {
      if (pattern.test(line)) {
        errors.push(`${relative}:${index + 1}: ${reason}`);
      }
    }
  });
}

if (errors.length > 0) {
  console.error(`[FAIL] protocol draft noise check failed: ${errors.length}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("[OK] protocol drafts do not contain repeated template noise");
