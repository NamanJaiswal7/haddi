const axios = require('axios');

const API_BASE_URL = 'http://localhost:4545/api';

// Test data
const testMessage = {
  classId: "6th",
  levelId: "Level 1",
  message: "🎉 Congratulations! You have successfully completed Level 1. Your dedication to spiritual learning is inspiring!"
};

const updatedMessage = {
  classId: "6th",
  levelId: "Level 1",
  message: "🌟 Updated congratulations message for Level 1 completion!"
};

async function getMasterAdminToken() {
  try {
    console.log('🔐 Getting master admin token...');
    
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

async function testCompletionMessagesAPI() {
  try {
    console.log('🚀 Starting Completion Messages API Tests...\n');

    // Get master admin token
    const token = await getMasterAdminToken();
    console.log('✅ Master admin token obtained\n');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test 1: Get all completion messages (should be empty initially)
    console.log('📋 Test 1: Getting all completion messages...');
    try {
      const response = await axios.get(`${API_BASE_URL}/master-admin/completion-messages`, { headers });
      console.log('✅ GET /completion-messages successful');
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('❌ GET /completion-messages failed:', error.response?.data || error.message);
    }
    console.log('');

    // Test 2: Create a new completion message
    console.log('📝 Test 2: Creating a new completion message...');
    try {
      const response = await axios.post(`${API_BASE_URL}/master-admin/completion-messages`, testMessage, { headers });
      console.log('✅ POST /completion-messages successful');
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      const messageId = response.data.data.id;
      console.log('🆔 Created message ID:', messageId);
    } catch (error) {
      console.error('❌ POST /completion-messages failed:', error.response?.data || error.message);
      return;
    }
    console.log('');

    // Test 3: Get all completion messages again (should have one message)
    console.log('📋 Test 3: Getting all completion messages (should have one)...');
    try {
      const response = await axios.get(`${API_BASE_URL}/master-admin/completion-messages`, { headers });
      console.log('✅ GET /completion-messages successful');
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      const messageId = response.data.data[0].id;
      console.log('🆔 Message ID:', messageId);
    } catch (error) {
      console.error('❌ GET /completion-messages failed:', error.response?.data || error.message);
      return;
    }
    console.log('');

    // Test 4: Update the completion message
    console.log('✏️ Test 4: Updating the completion message...');
    try {
      const response = await axios.get(`${API_BASE_URL}/master-admin/completion-messages`, { headers });
      const messageId = response.data.data[0].id;
      
      const updateResponse = await axios.put(`${API_BASE_URL}/master-admin/completion-messages/${messageId}`, updatedMessage, { headers });
      console.log('✅ PUT /completion-messages/:id successful');
      console.log('📊 Response:', JSON.stringify(updateResponse.data, null, 2));
    } catch (error) {
      console.error('❌ PUT /completion-messages/:id failed:', error.response?.data || error.message);
    }
    console.log('');

    // Test 5: Test student endpoint (should fail without student token)
    console.log('👨‍🎓 Test 5: Testing student endpoint without student token...');
    try {
      const response = await axios.get(`${API_BASE_URL}/student/completion-messages/6th/Level 1`);
      console.log('❌ This should have failed (no authentication)');
    } catch (error) {
      console.log('✅ Student endpoint correctly requires authentication');
      console.log('📊 Error:', error.response?.status, error.response?.data?.message);
    }
    console.log('');

    // Test 6: Delete the completion message
    console.log('🗑️ Test 6: Deleting the completion message...');
    try {
      const response = await axios.get(`${API_BASE_URL}/master-admin/completion-messages`, { headers });
      const messageId = response.data.data[0].id;
      
      const deleteResponse = await axios.delete(`${API_BASE_URL}/master-admin/completion-messages/${messageId}`, { headers });
      console.log('✅ DELETE /completion-messages/:id successful');
      console.log('📊 Response:', JSON.stringify(deleteResponse.data, null, 2));
    } catch (error) {
      console.error('❌ DELETE /completion-messages/:id failed:', error.response?.data || error.message);
    }
    console.log('');

    // Test 7: Verify deletion
    console.log('📋 Test 7: Verifying deletion...');
    try {
      const response = await axios.get(`${API_BASE_URL}/master-admin/completion-messages`, { headers });
      console.log('✅ GET /completion-messages successful');
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      console.log('📊 Message count:', response.data.data.length);
    } catch (error) {
      console.error('❌ GET /completion-messages failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run the tests
testCompletionMessagesAPI(); 