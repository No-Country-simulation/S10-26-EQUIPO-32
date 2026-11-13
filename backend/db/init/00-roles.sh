#!/bin/sh
# Shim de roles de Supabase (feature 006): anon, authenticated y service_role como roles SIN login, más un rol de
# login para el backend que es miembro de service_role. La contraseña llega por entorno y nunca se escribe en un archivo.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v backend_pw="$BACKEND_DB_PASSWORD" <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
-- El login del backend no es dueño de nada ni superusuario: solo hereda service_role (y no salta el RLS).
CREATE ROLE backend_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'backend_pw';
GRANT service_role TO backend_service;
SQL
