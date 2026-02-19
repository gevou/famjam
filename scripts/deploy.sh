#!/usr/bin/env bash
set -euo pipefail

echo "=== FamJam Deploy ==="

# 1. Verify prerequisites
echo ""
echo "Checking prerequisites..."

if ! command -v vercel &>/dev/null; then
  echo "ERROR: vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi

if ! command -v supabase &>/dev/null; then
  echo "ERROR: supabase CLI not found. Install with: brew install supabase/tap/supabase"
  exit 1
fi

ENV_FILE=".env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.example to .env.local and fill in values."
  exit 1
fi

echo "All prerequisites met."

# 2. Sync env vars to Vercel
echo ""
echo "Syncing env vars to Vercel..."

# Get existing env vars
EXISTING_VARS=$(vercel env ls 2>/dev/null || true)

while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^# ]] && continue

  if echo "$EXISTING_VARS" | grep -q "$key"; then
    echo "  $key — already set, skipping"
  else
    for env in production preview development; do
      printf '%s' "$value" | vercel env add "$key" "$env"
    done
    echo "  $key — added"
  fi
done < "$ENV_FILE"

echo "Env vars synced."

# 3. Push Supabase migrations
echo ""
echo "Pushing Supabase migrations..."
supabase db push
echo "Migrations applied."

# 4. Deploy to Vercel
echo ""
echo "Deploying to Vercel..."
DEPLOY_URL=$(vercel deploy --prod 2>&1 | tail -1)
echo ""
echo "=== Deployed ==="
echo "$DEPLOY_URL"
