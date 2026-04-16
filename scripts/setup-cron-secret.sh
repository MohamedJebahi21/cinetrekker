#!/usr/bin/env bash

set -euo pipefail

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return
  fi

  if command -v node >/dev/null 2>&1; then
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    return
  fi

  if [ -r /dev/urandom ] && command -v xxd >/dev/null 2>&1; then
    head -c 32 /dev/urandom | xxd -p -c 64
    return
  fi

  echo "Error: could not generate a secure CRON_SECRET. Install openssl or node." >&2
  exit 1
}

CRON_SECRET="$(generate_secret)"

cat <<EOF
✅ Generated CRON_SECRET:

$CRON_SECRET

Next steps:
1) Add this value to Supabase Edge Function secrets:
   Name: CRON_SECRET

2) Add this same value to GitHub repository secrets:
   Name: CRON_SECRET

3) Re-run the "Check New Episodes (Background Job)" workflow.

See full instructions in docs/CRON_SECRET_SETUP.md
EOF
