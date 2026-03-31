#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${1:-findapp}"
DB_USER="${2:-findapp_user}"
DB_PASSWORD="${3:-change_me_password}"

export DEBIAN_FRONTEND=noninteractive

apt update
apt install -y postgresql postgresql-contrib

systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql <<SQL
do \$\$
begin
  if not exists (select from pg_roles where rolname = '${DB_USER}') then
    create role ${DB_USER} login password '${DB_PASSWORD}';
  end if;
end
\$\$;
SQL

sudo -u postgres psql <<SQL
do \$\$
begin
  if not exists (select from pg_database where datname = '${DB_NAME}') then
    create database ${DB_NAME} owner ${DB_USER};
  end if;
end
\$\$;
SQL

echo "PostgreSQL ready"
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"
