#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  echo 'Open http://localhost:8000/ and http://localhost:8000/tests/'
  exec python3 -m http.server 8000
elif command -v python >/dev/null 2>&1; then
  echo 'Open http://localhost:8000/ and http://localhost:8000/tests/'
  exec python -m http.server 8000
else
  echo 'Python was not found. Install Python or use GitHub Pages.' >&2
  exit 1
fi
