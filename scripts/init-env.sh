#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -f .env ]; then
  echo '.env already exists; leaving it unchanged.'
  exit 0
fi
command -v openssl >/dev/null 2>&1 || { echo 'Install OpenSSL or fill .env manually from .env.example.' >&2; exit 1; }
umask 077
{
  printf 'POSTGRES_DB=airline\nPOSTGRES_USER=airline\nPOSTGRES_PORT=5432\nSERVER_PORT=8080\n'
  printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)"
  printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 32)"
} > .env
echo 'Created .env with random local database and JWT secrets. Keep this file private.'
