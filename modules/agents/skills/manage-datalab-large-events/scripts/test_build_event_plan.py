#!/usr/bin/env python3
from __future__ import annotations

import argparse
import contextlib
import io
import unittest

from build_event_plan import (
    LANGUAGE_TARGETS,
    additive_contribution,
    build_plan,
    make_parser,
    overlap_transition,
    parse_local_datetime,
)


def args(**overrides: object) -> argparse.Namespace:
    values: dict[str, object] = {
        "name": "Premium training",
        "group_slug": "enterprise-acme",
        "peak_concurrency": 100,
        "routing_eligibility": "paying-group-owned",
        "language": "Python 3.10",
        "runtime_config": "collab-medium-events",
        "start_local": "2026-03-29T04:00",
        "end_local": "2026-03-29T05:00",
        "timezone": "Europe/Brussels",
        "desired_min_pool": 10,
        "desired_min_total": 70,
        "base_min_pool": 10,
        "base_min_total": 10,
        "overlap_transitions": [(2, 8)],
    }
    values.update(overrides)
    return argparse.Namespace(**values)


class BuildEventPlanTest(unittest.TestCase):
    def test_additive_math(self) -> None:
        self.assertEqual(additive_contribution(70, 10, 8), 52)
        plan = build_plan(args())
        self.assertIn("Min pool size: 0", plan)
        self.assertIn("Min total running: 52", plan)
        self.assertIn("Historical 70% min-total heuristic (ceil): 70", plan)

    def test_language_mapping(self) -> None:
        expected = {
            "Python 3.8": ("JupyterLab", "overprovision-0"),
            "Python 3.10": ("jupyter-python3-10", "overprovision-1"),
            "Python 3.12": ("jupyter-python3-12", "overprovision-2"),
            "R 4.2": ("JupyterLab", "overprovision-0"),
            "R 4.4": ("jupyter-python3-10", "overprovision-1"),
        }
        self.assertEqual(
            {key: (value.editor, value.shard) for key, value in LANGUAGE_TARGETS.items()},
            expected,
        )

    def test_buffer_is_absolute_across_dst_transition(self) -> None:
        plan = build_plan(args())
        self.assertIn(
            "Effective window (+/- 120 min hidden buffer): "
            "2026-03-29T01:00+01:00 to 2026-03-29T07:00+02:00",
            plan,
        )
        self.assertIn("Effective UTC: 2026-03-29T00:00+00:00 to 2026-03-29T05:00+00:00", plan)

    def test_rejects_nonexistent_and_ambiguous_local_times(self) -> None:
        with self.assertRaisesRegex(ValueError, "must include a date and time"):
            parse_local_datetime("2026-03-29", "Europe/Brussels")
        with self.assertRaisesRegex(ValueError, "does not exist"):
            parse_local_datetime("2026-03-29T02:30", "Europe/Brussels")
        with self.assertRaisesRegex(ValueError, "ambiguous"):
            parse_local_datetime("2026-10-25T02:30", "Europe/Brussels")

    def test_rejects_invalid_order_and_arguments(self) -> None:
        with self.assertRaisesRegex(ValueError, "end must be after"):
            build_plan(args(end_local="2026-03-29T03:00"))
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            make_parser().parse_args(
                [
                    "--name", "x", "--group-slug", "g", "--peak-concurrency", "-1",
                    "--routing-eligibility", "paying-group-owned",
                    "--language", "Python 3.10", "--start-local", "2026-01-01T10:00",
                    "--end-local", "2026-01-01T11:00", "--timezone", "UTC",
                    "--desired-min-pool", "1", "--desired-min-total", "1",
                    "--base-min-pool", "0", "--base-min-total", "0",
                    "--overlap-transition", "0,0",
                ]
            )

    def test_already_covered_capacity_produces_zero_contribution(self) -> None:
        plan = build_plan(
            args(
                desired_min_pool=10,
                desired_min_total=60,
                base_min_pool=10,
                base_min_total=50,
                overlap_transitions=[(5, 20)],
            )
        )
        self.assertIn("Min pool size: 0", plan)
        self.assertIn("Min total running: 0", plan)
        self.assertIn("already cover both desired floors", plan)

    def test_rejects_ineligible_workspace_routing(self) -> None:
        with self.assertRaisesRegex(ValueError, "only directly routes paying group-owned"):
            build_plan(args(routing_eligibility="non-paying-group-owned"))

    def test_partial_overlap_uses_minimum_across_transition_segments(self) -> None:
        plan = build_plan(
            args(
                desired_min_pool=20,
                desired_min_total=80,
                base_min_pool=10,
                base_min_total=10,
                overlap_transitions=[(5, 20), (0, 0)],
            )
        )
        self.assertIn("Min pool size: 10", plan)
        self.assertIn("Min total running: 70", plan)

    def test_overlap_transition_parser(self) -> None:
        self.assertEqual(overlap_transition("5,20"), (5, 20))
        with self.assertRaises(argparse.ArgumentTypeError):
            overlap_transition("5")


if __name__ == "__main__":
    unittest.main()
