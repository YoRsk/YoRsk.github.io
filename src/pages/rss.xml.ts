import rss from "@astrojs/rss";
import { buildRssItems } from "@/utils/rss";
import config from "@/config";

export async function GET() {
  return rss({
    title: config.site.title,
    description: config.site.description,
    site: config.site.url,
    items: await buildRssItems(),
  });
}
