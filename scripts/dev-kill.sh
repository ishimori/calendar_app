#!/bin/bash
# ポート 3000 (Hono) / 5173 (Vite) を使っているプロセスを全てkill

kill_port() {
  local port=$1
  local pids=$(netstat -ano 2>/dev/null | grep ":${port} " | grep LISTENING | awk '{print $5}' | sort -u)

  if [ -z "$pids" ]; then
    echo "  port ${port}: no process found"
    return
  fi

  for pid in $pids; do
    if [ "$pid" != "0" ]; then
      taskkill //F //PID "$pid" > /dev/null 2>&1 && \
        echo "  port ${port}: killed PID ${pid}" || \
        echo "  port ${port}: failed to kill PID ${pid}"
    fi
  done
}

echo "Killing dev servers..."
kill_port 3000
kill_port 5173
echo "Done."
