import re
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


def extract_inc(line: str) -> str | None:
    m = re.match(r"\s*#include\s*(?P<inc>\S+)", line)
    if not m:
        return None
    inc = m.group("inc")
    if "/" in inc:
        return None
    return inc + ".glsl"


def _read_shader_rec(path: Path, included: set) -> str:
    content = []
    with open(path) as f:
        for line in f:
            inc = extract_inc(line)
            if not inc:
                content.append(line)
                continue
            if inc in included:
                continue
            included.add(inc)
            inc_content = _read_shader_rec(path.parent / inc, included)
            content.append(inc_content)
    return "".join(content)


def read_shader(path: Path, add_header: bool = True) -> str:
    included = set()
    header = _FRAG_HEADER if add_header else ""
    return header + _read_shader_rec(path, included)
