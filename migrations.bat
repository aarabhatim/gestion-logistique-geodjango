@echo off
chcp 65001 >nul
echo ===============================================
echo    Application des migrations Django
echo ===============================================
cd /d %~dp0backend
python manage.py makemigrations
python manage.py migrate
echo.
echo Migrations appliquees.
pause
