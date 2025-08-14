# Haddi - Educational Platform

A comprehensive educational platform built with Node.js, TypeScript, Prisma, and PostgreSQL (YugabyteDB).

## Features

- User authentication with Google OAuth
- Course management system
- Video and PDF content delivery
- Quiz and assessment system
- Event management
- Notification system
- Mobile app API support
- District-based user management

## Prerequisites

- Node.js (v16 or higher)
- Docker and Docker Compose
- Git

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/NamanJaiswal7/haddi.git
cd haddi
```

### 2. Set up environment variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://yugabyte:yugabyte@localhost:5433/yugabyte

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_here

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# AWS Configuration (for S3 uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket_name

# Application Configuration
NODE_ENV=development
PORT=4545
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development environment

```bash
# Start database and Redis
docker-compose -f docker-compose.dev.yml up -d yugabytedb yugabytedb-init redis

# Wait for database to be ready, then run migrations
npx prisma migrate dev

# Start the application
npm run dev
```

### 5. Access the application

- API: http://localhost:4545
- Database: localhost:5433
- Redis: localhost:6379

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application
- `npm start` - Start production server
- `npm run test` - Run tests
- `npx prisma studio` - Open Prisma Studio for database management

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## Production Deployment

See [AWS-DEPLOYMENT-GUIDE.md](./AWS-DEPLOYMENT-GUIDE.md) for detailed production deployment instructions.

## API Documentation

- [Mobile App API Documentation](./MOBILE_APP_API_DOCUMENTATION.md)
- [Course API Documentation](./COURSE_API_DOCUMENTATION.md)
- [Google OAuth API Documentation](./GOOGLE_OAUTH_API_DOCUMENTATION.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue on GitHub. 