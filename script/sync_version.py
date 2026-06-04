#!/usr/bin/env python3
"""Align package.json version with the Release Drafter tag (verify-version)."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_PACKAGE_JSON = _REPO_ROOT / 'package.json'


def read_version() -> str:
    text = _PACKAGE_JSON.read_text(encoding='utf8')
    match = re.search(r'"version"\s*:\s*"([^"]+)"', text)
    if not match:
        msg = f'Could not parse version from {_PACKAGE_JSON}'
        raise RuntimeError(msg)
    return match.group(1)


def write_version(release_tag: str) -> None:
    content = _PACKAGE_JSON.read_text(encoding='utf8')
    new_content, count = re.subn(
        r'("version"\s*:\s*")[^"]+(")',
        rf'\g<1>{release_tag}\2',
        content,
        count=1,
    )
    if count != 1:
        msg = f'Could not update version in {_PACKAGE_JSON}'
        raise RuntimeError(msg)
    _PACKAGE_JSON.write_text(new_content, encoding='utf8')


def main() -> None:
    parser = argparse.ArgumentParser(description='Sync package.json version to release tag')
    parser.add_argument(
        '--set-version',
        required=True,
        help='Exact CalVer tag (e.g. 2026.06.0) for verify-version',
    )
    args = parser.parse_args()

    if Path.cwd().resolve() != _REPO_ROOT.resolve():
        print(f'Run from repository root: {_REPO_ROOT}', file=sys.stderr)
        sys.exit(1)

    release_tag = args.set_version.strip()
    write_version(release_tag)
    print(release_tag)


if __name__ == '__main__':
    main()
