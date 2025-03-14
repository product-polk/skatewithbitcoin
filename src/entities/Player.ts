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
  
  // Animation properties
  private frameCount: number = 0;
  private jumpCooldown: number = 0;
  
  // Track last restart time to prevent accidental double restarts
  public _lastRestartTime: number = 0;
  
  // Debug
  public debug: boolean = false;
  
  constructor(config: PlayerConfig) {
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.speed = config.speed;
    this.jumpForce = config.jumpForce;
    this.gravity = config.gravity;
    
    console.log('Player initialized with config:', config);
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
      
      // Jump input
      if (inputManager.wasJustPressed('jump') && this.jumpCooldown <= 0) {
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
      
      // Trick input (only when in the air)
      if (!this.onGround && !this.onRail && this.currentTrick === 'none') {
        if (inputManager.wasJustPressed('trickKickflip')) {
          this.startTrick('kickflip');
        } else if (inputManager.wasJustPressed('trick360Flip')) {
          this.startTrick('360flip');
        } else if (inputManager.wasJustPressed('trickHeelflip')) {
          this.startTrick('heelflip');
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
      
      // Simple animation for skating
      let yOffset = 0;
      if (this.state === 'skating' && this.onGround) {
        // Simple bobbing animation
        yOffset = Math.sin(this.frameCount * 0.2) * 2;
      }
      
      // Save context for transformations
      ctx.save();
      
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
      
      // Draw player body with offset
      ctx.fillStyle = color;
      ctx.fillRect(screenX, this.y + yOffset, this.width, this.height - 10);
      
      // Draw head
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(screenX + this.width / 2, this.y + 10 + yOffset, 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw skateboard
      if (this.currentTrick !== 'none') {
        // Draw skateboard with trick animation
        ctx.fillStyle = 'black';
        
        // Draw based on trick type and timing
        const trickProgress = this.trickTimer / 500; // 0 to 1
        const boardWidth = this.width + 10;
        const boardHeight = 5;
        const boardX = screenX - 5;
        const boardY = this.y + this.height - 5 + yOffset;
        
        ctx.save();
        ctx.translate(boardX + boardWidth / 2, boardY + boardHeight / 2);
        
        switch (this.currentTrick) {
          case 'kickflip':
            // Kickflip: rotate board around its long axis
            ctx.rotate(Math.PI * trickProgress * 1.5);
            ctx.scale(1, Math.abs(Math.cos(Math.PI * trickProgress * 1.5)));
            break;
          case 'heelflip':
            // Heelflip: opposite rotation
            ctx.rotate(-Math.PI * trickProgress * 1.5);
            ctx.scale(1, Math.abs(Math.cos(Math.PI * trickProgress * 1.5)));
            break;
          case '360flip':
            // 360 flip: combination of flip and rotation
            ctx.rotate(Math.PI * 2 * trickProgress);
            ctx.scale(1, Math.abs(Math.cos(Math.PI * trickProgress * 2)));
            break;
        }
        
        ctx.fillRect(-boardWidth / 2, -boardHeight / 2, boardWidth, boardHeight);
        
        // Draw skateboard details for better visualization
        ctx.fillStyle = 'darkgray';
        ctx.fillRect(-boardWidth / 2 + 5, -boardHeight / 2, 5, boardHeight);
        ctx.fillRect(boardWidth / 2 - 10, -boardHeight / 2, 5, boardHeight);
        
        ctx.restore();
        
        // Show trick name
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.currentTrick.toUpperCase(), screenX + this.width / 2, this.y - 15);
      } else {
        // Regular skateboard when not doing tricks
        ctx.fillStyle = 'black';
        ctx.fillRect(screenX - 5, this.y + this.height - 5 + yOffset, this.width + 10, 5);
        
        // Draw wheels
        ctx.fillStyle = 'white';
        ctx.fillRect(screenX - 3, this.y + this.height, 6, 3);
        ctx.fillRect(screenX + this.width - 3, this.y + this.height, 6, 3);
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
      
      // Current trick - only show the current trick now
      if (this.currentTrick !== 'none') {
        ctx.fillStyle = 'cyan';
        ctx.fillText(`${this.currentTrick.toUpperCase()}`, width / 2 - 50, height / 2);
      }
      
      // Crashed text
      if (this.crashed) {
        ctx.fillStyle = 'red';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CRASHED!', width / 2, height / 2 - 40);
        ctx.font = '24px Arial';
        ctx.fillText('Press SPACE to restart', width / 2, height / 2);
      }
    } catch (err) {
      console.error('Error in Player.drawHUD:', err);
    }
  }
} 