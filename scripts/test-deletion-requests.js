const axios = require('axios');

const BASE_URL = 'http://localhost:4545';

const TEST_CONFIG = {
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

async function testDeletionRequests() {
  console.log('🧪 Testing Deletion Request Endpoints...\n');

  try {
    // Test 1: Submit deletion request
    console.log('1️⃣ Testing POST /api/deletion-requests');
    const submitResponse = await axios.post('/api/deletion-requests', {
      deletionType: 'DATA',
      userInfo: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        studentId: 'TEST123'
      },
      dataTypes: ['personal', 'educational'],
      reason: 'Testing deletion request functionality',
      userId: null
    }, TEST_CONFIG);

    console.log('✅ Submit deletion request successful');
    console.log('   Request ID:', submitResponse.data.requestId);
    console.log('   Response:', submitResponse.data);
    
    const requestId = submitResponse.data.requestId;

    // Test 2: Get deletion request status
    console.log('\n2️⃣ Testing GET /api/deletion-requests/:requestId');
    const statusResponse = await axios.get(`/api/deletion-requests/${requestId}`, TEST_CONFIG);
    
    console.log('✅ Get deletion request status successful');
    console.log('   Status:', statusResponse.data.status);
    console.log('   Response:', statusResponse.data);

    // Test 3: Cancel deletion request
    console.log('\n3️⃣ Testing PUT /api/deletion-requests/:requestId/cancel');
    const cancelResponse = await axios.put(`/api/deletion-requests/${requestId}/cancel`, {}, TEST_CONFIG);
    
    console.log('✅ Cancel deletion request successful');
    console.log('   Response:', cancelResponse.data);

    // Test 4: Get updated status after cancellation
    console.log('\n4️⃣ Testing GET /api/deletion-requests/:requestId (after cancellation)');
    const updatedStatusResponse = await axios.get(`/api/deletion-requests/${requestId}`, TEST_CONFIG);
    
    console.log('✅ Get updated status successful');
    console.log('   Status:', updatedStatusResponse.data.status);
    console.log('   Response:', updatedStatusResponse.data);

    console.log('\n🎉 All deletion request tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the tests
testDeletionRequests();
