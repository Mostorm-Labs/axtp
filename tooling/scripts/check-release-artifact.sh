#!/usr/bin/env bash
set -euo pipefail

version="${1:-0.0.0-ci}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
artifact="axtp-spec-v$version"
zip_path="$root/dist/$artifact.zip"
contract="$root/tooling/release/artifact-contract.json"

"$root/tooling/scripts/build-spec-artifact.sh" "$version" >/tmp/axtp-release-artifact.log

if [[ ! -f "$zip_path" ]]; then
  echo "Missing release archive: $zip_path" >&2
  exit 1
fi

if [[ ! -f "$contract" ]]; then
  echo "Missing artifact contract: $contract" >&2
  exit 1
fi

python3 - "$zip_path" "$artifact" "$contract" <<'PY'
import json
import sys
import zipfile

zip_path, artifact, contract_path = sys.argv[1], sys.argv[2], sys.argv[3]
contract = json.load(open(contract_path, encoding="utf-8"))

with zipfile.ZipFile(zip_path) as archive:
    names = set(archive.namelist())

artifact_prefix = f"{artifact}/"
relative_names = {
    name[len(artifact_prefix):]
    for name in names
    if name.startswith(artifact_prefix) and not name.endswith("/")
}

missing = sorted(set(contract["required_paths"]) - relative_names)
if missing:
    print("[FAIL] release archive is missing required paths", file=sys.stderr)
    for item in missing:
        print(f"- {item}", file=sys.stderr)
    sys.exit(1)

violations = []
for rel in sorted(relative_names):
    if any(rel.endswith(suffix) for suffix in contract.get("excluded_suffixes", [])):
        violations.append((rel, "excluded suffix"))
    if any(rel.startswith(prefix) for prefix in contract.get("excluded_prefixes", [])):
        violations.append((rel, "excluded prefix"))
    if any(token in rel for token in contract.get("excluded_contains", [])):
        violations.append((rel, "excluded path"))

if violations:
    print("[FAIL] release archive contains excluded paths", file=sys.stderr)
    for item, reason in violations[:40]:
        print(f"- {item}: {reason}", file=sys.stderr)
    sys.exit(1)

print("[OK] release archive contract paths verified")
PY

node "$root/tooling/scripts/check-links.mjs" "$root/dist/$artifact"
