#!/usr/bin/env bash
set -euo pipefail

# Applies a SQL migration on the remote application database via SSH.
# Host, paths, and credentials come from the environment or .env.local —
# they are intentionally not published as defaults in this repository.

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

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <migration-sql-file>"
  exit 1
fi

MIGRATION_FILE="$1"
REMOTE_HOST="${EXPLICIT_REMOTE_DB_HOST:-${REMOTE_DB_HOST:-}}"
REMOTE_DOCKER_DIR="${EXPLICIT_REMOTE_DOCKER_DIR:-${REMOTE_DOCKER_DIR:-}}"
REMOTE_DB_NAME="${EXPLICIT_REMOTE_DB_NAME:-${REMOTE_DB_NAME:-postgres}}"
REMOTE_DB_USER="${EXPLICIT_REMOTE_DB_USER:-${REMOTE_DB_USER:-postgres}}"

if [[ -z "${REMOTE_HOST}" ]]; then
  echo "REMOTE_DB_HOST is required (set in the environment or .env.local)." >&2
  exit 1
fi
if [[ -z "${REMOTE_DOCKER_DIR}" ]]; then
  echo "REMOTE_DOCKER_DIR is required (set in the environment or .env.local)." >&2
  exit 1
fi

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "Applying migration on ${REMOTE_HOST}: ${MIGRATION_FILE}"
if ! ssh -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=10 "${REMOTE_HOST}" "true" 2>/dev/null; then
  echo "" >&2
  echo "SSH to ${REMOTE_HOST} failed in non-interactive mode." >&2
  echo "Confirm restricted ops access is configured, then: ssh -o BatchMode=yes ${REMOTE_HOST} 'echo ok'" >&2
  echo "Detailed runbooks are maintained in the restricted operations store." >&2
  echo "" >&2
  exit 1
fi

ssh -o IdentitiesOnly=yes "${REMOTE_HOST}" \
  "cd ${REMOTE_DOCKER_DIR} && sudo docker compose exec -T db psql -v ON_ERROR_STOP=1 -U ${REMOTE_DB_USER} -d ${REMOTE_DB_NAME}" \
  < "${MIGRATION_FILE}"

echo "Migration applied successfully."
