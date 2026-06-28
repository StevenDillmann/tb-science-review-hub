#!/usr/bin/env python3
"""Audit open `new task` PRs against the reviewer pool.

For each open PR this prints:
  - the task field (from changed `tasks/<domain>/<field>/...` paths)
  - current assignees, each flagged with whether they belong to that field's
    domain pool (✓ in-field), the domain backup pool (~backup), the general
    pool (general), or none of them (⚠ off-pool)
  - latest review state per assignee (approved / changes / pending)
  - whether a reviewer-slots marker exists
  - a suggested domain pick (least-effort: the field pool members) so you can
    eyeball whether the right domain reviewer is assigned

Read-only: makes no changes. Run from the tb-science repo (needs the pool
config) with `gh` authenticated.

    python3 audit_reviewers.py --repo harbor-framework/terminal-bench-science \
        --config /path/to/terminal-bench-science/.github/reviewer-pool.yml
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter

import yaml


def gh_json(args: list[str]):
    r = subprocess.run(["gh", *args], capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr)
        return None
    return json.loads(r.stdout) if r.stdout.strip() else None


def detect_field(repo: str, pr: int) -> str:
    out = subprocess.run(
        ["gh", "api", f"repos/{repo}/pulls/{pr}/files", "--paginate",
         "--jq", ".[].filename"],
        capture_output=True, text=True,
    ).stdout
    fields = []
    for f in out.splitlines():
        parts = f.split("/")
        if len(parts) >= 4 and parts[0] == "tasks":
            fields.append(parts[2])
    return Counter(fields).most_common(1)[0][0] if fields else ""


def latest_review_state(repo: str, pr: int) -> dict[str, str]:
    """login -> latest terminal review state (approved/changes_requested)."""
    reviews = gh_json(["api", f"repos/{repo}/pulls/{pr}/reviews", "--paginate"]) or []
    state: dict[str, str] = {}
    for rv in reviews:
        if rv.get("author_association") not in ("COLLABORATOR", "MEMBER", "OWNER"):
            continue
        login = (rv.get("user") or {}).get("login")
        st = rv.get("state")
        if not login:
            continue
        if st == "APPROVED":
            state[login] = "approved"
        elif st == "CHANGES_REQUESTED":
            state[login] = "changes_requested"
    return state


def has_marker(repo: str, pr: int) -> bool:
    comments = gh_json(["api", f"repos/{repo}/issues/{pr}/comments", "--paginate"]) or []
    return any("reviewer-slots" in (c.get("body") or "") for c in comments)


def classify(login: str, field: str, pool: dict) -> str:
    by_field = pool.get("reviewers_by_field") or {}
    field_pool = {x.lower() for x in (by_field.get(field) or [])}
    backup = {x.lower() for x in (pool.get("reviewers_domain_backup") or [])}
    general = {x.lower() for x in (pool.get("reviewers_general") or [])}
    final = {x.lower() for x in (pool.get("reviewers_final") or [])}
    lo = login.lower()
    if lo in field_pool:
        return "✓in-field"
    if lo in backup:
        return "~backup"
    if lo in general:
        return "general"
    if lo in final:
        return "final"
    return "⚠off-pool"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default="harbor-framework/terminal-bench-science")
    ap.add_argument("--config", required=True, help="Path to reviewer-pool.yml")
    ap.add_argument("--limit", type=int, default=100)
    args = ap.parse_args()

    with open(args.config) as f:
        pool = yaml.safe_load(f) or {}
    by_field = pool.get("reviewers_by_field") or {}

    prs = gh_json([
        "pr", "list", "--repo", args.repo, "--state", "open",
        "--label", "new task", "--limit", str(args.limit),
        "--json", "number,title,assignees",
    ]) or []

    print(f"Auditing {len(prs)} open `new task` PRs against {args.config}\n")
    for pr in sorted(prs, key=lambda p: -p["number"]):
        num = pr["number"]
        field = detect_field(args.repo, num)
        field_members = by_field.get(field) or []
        reviews = latest_review_state(args.repo, num)
        marker = "marker" if has_marker(args.repo, num) else "NO-marker"
        assignees = [a["login"] for a in pr.get("assignees", [])]

        print(f"#{num}  [{field or '?'}]  ({marker})  {pr['title'][:54]}")
        print(f"     field pool: {field_members or '— (empty → backup/general)'}")
        if not assignees:
            print("     assignees: ⚠ NONE assigned")
        for a in assignees:
            tag = classify(a, field, pool)
            st = reviews.get(a, "pending")
            print(f"     - {a:20} {tag:11} {st}")
        # Flag: no in-field domain reviewer present.
        if field_members and not any(
            a.lower() in {m.lower() for m in field_members} for a in assignees
        ):
            print(f"     ⚠ no in-field domain reviewer assigned (expected one of {field_members})")
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
