# 📱 Mobile App API Complete Documentation

## **Base URL:** `http://localhost:4545/api`

---

## **🔐 Authentication**

### **Student Login**
```
POST /auth/student-signin
```

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZTgyZTR4cTAwMWtxb21qamYzY2RidHkiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTc1NDk4Njg1MiwiZXhwIjoxNzU1NTkxNjUyfQ.hmLRGCiXOYqMExCSNMD03MS4B7kpVyyTigBBxiYI-XA",
  "user": {
    "id": "cme82e4xq001kqomjjf3cdbty",
    "email": "student@example.com",
    "role": "student",
    "name": "Test Student",
    "districtId": "cme82e4t1001gqomj7qhcacnh"
  }
}
```

---

## **📚 Course Management**

### **1. Get All Course Data**
```
GET /courses
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "cme82e4xq001kqomjjf3cdbty",
    "name": "Test Student",
    "email": "student@example.com",
    "picture": null,
    "role": "student",
    "district": "Ujjain - उज्जैन",
    "pincode": null,
    "education": "high_school",
    "classLevel": "10th",
    "districtId": "cme82e4t1001gqomj7qhcacnh",
    "dob": null,
    "gender": null,
    "lastActiveAt": "2024-01-15T10:30:00.000Z"
  },
  "courseData": {
    "currentLevel": "1",
    "levels": [
      {
        "id": "cme82e4xq001kqomjjf3cdbty",
        "title": "Introduction to Bhagavad Gita",
        "description": "Learn the basics of Bhagavad Gita and its significance",
        "level": "1",
        "isCompleted": true,
        "isCurrent": false,
        "isLocked": false,
        "totalLessons": 1,
        "completedLessons": 1,
        "totalVideos": 2,
        "completedVideos": 2,
        "totalPDFs": 2,
        "completedPDFs": 2,
        "totalQuizzes": 1,
        "completedQuizzes": 1,
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
        "id": "cme82e4t1001gqomj7qhcacnh",
        "title": "Advanced Gita Studies",
        "description": "Deep dive into advanced concepts and teachings",
        "level": "2",
        "isCompleted": false,
        "isCurrent": true,
        "isLocked": false,
        "totalLessons": 1,
        "completedLessons": 0,
        "totalVideos": 0,
        "completedVideos": 0,
        "totalPDFs": 0,
        "completedPDFs": 0,
        "totalQuizzes": 0,
        "completedQuizzes": 0,
        "certificateUrl": "",
        "completedAt": null,
        "unlockSchedule": null,
        "validityEndDate": null,
        "isUnlocked": true,
        "isExpired": false,
        "unlockMessage": "",
        "validityMessage": ""
      },
      {
        "id": "cme82e4t1001hqomj7qhcacni",
        "title": "Leadership through Gita",
        "description": "Apply Gita teachings to leadership and life",
        "level": "3",
        "isCompleted": false,
        "isCurrent": false,
        "isLocked": true,
        "totalLessons": 1,
        "completedLessons": 0,
        "totalVideos": 0,
        "completedVideos": 0,
        "totalPDFs": 0,
        "completedPDFs": 0,
        "totalQuizzes": 0,
        "completedQuizzes": 0,
        "certificateUrl": "",
        "completedAt": null,
        "unlockSchedule": null,
        "validityEndDate": null,
        "isUnlocked": false,
        "isExpired": false,
        "unlockMessage": "",
        "validityMessage": ""
      }
    ],
    "lessons": [
      {
        "id": "cme82e4xq001kqomjjf3cdbty",
        "title": "Introduction to Bhagavad Gita",
        "description": "Learn the basics of Bhagavad Gita and its significance",
        "levelId": "cme82e4xq001kqomjjf3cdbty",
        "level": "1",
        "isCompleted": true,
        "order": 1,
        "duration": "45 minutes",
        "thumbnail": "https://example.com/thumbnails/lesson_1.jpg",
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": ""
      },
      {
        "id": "cme82e4t1001gqomj7qhcacnh",
        "title": "Advanced Gita Studies",
        "description": "Deep dive into advanced concepts and teachings",
        "levelId": "cme82e4t1001gqomj7qhcacnh",
        "level": "2",
        "isCompleted": false,
        "order": 2,
        "duration": "45 minutes",
        "thumbnail": "https://example.com/thumbnails/lesson_1.jpg",
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": ""
      },
      {
        "id": "cme82e4t1001hqomj7qhcacni",
        "title": "Leadership through Gita",
        "description": "Apply Gita teachings to leadership and life",
        "levelId": "cme82e4t1001hqomj7qhcacni",
        "level": "3",
        "isCompleted": false,
        "order": 3,
        "duration": "45 minutes",
        "thumbnail": "https://example.com/thumbnails/lesson_1.jpg",
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": false,
        "unlockMessage": ""
      }
    ],
    "videos": [
      {
        "id": "cme82e4xq001lqomjjf3cdbtz",
        "title": "Introduction to Bhagavad Gita - Part 1",
        "description": "Introduction to Bhagavad Gita - Part 1",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "iframeUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "thumbnail": "https://example.com/thumbnails/video_1.jpg",
        "levelId": "cme82e4xq001kqomjjf3cdbty",
        "lessonId": "cme82e4xq001kqomjjf3cdbty",
        "duration": 1800,
        "isWatched": true,
        "watchProgress": 100,
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": ""
      },
      {
        "id": "cme82e4xq001mqomjjf3cdbua",
        "title": "Introduction to Bhagavad Gita - Part 2",
        "description": "Introduction to Bhagavad Gita - Part 2",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "iframeUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "thumbnail": "https://example.com/thumbnails/video_2.jpg",
        "levelId": "cme82e4xq001kqomjjf3cdbty",
        "lessonId": "cme82e4xq001kqomjjf3cdbty",
        "duration": 1800,
        "isWatched": false,
        "watchProgress": 0,
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": ""
      },
      {
        "id": "cme82e4xq001nqomjjf3cdbub",
        "title": "Advanced Concepts - Part 1",
        "description": "Advanced Concepts - Part 1",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "iframeUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "thumbnail": "https://example.com/thumbnails/video_1.jpg",
        "levelId": "cme82e4t1001gqomj7qhcacnh",
        "lessonId": "cme82e4t1001gqomj7qhcacnh",
        "duration": 1800,
        "isWatched": false,
        "watchProgress": 0,
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": ""
      }
    ],
    "pdfs": [
      {
        "id": "cme82e4xq001oqomjjf3cdbuc",
        "title": "Bhagavad Gita - Chapter 1 Summary",
        "description": "Bhagavad Gita - Chapter 1 Summary",
        "url": "https://example.com/pdfs/chapter1_summary.pdf",
        "downloadUrl": "https://example.com/pdfs/chapter1_summary.pdf",
        "thumbnail": "https://example.com/thumbnails/pdf_1.jpg",
        "levelId": "cme82e4xq001kqomjjf3cdbty",
        "lessonId": "cme82e4xq001kqomjjf3cdbty",
        "pageCount": 15,
        "isRead": true,
        "readProgress": 100,
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": ""
      },
      {
        "id": "cme82e4xq001pqomjjf3cdbud",
        "title": "Bhagavad Gita - Chapter 2 Summary",
        "description": "Bhagavad Gita - Chapter 2 Summary",
        "url": "https://example.com/pdfs/chapter2_summary.pdf",
        "downloadUrl": "https://example.com/pdfs/chapter2_summary.pdf",
        "thumbnail": "https://example.com/thumbnails/pdf_1.jpg",
        "levelId": "cme82e4xq001kqomjjf3cdbty",
        "lessonId": "cme82e4xq001kqomjjf3cdbty",
        "pageCount": 15,
        "isRead": false,
        "readProgress": 0,
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": ""
      },
      {
        "id": "cme82e4xq001qqomjjf3cdbue",
        "title": "Advanced Concepts - Chapter 1",
        "description": "Advanced Concepts - Chapter 1",
        "url": "https://example.com/pdfs/advanced_chapter1.pdf",
        "downloadUrl": "https://example.com/pdfs/advanced_chapter1.pdf",
        "thumbnail": "https://example.com/thumbnails/pdf_1.jpg",
        "levelId": "cme82e4t1001gqomj7qhcacnh",
        "lessonId": "cme82e4t1001gqomj7qhcacnh",
        "pageCount": 15,
        "isRead": false,
        "readProgress": 0,
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": ""
      }
    ],
    "quizzes": [
      {
        "id": "cme82e4xq001rqomjjf3cdbuf",
        "title": "Quiz - Introduction to Bhagavad Gita",
        "description": "Assessment for Introduction to Bhagavad Gita",
        "levelId": "cme82e4xq001kqomjjf3cdbty",
        "lessonId": "cme82e4xq001kqomjjf3cdbty",
        "totalQuestions": 2,
        "timeLimit": 15,
        "passingScore": 70,
        "isCompleted": true,
        "score": 0,
        "attempts": 1,
        "completedAt": "2024-01-07T10:30:00.000Z",
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": "",
        "validityStartDate": null,
        "validityEndDate": null,
        "resultAnnouncementDate": null,
        "isExpired": false,
        "validityMessage": "",
        "questions": [
          {
            "id": "cme82e4xq001sqomjjf3cdbug",
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
          },
          {
            "id": "cme82e4xq001tqomjjf3cdbuh",
            "question": "Who is the narrator of Bhagavad Gita?",
            "options": [
              "Krishna",
              "Arjuna",
              "Vyasa",
              "Sanjaya"
            ],
            "correctOption": 3,
            "explanation": "Sanjaya narrates the Bhagavad Gita to King Dhritarashtra.",
            "points": 1
          }
        ]
      },
      {
        "id": "cme82e4xq001uqomjjf3cdbui",
        "title": "Quiz - Advanced Gita Studies",
        "description": "Assessment for Advanced Gita Studies",
        "levelId": "cme82e4t1001gqomj7qhcacnh",
        "lessonId": "cme82e4t1001gqomj7qhcacnh",
        "totalQuestions": 25,
        "timeLimit": 15,
        "passingScore": 70,
        "isCompleted": false,
        "score": null,
        "attempts": 0,
        "completedAt": null,
        "createdAt": "2024-01-05T10:30:00.000Z",
        "isUnlocked": true,
        "unlockMessage": "",
        "validityStartDate": null,
        "validityEndDate": null,
        "resultAnnouncementDate": null,
        "isExpired": false,
        "validityMessage": "",
        "questions": [
          {
            "id": "cme82krqi0003qo3n7ple5wlx",
            "question": "What is Soul?",
            "options": [
              "Spiritual Matter",
              "Anti-matter",
              "Eternal",
              "We"
            ],
            "correctOption": null,
            "explanation": "Correct answer: A",
            "points": 1
          },
          {
            "id": "cme82krqi0004qo3nppta5r5h",
            "question": "What is the ultimate goal of the soul?",
            "options": [
              "Liberation",
              "Wealth",
              "Fame",
              "Pleasure"
            ],
            "correctOption": null,
            "explanation": "Correct answer: A",
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
      "totalVideos": 3,
      "watchedVideos": 1,
      "totalPDFs": 3,
      "readPDFs": 1,
      "totalQuizzes": 2,
      "completedQuizzes": 1,
      "overallProgress": 33,
      "earnedCertificates": [
        "https://example.com/certificates/level_1_cert.pdf"
      ]
    }
  }
}
```

### **2. Get Specific Level Data**
```
GET /courses/level/{levelId}
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "courseData": {
    "currentLevel": "1",
    "levels": [
      {
        "id": "cme82e4xq001kqomjjf3cdbty",
        "title": "Introduction to Bhagavad Gita",
        "description": "Learn the basics of Bhagavad Gita and its significance",
        "level": "1",
        "isCompleted": true,
        "isCurrent": false,
        "isLocked": false,
        "totalLessons": 1,
        "completedLessons": 1,
        "totalVideos": 2,
        "completedVideos": 2,
        "totalPDFs": 2,
        "completedPDFs": 2,
        "totalQuizzes": 1,
        "completedQuizzes": 1,
        "certificateUrl": "https://example.com/certificates/level_1_cert.pdf",
        "completedAt": "2024-01-10T10:30:00.000Z",
        "unlockSchedule": null,
        "validityEndDate": null,
        "isUnlocked": true,
        "isExpired": false,
        "unlockMessage": "",
        "validityMessage": ""
      }
    ],
    "lessons": [...],
    "videos": [...],
    "pdfs": [...],
    "quizzes": [...]
  }
}
```

---

## **🎥 Video Progress**

### **Mark Video as Watched**
```
POST /courses/video/{videoId}/watch
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

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

---

## **📄 PDF Progress**

### **Mark PDF as Read**
```
POST /courses/pdf/{pdfId}/read
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

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

---

## **🧠 Quiz Management**

### **Submit Quiz**
```
POST /courses/quiz/{quizId}/submit
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "answers": {
    "cme82e4ym001zqomjh9w3tp09": 1,
    "cme82e4ym001zqomjh9w3tp0a": 3
  },
  "timeSpent": 900
}
```

**Response:**
```json
{
  "success": true,
  "score": 100,
  "totalQuestions": 2,
  "correctAnswers": 2,
  "passingScore": 70,
  "passed": true,
  "message": "Quiz submitted successfully"
}
```

---

## **📝 Lesson Management**

### **Mark Lesson as Completed**
```
POST /courses/lesson/{lessonId}/complete
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Lesson marked as completed"
}
```

---

## **🏆 Level Management**

### **Mark Level as Completed**
```
POST /courses/level/{levelId}/complete
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "certificateUrl": "https://example.com/certificates/level_1_cert.pdf",
  "message": "Level completed successfully"
}
```

---

## **🔧 Testing & Examples**

### **Complete Test Flow:**

**1. Login:**
```bash
curl -X POST http://localhost:4545/api/auth/student-signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123"
  }'
```

**2. Get Course Data:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4545/api/courses
```

**3. Mark Video as Watched:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"watchProgress": 100}' \
  http://localhost:4545/api/courses/video/cme82e4xq001lqomjjf3cdbtz/watch
```

**4. Mark PDF as Read:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"readProgress": 100}' \
  http://localhost:4545/api/courses/pdf/cme82e4xq001oqomjjf3cdbuc/read
```

**5. Submit Quiz:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "cme82e4xq001sqomjjf3cdbug": 1,
      "cme82e4xq001tqomjjf3cdbuh": 3
    },
    "timeSpent": 900
  }' \
  http://localhost:4545/api/courses/quiz/cme82e4xq001rqomjjf3cdbuf/submit
```

**6. Mark Lesson Complete:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:4545/api/courses/lesson/cme82e4xq001kqomjjf3cdbty/complete
```

**7. Mark Level Complete:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:4545/api/courses/level/cme82e4xq001kqomjjf3cdbty/complete
```

**8. Get Level Data:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4545/api/courses/level/cme82e4xq001kqomjjf3cdbty
```

---

## **📊 Response Structure Details**

### **Level Object:**
```json
{
  "id": "cme82e4xq001kqomjjf3cdbty",
  "title": "Introduction to Bhagavad Gita",
  "description": "Learn the basics of Bhagavad Gita and its significance",
  "level": "1",
  "isCompleted": true,
  "isCurrent": false,
  "isLocked": false,
  "totalLessons": 1,
  "completedLessons": 1,
  "totalVideos": 2,
  "completedVideos": 2,
  "totalPDFs": 2,
  "completedPDFs": 2,
  "totalQuizzes": 1,
  "completedQuizzes": 1,
  "certificateUrl": "https://example.com/certificates/level_1_cert.pdf",
  "completedAt": "2024-01-10T10:30:00.000Z",
  "unlockSchedule": null,
  "validityEndDate": null,
  "isUnlocked": true,
  "isExpired": false,
  "unlockMessage": "",
  "validityMessage": ""
}
```

### **Video Object:**
```json
{
  "id": "cme82e4xq001lqomjjf3cdbtz",
  "title": "Introduction to Bhagavad Gita - Part 1",
  "description": "Introduction to Bhagavad Gita - Part 1",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "iframeUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ",
  "thumbnail": "https://example.com/thumbnails/video_1.jpg",
  "levelId": "cme82e4xq001kqomjjf3cdbty",
  "lessonId": "cme82e4xq001kqomjjf3cdbty",
  "duration": 1800,
  "isWatched": true,
  "watchProgress": 100,
  "createdAt": "2024-01-05T10:30:00.000Z",
  "isUnlocked": true,
  "unlockMessage": ""
}
```

### **PDF Object:**
```json
{
  "id": "cme82e4xq001oqomjjf3cdbuc",
  "title": "Bhagavad Gita - Chapter 1 Summary",
  "description": "Bhagavad Gita - Chapter 1 Summary",
  "url": "https://example.com/pdfs/chapter1_summary.pdf",
  "downloadUrl": "https://example.com/pdfs/chapter1_summary.pdf",
  "thumbnail": "https://example.com/thumbnails/pdf_1.jpg",
  "levelId": "cme82e4xq001kqomjjf3cdbty",
  "lessonId": "cme82e4xq001kqomjjf3cdbty",
  "pageCount": 15,
  "isRead": true,
  "readProgress": 100,
  "createdAt": "2024-01-05T10:30:00.000Z",
  "isUnlocked": true,
  "unlockMessage": ""
}
```

### **Quiz Object:**
```json
{
  "id": "cme82e4xq001rqomjjf3cdbuf",
  "title": "Quiz - Introduction to Bhagavad Gita",
  "description": "Assessment for Introduction to Bhagavad Gita",
  "levelId": "cme82e4xq001kqomjjf3cdbty",
  "lessonId": "cme82e4xq001kqomjjf3cdbty",
  "totalQuestions": 2,
  "timeLimit": 15,
  "passingScore": 70,
  "isCompleted": true,
  "score": 0,
  "attempts": 1,
  "completedAt": "2024-01-07T10:30:00.000Z",
  "createdAt": "2024-01-05T10:30:00.000Z",
  "isUnlocked": true,
  "unlockMessage": "",
  "validityStartDate": null,
  "validityEndDate": null,
  "resultAnnouncementDate": null,
  "isExpired": false,
  "validityMessage": "",
  "questions": [
    {
      "id": "cme82e4xq001sqomjjf3cdbug",
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
```

### **Question Object:**
```json
{
  "id": "cme82e4xq001sqomjjf3cdbug",
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
```

### **Progress Object:**
```json
{
  "totalLevels": 3,
  "completedLevels": 1,
  "totalLessons": 3,
  "completedLessons": 1,
  "totalVideos": 3,
  "watchedVideos": 1,
  "totalPDFs": 3,
  "readPDFs": 1,
  "totalQuizzes": 2,
  "completedQuizzes": 1,
  "overallProgress": 33,
  "earnedCertificates": [
    "https://example.com/certificates/level_1_cert.pdf"
  ]
}
```

---

## **🚀 Features Summary**

✅ **Authentication** - JWT-based student login  
✅ **Course Levels** - Progressive learning with unlock schedules  
✅ **Video Content** - YouTube iframe integration with progress tracking  
✅ **PDF Content** - Downloadable materials with read tracking  
✅ **Quiz System** - 25 questions, 15-minute time limit, real-time scoring  
✅ **Scheduling** - Level unlock schedules and quiz validity periods  
✅ **Progress Tracking** - Comprehensive progress monitoring  
✅ **Certificates** - Automatic certificate generation for completed levels  
✅ **Countdown Messages** - Real-time countdown for unlocks and validity  
✅ **Error Handling** - Consistent error responses with proper status codes  

---

## **🔧 Development Commands**

```bash
# Start development server
npm run dev

# Run tests
npm run test:mobile

# Seed database
npm run seed

# Build for production
npm run build

# Start production server
npm start

# Docker development
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml exec app npm run dev
```

---

## **📱 Mobile App Integration Notes**

### **1. Authentication Flow:**
1. User enters email and password
2. Call `POST /auth/student-signin`
3. Store JWT token securely
4. Include token in all subsequent requests

### **2. Data Synchronization:**
1. Call `GET /courses` on app startup
2. Cache course data locally
3. Sync progress changes to server
4. Handle offline/online scenarios

### **3. Real-time Features:**
1. Implement countdown timers for unlocks
2. Show validity periods for quizzes
3. Display progress percentages
4. Update UI based on `isUnlocked` and `isExpired` flags

### **4. User Experience:**
1. Show unlock messages and countdowns
2. Display validity messages for quizzes
3. Provide certificate download links
4. Show result announcement dates
5. Implement progress bars and completion indicators

### **5. Error Handling:**
1. Handle network errors gracefully
2. Show appropriate error messages
3. Implement retry mechanisms
4. Validate response data

---

## **🔒 Security Considerations**

1. **JWT Token Security:**
   - Store tokens securely (Keychain for iOS, Keystore for Android)
   - Implement token refresh mechanism
   - Handle token expiration gracefully

2. **API Security:**
   - All endpoints require authentication
   - Validate input data
   - Implement rate limiting
   - Use HTTPS in production

3. **Data Privacy:**
   - Encrypt sensitive data
   - Implement secure storage
   - Follow GDPR compliance

---

## **📊 Performance Optimization**

1. **Caching Strategy:**
   - Cache course data locally
   - Implement image caching
   - Use CDN for static assets

2. **Network Optimization:**
   - Implement request batching
   - Use compression
   - Optimize payload size

3. **UI Performance:**
   - Lazy load content
   - Implement pagination
   - Optimize image loading

---

## **🐛 Error Responses**

### **Common Error Responses:**

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Missing required parameters"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Server error. Please try again later."
}
```

---

## **📈 Monitoring & Analytics**

1. **User Engagement:**
   - Track video watch time
   - Monitor quiz completion rates
   - Analyze progress patterns

2. **Performance Metrics:**
   - API response times
   - Error rates
   - User session duration

3. **Content Analytics:**
   - Most popular videos
   - Quiz difficulty analysis
   - Completion rates by level

---

## **🔄 API Versioning**

Current API version: **v1**

Future versions will maintain backward compatibility where possible.

---

## **📞 Support**

For technical support or questions:
1. Check the API documentation
2. Review the test scripts
3. Check server logs for errors
4. Verify database connectivity
5. Test with provided curl commands

---

## **🎉 Conclusion**

This mobile app API provides a comprehensive solution for delivering course content with advanced features like scheduling, progress tracking, and certificate generation. The implementation follows best practices for security, performance, and maintainability.

All APIs are fully functional and ready for mobile app integration! 🚀

---

*Last updated: January 2024*
*API Version: v1*
*Status: Production Ready* 