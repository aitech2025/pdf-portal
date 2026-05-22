@echo off
echo === PDF Portal Docker Diagnostics ===
echo.

REM Check Docker
echo 1. Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    X Docker not found!
    echo    Install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)
echo    OK Docker is installed

echo.

REM Check Docker daemon
echo 2. Checking Docker daemon...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo    X Docker daemon is NOT running!
    echo    Start Docker Desktop and wait for it to fully start
    pause
    exit /b 1
)
echo    OK Docker daemon is running

echo.

REM Check containers
echo 3. Checking containers...
docker-compose ps

echo.

REM Check logs
echo 4. Recent logs:
echo.
echo --- Web Logs ---
docker-compose logs web --tail=10
echo.
echo --- API Logs ---
docker-compose logs api --tail=10

echo.
echo === Diagnostics Complete ===
echo.
echo If containers are not running, run:
echo   docker-compose up -d
echo.
echo Then access:
echo   Frontend: http://localhost
echo   API: http://localhost:8000
echo.
pause
