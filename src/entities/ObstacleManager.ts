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
  'bitcoinetf.png',
  'btcenergy.png',
  'china_pboc.png',
  'elsalvador.png',
  'ftx.png',
  'halving.png',
  'luna.png',
  'MicroStrategy.png',
  'mtgox.png',
  'pizza.png',
  'sec_logo.png',
  'segwit.png',
  'silk_road.png',
  'tesla.png'
];

// Fallback images in case Bitcoin-themed images fail to load
// These should be simple, reliable Bitcoin images that are guaranteed to exist
const fallbackObstacleImages = [
  'bitcoin-fallbacks/bitcoin-logo.png',   // Using guaranteed fallback from dedicated folder
  'bitcoin-fallbacks/bitcoin-symbol.png', // Using guaranteed fallback from dedicated folder
  'bitcoin-fallbacks/btc-icon.png'        // Using guaranteed fallback from dedicated folder
];

// Track which images have been used to avoid immediate repetition
let recentlyUsedImages: string[] = [];
const MAX_RECENT_IMAGES = 3; // Don't repeat the last 3 images

// Function to get a random Bitcoin-themed obstacle image
function getRandomBitcoinImage(): string {
  try {
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
  } catch (err) {
    console.error('Error in getRandomBitcoinImage, using fallback:', err);
    // Return a fallback image if there's an error
    return fallbackObstacleImages[Math.floor(Math.random() * fallbackObstacleImages.length)];
  }
}

// Function to load an obstacle image if not already loaded
function getObstacleImage(type: ObstacleType): { image: HTMLImageElement, name: string } {
  // Generate a unique key for this obstacle instance
  const imageKey = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Create new image
  const img = new Image();
  
  // Improve image rendering quality for crisp display during movement
  img.style.imageRendering = 'crisp-edges';
  
  // Enable crossOrigin to avoid CORS issues when processing
  img.crossOrigin = 'anonymous';
  
  // Select a random Bitcoin-themed image
  const bitcoinImage = getRandomBitcoinImage();
  
  // Track load attempts for fallback chain
  let loadAttempt = 0;
  const maxAttempts = 2; // Reduced from 3 to 2 (removing the old obstacle fallback)
  let currentImageName = bitcoinImage;
  
  // Define our image loading function to handle retries
  const attemptImageLoad = () => {
    loadAttempt++;
    
    if (loadAttempt === 1) {
      // First attempt: use Bitcoin image from Obstacles folder
      img.src = `/images/Obstacles/${bitcoinImage}`;
      currentImageName = bitcoinImage;
    } else {
      // Second and final attempt: try Bitcoin fallback images
      const fallbackImage = fallbackObstacleImages[Math.floor(Math.random() * fallbackObstacleImages.length)];
      console.log(`Trying fallback Bitcoin image: ${fallbackImage}`);
      img.src = `/images/${fallbackImage}`;
      currentImageName = fallbackImage;
    }
  };
  
  // Start the first load attempt
  attemptImageLoad();
  
  // Store in cache with unique key
  obstacleImages[imageKey] = img;
  
  img.onload = () => {
    console.log(`Loaded obstacle image on attempt ${loadAttempt}: ${img.src}`);
  };
  
  img.onerror = (err) => {
    console.error(`Failed to load image on attempt ${loadAttempt}: ${img.src}`, err);
    
    // Try next fallback if we haven't reached max attempts
    if (loadAttempt < maxAttempts) {
      console.log(`Trying fallback image, attempt ${loadAttempt + 1}/${maxAttempts}`);
      attemptImageLoad();
    }
  };
  
  return { image: img, name: currentImageName };
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
  imageName: string = ''; // Store the name of the image for labeling
  
  constructor(x: number, y: number, width: number, height: number, type: ObstacleType) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    
    // Load a random Bitcoin-themed image for this obstacle
    const imageResult = getObstacleImage(type);
    this.image = imageResult.image;
    this.imageName = imageResult.name;
    
    // Check if image is already loaded
    if (this.image.complete) {
      this.imageLoaded = true;
    } else {
      this.image.onload = () => {
        this.imageLoaded = true;
      };
      
      // Add a backup timeout to consider image loaded after 3 seconds
      // This helps if an image is stalled but not errored
      setTimeout(() => {
        if (!this.imageLoaded && this.image) {
          console.log('Forcing image loaded state after timeout');
          this.imageLoaded = true;
        }
      }, 3000);
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
        
        // Draw a background box for the obstacle - solid white for better contrast
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        
        // Add a subtle shadow for depth and better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        
        ctx.fillRect(
          drawX, 
          this.y, 
          this.width, 
          this.height
        );
        
        // Create a more subtle border
        ctx.shadowBlur = 0; // Remove shadow for border
        ctx.strokeStyle = 'rgba(255, 140, 0, 0.8)'; // Orange border with slightly reduced opacity
        ctx.lineWidth = 1.5; // Reduced from 3px to 1.5px
        ctx.strokeRect(
          drawX, 
          this.y, 
          this.width, 
          this.height
        );
        
        // Calculate dimensions that preserve aspect ratio
        const originalWidth = this.image.width || 100;
        const originalHeight = this.image.height || 100;
        
        // Scale image to fit but leave room for the label
        let scale = Math.min(
          (this.width * 0.95) / originalWidth,
          (this.height * 0.8) / originalHeight // Reduced slightly to leave room for label
        );
        
        // Calculate new dimensions
        const scaledWidth = originalWidth * scale;
        const scaledHeight = originalHeight * scale;
        
        // Calculate centered position
        const centerX = drawX + (this.width - scaledWidth) / 2;
        const centerY = this.y + (this.height * 0.45 - scaledHeight / 2); // Positioned higher to make room for label
        
        // Remove shadow for image drawing
        ctx.shadowColor = 'transparent';
        
        // Set image rendering to crisp-edges to reduce blur during movement
        if (this.image.style) {
          this.image.style.imageRendering = 'crisp-edges';
        }
        
        // Boost contrast before drawing the image
        ctx.globalAlpha = this.hit ? 0.5 : 1.0;
        
        // Draw the image with preserved aspect ratio
        ctx.drawImage(
          this.image,
          centerX,
          centerY,
          scaledWidth,
          scaledHeight
        );
        
        // Add a label below the image to help identify it
        if (!this.stackParent) { // Only add label to base obstacles
          ctx.fillStyle = '#000000';
          ctx.font = `${Math.min(12, this.width * 0.14)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Extract name from image path
          let labelText = this.getLabelText();
          ctx.fillText(labelText, drawX + this.width / 2, this.y + this.height * 0.85);
        }
        
        // Reset opacity and shadow effects
        ctx.globalAlpha = 1.0;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      } else {
        // Updated fallback to always show Bitcoin-themed elements
        // Use consistent Bitcoin orange for all obstacles
        ctx.fillStyle = '#F7931A'; // Bitcoin orange
        
        // Add shadow for 3D effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 2;
        
        // Draw base shape
        if (this.type === 'ramp') {
          // Draw ramp as a triangle
          ctx.beginPath();
          ctx.moveTo(drawX, this.y + this.height);
          ctx.lineTo(drawX + this.width, this.y);
          ctx.lineTo(drawX + this.width, this.y + this.height);
          ctx.closePath();
          ctx.fill();
        } else {
          // Draw box or rail as a rectangle
          ctx.fillRect(drawX, this.y, this.width, this.height);
        }
        
        // Add Bitcoin symbol on all obstacles - increased size
        ctx.fillStyle = '#FFFFFF'; // White Bitcoin symbol
        ctx.font = `${Math.min(this.width, this.height) * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₿', drawX + this.width/2, this.y + this.height/2 - (this.height * 0.1));
        
        // Add a generic label
        if (!this.stackParent) {
          ctx.fillStyle = '#000000';
          ctx.font = `${Math.min(12, this.width * 0.14)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Bitcoin', drawX + this.width / 2, this.y + this.height * 0.85);
        }
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
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
  
  // Helper method to get appropriate label text from image name
  getLabelText(): string {
    try {
      if (!this.imageName) return 'Bitcoin';
      
      // Clean up the file name to make it more readable
      let name = this.imageName.replace(/\.\w+$/, ''); // Remove file extension
      
      const nameMap: {[key: string]: string} = {
        '3ac': '3AC',
        'bitcoinetf': 'BTC ETF',
        'btcenergy': 'BTC Energy',
        'china_pboc': 'China PBOC',
        'elsalvador': 'El Salvador',
        'ftx': 'FTX',
        'halving': 'Halving',
        'luna': 'Luna',
        'MicroStrategy': 'MicroStrategy',
        'mtgox': 'Mt. Gox',
        'pizza': 'BTC Pizza',
        'sec_logo': 'SEC',
        'segwit': 'SegWit',
        'silk_road': 'Silk Road',
        'tesla': 'Tesla',
        'bitcoin-logo': 'Bitcoin',
        'bitcoin-symbol': 'Bitcoin',
        'btc-icon': 'Bitcoin',
        'bitcoin-fallback': 'Bitcoin'
      };
      
      return nameMap[name] || name;
    } catch (err) {
      console.error('Error getting label text:', err);
      return 'Bitcoin';
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
  gameSpeed: number = 150; // Reduced from 200 to 150 for slower initial speed
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
  
  // New property to track preloaded images
  private preloadedImages: Set<string> = new Set();
  
  // Track current jump to only award sats once per jump
  private currentJumpId: number = 0;
  private satsAwardedThisJump: boolean = false;
  private lastScoringJumpId: number = -1;
  private playerWasJumping: boolean = false;
  private playerWasOnGround: boolean = false;
  
  // New variables for dynamic difficulty
  private totalGameTime: number = 0; // Track total game time
  private speedIncreaseInterval: number = 6000; // Increased from 4000 to 6000 for slower acceleration
  private lastSpeedIncreaseTime: number = 0; // Track when we last increased speed
  private baseSpawnRate: number = 5000; // Base time between obstacles in ms (increased from 3500 to 5000)
  private maxGameSpeed: number = 400; // Reduced from 600 to 400 for lower maximum speed
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
  private secondObstacleDelay: number = 6000; // Extra delay for the second obstacle (increased from 4000)
  private obstacleCountInEasyMode: number = 0; // Track how many obstacles we've spawned in easy mode
  
  constructor() {
    this.reset();
    this.preloadObstacleImages();
  }
  
  // Preload obstacle images to improve performance
  private preloadObstacleImages() {
    try {
      console.log('Preloading obstacle images...');
      
      // Preload a few Bitcoin images
      const imagesToPreload = [...bitcoinObstacleImages.slice(0, 5), ...fallbackObstacleImages];
      
      imagesToPreload.forEach(imgSrc => {
        // Skip if already preloaded
        if (this.preloadedImages.has(imgSrc)) return;
        
        // Create new image and load
        const img = new Image();
        img.onload = () => {
          console.log(`Preloaded image: ${imgSrc}`);
          this.preloadedImages.add(imgSrc);
        };
        img.onerror = () => {
          console.warn(`Failed to preload image: ${imgSrc}`);
        };
        
        // Set source to trigger loading
        if (bitcoinObstacleImages.includes(imgSrc)) {
          img.src = `/images/Obstacles/${imgSrc}`;
        } else {
          img.src = `/images/${imgSrc}`;
        }
      });
      
      // Remove old fallback preloading
      // No longer preloading obstacle type images
      
    } catch (err) {
      console.error('Error preloading obstacle images:', err);
    }
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
      
      // Only track jump state changes - DO NOT award points immediately to prevent scoring bugs
      // IMPORTANT: Only count as a new jump if the player was previously on the ground
      // This prevents counting the initial fall at game start as a jump
      if (playerIsJumping && !this.playerWasJumping && this.playerWasOnGround) {
        this.currentJumpId++;
        this.satsAwardedThisJump = false;
        console.log(`New jump detected: Jump #${this.currentJumpId}`);
      }
      
      // Store current jump and ground states for next update
      const playerWasOnGroundBefore = this.playerWasOnGround;
      this.playerWasJumping = playerIsJumping;
      this.playerWasOnGround = player.onGround;
      
      // Award jump points - but only do this ONCE per frame max
      // AND only if this specific jump hasn't been awarded points yet
      // AND only if the player is not doing a trick
      // AND only if this is a legitimate jump (not the initial game start)
      if (playerIsJumping && 
          !this.satsAwardedThisJump && 
          this.currentJumpId > this.lastScoringJumpId && 
          player.currentTrick === 'none' &&
          this.totalGameTime > 1000 && // Prevent awarding points in the first second
          playerWasOnGroundBefore) {  // Only award points if player was on ground before jumping
        
        // Award exactly 1 sat
        const beforeSats = player.sats;
        player.sats += 1;
        
        // Mark that we've awarded sats for this jump to prevent double-counting
        this.satsAwardedThisJump = true;
        this.lastScoringJumpId = this.currentJumpId;
        
        console.log(`JUMP SATS EVENT: Jump #${this.currentJumpId} - Sats before: ${beforeSats}, after: ${player.sats}, jump sat added`);
      }
      
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
        let speedIncrease = 5; // Reduced from 10 to 5 for slower acceleration
        if (this.totalGameTime < this.easyModeTimer) {
          speedIncrease = 3; // Reduced from 5 to 3 for even slower early game acceleration
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
          player.speed = 140 + startupBoost; // Reduced from 180+10 to 140+10 for slower initial speed
          this.gameSpeed = player.speed;
        } else if (this.totalGameTime < this.easyModeTimer) {
          // Next few seconds - gentler ramp up (reduced boost from 40 to 25)
          const startupBoost = 10 + Math.min(20, ((this.totalGameTime - this.gameStartGracePeriod) / 
                              (this.easyModeTimer - this.gameStartGracePeriod)) * 20);
          player.speed = 140 + startupBoost; // Reduced from 180+25 to 140+20 for slower early game
          this.gameSpeed = player.speed;
        }
      }
      
      // Track total distance traveled
      this.totalDistance += (player.velocityX * deltaTime / 1000);
      
      // Enable spawning once game started
      if (player.state === 'skating' && !this.spawnActive) {
        this.spawnActive = true;
      }
      
      // Process obstacle updates and check for collisions
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
          
          // Check if player has successfully jumped over this obstacle (for tracking only)
          const hasPassedObstacle = player.x > obstacle.x + obstacle.width;
          
          // Track all obstacles that have been passed (no longer awards points)
          if (hasPassedObstacle && !this.passedObstacles.has(obstacle)) {
            this.passedObstacles.add(obstacle);
            
            // Log that player passed obstacle (debug)
            if (!obstacle.stackParent) {
              console.log(`Passed ${obstacle.type} obstacle - no points awarded for obstacles`);
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
        
        // Add a start buffer to the first few obstacles
        const startBonus = Math.max(0, 10000 - this.totalGameTime) * 0.5; // More conservative bonus
        finalSpawnRate += startBonus;
        
        // Add additional spacing for the first few obstacles in easy mode
        if (this.obstacleCountInEasyMode < 4 && this.totalGameTime < this.easyModeTimer) {
          // Significant additional delay between early obstacles
          const earlyGameModifier = 3000 - (this.obstacleCountInEasyMode * 500);
          finalSpawnRate += earlyGameModifier;
          console.log(`Early game modifier: +${earlyGameModifier}ms (obstacle #${this.obstacleCountInEasyMode + 1})`);
        }
        
        // First obstacle needs significant delay
        if (!this.firstObstacleSpawned) {
          finalSpawnRate = this.initialObstacleDelay;
          console.log("Setting delay for first obstacle");
        } else if (this.obstacleCountInEasyMode === 1) {
          // Second obstacle also needs extra delay
          finalSpawnRate += this.secondObstacleDelay;
          console.log("Adding delay for second obstacle");
        }
        
        // Minimum reaction time decreases with speed - more aggressive
        const minReactionTime = 700 - (speedFactor * 270); // Slightly faster response required
        let safeSpawnRate = Math.max(minReactionTime, finalSpawnRate);
        
        // Occasionally force earlier spawn for rapid succession (after 10 seconds)
        // Make sure we're not in early game or easy mode
        if (this.totalGameTime > 10000 && 
            this.totalGameTime > this.easyModeTimer && 
            !this.lastObstacleWasRapid && 
            Math.random() < this.rapidSuccessionChance) {
          // Force a shorter spawn time to create rapid succession effect
          safeSpawnRate = minReactionTime * 0.75;
          this.lastObstacleWasRapid = true;
          this.isInConsecutiveSpawn = true;
        } else {
          this.lastObstacleWasRapid = false;
          this.isInConsecutiveSpawn = false;
        }
        
        // Surprise spawn chances increase with game time - more aggressive
        // No surprise spawns during easy mode
        const surpriseChance = Math.min(0.13, this.totalGameTime / 120000) * (this.totalGameTime > this.easyModeTimer ? 1 : 0);
        const surpriseSpawn = Math.random() < surpriseChance && this.timeSinceLastObstacle > minReactionTime * 0.8;
        
        if ((this.timeSinceLastObstacle > safeSpawnRate || surpriseSpawn) && this.canSpawnObstacle()) {
          // Create a new obstacle
          // Initially no double-jump obstacles and lower chance of difficult obstacles in easy mode
          const doubleJumpRequired = Math.random() < this.doubleJumpObstacleChance && 
                                  this.totalGameTime > this.easyModeTimer + 5000; // No double jumps in easy mode
          
          // Make the game significantly easier for the first 20 seconds
          const isEasyMode = this.totalGameTime < this.easyModeTimer;
          this.createRandomObstacle(this.lastObstacleWasRapid, doubleJumpRequired, isEasyMode);
          
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
      
      // Create result to return
      let result: CollisionResult = { type: 'none' };
      
      // If a sat was awarded this frame for a jump, return that info
      if (player.sats > initialSats && this.satsAwardedThisJump) {
        result = { type: 'sats', points: 1 };
      } 
      
      // Check if there's a powerup collision (this doesn't add sats)
      const powerUpResult = this.checkPowerUpCollisionsWithoutScoring(player);
      if (powerUpResult.type !== 'none') {
        result = powerUpResult;
      }
      
      return result;
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
    
    // Add extra spacing requirement for the first few obstacles (early game)
    let requiredSpace = minSafeDistance;
    if (this.obstacleCountInEasyMode < 4 || this.totalGameTime < this.easyModeTimer) {
      // Enforce significantly larger spacing during early game
      requiredSpace = minSafeDistance * 2.5; // 2.5x the normal distance for early obstacles
      
      if (this.obstacleCountInEasyMode === 0) {
        // Even more spacing for the very first obstacle
        requiredSpace = minSafeDistance * 3;
      }
    }
    
    const actualSpace = lastObstacle.x < 800 - requiredSpace;
    
    return actualSpace;
  }
  
  // Create a random obstacle
  createRandomObstacle(isRapidSuccession: boolean = false, isDoubleJumpObstacle: boolean = false, isEasyMode: boolean = false) {
    try {
      // Size multiplication factor to make obstacles bigger
      const sizeFactor = 1.4; // Increased from 1.2 to 1.4 to make obstacles larger
      
      // Ensure the jump heights are scaled properly too
      const maxHeight = isDoubleJumpObstacle ? this.maxDoubleJumpHeight * sizeFactor : this.maxJumpableHeight * sizeFactor;
      
      // Get the last few obstacles to avoid creating the same type in succession
      const recentTypes = this.obstacles
        .slice(-3)
        .filter(o => !o.stackParent) // Only consider base obstacles, not stacked ones
        .map(o => o.type);
      
      // Base probability distribution for obstacle types
      let typeDistribution: {type: ObstacleType, weight: number}[] = [
        { type: 'box', weight: 50 },
        { type: 'ramp', weight: 40 },
        { type: 'rail', weight: 10 }
      ];
      
      // Adjust weights to avoid repeating the same type
      if (recentTypes.length > 0) {
        typeDistribution = typeDistribution.map(item => {
          // Reduce probability if this type was recently used
          const recentOccurrences = recentTypes.filter(t => t === item.type).length;
          const penalty = recentOccurrences * 20; // More aggressive penalty (30 to 20 means more penalty)
          return {
            type: item.type,
            weight: Math.max(5, item.weight - penalty) // Ensure at least 5% chance
          };
        });
      }
      
      // In easy mode, prefer boxes and ramps
      if (isEasyMode) {
        typeDistribution = typeDistribution.map(item => {
          if (item.type === 'rail') {
            return { ...item, weight: 5 }; // Reduce rail probability in easy mode
          }
          return item;
        });
      }
      
      // Calculate total weight
      const totalWeight = typeDistribution.reduce((sum, item) => sum + item.weight, 0);
      
      // Select type based on weighted random
      let randomWeight = Math.random() * totalWeight;
      let selectedType: ObstacleType = 'box'; // Default
      
      for (const item of typeDistribution) {
        if (randomWeight <= item.weight) {
          selectedType = item.type;
          break;
        }
        randomWeight -= item.weight;
      }
      
      // Track this type for future spawn balancing
      this.lastObstacleType = selectedType;
      
      // Increment the type count in our tracking dictionary
      this.obstacleTypes[selectedType]++;
      
      // Determine size based on type - now larger with the increased sizeFactor
      let width, height, type;
      type = selectedType;
      
      // Increase widths for better visibility while keeping difficulty balance
      switch (type) {
        case 'box':
          // Increased box dimensions
          width = (35 + Math.random() * 30) * sizeFactor; // was 30-50
          height = isDoubleJumpObstacle ? 
            (Math.random() * 25 + 60) * sizeFactor : // Double-jump boxes are very tall
            (Math.random() * 20 + 15) * sizeFactor; // Standard boxes
          
          // Cap height at maxHeight
          height = Math.min(height, maxHeight);
          break;
          
        case 'ramp':
          // Increased ramp dimensions (ramps should be larger for game balance)
          width = (50 + Math.random() * 40) * sizeFactor; // was 40-70
          height = isDoubleJumpObstacle ?
            (Math.random() * 20 + 55) * sizeFactor : // Double-jump ramps are tall
            (Math.random() * 15 + 20) * sizeFactor; // Standard ramps
            
          // Cap height at maxHeight
          height = Math.min(height, maxHeight);
          break;
          
        case 'rail':
          // Rails stay narrow in height but get wider
          width = (80 + Math.random() * 70) * sizeFactor; // was 70-120
          height = (8 + Math.random() * 10) * sizeFactor; // was 8-15, low to make them easier to jump
          break;
          
        default:
          // Fallback size
          width = 40 * sizeFactor;
          height = 30 * sizeFactor;
      }
      
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
        const progressionBonus = this.lastObstacleDifficulty * 0.35; // Increases with difficulty (was 0.3)
        
        // Reduce stack chance if we've had multiple difficult obstacles
        const patternAdjustment = this.obstaclePatterns >= 7 ? -0.1 : 0;
        
        const finalStackChance = baseStackChance + progressionBonus + patternAdjustment;
        
        if (Math.random() < finalStackChance && type !== 'rail') {
          // Create a second stacked obstacle
          this.createStackedObstacle(obstacle, this.lastObstacleDifficulty);
          
          // Chance of creating a triple-stack for extreme challenge
          const tripleStackChance = isRapidSuccession ? 0.05 : 0.18; // 18% for regular (was 15%)
          if (this.lastObstacleDifficulty > 0.5 && Math.random() < tripleStackChance) {
            const doubleStackedObstacle = this.obstacles[this.obstacles.length - 1];
            if (doubleStackedObstacle && doubleStackedObstacle.stackParent === obstacle) {
              this.createStackedObstacle(doubleStackedObstacle, this.lastObstacleDifficulty * 0.8);
            }
          }
        }
      }
      
      return obstacle;
    } catch (err) {
      console.error('Error creating random obstacle:', err);
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
      this.gameSpeed = 150; // Reduced from 200 to 150 for lower initial speed
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
      this.playerWasOnGround = false;
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