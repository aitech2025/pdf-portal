# Docker Diagnostics Script
Write-Host "=== PDF Portal Docker Diagnostics ===" -ForegroundColor Cyan
Write-Host ""

# Check Docker version
Write-Host "1. Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "   ✓ Docker installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Docker not found!" -ForegroundColor Red
    Write-Host "   Install Docker Desktop from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if Docker daemon is running
Write-Host "2. Checking Docker daemon..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "   ✓ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Docker daemon is NOT running!" -ForegroundColor Red
    Write-Host "   → Start Docker Desktop and wait for it to fully start" -ForegroundColor Yellow
    Write-Host "   → Look for Docker icon in system tray (should be steady, not animated)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check container status
Write-Host "3. Checking container status..." -ForegroundColor Yellow
try {
    $containers = docker-compose ps --format json | ConvertFrom-Json
    
    if ($containers.Count -eq 0) {
        Write-Host "   ✗ No containers running!" -ForegroundColor Red
        Write-Host "   → Run: docker-compose up -d" -ForegroundColor Yellow
    } else {
        foreach ($container in $containers) {
            $status = $container.State
            if ($status -eq "running") {
                Write-Host "   ✓ $($container.Service): Running" -ForegroundColor Green
            } else {
                Write-Host "   ✗ $($container.Service): $status" -ForegroundColor Red
            }
        }
    }
} catch {
    Write-Host "   ✗ Cannot check containers" -ForegroundColor Red
    Write-Host "   → Run: docker-compose up -d" -ForegroundColor Yellow
}

Write-Host ""

# Check ports
Write-Host "4. Checking port availability..." -ForegroundColor Yellow

# Check port 80
$port80 = Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue
if ($port80) {
    Write-Host "   ⚠ Port 80 is in use by: $($port80.OwningProcess)" -ForegroundColor Yellow
    $process = Get-Process -Id $port80.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "     Process: $($process.ProcessName)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✓ Port 80 is available" -ForegroundColor Green
}

# Check port 8000
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port8000) {
    Write-Host "   ✓ Port 8000 is in use (API should be running)" -ForegroundColor Green
} else {
    Write-Host "   ✗ Port 8000 is not in use (API not running)" -ForegroundColor Red
}

Write-Host ""

# Test API endpoint
Write-Host "5. Testing API endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✓ API is responding (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ✗ API is not responding" -ForegroundColor Red
    Write-Host "   → Check: docker-compose logs api" -ForegroundColor Yellow
}

Write-Host ""

# Test web endpoint
Write-Host "6. Testing web endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost/" -TimeoutSec 5 -UseBasicParsing
    Write-Host "   ✓ Web is responding (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Web is not responding" -ForegroundColor Red
    Write-Host "   → Check: docker-compose logs web" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Diagnostics Complete ===" -ForegroundColor Cyan
Write-Host ""

# Provide recommendations
Write-Host "Recommendations:" -ForegroundColor Cyan

$allGood = $true

# Check if Docker is running
try {
    docker ps | Out-Null
} catch {
    Write-Host "  1. Start Docker Desktop" -ForegroundColor Yellow
    $allGood = $false
}

# Check if containers are running
try {
    $containers = docker-compose ps --format json | ConvertFrom-Json
    if ($containers.Count -eq 0) {
        Write-Host "  2. Start containers: docker-compose up -d" -ForegroundColor Yellow
        $allGood = $false
    }
} catch {
    Write-Host "  2. Start containers: docker-compose up -d" -ForegroundColor Yellow
    $allGood = $false
}

if ($allGood) {
    Write-Host "  ✓ Everything looks good!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access your application at:" -ForegroundColor Cyan
    Write-Host "  Frontend: http://localhost" -ForegroundColor White
    Write-Host "  API: http://localhost:8000" -ForegroundColor White
    Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Run these commands to fix:" -ForegroundColor Cyan
    Write-Host "  docker-compose down" -ForegroundColor White
    Write-Host "  docker-compose up -d" -ForegroundColor White
    Write-Host "  docker-compose logs -f" -ForegroundColor White
}

Write-Host ""
