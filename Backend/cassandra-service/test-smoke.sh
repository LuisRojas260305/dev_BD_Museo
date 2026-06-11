#!/bin/bash
# Smoke test para Sprint 2 - Cassandra Auditoría
# Requiere: curl, jq (opcional)
# Uso: ./test-smoke.sh [email] [password]

set -e

BASE_URL="http://localhost:3002/api/auditoria"
MONOLITH_URL="http://localhost:3000"
EMAIL="${1:-test@museo.com}"
PASSWORD="${2:-password123}"

PASS=0
FAIL=0

check() {
    local desc="$1"
    local expected_code="$2"
    local actual_code="$3"
    local body="$4"
    
    if [ "$actual_code" = "$expected_code" ]; then
        echo "  ✅ $desc"
        PASS=$((PASS + 1))
    else
        echo "  ❌ $desc (expected $expected_code, got $actual_code)"
        echo "     Body: $body"
        FAIL=$((FAIL + 1))
    fi
}

echo "=========================================="
echo " Smoke Test: Sprint 2 - Cassandra Auditoría"
echo "=========================================="
echo ""

# Test 1: Health check (sin auth)
echo "[Test 1] Health check del servicio"
RESP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
check "GET /health → 200" 200 "$RESP" ""

# Test 2: Health check detallado
echo "[Test 2] Health check detallado"
BODY=$(curl -s "$BASE_URL/health")
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
check "GET /health → 200 con JSON" 200 "$HTTP" "$BODY"
echo "   Body: $BODY"

# Test 3: POST evento sin token → 401
echo "[Test 3] POST evento sin token → 401"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/eventos" \
    -H "Content-Type: application/json" \
    -d '{"tipo_evento":"test","usuario":"test@test.com","severidad":"info"}')
check "POST /eventos sin token → 401" 401 "$HTTP" ""

# Test 4: Login en el monolito para obtener token
echo "[Test 4] Login en el monolito"
LOGIN=$(curl -s -X POST "$MONOLITH_URL/api/usuarios/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "  ✅ Login exitoso, token obtenido"
    PASS=$((PASS + 1))
else
    echo "  ⚠️  Login falló (puede ser credenciales). Usando token demo..."
    echo "  Respuesta: $LOGIN"
    # Si el login falla, intentamos con el admin si existe
    LOGIN=$(curl -s -X POST "$MONOLITH_URL/api/usuarios/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@museo.com","password":"admin123"}')
    TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$TOKEN" ]; then
        echo "  ⚠️  No se pudo obtener token. Creando token manual..."
        # Generamos token manual para test (misma clave que .env)
        # Esto es solo para smoke test
        FAIL=$((FAIL + 1))
    fi
fi

if [ -n "$TOKEN" ]; then
    # Test 5: POST evento con token → 201
    echo "[Test 5] POST evento con token → 201"
    RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/eventos" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"tipo_evento":"login_exitoso","usuario":"smoke-test@museo.com","severidad":"info","metadata":{"test":"smoke"}}')
    check "POST /eventos con token → 201" 201 "$RESP" ""
    
    # Test 6: POST evento inválido (sin tipo) → 400
    echo "[Test 6] POST evento sin tipo → 400"
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/eventos" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"usuario":"test","severidad":"info"}')
    check "POST /eventos sin tipo → 400" 400 "$HTTP" ""
    
    # Test 7: POST evento severidad inválida → 400
    echo "[Test 7] POST evento severidad inválida → 400"
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/eventos" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"tipo_evento":"test","usuario":"test","severidad":"super-critical"}')
    check "POST /eventos severidad inválida → 400" 400 "$HTTP" ""
    
    # Test 8: GET eventos sin parámetro tipo → 400
    echo "[Test 8] GET eventos sin tipo → 400"
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/eventos" \
        -H "Authorization: Bearer $TOKEN")
    check "GET /eventos sin tipo → 400" 400 "$HTTP" ""
    
    # Test 9: GET eventos con tipo (requiere admin)
    echo "[Test 9] GET eventos por tipo"
    RESP=$(curl -s -X GET "$BASE_URL/eventos?tipo=login_exitoso" \
        -H "Authorization: Bearer $TOKEN")
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/eventos?tipo=login_exitoso" \
        -H "Authorization: Bearer $TOKEN")
    # Puede ser 200 o 403 dependiendo si el token es admin
    if [ "$HTTP" = "200" ]; then
        echo "  ✅ GET /eventos?tipo=login_exitoso → 200"
        echo "     Eventos encontrados: $(echo "$RESP" | grep -o '"tipo_evento"' | wc -l)"
        PASS=$((PASS + 1))
    elif [ "$HTTP" = "403" ]; then
        echo "  ⚠️  GET /eventos → 403 (token no es admin, esperado si no es admin)"
        PASS=$((PASS + 1))
    else
        check "GET /eventos por tipo" 200 "$HTTP" "$RESP"
    fi
    
    # Test 10: GET reportes con fecha (requiere admin)
    echo "[Test 10] GET reportes con fecha"
    HOY=$(date +%Y-%m-%d)
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/reportes?fecha=$HOY" \
        -H "Authorization: Bearer $TOKEN")
    if [ "$HTTP" = "200" ]; then
        echo "  ✅ GET /reportes?fecha=$HOY → 200"
        PASS=$((PASS + 1))
    elif [ "$HTTP" = "403" ]; then
        echo "  ⚠️  GET /reportes → 403 (token no es admin)"
        PASS=$((PASS + 1))
    else
        check "GET /reportes" 200 "$HTTP" ""
    fi
    
    # Test 11: Reportes sin fecha → 400
    echo "[Test 11] GET reportes sin fecha → 400"
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/reportes" \
        -H "Authorization: Bearer $TOKEN")
    check "GET /reportes sin fecha → 400" 400 "$HTTP" ""
fi

echo ""
echo "=========================================="
echo " Resultados: $PASS passed, $FAIL failed"
echo "=========================================="

# Exit with error if any test failed
[ "$FAIL" -eq 0 ] || exit 1
