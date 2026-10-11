import type { CollectionEntry } from "astro:content";
import config from "@/config";

/**
 * 判断一篇笔记是否可以展示给读者。
 * - 草稿永远不展示
 * - 生产环境：定时发布窗口内的笔记不展示（开发模式始终展示，方便写作）
 * @param {{ data: CollectionEntry<"notes">["data"] }} note 笔记条目
 * @returns {boolean} 是否可展示
 */
export function noteFilter({ data }: CollectionEntry<"notes">): boolean {
  const isPublishTimePassed =
    Date.now() >
    new Date(data.pubDatetime).getTime() - config.posts.scheduledPostMargin;
  return !data.draft && (import.meta.env.DEV || isPublishTimePassed);
}

/**
 * 按「最后更新时间」倒序返回可展示的笔记（有 modDatetime 用 modDatetime，否则用 pubDatetime）。
 * @param {CollectionEntry<"notes">[]} notes 笔记集合
 * @returns {CollectionEntry<"notes">[]} 排序并过滤后的笔记
 */
export function getSortedNotes(
  notes: CollectionEntry<"notes">[]
): CollectionEntry<"notes">[] {
  return notes
    .filter(noteFilter)
    .sort(
      (a, b) =>
        Math.floor(
          new Date(b.data.modDatetime ?? b.data.pubDatetime).getTime() / 1000
        ) -
        Math.floor(
          new Date(a.data.modDatetime ?? a.data.pubDatetime).getTime() / 1000
        )
    );
}
