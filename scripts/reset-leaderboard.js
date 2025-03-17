// Reset leaderboard data to only keep Satoshi's entry
const { Redis } = require('@upstash/redis');

// Redis key for high scores
const HIGH_SCORES_KEY = 'stanskate:highscores';

// Initialize Redis client with credentials from .env
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function resetLeaderboard() {
  try {
    console.log('Resetting leaderboard data...');
    
    // Create Satoshi's data entry
    const satoshiData = [
      {
        id: 'satoshi_nakamoto',
        name: 'Satoshi Nakamoto',
        score: 21000000,
        date: '2009-01-03T18:15:05.000Z'
      }
    ];
    
    // Write to Redis
    await redis.set(HIGH_SCORES_KEY, satoshiData);
    
    console.log('Leaderboard reset complete! Only Satoshi remains.');
    console.log(satoshiData);
  } catch (error) {
    console.error('Error resetting leaderboard:', error);
  }
}

// Run the reset function
resetLeaderboard(); 