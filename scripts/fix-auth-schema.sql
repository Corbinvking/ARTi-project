-- Fix auth schema for Supabase production
-- Run this to create the missing auth schema

-- Create the auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT ALL ON SCHEMA auth TO postgres;

-- Create auth extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create basic auth tables that GoTrue expects
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    "version" varchar(255) NOT NULL,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY ("version")
);

-- Insert initial migration
INSERT INTO auth.schema_migrations ("version") VALUES ('00000000000000') ON CONFLICT DO NOTHING;

-- Create auth functions
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
  SELECT nullif(current_setting('request.jwt.claim.role', true), '')::text;
$$ LANGUAGE sql STABLE;
