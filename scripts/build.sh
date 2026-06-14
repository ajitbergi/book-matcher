#!/data/data/com.termux/files/usr/bin/bash
# Fetches secrets from Infisical via API and builds the APK
# Requires .env in project root — copy .env.example and fill in values

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

echo "Authenticating with Infisical..."
ACCESS_TOKEN=$(curl -sf -X POST "https://app.infisical.com/api/v1/auth/universal-auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$INFISICAL_CLIENT_ID\",\"clientSecret\":\"$INFISICAL_CLIENT_SECRET\"}" \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Auth failed — check .env credentials"
  exit 1
fi
echo "Authenticated."

get_secret() {
  curl -sf "https://app.infisical.com/api/v3/secrets/raw/$1?workspaceId=$INFISICAL_PROJECT_ID&environment=$INFISICAL_ENV" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
  | grep -o '"secretValue":"[^"]*"' | cut -d'"' -f4
}

echo "Fetching secrets..."
NYT_API_KEY=$(get_secret "NYT_API_KEY")

if [ -z "$NYT_API_KEY" ]; then
  echo "Failed to fetch NYT_API_KEY — check INFISICAL_PROJECT_ID and INFISICAL_ENV in .env"
  exit 1
fi
echo "Secrets fetched."

cd "$SCRIPT_DIR/.."

cat > app/src/main/assets/js/config.js <<EOF
// Keys injected at build time from Infisical
const CONFIG = {
  NYT_API_KEY: '${NYT_API_KEY}',
};
EOF
echo "config.js written."

JAVA_HOME=$PREFIX/lib/jvm/java-17-openjdk \
ANDROID_HOME=$HOME/android-sdk \
./gradlew assembleDebug

cp app/build/outputs/apk/debug/app-debug.apk \
   "/storage/emulated/0/Download/BookMatcher.apk"
echo "Done — BookMatcher.apk copied to Downloads."
