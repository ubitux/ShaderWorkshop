import sys
from pathlib import Path

from .frag import read_shader


def main_frag():
    if len(sys.argv) != 2 and sys.argv[1].endswith("frag"):
        print("Usage: {sys.argv[0]} /path/to/file.frag", file=sys.stderr)
        sys.exit(1)
    print(read_shader(Path(sys.argv[1])))
