#!/usr/bin/env python3
"""Build a simple books-eligibility snapshot from a normalized wallet graph."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


ELIGIBLE_ROLES = {"treasury", "revenue", "fee", "operator"}


def main() -> int:
    parser = argparse.ArgumentParser(description="Assess books eligibility from wallet graph JSON")
    parser.add_argument("wallet_graph_path", help="Path to wallet graph JSON")
    parser.add_argument("--period", default="current")
    args = parser.parse_args()

    data = json.loads(Path(args.wallet_graph_path).read_text(encoding="utf-8"))
    eligible = []
    ineligible = []

    for wallet in data.get("wallets", []):
        item = {
            "address": wallet["address"],
            "role": wallet["role"],
            "chain": wallet["chain"],
        }
        if wallet.get("books_eligible") and wallet["role"] in ELIGIBLE_ROLES:
            item["reason"] = "Declared wallet role is books-eligible"
            eligible.append(item)
        else:
            item["reason"] = "Role is not books-eligible under current Zetta rules"
            ineligible.append(item)

    snapshot = {
        "agent_slug": data.get("agent_slug"),
        "period_label": args.period,
        "eligible_wallets": eligible,
        "ineligible_wallets": ineligible,
    }
    print(json.dumps(snapshot, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
