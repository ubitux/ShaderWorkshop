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
    uniform vec2 mouse;
    """
)


type Control = ControlI32 | ControlF32 | ControlBool | ControlColor


@dataclass
class ControlI32:
    name: str
    val: int = 0
    min: int = 0
    max: int = 100

    @property
    def typ(self) -> str:
        return "i32"


@dataclass
class ControlF32:
    name: str
    val: float = 0.0
    min: float = 0.0
    max: float = 1.0

    @property
    def typ(self) -> str:
        return "f32"


@dataclass
class ControlBool:
    name: str
    val: bool = False

    @property
    def typ(self) -> str:
        return "bool"


@dataclass
class ControlColor:
    name: str
    val: str = "#000000"

    @property
    def typ(self) -> str:
        return "color"


@dataclass
class Fragment:
    content: str
    refs: list[str]
    controls: list[Control]


def extract_inc(line: str) -> str | None:
    m = re.match(r"\s*#include\s*(?P<inc>\S+)", line)
    if not m:
        return None
    inc = m.group("inc")
    if "/" in inc:
        return None
    return inc + ".glsl"


_GL_TYPE_TO_CTL_CLS = dict(
    float=ControlF32,
    int=ControlI32,
    bool=ControlBool,
    vec3=ControlColor,
)


def extract_control(line: str) -> Control | None:
    r = r"\s*uniform\s+(?P<type>float|int|bool|vec3)\s+(?P<name>\w+)\s*;(\s*//\s*(?P<com>.*))?\s*$"
    m = re.match(r, line)
    if not m:
        return None
    typ, name, com = m.group("type", "name", "com")
    ctl = _GL_TYPE_TO_CTL_CLS[typ](name)
    if com:
        for m in re.finditer(r"(?P<key>\w+)\s*:\s*(?P<val>[\d\.,]+)", com):
            k, v = m.group("key", "val")
            if isinstance(ctl, ControlF32):
                v = float(v)
                if k == "min":
                    ctl.min = v
                elif k == "max":
                    ctl.max = v
                elif k == "def":
                    ctl.val = v
            elif isinstance(ctl, ControlI32):
                v = int(v)
                if k == "min":
                    ctl.min = v
                elif k == "max":
                    ctl.max = v
                elif k == "def":
                    ctl.val = v
            elif isinstance(ctl, ControlBool):
                if k == "def":
                    ctl.val = bool(int(v))
            elif isinstance(ctl, ControlColor):
                if k == "def":
                    r, g, b = [round(float(x) * 255) for x in v.split(",", maxsplit=3)]
                    ctl.val = f"#{r:02x}{g:02x}{b:02x}"
    return ctl


def _read_shader_rec(
    path: Path,
    included: dict[str, int],
    ln: bool = True,
    cur_fid: int = 0,
) -> tuple[str, list[Control], int]:
    content = []
    if ln:
        content.append(f"#line 1 {cur_fid}\n")
    fid = cur_fid
    included[path.name] = cur_fid
    controls = []
    with open(path) as f:
        for i, line in enumerate(f, 1):
            ctl = extract_control(line)
            if ctl:
                controls.append(ctl)
                content.append(line)
                continue
            inc = extract_inc(line)
            if not inc:
                content.append(line)
                continue
            if inc in included:
                continue
            inc_content, ctls, fid = _read_shader_rec(
                path.parent / inc, included, ln, fid + 1
            )
            controls += ctls
            content.append(inc_content)
            if ln:
                content.append(f"#line {i+1} {cur_fid}\n")
    return "".join(content), controls, fid


def read_shader(
    path: Path,
    add_header: bool = True,
    set_lines_directives: bool = True,
) -> Fragment:
    included = dict()
    header = _FRAG_HEADER if add_header else ""
    content, controls, _ = _read_shader_rec(path, included, set_lines_directives)
    swapped = {v: k for k, v in included.items()}
    refs = [swapped[i] for i in range(len(swapped))]
    return Fragment(header + content, refs, controls)
