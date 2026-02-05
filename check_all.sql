-- List all databases
SELECT datname FROM pg_database WHERE datistemplate = false;

-- List all tables in public schema
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
