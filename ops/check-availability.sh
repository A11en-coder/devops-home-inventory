#!/usr/bin/env bash

# A local availability sample. systemd supplies a persistent state directory.
set -u

url="${INVENTORY_CHECK_URL:-http://127.0.0.1:8084/api/items}"
state_dir="${STATE_DIRECTORY:-${HOME}/.local/state/devops-home-inventory-monitor}"
state_file="${state_dir}/consecutive-failures"
mkdir -p -- "$state_dir"

previous=0
if [[ -f "$state_file" ]]; then
  read -r previous < "$state_file"
  [[ "$previous" =~ ^[0-9]+$ ]] || previous=0
fi

result=$(curl --silent --max-time 5 --output /dev/null --write-out '%{http_code} %{time_total}' "$url")
curl_exit=$?
read -r status elapsed <<< "$result"
status="${status:-000}"
elapsed="${elapsed:-0}"

if [[ "$curl_exit" -eq 0 && "$status" == "200" ]]; then
  printf '0\n' > "$state_file"
  if (( previous > 0 )); then
    printf 'RECOVERED status=%s elapsed_s=%s previous_failures=%s\n' "$status" "$elapsed" "$previous"
  else
    printf 'OK status=%s elapsed_s=%s\n' "$status" "$elapsed"
  fi
else
  failures=$((previous + 1))
  printf '%s\n' "$failures" > "$state_file"
  if (( failures == 3 )); then
    printf 'ALERT status=%s curl_exit=%s elapsed_s=%s consecutive_failures=%s\n' "$status" "$curl_exit" "$elapsed" "$failures"
  else
    printf 'FAIL status=%s curl_exit=%s elapsed_s=%s consecutive_failures=%s\n' "$status" "$curl_exit" "$elapsed" "$failures"
  fi
fi
