import re
from dataclasses import dataclass
from pathlib import Path
from textwrap import dedent

_FRAG_HEADER = dedent(
    """\
    #version 300 es
    #if GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    precision highp int;
    #else
    precision mediump float;
    precision mediump int;
    #endif
    out vec4 out_color;
    uniform float time;
    uniform vec2 resolution;
    """
)


@dataclass
class Fragment:
    content: str
    refs: list[str]


def extract_inc(line: str) -> str | None:
    m = re.match(r"\s*#include\s*(?P<inc>\S+)", line)
    if not m:
        return None
    inc = m.group("inc")
    if "/" in inc:
        return None
    return inc + ".glsl"


def _read_shader_rec(
    path: Path,
    included: dict[str, int],
    ln: bool = True,
    cur_fid: int = 0,
) -> str:
    content = []
    fid = cur_fid
    included[path.name] = cur_fid
    with open(path) as f:
        for i, line in enumerate(f, 1):
            inc = extract_inc(line)
            if not inc:
                content.append(line)
                continue
            if inc in included:
                continue
            fid += 1
            inc_content = _read_shader_rec(path.parent / inc, included, ln, fid)
            if ln:
                content.append(f"#line 1 {fid}\n")
            content.append(inc_content)
            if ln:
                content.append(f"#line {i+1} {cur_fid}\n")
    return "".join(content)


def read_shader(
    path: Path,
    add_header: bool = True,
    set_lines_directives: bool = True,
) -> Fragment:
    included = dict()
    header = _FRAG_HEADER if add_header else ""
    content = _read_shader_rec(path, included, set_lines_directives)
    swapped = {v: k for k, v in included.items()}
    refs = [swapped[i] for i in range(len(swapped))]
    return Fragment(header + content, refs)
