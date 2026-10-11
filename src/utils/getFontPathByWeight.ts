import type { FontData } from "astro:assets";

export function getFontPathByWeight(
  fonts: FontData[],
  weight: number,
  options?: {
    style?: "normal" | "italic";
    format?: string;
  }
): string | undefined {
  const style = options?.style ?? "normal";
  const format = options?.format ?? "truetype";

  /*
   * 必须两轮扫描，不能在一个条目上就 `?? font.src[0]` 兜底。
   *
   * 原因：astro.config.ts 里 formats 是 ["woff2", "woff", "ttf"] 时，Google Sans Code
   * 是**可变字体**，fontData 里前 10 个条目都是 woff2（同一个文件覆盖 300–700 全字重），
   * 每个字重都能匹配上；而带 woff / truetype 的静态实例排在后面。
   * 若命中第一个 woff2 条目就退化成 src[0]，OG 图会拿到 woff2，
   * satori/opentype.js 解析不了 → "Unsupported OpenType signature wOF2" → 构建失败。
   *
   * 第一轮：只在「确实带目标格式」的条目里挑。
   */
  for (const font of fonts) {
    if (font.weight === String(weight) && font.style === style) {
      const src = font.src.find(file => file.format === format);
      if (src) return src.url;
    }
  }

  // 第二轮：没有任何条目带该格式，才接受第一个匹配项的任意格式。
  for (const font of fonts) {
    if (font.weight === String(weight) && font.style === style) {
      const src = font.src[0];
      if (src) return src.url;
    }
  }

  return undefined;
}
