# The Simple · YoRsk（Astro + AstroPaper）

YoRsk 的个人博客，由 Hugo + PaperMod 移植到 **Astro + AstroPaper v6.1.0**。
基于 [satnaing/astro-paper](https://github.com/satnaing/astro-paper) 模板定制。

- 试跑地址：<https://yorsk.github.io/YoRsk_astro/>
- 正式地址（切换后）：<https://yorsk.github.io/>
- 旧 Hugo 源码仓库：`YoRsk/YoRsk_blog`（**只读参考，移植全程未改动**）

## 快速开始

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # astro check → astro build → pagefind → 复制索引到 public/
npm run preview
```

Node 需要 `>= 22.12.0`。包管理器统一用 **npm**（本机未装 pnpm），`package-lock.json` 必须入库。

## 目录约定

| 位置 | 用途 |
| --- | --- |
| `src/content/posts/<slug>.md` | 文章（文件名 = URL slug，**改名前必须先建重定向**） |
| `src/content/notes/<slug>.md` | 笔记（与 posts 同构的独立 collection） |
| `src/assets/images/posts/<slug>/` | 文章配图 |
| `src/assets/images/uploads/` | CMS（`/admin`）上传的图，目录必须存在 |
| `public/admin/` | Sveltia CMS 入口与配置 |
| `src/components/MermaidLoader.astro` | 把 ```mermaid 代码块渲染成图（CDN ESM + 主题联动） |

## 部署与 base（重要）

部署子路径的**唯一真源**是 `astro.config.ts`：

```ts
const SITE_BASE = "/YoRsk_astro"; // 切换正式域名时删掉或改成 ""
```

站内链接一律走 `getAssetPath()` / `getRelativeLocaleUrl()`，会自动带上 base。
**Markdown 正文里的内链是静态字符串，必须写带 base 的完整路径**（当前仅 1 处：
`src/content/notes/welcome.md` 里的 `/YoRsk_astro/admin/`）。

CMS 图片路径固定为 `public_folder: "@/assets/images/uploads"`，构建期由 `astro:assets`
解析并自动补 base —— **切换域名时无需改动**。

每次构建后请校验双重 base 前缀：

```bash
grep -c "YoRsk_astro/YoRsk_astro" dist/sitemap*.xml   # 期望 0
```

## 切换正式域名的改动清单

1. `astro.config.ts`：`SITE_BASE` 改为 `""`
2. `astro-paper.config.ts`：`site.url` → `https://yorsk.github.io/`
3. `public/admin/config.yml`：`site_url` → `https://yorsk.github.io/`
4. 正文内链全局替换 `/YoRsk_astro/` → `/`
5. `public/admin/config.yml` 的 `public_folder` **保持 `@/assets/images/uploads` 不动**
6. **先 Disable 旧 Hugo 仓库 `YoRsk/YoRsk_blog` 的 Actions**，再切换
7. Settings → Pages → Custom domain（或改工作流推 `YoRsk/YoRsk.github.io`）

## 写作

- 本地：写 `src/content/posts|notes/<slug>.md` 后 `git push`
- 云端：打开 `/YoRsk_astro/admin/` 用 GitHub 登录，`Ctrl+V` 直接粘图

`description`（摘要）是 zod schema 的必填字段，缺失会导致 CI 构建失败；
CMS 里已设为 `required: true`。

## License

MIT（沿用 AstroPaper 模板许可证，见 `LICENSE`）
