#!/usr/bin/env python3
"""Generate the bundled Braintrust CLI reference from the installed bt CLI."""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path


SUBCOMMAND = re.compile(r"^\s{2,}(?P<name>[a-z0-9][a-z0-9-]*)\s{2,}")


def get_help(cli: str, command: tuple[str, ...]) -> str:
    """Return help text for one bt command path."""
    result = subprocess.run(
        [cli, *command, "--help"],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        joined = " ".join([cli, *command, "--help"])
        raise RuntimeError(f"{joined} exited {result.returncode}: {result.stderr.strip()}")
    return result.stdout


def get_version(cli: str) -> str:
    result = subprocess.run(
        [cli, "--version"],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"{cli} --version exited {result.returncode}: {result.stderr.strip()}")
    return result.stdout.strip()


def child_commands(help_text: str, *, is_root: bool) -> list[str]:
    """Extract direct subcommands from clap-style help output."""
    children: list[str] = []
    in_commands = False
    for line in help_text.splitlines():
        if line == "Commands:" or (is_root and line == "Core"):
            in_commands = True
            continue
        if in_commands and (line == "Flags" or re.match(r"^[A-Z][A-Za-z ]*:$", line)):
            break
        if in_commands:
            match = SUBCOMMAND.match(line)
            if match:
                name = match.group("name")
                if name != "help":
                    children.append(name)
    return children


def generated_header(source: str, version: str) -> str:
    return (
        "<!-- GENERATED FILE — do not edit.\n"
        f"Source: `{source}` from {version}.\n"
        "Refresh: `python3 scripts/generate_reference.py`\n"
        "-->\n\n"
    )


def slug(command: tuple[str, ...]) -> str:
    return "-".join(command)


def write(path: Path, contents: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents, encoding="utf-8")


def discover(cli: str) -> dict[tuple[str, ...], str]:
    """Recursively load every command's local help, excluding virtual help commands."""
    discovered: dict[tuple[str, ...], str] = {}

    def visit(command: tuple[str, ...]) -> None:
        if command in discovered:
            return
        help_text = get_help(cli, command)
        discovered[command] = help_text
        for child in child_commands(help_text, is_root=not command):
            visit((*command, child))

    visit(())
    return discovered


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cli", default="bt", help="bt executable (default: bt)")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "references",
        help="Reference directory to replace (default: skill references directory)",
    )
    args = parser.parse_args()

    version = get_version(args.cli)
    commands = discover(args.cli)
    if len(commands) == 1:
        raise RuntimeError("No bt commands discovered from bt --help.")

    output = args.output.resolve()
    temporary = output.with_name(f"{output.name}.tmp")
    if temporary.exists():
        shutil.rmtree(temporary)
    temporary.mkdir(parents=True)

    root = commands.pop(())
    write(temporary / "root.md", generated_header("bt --help", version) + root)

    rows: list[tuple[str, str]] = []
    for command, help_text in sorted(commands.items()):
        filename = f"commands/{slug(command)}.md"
        source = " ".join(["bt", *command, "--help"])
        write(temporary / filename, generated_header(source, version) + help_text)
        rows.append((" ".join(["bt", *command]), filename))

    index = [
        "<!-- GENERATED FILE — do not edit. Refresh with `python3 scripts/generate_reference.py`. -->",
        "",
        "# Braintrust CLI command index",
        "",
        "Read [`root.md`](root.md) for top-level commands and global flags. "
        "Each command page is the exact corresponding local `bt ... --help` output.",
        "",
        "| Command | Reference |",
        "| --- | --- |",
    ]
    index.extend(f"| `{command}` | [{filename}](<{filename}>) |" for command, filename in rows)
    index.append("")
    write(temporary / "index.md", "\n".join(index))

    expected_pages = len(rows) + 2
    actual_pages = len(list(temporary.rglob("*.md")))
    if actual_pages != expected_pages:
        raise RuntimeError(f"Generated {actual_pages} Markdown pages; expected {expected_pages}.")

    if output.exists():
        shutil.rmtree(output)
    temporary.replace(output)
    print(f"Generated {len(rows)} command pages plus root and index ({expected_pages} total) from {version}.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
