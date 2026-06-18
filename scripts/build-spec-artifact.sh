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

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
template="$root/release/manifest.template.yaml"
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
copy_file "$root/ROADMAP.md" "$artifact_dir/ROADMAP.md" "ROADMAP.md"
copy_dir "$root/protocol" "$artifact_dir/protocol" "Protocol IR"
copy_dir "$root/docs/generated" "$artifact_dir/docs/generated" "generated protocol references"
copy_dir "$root/docs/specs" "$artifact_dir/docs/specs" "specs"
copy_dir "$root/registry" "$artifact_dir/registry" "registry"
copy_dir "$root/tooling/mcp" "$artifact_dir/tooling/mcp" "MCP registry artifacts"
copy_dir "$root/tooling/test-vectors" "$artifact_dir/tooling/test-vectors" "test vectors"
copy_dir "$root/docs/conformance" "$artifact_dir/docs/conformance" "conformance"
copy_dir "$root/docs/conformance" "$artifact_dir/conformance" "conformance compatibility alias"
copy_dir "$root/docs/release" "$artifact_dir/docs/release" "release docs"
copy_dir "$root/docs/legacy-migration" "$artifact_dir/docs/legacy-migration" "legacy migration planning"
rm -rf "$artifact_dir/docs/legacy-migration/evidence"
copy_file "$root/docs/release/CHANGELOG.md" "$artifact_dir/CHANGELOG.md" "CHANGELOG.md"

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
  "protocol/axtp.protocol.yaml"
  "docs/generated/protocol.md"
  "docs/generated/protocol.json"
  "registry/version.yaml"
  "docs/specs/README.md"
  "docs/conformance/manifest.yaml"
  "conformance/manifest.yaml"
  "tooling/mcp/method_registry.generated.json"
  "tooling/test-vectors/manifest.json"
  "docs/release/CHANGELOG.md"
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
