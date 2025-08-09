# Production Database Sync Guide

This guide explains how to sync your production database with the latest schema changes and seed data.

## 🚀 Quick Sync Commands

### Option 1: Using the dedicated script (Recommended)
```bash
./scripts/sync-prod-db.sh
```

### Option 2: Using npm scripts
```bash
# Sync database schema, generate client, and seed data
npm run docker:prod:db:sync

# Or run the script directly
npm run docker:prod:db:sync:script
```

### Option 3: Manual commands
```bash
# 1. Sync database schema (for YugabyteDB compatibility)
docker-compose exec app npx prisma db push

# 2. Generate Prisma client
docker-compose exec app npx prisma generate

# 3. Seed database with initial data
docker-compose exec app npm run seed
```

## 📋 What Gets Synced

### Database Schema
- All tables from your Prisma schema
- Indexes and constraints
- Compatible with YugabyteDB

### Seed Data
- **55 districts of Madhya Pradesh** (with Hindi and English names)
- **Master Administrator user**
  - Email: `master@haddi.com`
  - Password: `admin123`

## 🔄 When to Run

Run this sync when you:
- Deploy new code with database schema changes
- Need to reset/repopulate the production database
- Want to ensure production has the latest seed data

## ⚠️ Important Notes

1. **Backup First**: Always backup your production database before syncing
2. **Downtime**: The sync process may cause brief downtime
3. **Data Loss**: Running seed will clear existing data and recreate it
4. **Environment**: Ensure you're running this on the production environment

## 🚨 Troubleshooting

### If containers aren't running:
```bash
docker-compose up -d
```

### If health check fails:
```bash
docker-compose logs app
```

### If you need to check current database state:
```bash
docker-compose exec app npx prisma studio
```

## 📚 Related Files

- `scripts/sync-prod-db.sh` - Main sync script
- `scripts/deploy.sh` - Production deployment (includes sync)
- `prisma/seed.ts` - Database seeding logic
- `docker-compose.yml` - Production configuration 