/**
 * 跨平台复制 Pagefind 搜索索引。
 *
 * 背景：AstroPaper 模板的 build 脚本原文是
 *   `pagefind --site dist && cp -r dist/pagefind public/`
 * 其中 `cp` 在 Windows 的 cmd / PowerShell 下不存在，本地构建直接失败。
 * 这里改用 Node 内置的 fs.cpSync（Node >= 16.7），零新依赖、全平台可用。
 *
 * 用法：node scripts/copy-pagefind.mjs
 */
import { existsSync, cpSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");

const SOURCE_DIR = resolve(projectRoot, "dist", "pagefind");
const TARGET_DIR = resolve(projectRoot, "public", "pagefind");

/**
 * 把 dist/pagefind 同步到 public/pagefind。
 * 该目录只为了让 `npm run dev` 时也能用上索引，本身不入库（见 .gitignore）。
 * @returns {void}
 */
function copyPagefind() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(
      "[copy-pagefind] 未找到 dist/pagefind，请先执行 `astro build` 与 `pagefind --site dist`。"
    );
    process.exitCode = 1;
    return;
  }

  // 先清掉旧索引，避免残留上一次构建的碎片文件
  rmSync(TARGET_DIR, { recursive: true, force: true });
  cpSync(SOURCE_DIR, TARGET_DIR, { recursive: true });

  console.log("[copy-pagefind] dist/pagefind -> public/pagefind 完成");
}

copyPagefind();
