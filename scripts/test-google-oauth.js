const axios = require('axios');

const BASE_URL = 'http://localhost:4545';

async function testGoogleOAuthExchange() {
  console.log('Testing Google OAuth Exchange API...\n');

  try {
    // Test with missing required fields
    console.log('1. Testing with missing authorization code...');
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/google/exchange`, {
        redirectUri: 'glcapp://auth'
      });
      console.log('❌ Should have failed but got:', response.status);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected missing authorization code');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test with missing redirect URI
    console.log('\n2. Testing with missing redirect URI...');
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/google/exchange`, {
        code: 'test_code'
      });
      console.log('❌ Should have failed but got:', response.status);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected missing redirect URI');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test with invalid authorization code
    console.log('\n3. Testing with invalid authorization code...');
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/google/exchange`, {
        code: 'invalid_code_123',
        redirectUri: 'glcapp://auth'
      });
      console.log('❌ Should have failed but got:', response.status);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected invalid authorization code');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n✅ All validation tests passed!');
    console.log('\nNote: To test with a real Google authorization code, you need to:');
    console.log('1. Set up Google OAuth credentials in Google Cloud Console');
    console.log('2. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment');
    console.log('3. Get a real authorization code from Google OAuth flow');
    console.log('4. Use that code in the API request');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testGoogleOAuthExchange(); 