-- YugabyteDB Production Initialization Script
-- This script creates the user and database for the Haddi application in production

-- Create the application user with strong password
CREATE USER haddi_user WITH PASSWORD 'haddi_prod_password';

-- Create the application database
CREATE DATABASE haddi_db OWNER haddi_user;

-- Grant necessary permissions to the application user
GRANT ALL PRIVILEGES ON DATABASE haddi_db TO haddi_user;

-- Connect to the application database
\c haddi_db;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO haddi_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO haddi_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO haddi_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO haddi_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO haddi_user;

-- Create additional indexes for better performance
-- (These will be created by Prisma migrations, but you can add custom ones here)

-- Set up connection limits and other security settings
ALTER USER haddi_user CONNECTION LIMIT 100;
ALTER USER haddi_user VALID UNTIL 'infinity';

-- Create a read-only user for analytics/monitoring (optional)
CREATE USER haddi_readonly WITH PASSWORD 'readonly_prod_password';
GRANT CONNECT ON DATABASE haddi_db TO haddi_readonly;
GRANT USAGE ON SCHEMA public TO haddi_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO haddi_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO haddi_readonly;

-- Log the completion
SELECT 'YugabyteDB production initialization completed successfully' as status; 