@echo off
chcp 65001 >nul
setlocal EnableExtensions
title Museo de Arte - Lanzador

REM ===========================================================
REM   Lanzador automatico del proyecto Museo de Arte
REM   Inicia: MongoDB, MySQL, Apache, Cassandra, Neo4j
REM           Backend (3000), mongodb-service (3001),
REM           cassandra-service (3002), neo4j-service (3003),
REM           mongo-express (8081)
REM   Abre los paneles en Microsoft Edge y corre el benchmark
REM   comparativo de tiempos de respuesta entre las BDs.
REM ===========================================================

set "PROY=%~dp0"
set "CASS=C:\cassandra-install\apache-cassandra-3.11.19"
set "JAVA=C:\PROGRA~1\MICROS~3\JDK-11~1.11-\bin\java.exe"
set "XAMPP=C:\xampp"
set "MONGOEXPRESS=%APPDATA%\npm\node_modules\mongo-express\app.js"
REM  Ruta de instalacion de Neo4j Community (editar segun tu equipo).
REM  Ver memoria neo4j_setup.md para la instalacion y la clave inicial.
set "NEO4J=C:\neo4j\neo4j-community-5.26.12"
REM  Neo4j 5.x requiere Java 17 o 21 (el JDK 11 de Cassandra no sirve).
set "NEO4J_JAVA=C:\Program Files\Java\jdk-17"

echo.
echo === [1/11] Preparando directorios de Cassandra ===
for %%D in (data commitlog hints saved_caches cdc_raw) do if not exist "C:\cassandra-data\v3\%%D" md "C:\cassandra-data\v3\%%D"
if not exist "C:\cassandra-data\logs" md "C:\cassandra-data\logs"

echo === [2/11] Iniciando MongoDB (servicio de Windows) ===
net start MongoDB >nul 2>&1
if "%errorlevel%"=="0" (echo   MongoDB iniciado.) else (echo   MongoDB ya estaba activo.)

echo === [3/11] Iniciando MySQL (XAMPP) ===
netstat -an | findstr ":3306" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "MySQL" /MIN "%XAMPP%\mysql_start.bat"
  echo   MySQL lanzandose...
) else (
  echo   MySQL ya estaba activo.
)

echo === [4/11] Iniciando Apache / phpMyAdmin (XAMPP) ===
netstat -an | findstr ":80 " | findstr "LISTENING" >nul
if errorlevel 1 (
  start "Apache" /MIN "%XAMPP%\apache_start.bat"
  echo   Apache lanzandose...
) else (
  echo   Apache ya estaba activo.
)

echo === [5/11] Lanzando Cassandra ===
set "CASSANDRA_HOME=%CASS%"
set "CASSANDRA_LOG_DIR=C:\cassandra-data\logs"
netstat -an | findstr ":9042" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "Cassandra" /MIN "%JAVA%" -ea -Xms512m -Xmx1024m -XX:+UseG1GC -XX:G1RSetUpdatingPauseTimePercent=5 -XX:MaxGCPauseMillis=300 -Dfile.encoding=UTF-8 -Dcassandra.jmx.local.port=7199 -Dcassandra.logdir=C:\cassandra-data\logs -Dlogback.configurationFile="%CASS%\conf\logback.xml" -cp "%CASS%\conf;%CASS%\lib\*" org.apache.cassandra.service.CassandraDaemon
  echo   Cassandra lanzandose, esperando puerto 9042...
) else (
  echo   Cassandra ya estaba activa.
)

echo === [6/11] Lanzando Neo4j ===
REM  Neo4j 5.x necesita Java 17/21. Se fija JAVA_HOME al JDK 17 para que la
REM  ventana de Neo4j (y solo procesos Java) lo use. Cassandra usa su ruta
REM  explicita %JAVA% (JDK 11) y no se ve afectada.
set "JAVA_HOME=%NEO4J_JAVA%"
if not exist "%NEO4J%\bin\neo4j.bat" goto NEO4J_MISSING
netstat -an | findstr ":7687" | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo   Neo4j ya estaba activo.
  goto NEO4J_DONE
)
start "Neo4j" /MIN "%NEO4J%\bin\neo4j.bat" console
echo   Neo4j lanzandose, esperando puerto 7687...
goto NEO4J_DONE
:NEO4J_MISSING
echo   AVISO: No se encontro Neo4j en "%NEO4J%".
echo          Edita la variable NEO4J en este .bat o instala Neo4j Community.
echo          Ver memoria neo4j_setup.md. Se continua sin recomendaciones.
:NEO4J_DONE

:WAIT_CASS
timeout /t 3 /nobreak >nul
netstat -an | findstr ":9042" | findstr "LISTENING" >nul
if errorlevel 1 goto WAIT_CASS
echo   Cassandra lista en el puerto 9042. Estabilizando (15s)...
timeout /t 15 /nobreak >nul

echo === [7/11] Inicializando keyspace de Cassandra ===
pushd "%PROY%Backend\cassandra-service"
node init-db.js
popd

echo === [8/11] Lanzando servicios Node ===
start "Backend-3000" cmd /k "cd /d "%PROY%Backend" && node app.js"
start "MongoDB-Service-3001" cmd /k "cd /d "%PROY%Backend\mongodb-service" && node server.js"
start "Cassandra-Service-3002" cmd /k "cd /d "%PROY%Backend\cassandra-service" && node server.js"
start "Neo4j-Service-3003" cmd /k "cd /d "%PROY%Backend\neo4j-service" && node server.js"
start "Mongo-Express-8081" cmd /k "set "ME_CONFIG_MONGODB_URL=mongodb://localhost:27017" && set "ME_CONFIG_BASICAUTH_USERNAME=admin" && set "ME_CONFIG_BASICAUTH_PASSWORD=pass" && node "%MONGOEXPRESS%""

echo   Esperando arranque de los servicios...
timeout /t 8 /nobreak >nul

echo === [9/11] Sembrando el grafo de conocimiento (Neo4j) ===
REM  El seed corre en su propia ventana (no bloquea la apertura de los paneles).
netstat -an | findstr ":7687" | findstr "LISTENING" >nul
if errorlevel 1 (
  echo   Neo4j no responde en :7687. Se omite el seed del grafo.
  echo   Ejecutalo luego con: cd Backend\neo4j-service ^&^& node scripts\seed.js
) else (
  echo   Lanzando seed del grafo en ventana aparte...
  start "Neo4j-Seed" cmd /k "cd /d "%PROY%Backend\neo4j-service" && node scripts\seed.js"
)

REM Asegurar que Apache (phpMyAdmin) este escuchando antes de abrir Edge
set /a APA_TRIES=0
:WAIT_APACHE
netstat -an | findstr ":80 " | findstr "LISTENING" >nul
if not errorlevel 1 goto APACHE_OK
set /a APA_TRIES+=1
if %APA_TRIES% GEQ 10 goto APACHE_FAIL
timeout /t 2 /nobreak >nul
goto WAIT_APACHE
:APACHE_FAIL
echo   AVISO: Apache no escucha en :80. El puerto 80 puede estar ocupado
echo          (IIS / "World Wide Web Publishing", Skype o VMware). phpMyAdmin no abrira.
echo          Libera el puerto 80 o cambia el Listen de Apache y reintenta.
goto APACHE_DONE
:APACHE_OK
echo   Apache / phpMyAdmin escuchando en :80.
:APACHE_DONE

echo === [10/11] Abriendo paneles en Microsoft Edge ===
start msedge "http://localhost:3000/"
timeout /t 1 /nobreak >nul
start msedge "http://localhost/phpmyadmin/"
timeout /t 1 /nobreak >nul
start msedge "http://localhost:8081/"
timeout /t 1 /nobreak >nul
start msedge "http://localhost:3002/admin"
timeout /t 1 /nobreak >nul
start msedge "http://localhost:3003/admin"
timeout /t 1 /nobreak >nul
start msedge "http://localhost:7474/"

echo === [11/11] Ejecutando benchmark comparativo de las BDs ===
echo   (se abre en ventana propia con el ranking de tiempos)
start "Benchmark-BDs" cmd /k "cd /d "%PROY%Backend\mongodb-service" && node scripts\benchmark.js"

echo.
echo ===========================================================
echo   PROYECTO MUSEO EN EJECUCION
echo -----------------------------------------------------------
echo     Pagina principal : http://localhost:3000/
echo     phpMyAdmin       : http://localhost/phpmyadmin/
echo     Mongo Express    : http://localhost:8081/   (admin/pass)
echo     Panel Cassandra  : http://localhost:3002/admin
echo     Panel Neo4j      : http://localhost:3003/admin
echo     Neo4j Browser    : http://localhost:7474/   (neo4j/museo2026)
echo -----------------------------------------------------------
echo     Login admin: admin@museo.com / admin123
echo ===========================================================
echo.
echo   Las ventanas de los servicios Node quedan abiertas con sus
echo   logs. Cerrar esas ventanas detiene cada servicio.
echo.
pause
endlocal
