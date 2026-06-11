@echo off
chcp 65001 >nul
setlocal EnableExtensions
title Museo de Arte - Lanzador

REM ===========================================================
REM   Lanzador automatico del proyecto Museo de Arte
REM   Inicia: MongoDB, MySQL, Apache, Cassandra
REM           Backend (3000), mongodb-service (3001),
REM           cassandra-service (3002), mongo-express (8081)
REM   Abre los paneles en Microsoft Edge y corre el benchmark
REM   comparativo de tiempos de respuesta entre las 3 BDs.
REM ===========================================================

set "PROY=%~dp0"
set "CASS=C:\cassandra-install\apache-cassandra-3.11.19"
set "JAVA=C:\PROGRA~1\MICROS~3\JDK-11~1.11-\bin\java.exe"
set "XAMPP=C:\xampp"
set "MONGOEXPRESS=%APPDATA%\npm\node_modules\mongo-express\app.js"

echo.
echo === [1/9] Preparando directorios de Cassandra ===
for %%D in (data commitlog hints saved_caches cdc_raw) do if not exist "C:\cassandra-data\v3\%%D" md "C:\cassandra-data\v3\%%D"
if not exist "C:\cassandra-data\logs" md "C:\cassandra-data\logs"

echo === [2/9] Iniciando MongoDB (servicio de Windows) ===
net start MongoDB >nul 2>&1
if "%errorlevel%"=="0" (echo   MongoDB iniciado.) else (echo   MongoDB ya estaba activo.)

echo === [3/9] Iniciando MySQL (XAMPP) ===
netstat -an | findstr ":3306" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "MySQL" /MIN "%XAMPP%\mysql_start.bat"
  echo   MySQL lanzandose...
) else (
  echo   MySQL ya estaba activo.
)

echo === [4/9] Iniciando Apache / phpMyAdmin (XAMPP) ===
netstat -an | findstr ":80 " | findstr "LISTENING" >nul
if errorlevel 1 (
  start "Apache" /MIN "%XAMPP%\apache_start.bat"
  echo   Apache lanzandose...
) else (
  echo   Apache ya estaba activo.
)

echo === [5/9] Lanzando Cassandra ===
set "CASSANDRA_HOME=%CASS%"
set "CASSANDRA_LOG_DIR=C:\cassandra-data\logs"
netstat -an | findstr ":9042" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "Cassandra" /MIN "%JAVA%" -ea -Xms256m -Xmx512m -XX:+UseG1GC -XX:G1RSetUpdatingPauseTimePercent=5 -XX:MaxGCPauseMillis=300 -Dfile.encoding=UTF-8 -Dcassandra.jmx.local.port=7199 -Dcassandra.logdir=C:\cassandra-data\logs -Dlogback.configurationFile="%CASS%\conf\logback.xml" -cp "%CASS%\conf;%CASS%\lib\*" org.apache.cassandra.service.CassandraDaemon
  echo   Cassandra lanzandose, esperando puerto 9042...
) else (
  echo   Cassandra ya estaba activa.
)

:WAIT_CASS
timeout /t 3 /nobreak >nul
netstat -an | findstr ":9042" | findstr "LISTENING" >nul
if errorlevel 1 goto WAIT_CASS
echo   Cassandra lista en el puerto 9042.

echo === [6/9] Inicializando keyspace de Cassandra ===
pushd "%PROY%Backend\cassandra-service"
node init-db.js
popd

echo === [7/9] Lanzando servicios Node ===
start "Backend-3000" cmd /k "cd /d "%PROY%Backend" && node app.js"
start "MongoDB-Service-3001" cmd /k "cd /d "%PROY%Backend\mongodb-service" && node server.js"
start "Cassandra-Service-3002" cmd /k "cd /d "%PROY%Backend\cassandra-service" && node server.js"
start "Mongo-Express-8081" cmd /k "set "ME_CONFIG_MONGODB_URL=mongodb://localhost:27017" && set "ME_CONFIG_BASICAUTH_USERNAME=admin" && set "ME_CONFIG_BASICAUTH_PASSWORD=pass" && node "%MONGOEXPRESS%""

echo   Esperando arranque de los servicios...
timeout /t 8 /nobreak >nul

echo === [8/9] Abriendo paneles en Microsoft Edge ===
start msedge "http://localhost:3000/"
timeout /t 1 /nobreak >nul
start msedge "http://localhost/phpmyadmin/"
timeout /t 1 /nobreak >nul
start msedge "http://localhost:8081/"
timeout /t 1 /nobreak >nul
start msedge "http://localhost:3002/admin"

echo === [9/9] Ejecutando benchmark comparativo de las 3 BDs ===
echo   (se abre en ventana propia con el ranking de tiempos)
start "Benchmark-3BDs" cmd /k "cd /d "%PROY%Backend\mongodb-service" && node scripts\benchmark.js"

echo.
echo ===========================================================
echo   PROYECTO MUSEO EN EJECUCION
echo -----------------------------------------------------------
echo     Pagina principal : http://localhost:3000/
echo     phpMyAdmin       : http://localhost/phpmyadmin/
echo     Mongo Express    : http://localhost:8081/   (admin/pass)
echo     Panel Cassandra  : http://localhost:3002/admin
echo -----------------------------------------------------------
echo     Login admin: admin@museo.com / admin123
echo ===========================================================
echo.
echo   Las ventanas de los servicios Node quedan abiertas con sus
echo   logs. Cerrar esas ventanas detiene cada servicio.
echo.
pause
endlocal
