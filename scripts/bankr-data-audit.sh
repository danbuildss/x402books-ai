#!/usr/bin/env bash
# Bankr agent data-quality audit — fetch the report and archive dated artifacts.
#
# The route (/api/admin/registry/data-audit) is read-only and cannot write
# files (Vercel's filesystem is ephemeral) — THIS script is the artifact
# writer. Run it weekly (manually or from the Hermes VPS; see
# skills/zetta/bankr-data-audit/SKILL.md) and commit the reports for history.
#
# Usage:
#   ZETTA_INTERNAL_SECRET=... [AUDIT_BASE_URL=https://www.zettaai.co] \
#     bash scripts/bankr-data-audit.sh

set -euo pipefail

: "${ZETTA_INTERNAL_SECRET:?ZETTA_INTERNAL_SECRET is required}"
AUDIT_BASE_URL="${AUDIT_BASE_URL:-https://www.zettaai.co}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${REPO_ROOT}/reports"
mkdir -p "${OUT_DIR}"

DATE="$(date -u +%F)"
MD_OUT="${OUT_DIR}/bankr-audit-${DATE}.md"
JSON_OUT="${OUT_DIR}/bankr-audit-${DATE}.json"

echo "Fetching Bankr data audit from ${AUDIT_BASE_URL} ..."

curl -sf -H "Authorization: Bearer ${ZETTA_INTERNAL_SECRET}" \
  "${AUDIT_BASE_URL}/api/admin/registry/data-audit?format=md" \
  -o "${MD_OUT}"

curl -sf -H "Authorization: Bearer ${ZETTA_INTERNAL_SECRET}" \
  "${AUDIT_BASE_URL}/api/admin/registry/data-audit?format=json" \
  -o "${JSON_OUT}"

echo "Wrote:"
echo "  ${MD_OUT}"
echo "  ${JSON_OUT}"
echo
echo "Summary counts:"
python3 -c "import json,sys; print(json.dumps(json.load(open('${JSON_OUT}'))['counts'], indent=2))" 2>/dev/null \
  || echo "  (install python3 to pretty-print counts)"
echo
echo "Reminder: git add reports/ and commit — these artifacts are the audit history."
