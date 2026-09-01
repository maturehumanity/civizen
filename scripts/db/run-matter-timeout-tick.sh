#!/usr/bin/env bash
set -euo pipefail

# Explicit Matter timeout worker invocation for environments without pg_cron,
# or to run the same authoritative function immediately.
# Usage: scripts/db/run-matter-timeout-tick.sh

EXPLICIT_REMOTE_DB_HOST="${REMOTE_DB_HOST:-}"
EXPLICIT_REMOTE_DOCKER_DIR="${REMOTE_DOCKER_DIR:-}"
EXPLICIT_REMOTE_DB_NAME="${REMOTE_DB_NAME:-}"
EXPLICIT_REMOTE_DB_USER="${REMOTE_DB_USER:-}"

if [[ -f ".env.local" ]]; then
  while IFS='=' read -r raw_key raw_value; do
    [[ -z "${raw_key}" ]] && continue
    key="$(echo "${raw_key}" | tr -d '[:space:]')"
    value="$(echo "${raw_value}" | sed -E "s/^['\"]|['\"]$//g")"
    case "${key}" in
      REMOTE_DB_HOST)
        [[ -z "${EXPLICIT_REMOTE_DB_HOST}" ]] && REMOTE_DB_HOST="${value}"
        ;;
      REMOTE_DOCKER_DIR)
        [[ -z "${EXPLICIT_REMOTE_DOCKER_DIR}" ]] && REMOTE_DOCKER_DIR="${value}"
        ;;
      REMOTE_DB_NAME)
        [[ -z "${EXPLICIT_REMOTE_DB_NAME}" ]] && REMOTE_DB_NAME="${value}"
        ;;
      REMOTE_DB_USER)
        [[ -z "${EXPLICIT_REMOTE_DB_USER}" ]] && REMOTE_DB_USER="${value}"
        ;;
    esac
  done < <(grep -E '^(REMOTE_DB_HOST|REMOTE_DOCKER_DIR|REMOTE_DB_NAME|REMOTE_DB_USER)=' ".env.local")
fi

REMOTE_HOST="${EXPLICIT_REMOTE_DB_HOST:-${REMOTE_DB_HOST:-}}"
REMOTE_DOCKER_DIR="${EXPLICIT_REMOTE_DOCKER_DIR:-${REMOTE_DOCKER_DIR:-}}"
REMOTE_DB_NAME="${EXPLICIT_REMOTE_DB_NAME:-${REMOTE_DB_NAME:-postgres}}"
REMOTE_DB_USER="${EXPLICIT_REMOTE_DB_USER:-${REMOTE_DB_USER:-postgres}}"

if [[ -z "${REMOTE_HOST}" || -z "${REMOTE_DOCKER_DIR}" ]]; then
  echo "REMOTE_DB_HOST and REMOTE_DOCKER_DIR are required." >&2
  exit 1
fi

ssh -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=10 "${REMOTE_HOST}" \
  "cd ${REMOTE_DOCKER_DIR} && sudo docker compose exec -T db psql -v ON_ERROR_STOP=1 -U ${REMOTE_DB_USER} -d ${REMOTE_DB_NAME} -c \"SELECT public.process_matter_action_timeouts();\""
