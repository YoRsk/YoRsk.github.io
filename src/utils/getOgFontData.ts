import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fontData, experimental_getFontFileURL } from "astro:assets";
import { getFontPathByWeight } from "./getFontPathByWeight";

/** astro.config.ts 里 fonts[].cssVariable 的值 */
const FONT_CSS_VARIABLE = "--font-google-sans-code";

/** 字体族名，必须与 satori 的 fontFamily 一致 */
export const OG_FONT_FAMILY = "Google Sans Code";

/** Vite/Astro 把构建期字体输出到 `dist/_astro/` 下，用于 HTTP 抓取失败时的兜底 */
const ASSETS_MARKER = "_astro/";

/**
 * 判断一段字节是否为 satori（opentype.js）能解析的 sfnt。
 * 合法 magic：0x00010000 / "true" / "ttcf" / "OTTO"。
 * @param {ArrayBuffer} data 待校验的字节流
 * @returns {boolean} 是否是 sfnt
 */
function isSfnt(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) return false;
  const header = new Uint8Array(data.slice(0, 4));
  const signature = String.fromCharCode(...header);
  return (
    (header[0] === 0x00 && header[1] === 0x01 && header[2] === 0x00) ||
    signature === "true" ||
    signature === "ttcf" ||
    signature === "OTTO"
  );
}

/**
 * 直接从已生成的 `dist/_astro/...` 读取字体文件兜底。
 * @param {string} fontPath astro:assets 返回的字体路径
 * @returns {Promise<ArrayBuffer>} 字体二进制
 */
async function readFontFromDisk(fontPath: string): Promise<ArrayBuffer> {
  // 注意用 lastIndexOf：base 里也可能含 "_astro/"（例如子目录部署时的 /<base>/_astro/fonts/x.ttf）
  const markerIndex = fontPath.lastIndexOf(ASSETS_MARKER);
  const relativePath =
    markerIndex >= 0
      ? fontPath.slice(markerIndex + ASSETS_MARKER.length)
      : fontPath.replace(/^\/+/, "");
  const buffer = await readFile(
    join(process.cwd(), "dist", ASSETS_MARKER, relativePath)
  );
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

/**
 * 取构建期字体二进制：先走模板原生的 HTTP 抓取，
 * 若被本机代理拦截（返回非 sfnt 的错误页）则回退到直接读磁盘。
 *
 * 背景：某些 Windows 环境设了 HTTP_PROXY，构建期
 * `fetch("http://[::]:<port>/_astro/...")` 会被代理拦掉并返回错误页，
 * satori 解析时报 "Unsupported OpenType signature ..."，导致 OG 图构建失败。
 *
 * @param {string} fontPath astro:assets 返回的字体路径
 * @param {URL} requestUrl 当前请求 URL（experimental_getFontFileURL 需要）
 * @returns {Promise<ArrayBuffer>} 字体二进制
 */
async function loadFontData(
  fontPath: string,
  requestUrl: URL
): Promise<ArrayBuffer> {
  try {
    const response = await fetch(
      experimental_getFontFileURL(fontPath, requestUrl)
    );
    if (response.ok) {
      const data = await response.arrayBuffer();
      if (isSfnt(data)) return data;
    }
  } catch {
    // 抓不到就走下面的磁盘兜底
  }
  return readFontFromDisk(fontPath);
}

/**
 * 取 satori 生成 OG 图所需的 400 / 700 两个字重。
 * @param {URL} requestUrl 当前请求 URL
 * @returns {Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[]>}
 *   可直接传给 satori 的 fonts 参数
 */
export async function getOgFonts(requestUrl: URL): Promise<
  {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 700;
    style: "normal";
  }[]
> {
  const fonts = fontData[FONT_CSS_VARIABLE];
  const regularFontPath = getFontPathByWeight(fonts, 400);
  const boldFontPath = getFontPathByWeight(fonts, 700);

  if (regularFontPath === undefined || boldFontPath === undefined) {
    throw new Error("Cannot find the font path.");
  }

  const [regularData, boldData] = await Promise.all([
    loadFontData(regularFontPath, requestUrl),
    loadFontData(boldFontPath, requestUrl),
  ]);

  return [
    { name: OG_FONT_FAMILY, data: regularData, weight: 400, style: "normal" },
    { name: OG_FONT_FAMILY, data: boldData, weight: 700, style: "normal" },
  ];
}
