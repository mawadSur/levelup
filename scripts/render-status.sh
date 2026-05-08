#!/usr/bin/env bash
# render-status.sh — list LevelUp services on Render and show their health.
#
# Usage:
#   RENDER_API_KEY=rnd_xxx ./scripts/render-status.sh           # human format
#   RENDER_API_KEY=rnd_xxx ./scripts/render-status.sh --json    # raw JSON
#
# Lists services whose name starts with "levelup-" (api, worker, etc.) and
# prints id, type, status, suspension state, last deploy status, dashboard URL.
# Exits non-zero if any matching service is in a non-healthy state.

set -euo pipefail

JSON_OUTPUT=0
if [[ "${1:-}" == "--json" ]]; then
  JSON_OUTPUT=1
fi

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "ERROR: RENDER_API_KEY not set. Create one at https://dashboard.render.com/u/settings#api-keys" >&2
  exit 1
fi
if [[ "${RENDER_API_KEY}" == PLACEHOLDER_* ]]; then
  echo "ERROR: RENDER_API_KEY is a PLACEHOLDER. Paste a real rnd_... key." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required. Install via 'brew install jq' or your package manager." >&2
  exit 1
fi

API="https://api.render.com/v1"
AUTH=(-H "Authorization: Bearer ${RENDER_API_KEY}" -H "Accept: application/json")

# Pull all services (paginated, but we expect <100 for a single LevelUp workspace).
services_json=$(curl -fsSL "${AUTH[@]}" "${API}/services?limit=100&name=levelup")

if [[ "${JSON_OUTPUT}" -eq 1 ]]; then
  echo "${services_json}"
  exit 0
fi

count=$(echo "${services_json}" | jq 'length')
if [[ "${count}" -eq 0 ]]; then
  echo "No services found whose name contains 'levelup'."
  echo "If you've already deployed via Blueprint, double-check your RENDER_API_KEY belongs to the right workspace."
  exit 1
fi

unhealthy=0
printf "%-22s %-18s %-12s %-12s %-22s %s\n" "NAME" "TYPE" "STATUS" "SUSPENDED" "LAST DEPLOY" "DASHBOARD"
echo "------------------------------------------------------------------------------------------------------------------------"

while read -r row; do
  service_id=$(echo "${row}" | jq -r '.service.id')
  name=$(echo "${row}" | jq -r '.service.name')
  type=$(echo "${row}" | jq -r '.service.type')
  suspended=$(echo "${row}" | jq -r '.service.suspended')
  dashboard=$(echo "${row}" | jq -r '.service.dashboardUrl // ""')

  # Fetch latest deploy for status + commit
  deploys=$(curl -fsSL "${AUTH[@]}" "${API}/services/${service_id}/deploys?limit=1") || deploys="[]"
  latest_status=$(echo "${deploys}" | jq -r '.[0].deploy.status // "unknown"')

  # Status interpretation
  status_label="${latest_status}"
  case "${latest_status}" in
    live) ;;
    build_in_progress|update_in_progress|created|deploying|build_failed|update_failed|canceled|deactivated)
      unhealthy=1
      ;;
    *)
      ;;
  esac
  if [[ "${suspended}" == "suspended" ]]; then
    unhealthy=1
  fi

  printf "%-22s %-18s %-12s %-12s %-22s %s\n" \
    "${name:0:22}" "${type:0:18}" "${status_label:0:12}" "${suspended:0:12}" "${latest_status:0:22}" "${dashboard}"
done < <(echo "${services_json}" | jq -c '.[]')

echo ""
if [[ "${unhealthy}" -eq 1 ]]; then
  echo "One or more services are not in a healthy 'live' state. Investigate via the dashboard URLs above."
  exit 2
fi
echo "All LevelUp services are live."
