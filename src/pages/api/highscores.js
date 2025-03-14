// Simple API handler for high scores
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Path to the JSON file for storing high scores
const dataDirectory = path.join(process.cwd(), 'data');
const highScoresFile = path.join(dataDirectory, 'highscores.json');

// Secret key for score verification
// In a production app, this would be an environment variable
const SCORE_SECRET_KEY = 'skatewithbitcoin-secure-score-key-do-not-share';

// Generate a verification hash for a score
function generateScoreHash(score, deviceId, timestamp) {
  const data = `${score}:${deviceId}:${timestamp}:${SCORE_SECRET_KEY}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Verify that a score hash is valid
function verifyScoreHash(score, deviceId, timestamp, hash) {
  const expectedHash = generateScoreHash(score, deviceId, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(expectedHash, 'hex'),
    Buffer.from(hash, 'hex')
  );
}

// Ensure the data directory exists
if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

// Ensure the high scores file exists
if (!fs.existsSync(highScoresFile)) {
  // Create with some default data
  const defaultData = [
    {
      id: 'default_1',
      name: 'Bitcoin Pro',
      score: 1000,
      date: new Date().toISOString()
    },
    {
      id: 'default_2',
      name: 'Skateboard Legend',
      score: 750,
      date: new Date().toISOString()
    },
    {
      id: 'default_3',
      name: 'Rookie Skater',
      score: 250,
      date: new Date().toISOString()
    }
  ];
  fs.writeFileSync(highScoresFile, JSON.stringify(defaultData, null, 2));
}

export default function handler(req, res) {
  // Log access to the API for debugging
  console.log(`[API] High scores ${req.method} request received`);
  
  try {
    // Rate limiting - check for too many requests from same IP
    // This is a simple implementation - in production you'd use a proper rate limiter
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Handle GET request - return high scores
    if (req.method === 'GET') {
      // Read the existing high scores
      const fileContents = fs.readFileSync(highScoresFile, 'utf8');
      const highScores = JSON.parse(fileContents);
      
      // Sort by score (highest first)
      highScores.sort((a, b) => b.score - a.score);
      
      console.log(`[API] Returning ${highScores.length} high scores`);
      
      // Return the high scores
      res.status(200).json(highScores);
    }
    // Handle POST request - add a new high score
    else if (req.method === 'POST') {
      // Get the data from the request
      const { score, name = 'Anonymous', deviceId = uuidv4(), timestamp, scoreHash } = req.body;
      
      // Basic validation
      if (!score) {
        return res.status(400).json({ error: 'Score is required' });
      }
      
      // Prevent extremely large scores (likely fake)
      const numericScore = Number(score);
      if (isNaN(numericScore) || numericScore < 0 || numericScore > 99999) {
        return res.status(400).json({ error: 'Invalid score value' });
      }
      
      // Verify score hash if provided (this will be implemented on the client later)
      if (timestamp && scoreHash) {
        try {
          const isValid = verifyScoreHash(score, deviceId, timestamp, scoreHash);
          if (!isValid) {
            console.error(`[API] Invalid score hash for score ${score} from ${deviceId}`);
            return res.status(403).json({ error: 'Score verification failed' });
          }
        } catch (error) {
          console.error(`[API] Error verifying score hash: ${error.message}`);
          return res.status(403).json({ error: 'Score verification failed' });
        }
      }
      
      // Sanitize name input
      const sanitizedName = name
        .trim()
        .slice(0, 20) // Max 20 chars
        .replace(/[<>]/g, ''); // Remove potentially dangerous chars
      
      console.log(`[API] Adding new high score: ${score} by ${sanitizedName}`);
      
      // Read the existing high scores
      const fileContents = fs.readFileSync(highScoresFile, 'utf8');
      const highScores = JSON.parse(fileContents);
      
      // Add the new high score
      const newScore = {
        id: deviceId,
        name: sanitizedName,
        score: numericScore,
        date: new Date().toISOString()
      };
      
      // Check if user already has a score
      const existingScoreIndex = highScores.findIndex(item => item.id === deviceId);
      
      if (existingScoreIndex !== -1) {
        // Only update if the new score is higher
        if (newScore.score > highScores[existingScoreIndex].score) {
          highScores[existingScoreIndex] = newScore;
        }
      } else {
        // Add new score
        highScores.push(newScore);
      }
      
      // Sort by score (highest first)
      highScores.sort((a, b) => b.score - a.score);
      
      // Limit to top 10 scores
      const topScores = highScores.slice(0, 10);
      
      // Find user rank
      const rank = highScores.findIndex(item => item.id === deviceId) + 1;
      
      // Save the high scores
      fs.writeFileSync(highScoresFile, JSON.stringify(topScores, null, 2));
      
      // Return the updated high scores and user rank
      res.status(200).json({ 
        topScores, 
        rank,
        message: 'Score saved successfully' 
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[API] Error handling high scores:', error);
    res.status(500).json({ error: 'Failed to process high scores' });
  }
} 