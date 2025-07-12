-- YugabyteDB initialization script
-- This script creates the user and database for the Haddi application

-- Create the user
CREATE USER haddi_user WITH PASSWORD 'haddi_password';

-- Create the database
CREATE DATABASE haddi_db OWNER haddi_user;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE haddi_db TO haddi_user;

-- Connect to the new database and grant schema permissions
\c haddi_db;
GRANT ALL ON SCHEMA public TO haddi_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO haddi_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO haddi_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO haddi_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO haddi_user; 