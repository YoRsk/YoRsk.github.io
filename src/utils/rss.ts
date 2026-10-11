import type { RSSFeedItem } from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getPostUrl } from "@/utils/getPostPaths";
import { getNoteUrl } from "@/utils/getNotePaths";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getSortedNotes } from "@/utils/getSortedNotes";
import config from "@/config";

/**
 * 把相对路径转成绝对 URL。
 * 注意：path 以 "/" 开头，new URL() 会只保留 base 的 origin，
 * 因此 site.url 已含 /YoRsk_astro/ 也不会出现双重前缀。
 * @param {string} path 站内的根相对路径（已含 base）
 * @returns {string} 绝对 URL
 */
function toAbsoluteUrl(path: string): string {
  return new URL(path, config.site.url).href;
}

/** RSSFeedItem 的 pubDate 是选填，这里我们自己保证一定有值，方便排序。 */
type FeedItem = RSSFeedItem & { pubDate: Date };

/**
 * 生成 RSS feed 条目：文章 + 笔记，按「最后更新时间」倒序合并。
 *
 * 说明：旧 Hugo 站的 mainSections 只有 posts，RSS 里不含笔记；
 * 这里把笔记也纳入（设计文档 T03 验收要求 3 条记录），对老订阅者是增量信息。
 * 若想恢复成「只有文章」，删掉下面的 notes 部分即可。
 *
 * @returns {Promise<RSSFeedItem[]>} 排序后的 feed 条目
 */
export async function buildRssItems(): Promise<RSSFeedItem[]> {
  const [posts, notes] = await Promise.all([
    getCollection("posts"),
    getCollection("notes"),
  ]);

  const postItems: FeedItem[] = getSortedPosts(posts).map(
    ({ data, id, filePath }) => ({
      link: toAbsoluteUrl(getPostUrl(id, filePath, config.site.lang)),
      title: data.title,
      description: data.description,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
    })
  );

  const noteItems: FeedItem[] = getSortedNotes(notes).map(
    ({ data, id, filePath }) => ({
      link: toAbsoluteUrl(getNoteUrl(id, filePath, config.site.lang)),
      title: data.title,
      description: data.description,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
    })
  );

  return [...postItems, ...noteItems].sort(
    (a, b) => b.pubDate.getTime() - a.pubDate.getTime()
  );
}
