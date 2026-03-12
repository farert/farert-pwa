#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${ROOT_DIR}/.devcontainer/docker-compose.yml"
SERVICE_NAME="app"
WORKDIR="/workspace"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "[error] compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

if command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker-compose -f "${COMPOSE_FILE}")
else
  DOCKER_COMPOSE=(docker compose -f "${COMPOSE_FILE}")
fi

usage() {
  cat <<'EOF'
Usage: ./docker.sh [build|start|shell|clean|ci|dev|test|test-unit|test-e2e]

Commands:
  build  Build (or rebuild) the devcontainer image
  start  Start container in background (detached)
  shell  Open an interactive shell in the running container
  clean  Stop and remove container(s) and associated anonymous volumes
  ci     Start container and run setup commands (pnpm install + playwright install)
  dev     Start container and run pnpm dev (host bind for container)
  test      Run all tests (pnpm test) in container
  test-unit Run unit tests only (pnpm test:unit)
  test-e2e  Run e2e tests only (pnpm test:e2e)
EOF
}

cmd="${1:-}"
case "${cmd}" in
  build)
    echo "[docker.sh] building..."
    "${DOCKER_COMPOSE[@]}" build
    ;;
  start)
    echo "[docker.sh] starting..."
    "${DOCKER_COMPOSE[@]}" up -d "${SERVICE_NAME}"
    echo "[docker.sh] running:"
    echo "  docker compose -f ${COMPOSE_FILE} ps"
    ;;
  shell)
    if ! "${DOCKER_COMPOSE[@]}" ps -q "${SERVICE_NAME}" >/dev/null 2>&1; then
      echo "[docker.sh] container is not running. starting..."
      "${DOCKER_COMPOSE[@]}" up -d "${SERVICE_NAME}"
    fi
    echo "[docker.sh] attaching to ${SERVICE_NAME}..."
    "${DOCKER_COMPOSE[@]}" exec "${SERVICE_NAME}" /bin/bash
    ;;
  ci)
    echo "[docker.sh] running container setup..."
    "${DOCKER_COMPOSE[@]}" up -d "${SERVICE_NAME}"
    "${DOCKER_COMPOSE[@]}" exec "${SERVICE_NAME}" bash -lc \
      'pnpm config set store-dir /home/node/.pnpm-store && pnpm install --frozen-lockfile --store-dir /home/node/.pnpm-store && pnpm exec playwright install chromium'
    ;;
  dev)
    echo "[docker.sh] starting dev server..."
    "${DOCKER_COMPOSE[@]}" up -d "${SERVICE_NAME}"
    "${DOCKER_COMPOSE[@]}" exec "${SERVICE_NAME}" bash -lc \
      'pnpm config set store-dir /home/node/.pnpm-store && pnpm install --frozen-lockfile --store-dir /home/node/.pnpm-store && pnpm dev -- --host 0.0.0.0'
    ;;
  clean)
    echo "[docker.sh] cleaning..."
    "${DOCKER_COMPOSE[@]}" down -v --remove-orphans
    ;;
  test|test-unit|test-e2e)
    echo "[docker.sh] running tests..."
    "${DOCKER_COMPOSE[@]}" up -d "${SERVICE_NAME}"
    case "${cmd}" in
      test)
        "${DOCKER_COMPOSE[@]}" exec "${SERVICE_NAME}" bash -lc 'pnpm test'
        ;;
      test-unit)
        "${DOCKER_COMPOSE[@]}" exec "${SERVICE_NAME}" bash -lc 'pnpm test:unit'
        ;;
      test-e2e)
        "${DOCKER_COMPOSE[@]}" exec "${SERVICE_NAME}" bash -lc 'pnpm test:e2e'
        ;;
    esac
    ;;
  *)
    usage
    exit 1
    ;;
esac
