@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  echo Open http://localhost:8000/ and http://localhost:8000/tests/
  py -m http.server 8000
  goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
  echo Open http://localhost:8000/ and http://localhost:8000/tests/
  python -m http.server 8000
  goto :eof
)
echo Python was not found. Install Python or use GitHub Pages.
pause
