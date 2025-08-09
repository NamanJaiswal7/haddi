# Course API Documentation

This document outlines the implemented API endpoints for the course section of the Gita Leadership Contest app.

## Base URL
```
http://localhost:4545/api/courses
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <token>
```

**Important:** Any authenticated user can access these endpoints. No role restrictions are applied.

## 1. Get Course Data
**Endpoint:** `GET /api/courses/data`

**Description:** Fetches all course data for the authenticated student including levels, lessons, videos, PDFs, quizzes, and progress.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "Student Name",
    "email": "student@example.com",
    "picture": "profile_picture_url",
    "role": "student",
    "district": "Ujjain",
    "pincode": "456001",
    "education": "high_school",
    "classLevel": "8th",
    "districtId": "district_id",
    "dob": "2005-08-01T00:00:00.000Z",
    "gender": "male",
    "lastActiveAt": "2025-08-08T10:11:03.039Z"
  },
  "courseData": {
    "currentLevel": "1",
    "levels": [
      {
        "id": "level_1",
        "title": "Introduction to Bhagavad Gita",
        "description": "Learn the basics of Bhagavad Gita and its significance",
        "level": "1",
        "isCompleted": true,
        "isCurrent": false,
        "isLocked": false,
        "totalLessons": 1,
        "completedLessons": 1,
        "totalVideos": 8,
        "completedVideos": 8,
        "totalPDFs": 3,
        "completedPDFs": 3,
        "totalQuizzes": 2,
        "completedQuizzes": 2,
        "certificateUrl": "https://example.com/certificates/level_1_cert.pdf",
        "completedAt": "2025-08-08T10:11:03.039Z"
      }
    ],
    "lessons": [
      {
        "id": "lesson_1",
        "title": "Introduction to Bhagavad Gita",
        "description": "Understanding the historical context and significance",
        "levelId": "level_1",
        "level": "1",
        "isCompleted": true,
        "order": 1,
        "duration": "45 minutes",
        "thumbnail": "https://example.com/thumbnails/lesson_1.jpg",
        "createdAt": "2025-08-08T10:11:03.039Z"
      }
    ],
    "videos": [
      {
        "id": "video_1",
        "title": "Introduction to Bhagavad Gita - Part 1",
        "description": "Historical background and context",
        "url": "https://www.youtube.com/watch?v=video_id",
        "thumbnail": "https://example.com/thumbnails/video_1.jpg",
        "levelId": "level_1",
        "lessonId": "lesson_1",
        "duration": 1800,
        "isWatched": true,
        "watchProgress": 100,
        "createdAt": "2025-08-08T10:11:03.039Z"
      }
    ],
    "pdfs": [
      {
        "id": "pdf_1",
        "title": "Bhagavad Gita - Chapter 1 Summary",
        "description": "Comprehensive summary of Chapter 1",
        "url": "https://example.com/pdfs/chapter1_summary.pdf",
        "thumbnail": "https://example.com/thumbnails/pdf_1.jpg",
        "levelId": "level_1",
        "lessonId": "lesson_1",
        "pageCount": 15,
        "isRead": true,
        "readProgress": 100,
        "createdAt": "2025-08-08T10:11:03.039Z"
      }
    ],
    "quizzes": [
      {
        "id": "quiz_1",
        "title": "Introduction Quiz",
        "description": "Test your understanding of basic concepts",
        "levelId": "level_1",
        "lessonId": "lesson_1",
        "totalQuestions": 10,
        "timeLimit": 1800,
        "passingScore": 70,
        "isCompleted": true,
        "score": 85,
        "attempts": 1,
        "completedAt": "2025-08-08T10:11:03.039Z",
        "createdAt": "2025-08-08T10:11:03.039Z"
      }
    ],
    "progress": {
      "totalLevels": 3,
      "completedLevels": 1,
      "totalLessons": 23,
      "completedLessons": 8,
      "totalVideos": 35,
      "watchedVideos": 13,
      "totalPDFs": 15,
      "readPDFs": 5,
      "totalQuizzes": 9,
      "completedQuizzes": 3,
      "overallProgress": 35,
      "earnedCertificates": [
        "https://example.com/certificates/level_1_cert.pdf"
      ]
    }
  }
}
```

## 2. Get Level Data
**Endpoint:** `GET /api/courses/level/{levelId}`

**Description:** Fetches detailed data for a specific level including all lessons, videos, PDFs, and quizzes.

**Parameters:**
- `levelId` (path): The ID of the level to fetch

**Response:** Same structure as above but filtered for the specific level.

## 3. Mark Video as Watched
**Endpoint:** `POST /api/courses/video/{videoId}/watched`

**Description:** Marks a video as watched by the student.

**Parameters:**
- `videoId` (path): The ID of the video to mark as watched

**Response:**
```json
{
  "success": true,
  "message": "Video marked as watched successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Video not found"
}
```

## 4. Mark PDF as Read
**Endpoint:** `POST /api/courses/pdf/{pdfId}/read`

**Description:** Marks a PDF as read by the student.

**Parameters:**
- `pdfId` (path): The ID of the PDF to mark as read

**Response:**
```json
{
  "success": true,
  "message": "PDF marked as read successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "PDF not found"
}
```

## 5. Submit Quiz
**Endpoint:** `POST /api/courses/quiz/{quizId}/submit`

**Description:** Submits quiz answers and returns results.

**Parameters:**
- `quizId` (path): The ID of the quiz to submit

**Request Body:**
```json
{
  "answers": {
    "question_1": "option_a",
    "question_2": "option_c",
    "question_3": "option_b",
    "question_4": "option_d",
    "question_5": "option_a"
  }
}
```

**Response:**
```json
{
  "success": true,
  "score": 85,
  "totalQuestions": 10,
  "correctAnswers": 8,
  "passingScore": 70,
  "passed": true,
  "message": "Quiz completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Quiz not found"
}
```

## 6. Mark Lesson as Completed
**Endpoint:** `POST /api/courses/lesson/{lessonId}/complete`

**Description:** Marks a lesson as completed by the student.

**Parameters:**
- `lessonId` (path): The ID of the lesson to mark as completed

**Response:**
```json
{
  "success": true,
  "message": "Lesson marked as completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Lesson not found"
}
```

## 7. Mark Level as Completed
**Endpoint:** `POST /api/courses/level/{levelId}/complete`

**Description:** Marks a level as completed and generates certificate.

**Parameters:**
- `levelId` (path): The ID of the level to mark as completed

**Response:**
```json
{
  "success": true,
  "message": "Level completed successfully",
  "certificateUrl": "https://example.com/certificates/level_2_cert.pdf"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Level not found"
}
```

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Video ID is required"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized. Please sign in again."
}
```



**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found."
}
```

**500 Server Error:**
```json
{
  "success": false,
  "message": "Server error. Please try again later."
}
```

## Implementation Details

### Database Schema Used
The implementation uses the existing Prisma schema with the following models:
- **Course**: Represents course levels
- **CourseVideo**: Video content within courses
- **CoursePDF**: PDF content within courses
- **Quiz**: Quiz content within courses
- **StudentProgress**: Tracks student progress through courses
- **VideoProgress**: Tracks video watching progress
- **PdfProgress**: Tracks PDF reading progress
- **ExamAttempt**: Tracks quiz attempt history

### Key Features Implemented

1. **Authentication**: All endpoints require valid JWT token
2. **Progress Tracking**: Maintains detailed progress for videos, PDFs, and quizzes
3. **Level Unlocking**: Only completed levels should unlock next levels
4. **Certificate Generation**: Automatically generates certificates upon level completion
5. **Data Validation**: Validates all input data and returns appropriate error messages
6. **Comprehensive Response**: Returns all necessary data for mobile app display

### Testing

The API has been tested with the following scenarios:
- ✅ Authentication with valid JWT token
- ✅ Course data retrieval (returns empty arrays when no courses exist)
- ✅ Video marking as watched (returns error for non-existent video)
- ✅ PDF marking as read (returns error for non-existent PDF)
- ✅ Quiz submission (returns error for non-existent quiz)
- ✅ Error handling for missing parameters
- ✅ Error handling for invalid resources

### Current Status

The Course API is fully implemented and functional. The endpoints are ready for use by the mobile application. When courses are added to the database, the API will return the complete course structure with progress tracking.

### Next Steps

1. **Add Sample Data**: Populate the database with sample courses, videos, PDFs, and quizzes
2. **Test with Real Data**: Test the endpoints with actual course content
3. **Mobile Integration**: Integrate with the mobile application
4. **Performance Optimization**: Add caching for frequently accessed data
5. **Security Enhancements**: Add rate limiting and input sanitization 