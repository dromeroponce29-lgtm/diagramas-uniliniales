#!/bin/bash
# Doble-clic para abrir la app de Diagramas Unilineales.
# Arranca backend (Express :3001) + frontend (Vite :5173) y abre el navegador.

set -e

# Carpeta del proyecto (donde está este archivo)
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "==============================================="
echo "  Diagramas Unilineales — arrancando…"
echo "  Carpeta: $DIR"
echo "==============================================="
echo ""

# Si no existe node_modules en la raíz, instala dependencias (solo la 1a vez).
if [ ! -d "node_modules" ]; then
  echo "→ Primera ejecución: instalando dependencias (1-2 min)…"
  npm install
  echo ""
fi

# Verifica que el archivo .env del servidor exista y tenga las claves
if [ ! -f "apps/servidor/.env" ]; then
  echo "ATENCIÓN: falta apps/servidor/.env"
  echo "Copia apps/servidor/.env.example a apps/servidor/.env y agrega tus claves API."
  echo ""
  read -p "Presiona Enter para salir…"
  exit 1
fi

# Abre el navegador en 5 segundos (le da tiempo a Vite a arrancar)
( sleep 5 && open "http://localhost:5173" ) &

echo "→ Iniciando servidores (backend :3001 + frontend :5173)…"
echo "→ El navegador se abrirá automáticamente en unos segundos."
echo ""
echo "Para DETENER todo: presiona Ctrl+C en esta ventana."
echo ""

# Arranca ambos en paralelo (esto bloquea hasta Ctrl+C)
npm run dev
