# Development Setup with Hot Reloading

This guide explains how to set up and use the hot reloading development environment for the Haddi project.

## 🚀 Quick Start

### 1. Start Development Environment
```bash
# Start all services (database, redis, app) with hot reloading
npm run docker:dev

# Or build and start (first time or after Dockerfile changes)
npm run docker:dev:build
```

### 2. Stop Development Environment
```bash
# Stop all services
npm run docker:dev:down
```

## 🔥 Hot Reloading Features

### What Gets Hot Reloaded:
- ✅ **TypeScript files** in `src/` directory
- ✅ **Prisma schema** changes in `prisma/` directory
- ✅ **JSON configuration** files
- ✅ **Package.json** changes

### What Doesn't Get Hot Reloaded:
- ❌ **Dependencies** (need to rebuild container)
- ❌ **Dockerfile** changes (need to rebuild container)
- ❌ **Environment variables** (need to restart container)

## 📁 File Structure for Development

```
haddi/
├── src/                    # Source code (hot reloaded)
├── prisma/                 # Database schema (hot reloaded)
├── docker-compose.dev.yml  # Development compose file
├── Dockerfile.dev         # Development Dockerfile
├── nodemon.json           # Hot reloading configuration
└── package.json           # Scripts and dependencies
```

## 🛠️ Available Commands

### Development Commands
```bash
# Start development environment
npm run docker:dev

# Build and start (after Dockerfile changes)
npm run docker:dev:build

# Stop development environment
npm run docker:dev:down

# View logs
npm run docker:dev:logs

# Restart only the app container
npm run docker:dev:restart
```

### Database Commands
```bash
# Push schema changes to database
npm run docker:db:push

# Run database migrations
npm run docker:db:migrate

# Seed the database
npm run docker:db:seed

# Open Prisma Studio
npm run docker:db:studio
```

### Production Commands
```bash
# Start production environment
npm run docker:prod

# Build and start production
npm run docker:prod:build

# Stop production environment
npm run docker:down
```

## 🔄 How Hot Reloading Works

1. **Volume Mounts**: Your local `src/` and `prisma/` directories are mounted into the container
2. **Nodemon**: Watches for file changes and automatically restarts the application
3. **Database Persistence**: Database data is stored in Docker volumes, so it persists between restarts
4. **Prisma Client**: Automatically regenerated when schema changes are detected

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if database is running
docker ps | grep yugabytedb

# Restart database
docker-compose -f docker-compose.dev.yml restart yugabytedb
```

### Hot Reloading Not Working
```bash
# Check if nodemon is running
docker-compose -f docker-compose.dev.yml logs app

# Restart the app container
npm run docker:dev:restart
```

### Schema Changes Not Applied
```bash
# Push schema changes
npm run docker:db:push

# Or regenerate Prisma client
docker-compose -f docker-compose.dev.yml exec app npx prisma generate
```

### Port Conflicts
If port 4545 is already in use:
```bash
# Check what's using the port
lsof -i :4545

# Kill the process or change the port in docker-compose.dev.yml
```

## 📝 Development Workflow

1. **Start Development Environment**:
   ```bash
   npm run docker:dev:build
   ```

2. **Seed Database** (first time only):
   ```bash
   npm run docker:db:seed
   ```

3. **Make Code Changes**:
   - Edit files in `src/` directory
   - Changes are automatically detected and app restarts

4. **Database Schema Changes**:
   - Edit `prisma/schema.prisma`
   - Run `npm run docker:db:push` to apply changes

5. **View Logs**:
   ```bash
   npm run docker:dev:logs
   ```

6. **Stop Environment**:
   ```bash
   npm run docker:dev:down
   ```

## 🎯 Benefits

- ✅ **No data loss**: Database persists between restarts
- ✅ **Fast development**: No need to rebuild containers for code changes
- ✅ **Real-time feedback**: See changes immediately
- ✅ **Separate environments**: Development and production are isolated
- ✅ **Easy debugging**: Access to logs and database tools

## 🔧 Configuration Files

### nodemon.json
Configures what files to watch and how to restart the application.

### docker-compose.dev.yml
Development-specific Docker Compose configuration with volume mounts for hot reloading.

### Dockerfile.dev
Development Dockerfile optimized for hot reloading (doesn't copy source code). 