const axios = require('axios');

const API_BASE_URL = 'http://localhost:4545/api';

// Test configuration
const TEST_CONFIG = {
    studentToken: 'your_student_token_here', // Replace with actual student token
    studentId: 'your_student_id_here', // Replace with actual student ID
    levelId: '1' // Test level ID
};

async function testSpecificStudentCompletionMessage() {
    console.log('🚀 Testing Specific Student Completion Message API...\n');

    const headers = {
        'Authorization': `Bearer ${TEST_CONFIG.studentToken}`,
        'Content-Type': 'application/json'
    };

    try {
        // Test: Get completion message for specific student
        console.log('📋 Test: Getting completion message for specific student...');
        console.log(`Student ID: ${TEST_CONFIG.studentId}`);
        console.log(`Level ID: ${TEST_CONFIG.levelId}`);
        
        const response = await axios.get(
            `${API_BASE_URL}/student/completion-messages/student/${TEST_CONFIG.studentId}/${TEST_CONFIG.levelId}`, 
            { headers }
        );
        
        console.log('✅ GET /student/completion-messages/student/:studentId/:levelId successful');
        console.log('📄 Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ GET /student/completion-messages/student/:studentId/:levelId failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }

    console.log('\n🎉 Specific student completion message tests completed!');
}

// Instructions for running the test
console.log('📝 Instructions:');
console.log('1. Replace TEST_CONFIG.studentToken with a valid student JWT token');
console.log('2. Replace TEST_CONFIG.studentId with a valid student ID');
console.log('3. Ensure the server is running on localhost:4545');
console.log('4. Run: node scripts/test-student-completion-message-specific.js\n');

// Run the test
testSpecificStudentCompletionMessage();
