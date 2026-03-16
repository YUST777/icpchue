import axios from 'axios';

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'http://judge0-server:2358';
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN;

/**
 * Shared Judge0 Service for backend operations (e.g., background judging, validation)
 */
export const judge0 = {
    async getStatus() {
        try {
            const response = await axios.get(`${JUDGE0_API_URL}/about`, {
                headers: {
                    ...(JUDGE0_AUTH_TOKEN && { 'X-Judge0-Token': JUDGE0_AUTH_TOKEN })
                }
            });
            return response.data;
        } catch (error) {
            console.error('Judge0 Service Error:', error.message);
            throw error;
        }
    },

    async createSubmission(sourceCode, languageId, stdin = '', expectedOutput = '') {
        try {
            const response = await axios.post(`${JUDGE0_API_URL}/submissions?base64_encoded=false`, {
                source_code: sourceCode,
                language_id: languageId,
                stdin,
                expected_output: expectedOutput
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(JUDGE0_AUTH_TOKEN && { 'X-Judge0-Token': JUDGE0_AUTH_TOKEN })
                }
            });
            return response.data;
        } catch (error) {
            console.error('Judge0 Submission Error:', error.message);
            throw error;
        }
    }
};
