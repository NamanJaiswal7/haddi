# Mobile App API Documentation

This document describes the APIs implemented for the mobile application that provides course content, videos, PDFs, and quizzes with scheduling and validity features.

## Base URL
```
http://localhost:4545/api
```

## Authentication
All endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## API Endpoints

### 1. Get Course Data

**Endpoint:** `GET /courses`

**Description:** Fetches all course data for the authenticated student including levels, lessons, videos, PDFs, quizzes, and progress with scheduling and validity information.

**Response Structure:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "Student Name",
    "email": "student@example.com",
    "picture": "https://example.com/avatar.jpg",
    "role": "student",
    "district": "Ujjain",
    "pincode": "456001",
    "education": "High School",
    "classLevel": "10th",
    "districtId": "1",
    "dob": "2005-01-15T00:00:00.000Z",
    "gender": "Male",
    "lastActiveAt": "2024-01-15T10:30:00.000Z"
  },
  "courseData": {
    "currentLevel": "2",
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
        "completedAt": "2024-01-10T10:30:00.000Z",
        "unlockSchedule": null,
        "validityEndDate": null,
        "isUnlocked": true,
        "isExpired": false,
        "unlockMessage": "",
        "validityMessage": ""
      },
      {
        "id": "level_2",
        "title": "Advanced Gita Studies",
        "description": "Deep dive into advanced concepts and teachings",
        "level": "2",
        "isCompleted": false,
        "isCurrent": true,
        "isLocked": false,
        "totalLessons": 1,
        "completedLessons": 0,
        "totalVideos": 12,
        "completedVideos": 5,
        "totalPDFs": 5,
        "completedPDFs": 2,
        "totalQuizzes": 3,
        "completedQuizzes": 1,
        "certificateUrl": "",
        "completedAt": null,
        "unlockSchedule": null,
        "validityEndDate": "2024-02-15T23:59:59.000Z",
        "isUnlocked": true,
        "isExpired": false,
        "unlockMessage": "",
        "validityMessage": "Valid for 30 days"
      },
      {
        "id": "level_3",
        "title": "Leadership through Gita",
        "description": "Apply Gita teachings to leadership and life",
        "level": "3",
        "isCompleted": false,
        "isCurrent": false,
        "isLocked": true,
        "totalLessons": 1,
        "completedLessons": 0,
        "totalVideos": 15,
        "completedVideos": 0,
        "totalPDFs": 7,
        "completedPDFs": 0,
        "totalQuizzes": 4,
        "completedQuizzes": 0,
        "certificateUrl": "",
        "completedAt": null,
        "unlockSchedule": "2024-01-22T00:00:00.000Z",
        "validityEndDate": "2024-03-01T23:59:59.000Z",
        "isUnlocked": false,
        "isExpired": false,
        "unlockMessage": "Unlocks in 7 days",
        "validityMessage": "Valid for 45 days after unlock"
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
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": ""
      }
    ],
    "videos": [
      {
        "id": "video_1",
        "title": "Introduction to Bhagavad Gita - Part 1",
        "description": "Historical background and context",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "iframeUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "thumbnail": "https://example.com/thumbnails/video_1.jpg",
        "levelId": "level_1",
        "lessonId": "lesson_1",
        "duration": 1800,
        "isWatched": true,
        "watchProgress": 100,
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": ""
      }
    ],
    "pdfs": [
      {
        "id": "pdf_1",
        "title": "Bhagavad Gita - Chapter 1 Summary",
        "description": "Comprehensive summary of Chapter 1",
        "url": "https://example.com/pdfs/chapter1_summary.pdf",
        "downloadUrl": "https://example.com/pdfs/chapter1_summary.pdf",
        "thumbnail": "https://example.com/thumbnails/pdf_1.jpg",
        "levelId": "level_1",
        "lessonId": "lesson_1",
        "pageCount": 15,
        "isRead": true,
        "readProgress": 100,
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": ""
      }
    ],
    "quizzes": [
      {
        "id": "quiz_1",
        "title": "Introduction Quiz",
        "description": "Test your understanding of basic concepts",
        "levelId": "level_1",
        "lessonId": "lesson_1",
        "totalQuestions": 25,
        "timeLimit": 15,
        "passingScore": 70,
        "isCompleted": true,
        "score": 85,
        "attempts": 1,
        "completedAt": "2024-01-07T10:30:00.000Z",
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": "",
        "validityStartDate": "2024-01-01T00:00:00.000Z",
        "validityEndDate": "2024-01-30T23:59:59.000Z",
        "resultAnnouncementDate": "2024-02-06T00:00:00.000Z",
        "isExpired": false,
        "validityMessage": "Valid for 15 days",
        "questions": [
          {
            "id": "q1",
            "question": "What is the main theme of Bhagavad Gita?",
            "options": [
              "War and conflict",
              "Spiritual wisdom and duty",
              "Love and romance",
              "Political power"
            ],
            "correctOption": 1,
            "explanation": "Bhagavad Gita primarily deals with spiritual wisdom and the concept of duty (dharma).",
            "points": 1
          }
        ]
      }
    ],
    "progress": {
      "totalLevels": 3,
      "completedLevels": 1,
      "totalLessons": 3,
      "completedLessons": 1,
      "totalVideos": 35,
      "watchedVideos": 13,
      "totalPDFs": 15,
      "readPDFs": 5,
      "totalQuizzes": 9,
      "completedQuizzes": 3,
      "overallProgress": 35.5,
      "earnedCertificates": [
        "https://example.com/certificates/level_1_cert.pdf"
      ]
    }
  }
}
```

### 2. Mark Video as Watched

**Endpoint:** `POST /courses/video/{videoId}/watch`

**Description:** Marks a video as watched with progress tracking.

**Request Body:**
```json
{
  "watchProgress": 100
}
```

**Response:**
```json
{
  "success": true,
  "message": "Video marked as watched"
}
```

### 3. Mark PDF as Read

**Endpoint:** `POST /courses/pdf/{pdfId}/read`

**Description:** Marks a PDF as read with progress tracking.

**Request Body:**
```json
{
  "readProgress": 100
}
```

**Response:**
```json
{
  "success": true,
  "message": "PDF marked as read"
}
```

### 4. Submit Quiz

**Endpoint:** `POST /courses/quiz/{quizId}/submit`

**Description:** Submits quiz answers and returns results with scoring.

**Request Body:**
```json
{
  "answers": {
    "q1": 1,
    "q2": 2,
    "q3": 0
  },
  "timeSpent": 900
}
```

**Response:**
```json
{
  "success": true,
  "score": 85,
  "totalQuestions": 25,
  "correctAnswers": 21,
  "passingScore": 70,
  "passed": true,
  "message": "Quiz submitted successfully"
}
```

### 5. Get Course Notes

**Endpoint:** `GET /courses/notes`

**Description:** Fetches all notes for the authenticated student's current course level.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "notes": [
    {
      "id": "note_1",
      "title": "Bhagavad Gita Chapter 1 - Key Points",
      "content": "The first chapter of Bhagavad Gita sets the stage for the entire dialogue...",
      "courseId": "level_1",
      "createdAt": "2024-01-05T10:30:00.000Z",
      "updatedAt": "2024-01-05T10:30:00.000Z"
    },
    {
      "id": "note_2", 
      "title": "Important Verses to Remember",
      "content": "Key verses from Chapter 1 that summarize the main teachings...",
      "courseId": "level_1",
      "createdAt": "2024-01-05T10:30:00.000Z",
      "updatedAt": "2024-01-05T10:30:00.000Z"
    }
  ]
}
```

### 5. Mark Lesson as Completed

**Endpoint:** `POST /courses/lesson/{lessonId}/complete`

**Description:** Marks a lesson as completed.

**Response:**
```json
{
  "success": true,
  "message": "Lesson marked as completed"
}
```

### 6. Mark Level as Completed

**Endpoint:** `POST /courses/level/{levelId}/complete`

**Description:** Marks a level as completed and generates certificate.

**Response:**
```json
{
  "success": true,
  "certificateUrl": "https://example.com/certificates/level_1_cert.pdf",
  "message": "Level completed successfully"
}
```

### 7. Get Level Data

**Endpoint:** `GET /courses/level/{levelId}`

**Description:** Gets detailed data for a specific level.

**Response:** Same structure as the level object in the course data response.

## Features Implemented

### 1. Course Levels
- Multiple levels with progressive unlocking
- Each level contains videos, PDFs, and quizzes
- Completion tracking and certificates

### 2. Video Content
- YouTube iframe integration
- Progress tracking (watch progress)
- Unlock scheduling based on level schedules

### 3. PDF Content
- Downloadable PDF files
- Read progress tracking
- Unlock scheduling based on level schedules

### 4. Quiz System
- 25 questions per quiz
- 15-minute time limit
- Real-time scoring
- Validity periods with result announcement dates
- Unlock scheduling based on level schedules

### 5. Scheduling and Validity
- **Level Schedules:** Control when levels become available
- **Quiz Validity:** Control when quizzes can be attempted
- **Countdown Messages:** Show time remaining for unlocks and validity
- **Result Announcement:** Automatic calculation of result announcement dates

### 6. Progress Tracking
- Overall progress calculation
- Individual component tracking (videos, PDFs, quizzes)
- Certificate generation for completed levels

## Database Models Used

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

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing parameters)
- `401` - Unauthorized (invalid token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Master Admin Notes API

### Add Notes (Single or Excel Upload)

**Endpoint:** `POST /api/master-admin/courses/notes`

**Description:** Creates notes for a course. Supports both single note creation and Excel file upload for bulk notes.

**Headers:**
```
Authorization: Bearer <master_admin_token>
Content-Type: multipart/form-data
```

**Request Body (Single Note):**
```
class: "10th"
level: "1"
title: "Chapter 1 Summary"
content: "Key points from Chapter 1..."
```

**Request Body (Excel Upload):**
```
class: "10th"
level: "1"
file: <excel_file>
```

**Excel Format Requirements:**
- **Column A:** Note Title
- **Column B:** Note Content
- **First row:** Can be header (optional)
- **File format:** .xlsx, .xls

**Example Excel Structure:**
```
| Title                    | Content                                    |
|--------------------------|--------------------------------------------|
| Chapter 1 Summary        | Key points from Chapter 1...               |
| Important Verses         | Verse 1.1: dharma-kshetre kuru-kshetre... |
| Study Questions          | What is the main theme of Chapter 1?      |
```

**Response (Single Note):**
```json
{
  "message": "Note created successfully.",
  "note": {
    "id": "note_1",
    "courseId": "course_1",
    "title": "Chapter 1 Summary",
    "content": "Key points from Chapter 1...",
    "createdAt": "2024-01-05T10:30:00.000Z",
    "updatedAt": "2024-01-05T10:30:00.000Z"
  }
}
```

**Response (Excel Upload):**
```json
{
  "message": "3 notes created successfully from Excel file.",
  "notes": [
    {
      "id": "note_1",
      "courseId": "course_1",
      "title": "Chapter 1 Summary",
      "content": "Key points from Chapter 1...",
      "createdAt": "2024-01-05T10:30:00.000Z",
      "updatedAt": "2024-01-05T10:30:00.000Z"
    }
  ]
}
```

### Update Note

**Endpoint:** `PUT /api/master-admin/courses/notes/:id`

**Description:** Updates an existing note.

**Headers:**
```
Authorization: Bearer <master_admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Chapter 1 Summary",
  "content": "Updated content with more details..."
}
```

**Response:**
```json
{
  "message": "Note updated successfully.",
  "note": {
    "id": "note_1",
    "courseId": "course_1",
    "title": "Updated Chapter 1 Summary",
    "content": "Updated content with more details...",
    "createdAt": "2024-01-05T10:30:00.000Z",
    "updatedAt": "2024-01-06T15:45:00.000Z"
  }
}
```

### Delete Note

**Endpoint:** `DELETE /api/master-admin/courses/notes/:id`

**Description:** Deletes a specific note.

**Headers:**
```
Authorization: Bearer <master_admin_token>
```

**Response:**
```json
{
  "message": "Note deleted successfully.",
  "deletedNote": {
    "id": "note_1",
    "title": "Chapter 1 Summary",
    "courseId": "course_1"
  }
}
```

## Mobile App Integration Notes

1. **Authentication:** Use JWT tokens for all requests
2. **Progress Sync:** Track progress locally and sync with server
3. **Offline Support:** Cache course data for offline viewing
4. **Push Notifications:** Implement for level unlocks and quiz availability
5. **Countdown Timers:** Use validity dates for real-time countdowns
6. **Certificate Download:** Use certificate URLs for PDF downloads
7. **Notes Display:** Render notes content with proper formatting and styling

## Testing

Test the APIs using tools like Postman or curl:

```bash
# Get course data
curl -H "Authorization: Bearer <token>" http://localhost:4545/api/courses

# Mark video as watched
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"watchProgress": 100}' \
  http://localhost:4545/api/courses/video/<videoId>/watch

# Submit quiz
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"answers": {"q1": 1, "q2": 2}, "timeSpent": 900}' \
  http://localhost:4545/api/courses/quiz/<quizId>/submit
``` 