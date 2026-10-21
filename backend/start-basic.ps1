# Simple startup script without AI credentials
# Use this to test the basic platform functionality

Write-Host "Starting Marketing Compliance Platform (Basic Mode)..." -ForegroundColor Green

# Set the main configuration
$env:APP_CONFIG = "development.env"
$env:APP_CONFIG_PATH = "config"

# Minimal configuration - AI features will use fallback
$env:LLM_APP_NAME = "marketing-compliance-platform"
$env:LLM_MODEL = "gpt-4o-2024-11-20"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  APP_CONFIG: $env:APP_CONFIG" -ForegroundColor Yellow
Write-Host "  Mode: Basic (AI fallback enabled)" -ForegroundColor Yellow

Write-Host "Starting FastAPI server on http://localhost:8000..." -ForegroundColor Green
Write-Host "Note: AI features will use fallback generation until OpenAI API key is configured" -ForegroundColor Cyan

# Start the FastAPI application
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000