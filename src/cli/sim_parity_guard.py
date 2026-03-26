from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import List

import click


RELEVANT_PATH_PREFIXES = (
    "src/simulator/domain/aggregators/",
    "src/simulator/domain/devices/",
    "src/simulator/domain/clusters/",
    "src/simulator/domain/home.py",
    "src/simulator/application/home_initializer.py",
    "src/simulator/api/routes.py",
    "src/clients/smarthome_client.py",
)


def _run_git(cwd: Path, args: List[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )


def _is_git_repo(cwd: Path) -> bool:
    result = _run_git(cwd, ["rev-parse", "--is-inside-work-tree"])
    return result.returncode == 0 and result.stdout.strip() == "true"


def _collect_changed_files(
    cwd: Path,
    *,
    staged_only: bool,
    base_ref: str | None,
) -> List[str]:
    changed: set[str] = set()

    if staged_only:
        staged = _run_git(cwd, ["diff", "--cached", "--name-only"])
        if staged.returncode == 0:
            changed.update(line.strip() for line in staged.stdout.splitlines() if line)
    else:
        unstaged = _run_git(cwd, ["diff", "--name-only"])
        staged = _run_git(cwd, ["diff", "--cached", "--name-only"])
        if unstaged.returncode == 0:
            changed.update(
                line.strip() for line in unstaged.stdout.splitlines() if line
            )
        if staged.returncode == 0:
            changed.update(line.strip() for line in staged.stdout.splitlines() if line)

    if base_ref:
        base_diff = _run_git(cwd, ["diff", "--name-only", f"{base_ref}...HEAD"])
        if base_diff.returncode == 0:
            changed.update(
                line.strip() for line in base_diff.stdout.splitlines() if line
            )

    return sorted(changed)


def _is_relevant_change(path: str) -> bool:
    return any(
        path == prefix or path.startswith(prefix) for prefix in RELEVANT_PATH_PREFIXES
    )


def _run_guard_suite(cwd: Path) -> int:
    command = [
        sys.executable,
        "-m",
        "pytest",
        "tests/cli/test_sim_parity_guard_parity.py",
        "-v",
    ]
    result = subprocess.run(command, cwd=cwd, check=False)
    return int(result.returncode)


@click.command(
    context_settings={"help_option_names": ["-h", "--help"]},
    help=(
        "Run simulator parity guard automatically when simulator/runtime core files change."
    ),
)
@click.option(
    "--force",
    is_flag=True,
    help="Run parity guard regardless of changed files.",
)
@click.option(
    "--staged-only",
    is_flag=True,
    help="Consider only staged changes (useful for pre-commit hooks).",
)
@click.option(
    "--base-ref",
    default=None,
    help="Optional git base reference to include in changed-file detection.",
)
def cli(force: bool, staged_only: bool, base_ref: str | None) -> int:
    repo_root = Path(__file__).resolve().parents[2]
    in_git_repo = _is_git_repo(repo_root)

    if not force and in_git_repo:
        changed_files = _collect_changed_files(
            repo_root,
            staged_only=bool(staged_only),
            base_ref=base_ref,
        )
        relevant = [path for path in changed_files if _is_relevant_change(path)]
        if not relevant:
            print("[sim-parity-guard] SKIP: no simulator/runtime core changes detected")
            return 0

        print("[sim-parity-guard] Relevant changes detected:")
        for path in relevant:
            print(f"  - {path}")
    elif not in_git_repo:
        print("[sim-parity-guard] Git metadata unavailable; running guard suite")
    else:
        print("[sim-parity-guard] Forced run")

    code = _run_guard_suite(repo_root)
    if code == 0:
        print("[sim-parity-guard] PASS")
    else:
        print("[sim-parity-guard] FAIL")
    return code


def main(argv: list[str] | None = None) -> int:
    result = cli.main(args=argv, prog_name="sim-parity-guard", standalone_mode=False)
    return 0 if result is None else int(result)


if __name__ == "__main__":
    raise SystemExit(main())
