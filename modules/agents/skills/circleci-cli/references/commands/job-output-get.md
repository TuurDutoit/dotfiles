<!-- GENERATED FILE — do not edit.
Source: `circleci reference --help` from circleci 1.0.44892-pre (7ef363c302e4).
Refresh: `python3 scripts/generate_reference.py`
-->

##### `circleci job output get <job-id> [flags]`

Get the output of a job step

| Flag              | Description                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `--condensed`     | Fetch error-relevant lines only, filtered server-side (experimental)                           |
| `--execution int` | Parallel execution index to read output from                                                   |
| `--step-num int`  | Step number whose output to fetch (required)                                                   |
| `--strip-ansi`    | Force (or with =false, disable) ANSI stripping; defaults to stripping only when not a terminal |


**Arguments:**

`<job-id>` is the UUID of the job whose step output to fetch. Job UUIDs
are shown in the output of `circleci workflow get` and `circleci job get`.
Use `--step-num` to select which step's output to read.

