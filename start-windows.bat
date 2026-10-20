@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Can cai Python 3 tu https://www.python.org/downloads/
  pause
  exit /b 1
)
if not exist .venv\Scripts\python.exe py -3 -m venv .venv
if errorlevel 1 goto :failed
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto :failed
start "" http://127.0.0.1:8000
.venv\Scripts\python.exe server.py
if errorlevel 1 goto :failed
exit /b 0
:failed
echo Khong khoi dong duoc. Xem thong bao loi phia tren.
pause
exit /b 1
