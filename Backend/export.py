import mysql.connector
import json
import decimal

# Función para manejar tipos de datos que JSON estándar no reconoce (como Decimal)
def custom_serializer(obj):
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    return str(obj)

try:
    # Configura tus credenciales aquí
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Lu30931891",
        database="Museo"
    )
    cursor = conn.cursor(dictionary=True)

    # 1. Obtener todos los nombres de las tablas
    cursor.execute("SHOW TABLES")
    tablas = [list(row.values())[0] for row in cursor.fetchall()]

    db_export = {}

    # 2. Recorrer cada tabla y extraer sus datos
    for tabla in tablas:
        print(f"Exportando tabla: {tabla}...")
        cursor.execute(f"SELECT * FROM {tabla}")
        db_export[tabla] = cursor.fetchall()

    # 3. Guardar a archivo JSON
    with open('museo_completo.json', 'w', encoding='utf-8') as f:
        json.dump(db_export, f, indent=4, default=custom_serializer, ensure_ascii=False)

    print("\n¡Éxito! Archivo 'museo_completo.json' creado.")

except mysql.connector.Error as err:
    print(f"Error: {err}")
finally:
    if 'conn' in locals() and conn.is_connected():
        cursor.close()
        conn.close()