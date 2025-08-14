# Mobile App API Implementation

This document summarizes the implementation of the mobile app APIs for the course management system.

## Overview

The mobile app APIs provide a comprehensive solution for delivering course content with the following features:

1. **Course Levels** - Progressive learning with multiple levels
2. **Video Content** - YouTube iframe integration with progress tracking
3. **PDF Content** - Downloadable study materials with read tracking
4. **Quiz System** - 25 questions with 15-minute time limits
5. **Scheduling** - Level unlock schedules and quiz validity periods
6. **Progress Tracking** - Comprehensive progress monitoring
7. **Certificates** - Automatic certificate generation for completed levels

## Key Features Implemented

### 1. Course Structure
- **Levels**: Multiple course levels with progressive unlocking
- **Lessons**: Content organized into lessons within each level
- **Videos**: YouTube iframe videos with progress tracking
- **PDFs**: Downloadable study materials
- **Quizzes**: Assessment with time limits and scoring

### 2. Scheduling System
- **Level Schedules**: Control when levels become available
- **Quiz Validity**: Set time windows for quiz attempts
- **Countdown Messages**: Real-time countdown for unlocks and validity
- **Result Announcement**: Automatic calculation of result dates

### 3. Progress Tracking
- **Video Progress**: Track watch progress and completion
- **PDF Progress**: Track read progress and completion
- **Quiz Progress**: Track attempts, scores, and completion
- **Overall Progress**: Calculate completion percentages

### 4. Mobile App Features
- **Authentication**: JWT-based authentication
- **Offline Support**: Cache course data for offline viewing
- **Push Notifications**: For level unlocks and quiz availability
- **Real-time Updates**: Progress synchronization
- **Certificate Downloads**: PDF certificate generation

## API Endpoints

### Core Endpoints
1. `GET /api/courses` - Get all course data
2. `POST /api/courses/video/{id}/watch` - Mark video as watched
3. `POST /api/courses/pdf/{id}/read` - Mark PDF as read
4. `POST /api/courses/quiz/{id}/submit` - Submit quiz answers
5. `POST /api/courses/lesson/{id}/complete` - Mark lesson complete
6. `POST /api/courses/level/{id}/complete` - Mark level complete
7. `GET /api/courses/level/{id}` - Get specific level data

### Request/Response Examples

#### Get Course Data
```bash
curl -H "Authorization: Bearer <token>" http://localhost:4545/api/courses
```

#### Mark Video as Watched
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"watchProgress": 100}' \
  http://localhost:4545/api/courses/video/<videoId>/watch
```

#### Submit Quiz
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"answers": {"q1": 1, "q2": 2}, "timeSpent": 900}' \
  http://localhost:4545/api/courses/quiz/<quizId>/submit
```

## Database Schema

### Core Models
- `Course` - Main course structure
- `CourseVideo` - Video content with iframe support
- `CoursePDF` - PDF content
- `Quiz` - Quiz structure with question banks
- `Question` - Individual quiz questions

### Progress Tracking
- `VideoProgress` - Track video watching
- `PdfProgress` - Track PDF reading
- `ExamAttempt` - Track quiz attempts
- `StudentProgress` - Track overall course progress

### Scheduling
- `LevelSchedule` - Control level unlock times
- `QuizValidity` - Control quiz validity periods

## Implementation Details

### 1. Course Controller (`src/controllers/courseController.ts`)
- Enhanced `getCourseData()` with scheduling and validity logic
- Updated progress tracking functions
- Added quiz scoring with real answers
- Implemented certificate generation

### 2. Routes (`src/routes/course.ts`)
- Updated endpoints to match mobile app specification
- Added proper authentication middleware
- Implemented consistent error handling

### 3. Database Integration
- Leveraged existing Prisma models
- Added scheduling and validity queries
- Implemented progress tracking

### 4. Response Format
- Consistent JSON response structure
- Comprehensive progress information
- Scheduling and validity messages
- Error handling with proper status codes

## Testing

### Automated Tests
Run the test script to verify API functionality:

```bash
npm run test:mobile
```

### Manual Testing
Use the provided curl commands or tools like Postman to test individual endpoints.

## Mobile App Integration

### 1. Authentication
- Use JWT tokens for all requests
- Include token in Authorization header
- Handle token refresh when needed

### 2. Data Synchronization
- Cache course data locally
- Sync progress changes to server
- Handle offline/online scenarios

### 3. Real-time Features
- Implement countdown timers for unlocks
- Show validity periods for quizzes
- Display progress percentages

### 4. User Experience
- Show unlock messages and countdowns
- Display validity messages for quizzes
- Provide certificate download links
- Show result announcement dates

## Configuration

### Environment Variables
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - JWT signing secret
- `PORT` - Server port (default: 4545)

### Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database
npm run seed
```

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker
```bash
docker-compose up -d
```

## Security Considerations

1. **Authentication**: JWT tokens with proper expiration
2. **Authorization**: Role-based access control
3. **Input Validation**: Request body validation
4. **Error Handling**: Secure error messages
5. **Rate Limiting**: Implement API rate limiting
6. **CORS**: Configure CORS for mobile app domains

## Performance Optimization

1. **Database Queries**: Optimized with proper indexing
2. **Caching**: Implement Redis for frequently accessed data
3. **Pagination**: Add pagination for large datasets
4. **Compression**: Enable gzip compression
5. **CDN**: Use CDN for static assets

## Monitoring and Logging

1. **Request Logging**: All API requests are logged
2. **Error Tracking**: Comprehensive error logging
3. **Performance Monitoring**: Track response times
4. **User Analytics**: Track user engagement

## Future Enhancements

1. **Push Notifications**: Implement push notification service
2. **Offline Sync**: Enhanced offline synchronization
3. **Analytics Dashboard**: Admin analytics dashboard
4. **Content Management**: Admin content management interface
5. **Multi-language Support**: Internationalization
6. **Accessibility**: WCAG compliance features

## Support

For questions or issues:
1. Check the API documentation
2. Review the test scripts
3. Check server logs for errors
4. Verify database connectivity
5. Test with provided curl commands

## Conclusion

The mobile app APIs provide a robust foundation for delivering course content with advanced features like scheduling, progress tracking, and certificate generation. The implementation follows best practices for security, performance, and maintainability. 