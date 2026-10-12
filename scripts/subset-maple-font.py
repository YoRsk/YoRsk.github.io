"""
Maple Mono NF CN 子集化工具 —— 为 YoRsk 博客生成中文回退字体。

源字体
    MapleMono-NF-CN[wght].ttf v8.003（v8.0-beta.3 发行包）
    https://github.com/subframe7536/maple-font
    许可：SIL Open Font License 1.1（允许子集化与再分发）

为什么最终产出的是「静态字重」而不是「可变字体」
    实测同一字符集下两者体积对比：
        字符集                含 Figure        体积
        GB2312 全 6763 字     可变 wght        4354 KiB (4.25 MiB)
        GB2312 全 6763 字     静态 400         1478 KiB (1.44 MiB)
        GB2312 一级 3755 字   可变 wght        2468 KiB (2.41 MiB)
        GB2312 一级 3755 字   静态 400          844 KiB
    gvar（可变增量数据）独占约 2/3 的体积；同一轴向的三份 glyf 轮廓让汉字
    的平均单字成本从 ~0.2 KiB 涨到 ~0.57 KiB。
    若坚持保留可变轴，要压进 1.5 MiB 只能砍到 ~2000 汉字 —— 比原本的兜底
    方案（《通用规范汉字表》一级字 3500）还少四成，会出现大量缺字。
    取舍结论：优先保住 GB2312 全覆盖（不缺字），静态实例化到 wght=400。
    代价：中文不再有连续字重变化，粗体由浏览器合成（faux bold）。

完整复现步骤
    1) 取源字体（43 MB 的 zip，内含 43 MB 的可变 TTF）：
       https://github.com/subframe7536/maple-font/releases/download/v8.0-beta.3/MapleMono-NF-CN-VF.zip
       解压后取 MapleMono-NF-CN[wght].ttf
    2) 建隔离环境并装依赖（不要污染系统 Python）：
       python -m venv <venv>
       <venv>/Scripts/pip install fonttools brotli
    3) 生成：
       <venv>/Scripts/python scripts/subset-maple-font.py \
           --font <解压目录>/MapleMono-NF-CN[wght].ttf \
           --out public/fonts/maple-mono-nf-cn-subset.woff2 \
           --mode static --weight 400 --tier gb2312

用法
    python subset_maple.py --mode static  --weight 400 --tier gb2312 \
        --font <源 ttf> --out <目标 woff2>
    python subset_maple.py --mode variable --tier gb2312 --dry-run   # 只统计体积

可复现性说明（2026-10-12 实测）
    同一命令重跑两次，产物**功能等价**（cmap 8112、汉字 6763 完全一致），
    但**字节级不完全相同**（实测相差 12 字节，sha256 不同）。
    原因是 woff2 压缩的元数据/字典存在非确定性，与字符集无关。
    若需要用 sha256 做构建产物校验，请改用字形数 + 覆盖率这类语义指标。
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import unicodedata
from pathlib import Path

# Nerd Font 图标全部落在 Unicode 私有区。博客正文用不到，且是源字体 43 MB
# 里的大头（41288 个 cmap 条目中有 13000+ 是图标），一律剔除。
PUA_RANGES: tuple[tuple[int, int], ...] = (
    (0xE000, 0xF8FF),      # BMP 私有区
    (0xF0000, 0xFFFFD),    # 第 15 平面私有区
    (0x100000, 0x10FFFD),  # 第 16 平面私有区
)

# 中文回退字体的非汉字部分：只保留中文排版与中英混排真正需要的符号。
# 刻意不含日文假名（U+3040–U+30FF）、上标下标、货币区、字母式符号等区块 ——
# 它们不在需求范围内，每个汉字之外的字形都要按 ~100 B 计费。
BASE_RANGES: tuple[tuple[int, int], ...] = (
    (0x0020, 0x007E),  # 基本拉丁字母、数字、ASCII 标点
    (0x00A0, 0x00FF),  # Latin-1 补充：° ± × ÷ é ü 等
    (0x2010, 0x203B),  # 通用标点：– — ‘ ’ “ ” … ‰ ※
    (0x2190, 0x21FF),  # 箭头 ← → ⇒
    (0x2200, 0x22FF),  # 数学运算符 ≤ ≥ ≠ ≈ ∞
    (0x25A0, 0x25FF),  # 几何图形 ■ □ ▲
    (0x3000, 0x303F),  # CJK 标点：、 。 《 》 【 】 〜 〰
    (0xFF00, 0xFFEF),  # 全角／半角形式：，！？：（）ＡＢＣ
)

# 上面区间之外、中文语境里确实常见的零星符号。
EXTRA_CHARS: tuple[str, ...] = (
    "€",  # U+20AC
    "℃",  # U+2103
    "℉",  # U+2109
    "™",  # U+2122
)


def is_pua(code: int) -> bool:
    """判断码位是否位于 Unicode 私有区（Nerd Font 图标所在区域）。"""
    return any(lo <= code <= hi for lo, hi in PUA_RANGES)


def decode_gb2312_range(first_lo: int, first_hi: int) -> set[str]:
    """枚举 GB2312 双字节码位，返回其中所有可解字符。

    GB2312 的排列是「一级字（拼音序，区 0xB0–0xD7）+ 二级字（部首序，区
    0xD8–0xF7）+ 符号（区 0xA1–0xA9）」，直接让编解码器决定合法性，
    无需外部字表即可得到权威字符集。
    """
    chars: set[str] = set()
    for hi in range(first_lo, first_hi + 1):
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                continue
    return chars


def build_charset(tier: str) -> tuple[set[str], str]:
    """按档位构建目标字符集，返回（字符集, 来源说明）。"""
    chars: set[str] = set()
    sources: list[str] = []

    for lo, hi in BASE_RANGES:
        for code in range(lo, hi + 1):
            ch = chr(code)
            # 跳过未分配码位，避免 pyftsubset 对控制字符告警
            if unicodedata.category(ch) == "Cn":
                continue
            chars.add(ch)
    chars.update(EXTRA_CHARS)
    sources.append(
        "非汉字：ASCII + Latin-1 + 通用标点 + CJK 标点(U+3000–303F) "
        "+ 全角形式(U+FF00–FFEF) + 箭头/运算符/几何图形 + 少量零星符号"
    )

    if tier == "gb2312":
        all_gb = decode_gb2312_range(0xA1, 0xFE)
        chars |= all_gb
        sources.append("汉字：GB2312 全部 6763 字（一级 3755 + 二级 3008）+ 682 内置符号")
    elif tier == "level1":
        # 收窄档：仅 GB2312 一级字（拼音序常用字）
        chars |= decode_gb2312_range(0xB0, 0xD7)
        sources.append("汉字：GB2312 一级字 3755（收窄档）")
    else:
        raise ValueError(f"未知档位：{tier}")

    before = len(chars)
    chars = {c for c in chars if not is_pua(ord(c))}
    if before != len(chars):
        sources.append(f"已剔除 {before - len(chars)} 个私有区（Nerd Font 图标）码位")

    return chars, "；".join(sources)


def load_font_cmap(font_path: Path) -> set[str]:
    """读取源字体 cmap，返回其实际支持的字符集（已剔除私有区）。"""
    from fontTools.ttLib import TTFont

    with TTFont(font_path, lazy=True) as font:
        return {chr(code) for code in font.getBestCmap() if not is_pua(code)}


def subset(src_ttf: Path, chars: set[str], out: Path) -> None:
    """调用 pyftsubset 生成 woff2。"""
    text_file = out.with_suffix(".charset.txt")
    text_file.write_text("".join(sorted(chars)), encoding="utf-8")
    cmd = [
        sys.executable,
        "-m",
        "fontTools.subset",
        str(src_ttf),
        f"--text-file={text_file}",
        f"--output-file={out}",
        "--flavor=woff2",  # 依赖 brotli
        "--drop-tables+=GSUB,GPOS",  # 纯拉丁连字/定位用不上
        "--layout-features=",  # 丢弃全部 OpenType 特性，进一步瘦身
        "--no-hinting",  # 屏幕渲染不需要 TrueType 指令
        "--desubroutinize",
        "--notdef-outline",
        "--notdef-glyph",
        "--recommended-glyphs",
        "--name-IDs=*",  # 保留全部 name 记录：OFL 要求保留版权声明
        "--name-legacy",
        "--no-prune-unicode-ranges",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    text_file.unlink(missing_ok=True)
    if result.returncode != 0:
        raise RuntimeError(f"pyftsubset 失败：\n{result.stderr}")
    if result.stderr.strip():
        print(f"[WARN] pyftsubset stderr: {result.stderr.strip()[:300]}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Maple Mono NF CN 子集化")
    parser.add_argument("--font", required=True, type=Path, help="源可变 TTF 路径")
    parser.add_argument("--out", required=True, type=Path, help="输出 woff2 路径")
    parser.add_argument(
        "--tier", default="gb2312", choices=["level1", "gb2312"], help="汉字字符集档位"
    )
    parser.add_argument(
        "--mode", default="static", choices=["variable", "static"], help="是否保留可变轴"
    )
    parser.add_argument(
        "--weight", default=400, type=int, help="静态模式下的实例字重（默认 400）"
    )
    parser.add_argument("--dry-run", action="store_true", help="只统计，不生成")
    args = parser.parse_args()

    if not args.font.is_file():
        print(f"[FATAL] 源字体不存在：{args.font}", file=sys.stderr)
        return 1

    charset, source_desc = build_charset(args.tier)
    font_chars = load_font_cmap(args.font)
    effective = charset & font_chars
    missing = sorted(charset - font_chars)
    hanzi = {c for c in effective if "CJK UNIFIED" in unicodedata.name(c, "")}

    print(f"[INFO] 档位 / 模式    : {args.tier} / {args.mode}"
          + (f" (wght={args.weight})" if args.mode == "static" else ""))
    print(f"[INFO] 目标字符集    : {len(charset)}")
    print(f"[INFO] 实际保留字形  : {len(effective)}（其中汉字 {len(hanzi)}）")
    if missing:
        sample = "".join(missing[:16])
        print(f"[WARN] 源字体缺失 {len(missing)} 个字符，样例：{sample!r}")
    print(f"[INFO] 字符来源      : {source_desc}")

    if args.dry_run:
        return 0

    args.out.parent.mkdir(parents=True, exist_ok=True)
    src: Path = args.font
    tmp_static: Path | None = None
    if args.mode == "static":
        from fontTools.ttLib import TTFont
        from fontTools.varLib import instancer

        print(f"[INFO] 实例化到 wght={args.weight}（会彻底移除 fvar/gvar）...")
        instanced = instancer.instantiateVariableFont(
            TTFont(args.font), {"wght": args.weight}, inplace=False, updateFontNames=False
        )
        tmp_static = args.out.with_name(f"{args.out.stem}.instance.ttf")
        instanced.save(tmp_static)
        src = tmp_static

    try:
        subset(src, effective, args.out)
    finally:
        if tmp_static is not None:
            tmp_static.unlink(missing_ok=True)

    size = args.out.stat().st_size
    print(f"[OK] 输出文件：{args.out}")
    print(f"[OK] 体积：{size:,} B = {size / 1024:.1f} KiB = {size / 1024 / 1024:.2f} MiB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
