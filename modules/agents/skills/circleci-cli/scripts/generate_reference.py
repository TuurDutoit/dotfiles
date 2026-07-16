#!/usr/bin/env python3
"""Generate the bundled CircleCI CLI reference from the installed CLI."""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path


COMMAND_HEADING = re.compile(r"^(?P<level>#{3,6}) (?P<title>`circleci [^`]+`)$", re.MULTILINE)
CATEGORY_HEADING = re.compile(r"^## (?P<title>.+ Commands)$", re.MULTILINE)
TOPICS = ("environment", "formatting", "getting-started", "telemetry")


def get_help(cli: str, *args: str) -> str:
    """Return exact Markdown emitted by a local CircleCI CLI help topic."""
    result = subprocess.run(
        [cli, *args, "--help"],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"{' '.join([cli, *args, '--help'])} exited {result.returncode}: "
            f"{result.stderr.strip()}"
        )
    return result.stdout


def get_version(cli: str) -> str:
    result = subprocess.run(
        [cli, "version"],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"{cli} version exited {result.returncode}: {result.stderr.strip()}")
    return result.stdout.strip()


def generated_header(source: str, version: str) -> str:
    return (
        "<!-- GENERATED FILE — do not edit.\n"
        f"Source: `{source}` from {version}.\n"
        "Refresh: `python3 scripts/generate_reference.py`\n"
        "-->\n\n"
    )


def command_slug(title: str) -> str:
    words = title.strip("`").split()
    command: list[str] = []
    for word in words:
        if word.startswith(("<", "[", "--")):
            break
        command.append(word)
    if not command or command[0] != "circleci":
        raise ValueError(f"Cannot derive a command filename from {title!r}")
    return "-".join(command[1:])


def category_for(position: int, headings: list[re.Match[str]]) -> str:
    prior = [heading for heading in headings if heading.start() < position]
    return prior[-1].group("title") if prior else "Commands"


def write(path: Path, contents: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cli", default="circleci", help="CircleCI CLI executable (default: circleci)")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "references",
        help="Reference directory to replace (default: skill references directory)",
    )
    args = parser.parse_args()

    reference = get_help(args.cli, "reference")
    root_help = get_help(args.cli)
    topic_help = {topic: get_help(args.cli, topic) for topic in TOPICS}
    version = get_version(args.cli)

    commands = list(COMMAND_HEADING.finditer(reference))
    categories = list(CATEGORY_HEADING.finditer(reference))
    if not commands:
        raise RuntimeError("No `circleci` command sections found in `circleci reference --help`.")

    output = args.output.resolve()
    temporary = output.with_name(f"{output.name}.tmp")
    if temporary.exists():
        shutil.rmtree(temporary)
    temporary.mkdir(parents=True)

    header = generated_header("circleci reference --help", version)
    command_rows: list[tuple[str, str, str]] = []
    filenames: set[str] = set()
    for number, command in enumerate(commands):
        next_start = commands[number + 1].start() if number + 1 < len(commands) else len(reference)
        title = command.group("title")
        filename = f"commands/{command_slug(title)}.md"
        if filename in filenames:
            raise RuntimeError(f"Duplicate command page name: {filename}")
        filenames.add(filename)
        # Keep the command heading and every directly associated line byte-for-byte.
        # Nested command sections get their own page rather than being duplicated.
        write(temporary / filename, header + reference[command.start() : next_start])
        command_rows.append((category_for(command.start(), categories), title, filename))

    write(
        temporary / "root.md",
        generated_header("circleci --help", version) + root_help,
    )
    for topic, contents in topic_help.items():
        write(
            temporary / "topics" / f"{topic}.md",
            generated_header(f"circleci {topic} --help", version) + contents,
        )

    index = [
        "<!-- GENERATED FILE — do not edit. Refresh with `python3 scripts/generate_reference.py`. -->",
        "",
        "# CircleCI CLI command index",
        "",
        "Read [`root.md`](root.md) for the top-level command and help-topic listing. "
        "Each command page contains the exact corresponding section from `circleci reference --help`.",
        "",
    ]
    active_category: str | None = None
    for category, title, filename in command_rows:
        if category != active_category:
            index.extend([f"## {category}", "", "| Command | Reference |", "| --- | --- |"])
            active_category = category
        index.append(f"| {title} | [{filename}](<{filename}>) |")
    index.extend(["", "## Help topics", "", "| Topic | Reference |", "| --- | --- |"])
    for topic in TOPICS:
        index.append(f"| `circleci {topic} --help` | [topics/{topic}.md](<topics/{topic}.md>) |")
    index.append("")
    write(temporary / "index.md", "\n".join(index))

    expected_pages = len(commands) + 1 + 1 + len(TOPICS)
    actual_pages = len(list(temporary.rglob("*.md")))
    if actual_pages != expected_pages:
        raise RuntimeError(f"Generated {actual_pages} Markdown pages; expected {expected_pages}.")

    if output.exists():
        shutil.rmtree(output)
    temporary.replace(output)
    print(
        f"Generated {len(commands)} command pages, {len(TOPICS)} help-topic pages, "
        f"and root/index pages ({expected_pages} total). Source gaps: none."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
