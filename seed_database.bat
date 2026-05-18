@echo off
chcp 65001 >nul
echo ===============================================
echo  Initialisation de la base DeliverMap
echo  (creation des comptes admin, clients, etc.)
echo ===============================================
cd /d %~dp0backend
echo.
echo [1/3] Application des migrations...
python manage.py makemigrations
python manage.py migrate
echo.
echo [2/3] Creation des comptes de test (admin, clients, fondateurs, transporteurs)...
python manage.py seed_delivermap
echo.
echo [3/3] Comptes disponibles :
echo   -----------------------------------------
echo   ADMIN        : admin / admin2025
echo   CLIENT       : ibrahim_casa / client2025
echo   FONDATEUR    : (voir sortie ci-dessus) / fondateur2025
echo   TRANSPORTEUR : (voir sortie ci-dessus) / driver2025
echo   -----------------------------------------
echo.
echo Initialisation terminee !
pause
