import rss from "@astrojs/rss";
import { buildRssItems } from "@/utils/rss";
import config from "@/config";

/**
 * 旧站（Hugo）的 RSS 地址是 /index.xml。
 * 这里输出与 /rss.xml 完全相同的内容，保住已有订阅不 404（设计文档 D7 / 决策 A8）。
 */
export async function GET() {
  return rss({
    title: config.site.title,
    description: config.site.description,
    site: config.site.url,
    items: await buildRssItems(),
  });
}
