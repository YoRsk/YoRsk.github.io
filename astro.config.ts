import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import rehypeCallouts from "rehype-callouts";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import config from "./astro-paper.config";

// ⚠️ 部署子路径的【唯一真源】就在这里。
// 试跑期（GitHub Pages 项目站点）曾是 "/YoRsk_astro"；
// 2026-10-11 起仓库改名为 YoRsk.github.io（用户站点），直接发布在根域，不需要子路径。
// 站内链接一律走 getAssetPath() / getRelativeLocaleUrl()，会自动带上 base，切勿硬编码。
const SITE_BASE = "";

export default defineConfig({
  site: config.site.url,
  // base 为 "" 时传 undefined，等价于不设 base（Astro 默认值）
  base: SITE_BASE || undefined,
  integrations: [
    mdx(),
    sitemap({
      filter: page =>
        config.features?.showArchives !== false || !page.endsWith("/archives/"),
    }),
  ],
  i18n: {
    // 站点 UI 语言为英语（博客正文仍是中文，暂不翻译）。
    // prefixDefaultLocale: false 保证 URL 不带 /en/ 前缀，与切换前完全一致。
    locales: ["en"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkToc,
        [remarkCollapse, { test: "Table of contents" }],
      ],
      rehypePlugins: [rehypeCallouts],
    }),
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: "Google Sans Code",
      cssVariable: "--font-google-sans-code",
      provider: fontProviders.google(),
      fallbacks: ["monospace"],
      weights: [300, 400, 500, 600, 700],
      styles: ["normal", "italic"],
      // 顺序很重要：woff2 在前面 → 浏览器只下载 woff2（与 naoya-tech.com 一致，体积最小）。
      // ttf 必须保留：动态 OG 图（src/utils/getOgFontData.ts）用 satori/opentype.js 解析字体，
      // 它只认 sfnt（ttf/otf），解析不了 woff2（会报 "Unsupported OpenType signature wOF2"）。
      // getFontPathByWeight 默认按 format === "truetype" 挑选，正好命中这份 ttf。
      formats: ["woff2", "woff", "ttf"],
    },
  ],
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
