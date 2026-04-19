$root = Split-Path -Parent $PSScriptRoot

Write-Host "Local setup check for AI-Powered Team Task Intelligence System"
Write-Host ""

$paths = @(
  "backend\package.json",
  "backend\.env.example",
  "database\schema.sql",
  "data\dataset.csv",
  "ml-service\app.py",
  "ml-service\train_model.py",
  "frontend\index.html"
)

foreach ($relativePath in $paths) {
  $fullPath = Join-Path $root $relativePath
  if (Test-Path $fullPath) {
    Write-Host "[OK] Found $relativePath"
  } else {
    Write-Host "[MISSING] $relativePath"
  }
}

Write-Host ""

try {
  $backendHealth = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 3
  Write-Host "[OK] Backend health:" ($backendHealth | ConvertTo-Json -Compress)
} catch {
  Write-Host "[WARN] Backend is not responding on http://localhost:3000/health"
}

try {
  $mlHealth = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 3
  Write-Host "[OK] ML service health:" ($mlHealth | ConvertTo-Json -Compress)
} catch {
  Write-Host "[WARN] ML service is not responding on http://localhost:5000/health"
}
