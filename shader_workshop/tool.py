import argparse
from pathlib import Path

from .frag import read_shader


def main_frag():

    def frag(filename: str) -> Path:
        if not filename.endswith(".frag"):
            raise argparse.ArgumentTypeError("fragment must have a .frag extension")
        return Path(filename)

    parser = argparse.ArgumentParser(description="Print the combined shader")
    parser.add_argument(
        "--no-header",
        action="store_true",
        help="Do not include the header",
    )
    parser.add_argument("frag", type=frag, help="path to fragment shader")
    args = parser.parse_args()
    print(read_shader(args.frag, not args.no_header).rstrip())
