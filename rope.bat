@echo off
if not exist .env (
    if exist .env.example (
        echo .env not found, copying from .env.example...
        copy .env.example .env >nul
    ) else (
        echo [!] .env file not found and .env.example missing. Please create one.
        pause
        exit /b
    )
)
start "" npm run dev
pause
