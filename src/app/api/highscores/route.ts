import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define the high score data structure
type HighScore = {
  id: string;
  score: number;
  name: string;
  date: string;
};

// Path to the high scores JSON file
const HIGH_SCORES_FILE = path.join(process.cwd(), 'data', 'highscores.json');

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
      return [];
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
    const { score, name = 'Anonymous', deviceId } = await request.json();
    
    // Validate the score (must be a number)
    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json(
        { error: 'Invalid score. Score must be a positive number.' },
        { status: 400 }
      );
    }
    
    // Get existing high scores
    const highScores = getHighScores();
    
    // Check if this device already has a high score
    const existingScoreIndex = deviceId 
      ? highScores.findIndex(s => s.id === deviceId)
      : -1;
    
    // If this device already has a score, update it if the new score is higher
    if (existingScoreIndex !== -1) {
      if (score > highScores[existingScoreIndex].score) {
        highScores[existingScoreIndex] = {
          ...highScores[existingScoreIndex],
          score,
          date: new Date().toISOString(),
        };
        saveHighScores(highScores);
      }
    } else {
      // Generate a new ID if none provided
      const id = deviceId || uuidv4();
      
      // Add the new high score
      highScores.push({
        id,
        score,
        name,
        date: new Date().toISOString(),
      });
      
      // Save the updated high scores
      saveHighScores(highScores);
    }
    
    // Get the updated top scores
    const topScores = highScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    return NextResponse.json({
      success: true,
      rank: topScores.findIndex(s => 
        (deviceId && s.id === deviceId) || 
        (!deviceId && s.score === score && s.name === name)
      ) + 1,
      topScores,
    });
  } catch (error) {
    console.error('Error adding high score:', error);
    return NextResponse.json(
      { error: 'Failed to add high score.' },
      { status: 500 }
    );
  }
} 