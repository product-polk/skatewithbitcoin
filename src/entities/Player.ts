/**
 * Player.ts - Main player entity with physics and input handling
 */

import InputManager from '../core/InputManager';

// Player state types
export type PlayerState = 'idle' | 'skating' | 'jumping' | 'grinding' | 'falling' | 'crashed';
export type TrickType = 'kickflip' | '360flip' | 'heelflip' | 'none';

interface PlayerConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  jumpForce: number;
  gravity: number;
}

export default class Player {
  // Position and dimensions
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  
  // Physics
  public velocityX: number = 0;
  public velocityY: number = 0;
  public gravity: number;
  public speed: number;
  public jumpForce: number;
  public onGround: boolean = false;
  public onRail: boolean = false;
  public canDoubleJump: boolean = false; // Add double jump capability
  
  // Game state
  public state: PlayerState = 'idle';
  public score: number = 0;
  public currentTrick: TrickType = 'none';
  public trickTimer: number = 0;
  public crashed: boolean = false;
  
  // Power-up state
  public currentPowerUp: TrickType = 'none';  // Currently collected power-up
  public powerUpIndicatorAlpha: number = 0;   // For flashing the power-up indicator
  public powerUpMessageTimer: number = 0;     // Timer for showing power-up messages
  private pendingPowerUp: boolean = false;    // Flag to indicate a pending power-up execution
  private powerUpDelay: number = 50;          // Delay timer for pending power-up
  
  // Animation properties
  private frameCount: number = 0;
  private jumpCooldown: number = 0;
  
  // Track last restart time to prevent accidental double restarts
  public _lastRestartTime: number = 0;
  
  // Debug
  public debug: boolean = false;
  
  // Images for player and skateboard
  private playerImages: {[key: string]: HTMLImageElement} = {};
  private skateboardImage: HTMLImageElement | null = null;
  private imagesLoaded: boolean = false;
  
  constructor(config: PlayerConfig) {
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.speed = config.speed;
    this.jumpForce = config.jumpForce;
    this.gravity = config.gravity;
    
    // Load player images
    this.loadImages();
    
    console.log('Player initialized with config:', config);
  }
  
  /**
   * Load all required player images
   */
  private loadImages(): void {
    // Load player state images
    const states = ['idle', 'skating', 'jumping', 'falling', 'grinding', 'crashed'];
    
    states.forEach(state => {
      const img = new Image();
      img.src = `/images/player-${state}.png`;
      this.playerImages[state] = img;
      
      img.onload = () => {
        console.log(`Loaded player image: ${state}`);
      };
      
      img.onerror = (err) => {
        console.error(`Failed to load player image: ${state}`, err);
      };
    });
    
    // Load skateboard image
    this.skateboardImage = new Image();
    this.skateboardImage.src = '/images/skateboard.png';
    
    this.skateboardImage.onload = () => {
      console.log('Loaded skateboard image');
      this.imagesLoaded = true;
    };
    
    this.skateboardImage.onerror = (err) => {
      console.error('Failed to load skateboard image', err);
    };
  }
  
  /**
   * Update player physics and state
   */
  public update(deltaTime: number, inputManager: InputManager): void {
    try {
      if (this.crashed) return;
      
      this.frameCount++;
      
      const dt = Math.min(deltaTime / 1000, 0.1); // Convert to seconds for physics, cap at 0.1s
      
      // Update jump cooldown
      if (this.jumpCooldown > 0) {
        this.jumpCooldown -= deltaTime;
      }
      
      // Update power-up indicator animation
      if (this.currentPowerUp !== 'none') {
        // More noticeable pulsing animation for the power-up indicator
        this.powerUpIndicatorAlpha = 0.6 + Math.sin(this.frameCount * 0.15) * 0.4;
      }
      
      // Update power-up message timer
      if (this.powerUpMessageTimer > 0) {
        this.powerUpMessageTimer -= deltaTime;
      }
      
      // Handle pending power-up activation
      if (this.pendingPowerUp) {
        this.powerUpDelay -= deltaTime;
        if (this.powerUpDelay <= 0) {
          this.pendingPowerUp = false;
          this.powerUpDelay = 50; // Reset for next time
          
          // Apply the power-up if we still have one and aren't already doing a trick
          if (this.currentPowerUp !== 'none' && this.currentTrick === 'none') {
            this.usePowerUp();
          }
        }
      }
      
      // Always move forward when skating
      if (this.state === 'skating') {
        this.velocityX = this.speed;
      } else if (this.state === 'jumping' || this.state === 'falling') {
        // In air, maintain forward momentum but can still adjust
        const airControl = 0.3; // Reduced control in air
        
        if (inputManager.isPressed('left')) {
          this.velocityX = Math.max(this.velocityX - 30 * airControl, this.speed * 0.5);
        }
        
        if (inputManager.isPressed('right')) {
          this.velocityX = Math.min(this.velocityX + 20 * airControl, this.speed * 1.8);
        }
      }
      
      // Handle input
      this.handleInput(inputManager);
      
      // Apply movement
      this.x += this.velocityX * dt;
      this.y += this.velocityY * dt;
      
      // Apply gravity if not on ground or rail
      if (!this.onGround && !this.onRail) {
        this.velocityY += this.gravity * dt;
        
        // Set falling state if moving downward
        if (this.velocityY > 0 && this.state !== 'crashed') {
          this.state = 'falling';
        }
      }
      
      // Handle trick timing
      if (this.currentTrick !== 'none') {
        this.trickTimer += deltaTime;
        
        // Complete trick after 500ms
        if (this.trickTimer >= 500) {
          this.completeTrick();
        }
      }
      
      // Simple ground collision (temporary)
      const groundY = 400; // Static ground height
      if (this.y + this.height > groundY) {
        this.y = groundY - this.height;
        this.velocityY = 0;
        this.onGround = true;
        
        // Reset double jump when landing
        this.canDoubleJump = false;
        
        // Land from jump
        if (this.state === 'jumping' || this.state === 'falling') {
          this.land();
        }
      }
    } catch (err) {
      console.error('Error in Player.update:', err);
    }
  }
  
  /**
   * Handle player input
   */
  private handleInput(inputManager: InputManager): void {
    try {
      if (this.crashed || this.state === 'crashed') return;
      
      // Jump input - only allow if no trick is currently in progress
      if (inputManager.wasJustPressed('jump') && this.jumpCooldown <= 0 && this.currentTrick === 'none') {
        if (this.onGround || this.onRail) {
          this.jump();
          // Enable double jump after first jump from ground
          this.canDoubleJump = true;
        } else if (this.canDoubleJump) {
          // Double jump in mid-air
          this.doubleJump();
          this.canDoubleJump = false;
        }
      }
      
      // Left/right input (only when on ground)
      if (this.onGround) {
        if (inputManager.isPressed('left')) {
          this.velocityX = Math.max(this.velocityX - 50, 0); // Slow down
        }
        
        if (inputManager.isPressed('right')) {
          this.velocityX = Math.min(this.velocityX + 30, this.speed * 1.5); // Speed up
        }
      }
      
      // Check if any key is pressed EXCEPT jump/spacebar
      const anyKeyPressed = inputManager.hasAnyKeyJustPressed();
      const jumpPressed = inputManager.wasJustPressed('jump');
      
      // Only consider non-jump key presses when we have a power-up and no active trick
      if (anyKeyPressed && !jumpPressed && this.currentPowerUp !== 'none' && this.currentTrick === 'none') {
        if (this.onGround || this.onRail) {
          // If on ground, jump and queue power-up in one action
          this.jump();
          
          // Schedule the trick to happen shortly after the jump
          this.pendingPowerUp = true;
          this.powerUpDelay = 50; // 50ms delay
        } else {
          // If already in the air, just use the power-up immediately
          this.usePowerUp();
        }
      }
    } catch (err) {
      console.error('Error in Player.handleInput:', err);
    }
  }
  
  /**
   * Make the player jump
   */
  public jump(): void {
    try {
      // Apply stronger jump force for higher jumps
      this.velocityY = -this.jumpForce;
      this.onGround = false;
      this.onRail = false;
      this.state = 'jumping';
      this.jumpCooldown = 250; // Prevent double-tapping jump too quickly
      
      // Reset trick state
      this.currentTrick = 'none';
      this.trickTimer = 0;
      
      console.log('Player jumped');
    } catch (err) {
      console.error('Error in Player.jump:', err);
    }
  }
  
  /**
   * Make the player double jump (smaller boost)
   */
  public doubleJump(): void {
    try {
      // Double jump has 70% of the main jump force
      this.velocityY = -this.jumpForce * 0.7;
      this.state = 'jumping';
      
      // Reset trick state for new trick opportunity
      this.currentTrick = 'none';
      this.trickTimer = 0;
      
      console.log('Player double jumped');
    } catch (err) {
      console.error('Error in Player.doubleJump:', err);
    }
  }
  
  /**
   * Make the player start a trick
   */
  private startTrick(trick: TrickType): void {
    try {
      this.currentTrick = trick;
      this.trickTimer = 0;
      
      // Small upward boost when starting a trick
      if (this.velocityY > 0) {
        // If falling, give a small upward boost
        this.velocityY -= 100;
      }
      
      console.log(`Starting trick: ${trick}`);
    } catch (err) {
      console.error('Error in Player.startTrick:', err);
    }
  }
  
  /**
   * Complete a trick and award points
   */
  private completeTrick(): void {
    try {
      // All tricks give a fixed number of points with no combo multiplier
      const points = 5;
      
      if (this.currentTrick !== 'none') {
        // Add points directly to score without combo multiplier
        this.score += points;
        console.log(`Completed ${this.currentTrick} for ${points} points`);
      }
      
      this.currentTrick = 'none';
      this.trickTimer = 0;
    } catch (err) {
      console.error('Error in Player.completeTrick:', err);
    }
  }
  
  /**
   * Land from a jump
   */
  private land(): void {
    try {
      this.state = 'skating';
      this.onGround = true;
      
      // If we didn't complete the trick in the air, just reset the trick
      if (this.currentTrick !== 'none') {
        console.log('Failed to complete trick before landing');
        this.currentTrick = 'none';
        this.trickTimer = 0;
      }
      
      console.log('Player landed');
    } catch (err) {
      console.error('Error in Player.land:', err);
    }
  }
  
  /**
   * Start grinding on a rail
   */
  public startGrind(): void {
    try {
      this.state = 'grinding';
      this.onRail = true;
      this.velocityY = 0;
      this.velocityX = this.speed * 0.8; // Slightly slower on rails
      
      // Award fixed points for starting a grind (same as other tricks)
      const points = 5;
      this.score += points;
      
      console.log(`Started grinding for ${points} points`);
    } catch (err) {
      console.error('Error in Player.startGrind:', err);
    }
  }
  
  /**
   * Handle crash with an obstacle
   */
  public crash(): void {
    try {
      if (this.crashed) return;
      
      this.crashed = true;
      this.state = 'crashed';
      this.velocityX = -this.speed * 0.3; // Bounce back slightly
      this.velocityY = -this.jumpForce * 0.5; // Small bounce up
      
      console.log('Player crashed');
    } catch (err) {
      console.error('Error in Player.crash:', err);
    }
  }
  
  /**
   * Collect a power-up
   */
  public collectPowerUp(trickType: TrickType): void {
    try {
      // Only collect if we don't already have a power-up
      if (this.currentPowerUp === 'none' && trickType !== 'none') {
        this.currentPowerUp = trickType;
        this.powerUpIndicatorAlpha = 1.0;
        this.powerUpMessageTimer = 2000; // Show message for 2 seconds
        
        console.log(`Collected power-up: ${trickType}`);
      }
    } catch (err) {
      console.error('Error in Player.collectPowerUp:', err);
    }
  }
  
  /**
   * Use the current power-up to do a trick
   */
  public usePowerUp(): void {
    try {
      if (this.currentPowerUp !== 'none' && this.currentTrick === 'none') {
        // Start the trick using the collected power-up
        this.startTrick(this.currentPowerUp);
        
        // Reset the power-up
        this.currentPowerUp = 'none';
        this.powerUpIndicatorAlpha = 0;
        
        console.log('Used power-up to perform trick');
      }
    } catch (err) {
      console.error('Error in Player.usePowerUp:', err);
    }
  }
  
  /**
   * Reset player to starting state
   */
  public reset(x: number, y: number): void {
    try {
      this.x = x;
      this.y = y;
      this.velocityX = 0;
      this.velocityY = 0;
      this.state = 'idle';
      this.score = 0; // Reset score on game restart
      this.currentTrick = 'none';
      this.trickTimer = 0;
      this.crashed = false;
      this.onGround = false;
      this.onRail = false;
      this.canDoubleJump = false;
      this.jumpCooldown = 0;
      this.frameCount = 0;
      
      // Reset power-up state
      this.currentPowerUp = 'none';
      this.powerUpIndicatorAlpha = 0;
      this.powerUpMessageTimer = 0;
      this.pendingPowerUp = false;
      this.powerUpDelay = 50;
      
      // Set a default speed when game starts
      this.velocityX = this.speed * 0.5;
      
      console.log("Player reset to:", x, y);
    } catch (err) {
      console.error('Error in Player.reset:', err);
    }
  }
  
  /**
   * Draw the player
   */
  public draw(ctx: CanvasRenderingContext2D, cameraOffset: number = 0): void {
    try {
      // Calculate screen position with camera offset
      const screenX = this.x - cameraOffset;
      
      // Simple animation for skating
      let yOffset = 0;
      if (this.state === 'skating' && this.onGround) {
        // Simple bobbing animation
        yOffset = Math.sin(this.frameCount * 0.2) * 2;
      }
      
      // Save context for transformations
      ctx.save();
      
      // Determine which player image to use
      let playerImageKey = this.state;
      
      // Apply rotation for tricks or crash
      if (this.currentTrick !== 'none' || this.state === 'crashed') {
        const centerX = screenX + this.width / 2;
        const centerY = this.y + this.height / 2;
        ctx.translate(centerX, centerY);
        
        if (this.currentTrick !== 'none') {
          // Different rotation based on trick type
          let rotationAmount = (this.trickTimer / 500) * Math.PI;
          
          switch (this.currentTrick) {
            case 'kickflip':
              // Side flip - rotate around X axis (appears as scaling in 2D)
              ctx.scale(1, Math.cos(rotationAmount * 2));
              break;
            case 'heelflip':
              // Opposite side flip
              ctx.rotate(-rotationAmount);
              break;
            case '360flip':
              // Full rotation with a twist - 360 degrees rotation with some scaling
              ctx.rotate(rotationAmount * 2);
              // Add a slight wave effect for the 360 flip to make it look different
              const scaleX = 1 + 0.2 * Math.sin(rotationAmount * 3);
              const scaleY = 1 + 0.2 * Math.cos(rotationAmount * 3);
              ctx.scale(scaleX, scaleY);
              break;
          }
        } else if (this.state === 'crashed') {
          // Random-ish tumble effect when crashed
          ctx.rotate(Math.sin(this.frameCount * 0.1) * 0.5);
        }
        
        ctx.translate(-centerX, -centerY);
      }
      
      // Draw player with image if loaded, otherwise fall back to rectangle
      if (this.imagesLoaded && this.playerImages[playerImageKey]) {
        // Draw player image
        ctx.drawImage(
          this.playerImages[playerImageKey],
          screenX,
          this.y + yOffset,
          this.width,
          this.height
        );
      } else {
        // Fallback to rectangle if image not loaded
        // Determine color based on state
        let color;
        switch (this.state) {
          case 'idle':
            color = '#777';
            break;
          case 'skating':
            color = '#3498db';
            break;
          case 'jumping':
          case 'falling':
            color = '#2ecc71';
            break;
          case 'grinding':
            color = '#f1c40f';
            break;
          case 'crashed':
            color = '#e74c3c';
            break;
          default:
            color = '#3498db';
        }
        
        // Draw player body with offset
        ctx.fillStyle = color;
        ctx.fillRect(screenX, this.y + yOffset, this.width, this.height - 10);
        
        // Draw head
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(screenX + this.width / 2, this.y + 10 + yOffset, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw skateboard
      if (this.currentTrick !== 'none') {
        // Draw skateboard with trick animation
        // Increase skateboard dimensions for better visibility
        const boardWidth = this.width + 20; // Increased from +10 to +20
        const boardHeight = 10; // Increased from 5 to 10
        const boardX = screenX - 10; // Adjust position for the width increase
        const boardY = this.y + this.height - 5 + yOffset;
        
        ctx.save();
        ctx.translate(boardX + boardWidth / 2, boardY + boardHeight / 2);
        
        switch (this.currentTrick) {
          case 'kickflip':
            // Kickflip: rotate board around its long axis
            ctx.rotate(Math.PI * (this.trickTimer / 500) * 1.5);
            ctx.scale(1, Math.abs(Math.cos(Math.PI * (this.trickTimer / 500) * 1.5)));
            break;
          case 'heelflip':
            // Heelflip: opposite rotation
            ctx.rotate(-Math.PI * (this.trickTimer / 500) * 1.5);
            ctx.scale(1, Math.abs(Math.cos(Math.PI * (this.trickTimer / 500) * 1.5)));
            break;
          case '360flip':
            // 360 flip: combination of flip and rotation
            ctx.rotate(Math.PI * 2 * (this.trickTimer / 500));
            ctx.scale(1, Math.abs(Math.cos(Math.PI * (this.trickTimer / 500) * 2)));
            break;
        }
        
        if (this.imagesLoaded && this.skateboardImage) {
          // Draw skateboard image with increased dimensions
          ctx.drawImage(
            this.skateboardImage,
            -boardWidth / 2,
            -boardHeight / 2,
            boardWidth,
            boardHeight * 3 // Triple height for better visibility (increased from double)
          );
        } else {
          // Improved fallback skateboard with more detail
          // Main deck
          ctx.fillStyle = '#222';
          ctx.fillRect(-boardWidth / 2, -boardHeight / 2, boardWidth, boardHeight);
          
          // Add grip tape texture
          ctx.fillStyle = '#111';
          const gripSize = 1;
          for (let i = -boardWidth / 2 + 2; i < boardWidth / 2 - 2; i += 3) {
            ctx.fillRect(i, -boardHeight / 2 + 1, gripSize, boardHeight - 2);
          }
          
          // Add trucks detail (metallic part that holds the wheels)
          ctx.fillStyle = '#555';
          const truckWidth = 8;
          ctx.fillRect(-boardWidth / 2 + boardWidth * 0.15 - truckWidth/2, -boardHeight/2, truckWidth, boardHeight * 2);
          ctx.fillRect(boardWidth / 2 - boardWidth * 0.15 - truckWidth/2, -boardHeight/2, truckWidth, boardHeight * 2);
          
          // Add wheels
          ctx.fillStyle = 'white';
          const wheelRadius = 4;
          // Front and back wheels on both sides
          ctx.beginPath();
          ctx.arc(-boardWidth / 2 + boardWidth * 0.15, boardHeight * 0.75, wheelRadius, 0, Math.PI * 2);
          ctx.arc(boardWidth / 2 - boardWidth * 0.15, boardHeight * 0.75, wheelRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
        
        // Show trick name
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.currentTrick.toUpperCase(), screenX + this.width / 2, this.y - 15);
      } else {
        // Regular skateboard when not doing tricks
        // Increase skateboard dimensions for better visibility
        const boardWidth = this.width + 20; // Increased from +10 to +20
        const boardHeight = 10; // Increased from 5 to 10
        const boardX = screenX - 10; // Adjust position for the width increase
        const boardY = this.y + this.height - 5 + yOffset;
        
        if (this.imagesLoaded && this.skateboardImage) {
          // Draw skateboard image with increased dimensions
          ctx.drawImage(
            this.skateboardImage,
            boardX,
            boardY,
            boardWidth,
            boardHeight * 3 // Triple height for better visibility (increased from double)
          );
        } else {
          // Improved fallback skateboard with more detail
          // Main deck
          ctx.fillStyle = '#222';
          ctx.fillRect(boardX, boardY, boardWidth, boardHeight);
          
          // Add grip tape texture
          ctx.fillStyle = '#111';
          const gripSize = 1;
          for (let i = boardX + 2; i < boardX + boardWidth - 2; i += 3) {
            ctx.fillRect(i, boardY + 1, gripSize, boardHeight - 2);
          }
          
          // Add 3D perspective with deck sides
          ctx.fillStyle = '#8B4513'; // Wood color for sides
          ctx.fillRect(boardX, boardY + boardHeight, boardWidth, 2);
          
          // Draw wheels with 3D perspective
          ctx.fillStyle = 'white';
          // Front wheels
          ctx.fillRect(screenX - 3, this.y + this.height, 8, 5);
          // Back wheels
          ctx.fillRect(screenX + this.width - 5, this.y + this.height, 8, 5);
          
          // Add trucks (metal parts that hold the wheels)
          ctx.fillStyle = '#555';
          ctx.fillRect(screenX - 5, this.y + this.height - 1, 12, 2);
          ctx.fillRect(screenX + this.width - 7, this.y + this.height - 1, 12, 2);
          
          // Add shadow for depth
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(boardX + 5, boardY + boardHeight + 5, boardWidth - 10, 2);
        }
      }
      
      // Reset transformations
      ctx.restore();
      
      // Show state-based effects
      if (this.state === 'grinding') {
        // Spark effect for grinding
        ctx.fillStyle = 'yellow';
        for (let i = 0; i < 3; i++) {
          const sparkX = screenX + Math.random() * this.width;
          const sparkY = this.y + this.height + 2 + Math.random() * 3;
          const sparkSize = 1 + Math.random() * 2;
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (this.state === 'jumping' || this.state === 'falling') {
        // Motion lines for jumping/falling
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const lineY = this.y + 10 + (i * 15);
          ctx.beginPath();
          ctx.moveTo(screenX - 10, lineY);
          ctx.lineTo(screenX - 5, lineY);
          ctx.stroke();
        }
      }
      
      // Debug info
      if (this.debug) {
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`State: ${this.state}`, screenX, this.y - 35);
        ctx.fillText(`Vel: ${this.velocityX.toFixed(1)}, ${this.velocityY.toFixed(1)}`, screenX, this.y - 20);
        
        if (this.currentTrick !== 'none') {
          ctx.fillStyle = 'yellow';
          ctx.fillText(`Trick: ${this.currentTrick} (${this.trickTimer.toFixed(0)}ms)`, screenX, this.y - 50);
        }
        
        // Draw collision bounding box
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.strokeRect(screenX, this.y, this.width, this.height);
      }
    } catch (err) {
      console.error('Error in Player.draw:', err);
    }
  }
  
  /**
   * Draw player HUD (score, combo)
   */
  public drawHUD(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    try {
      // Score display - removed the title to avoid duplication
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${this.score}`, 20, 30);
      
      // Enhanced power-up indicator
      if (this.currentPowerUp !== 'none') {
        // Draw power-up indicator
        ctx.save();
        
        // Position in top-right corner
        const indicatorX = width - 70;
        const indicatorY = 40;
        const radius = 28; // Larger size for better visibility
        
        // Add attention-grabbing outer glow that pulses
        const glowSize = 6 + Math.sin(this.frameCount * 0.15) * 4;
        ctx.shadowColor = this.getTrickColor(this.currentPowerUp);
        ctx.shadowBlur = glowSize;
        ctx.globalAlpha = 0.8 + Math.sin(this.frameCount * 0.2) * 0.2;
        
        // Draw outer ring
        ctx.strokeStyle = this.getTrickColor(this.currentPowerUp);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, radius + 4 + Math.sin(this.frameCount * 0.15) * 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Clean background with slight transparency for modern look
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = 'rgba(15, 20, 25, 0.9)'; // Dark transparent background
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Choose color based on trick type - cleaner, modern colors
        let trickColor = this.getTrickColor(this.currentPowerUp);
        
        // Inner colored circle
        ctx.globalAlpha = 0.9 + this.powerUpIndicatorAlpha * 0.1; // More pronounced pulsing
        ctx.fillStyle = trickColor;
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, radius - 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Trick label/icon with clean typography
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial'; // Larger font for better visibility
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let label = 'K';
        if (this.currentPowerUp === '360flip') label = '3';
        if (this.currentPowerUp === 'heelflip') label = 'H';
        
        ctx.fillText(label, indicatorX, indicatorY);
        
        // Attention-grabbing "USE" instruction
        ctx.font = '13px Arial';
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.7 + Math.sin(this.frameCount * 0.15) * 0.3; // Pulsing text
        ctx.textAlign = 'center';
        
        // Animated instruction text
        const pulseScale = 1 + Math.sin(this.frameCount * 0.15) * 0.1;
        ctx.save();
        ctx.translate(indicatorX, indicatorY + radius + 14);
        ctx.scale(pulseScale, pulseScale);
        ctx.fillText('PRESS ANY KEY!', 0, 0);
        ctx.restore();
        
        // Draw small attention indicators around the power-up
        const arrowCount = 3;
        for (let i = 0; i < arrowCount; i++) {
          const angle = Math.PI/2 - Math.PI/8 + (i - 1) * Math.PI/8;
          const arrowX = indicatorX + Math.cos(angle) * (radius + 12);
          const arrowY = indicatorY + Math.sin(angle) * (radius + 12);
          const alpha = 0.6 + Math.sin(this.frameCount * 0.15 + i) * 0.4;
          
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(arrowX, arrowY);
          ctx.rotate(angle + Math.PI/2);
          
          // Draw small arrow
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.moveTo(0, -4);
          ctx.lineTo(3, 0);
          ctx.lineTo(-3, 0);
          ctx.closePath();
          ctx.fill();
          
          ctx.restore();
        }
        
        ctx.restore();
      }
      
      // Show power-up collection message - cleaner notification
      if (this.powerUpMessageTimer > 0) {
        ctx.save();
        
        // Fade in/out smoothly
        const fadeInDuration = 300;
        const fadeOutStart = 1500;
        let alpha = 1.0;
        
        if (this.powerUpMessageTimer > 2000 - fadeInDuration) {
          // Fade in
          alpha = (2000 - this.powerUpMessageTimer) / fadeInDuration;
        } else if (this.powerUpMessageTimer < fadeOutStart) {
          // Fade out
          alpha = this.powerUpMessageTimer / fadeOutStart;
        }
        
        ctx.globalAlpha = alpha;
        
        // Clean, modern notification background
        const notifWidth = 220;
        const notifHeight = 50;
        const notifX = width / 2 - notifWidth / 2;
        const notifY = height / 2 - 50 - notifHeight / 2;
        
        // Rounded rectangle with shadow
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = 'rgba(15, 20, 25, 0.85)';
        
        // Draw rounded rectangle
        this.roundRect(ctx, notifX, notifY, notifWidth, notifHeight, 8);
        
        // Message text
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.currentPowerUp !== 'none') {
          ctx.fillText(`${this.currentPowerUp.toUpperCase()} COLLECTED`, width / 2, notifY + 16);
          ctx.font = '14px Arial';
          ctx.fillText('Press any key (except SPACE) to use', width / 2, notifY + 36);
        }
        
        ctx.restore();
      }
      
      // Current trick - only show the current trick now
      if (this.currentTrick !== 'none') {
        ctx.fillStyle = 'cyan';
        ctx.fillText(`${this.currentTrick.toUpperCase()}`, width / 2 - 50, height / 2);
      }
      
    } catch (err) {
      console.error('Error in Player.drawHUD:', err);
    }
  }
  
  /**
   * Helper method to get trick colors
   */
  private getTrickColor(trickType: TrickType): string {
    switch (trickType) {
      case 'kickflip':
        return '#4dabf7'; // Clean blue
      case '360flip':
        return '#da77f2'; // Clean purple
      case 'heelflip':
        return '#69db7c'; // Clean green
      default:
        return '#fcc419'; // Clean yellow
    }
  }
  
  /**
   * Helper function to draw rounded rectangles
   */
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }
} 