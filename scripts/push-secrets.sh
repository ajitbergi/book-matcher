#!/data/data/com.termux/files/usr/bin/bash
# Pushes API keys to Infisical via REST API
# Requires .env in project root — copy .env.example and fill in values

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

GOOGLE_BOOKS_API_KEY="${GOOGLE_BOOKS_API_KEY:?Set GOOGLE_BOOKS_API_KEY in .env or environment}"
NYT_API_KEY="${NYT_API_KEY:?Set NYT_API_KEY in .env or environment}"

echo "Authenticating with Infisical..."
ACCESS_TOKEN=$(curl -sf -X POST "https://app.infisical.com/api/v1/auth/universal-auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$INFISICAL_CLIENT_ID\",\"clientSecret\":\"$INFISICAL_CLIENT_SECRET\"}" \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Auth failed — check .env credentials"
  exit 1
fi

push_secret() {
  local name="$1"
  local value="$2"
  curl -sf -X POST "https://app.infisical.com/api/v3/secrets/raw/$name" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"workspaceId\":\"$INFISICAL_PROJECT_ID\",\"environment\":\"$INFISICAL_ENV\",\"secretValue\":\"$value\",\"type\":\"shared\"}" \
    > /dev/null && echo "Stored $name" || \
  curl -sf -X PATCH "https://app.infisical.com/api/v3/secrets/raw/$name" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"workspaceId\":\"$INFISICAL_PROJECT_ID\",\"environment\":\"$INFISICAL_ENV\",\"secretValue\":\"$value\"}" \
    > /dev/null && echo "Updated $name"
}

push_secret "GOOGLE_BOOKS_API_KEY" "$GOOGLE_BOOKS_API_KEY"
push_secret "NYT_API_KEY" "$NYT_API_KEY"

echo "Done. Secrets stored in Infisical project $INFISICAL_PROJECT_ID ($INFISICAL_ENV)."
