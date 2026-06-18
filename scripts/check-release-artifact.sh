#!/usr/bin/env bash
set -euo pipefail

version="${1:-0.0.0-ci}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
artifact="axtp-spec-v$version"
zip_path="$root/dist/$artifact.zip"

"$root/scripts/build-spec-artifact.sh" "$version" >/tmp/axtp-release-artifact.log

if [[ ! -f "$zip_path" ]]; then
  echo "Missing release archive: $zip_path" >&2
  exit 1
fi

python3 - "$zip_path" "$artifact" <<'PY'
import sys
import zipfile

zip_path, artifact = sys.argv[1], sys.argv[2]
required = {
    f"{artifact}/README.md",
    f"{artifact}/LICENSE",
    f"{artifact}/protocol/axtp.protocol.yaml",
    f"{artifact}/docs/generated/protocol.md",
    f"{artifact}/docs/generated/protocol.json",
    f"{artifact}/registry/version.yaml",
    f"{artifact}/docs/specs/README.md",
    f"{artifact}/docs/conformance/manifest.yaml",
    f"{artifact}/conformance/manifest.yaml",
    f"{artifact}/tooling/mcp/method_registry.generated.json",
    f"{artifact}/tooling/test-vectors/manifest.json",
    f"{artifact}/docs/release/CHANGELOG.md",
}

with zipfile.ZipFile(zip_path) as archive:
    names = set(archive.namelist())

missing = sorted(required - names)
if missing:
    print("[FAIL] release archive is missing required paths", file=sys.stderr)
    for item in missing:
        print(f"- {item}", file=sys.stderr)
    sys.exit(1)

ds_store = sorted(name for name in names if name.endswith(".DS_Store"))
if ds_store:
    print("[FAIL] release archive contains .DS_Store files", file=sys.stderr)
    for item in ds_store:
        print(f"- {item}", file=sys.stderr)
    sys.exit(1)

legacy_evidence = sorted(name for name in names if f"{artifact}/docs/legacy-migration/evidence/" in name)
if legacy_evidence:
    print("[FAIL] release archive contains legacy evidence files", file=sys.stderr)
    for item in legacy_evidence[:20]:
        print(f"- {item}", file=sys.stderr)
    sys.exit(1)

print("[OK] release archive contract paths verified")
PY
