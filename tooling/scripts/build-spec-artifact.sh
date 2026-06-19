#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 MAJOR.MINOR.PATCH" >&2
  exit 2
fi

version="$1"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Expected version format MAJOR.MINOR.PATCH, for example 0.3.0" >&2
  exit 2
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
template="$root/tooling/release/manifest.template.yaml"
artifact_name="axtp-spec-v$version"
dist_dir="$root/dist"
artifact_dir="$dist_dir/$artifact_name"
zip_path="$dist_dir/$artifact_name.zip"
commit="$(git -C "$root" rev-parse HEAD)"
released_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [[ ! -f "$template" ]]; then
  echo "Missing manifest template: $template" >&2
  exit 1
fi

rm -rf "$artifact_dir" "$zip_path"
mkdir -p "$artifact_dir"

copy_dir() {
  local src="$1"
  local dest="$2"
  local label="$3"
  if [[ -d "$src" ]]; then
    mkdir -p "$(dirname "$dest")"
    if command -v rsync >/dev/null 2>&1; then
      rsync -a --delete --exclude ".DS_Store" "$src/" "$dest/"
    else
      rm -rf "$dest"
      cp -R "$src" "$dest"
      find "$dest" -name ".DS_Store" -delete
    fi
    echo "[OK] copied $label"
  else
    echo "[SKIP] missing $label: $src"
  fi
}

copy_file() {
  local src="$1"
  local dest="$2"
  local label="$3"
  if [[ -f "$src" ]]; then
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
    echo "[OK] copied $label"
  else
    echo "[SKIP] missing $label: $src"
  fi
}

copy_file "$root/README.md" "$artifact_dir/README.md" "README.md"
copy_file "$root/LICENSE" "$artifact_dir/LICENSE" "LICENSE"
copy_file "$root/docs/README.md" "$artifact_dir/docs/README.md" "docs README"
copy_dir "$root/contract/protocol" "$artifact_dir/contract/protocol" "Protocol IR"
copy_dir "$root/docs/guides" "$artifact_dir/docs/guides" "role guides"
copy_dir "$root/docs/product" "$artifact_dir/docs/product" "product status"
copy_dir "$root/docs/workspace/business" "$artifact_dir/docs/workspace/business" "business inputs"
copy_dir "$root/docs/workspace/flows" "$artifact_dir/docs/workspace/flows" "flows"
copy_dir "$root/docs/workspace/protocol" "$artifact_dir/docs/workspace/protocol" "protocol drafts"
copy_file "$root/docs/workspace/README.md" "$artifact_dir/docs/workspace/README.md" "workspace README"
copy_dir "$root/contract/generated" "$artifact_dir/contract/generated" "generated protocol references"
copy_dir "$root/specs" "$artifact_dir/specs" "specs"
copy_dir "$root/contract/registry" "$artifact_dir/contract/registry" "registry"
copy_dir "$root/contract/mcp" "$artifact_dir/contract/mcp" "MCP registry artifacts"
copy_dir "$root/contract/test-vectors" "$artifact_dir/contract/test-vectors" "test vectors"
copy_dir "$root/conformance" "$artifact_dir/conformance" "conformance"
copy_dir "$root/docs/workspace/release" "$artifact_dir/docs/workspace/release" "release docs"
copy_dir "$root/docs/workspace/legacy-migration" "$artifact_dir/docs/workspace/legacy-migration" "legacy migration planning"
rm -rf "$artifact_dir/docs/workspace/legacy-migration/evidence"
copy_file "$root/docs/workspace/release/CHANGELOG.md" "$artifact_dir/CHANGELOG.md" "CHANGELOG.md"

sed \
  -e "s|{{VERSION}}|$version|g" \
  -e "s|{{COMMIT}}|$commit|g" \
  -e "s|{{DATE}}|$released_at|g" \
  "$template" > "$artifact_dir/manifest.yaml"
echo "[OK] wrote manifest.yaml"

find "$artifact_dir" -name ".DS_Store" -delete

required_artifact_paths=(
  "README.md"
  "LICENSE"
  "docs/README.md"
  "docs/guides/runtime.md"
  "docs/guides/testing.md"
  "docs/guides/protocol-maintainer.md"
  "docs/guides/product.md"
  "docs/guides/legacy-migration.md"
  "docs/product/domain-status.md"
  "docs/product/roadmap.md"
  "CHANGELOG.md"
  "docs/workspace/README.md"
  "contract/protocol/axtp.protocol.yaml"
  "contract/generated/protocol.md"
  "contract/generated/protocol.json"
  "contract/registry/version.yaml"
  "specs/README.md"
  "specs/0-principles/02-Contract-Boundaries.md"
  "specs/0-principles/03-Domain-Feature-Classification.md"
  "conformance/manifest.yaml"
  "docs/workspace/protocol/README.md"
  "contract/mcp/method_registry.generated.json"
  "contract/test-vectors/manifest.json"
  "docs/workspace/release/CHANGELOG.md"
)

for rel in "${required_artifact_paths[@]}"; do
  if [[ ! -e "$artifact_dir/$rel" ]]; then
    echo "Release artifact missing required path: $rel" >&2
    exit 1
  fi
done

if find "$artifact_dir" -name ".DS_Store" | grep -q .; then
  echo "Release artifact contains .DS_Store files" >&2
  exit 1
fi

mkdir -p "$dist_dir"
if command -v zip >/dev/null 2>&1; then
  (cd "$dist_dir" && zip -qr "$artifact_name.zip" "$artifact_name")
elif command -v python3 >/dev/null 2>&1; then
  (cd "$dist_dir" && python3 -m zipfile -c "$artifact_name.zip" "$artifact_name")
else
  echo "Need zip or python3 to create $zip_path" >&2
  exit 1
fi

echo "[OK] built artifact: $artifact_dir"
echo "[OK] built archive: $zip_path"
