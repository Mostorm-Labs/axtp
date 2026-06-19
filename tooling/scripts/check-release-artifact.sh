#!/usr/bin/env bash
set -euo pipefail

version="${1:-0.0.0-ci}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
artifact="axtp-spec-v$version"
zip_path="$root/dist/$artifact.zip"

"$root/tooling/scripts/build-spec-artifact.sh" "$version" >/tmp/axtp-release-artifact.log

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
    f"{artifact}/docs/README.md",
    f"{artifact}/docs/guides/runtime.md",
    f"{artifact}/docs/guides/testing.md",
    f"{artifact}/docs/guides/protocol-maintainer.md",
    f"{artifact}/docs/guides/product.md",
    f"{artifact}/docs/guides/legacy-migration.md",
    f"{artifact}/docs/product/domain-status.md",
    f"{artifact}/docs/product/roadmap.md",
    f"{artifact}/CHANGELOG.md",
    f"{artifact}/docs/workspace/README.md",
    f"{artifact}/contract/protocol/axtp.protocol.yaml",
    f"{artifact}/contract/generated/protocol.md",
    f"{artifact}/contract/generated/protocol.json",
    f"{artifact}/contract/registry/version.yaml",
    f"{artifact}/specs/README.md",
    f"{artifact}/specs/0-principles/02-Contract-Boundaries.md",
    f"{artifact}/specs/0-principles/03-Domain-Feature-Classification.md",
    f"{artifact}/conformance/manifest.yaml",
    f"{artifact}/docs/workspace/protocol/README.md",
    f"{artifact}/contract/mcp/method_registry.generated.json",
    f"{artifact}/contract/test-vectors/manifest.json",
    f"{artifact}/docs/workspace/release/CHANGELOG.md",
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

legacy_evidence = sorted(name for name in names if f"{artifact}/docs/workspace/legacy-migration/evidence/" in name)
if legacy_evidence:
    print("[FAIL] release archive contains legacy evidence files", file=sys.stderr)
    for item in legacy_evidence[:20]:
        print(f"- {item}", file=sys.stderr)
    sys.exit(1)

skills = sorted(name for name in names if f"{artifact}/tooling/skills/" in name)
if skills:
    print("[FAIL] release archive contains repository-only lifecycle skills", file=sys.stderr)
    for item in skills[:20]:
        print(f"- {item}", file=sys.stderr)
    sys.exit(1)

release_tooling = sorted(name for name in names if f"{artifact}/tooling/release/" in name or f"{artifact}/release/" in name)
if release_tooling:
    print("[FAIL] release archive contains repository-only release template files", file=sys.stderr)
    for item in release_tooling[:20]:
        print(f"- {item}", file=sys.stderr)
    sys.exit(1)

old_release_docs = sorted(name for name in names if f"{artifact}/docs/release/" in name)
if old_release_docs:
    print("[FAIL] release archive contains legacy docs/release path", file=sys.stderr)
    for item in old_release_docs[:20]:
        print(f"- {item}", file=sys.stderr)
    sys.exit(1)

old_architecture_docs = sorted(name for name in names if f"{artifact}/docs/architecture/" in name)
if old_architecture_docs:
    print("[FAIL] release archive contains legacy docs/architecture path", file=sys.stderr)
    for item in old_architecture_docs[:20]:
        print(f"- {item}", file=sys.stderr)
    sys.exit(1)

old_conformance = sorted(name for name in names if f"{artifact}/docs/conformance/" in name)
if old_conformance:
    print("[FAIL] release archive contains legacy docs/conformance path", file=sys.stderr)
    for item in old_conformance[:20]:
        print(f"- {item}", file=sys.stderr)
    sys.exit(1)

print("[OK] release archive contract paths verified")
PY

node "$root/tooling/scripts/check-links.mjs" "$root/dist/$artifact"
