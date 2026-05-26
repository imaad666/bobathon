#!/usr/bin/env bash
cd "$(dirname "$0")"
for PORT in 8766 8767 8768 3000; do
  if ! lsof -i ":$PORT" >/dev/null 2>&1; then
    echo "IBM Global → http://localhost:${PORT}/"
    echo "Press Ctrl+C to stop."
    exec python3 -m http.server "$PORT"
  fi
done
echo "No free port (tried 8766–8768, 3000). Stop other servers and retry."
exit 1
