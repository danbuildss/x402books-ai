#!/usr/bin/env python3
"""Validate a .agent/wallets.json-style manifest for Zetta."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROLE_SET = {"treasury", "revenue", "fee", "operator", "deployer", "candidate"}
CHAIN_SET = {"base", "ethereum", "arbitrum", "optimism", "polygon", "solana", "other"}
ADDRESS_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")


def validate_manifest(data: dict) -> list[str]:
    errors: list[str] = []
    if not isinstance(data.get("agent"), str) or not data["agent"].strip():
        errors.append("agent must be a non-empty string")

    wallets = data.get("wallets")
    if not isinstance(wallets, list) or not wallets:
        errors.append("wallets must be a non-empty array")
        return errors

    seen: set[tuple[str, str, str]] = set()
    for idx, wallet in enumerate(wallets):
        if not isinstance(wallet, dict):
            errors.append(f"wallets[{idx}] must be an object")
            continue
        address = wallet.get("address")
        role = wallet.get("role")
        chain = wallet.get("chain")

        if not isinstance(address, str) or not ADDRESS_RE.match(address):
            errors.append(f"wallets[{idx}].address must be a valid 0x address")
        if role not in ROLE_SET:
            errors.append(f"wallets[{idx}].role must be one of {sorted(ROLE_SET)}")
        if chain not in CHAIN_SET:
            errors.append(f"wallets[{idx}].chain must be one of {sorted(CHAIN_SET)}")

        if isinstance(address, str) and role in ROLE_SET and chain in CHAIN_SET:
            key = (address.lower(), role, chain)
            if key in seen:
                errors.append(f"wallets[{idx}] duplicates an existing address/role/chain tuple")
            seen.add(key)
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Zetta agent wallet manifest")
    parser.add_argument("manifest_path", help="Path to .agent/wallets.json")
    args = parser.parse_args()

    path = Path(args.manifest_path)
    if not path.exists():
        print(f"Manifest not found: {path}", file=sys.stderr)
        return 2

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"Invalid JSON: {exc}", file=sys.stderr)
        return 2

    errors = validate_manifest(data)
    if errors:
        print(json.dumps({"ok": False, "errors": errors}, indent=2))
        return 1

    print(json.dumps({"ok": True, "agent": data["agent"], "wallet_count": len(data["wallets"])}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
