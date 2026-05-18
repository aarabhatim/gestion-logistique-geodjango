@echo off
chcp 65001 >nul
echo ===============================================
echo    LogisTrack - Lancement complet
echo ===============================================
echo.

echo [1/4] Migrations + seed (creation des comptes)...
start "INIT-DB" cmd /k "cd /d %~dp0backend && pip install -r requirements.txt && python manage.py makemigrations && python manage.py migrate && python manage.py seed_delivermap && echo. && echo === COMPTES CREES === && echo Admin       : admin / admin2025 && echo Client      : ibrahim_casa / client2025 && echo Fondateur   : (voir liste ci-dessus) / fondateur2025 && echo Transporteur: (voir liste) / driver2025 && echo Cette fenetre peut etre fermee. && pause"

echo [2/4] Attente initialisation (15 secondes)...
timeout /t 15 /nobreak >nul

echo [3/4] Lancement du Backend Django (runserver)...
start "BACKEND" cmd /k "cd /d %~dp0backend && python manage.py runserver 0.0.0.0:8000"

echo [4/4] Lancement du Frontend React (Vite)...
start "FRONTEND" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

echo.
echo ===============================================
echo  Serveurs lances !
echo   Backend : http://localhost:8000/api/
echo   Admin   : http://localhost:8000/admin/
echo   Frontend: http://localhost:5173
echo.
echo  Comptes de test :
echo   - admin / admin2025
echo   - ibrahim_casa / client2025
echo ===============================================
pause
