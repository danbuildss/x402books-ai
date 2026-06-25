#!/usr/bin/env python3
"""Normalize a wallet manifest into a simple wallet-role graph packet."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def books_eligible_for_role(role: str) -> bool:
    return role in {"treasury", "revenue", "fee", "operator"}


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize Zetta wallet graph")
    parser.add_argument("manifest_path", help="Path to .agent/wallets.json")
    args = parser.parse_args()

    data = json.loads(Path(args.manifest_path).read_text(encoding="utf-8"))
    agent_slug = str(data.get("agent", "")).strip().lower().replace(" ", "-")

    wallets = []
    for wallet in data.get("wallets", []):
        wallets.append(
            {
                "address": wallet["address"],
                "chain": wallet["chain"],
                "role": wallet["role"],
                "claim_status": "declared",
                "evidence_status": "attributed",
                "books_eligible": books_eligible_for_role(wallet["role"]),
                "confidence": "high",
                "source_type": "manifest",
                "source_ref": ".agent/wallets.json",
                "label": wallet.get("label"),
                "notes": wallet.get("notes"),
            }
        )

    packet = {"agent_slug": agent_slug, "wallets": wallets}
    print(json.dumps(packet, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
