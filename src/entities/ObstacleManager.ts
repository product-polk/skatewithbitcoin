import Player from './Player';

// Define obstacle types
export type ObstacleType = 'box' | 'ramp' | 'rail';

// Interface for collision results
export interface CollisionResult {
  type: 'crash' | 'score' | 'none';
  points?: number;
  obstacle?: Obstacle;
}

// Image cache to avoid loading the same images multiple times
const obstacleImages: {[key: string]: HTMLImageElement} = {};

// Function to load an obstacle image if not already loaded
function getObstacleImage(type: ObstacleType): HTMLImageElement {
  if (!obstacleImages[type]) {
    const img = new Image();
    img.src = `/images/obstacle-${type}.png`;
    obstacleImages[type] = img;
    
    img.onload = () => {
      console.log(`Loaded obstacle image: ${type}`);
    };
    
    img.onerror = (err) => {
      console.error(`Failed to load obstacle image: ${type}`, err);
    };
  }
  
  return obstacleImages[type];
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
    
    // Load the image for this obstacle type
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
        
        // Draw the image
        ctx.drawImage(
          this.image,
          drawX,
          this.y,
          this.width,
          this.height
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
  lastObstacleTime: number = 0;
  minDistance: number = 300;
  spawnRate: number = 2000; // ms between obstacles
  groundY: number = 400;
  gameSpeed: number = 200; // Starting game speed
  minObstacleSpace: number = 200; // Minimum space between obstacles
  maxJumpableHeight: number = 60; // Maximum height player can jump over (reduced from 80)
  cameraOffset: number = 0;
  totalDistance: number = 0;
  
  // Control variables for obstacle generation
  private timeSinceLastObstacle: number = 0;
  private spawnActive: boolean = false;
  private obstacleTypes: {[key: string]: number} = { 'box': 0, 'ramp': 0, 'rail': 0 }; // Track obstacle counts
  private lastObstacleType: ObstacleType | null = null; // Track last type to avoid repeats
  private stackedObstacleChance: number = 0.3; // 30% chance of stacked obstacles
  private passedObstacles: Set<Obstacle> = new Set(); // Track obstacles that have been passed
  
  // New variables for dynamic difficulty
  private totalGameTime: number = 0; // Track total game time
  private speedIncreaseInterval: number = 4000; // Increase speed every 4 seconds (was 5 seconds)
  private lastSpeedIncreaseTime: number = 0; // Track when we last increased speed
  private baseSpawnRate: number = 2200; // Base time between obstacles in ms (was 2500)
  private maxGameSpeed: number = 600; // Maximum game speed (was 550)
  private spawnRateVariability: number = 0.9; // 90% random variance in spawn timing (was 80%)
  private lastObstacleDifficulty: number = 0; // Track how difficult the last obstacle was to ensure pacing
  private obstaclePatterns: number = 0; // Counter for obstacle patterns to help vary difficulty
  private difficultyProgressionRate: number = 3.0; // How quickly difficulty increases (was 2.5)
  private rapidSuccessionChance: number = 0.12; // 12% chance of creating rapid succession obstacles 
  private lastObstacleWasRapid: boolean = false; // Track if we just created a rapid succession sequence
  private initialSpeedBoost: number = 0; // Starting speed boost (now removed for playability)
  private doubleJumpObstacleChance: number = 0.08; // 8% chance of spawning obstacles that require double jumping
  private maxDoubleJumpHeight: number = 90; // Maximum height for double-jump obstacles (regular max is 60)
  
  constructor() {
    this.reset();
  }
  
  // Update all obstacles
  update(deltaTime: number, player: Player): CollisionResult {
    try {
      // Track total game time for difficulty progression
      this.totalGameTime += deltaTime;
      
      // Update camera offset (from player position)
      this.cameraOffset = Math.max(0, player.x - 100);
      
      // Initial speed boost when game starts - more aggressive after initial grace period
      if (this.spawnActive && player.state === 'skating') {
        if (this.totalGameTime < 3000) {
          // First 3 seconds - gentle start
          const startupBoost = Math.min(20, (this.totalGameTime / 3000) * 20);
          player.speed = 200 + startupBoost;
          this.gameSpeed = player.speed;
        } else if (this.totalGameTime < 10000) {
          // 3-10 seconds - more aggressive ramp up
          const startupBoost = 20 + Math.min(40, ((this.totalGameTime - 3000) / 7000) * 40);
          player.speed = 200 + startupBoost;
          this.gameSpeed = player.speed;
        }
      }
      
      // Adjust player speed based on game progression - more aggressive increases
      if (this.spawnActive && !player.crashed && 
          this.totalGameTime - this.lastSpeedIncreaseTime > this.speedIncreaseInterval) {
        
        this.lastSpeedIncreaseTime = this.totalGameTime;
        
        // Calculate how much to increase speed - more aggressive scaling overall
        const progressFactor = Math.min(1, this.gameSpeed / this.maxGameSpeed);
        
        // More aggressive speed increases
        let speedIncrease = 30; // Base increase (was 25)
        
        // Early game gets bigger boosts
        if (this.totalGameTime < 20000) { // First 20 seconds
          speedIncrease = 35; // More aggressive early boost (was 30)
        } else if (progressFactor < 0.6) {
          speedIncrease = 30 * (1 - progressFactor * 0.4); // Less steep falloff (was 0.5)
        } else {
          speedIncrease = 20 * (1 - progressFactor * 0.7); // Larger increases at high speeds (was 15 * 0.8)
        }
        
        // Only increase if below maximum
        if (this.gameSpeed < this.maxGameSpeed) {
          const newSpeed = Math.min(this.maxGameSpeed, this.gameSpeed + speedIncrease);
          console.log(`Increasing game speed from ${this.gameSpeed.toFixed(1)} to ${newSpeed.toFixed(1)}`);
          this.gameSpeed = newSpeed;
          player.speed = newSpeed; // Update player speed directly
        }
      }
      
      // Update game speed based on player speed
      player.speed = this.gameSpeed;
      
      // Track total distance traveled
      this.totalDistance += (player.velocityX * deltaTime / 1000);
      
      // Enable spawning once game started
      if (player.state === 'skating' && !this.spawnActive) {
        this.spawnActive = true;
      }
      
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
          const isAboveObstacle = player.y + player.height <= obstacle.y;
          
          // Track all obstacles that have been passed
          if (hasPassedObstacle && !this.passedObstacles.has(obstacle)) {
            this.passedObstacles.add(obstacle);
            
            // Only award points for base obstacles (not for stacked parts)
            if (!obstacle.stackParent) {
              const pointValue = this.getObstaclePointValue(obstacle);
              console.log(`Awarding ${pointValue} point(s) for passing ${obstacle.type} obstacle`);
              return { 
                type: 'score', 
                points: pointValue,
                obstacle
              };
            } else {
              console.log(`Passed stacked ${obstacle.type} obstacle - no points awarded (part of stack)`);
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
        
        // Minimum reaction time decreases with speed - more aggressive
        const minReactionTime = 700 - (speedFactor * 270); // Slightly faster response required
        let safeSpawnRate = Math.max(minReactionTime, finalSpawnRate);
        
        // Occasionally force earlier spawn for rapid succession (after 10 seconds)
        let rapidSuccession = false;
        
        // Rapid succession appears after 10 seconds now
        if (this.totalGameTime > 10000 && !this.lastObstacleWasRapid && 
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
          const doubleJumpRequired = Math.random() < this.doubleJumpObstacleChance && this.totalGameTime > 15000;
          this.createRandomObstacle(rapidSuccession, doubleJumpRequired);
          this.timeSinceLastObstacle = 0;
          
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
      
      return { type: 'none' };
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
      console.error('Error calculating obstacle points:', err);
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
  createRandomObstacle(isRapidSuccession: boolean = false, isDoubleJumpObstacle: boolean = false) {
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
      
      const type = this.lastObstacleType;
      
      // Increment type count
      this.obstacleTypes[type]++;
      
      // Determine size based on type and player limits
      let width, height;
      
      // More aggressive difficulty scaling
      const distanceFactor = Math.min(0.95, (this.totalDistance / 2500) * this.difficultyProgressionRate); 
      const speedFactor = Math.min(0.95, (this.gameSpeed / this.maxGameSpeed) * 1.4); // Even more weight on speed
      const difficultyFactor = Math.max(distanceFactor, speedFactor);
      
      // Introduce more dynamic difficulty patterns
      let patternDifficulty = 0;
      
      // More extreme pattern difficulty variations
      if (this.obstaclePatterns >= 7) {
        patternDifficulty = 0.6; // More challenging obstacle (was 0.5)
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
      const finalDifficulty = Math.min(0.95, difficultyFactor + patternDifficulty);
      
      switch (type) {
        case 'box':
          // More variance in box sizes
          width = 25 + Math.random() * 50; // 25-75 (was 25-70)
          
          if (isDoubleJumpObstacle) {
            // Double jump boxes are taller to require double jumping
            const doubleJumpHeight = 65 + (finalDifficulty * 25); // 65-90
            height = Math.max(65, Math.min(this.maxDoubleJumpHeight, doubleJumpHeight));
          } else if (isRapidSuccession) {
            // Rapid succession boxes are narrower and shorter
            width = 20 + Math.random() * 25; // 20-45
            const maxBoxHeight = 20 + (finalDifficulty * 15); // Lower height
            height = 15 + Math.random() * Math.min(20, maxBoxHeight);
          } else {
            // Regular boxes with more height variation
            const maxBoxHeight = 25 + (finalDifficulty * 32); // 25-57 (was 25-55)
            height = 20 + Math.random() * Math.min(37, maxBoxHeight);
          }
          break;
          
        case 'ramp':
          if (isDoubleJumpObstacle) {
            // Double jump ramps are taller to require double jumping
            width = 60 + Math.random() * 40; // 60-100
            const doubleJumpHeight = 70 + (finalDifficulty * 20); // 70-90
            height = Math.max(70, Math.min(this.maxDoubleJumpHeight, doubleJumpHeight));
          } else if (isRapidSuccession) {
            // Rapid succession ramps are narrower
            width = 40 + Math.random() * 30; // 40-70
            const maxRampHeight = 30 + (finalDifficulty * 15); // Lower height
            height = 25 + Math.random() * Math.min(20, maxRampHeight);
          } else {
            // Regular ramps with more variance
            width = 50 + Math.random() * 65; // 50-115 (was 50-110)
            const maxRampHeight = 35 + (finalDifficulty * 25); // 35-60
            height = 30 + Math.random() * Math.min(30, maxRampHeight);
          }
          break;
          
        case 'rail':
          if (isRapidSuccession) {
            // Rapid succession rails are shorter
            width = 60 + Math.random() * 50; // 60-110
          } else {
            // Regular rails can be longer
            width = 70 + Math.random() * 110; // 70-180 (was 70-170)
          }
          height = 15; // Rails have fixed height
          break;
          
        default:
          width = 40;
          height = 30;
      }
      
      // Make sure height is jumpable with appropriate jump type
      height = isDoubleJumpObstacle 
        ? Math.min(height, this.maxDoubleJumpHeight) 
        : Math.min(height, this.maxJumpableHeight);
      
      // Track difficulty of this obstacle
      this.lastObstacleDifficulty = (height / (isDoubleJumpObstacle ? this.maxDoubleJumpHeight : this.maxJumpableHeight)) * 0.7 + (width / 180) * 0.3;
      
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
      // Determine what type of obstacle to stack
      // Avoid rails on top of things - that's weird
      const stackTypes: ObstacleType[] = ['box', 'ramp'];
      const randomType = stackTypes[Math.floor(Math.random() * stackTypes.length)];
      
      // Size of the stacked obstacle should be smaller
      let width, height, offsetX;
      
      // Calculate the max height based on maxJumpableHeight and base obstacle
      // Total height (base + stacked) should not exceed what a double jump can clear
      const availableHeight = this.maxJumpableHeight - baseObstacle.height;
      
      // If there's not enough height left, don't create a stacked obstacle
      if (availableHeight < 15) return null;
      
      // Create smaller obstacle for the top - more random positioning
      switch (randomType) {
        case 'box':
          // Boxes are smaller on top, and could be offset to either side
          width = baseObstacle.width * (0.4 + Math.random() * 0.5); // 40-90% of base width (was 50-80%)
          height = 15 + Math.random() * Math.min(18, availableHeight - 10); // 15-33px (was 15-30px)
          
          // Offset within base to look stacked/balanced - more varied positions
          offsetX = Math.random() * (baseObstacle.width - width);
          break;
        case 'ramp':
          // Ramps are angled, so can be wider on top
          width = baseObstacle.width * (0.5 + Math.random() * 0.4); // 50-90% of base width (was 60-90%)
          height = 20 + Math.random() * Math.min(18, availableHeight - 10); // 20-38px (was 20-35px)
          
          // Position ramp for interesting configurations
          offsetX = Math.random() < 0.5 ? 
            // Left-aligned
            Math.random() * (baseObstacle.width * 0.3) : // More variety in position
            // Right-aligned
            baseObstacle.width - width - Math.random() * (baseObstacle.width * 0.3);
          break;
        default:
          width = baseObstacle.width * 0.7;
          height = Math.min(20, availableHeight);
          offsetX = baseObstacle.width * 0.15;
      }
      
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
      this.obstacles.forEach(obstacle => {
        obstacle.draw(ctx, this.cameraOffset);
      });
      
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
      this.lastObstacleTime = 0;
      this.timeSinceLastObstacle = 0;
      this.cameraOffset = 0;
      this.totalDistance = 0;
      this.spawnActive = false;
      this.obstacleTypes = { 'box': 0, 'ramp': 0, 'rail': 0 };
      this.lastObstacleType = null;
      this.passedObstacles.clear();
      
      // Reset dynamic difficulty values
      this.totalGameTime = 0;
      this.lastSpeedIncreaseTime = 0;
      this.gameSpeed = 200; // Reset to starting speed without boost
      this.lastObstacleDifficulty = 0;
      this.obstaclePatterns = 0;
      this.lastObstacleWasRapid = false;
      
      console.log("ObstacleManager reset");
    } catch (err) {
      console.error('Error in ObstacleManager.reset:', err);
    }
  }
} 