const axios = require('axios');

const BASE_URL = 'http://localhost:4545/api';
const MASTER_ADMIN_TOKEN = 'your_master_admin_token_here'; // Replace with actual token
const STUDENT_TOKEN = 'your_student_token_here'; // Replace with actual token

const masterAdminHeaders = {
    'Authorization': `Bearer ${MASTER_ADMIN_TOKEN}`,
    'Content-Type': 'application/json'
};

const studentHeaders = {
    'Authorization': `Bearer ${STUDENT_TOKEN}`,
    'Content-Type': 'application/json'
};

async function testQuizValidityAPI() {
    console.log('🧪 Testing Quiz Validity API...\n');

    try {
        // Test 1: Get all quiz validity periods (Master Admin)
        console.log('1️⃣ Testing GET /master-admin/quiz-validity');
        const getResponse = await axios.get(`${BASE_URL}/master-admin/quiz-validity`, { headers: masterAdminHeaders });
        console.log('✅ GET Master Admin Response:', getResponse.data);
        console.log('');

        // Test 1b: Get quiz validity periods for student's class
        console.log('1b️⃣ Testing GET /student/quiz-validity');
        const getStudentResponse = await axios.get(`${BASE_URL}/student/quiz-validity`, { headers: studentHeaders });
        console.log('✅ GET Student Response:', getStudentResponse.data);
        console.log('');

        // Test 2: Create a new quiz validity period
        console.log('2️⃣ Testing POST /master-admin/quiz-validity');
        const createData = {
            classId: "6th",
            level: "Level 1",
            validUntilDate: "2024-12-31",
            validUntilTime: "23:59"
        };
        
        const createResponse = await axios.post(`${BASE_URL}/master-admin/quiz-validity`, createData, { headers: masterAdminHeaders });
        console.log('✅ POST Response:', createResponse.data);
        
        const validityId = createResponse.data.data.id;
        console.log('');

        // Test 3: Update the quiz validity period
        console.log('3️⃣ Testing PUT /master-admin/quiz-validity/:id');
        const updateData = {
            classId: "6th",
            level: "Level 1",
            validUntilDate: "2024-11-30",
            validUntilTime: "18:00"
        };
        
        const updateResponse = await axios.put(`${BASE_URL}/master-admin/quiz-validity/${validityId}`, updateData, { headers: masterAdminHeaders });
        console.log('✅ PUT Response:', updateResponse.data);
        console.log('');

        // Test 4: Get all validity periods again to see the update
        console.log('4️⃣ Testing GET /master-admin/quiz-validity (after update)');
        const getUpdatedResponse = await axios.get(`${BASE_URL}/master-admin/quiz-validity`, { headers: masterAdminHeaders });
        console.log('✅ GET Updated Response:', getUpdatedResponse.data);
        console.log('');

        // Test 5: Delete the quiz validity period
        console.log('5️⃣ Testing DELETE /master-admin/quiz-validity/:id');
        const deleteResponse = await axios.delete(`${BASE_URL}/master-admin/quiz-validity/${validityId}`, { headers: masterAdminHeaders });
        console.log('✅ DELETE Response:', deleteResponse.data);
        console.log('');

        // Test 6: Verify deletion
        console.log('6️⃣ Testing GET /master-admin/quiz-validity (after deletion)');
        const getFinalResponse = await axios.get(`${BASE_URL}/master-admin/quiz-validity`, { headers: masterAdminHeaders });
        console.log('✅ GET Final Response:', getFinalResponse.data);
        console.log('');

        console.log('🎉 All Quiz Validity API tests completed successfully!');

    } catch (error) {
        console.error('❌ Error testing Quiz Validity API:', error.response?.data || error.message);
    }
}

// Run the test
testQuizValidityAPI(); 