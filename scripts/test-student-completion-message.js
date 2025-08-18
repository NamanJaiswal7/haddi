const axios = require('axios');

const API_BASE_URL = 'http://localhost:4545/api';

async function getStudentToken() {
  try {
    console.log('🔐 Getting student token...');
    
    const response = await axios.post(`${API_BASE_URL}/auth/student-signin`, {
      email: 'student@example.com',
      password: 'password123'
    });

    return response.data.token;
  } catch (error) {
    console.error('❌ Error getting student token:', error.response?.data || error.message);
    throw error;
  }
}

async function testStudentCompletionMessage() {
  try {
    console.log('🚀 Testing Student Completion Message API...\n');

    // Get student token
    const token = await getStudentToken();
    console.log('✅ Student token obtained\n');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // First, create a completion message using master admin token
    console.log('📝 Creating a completion message for testing...');
    const masterToken = await getMasterAdminToken();
    const masterHeaders = {
      'Authorization': `Bearer ${masterToken}`,
      'Content-Type': 'application/json'
    };

    const testMessage = {
      classId: "10th",
      levelId: "1",
      message: "🎉 Congratulations! You have successfully completed Level 1. Your dedication to spiritual learning is inspiring!"
    };

    try {
      const createResponse = await axios.post(`${API_BASE_URL}/master-admin/completion-messages`, testMessage, { headers: masterHeaders });
      console.log('✅ Created test completion message');
    } catch (error) {
      console.log('ℹ️ Completion message already exists or error:', error.response?.data?.message || error.message);
    }

    // Test 1: Get completion message for student's class and level
    console.log('\n📋 Test 1: Getting completion message for student...');
    try {
      const response = await axios.get(`${API_BASE_URL}/student/completion-messages/10th/1`, { headers });
      console.log('✅ GET /student/completion-messages/:classId/:levelId successful');
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('❌ GET /student/completion-messages/:classId/:levelId failed:', error.response?.data || error.message);
    }

    // Test 2: Try to get completion message for non-existent class/level
    console.log('\n📋 Test 2: Getting completion message for non-existent class/level...');
    try {
      const response = await axios.get(`${API_BASE_URL}/student/completion-messages/12th/999`, { headers });
      console.log('❌ This should have failed (no message found)');
    } catch (error) {
      console.log('✅ Correctly returned 404 for non-existent message');
      console.log('📊 Error:', error.response?.status, error.response?.data?.message);
    }

    console.log('\n🎉 Student completion message tests completed!');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

async function getMasterAdminToken() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'master@haddi.com',
      password: 'admin123',
      role: 'master_admin'
    });
    return response.data.token;
  } catch (error) {
    console.error('❌ Error getting master admin token:', error.response?.data || error.message);
    throw error;
  }
}

// Run the tests
testStudentCompletionMessage(); 