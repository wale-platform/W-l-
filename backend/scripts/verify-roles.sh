#!/usr/bin/env bash
# Live verification of the multi-role endpoints against a running backend.
#
# This exercises the PRIVILEGE BOUNDARY over real HTTP with real cookies and
# real CSRF tokens — the unit tests mock Prisma, this does not. Read-mostly:
# the only writes are one throwaway `rolecheck+<epoch>@wale.test` account and
# role rows on it. It is left behind for inspection; drop it with:
#
#   DELETE FROM "User" WHERE email LIKE 'rolecheck+%';
#
#   usage: bash scripts/verify-roles.sh [base-url]

set -u
API="${1:-http://localhost:4000/api/v1}"
PASS=0
FAIL=0

jar() { mktemp -t wale-jar.XXXXXX; }

# Echo a CSRF token for the given jar, seeding the jar's csrf cookie.
csrf() {
  curl -s -c "$1" -b "$1" "$API/auth/csrf" |
    sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p'
}

# send METHOD PATH JAR [BODY] -> prints "STATUS<newline>BODY"
send() {
  local method="$1" path="$2" j="$3" body="${4:-}"
  local token
  token="$(csrf "$j")"
  if [ -n "$body" ]; then
    curl -s -o /tmp/wale-body -w '%{http_code}' -X "$method" "$API$path" \
      -c "$j" -b "$j" -H 'Content-Type: application/json' \
      -H "X-CSRF-Token: $token" -d "$body"
  else
    curl -s -o /tmp/wale-body -w '%{http_code}' -X "$method" "$API$path" \
      -c "$j" -b "$j" -H "X-CSRF-Token: $token"
  fi
  echo
  cat /tmp/wale-body
}

# check LABEL EXPECTED_STATUS ACTUAL_STATUS BODY [EXPECTED_SUBSTRING]
check() {
  local label="$1" want="$2" got="$3" body="$4" needle="${5:-}"
  if [ "$got" != "$want" ]; then
    echo "  FAIL  $label — expected $want, got $got"
    echo "        $body"
    FAIL=$((FAIL + 1))
    return
  fi
  if [ -n "$needle" ] && ! printf '%s' "$body" | grep -q "$needle"; then
    echo "  FAIL  $label — status $got ok but body missing: $needle"
    echo "        $body"
    FAIL=$((FAIL + 1))
    return
  fi
  echo "  ok    $label ($got)"
  PASS=$((PASS + 1))
}

STAMP="$(date +%s)"
EMAIL="rolecheck+$STAMP@wale.test"
USER_JAR="$(jar)"
ADMIN_JAR="$(jar)"

echo "=== Multi-role live verification against $API ==="
echo

echo "-- registration honours a self-claimable role --"
OUT="$(send POST /auth/register "$USER_JAR" \
  "{\"email\":\"$EMAIL\",\"password\":\"MoverDev123!\",\"confirmPassword\":\"MoverDev123!\",\"firstName\":\"Mover\",\"lastName\":\"Tester\",\"phone\":\"08031234567\",\"role\":\"MOVER\"}")"
STATUS="$(printf '%s' "$OUT" | head -1)"
BODY="$(printf '%s' "$OUT" | tail -n +2)"
check "register as MOVER" 201 "$STATUS" "$BODY" '"role":"MOVER"'
check "response carries roles[]" 201 "$STATUS" "$BODY" '"roles":\["MOVER"\]'
NEW_ID="$(printf '%s' "$BODY" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
echo "        new user id: ${NEW_ID:-<none>}"

echo
echo "-- registration REFUSES a privileged role --"
for BAD in ADMIN LAWYER; do
  BJ="$(jar)"
  OUT="$(send POST /auth/register "$BJ" \
    "{\"email\":\"esc-$BAD-$STAMP@wale.test\",\"password\":\"EscDev123!\",\"confirmPassword\":\"EscDev123!\",\"firstName\":\"Esc\",\"lastName\":\"Alate\",\"phone\":\"08031234568\",\"role\":\"$BAD\"}")"
  check "register as $BAD is rejected" 422 "$(printf '%s' "$OUT" | head -1)" \
    "$(printf '%s' "$OUT" | tail -n +2)"
done

echo
echo "-- the caller's own role set --"
STATUS="$(curl -s -o /tmp/wale-body -w '%{http_code}' -b "$USER_JAR" "$API/users/me/roles")"
BODY="$(cat /tmp/wale-body)"
check "GET /users/me/roles" 200 "$STATUS" "$BODY" '"primaryRole":"MOVER"'

echo
echo "-- self-claim of a claimable role --"
OUT="$(send POST /users/me/roles "$USER_JAR" '{"role":"LANDLORD"}')"
check "claim LANDLORD" 200 "$(printf '%s' "$OUT" | head -1)" \
  "$(printf '%s' "$OUT" | tail -n +2)" 'LANDLORD'

echo
echo "-- self-claim of a privileged role is BLOCKED --"
for BAD in ADMIN LAWYER; do
  OUT="$(send POST /users/me/roles "$USER_JAR" "{\"role\":\"$BAD\"}")"
  check "self-claim $BAD is rejected" 422 "$(printf '%s' "$OUT" | head -1)" \
    "$(printf '%s' "$OUT" | tail -n +2)"
done

echo
echo "-- admin grant endpoint is unreachable for a non-admin --"
OUT="$(send POST "/users/$NEW_ID/roles" "$USER_JAR" '{"role":"LAWYER"}')"
check "non-admin grant is forbidden" 403 "$(printf '%s' "$OUT" | head -1)" \
  "$(printf '%s' "$OUT" | tail -n +2)"

echo
echo "-- revoking roles --"
OUT="$(send DELETE /users/me/roles/MOVER "$USER_JAR")"
check "cannot revoke primary role" 403 "$(printf '%s' "$OUT" | head -1)" \
  "$(printf '%s' "$OUT" | tail -n +2)"
OUT="$(send DELETE /users/me/roles/LANDLORD "$USER_JAR")"
check "can revoke secondary role" 200 "$(printf '%s' "$OUT" | head -1)" \
  "$(printf '%s' "$OUT" | tail -n +2)"

echo
echo "-- an admin CAN grant a vetted role --"
OUT="$(send POST /auth/login "$ADMIN_JAR" \
  '{"email":"admin@wale.test","password":"AdminDev123!"}')"
check "admin login" 200 "$(printf '%s' "$OUT" | head -1)" \
  "$(printf '%s' "$OUT" | tail -n +2)" '"role":"ADMIN"'
OUT="$(send POST "/users/$NEW_ID/roles" "$ADMIN_JAR" '{"role":"LAWYER"}')"
check "admin grants LAWYER" 200 "$(printf '%s' "$OUT" | head -1)" \
  "$(printf '%s' "$OUT" | tail -n +2)" 'LAWYER'

echo
echo "-- CSRF is still enforced (not disabled to make this pass) --"
STATUS="$(curl -s -o /tmp/wale-body -w '%{http_code}' -X POST "$API/users/me/roles" \
  -b "$USER_JAR" -H 'Content-Type: application/json' -d '{"role":"LANDLORD"}')"
check "no CSRF header is rejected" 403 "$STATUS" "$(cat /tmp/wale-body)"

echo
echo "=== $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
