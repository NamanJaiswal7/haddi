import axios from 'axios';

const API_BASE_URL = 'http://localhost:4545/api';

async function getMasterAdminToken() {
  try {
    console.log('🔐 Getting master admin token...');
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'master@haddi.com',
      password: 'master123'
    });

    const token = response.data.token;
    console.log('✅ Master admin token obtained successfully!');
    console.log('\n📋 Token:');
    console.log(token);
    console.log('\n💡 Copy this token and replace MASTER_ADMIN_TOKEN in create-level1-courses.ts');
    
    return token;
  } catch (error: any) {
    console.error('❌ Error getting master admin token:', error.response?.data || error.message);
    throw error;
  }
}

getMasterAdminToken(); 