#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cli="$root/generators/dist/cli.js"

if [[ ! -f "$cli" ]]; then
  echo "Missing generator build output: $cli" >&2
  echo "Run: pnpm --dir generators build" >&2
  exit 1
fi

tmp="$(mktemp -d "${TMPDIR:-/tmp}/axtp-generated-drift.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/protocol" "$tmp/generated"

node "$cli" generate \
  --spec "$root" \
  --protocol-out "$tmp/protocol/axtp.protocol.yaml" \
  --out "$tmp/generated" >/tmp/axtp-generated-drift.log

diff -u "$root/protocol/axtp.protocol.yaml" "$tmp/protocol/axtp.protocol.yaml"

diff -u "$root/docs/generated/protocol.md" "$tmp/generated/protocol.md"
diff -u "$root/docs/generated/protocol.json" "$tmp/generated/protocol.json"

for file in \
  capability_registry.generated.md \
  error_code.generated.md \
  event_registry.generated.md \
  legacy_mapping.generated.md \
  method_registry.generated.md
do
  diff -u "$root/docs/generated/$file" "$tmp/generated/docs/$file"
done

for file in \
  capability_registry.generated.json \
  error_code.generated.json \
  event_registry.generated.json \
  legacy_mapping.generated.json \
  method_registry.generated.json \
  schema.generated.json
do
  diff -u "$root/tooling/mcp/$file" "$tmp/generated/json/$file"
done

for file in "$root"/tooling/test-vectors/*; do
  base="$(basename "$file")"
  diff -u "$file" "$tmp/generated/test_vectors/$base"
done

echo "[OK] generated artifacts match registry/domain YAML sources"
