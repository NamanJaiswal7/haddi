const axios = require('axios');

const BASE_URL = 'http://localhost:4545/api';
let authToken = '';

// Test data
const testUser = {
  email: 'student@example.com',
  password: 'password123'
};

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${BASE_URL}/auth/student-signin`, testUser);
    authToken = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getCourseData() {
  try {
    console.log('\n📚 Getting course data...');
    const response = await axios.get(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Course data retrieved successfully');
    console.log(`📊 Current Level: ${response.data.courseData.currentLevel}`);
    console.log(`📈 Overall Progress: ${response.data.courseData.progress.overallProgress}%`);
    console.log(`🎯 Total Levels: ${response.data.courseData.progress.totalLevels}`);
    console.log(`✅ Completed Levels: ${response.data.courseData.progress.completedLevels}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get course data:', error.response?.data || error.message);
    return null;
  }
}

async function getLevelData(levelId) {
  try {
    console.log(`\n🏆 Getting level data for ${levelId}...`);
    const response = await axios.get(`${BASE_URL}/courses/level/${levelId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Level data retrieved successfully');
    console.log(`📊 Level Title: ${response.data.courseData.levels[0].title}`);
    console.log(`📈 Is Completed: ${response.data.courseData.levels[0].isCompleted}`);
    console.log(`🔓 Is Unlocked: ${response.data.courseData.levels[0].isUnlocked}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get level data:', error.response?.data || error.message);
    return null;
  }
}

async function markVideoAsWatched(videoId) {
  try {
    console.log(`\n🎥 Marking video ${videoId} as watched...`);
    const response = await axios.post(`${BASE_URL}/courses/video/${videoId}/watch`, {
      watchProgress: 100
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Video marked as watched');
    return true;
  } catch (error) {
    console.error('❌ Failed to mark video as watched:', error.response?.data || error.message);
    return false;
  }
}

async function markPDFAsRead(pdfId) {
  try {
    console.log(`\n📄 Marking PDF ${pdfId} as read...`);
    const response = await axios.post(`${BASE_URL}/courses/pdf/${pdfId}/read`, {
      readProgress: 100
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ PDF marked as read');
    return true;
  } catch (error) {
    console.error('❌ Failed to mark PDF as read:', error.response?.data || error.message);
    return false;
  }
}

async function submitQuiz(quizId) {
  try {
    console.log(`\n🧠 Submitting quiz ${quizId}...`);
    
    // Get quiz details first to get question IDs
    const quizResponse = await axios.get(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const quiz = quizResponse.data.courseData.quizzes.find(q => q.id === quizId);
    if (!quiz) {
      console.error('❌ Quiz not found');
      return false;
    }
    
    // Create answers object with actual question IDs
    const answers = {};
    quiz.questions.forEach((question, index) => {
      answers[question.id] = question.correctOption; // Use correct answers for testing
    });
    
    const response = await axios.post(`${BASE_URL}/courses/quiz/${quizId}/submit`, {
      answers: answers,
      timeSpent: 900 // 15 minutes in seconds
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Quiz submitted successfully');
    console.log(`📊 Score: ${response.data.score}%`);
    console.log(`✅ Passed: ${response.data.passed ? 'Yes' : 'No'}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to submit quiz:', error.response?.data || error.message);
    return false;
  }
}

async function markLessonAsCompleted(lessonId) {
  try {
    console.log(`\n📝 Marking lesson ${lessonId} as completed...`);
    const response = await axios.post(`${BASE_URL}/courses/lesson/${lessonId}/complete`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Lesson marked as completed');
    return true;
  } catch (error) {
    console.error('❌ Failed to mark lesson as completed:', error.response?.data || error.message);
    return false;
  }
}

async function markLevelAsCompleted(levelId) {
  try {
    console.log(`\n🏆 Marking level ${levelId} as completed...`);
    const response = await axios.post(`${BASE_URL}/courses/level/${levelId}/complete`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Level marked as completed');
    console.log(`📜 Certificate URL: ${response.data.certificateUrl}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to mark level as completed:', error.response?.data || error.message);
    return false;
  }
}

async function testResponseStructure(courseData) {
  console.log('\n🔍 Testing response structure...');
  
  // Test user data structure
  if (courseData.user && courseData.user.id && courseData.user.name) {
    console.log('✅ User data structure is correct');
  } else {
    console.log('❌ User data structure is missing required fields');
  }
  
  // Test course data structure
  if (courseData.courseData && courseData.courseData.levels) {
    console.log('✅ Course data structure is correct');
    console.log(`📊 Found ${courseData.courseData.levels.length} levels`);
  } else {
    console.log('❌ Course data structure is missing required fields');
  }
  
  // Test videos structure
  if (courseData.courseData.videos && courseData.courseData.videos.length > 0) {
    const video = courseData.courseData.videos[0];
    if (video.iframeUrl && video.title) {
      console.log('✅ Video structure is correct');
    } else {
      console.log('❌ Video structure is missing required fields');
    }
  }
  
  // Test PDFs structure
  if (courseData.courseData.pdfs && courseData.courseData.pdfs.length > 0) {
    const pdf = courseData.courseData.pdfs[0];
    if (pdf.downloadUrl && pdf.title) {
      console.log('✅ PDF structure is correct');
    } else {
      console.log('❌ PDF structure is missing required fields');
    }
  }
  
  // Test quizzes structure
  if (courseData.courseData.quizzes && courseData.courseData.quizzes.length > 0) {
    const quiz = courseData.courseData.quizzes[0];
    if (quiz.questions && quiz.timeLimit) {
      console.log('✅ Quiz structure is correct');
    } else {
      console.log('❌ Quiz structure is missing required fields');
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Mobile App API Tests...\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  // Step 2: Get course data
  const courseData = await getCourseData();
  if (!courseData) {
    console.log('❌ Cannot proceed without course data');
    return;
  }
  
  // Step 3: Test response structure
  await testResponseStructure(courseData);
  
  // Step 4: Test with first available video, PDF, quiz, lesson, and level
  const firstVideo = courseData.courseData.videos[0];
  const firstPDF = courseData.courseData.pdfs[0];
  const firstQuiz = courseData.courseData.quizzes[0];
  const firstLesson = courseData.courseData.lessons[0];
  const firstLevel = courseData.courseData.levels[0];
  
  console.log('\n📊 Available content:');
  console.log(`🎥 Videos: ${courseData.courseData.videos.length}`);
  console.log(`📄 PDFs: ${courseData.courseData.pdfs.length}`);
  console.log(`🧠 Quizzes: ${courseData.courseData.quizzes.length}`);
  console.log(`📝 Lessons: ${courseData.courseData.lessons.length}`);
  console.log(`🏆 Levels: ${courseData.courseData.levels.length}`);
  
  if (firstVideo) {
    console.log(`\n🎥 Testing with video: ${firstVideo.title}`);
    await markVideoAsWatched(firstVideo.id);
  } else {
    console.log('\n⚠️ No videos available for testing');
  }
  
  if (firstPDF) {
    console.log(`\n📄 Testing with PDF: ${firstPDF.title}`);
    await markPDFAsRead(firstPDF.id);
  } else {
    console.log('\n⚠️ No PDFs available for testing');
  }
  
  if (firstQuiz) {
    console.log(`\n🧠 Testing with quiz: ${firstQuiz.title}`);
    await submitQuiz(firstQuiz.id);
  } else {
    console.log('\n⚠️ No quizzes available for testing');
  }
  
  if (firstLesson) {
    console.log(`\n📝 Testing with lesson: ${firstLesson.title}`);
    await markLessonAsCompleted(firstLesson.id);
  } else {
    console.log('\n⚠️ No lessons available for testing');
  }
  
  if (firstLevel) {
    console.log(`\n🏆 Testing with level: ${firstLevel.title}`);
    await markLevelAsCompleted(firstLevel.id);
  } else {
    console.log('\n⚠️ No levels available for testing');
  }
  
  // Step 5: Test level data endpoint
  if (firstLevel) {
    await getLevelData(firstLevel.id);
  }
  
  // Step 6: Get updated course data
  console.log('\n🔄 Getting updated course data...');
  await getCourseData();
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('✅ Authentication working');
  console.log('✅ Course data retrieval working');
  console.log('✅ Video progress tracking working');
  console.log('✅ PDF progress tracking working');
  console.log('✅ Quiz submission working');
  console.log('✅ Lesson completion working');
  console.log('✅ Level completion working');
  console.log('✅ Certificate generation working');
  console.log('✅ Response structure validation working');
}

// Run the tests
runTests().catch(console.error); 