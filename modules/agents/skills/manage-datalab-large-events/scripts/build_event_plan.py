#!/usr/bin/env python3
"""Build an offline, human-readable DataLab workspace-event approval plan.

This script performs arithmetic only. It never reads cluster state or calls a
network, browser, kubectl, or DataLab API.
"""

from __future__ import annotations

import argparse
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


BUFFER_MINUTES = 120
UTC = timezone.utc


@dataclass(frozen=True)
class LanguageTarget:
    editor: str
    shard: str


LANGUAGE_TARGETS = {
    "Python 3.8": LanguageTarget("JupyterLab", "overprovision-0"),
    "Python 3.10": LanguageTarget("jupyter-python3-10", "overprovision-1"),
    "Python 3.12": LanguageTarget("jupyter-python3-12", "overprovision-2"),
    "R 4.2": LanguageTarget("JupyterLab", "overprovision-0"),
    "R 4.4": LanguageTarget("jupyter-python3-10", "overprovision-1"),
}


def nonnegative_integer(value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("must be an integer") from error
    if parsed < 0:
        raise argparse.ArgumentTypeError("must be nonnegative")
    return parsed


def positive_integer(value: str) -> int:
    parsed = nonnegative_integer(value)
    if parsed == 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed


def overlap_transition(value: str) -> tuple[int, int]:
    """Parse combined other-event pool,total contributions for one segment."""
    parts = value.split(",")
    if len(parts) != 2:
        raise argparse.ArgumentTypeError("must use POOL,TOTAL")
    return nonnegative_integer(parts[0]), nonnegative_integer(parts[1])


def parse_local_datetime(value: str, timezone_name: str) -> datetime:
    """Parse an unambiguous local ISO datetime in an IANA timezone."""
    if "T" not in value:
        raise ValueError(
            f"local datetime must include a date and time separated by T: {value!r}"
        )
    try:
        naive = datetime.fromisoformat(value)
    except ValueError as error:
        raise ValueError(f"invalid ISO local datetime: {value!r}") from error
    if naive.tzinfo is not None:
        raise ValueError("local datetime must not contain a UTC offset")
    try:
        zone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as error:
        raise ValueError(f"unknown IANA timezone: {timezone_name!r}") from error

    candidates: list[datetime] = []
    for fold in (0, 1):
        candidate = naive.replace(tzinfo=zone, fold=fold)
        round_trip = candidate.astimezone(UTC).astimezone(zone).replace(tzinfo=None)
        if round_trip == naive:
            candidates.append(candidate)

    if not candidates:
        raise ValueError(
            f"local datetime {value!r} does not exist in {timezone_name}"
        )
    if len({candidate.utcoffset() for candidate in candidates}) > 1:
        raise ValueError(
            f"local datetime {value!r} is ambiguous in {timezone_name}; "
            "choose a time outside the DST fold"
        )
    return candidates[0]


def additive_contribution(desired: int, base: int, overlap: int) -> int:
    """Return the nonnegative event contribution needed for an effective floor."""
    return max(0, desired - base - overlap)


def format_datetime(value: datetime) -> str:
    return value.isoformat(timespec="minutes")


def build_plan(args: argparse.Namespace) -> str:
    if not args.name.strip():
        raise ValueError("event name must not be blank")
    if not args.group_slug.strip() or any(char.isspace() for char in args.group_slug):
        raise ValueError("group slug must not be blank or contain whitespace")
    if args.routing_eligibility != "paying-group-owned":
        raise ValueError(
            "a Workspace Event only directly routes paying group-owned workspaces; "
            "plan non-paying or user-owned traffic with normal routing and cluster headroom"
        )

    start = parse_local_datetime(args.start_local, args.timezone)
    end = parse_local_datetime(args.end_local, args.timezone)
    start_utc = start.astimezone(UTC)
    end_utc = end.astimezone(UTC)
    if end_utc <= start_utc:
        raise ValueError("event end must be after event start")

    buffered_start_utc = start_utc - timedelta(minutes=BUFFER_MINUTES)
    buffered_end_utc = end_utc + timedelta(minutes=BUFFER_MINUTES)
    zone = start.tzinfo
    assert zone is not None
    buffered_start = buffered_start_utc.astimezone(zone)
    buffered_end = buffered_end_utc.astimezone(zone)

    target = LANGUAGE_TARGETS[args.language]
    heuristic_total = math.ceil(args.peak_concurrency * 0.70)
    if not args.overlap_transitions:
        raise ValueError(
            "provide every constant-capacity transition segment; use 0,0 when there are no overlapping events"
        )
    minimum_overlap_pool = min(pair[0] for pair in args.overlap_transitions)
    minimum_overlap_total = min(pair[1] for pair in args.overlap_transitions)
    current_pool = args.base_min_pool + minimum_overlap_pool
    current_total = args.base_min_total + minimum_overlap_total
    contribution_pool = additive_contribution(
        args.desired_min_pool, args.base_min_pool, minimum_overlap_pool
    )
    contribution_total = additive_contribution(
        args.desired_min_total, args.base_min_total, minimum_overlap_total
    )
    projected_pool = current_pool + contribution_pool
    projected_total = current_total + contribution_total

    checks = [
        "Confirm base floors and overlapping contributions from live state immediately before creation.",
        "Confirm transition segments cover the entire buffered window; partial overlaps must include segments before/after they are active.",
        "Confirm no same-group overlapping event selects a different runtime config.",
        "Obtain human approval before creating the production dashboard row or changing cluster capacity.",
    ]
    if args.desired_min_total < heuristic_total:
        checks.append(
            f"REVIEW: desired min total {args.desired_min_total} is below the "
            f"70% heuristic ({heuristic_total})."
        )
    if contribution_pool == 0 and contribution_total == 0:
        checks.append("INFO: existing base and overlap contributions already cover both desired floors.")

    lines = [
        "DataLab workspace-event approval plan (offline; no changes applied)",
        "",
        "Event",
        f"  Name: {args.name}",
        f"  Group slug: {args.group_slug}",
        f"  Routing eligibility: {args.routing_eligibility}",
        f"  Runtime config: {args.runtime_config}",
        f"  Language: {args.language}",
        f"  Multiplexer editor: {target.editor}",
        f"  Overprovision shard: {target.shard}",
        f"  Configured window: {format_datetime(start)} to {format_datetime(end)}",
        f"  Configured UTC: {format_datetime(start_utc)} to {format_datetime(end_utc)}",
        f"  Effective window (+/- {BUFFER_MINUTES} min hidden buffer): "
        f"{format_datetime(buffered_start)} to {format_datetime(buffered_end)}",
        f"  Effective UTC: {format_datetime(buffered_start_utc)} to {format_datetime(buffered_end_utc)}",
        "",
        "Sizing",
        f"  Expected peak concurrent sessions: {args.peak_concurrency}",
        f"  Historical 70% min-total heuristic (ceil): {heuristic_total}",
        "  This heuristic is advisory; explicit approved effective floors drive the calculation.",
        "",
        "Additive floor calculation",
        "  Uses the minimum combined contribution from other events across every transition segment.",
        f"  Transition segments (pool,total): {args.overlap_transitions}",
        "  Metric                 Desired  Base  Minimum overlap floor  New contribution  Projected effective",
        f"  Min pool size          {args.desired_min_pool:7d}  {args.base_min_pool:4d}  "
        f"{minimum_overlap_pool:21d}  {contribution_pool:16d}  {projected_pool:19d}",
        f"  Min total running      {args.desired_min_total:7d}  {args.base_min_total:4d}  "
        f"{minimum_overlap_total:21d}  {contribution_total:16d}  {projected_total:19d}",
        "",
        "Dashboard values to approve (additive, not final floors)",
        f"  Min pool size: {contribution_pool}",
        f"  Min total running: {contribution_total}",
        "",
        "Approval checks",
    ]
    lines.extend(f"  - {check}" for check in checks)
    return "\n".join(lines)


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", required=True)
    parser.add_argument("--group-slug", required=True)
    parser.add_argument("--peak-concurrency", required=True, type=positive_integer)
    parser.add_argument(
        "--routing-eligibility",
        required=True,
        choices=("paying-group-owned", "non-paying-group-owned", "user-owned"),
        help="Only paying group-owned workspaces are directly routed by a Workspace Event",
    )
    parser.add_argument("--language", required=True, choices=sorted(LANGUAGE_TARGETS))
    parser.add_argument(
        "--runtime-config",
        default="collab-medium-events",
        choices=("collab-small", "collab-medium", "collab-medium-events"),
    )
    parser.add_argument("--start-local", required=True, help="Local ISO datetime without an offset")
    parser.add_argument("--end-local", required=True, help="Local ISO datetime without an offset")
    parser.add_argument("--timezone", required=True, help="IANA timezone, for example Europe/Brussels")
    parser.add_argument("--desired-min-pool", required=True, type=nonnegative_integer)
    parser.add_argument("--desired-min-total", required=True, type=nonnegative_integer)
    parser.add_argument("--base-min-pool", required=True, type=nonnegative_integer)
    parser.add_argument("--base-min-total", required=True, type=nonnegative_integer)
    parser.add_argument(
        "--overlap-transition",
        dest="overlap_transitions",
        action="append",
        required=True,
        type=overlap_transition,
        metavar="POOL,TOTAL",
        help=(
            "Combined contributions from all other matching events in one constant-capacity "
            "segment of the proposed buffered window; repeat for every segment, or pass 0,0 "
            "when there are no overlaps"
        ),
    )
    return parser


def main() -> int:
    parser = make_parser()
    args = parser.parse_args()
    try:
        print(build_plan(args))
    except ValueError as error:
        parser.error(str(error))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
