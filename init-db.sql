-- Database initialization script for Haddi application
-- This script runs when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (this is handled by POSTGRES_DB env var)
-- CREATE DATABASE haddi_db;

-- Connect to the database
\c haddi_db;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create additional users/roles if needed
-- CREATE ROLE haddi_readonly WITH LOGIN PASSWORD 'readonly_password';
-- GRANT CONNECT ON DATABASE haddi_db TO haddi_readonly;
-- GRANT USAGE ON SCHEMA public TO haddi_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO haddi_readonly;

-- Set up any additional database configurations
-- ALTER DATABASE haddi_db SET timezone TO 'UTC';
-- ALTER DATABASE haddi_db SET datestyle TO 'ISO, MDY';

-- Create any additional schemas if needed
-- CREATE SCHEMA IF NOT EXISTS audit;

-- Grant permissions to the main user
GRANT ALL PRIVILEGES ON DATABASE haddi_db TO haddi_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO haddi_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO haddi_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO haddi_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO haddi_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO haddi_user; 