const axios = require('axios');

const BASE_URL = 'http://localhost:4545/api';
const MASTER_ADMIN_TOKEN = 'your_master_admin_token_here'; // Replace with actual token

const headers = {
    'Authorization': `Bearer ${MASTER_ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
};

async function testLevelSchedulesAPI() {
    console.log('🧪 Testing Level Schedules API...\n');

    try {
        // Test 1: Get all level schedules (Master Admin endpoint)
        console.log('1️⃣ Testing GET /master-admin/level-schedules');
        const getResponse = await axios.get(`${BASE_URL}/master-admin/level-schedules`, { headers });
        console.log('✅ GET Master Admin Response:', getResponse.data);
        console.log('');

        // Test 1b: Get all level schedules (Student endpoint)
        console.log('1b️⃣ Testing GET /student/level-schedules');
        const getStudentResponse = await axios.get(`${BASE_URL}/student/level-schedules`, { headers });
        console.log('✅ GET Student Response:', getStudentResponse.data);
        console.log('');

        // Test 2: Create a new level schedule
        console.log('2️⃣ Testing POST /master-admin/level-schedules');
        const createData = {
            classId: "6th",
            level: "Level 1",
            unlockDate: "2024-01-15",
            unlockTime: "09:00"
        };
        
        const createResponse = await axios.post(`${BASE_URL}/master-admin/level-schedules`, createData, { headers });
        console.log('✅ POST Response:', createResponse.data);
        
        const scheduleId = createResponse.data.data.id;
        console.log('');

        // Test 3: Update the level schedule
        console.log('3️⃣ Testing PUT /master-admin/level-schedules/:id');
        const updateData = {
            classId: "6th",
            level: "Level 1",
            unlockDate: "2024-01-20",
            unlockTime: "10:00"
        };
        
        const updateResponse = await axios.put(`${BASE_URL}/master-admin/level-schedules/${scheduleId}`, updateData, { headers });
        console.log('✅ PUT Response:', updateResponse.data);
        console.log('');

        // Test 4: Get all schedules again to see the update
        console.log('4️⃣ Testing GET /master-admin/level-schedules (after update)');
        const getUpdatedResponse = await axios.get(`${BASE_URL}/master-admin/level-schedules`, { headers });
        console.log('✅ GET Updated Response:', getUpdatedResponse.data);
        console.log('');

        // Test 5: Delete the level schedule
        console.log('5️⃣ Testing DELETE /master-admin/level-schedules/:id');
        const deleteResponse = await axios.delete(`${BASE_URL}/master-admin/level-schedules/${scheduleId}`, { headers });
        console.log('✅ DELETE Response:', deleteResponse.data);
        console.log('');

        // Test 6: Verify deletion
        console.log('6️⃣ Testing GET /master-admin/level-schedules (after deletion)');
        const getFinalResponse = await axios.get(`${BASE_URL}/master-admin/level-schedules`, { headers });
        console.log('✅ GET Final Response:', getFinalResponse.data);
        console.log('');

        console.log('🎉 All Level Schedules API tests completed successfully!');

    } catch (error) {
        console.error('❌ Error testing Level Schedules API:', error.response?.data || error.message);
    }
}

// Run the test
testLevelSchedulesAPI(); 