import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Define the high score data structure
type HighScore = {
  id: string;
  score: number;
  name: string;
  date: string;
};

// Path to the high scores JSON file
const HIGH_SCORES_FILE = path.join(process.cwd(), 'data', 'highscores.json');

// Secret key for sats verification
// In a production app, this would be an environment variable
const SATS_SECRET_KEY = 'skatewithbitcoin-secure-score-key-do-not-share';

// Generate a verification hash for sats
function generateScoreHash(score: number, deviceId: string, timestamp: string) {
  const data = `${score}:${deviceId}:${timestamp}:${SATS_SECRET_KEY}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Verify that a sats hash is valid
function verifyScoreHash(score: number, deviceId: string, timestamp: string, hash: string) {
  const expectedHash = generateScoreHash(score, deviceId, timestamp);
  return crypto.timingSafeEqual(
    Buffer.from(expectedHash, 'hex'),
    Buffer.from(hash, 'hex')
  );
}

// Ensure the data directory exists
const ensureDataDir = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Read high scores from file
const getHighScores = (): HighScore[] => {
  try {
    ensureDataDir();
    if (!fs.existsSync(HIGH_SCORES_FILE)) {
      // Create with some default data if file doesn't exist
      const defaultData: HighScore[] = [
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
      saveHighScores(defaultData);
      return defaultData;
    }
    const data = fs.readFileSync(HIGH_SCORES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading high scores:', error);
    return [];
  }
};

// Save high scores to file
const saveHighScores = (highScores: HighScore[]) => {
  try {
    ensureDataDir();
    fs.writeFileSync(HIGH_SCORES_FILE, JSON.stringify(highScores, null, 2));
  } catch (error) {
    console.error('Error saving high scores:', error);
  }
};

// Get top high scores - only returns top 10
export async function GET() {
  const highScores = getHighScores();
  
  // Sort by score (descending) and take top 10
  const topScores = highScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  return NextResponse.json(topScores);
}

// Add a new high score
export async function POST(request: Request) {
  try {
    const { score, name = 'Anonymous', deviceId = uuidv4(), timestamp, scoreHash } = await request.json();
    
    // Basic validation
    if (!score) {
      return NextResponse.json(
        { error: 'Sats amount is required' },
        { status: 400 }
      );
    }
    
    // Prevent extremely large scores (likely fake)
    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 99999) {
      return NextResponse.json(
        { error: 'Invalid sats value' },
        { status: 400 }
      );
    }
    
    // Verify score hash if provided
    if (timestamp && scoreHash) {
      try {
        const isValid = verifyScoreHash(numericScore, deviceId, timestamp, scoreHash);
        if (!isValid) {
          console.error(`[API] Invalid sats hash for score ${score} from ${deviceId}`);
          return NextResponse.json(
            { error: 'Sats verification failed' },
            { status: 403 }
          );
        }
      } catch (error) {
        console.error(`[API] Error verifying sats hash:`, error);
        return NextResponse.json(
          { error: 'Sats verification failed' },
          { status: 403 }
        );
      }
    }
    
    // Sanitize name input
    const sanitizedName = typeof name === 'string' 
      ? name.trim().slice(0, 20).replace(/[<>]/g, '')
      : 'Anonymous';
    
    // Get existing high scores
    const highScores = getHighScores();
    
    // Check if this device already has a high score
    const existingScoreIndex = highScores.findIndex(s => s.id === deviceId);
    
    // Create the new score object
    const newScore: HighScore = {
      id: deviceId,
      score: numericScore,
      name: sanitizedName,
      date: new Date().toISOString(),
    };
    
    // If this device already has a score, update it if the new score is higher
    if (existingScoreIndex !== -1) {
      if (numericScore > highScores[existingScoreIndex].score) {
        highScores[existingScoreIndex] = newScore;
      }
    } else {
      // Add the new high score
      highScores.push(newScore);
    }
    
    // Sort by score (descending)
    highScores.sort((a, b) => b.score - a.score);
    
    // Get top 10 scores
    const topScores = highScores.slice(0, 10);
    
    // Find user rank
    const rank = highScores.findIndex(item => item.id === deviceId) + 1;
    
    // Save the updated high scores
    saveHighScores(topScores);
    
    return NextResponse.json({
      topScores,
      rank,
      message: 'Sats saved successfully'
    });
  } catch (error) {
    console.error('Error adding high score:', error);
    return NextResponse.json(
      { error: 'Failed to add high score' },
      { status: 500 }
    );
  }
} 