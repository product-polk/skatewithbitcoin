import Player, { TrickType } from './Player';
import PowerUp from './PowerUp';

// Define obstacle types
export type ObstacleType = 'box' | 'ramp' | 'rail';

// Interface for collision results
export interface CollisionResult {
  type: 'crash' | 'sats' | 'none';
  points?: number;
  obstacle?: Obstacle;
}

// Image cache to avoid loading the same images multiple times
const obstacleImages: {[key: string]: HTMLImageElement} = {};

// Array of Bitcoin-themed obstacle image names
const bitcoinObstacleImages = [
  '3ac.png',
  'bitcoinetf.png.png',
  'btcenergy.png',
  'china_pboc.png',
  'elsalvador.png',
  'ftx.png',
  'halving.png',
  'luna.png',
  'MicroStrategy.png',
  'mtgox.png',
  'pizza,png.png',
  'sec_logo.png',
  'segwit.png',
  'silk_road.png',
  'tesla.png'
];

// Track which images have been used to avoid immediate repetition
let recentlyUsedImages: string[] = [];
const MAX_RECENT_IMAGES = 3; // Don't repeat the last 3 images

// Function to get a random Bitcoin-themed obstacle image
function getRandomBitcoinImage(): string {
  // Filter out recently used images if possible
  let availableImages = bitcoinObstacleImages.filter(img => !recentlyUsedImages.includes(img));
  
  // If we've filtered out all images, reset and use all of them
  if (availableImages.length === 0) {
    availableImages = bitcoinObstacleImages;
    recentlyUsedImages = [];
  }
  
  // Select a random image from the available ones
  const selectedImage = availableImages[Math.floor(Math.random() * availableImages.length)];
  
  // Add to recently used and maintain max length
  recentlyUsedImages.push(selectedImage);
  if (recentlyUsedImages.length > MAX_RECENT_IMAGES) {
    recentlyUsedImages.shift();
  }
  
  return selectedImage;
}

// Function to load an obstacle image if not already loaded
function getObstacleImage(type: ObstacleType): HTMLImageElement {
  // Generate a unique key for this obstacle instance
  const imageKey = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Create new image
  const img = new Image();
  
  // Select a random Bitcoin-themed image
  const bitcoinImage = getRandomBitcoinImage();
  img.src = `/images/Obstacles/${bitcoinImage}`;
  
  // Store in cache with unique key
  obstacleImages[imageKey] = img;
  
  img.onload = () => {
    console.log(`Loaded Bitcoin obstacle image: ${bitcoinImage}`);
  };
  
  img.onerror = (err) => {
    console.error(`Failed to load Bitcoin obstacle image: ${bitcoinImage}`, err);
    // Fallback to original obstacle image if Bitcoin image fails
    img.src = `/images/obstacle-${type}.png`;
  };
  
  return img;
}

// Base obstacle class
export class Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  speed: number = 0;
  hit: boolean = false;
  stackParent: Obstacle | null = null; // Add this property to track if an obstacle is stacked
  image: HTMLImageElement;
  imageLoaded: boolean = false;
  
  constructor(x: number, y: number, width: number, height: number, type: ObstacleType) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    
    // Load a random Bitcoin-themed image for this obstacle
    this.image = getObstacleImage(type);
    
    // Check if image is already loaded
    if (this.image.complete) {
      this.imageLoaded = true;
    } else {
      this.image.onload = () => {
        this.imageLoaded = true;
      };
    }
  }
  
  // Check collision with player
  checkCollision(player: Player): CollisionResult {
    try {
      // Basic rectangle collision detection
      const collision = (
        player.x < this.x + this.width &&
        player.x + player.width > this.x &&
        player.y < this.y + this.height &&
        player.y + player.height > this.y
      );
      
      if (!collision) return { type: 'none' };
      
      // Any collision now results in a crash - no special handling for ramps or rails
      return { 
        type: 'crash',
        obstacle: this 
      };
    } catch (err) {
      console.error('Error in Obstacle.checkCollision:', err);
      return { type: 'none' };
    }
  }
  
  // Update obstacle position
  update(deltaTime: number, playerSpeed: number) {
    try {
      // Move obstacle based on player speed
      this.x -= playerSpeed * (deltaTime / 1000);
    } catch (err) {
      console.error('Error in Obstacle.update:', err);
    }
  }
  
  // Draw obstacle
  draw(ctx: CanvasRenderingContext2D, cameraOffset: number = 0) {
    try {
      const drawX = this.x - cameraOffset;
      
      // Skip drawing if obstacle is off-screen
      if (drawX + this.width < 0 || drawX > ctx.canvas.width) {
        return;
      }
      
      // Draw obstacle image if it's loaded
      if (this.imageLoaded && this.image) {
        // If hit, draw with reduced opacity
        if (this.hit) {
          ctx.globalAlpha = 0.5;
        }
        
        // Draw a background box for the obstacle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; // Semi-transparent white background
        ctx.fillRect(
          drawX, 
          this.y, 
          this.width, 
          this.height
        );
        
        // Create a visually appealing border
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)'; // Orange border for Bitcoin theme
        ctx.lineWidth = 1.5; // Reduced border width
        ctx.strokeRect(
          drawX, 
          this.y, 
          this.width, 
          this.height
        );
        
        // Calculate dimensions that preserve aspect ratio
        const originalWidth = this.image.width || 100;
        const originalHeight = this.image.height || 100;
        
        // Calculate scaling factor while preserving aspect ratio
        let scale = Math.min(
          (this.width * 0.8) / originalWidth,
          (this.height * 0.8) / originalHeight
        );
        
        // Calculate new dimensions
        const scaledWidth = originalWidth * scale;
        const scaledHeight = originalHeight * scale;
        
        // Calculate centered position
        const centerX = drawX + (this.width - scaledWidth) / 2;
        const centerY = this.y + (this.height - scaledHeight) / 2;
        
        // Draw the image with preserved aspect ratio
        ctx.drawImage(
          this.image,
          centerX,
          centerY,
          scaledWidth,
          scaledHeight
        );
        
        // Reset opacity
        if (this.hit) {
          ctx.globalAlpha = 1.0;
        }
      } else {
        // Fallback to shapes if image is not loaded
        if (this.hit && this.type !== 'box') {
          ctx.fillStyle = '#444';
        } else {
          switch (this.type) {
            case 'box':
              ctx.fillStyle = '#8B4513'; // Brown
              break;
            case 'ramp':
              ctx.fillStyle = '#228B22'; // Green
              break;
            case 'rail':
              ctx.fillStyle = '#4682B4'; // Steel Blue
              break;
          }
        }
        
        // Draw different obstacle shapes as fallback
        if (this.type === 'ramp') {
          // Draw ramp as a triangle
          ctx.beginPath();
          ctx.moveTo(drawX, this.y + this.height);
          ctx.lineTo(drawX + this.width, this.y);
          ctx.lineTo(drawX + this.width, this.y + this.height);
          ctx.closePath();
          ctx.fillStyle = this.hit ? '#555' : '#32CD32'; // Lime Green
          ctx.fill();
        } else if (this.type === 'box') {
          // Draw box as a rectangle
          ctx.fillRect(drawX, this.y, this.width, this.height);
        } else if (this.type === 'rail') {
          // Draw rail with supports
          ctx.fillRect(drawX, this.y, this.width, this.height);
          
          // Draw supports
          ctx.fillStyle = '#2C3E50';
          const supportWidth = 5;
          const supportSpacing = Math.min(50, this.width / 2);
          
          for (let x = supportSpacing/2; x < this.width; x += supportSpacing) {
            ctx.fillRect(drawX + x - supportWidth/2, this.y + this.height, supportWidth, 20);
          }
        }
      }
      
      // For debugging hitboxes
      if (window.DEBUG_MODE) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, this.y, this.width, this.height);
        
        // Add label if debug mode
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.type, drawX + this.width / 2, this.y - 5);
      }
    } catch (err) {
      console.error('Error in Obstacle.draw:', err);
    }
  }
}

export default class ObstacleManager {
  obstacles: Obstacle[] = [];
  powerUps: PowerUp[] = [];  // Array to store active power-ups
  lastObstacleTime: number = 0;
  minDistance: number = 300;
  spawnRate: number = 2000; // ms between obstacles
  groundY: number = 400; // Raised from 450 to 400 to reduce road space
  gameSpeed: number = 200; // Starting game speed
  minObstacleSpace: number = 200; // Minimum space between obstacles
  maxJumpableHeight: number = 70; // Increased from 60 to 70 for larger obstacles while maintaining jumpability
  cameraOffset: number = 0;
  totalDistance: number = 0;
  
  // Control variables for obstacle generation
  private timeSinceLastObstacle: number = 0;
  private spawnActive: boolean = false;
  private obstacleTypes: {[key: string]: number} = { 'box': 0, 'ramp': 0, 'rail': 0 }; // Track obstacle counts
  private lastObstacleType: ObstacleType | null = null; // Track last type to avoid repeats
  private stackedObstacleChance: number = 0.3; // 30% chance of stacked obstacles
  private passedObstacles: Set<Obstacle> = new Set(); // Track obstacles that have been passed
  
  // Track current jump to only award sats once per jump
  private currentJumpId: number = 0;
  private satsAwardedThisJump: boolean = false;
  private lastScoringJumpId: number = -1;
  private playerWasJumping: boolean = false;
  
  // New variables for dynamic difficulty
  private totalGameTime: number = 0; // Track total game time
  private speedIncreaseInterval: number = 4000; // Increase speed every 4 seconds (was 5 seconds)
  private lastSpeedIncreaseTime: number = 0; // Track when we last increased speed
  private baseSpawnRate: number = 5000; // Base time between obstacles in ms (increased from 3500 to 5000)
  private maxGameSpeed: number = 600; // Maximum game speed (was 550)
  private spawnRateVariability: number = 0.5; // 50% random variance in spawn timing (reduced from 70%)
  private lastObstacleDifficulty: number = 0; // Track how difficult the last obstacle was to ensure pacing
  private obstaclePatterns: number = 0; // Counter for obstacle patterns to help vary difficulty
  private difficultyProgressionRate: number = 2.5; // How quickly difficulty increases (reduced from 3.0)
  private rapidSuccessionChance: number = 0.12; // 12% chance of creating rapid succession obstacles 
  private lastObstacleWasRapid: boolean = false; // Track if we just created a rapid succession sequence
  private initialSpeedBoost: number = 0; // Starting speed boost (now removed for playability)
  private doubleJumpObstacleChance: number = 0.08; // 8% chance of spawning obstacles that require double jumping
  private maxDoubleJumpHeight: number = 105; // Increased from 90 to 105 for larger obstacles while maintaining double-jump mechanics
  
  // Power-up management properties
  private timeSinceLastPowerUp: number = 0;  // Track time since last power-up spawned
  private powerUpSpawnRate: number = 2000;  // Base time between power-ups in ms
  private powerUpSpawnChance: number = 0.8;  // Chance of spawning when conditions are met
  private powerUpMinHeight: number = 100;   // Minimum height for power-ups (above ground)
  private powerUpMaxHeight: number = 250;   // Maximum height for power-ups
  private guaranteedPowerUpTimer: number = 0; // Timer to ensure at least one power-up per minute
  private maxPowerUpsPerMinute: number = 8; // Maximum power-ups per minute
  private powerUpsInLastMinute: number = 0; // Track power-ups created in the last minute
  private lastMinuteResetTime: number = 0;  // Track when we last reset the minute counter
  private minPowerUpSpacing: number = 1200; // Minimum time (ms) between power-ups
  private lastPowerUpDistance: number = 0;  // Track distance of last power-up for spacing
  private earlyGamePowerUpLimit: number = 3; // Limit power-ups in early game
  private earlyPowerUpCount: number = 0;    // Counter for power-ups in early game
  
  // New powerup system properties
  private powerUpInitialDelay: number = 4000; // Initial delay before any powerups can spawn
  private powerUpSystemReady: boolean = false; // Flag to track if the initial delay has passed
  private lastPowerUpXPosition: number = 0; // Track last powerup x position for spacing
  private minSpatialDistance: number = 350; // Minimum distance between powerups
  private consecutivePowerupChance: number = 0.15; // Chance of a quick followup powerup
  private isInConsecutiveSpawn: boolean = false; // Flag to track if we're in a consecutive spawn sequence
  private allowConsecutiveInEarlyGame: boolean = false; // Flag to control consecutive spawns in early game
  
  // New variables for mid-game and late-game frequency control
  private midGameSpawnRateReduction: number = 0.8; // Spawn 20% faster in mid-game
  private lateGameSpawnRateReduction: number = 0.65; // Spawn 35% faster in late game
  
  // New variables for easier start
  private gameStartGracePeriod: number = 8000; // 8 second grace period at start (increased from 6s)
  private initialObstacleDelay: number = 8000; // Delay first obstacle by 8 seconds (increased from 5s)
  private easyModeTimer: number = 20000; // Easy mode for first 20 seconds (increased from 18s)
  private firstObstacleSpawned: boolean = false; // Track if we've spawned the first obstacle
  private secondObstacleDelay: number = 4000; // Extra delay for the second obstacle
  private obstacleCountInEasyMode: number = 0; // Track how many obstacles we've spawned in easy mode
  
  constructor() {
    this.reset();
  }
  
  // Update all obstacles
  update(deltaTime: number, player: Player): CollisionResult {
    try {
      // Update game time
      this.totalGameTime += deltaTime;
      
      // Debug: Log the player's sats at the start of update
      const initialSats = player.sats;
      
      // Track player jump state to detect new jumps
      const playerIsJumping = player.state === 'jumping' || player.state === 'falling';
      
      // If player just started jumping, assign a new jump ID
      if (playerIsJumping && !this.playerWasJumping) {
        this.currentJumpId++;
        this.satsAwardedThisJump = false;
        console.log(`New jump detected: Jump #${this.currentJumpId}`);
      }
      
      // Store current jump state for next update
      this.playerWasJumping = playerIsJumping;
      
      // If player is back on ground, reset point tracking for next jump
      if (player.onGround && this.satsAwardedThisJump) {
        this.satsAwardedThisJump = false;
      }
      
      // If spawn is active, count time since last obstacle
      if (this.spawnActive) {
        this.timeSinceLastObstacle += deltaTime;
        
        // Ensure timers can't be negative (handles first run and restarts)
        // This ensures a more consistent experience across game restarts
        this.timeSinceLastPowerUp = Math.max(0, this.timeSinceLastPowerUp + deltaTime);
        this.guaranteedPowerUpTimer = Math.max(0, this.guaranteedPowerUpTimer + deltaTime);
      }
      
      // Don't activate obstacles until after the initial delay
      if (!this.spawnActive && this.totalGameTime > this.initialObstacleDelay) {
        console.log("Activating obstacle spawning after initial delay");
        this.spawnActive = true;
      }
      
      // Reset power-up counters every minute
      if (this.totalGameTime - this.lastMinuteResetTime > 60000) {
        this.powerUpsInLastMinute = 0;
        this.lastMinuteResetTime = this.totalGameTime;
        console.log("Resetting power-up minute counter");
      }
      
      // Check for increasing game speed - gentler at start
      if (this.gameSpeed < this.maxGameSpeed && 
          this.totalGameTime - this.lastSpeedIncreaseTime > this.speedIncreaseInterval) {
        // Increase speed every interval, but more gradually at the start
        const oldSpeed = this.gameSpeed;
        
        // Slower speed increases in the first 15 seconds
        let speedIncrease = 10; // Default increase
        if (this.totalGameTime < this.easyModeTimer) {
          speedIncrease = 5; // Half speed increase during easy mode
        }
        
        this.gameSpeed = Math.min(this.maxGameSpeed, this.gameSpeed + speedIncrease);
        this.lastSpeedIncreaseTime = this.totalGameTime;
        
        if (oldSpeed !== this.gameSpeed) {
          console.log(`Game speed increased to ${this.gameSpeed.toFixed(2)}`);
        }
      }
      
      // Update camera offset (from player position)
      this.cameraOffset = Math.max(0, player.x - 100);
      
      // Initial speed boost when game starts - more gentle startup
      if (this.spawnActive && player.state === 'skating') {
        if (this.totalGameTime < this.gameStartGracePeriod) {
          // First few seconds - very gentle start (reduced from 20 to 10 for slower start)
          const startupBoost = Math.min(10, (this.totalGameTime / this.gameStartGracePeriod) * 10);
          player.speed = 180 + startupBoost; // Start at 180 instead of 200 for easier beginning
          this.gameSpeed = player.speed;
        } else if (this.totalGameTime < this.easyModeTimer) {
          // Next few seconds - gentler ramp up (reduced boost from 40 to 25)
          const startupBoost = 10 + Math.min(25, ((this.totalGameTime - this.gameStartGracePeriod) / 
                              (this.easyModeTimer - this.gameStartGracePeriod)) * 25);
          player.speed = 180 + startupBoost; // Adjusted base speed
          this.gameSpeed = player.speed;
        }
      }
      
      // Track total distance traveled
      this.totalDistance += (player.velocityX * deltaTime / 1000);
      
      // Enable spawning once game started
      if (player.state === 'skating' && !this.spawnActive) {
        this.spawnActive = true;
      }
      
      // Process obstacle updates and check for sats events in one pass
      let satsResult: CollisionResult | null = null;
      
      // Update existing obstacles
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obstacle = this.obstacles[i];
        obstacle.update(deltaTime, player.velocityX);
        
        // Skip collision detection if player has crashed
        if (!player.crashed) {
          // Check for collision with player
          const collisionResult = obstacle.checkCollision(player);
          if (collisionResult.type !== 'none') {
            return collisionResult;
          }
          
          // Check if player has successfully jumped over this obstacle
          const hasPassedObstacle = player.x > obstacle.x + obstacle.width;
          
          // Track all obstacles that have been passed
          if (hasPassedObstacle && !this.passedObstacles.has(obstacle)) {
            this.passedObstacles.add(obstacle);
            
            // Only award sats for base obstacles (not for stacked parts)
            // AND only if we haven't already awarded sats for this jump
            // AND only if the player is in a jumping or falling state
            if (!obstacle.stackParent && playerIsJumping && !this.satsAwardedThisJump) {
              const pointValue = this.getObstaclePointValue(obstacle);
              
              // IMPORTANT: Set the flag BEFORE updating sats to prevent race conditions
              this.satsAwardedThisJump = true;
              this.lastScoringJumpId = this.currentJumpId;
              
              // Store player sats before adding
              const beforeSats = player.sats;
              
              // Directly update player's sats to ensure correct value
              player.sats += pointValue;
              
              console.log(`SATS EVENT: Jump #${this.currentJumpId} - Sats before: ${beforeSats}, after: ${player.sats}, sats added: ${pointValue}`);
              
              satsResult = { 
                type: 'sats', 
                points: pointValue,
                obstacle
              };
              // Don't return immediately - continue processing other obstacles
            } else if (obstacle.stackParent) {
              console.log(`Passed stacked ${obstacle.type} obstacle - no sats awarded (part of stack)`);
            } else if (this.satsAwardedThisJump && playerIsJumping) {
              console.log(`Already awarded sats for Jump #${this.currentJumpId} - no extra sats for additional obstacle`);
            } else if (!playerIsJumping) {
              console.log(`Player not jumping while passing obstacle - no sats awarded`);
            }
          }
        }
        
        // Remove obstacles that are far off-screen
        if (obstacle.x + obstacle.width < this.cameraOffset - 300) {
          this.obstacles.splice(i, 1);
          // Update obstacle type count
          if (obstacle.type in this.obstacleTypes) {
            this.obstacleTypes[obstacle.type]--;
          }
          // Also remove from passed obstacles tracker
          this.passedObstacles.delete(obstacle);
        }
      }
      
      // Generate new obstacles if needed
      if (this.spawnActive && !player.crashed) {
        this.timeSinceLastObstacle += deltaTime;
        
        // Calculate dynamic spawn rate based on game factors
        const speedFactor = Math.min(1, this.gameSpeed / this.maxGameSpeed);
        
        // Base spawn rate that decreases more aggressively as speed increases
        const adjustedBaseRate = this.baseSpawnRate - ((this.baseSpawnRate - 900) * speedFactor); // More aggressive scaling
        
        // Add more randomness to spawn rate
        const randomVariance = (-this.spawnRateVariability/2 + Math.random() * this.spawnRateVariability) * adjustedBaseRate;
        
        // Less buffer time based on obstacle difficulty
        const difficultyBuffer = this.lastObstacleDifficulty * 120; // Even less buffer (was 150)
        
        // Calculate final spawn rate with all factors
        let finalSpawnRate = adjustedBaseRate + randomVariance + difficultyBuffer;
        
        // Significantly slower obstacles at the very beginning
        if (this.totalGameTime < this.easyModeTimer) {
          // Add an additional delay that decreases as game time increases
          const startBonus = Math.max(0, (this.easyModeTimer - this.totalGameTime) / 2);
          finalSpawnRate += startBonus;
          
          // Extra delay for the first few obstacles
          if (this.obstacleCountInEasyMode < 3) {
            finalSpawnRate += (3 - this.obstacleCountInEasyMode) * 1500;
          }
        }
        
        // Special handling for first two obstacles
        if (!this.firstObstacleSpawned) {
          finalSpawnRate = this.initialObstacleDelay;
        } else if (this.obstacleCountInEasyMode === 1) {
          finalSpawnRate += this.secondObstacleDelay;
        }
        
        // Minimum reaction time decreases with speed - more aggressive
        const minReactionTime = 700 - (speedFactor * 270); // Slightly faster response required
        let safeSpawnRate = Math.max(minReactionTime, finalSpawnRate);
        
        // Occasionally force earlier spawn for rapid succession (after 10 seconds)
        let rapidSuccession = false;
        
        // Rapid succession appears after 15 seconds now (was 10)
        if (this.totalGameTime > 15000 && !this.lastObstacleWasRapid && 
            Math.random() < this.rapidSuccessionChance && 
            this.timeSinceLastObstacle > minReactionTime * 0.75) {
          
          // Force a shorter spawn time to create rapid succession effect
          safeSpawnRate = minReactionTime * 0.75;
          rapidSuccession = true;
          this.lastObstacleWasRapid = true;
          console.log("Creating rapid succession obstacle!");
        } else {
          // Reset rapid succession tracker
          this.lastObstacleWasRapid = false;
        }
        
        // Surprise spawn chances increase with game time - more aggressive
        const surpriseChance = Math.min(0.4, 0.25 + (this.totalGameTime / 50000) * 0.15); // Higher base chance (was 0.2)
        const surpriseSpawn = Math.random() < surpriseChance && this.timeSinceLastObstacle > minReactionTime * 0.8;
        
        if ((this.timeSinceLastObstacle > safeSpawnRate || surpriseSpawn) && this.canSpawnObstacle()) {
          // Create a new obstacle
          // Initially no double-jump obstacles and lower chance of difficult obstacles in easy mode
          const doubleJumpRequired = Math.random() < this.doubleJumpObstacleChance && 
                                  this.totalGameTime > this.easyModeTimer + 5000; // No double jumps in easy mode
          
          // Make the game significantly easier for the first 20 seconds
          const isEasyMode = this.totalGameTime < this.easyModeTimer;
          this.createRandomObstacle(rapidSuccession, doubleJumpRequired, isEasyMode);
          
          this.timeSinceLastObstacle = 0;
          
          // Update first obstacle tracking
          if (!this.firstObstacleSpawned) {
            this.firstObstacleSpawned = true;
          }
          
          // Count obstacles in easy mode
          if (isEasyMode) {
            this.obstacleCountInEasyMode++;
          }
          
          // More random pattern progression - higher chance of skipping
          if (Math.random() < 0.5) { // Increased randomness (was 0.4)
            // Jump to a random pattern position
            this.obstaclePatterns = Math.floor(Math.random() * 10);
          } else {
            // Normal pattern progression
            this.obstaclePatterns = (this.obstaclePatterns + 1) % 10;
          }
        }
      }
      
      // Use our new powerup system (replacing the old logic)
      if (this.spawnActive) {
        this.updatePowerUpSystem(deltaTime, this.totalGameTime);
      }
      
      // Remove off-screen obstacles
      this.obstacles = this.obstacles.filter(obstacle => {
        return obstacle.x + obstacle.width > -500; // Keep obstacles that are not too far off-screen
      });
      
      // Remove off-screen power-ups
      this.powerUps = this.powerUps.filter(powerUp => {
        return powerUp.x + powerUp.width > -500 && powerUp.active; // Keep power-ups that are not too far off-screen and still active
      });
      
      // Update obstacles
      this.obstacles.forEach(obstacle => {
        obstacle.update(deltaTime, player.velocityX);
      });
      
      // Update power-ups with proper speed
      this.powerUps.forEach(powerUp => {
        powerUp.update(deltaTime, player.velocityX);
      });
      
      // Debug: Compare sats to detect any unexpected changes
      if (player.sats !== initialSats) {
        console.log(`SATS CHANGED: from ${initialSats} to ${player.sats} (diff: ${player.sats - initialSats})`);
      }
      
      // Return sats result if we have one, otherwise check powerup collisions
      if (satsResult) {
        return satsResult;
      }
      
      // Check powerup collisions
      return this.checkPowerUpCollisionsWithoutScoring(player);
    } catch (err) {
      console.error('Error in ObstacleManager.update:', err);
      return { type: 'none' };
    }
  }
  
  // Calculate point value based on obstacle type and size
  private getObstaclePointValue(obstacle: Obstacle): number {
    try {
      // Always return 1 point per obstacle, regardless of type or size
      return 1;
    } catch (err) {
      console.error('Error calculating obstacle sats:', err);
      return 1; // Default is still 1 point
    }
  }
  
  // Check if we can spawn a new obstacle based on distance
  canSpawnObstacle(): boolean {
    if (this.obstacles.length === 0) return true;
    
    // Check the position of the last obstacle to ensure it's far enough away
    const lastObstacle = this.obstacles[this.obstacles.length - 1];
    
    // Tighter minimum space between obstacles that still scales with game speed
    const dynamicSpace = this.minObstacleSpace + (this.gameSpeed / 6);
    
    // Extra safety check but more aggressive
    const minSafeDistance = 180 + (this.gameSpeed * 0.4); // Tighter spacing (was 200 + 0.5)
    const actualSpace = lastObstacle.x < 800 - dynamicSpace;
    
    return actualSpace;
  }
  
  // Create a random obstacle
  createRandomObstacle(isRapidSuccession: boolean = false, isDoubleJumpObstacle: boolean = false, isEasyMode: boolean = false) {
    try {
      const types: ObstacleType[] = ['box', 'ramp', 'rail'];
      
      // Less type restrictions
      let typeIndex;
      if (this.lastObstacleType && Math.random() > 0.3) { // 70% chance of different type (was 60%)
        // Avoid selecting the same type twice in a row
        const filteredTypes = types.filter(t => t !== this.lastObstacleType);
        typeIndex = Math.floor(Math.random() * filteredTypes.length);
        const type = filteredTypes[typeIndex];
        this.lastObstacleType = type;
      } else {
        typeIndex = Math.floor(Math.random() * types.length);
        this.lastObstacleType = types[typeIndex];
      }
      
      // Double jump obstacles can't be rails (they're fixed height)
      if (isDoubleJumpObstacle && this.lastObstacleType === 'rail') {
        this.lastObstacleType = Math.random() < 0.5 ? 'box' : 'ramp';
      }
      
      // In easy mode, prefer ramps which are easier to jump over
      if (isEasyMode && Math.random() < 0.7) {
        this.lastObstacleType = 'ramp';
      }
      
      const type = this.lastObstacleType;
      
      // Increment type count
      this.obstacleTypes[type]++;
      
      // Determine size based on type and player limits
      let width, height;
      
      // More aggressive difficulty scaling
      const distanceFactor = Math.min(0.95, (this.totalDistance / 2500) * this.difficultyProgressionRate); 
      const speedFactor = Math.min(0.95, (this.gameSpeed / this.maxGameSpeed) * 1.4); // Even more weight on speed
      
      // In easy mode, cap difficulty
      let difficultyFactor = Math.max(distanceFactor, speedFactor);
      if (isEasyMode) {
        difficultyFactor = Math.min(difficultyFactor, 0.3); // Cap max difficulty in easy mode
      }
      
      // Introduce more dynamic difficulty patterns
      let patternDifficulty = 0;
      
      // More extreme pattern difficulty variations
      if (this.obstaclePatterns >= 7) {
        patternDifficulty = isEasyMode ? 0.2 : 0.6; // Lower difficulty in easy mode
      } else if (this.obstaclePatterns <= 2) {
        patternDifficulty = -0.15; // Easier obstacle for breathing room (was -0.2)
      }
      
      // More frequent and extreme random difficulty spikes
      if (Math.random() < 0.3) { // Increased chance (was 0.25)
        patternDifficulty += (Math.random() > 0.5 ? 0.35 : -0.25); // Larger positive swings
      }
      
      // Special handling for different obstacle types
      if (isRapidSuccession) {
        // Rapid succession obstacles should be easier to clear but placed closer
        patternDifficulty -= 0.3; // Significantly lower difficulty
      }
      
      if (isDoubleJumpObstacle) {
        // Double jump obstacles need to be extra tall but not impossible
        patternDifficulty += 0.7; // Significantly higher difficulty
        console.log("Creating a DOUBLE JUMP obstacle!");
      }
      
      // Higher difficulty ceiling but ensure still theoretically jumpable
      // In easy mode, further reduce difficulty
      let finalDifficulty = Math.min(0.95, difficultyFactor + patternDifficulty);
      if (isEasyMode) {
        finalDifficulty = Math.min(finalDifficulty, 0.4); // Cap difficulty in easy mode
      }
      
      // Size multiplication factor to make all obstacles larger (visual enhancement only)
      // The height/width ratio remains the same to maintain gameplay feel
      const sizeFactor = 1.2; // Increase all obstacle dimensions by 20%
      
      switch (type) {
        case 'box':
          // More variance in box sizes
          width = (30 + Math.random() * 55) * sizeFactor; // Increased base size: 36-102 (was 25-75)
          
          if (isDoubleJumpObstacle) {
            // Double jump boxes are taller to require double jumping
            const doubleJumpHeight = 65 + (finalDifficulty * 25); // 65-90
            height = Math.max(65, Math.min(this.maxDoubleJumpHeight, doubleJumpHeight)) * sizeFactor;
          } else if (isRapidSuccession) {
            // Rapid succession boxes are narrower and shorter
            width = (20 + Math.random() * 25) * sizeFactor; // 24-54 (was 20-45)
            const maxBoxHeight = 20 + (finalDifficulty * 15); // Lower height
            height = (15 + Math.random() * Math.min(20, maxBoxHeight)) * sizeFactor;
          } else {
            // Regular boxes with more height variation
            const maxBoxHeight = 25 + (finalDifficulty * 32); // 25-57 (was 25-55)
            height = (20 + Math.random() * Math.min(37, maxBoxHeight)) * sizeFactor;
          }
          break;
          
        case 'ramp':
          if (isDoubleJumpObstacle) {
            // Double jump ramps are taller to require double jumping
            width = (60 + Math.random() * 40) * sizeFactor; // 72-120 (was 60-100)
            const doubleJumpHeight = 70 + (finalDifficulty * 20); // 70-90
            height = Math.max(70, Math.min(this.maxDoubleJumpHeight, doubleJumpHeight)) * sizeFactor;
          } else if (isRapidSuccession) {
            // Rapid succession ramps are narrower
            width = (40 + Math.random() * 30) * sizeFactor; // 48-84 (was 40-70)
            const maxRampHeight = 30 + (finalDifficulty * 15); // Lower height
            height = (25 + Math.random() * Math.min(20, maxRampHeight)) * sizeFactor;
          } else {
            // Regular ramps with more variance
            width = (50 + Math.random() * 65) * sizeFactor; // 60-138 (was 50-115)
            const maxRampHeight = 35 + (finalDifficulty * 25); // 35-60
            height = (30 + Math.random() * Math.min(30, maxRampHeight)) * sizeFactor;
          }
          break;
          
        case 'rail':
          if (isRapidSuccession) {
            // Rapid succession rails are shorter
            width = (60 + Math.random() * 50) * sizeFactor; // 72-132 (was 60-110)
          } else {
            // Regular rails can be longer
            width = (70 + Math.random() * 110) * sizeFactor; // 84-216 (was 70-180)
          }
          height = 15 * sizeFactor; // Rails have fixed height, but sized up for visibility
          break;
          
        default:
          width = 40 * sizeFactor;
          height = 30 * sizeFactor;
      }
      
      // Make sure height is jumpable with appropriate jump type
      // We're scaling up the visuals, but need to ensure gameplay constraints are maintained
      height = isDoubleJumpObstacle 
        ? Math.min(height, this.maxDoubleJumpHeight * sizeFactor) 
        : Math.min(height, this.maxJumpableHeight * sizeFactor);
      
      // Track difficulty of this obstacle
      this.lastObstacleDifficulty = (height / (isDoubleJumpObstacle ? this.maxDoubleJumpHeight * sizeFactor : this.maxJumpableHeight * sizeFactor)) * 0.7 + (width / (180 * sizeFactor)) * 0.3;
      
      // Place obstacle with more aggressive positioning
      const surpriseOffset = Math.random() < 0.35 ? Math.random() * 150 : 0; // More surprise offsets (was 0.25)
      const rapidOffset = isRapidSuccession ? 100 + Math.random() * 50 : 0;
      
      const obstacle = new Obstacle(
        800 + this.cameraOffset - surpriseOffset - rapidOffset,
        this.groundY - height,
        width,
        height,
        type
      );
      
      this.obstacles.push(obstacle);
      console.log(`Created ${type} obstacle at ${obstacle.x} with height ${height}px and width ${width}px (difficulty: ${this.lastObstacleDifficulty.toFixed(2)}${isRapidSuccession ? ', RAPID' : ''}${isDoubleJumpObstacle ? ', DOUBLE JUMP' : ''})`);
      
      // Check if we should create a stacked obstacle - no stacking for double jump obstacles
      if (!isDoubleJumpObstacle) {
        // Stacking logic
        const stackMultiplier = isRapidSuccession ? 0.6 : 1.4; // More stacking for regular obstacles (was 1.3)
        const baseStackChance = this.stackedObstacleChance * stackMultiplier;
        const progressionBonus = finalDifficulty * 0.35; // Increases with difficulty (was 0.3)
        
        // Reduce stack chance if we've had multiple difficult obstacles
        const patternAdjustment = this.obstaclePatterns >= 7 ? -0.1 : 0;
        
        const finalStackChance = baseStackChance + progressionBonus + patternAdjustment;
        
        if (Math.random() < finalStackChance && type !== 'rail') {
          // Create a second stacked obstacle
          this.createStackedObstacle(obstacle, finalDifficulty);
          
          // Chance of creating a triple-stack for extreme challenge
          const tripleStackChance = isRapidSuccession ? 0.05 : 0.18; // 18% for regular (was 15%)
          if (finalDifficulty > 0.5 && Math.random() < tripleStackChance) {
            const doubleStackedObstacle = this.obstacles[this.obstacles.length - 1];
            if (doubleStackedObstacle && doubleStackedObstacle.stackParent === obstacle) {
              this.createStackedObstacle(doubleStackedObstacle, finalDifficulty * 0.8);
            }
          }
        }
      }
      
      return obstacle;
    } catch (err) {
      console.error('Error in ObstacleManager.createRandomObstacle:', err);
      return null;
    }
  }
  
  // Create a stacked obstacle on top of an existing one
  private createStackedObstacle(baseObstacle: Obstacle, difficultyFactor: number) {
    try {
      // Size multiplication factor to match the main obstacle sizing
      const sizeFactor = 1.2; // Keep consistent with createRandomObstacle

      // Determine what type of obstacle to stack
      // Avoid rails on top of things - that's weird
      const stackTypes: ObstacleType[] = ['box', 'ramp'];
      const randomType = stackTypes[Math.floor(Math.random() * stackTypes.length)];
      
      // Size of the stacked obstacle should be smaller
      let width, height, offsetX;
      
      // Calculate the max height based on maxJumpableHeight and base obstacle
      // Total height (base + stacked) should not exceed what a double jump can clear
      const availableHeight = (this.maxJumpableHeight * sizeFactor) - baseObstacle.height;
      
      // If there's not enough height left, don't create a stacked obstacle
      if (availableHeight < 15 * sizeFactor) return null;
      
      // Create smaller obstacle for the top - more random positioning
      switch (randomType) {
        case 'box':
          // Boxes are smaller on top, and could be offset to either side
          width = baseObstacle.width * (0.4 + Math.random() * 0.5); // 40-90% of base width (was 50-80%)
          height = (15 + Math.random() * Math.min(18, availableHeight / sizeFactor - 10)) * sizeFactor; // Adjusted for size factor
          
          // Offset within base to look stacked/balanced - more varied positions
          offsetX = Math.random() * (baseObstacle.width - width);
          break;
        case 'ramp':
          // Ramps are angled, so can be wider on top
          width = baseObstacle.width * (0.5 + Math.random() * 0.4); // 50-90% of base width (was 60-90%)
          height = (20 + Math.random() * Math.min(18, availableHeight / sizeFactor - 10)) * sizeFactor; // Adjusted for size factor
          
          // Position ramp for interesting configurations
          offsetX = Math.random() < 0.5 ? 
            // Left-aligned
            Math.random() * (baseObstacle.width * 0.3) : // More variety in position
            // Right-aligned
            baseObstacle.width - width - Math.random() * (baseObstacle.width * 0.3);
          break;
        default:
          width = baseObstacle.width * 0.7;
          height = Math.min(20 * sizeFactor, availableHeight);
          offsetX = baseObstacle.width * 0.15;
      }
      
      // Ensure the stacked obstacle height doesn't exceed available height
      height = Math.min(height, availableHeight);
      
      // Create the stacked obstacle
      const stackedObstacle = new Obstacle(
        baseObstacle.x + offsetX,
        baseObstacle.y - height, // Place on top of base obstacle
        width,
        height,
        randomType
      );
      
      // Set the stack parent reference
      stackedObstacle.stackParent = baseObstacle;
      
      this.obstacles.push(stackedObstacle);
      console.log(`Created stacked ${randomType} obstacle on top with height ${height}px and width ${width}px`);
      
      return stackedObstacle;
    } catch (err) {
      console.error('Error in ObstacleManager.createStackedObstacle:', err);
      return null;
    }
  }
  
  // Create test obstacles for debugging
  createTestObstacles() {
    try {
      this.obstacles = [];
      
      // Add a smaller ramp that's definitely jumpable
      const ramp1 = new Obstacle(400, this.groundY - 40, 80, 40, 'ramp');
      this.obstacles.push(ramp1);
      
      // Add a small box with a smaller box stacked on top
      const box1 = new Obstacle(700, this.groundY - 30, 40, 30, 'box');
      this.obstacles.push(box1);
      // Add a box on top of the first box
      const stackedBox = new Obstacle(705, box1.y - 20, 30, 20, 'box');
      stackedBox.stackParent = box1; // Set stack parent reference
      this.obstacles.push(stackedBox);
      
      // Add a rail
      this.obstacles.push(new Obstacle(1000, this.groundY - 15, 120, 15, 'rail'));
      
      // Add a ramp with a small box on top (challenging but jumpable)
      const ramp2 = new Obstacle(1300, this.groundY - 35, 70, 35, 'ramp');
      this.obstacles.push(ramp2);
      // Add box on ramp
      const rampBox = new Obstacle(1310, ramp2.y - 15, 40, 15, 'box');
      rampBox.stackParent = ramp2; // Set stack parent reference
      this.obstacles.push(rampBox);
      
      // Add a box
      this.obstacles.push(new Obstacle(1600, this.groundY - 25, 35, 25, 'box'));
      
      // Add a rail
      this.obstacles.push(new Obstacle(1900, this.groundY - 15, 100, 15, 'rail'));
      
      // Add a complex stacked obstacle (example of a harder challenge)
      const baseBox = new Obstacle(2200, this.groundY - 30, 60, 30, 'box');
      this.obstacles.push(baseBox);
      // Add ramp on top, positioned to the right side
      const topRamp = new Obstacle(2220, baseBox.y - 25, 40, 25, 'ramp');
      topRamp.stackParent = baseBox; // Set stack parent reference
      this.obstacles.push(topRamp);
      
      // Reset obstacle counters
      this.obstacleTypes = { 'box': 4, 'ramp': 3, 'rail': 2 };
      
      console.log("Created test obstacles with stacked configurations");
    } catch (err) {
      console.error('Error in ObstacleManager.createTestObstacles:', err);
    }
  }
  
  // Draw all obstacles with camera offset
  draw(ctx: CanvasRenderingContext2D) {
    try {
      // Draw obstacles
      this.obstacles.forEach(obstacle => {
        obstacle.draw(ctx, this.cameraOffset);
      });
      
      // Draw power-ups
      this.powerUps.forEach(powerUp => {
        powerUp.draw(ctx, this.cameraOffset);
      });
      
      // Draw ground - simple line across the bottom
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, this.groundY);
      ctx.lineTo(800, this.groundY);
      ctx.stroke();
      
      // Draw distance indicator in debug mode
      if (window.DEBUG_MODE) {
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`Distance: ${Math.floor(this.totalDistance)}m`, 790, 15);
        ctx.fillText(`Camera offset: ${Math.floor(this.cameraOffset)}px`, 790, 30);
        ctx.fillText(`Obstacles: ${this.obstacles.length}`, 790, 45);
      }
    } catch (err) {
      console.error('Error in ObstacleManager.draw:', err);
    }
  }
  
  // Reset obstacle manager
  reset() {
    try {
      this.obstacles = [];
      this.powerUps = [];
      this.obstacleTypes = { 'box': 0, 'ramp': 0, 'rail': 0 };
      this.passedObstacles.clear();
      this.totalGameTime = 0;
      this.lastSpeedIncreaseTime = 0;
      this.timeSinceLastObstacle = 0;
      this.spawnActive = false;
      this.gameSpeed = 200; // Reset game speed
      this.lastObstacleType = null;
      this.obstaclePatterns = 0;
      this.totalDistance = 0;
      this.firstObstacleSpawned = false;
      this.obstacleCountInEasyMode = 0;
      
      // Reset powerup system completely
      this.resetPowerUpSystem();
      
      // Reset jump tracking
      this.currentJumpId = 0;
      this.lastScoringJumpId = -1;
      this.playerWasJumping = false;
      this.satsAwardedThisJump = false;
      
      console.log('Obstacle manager fully reset, including powerup system');
    } catch (err) {
      console.error('Error in ObstacleManager.reset:', err);
    }
  }
  
  /**
   * Complete reset of the powerup system
   * Resets all relevant state for powerup generation
   */
  resetPowerUpSystem() {
    try {
      this.powerUps = [];
      
      // Start with a negative timer to enforce initial delay
      this.timeSinceLastPowerUp = -(this.powerUpInitialDelay * 2); // Extended initial delay
      this.powerUpSystemReady = false;
      this.earlyPowerUpCount = 0;
      this.powerUpsInLastMinute = 0;
      this.lastMinuteResetTime = 0;
      
      // Hard reset all power-up position tracking
      this.lastPowerUpXPosition = 0;
      
      // Configure balanced power-up frequency
      this.powerUpSpawnChance = 0.65; // Lower base chance (was 0.7)
      this.maxPowerUpsPerMinute = 5; // Further reduced from 6
      this.minPowerUpSpacing = 3000; // Significantly increased minimum spacing (was 1200)
      this.minSpatialDistance = 500; // Increased minimum spatial distance (was 350)
      
      // Eliminate consecutive spawning completely
      this.consecutivePowerupChance = 0;
      this.isInConsecutiveSpawn = false;
      
      console.log("Power-up system reset with strict anti-clustering controls");
    } catch (err) {
      console.error('Error in ObstacleManager.resetPowerUpSystem:', err);
    }
  }
  
  /**
   * Update method for powerup system - should be called from the main update
   * Handles all powerup timing, spawning decisions, and state updates
   */
  updatePowerUpSystem(delta: number, gameTime: number) {
    try {
      // Update time tracking
      this.timeSinceLastPowerUp += delta;
      
      // Only initialize the minute counter when system is ready
      if (this.lastMinuteResetTime === 0 && this.powerUpSystemReady) {
        this.lastMinuteResetTime = gameTime;
      }
      
      // Reset per-minute counter
      if (gameTime - this.lastMinuteResetTime >= 60000) {
        this.powerUpsInLastMinute = 0;
        this.lastMinuteResetTime = gameTime;
        console.log("Power-up minute counter reset");
      }
      
      // Mark system as ready once initial delay has passed
      if (!this.powerUpSystemReady && this.timeSinceLastPowerUp >= 0) {
        this.powerUpSystemReady = true;
        console.log("Power-up system ready after initial delay");
        return; // Return immediately after becoming ready (no instant spawn)
      }
      
      // PRIMARY CONTROL GATES
      // These gates must ALL pass for any spawn to occur
      
      // Gate 1: System must be ready
      if (!this.powerUpSystemReady) return;
      
      // Gate 2: Must not exceed maximum per minute
      if (this.powerUpsInLastMinute >= this.maxPowerUpsPerMinute) return;
      
      // Gate 3: Early game restrictions
      const isEarlyGame = gameTime < this.easyModeTimer;
      const isVeryEarlyGame = gameTime < this.easyModeTimer / 2;
      
      if (isEarlyGame && this.earlyPowerUpCount >= (isVeryEarlyGame ? 1 : 2)) {
        return;
      }
      
      // Gate 4: Minimum time spacing requirement (absolute)
      // Scale based on game progression
      let minTimeSpacing;
      if (isVeryEarlyGame) {
        minTimeSpacing = this.minPowerUpSpacing * 3; // First 10 seconds: very sparse
      } else if (isEarlyGame) {
        minTimeSpacing = this.minPowerUpSpacing * 2; // 10-20 seconds: sparse
      } else if (gameTime < 60000) {
        minTimeSpacing = this.minPowerUpSpacing * 1.5; // 20-60 seconds: moderately spaced
      } else {
        minTimeSpacing = this.minPowerUpSpacing; // After 60 seconds: baseline spacing
      }
      
      // INVARIANT: Never spawn before minimum time has passed
      if (this.timeSinceLastPowerUp < minTimeSpacing) {
        return;
      }
      
      // Gate 5: Check if any powerups are still on screen
      // Prevent clustering by ensuring previous powerups are collected or off-screen
      const visiblePowerUps = this.powerUps.filter(p => 
        p.x < 1200 && p.x > this.cameraOffset - 100);
      
      // If there are visible powerups, drastically reduce chance of new spawn
      let spawnChanceMultiplier = 1.0;
      if (visiblePowerUps.length > 0) {
        // With each visible powerup, reduce chance dramatically
        spawnChanceMultiplier = Math.pow(0.2, visiblePowerUps.length);
        
        // If 2+ powerups visible, almost never spawn
        if (visiblePowerUps.length >= 2) return;
      }
      
      // SPAWN DECISION LOGIC
      // Only one path to spawning with consistent rules
      
      // Base chance that gradually increases over time since last spawn
      const baseChance = this.powerUpSpawnChance;
      const timeOverMinimum = this.timeSinceLastPowerUp - minTimeSpacing;
      
      // Calculate extra chance but very gradually
      let extraChance = 0;
      if (timeOverMinimum > 0) {
        extraChance = Math.min(0.15, timeOverMinimum / 20000); // Very slow ramp up
      }
      
      // Calculate final spawn chance with all factors
      const finalChance = Math.min(0.75, baseChance + extraChance) * spawnChanceMultiplier;
      
      // Guaranteed spawn as an absolute fallback, but with a very long timer
      // This ensures players eventually get a powerup no matter what
      const guaranteedTimer = 30000; // 30 seconds absolute maximum
      
      if (this.timeSinceLastPowerUp > guaranteedTimer) {
        // Only spawn if no powerups are currently visible and we're not in very early game
        if (visiblePowerUps.length === 0 && !isVeryEarlyGame) {
          console.log(`Guaranteed power-up spawn after ${guaranteedTimer/1000}s`);
          this.spawnPowerUp();
        }
        return;
      }
      
      // Normal random spawn chance
      if (Math.random() < finalChance) {
        this.spawnPowerUp();
      }
    } catch (err) {
      console.error('Error in ObstacleManager.updatePowerUpSystem:', err);
    }
  }
  
  /**
   * Create and spawn a new powerup
   */
  spawnPowerUp() {
    try {
      // Calculate position
      const screenWidth = 800;
      let spawnX = screenWidth + this.cameraOffset + 200; // Further off-screen (was +100)
      
      // Calculate height with middle bias
      let height;
      const heightRoll = Math.random();
      
      if (heightRoll < 0.2) { // 20% chance for low powerup
        height = this.powerUpMinHeight + Math.random() * 50;
      } else if (heightRoll < 0.9) { // 70% chance for middle range
        height = this.powerUpMinHeight + 50 + Math.random() * 100;
      } else { // 10% chance for high powerup
        height = this.powerUpMaxHeight - 50 + Math.random() * 50;
      }
      
      // ENSURE PROPER SPATIAL DISTRIBUTION
      if (this.lastPowerUpXPosition > 0) {
        // Calculate minimum distance based on game time
        let distanceFactor;
        
        if (this.totalGameTime < 10000) { // First 10 seconds
          distanceFactor = 4.0; // Even stricter in very early game
        } else if (this.totalGameTime < 20000) { // 10-20 seconds
          distanceFactor = 3.0; // Stricter in early game
        } else if (this.totalGameTime < 40000) { // 20-40 seconds
          distanceFactor = 2.0; // Strict in mid-early game
        } else {
          distanceFactor = 1.5; // Always maintain 1.5x spacing minimum
        }
        
        const requiredDistance = this.minSpatialDistance * distanceFactor;
        
        // ENFORCE strict minimum distance
        if (spawnX - this.lastPowerUpXPosition < requiredDistance) {
          spawnX = this.lastPowerUpXPosition + requiredDistance;
          console.log(`Adjusted power-up position to maintain ${requiredDistance}px distance`);
        }
      }
      
      // Create the power-up
      const powerUp = new PowerUp({
        x: spawnX, 
        y: this.groundY - height,
        type: this.getRandomTrickType()
      });
      
      // Add to active power-ups
      this.powerUps.push(powerUp);
      
      // Update tracking variables
      this.lastPowerUpXPosition = spawnX;
      this.timeSinceLastPowerUp = 0;
      this.powerUpsInLastMinute++;
      
      // Update early game counter if applicable
      if (this.totalGameTime < this.easyModeTimer) {
        this.earlyPowerUpCount++;
      }
      
      // Debug logging
      console.log(`Power-up spawned at ${Math.round(this.totalGameTime/1000)}s, X=${Math.round(spawnX)}, Total: ${this.powerUpsInLastMinute}/${this.maxPowerUpsPerMinute} this minute`);
    } catch (err) {
      console.error('Error in ObstacleManager.spawnPowerUp:', err);
    }
  }
  
  // Helper method to get a random trick type
  private getRandomTrickType(): TrickType {
    const trickTypes: TrickType[] = ['blockflip', 'hashspin', 'hodlgrab'];
    return trickTypes[Math.floor(Math.random() * trickTypes.length)];
  }
  
  // Version that doesn't award sats for power-ups to avoid double scoring
  checkPowerUpCollisionsWithoutScoring(player: Player): CollisionResult {
    try {
      // Only check for power-up collisions if player is in the air (jumping)
      if ((player.state === 'jumping' || player.state === 'falling') && !player.crashed) {
        for (const powerUp of this.powerUps) {
          if (powerUp.checkCollision(player)) {
            // Only collect if player doesn't already have a power-up
            if (player.currentPowerUp === 'none') {
              console.log(`Player collected power-up: ${powerUp.type}`);
              powerUp.collect();
              player.collectPowerUp(powerUp.type);
              // Return type 'none' to avoid adding sats here
              return { type: 'none' };
            } else {
              console.log('Player already has a power-up, cannot collect another');
              return { type: 'none' };
            }
          }
        }
      }
      
      // No collisions
      return { type: 'none' };
    } catch (err) {
      console.error('Error in ObstacleManager.checkPowerUpCollisionsWithoutScoring:', err);
      return { type: 'none' };
    }
  }

  // Update the checkPowerUpCollisions method to be consistent
  checkPowerUpCollisions(player: Player): CollisionResult {
    // Just delegate to the new method to ensure consistent behavior
    return this.checkPowerUpCollisionsWithoutScoring(player);
  }

  // Maintain the original method signature for compatibility
  // This only checks for crash collisions now, not scoring
  checkCollisions(player: Player): CollisionResult {
    try {
      // First check for obstacle collisions
      for (const obstacle of this.obstacles) {
        // Skip already hit obstacles
        if (obstacle.hit) continue;
        
        const result = obstacle.checkCollision(player);
        
        // If there's a collision, mark the obstacle as hit and return result
        if (result.type !== 'none') {
          obstacle.hit = true;
          
          if (result.type === 'crash') {
            console.log('Player crashed into obstacle');
            return result;
          }
          // No longer returning sats results from here
        }
      }
      
      // Check for power-up collisions without adding sats
      return this.checkPowerUpCollisionsWithoutScoring(player);
    } catch (err) {
      console.error('Error in ObstacleManager.checkCollisions:', err);
      return { type: 'none' };
    }
  }
} 