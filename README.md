# The Simple · YoRsk（Astro + AstroPaper）

YoRsk 的个人博客，由 Hugo + PaperMod 移植到 **Astro + AstroPaper v6.1.0**。
基于 [satnaing/astro-paper](https://github.com/satnaing/astro-paper) 模板定制。

- 正式地址：<https://yorsk.github.io/>
- 仓库：<https://github.com/YoRsk/YoRsk.github.io>（用户站点，Pages 直接发布在根域）
- 旧 Hugo 源码仓库：`YoRsk/YoRsk_blog`（**已归档，只读参考**）
- 旧 Pages 产物仓库：已改名为 `YoRsk/YoRsk_legacy_pages` 并归档

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
const SITE_BASE = ""; // 根域部署，不需要子路径
```

2026-10-11 之前是 `"/YoRsk_astro"`（试跑期的项目站点子目录）。仓库改名为
`YoRsk.github.io` 后成为用户站点，直接发布在根域，base 已清空。
对应的 `astro-paper.config.ts` 的 `site.url` 是 `https://yorsk.github.io/`。

站内链接一律走 `getAssetPath()` / `getRelativeLocaleUrl()`，会自动带上 base。
**Markdown 正文里的内链是静态字符串，写根相对路径即可**（当前 1 处：
`src/content/notes/welcome.md` 里的 `/admin/`）。

CMS 图片路径固定为 `public_folder: "@/assets/images/uploads"`，构建期由 `astro:assets`
解析并自动补 base —— **切换域名时无需改动**。

每次构建后请校验没有双重前缀：

```bash
grep -c "yorsk.github.io/yorsk.github.io" dist/sitemap*.xml   # 期望 0
```

## 部署链路

`main` 分支 push → `.github/workflows/deploy.yml` → `withastro/action@v6` 构建
→ `actions/deploy-pages@v5` 发布到根域。

⚠️ 不要在 workflow 里再自己加 `actions/upload-pages-artifact`：
`withastro/action` 内部已经上传了一个固定名为 `github-pages` 的 artifact，
重复上传会 409 冲突导致整个 workflow 失败。

## 写作

- 本地：写 `src/content/posts|notes/<slug>.md` 后 `git push`
- 云端：打开 `/admin/` 用 GitHub 登录，`Ctrl+V` 直接粘图
- 文章页面底部的「编辑本页」是深链，直达 CMS 里该文章的编辑器

`description`（摘要）是 zod schema 的必填字段，缺失会导致 CI 构建失败；
CMS 里已设为 `required: true`。

## License

MIT（沿用 AstroPaper 模板许可证，见 `LICENSE`）
