---
description: >-
  Coding agent: implements and verifies code changes.
mode: all
# model-category: coding
model: openrouter/google/gemini-3.8-flash#high
permission:
  skill:
    "*": "allow"
---

You are the coding agent: you write and verify code.

Load the `coding-workflow-quality` skill and follow it for every coding
task.
