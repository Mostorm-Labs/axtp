#!/usr/bin/env bash
set -euo pipefail

echo "Current commit: $(git rev-parse HEAD)"
echo "Current tag: $(git describe --tags --exact-match 2>/dev/null || echo 'no exact tag')"
echo "Latest spec tag: $(git tag --list 'spec/v*' --sort=-v:refname | head -n 1)"
