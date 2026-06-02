#!/usr/bin/env bash
# Generate frontend/lib/api/api-types.ts from the backend's openapi.json.
#
# Per ADR-003 (2026-06-01) — Eliminates manual TypeScript-to-Pydantic
# drift. Run any time you change a backend Pydantic schema (or after
# pulling backend changes).
#
# Usage:
#   npm run types:gen                  — fetch from production
#   API_URL=http://localhost:8000 npm run types:gen  — fetch from local
#
# Commit the generated file. CI runs `tsc --noEmit` against it so type
# drift fails the build.

set -euo pipefail

API_URL="${API_URL:-https://devastroai.up.railway.app}"
OUT="lib/api/api-types.ts"

echo "Fetching OpenAPI spec from $API_URL/openapi.json ..."
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

# Use --fail so non-200 responses error out (otherwise curl writes the
# 404 body into our types file).
curl --fail --silent --show-error "$API_URL/openapi.json" >"$TMP"

echo "Generating $OUT ..."
npx openapi-typescript "$TMP" --output "$OUT"

echo "Done. Commit $OUT if changed."
