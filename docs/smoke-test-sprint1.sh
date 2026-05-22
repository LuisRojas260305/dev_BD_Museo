#!/usr/bin/env bash
# Smoke test para Sprint 1 — Servicio MongoDB
# Requiere: servidor corriendo en puerto 3001 con seed data
set -e

BASE="http://localhost:3001/api/catalog"
PASS=0
FAIL=0

check() {
  local desc="$1"
  local method="$2"
  local url="$3"
  local expected="$4"
  local response

  response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" 2>/dev/null || echo "000")

  if [ "$response" = "$expected" ]; then
    echo "  ✅ PASS: $desc (HTTP $response)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: $desc (esperado $expected, obtuvo $response)"
    FAIL=$((FAIL + 1))
  fi
}

check_json() {
  local desc="$1"
  local url="$2"
  local jq_filter="$3"
  local expected="$4"

  local result
  result=$(curl -s "$url" 2>/dev/null | jq -r "$jq_filter" 2>/dev/null || echo "null")

  if [ "$result" = "$expected" ]; then
    echo "  ✅ PASS: $desc (=$expected)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: $desc (esperado '$expected', obtuvo '$result')"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Smoke Test: Sprint 1 MongoDB Service ==="
echo ""

# 1. Health check
echo "[Health Check]"
check "Health endpoint" GET "$BASE/health" "200"
check_json "Health status ok" "$BASE/health" ".status" "ok"

# 2. Catalog list
echo ""
echo "[Catalog List]"
check "GET /api/catalog" GET "$BASE" "200"
check_json "Has data array" "$BASE" ".success" "true"
check_json "Has total count" "$BASE" ".total | type" "number"

# 3. Pagination
echo ""
echo "[Pagination]"
check_json "Page param works" "$BASE?page=1&limit=5" ".page" "1"
check_json "Limit param works" "$BASE?page=1&limit=5" ".limit" "5"

# 4. Filter by gender
echo ""
echo "[Gender Filter]"
check_json "Filter Pintura" "$BASE?genero=Pintura" ".data[0].genero" "Pintura"

# 5. Filter by price
echo ""
echo "[Price Filter]"
check_json "Price filter" "$BASE?precio_min=1000000&precio_max=10000000" ".success" "true"

# 6. Validation errors
echo ""
echo "[Validation]"
check "Invalid page" GET "$BASE?page=0" "400"
check "Invalid limit" GET "$BASE?limit=200" "400"
check "Invalid genero" GET "$BASE?genero=Invalido" "400"
check "precio_min > precio_max" GET "$BASE?precio_min=100&precio_max=50" "400"

# 7. Search
echo ""
echo "[Search]"
check "Search endpoint" GET "$BASE/search?q=surrealista" "200"
check "Short query fails" GET "$BASE/search?q=a" "400"
check "Missing query fails" GET "$BASE/search" "400"

# 8. Detail
echo ""
echo "[Detail]"
FIRST_ID=$(curl -s "$BASE" | jq -r '.data[0]._id // empty' 2>/dev/null)
if [ -n "$FIRST_ID" ]; then
  check "Detail by ObjectId" GET "$BASE/$FIRST_ID" "200"
  check_json "Detail success" "$BASE/$FIRST_ID" ".success" "true"
fi

FIRST_ORIG=$(curl -s "$BASE" | jq -r '.data[0].obra_id_original // empty' 2>/dev/null)
if [ -n "$FIRST_ORIG" ]; then
  check "Detail by numeric ID" GET "$BASE/$FIRST_ORIG" "200"
fi

check "Detail not found" GET "$BASE/999999999" "404"

# 9. Invalid ID format
echo ""
echo "[Invalid ID]"
check "Invalid ObjectId format" GET "$BASE/not-a-valid-id-here" "400"

echo ""
echo "=== Resultados ==="
echo "  ✅ Passed: $PASS"
echo "  ❌ Failed: $FAIL"
echo "  Total: $((PASS + FAIL))"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
