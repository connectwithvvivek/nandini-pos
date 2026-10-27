@echo off
echo ===================================================
echo     Nandini Parlour POS - Windows Setup Script
echo ===================================================

cd /d "%~dp0"

echo.
echo [1/4] Setting up Backend Python Virtual Environment...
cd backend
if not exist venv (
    python -m venv venv
    if errorlevel 1 (
        py -3 -m venv venv
    )
)

if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo Warning: Virtual environment activation script not found, proceeding with system python.
)

echo.
echo [2/4] Installing Backend Dependencies...
pip install -r requirements.txt

if not exist .env (
    if exist .env.example (
        copy .env.example .env
        echo Created backend/.env from .env.example. Please review and update database settings.
    )
)

echo.
echo [3/4] Running Migrations and Seeding Data...
python manage.py migrate
python manage.py seed_data

echo.
echo [4/4] Setting up Frontend...
cd ..\frontend
call npm install --legacy-peer-deps

echo.
echo ===================================================
echo Setup complete!
echo To run backend:  cd backend ^&^& python manage.py runserver
echo To run frontend: cd frontend ^&^& npm run dev
echo ===================================================
pause

