#!/usr/bin/env bash
# Recreates the E2E database from the committed migrations and dev seed.
set -euo pipefail
DB_URL="${E2E_DATABASE_URL:-postgresql://serve:serve_dev_pw@localhost:5432/serve_e2e}"
psql "${DB_URL%/*}/postgres" -qc "DROP DATABASE IF EXISTS serve_e2e WITH (FORCE)" -c "CREATE DATABASE serve_e2e"
cd "$(dirname "$0")/../backend"
DATABASE_URL="$DB_URL" npx prisma migrate deploy
DATABASE_URL="$DB_URL" npx prisma db seed
