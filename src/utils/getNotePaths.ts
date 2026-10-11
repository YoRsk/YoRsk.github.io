import { getRelativeLocaleUrl } from "astro:i18n";
import { NOTES_PATH } from "@/content.config";
import { slugifyStr } from "./slugify";
import config from "@/config";

/**
 * 取笔记文件在 collection base 目录下的中间路径段。
 * 例如 filePath = "src/content/notes/2026/foo.md" → ["2026"]
 * @param {string | undefined} filePath getCollection 返回的笔记源文件绝对路径
 * @returns {string[]} 中间目录段（已 slugify，已排除 `_` 开头的目录）
 */
function getNotePathSegments(filePath: string | undefined): string[] {
  return (
    filePath
      ?.replace(NOTES_PATH, "")
      .split("/")
      .filter(path => path !== "")
      .filter(path => !path.startsWith("_"))
      .slice(0, -1)
      .map(segment => slugifyStr(segment)) ?? []
  );
}

/**
 * 从 collection id 里取出最后一段作为 slug。
 * @param {string} id 笔记 id（相对 base 目录，不含扩展名）
 * @returns {string} slug
 */
function getIdSlug(id: string): string {
  const noteId = id.split("/");
  return noteId.length > 0 ? String(noteId[noteId.length - 1]) : id;
}

/**
 * 拼出 base 目录之后的相对路径（不含扩展名）。
 * @param {string} id 笔记 id
 * @param {string | undefined} filePath 笔记源文件路径
 * @returns {string} 形如 "welcome" 或 "subdir/welcome"
 */
function getNoteSlugPath(id: string, filePath: string | undefined): string {
  const pathSegments = getNotePathSegments(filePath);
  const slug = getIdSlug(id);
  return pathSegments.length > 0
    ? [...pathSegments, slug].join("/")
    : String(slug);
}

/**
 * 供 getStaticPaths 的 params.slug 使用：不带 base、不带 locale 的纯路径。
 * @param {string} id 笔记 id
 * @param {string | undefined} filePath 笔记源文件路径
 * @returns {string} 形如 "/welcome"
 */
export function getNoteSlug(id: string, filePath: string | undefined): string {
  return `/${getNoteSlugPath(id, filePath)}`;
}

/**
 * 供 <a href> 与 RSS link 使用：自动带上 locale 与 astro.config.ts 的 base。
 * @param {string} id 笔记 id
 * @param {string | undefined} filePath 笔记源文件路径
 * @param {string} [locale] 目标语言，默认取配置里的 site.lang
 * @returns {string} 形如 "/notes/welcome"
 */
export function getNoteUrl(
  id: string,
  filePath: string | undefined,
  locale: string | undefined = config.site.lang
): string {
  return getRelativeLocaleUrl(locale, `notes/${getNoteSlugPath(id, filePath)}`);
}
