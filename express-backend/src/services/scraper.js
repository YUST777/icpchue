import axios from 'axios';
import { extractUsername } from '../utils/helpers.js';
import { escapeHtml } from '../utils/validation.js';

// Scraper Job Queue for Rate Limiting (Prevent IP Ban)
const scraperQueue = [];
let isProcessingQueue = false;

export const addToScraperQueue = (job) => {
    scraperQueue.push(job);
    processScraperQueue();
};

const processScraperQueue = async () => {
    if (isProcessingQueue || scraperQueue.length === 0) return;
    isProcessingQueue = true;

    while (scraperQueue.length > 0) {
        const job = scraperQueue.shift();
        try {
            await job();
        } catch (err) {
            console.error('Error processing scraper job:', err);
        }
        // Rate limit: Wait 3 seconds between requests
        await new Promise(r => setTimeout(r, 3000));
    }

    isProcessingQueue = false;
};

export const scrapeLeetCode = async (username, retryCount = 0) => {
    if (!username) return null;

    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    try {
        const url = 'https://leetcode.com/graphql';
        const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStats {
            acSubmissionNum {
              difficulty
              count
            }
          }
          profile {
            ranking
            reputation
          }
        }
      }
    `;

        const response = await axios.post(
            url,
            {
                query: query,
                variables: { username: username }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            }
        );

        if (response.status === 200 && response.data) {
            const userData = response.data.data?.matchedUser;

            if (userData) {
                const submitStats = userData.submitStats?.acSubmissionNum || [];
                let totalSolved = 0;

                for (const stat of submitStats) {
                    if (stat.difficulty === 'All') {
                        totalSolved = stat.count || 0;
                        break;
                    }
                }

                const profile = userData.profile || {};

                return {
                    username: userData.username || username,
                    total_solved: totalSolved,
                    ranking: profile.ranking || null,
                    reputation: profile.reputation || null,
                    stats: submitStats
                };
            }
        }

        return null;
    } catch (error) {
        // Retry on network errors or 5xx status codes
        if ((error.response?.status >= 500 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') && retryCount < maxRetries) {
            console.log(`LeetCode API error for ${username}, retrying... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
            return scrapeLeetCode(username, retryCount + 1);
        }
        console.error(`Error scraping LeetCode profile for ${username}:`, error.message);
        return null;
    }
};

export const scrapeCodeforces = async (username, retryCount = 0) => {
    if (!username) return null;

    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    try {
        // First get user info
        const userInfoUrl = `https://codeforces.com/api/user.info?handles=${username}`;
        const userInfoResponse = await axios.get(userInfoUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        let rating = null;
        let maxRating = null;
        let rank = null;

        if (userInfoResponse.status === 200 && userInfoResponse.data?.status === 'OK') {
            const user = userInfoResponse.data.result?.[0];
            if (user) {
                rating = user.rating || null;
                maxRating = user.maxRating || null;
                rank = user.rank || null;
            }
        }

        // Then get submission stats (limit to 10000 to prevent memory spikes while covering almost all users)
        const submissionsUrl = `https://codeforces.com/api/user.status?handle=${username}&from=1&count=10000`;
        const submissionsResponse = await axios.get(submissionsUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        let totalSolved = 0;

        if (submissionsResponse.status === 200 && submissionsResponse.data?.status === 'OK') {
            const submissions = submissionsResponse.data.result || [];
            const solvedProblems = new Set();

            for (const submission of submissions) {
                if (submission.verdict === 'OK') {
                    const problem = submission.problem || {};
                    const contestId = problem.contestId || '';
                    const index = problem.index || '';
                    const problemId = `${contestId}${index}`;
                    solvedProblems.add(problemId);
                }
            }

            totalSolved = solvedProblems.size;
        }

        return {
            username: username,
            total_solved: totalSolved,
            rating: rating,
            max_rating: maxRating,
            rank: rank
        };
    } catch (error) {
        // Retry on 503 (Service Unavailable) or network errors
        if ((error.response?.status === 503 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') && retryCount < maxRetries) {
            console.log(`Codeforces API returned ${error.response?.status || error.code} for ${username}, retrying... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
            return scrapeCodeforces(username, retryCount + 1);
        }
        console.error(`Error scraping Codeforces profile for ${username}:`, error.message);
        return null;
    }
};
