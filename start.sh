#!/usr/bin/env bash
cd "$(dirname "$0")"

PYTHON_BIN=""

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
elif [ -f "/c/Users/ImaadIrshad/AppData/Local/Programs/Python/Python312/python.exe" ]; then
  PYTHON_BIN="/c/Users/ImaadIrshad/AppData/Local/Programs/Python/Python312/python.exe"
elif [ -f "C:/Users/ImaadIrshad/AppData/Local/Programs/Python/Python312/python.exe" ]; then
  PYTHON_BIN="C:/Users/ImaadIrshad/AppData/Local/Programs/Python/Python312/python.exe"
fi

if [ -z "$PYTHON_BIN" ]; then
  echo "Python was not found."
  echo "Expected one of: python3, python, /c/Users/ImaadIrshad/AppData/Local/Programs/Python/Python312/python.exe, or C:/Users/ImaadIrshad/AppData/Local/Programs/Python/Python312/python.exe"
  exit 1
fi

for PORT in 8766 8767 8768 3000; do
  if ! lsof -i ":$PORT" >/dev/null 2>&1; then
    echo "IBM WRLD → http://localhost:${PORT}/"
    echo "Press Ctrl+C to stop."
    exec "$PYTHON_BIN" -m http.server "$PORT"
  fi
done

echo "No free port (tried 8766–8768, 3000). Stop other servers and retry."
exit 1

