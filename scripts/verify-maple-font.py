"""
切片自检：覆盖率 / unicode-range 不重叠 / CSS 与文件一一对应 / 单页命中字节。

用法
    python scripts/verify-maple-font.py
退出码 0 表示全部通过。
"""

from __future__ import annotations

import importlib.util
import re
import sys
import unicodedata
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
FONT_DIR = REPO / "public" / "fonts"
GLOBAL_CSS = REPO / "src" / "styles" / "global.css"

_spec = importlib.util.spec_from_file_location(
    "subset_maple_font", REPO / "scripts" / "subset-maple-font.py"
)
subset_mod = importlib.util.module_from_spec(_spec)
sys.modules["subset_maple_font"] = subset_mod
_spec.loader.exec_module(subset_mod)

failures: list[str] = []

# ---------------------------------------------------------------- 1. 覆盖率
gb = subset_mod.decode_gb2312_range(0xA1, 0xFE)
hanzi = {c for c in gb if "CJK UNIFIED" in unicodedata.name(c, "")}
print(f"[1] GB2312 汉字 {len(hanzi)}")

css = GLOBAL_CSS.read_text(encoding="utf-8")
faces = re.findall(
    r'@font-face\s*\{[^}]*?src:\s*url\("/fonts/([^"]+)"\)[^}]*?unicode-range:\s*([^;]+);',
    css,
)
print(f"[1] CSS 里 @font-face 共 {len(faces)} 条")

covered: dict[int, str] = {}
overlaps = 0
for name, raw_range in faces:
    path = FONT_DIR / name
    if not path.is_file():
        failures.append(f"CSS 引用的字体文件不存在：{name}")
        continue
    for part in raw_range.split(","):
        part = part.strip()
        m = re.fullmatch(r"U\+([0-9A-Fa-f]{4,6})(?:-([0-9A-Fa-f]{4,6}))?", part)
        if not m:
            failures.append(f"{name} 的 unicode-range 片段无法解析：{part!r}")
            continue
        lo = int(m.group(1), 16)
        hi = int(m.group(2), 16) if m.group(2) else lo
        for code in range(lo, hi + 1):
            if code in covered:
                overlaps += 1
                if overlaps <= 5:
                    failures.append(
                        f"码位 U+{code:04X} 同时被 {covered[code]} 和 {name} 声明"
                    )
            covered[code] = name

missing_hanzi = sorted(c for c in hanzi if ord(c) not in covered)
if missing_hanzi:
    failures.append(f"有 {len(missing_hanzi)} 个 GB2312 汉字未被任何切片覆盖，样例：{''.join(missing_hanzi[:20])}")
print(f"[1] 被 unicode-range 覆盖的 GB2312 汉字 {len(hanzi) - len(missing_hanzi)}/{len(hanzi)}")
print(f"[1] unicode-range 重叠码位数 {overlaps}")

# 实际字形也要在，不能只写了 range 而没有字形
from fontTools.ttLib import TTFont  # noqa: E402

glyphs: set[str] = set()
disk = 0
for p in sorted(FONT_DIR.glob("maple-mono-nf-cn-*.woff2")):
    if p.name == "maple-mono-nf-cn-subset.woff2":
        continue
    disk += p.stat().st_size
    with TTFont(p, lazy=True) as f:
        glyphs |= {chr(c) for c in f.getBestCmap()}
missing_glyph = sorted(c for c in hanzi if c not in glyphs)
if missing_glyph:
    failures.append(f"有 {len(missing_glyph)} 个汉字在所有切片里都没有字形")
print(f"[1] 实际含字形的 GB2312 汉字 {len(hanzi) - len(missing_glyph)}/{len(hanzi)}")

# ---------------------------------------------------------------- 2. 文件一致性
css_files = {n for n, _ in faces}
disk_files = {
    p.name for p in FONT_DIR.glob("maple-mono-nf-cn-*.woff2")
    if p.name != "maple-mono-nf-cn-subset.woff2"
}
if css_files != disk_files:
    failures.append(
        f"CSS 与磁盘文件不一致：仅 CSS 有 {sorted(css_files - disk_files)}；"
        f"仅磁盘有 {sorted(disk_files - css_files)}"
    )
print(f"[2] 切片文件数 {len(disk_files)}，磁盘总体积 {disk:,} B = {disk / 1024 / 1024:.2f} MiB")
print(f"[2] 与 CSS 一致：{css_files == disk_files}")

legacy = FONT_DIR / "maple-mono-nf-cn-subset.woff2"
if legacy.is_file():
    failures.append(f"切片前的单文件仍在：{legacy.name}（应已删除）")

# ---------------------------------------------------------------- 3. 单页命中
print("[3] 单页真实命中（按落盘文件大小；latin 片单列，实际由 Google Sans Code 顶掉）")
for rel in sorted((REPO / "src" / "content").rglob("*.md")):
    text = set(rel.read_text(encoding="utf-8"))
    total = latin = 0
    hits = 0
    for name, _r in faces:
        path = FONT_DIR / name
        if not path.is_file():
            continue
        with TTFont(path, lazy=True) as f:
            chars = {chr(c) for c in f.getBestCmap()}
        if not (chars & text):
            continue
        hits += 1
        total += path.stat().st_size
        if name.endswith("-latin.woff2"):
            latin += path.stat().st_size
    print(
        f"    {rel.relative_to(REPO)}: {hits} 片 / {total:,} B "
        f"= {total / 1000:.1f} KB（去 latin 后 {(total - latin) / 1000:.1f} KB）"
    )

# ---------------------------------------------------------------- 4. 泛化指标
# 按字频加权随机抽 361 个不同汉字（有放回抽样直到凑够 361 个不同的字），
# 重复 400 次取命中字节的**中位数**。不依赖现有任何一篇正文，用来证明
# 分块不是照着现有文章贴出来的。
import random  # noqa: E402
from fontTools.ttLib import TTFont as _TTFont  # noqa: E402

freq_line = (REPO / "scripts" / "maple-hanzi-freq.txt").read_text(encoding="utf-8").splitlines()
_freq_order = [ln.split("\t")[0] for ln in freq_line if ln.strip()]
_freq_vals = [float(ln.split("\t")[1]) for ln in freq_line if ln.strip()]
_rank_of = {c: i for i, c in enumerate(_freq_order)}
_slice_of: dict[str, str] = {}
_slice_size: dict[str, int] = {}
for _name, _r in faces:
    _p = FONT_DIR / _name
    if not _p.is_file():
        continue
    _slice_size[_name] = _p.stat().st_size
    with _TTFont(_p, lazy=True) as _f:
        for _c in _f.getBestCmap():
            _slice_of.setdefault(chr(_c), _name)

rng = random.Random(20261019)
_samples: list[int] = []
for _ in range(400):
    _seen: set[int] = set()
    while len(_seen) < 361:
        _seen.add(rng.choices(range(len(_freq_order)), weights=_freq_vals, k=1)[0])
    _hit: set[str] = set()
    for _r in _seen:
        _s = _slice_of.get(_freq_order[_r])
        if _s:
            _hit.add(_s)
    # 第 0 片含符号核心，任何出现中文的页面都会命中
    _hit.add("maple-mono-nf-cn-00.woff2")
    _samples.append(sum(_slice_size[s] for s in _hit))
_samples.sort()
median = _samples[len(_samples) // 2]
mx_name = max(_slice_size, key=lambda k: _slice_size[k])
print(
    f"[4] 随机字集抽样（361 字 x 400 次）命中中位数 = {median:,} B "
    f"= {median / 1024:.1f} KiB"
)
print(f"[4] 最大单片 {mx_name} = {_slice_size[mx_name]:,} B = {_slice_size[mx_name] / 1024:.1f} KiB")

print()
if failures:
    print("[FAIL]")
    for f in failures:
        print("  - " + f)
    raise SystemExit(1)
print("[PASS] 全部检查通过")
