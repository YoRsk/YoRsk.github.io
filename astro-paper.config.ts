import { defineAstroPaperConfig } from "./src/types/config";

/**
 * 站点级配置（YoRsk / The Simple）。
 *
 * ⚠️ site.url 必须与 astro.config.ts 的 base 保持一致（含仓库子路径）。
 * 切换正式域名时同步把这个值改成 "https://yorsk.github.io/"（设计文档附录 A 第 2 项）。
 */
export default defineAstroPaperConfig({
  site: {
    url: "https://yorsk.github.io/YoRsk_astro/",
    title: "The Simple",
    description: "YoRsk 的个人博客：记录代码、折腾与思考。",
    author: "YoRsk",
    profile: "https://github.com/YoRsk",
    ogImage: "default-og.jpg",
    lang: "zh-CN",
    timezone: "Asia/Tokyo",
    dir: "ltr",
  },
  posts: {
    perPage: 5,
    perIndex: 5,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    // 「编辑本页」不再指向 GitHub 网页编辑器，改为深链进自带 CMS 的该文章编辑器。
    // url 现在是**站点内的后台相对路径**（会被 getAssetPath() 自动补上 base），
    // 组件会追加 #/collections/posts/entries/<slug>。默认值即 "admin/"。
    editPost: {
      enabled: true,
      url: "admin/",
    },
    search: "pagefind",
  },
  // 沿用旧站 hugo.toml 的 [[params.socialIcons]]：GitHub + RSS。
  // RSS 图标不在 socials 图标目录里，由首页 hero 自带的 IconRss 提供入口。
  socials: [{ name: "github", url: "https://github.com/YoRsk" }],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "pinterest", url: "https://pinterest.com/pin/create/button/?url=" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
