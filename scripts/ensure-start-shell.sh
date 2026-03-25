#!/usr/bin/env bash

set -euo pipefail

BUILD_DIR="${1:-build}"
FALLBACK_HTML="${BUILD_DIR}/404.html"
START_HTML="${BUILD_DIR}/index.html"

if [[ ! -f "${FALLBACK_HTML}" ]]; then
	echo "Missing fallback shell: ${FALLBACK_HTML}" >&2
	exit 1
fi

cp "${FALLBACK_HTML}" "${START_HTML}"
echo "Ensured start shell: ${START_HTML}"
