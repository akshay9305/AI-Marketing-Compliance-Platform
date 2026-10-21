# Local development startup script for Marketing Compliance Platform
# This sets the environment variables and starts the FastAPI app

Write-Host "Starting Marketing Compliance Platform..." -ForegroundColor Green

# Set the main configuration
$env:APP_CONFIG = "development.env"
$env:APP_CONFIG_PATH = "config"

# Load environment variables from development.env
$envFile = "config/development.env"
if (Test-Path $envFile) {
    Write-Host "Loading environment variables from $envFile..." -ForegroundColor Cyan
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            if ($name -like "*KEY*" -or $name -like "*PASSWORD*" -or $name -like "*SECRET*") {
                Write-Host "  $name = [MASKED]" -ForegroundColor Gray
            } else {
                Write-Host "  $name = $value" -ForegroundColor Gray
            }
        }
    }
} else {
    Write-Host "Warning: $envFile not found!" -ForegroundColor Red
}

Write-Host "Configuration loaded:" -ForegroundColor Yellow
Write-Host "  APP_CONFIG: $env:APP_CONFIG" -ForegroundColor Yellow
Write-Host "  AZURE_OPENAI_ENDPOINT: $env:AZURE_OPENAI_ENDPOINT" -ForegroundColor Yellow
Write-Host "  AZURE_OPENAI_DEPLOYMENT_NAME: $env:AZURE_OPENAI_DEPLOYMENT_NAME" -ForegroundColor Yellow
Write-Host "  AZURE_OPENAI_API_KEY: [MASKED]" -ForegroundColor Yellow

Write-Host "Starting FastAPI server on http://localhost:8000..." -ForegroundColor Green

# Start the FastAPI application with explicit environment variable inheritance
$env:PYTHONPATH = "."
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
