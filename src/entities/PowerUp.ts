/**
 * PowerUp.ts - Trick power-up entities for skateboarding tricks
 */

import Player, { TrickType } from './Player';

// Power-up config interface
export interface PowerUpConfig {
  x: number;
  y: number;
  type: TrickType;
}

export default class PowerUp {
  // Position
  public x: number;
  public y: number;
  
  // Size - fixed for all power-ups
  public width: number = 44;  // Slightly increased for better visibility
  public height: number = 44; // Slightly increased for better visibility
  
  // Type of trick this power-up grants
  public type: TrickType;
  
  // State
  public collected: boolean = false;
  public active: boolean = true;
  
  // Animation
  private frameCount: number = 0;
  private image: HTMLImageElement | null = null;
  private imageLoaded: boolean = false;
  
  // Collection effect properties
  private collectionEffects: {x: number, y: number, size: number, alpha: number, speed: number, color: string}[] = [];
  private isCollecting: boolean = false;
  private collectionTimer: number = 0;
  
  constructor(config: PowerUpConfig) {
    this.x = config.x;
    this.y = config.y;
    this.type = config.type;
    
    // Load image
    this.loadImage();
  }
  
  /**
   * Load power-up image
   */
  private loadImage(): void {
    this.image = new Image();
    this.image.src = `/images/powerup-${this.type}.png`;
    
    this.image.onload = () => {
      console.log(`Loaded power-up image: ${this.type}`);
      this.imageLoaded = true;
    };
    
    this.image.onerror = (err) => {
      console.error(`Failed to load power-up image: ${this.type}`, err);
      // Don't wait for images - set to null so we use the fallback rendering
      this.image = null;
    };
    
    // Set a timeout to fallback to default rendering if image takes too long
    setTimeout(() => {
      if (!this.imageLoaded) {
        console.log(`Timeout loading power-up image: ${this.type}, using fallback rendering`);
        this.image = null;
      }
    }, 1000);
  }
  
  /**
   * Update power-up animation and position
   */
  public update(deltaTime: number, playerSpeed: number): void {
    try {
      // Animation counter
      this.frameCount++;
      
      // Move power-up based on player speed
      this.x -= playerSpeed * (deltaTime / 1000);
      
      // Floating animation - smoother movement
      const floatOffset = Math.sin(this.frameCount * 0.05) * 6; // More subtle, slower movement
      this.y += floatOffset * (deltaTime / 1000) * 0.5; // Reduced movement impact
      
      // Update collection effects if collecting
      if (this.isCollecting) {
        this.collectionTimer -= deltaTime;
        
        // Update each particle
        for (let i = this.collectionEffects.length - 1; i >= 0; i--) {
          const effect = this.collectionEffects[i];
          effect.size -= 0.15 * (deltaTime / 16); // Slower fade
          effect.alpha -= 0.015 * (deltaTime / 16); // Slower fade
          
          // Smoother outward motion
          const angle = (Math.PI * 2 / this.collectionEffects.length) * i;
          effect.x += effect.speed * Math.cos(angle) * (deltaTime / 16);
          effect.y += effect.speed * Math.sin(angle) * (deltaTime / 16);
          
          // Remove faded effects
          if (effect.alpha <= 0 || effect.size <= 0) {
            this.collectionEffects.splice(i, 1);
          }
        }
        
        // When collection animation completes
        if (this.collectionTimer <= 0) {
          this.active = false;
          this.collectionEffects = [];
        }
      }
    } catch (err) {
      console.error('Error in PowerUp.update:', err);
    }
  }
  
  /**
   * Check collision with player
   */
  public checkCollision(player: Player): boolean {
    if (this.collected || !this.active) return false;
    
    // Basic rectangle collision detection
    const collision = (
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y < this.y + this.height &&
      player.y + player.height > this.y
    );
    
    if (collision) {
      this.collected = true;
      // Immediately hide the main power-up visual
      // Collection particles will still be shown via collect() method
    }
    
    return collision;
  }
  
  /**
   * Draw the power-up
   */
  public draw(ctx: CanvasRenderingContext2D, cameraOffset: number = 0): void {
    try {
      // Don't draw anything if not active
      if (!this.active) return;
      
      // Only draw the power-up visuals if not collected
      // But still draw collection effects if we're collecting
      
      // Calculate screen position with camera offset
      const screenX = this.x - cameraOffset;
      
      // Floating animation - smoother movement
      const floatOffset = Math.sin(this.frameCount * 0.05) * 6;
      
      // Collection effects (particles)
      if (this.isCollecting) {
        // Draw collection particles
        for (const effect of this.collectionEffects) {
          ctx.save();
          ctx.globalAlpha = effect.alpha;
          ctx.fillStyle = effect.color;
          ctx.beginPath();
          ctx.arc(screenX + effect.x, this.y + floatOffset + effect.y, effect.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      
      // Skip drawing the main power-up if collected
      if (this.collected) return;
      
      // More subtle pulsing/rotating effect
      const pulseScale = 1 + Math.sin(this.frameCount * 0.03) * 0.08; // More subtle pulsing
      const rotation = this.frameCount * 0.01; // Slower rotation
      
      // Save context for transformations
      ctx.save();
      
      // Apply rotation and pulsing
      ctx.translate(screenX + this.width / 2, this.y + this.height / 2 + floatOffset);
      ctx.rotate(rotation);
      ctx.scale(pulseScale, pulseScale);
      
      if (this.imageLoaded && this.image) {
        // Draw power-up image
        ctx.drawImage(
          this.image,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        );
      } else {
        // Clean, modern power-up design
        
        // Outer glow (subtle)
        ctx.shadowColor = this.getTrickColor();
        ctx.shadowBlur = 10;
        
        // Main circle - semi-transparent for a cleaner look
        ctx.fillStyle = 'rgba(15,20,25,0.9)'; // Dark background
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner colored circle - smaller for a modern look
        ctx.fillStyle = this.getTrickColor();
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2 - 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Subtle shimmer effect - thin arc
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2 - 4, -Math.PI/4, Math.PI/2);
        ctx.stroke();
        
        // Trick letter - clean, centered typography
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let label = 'K';
        if (this.type === '360flip') label = '3';
        if (this.type === 'heelflip') label = 'H';
        
        ctx.fillText(label, 0, 0);
      }
      
      // Restore context
      ctx.restore();
      
      // Add minimal, elegant sparkle effects if not collected
      if (!this.collected) {
        this.drawSparkles(ctx, screenX, this.y + floatOffset);
      }
    } catch (err) {
      console.error('Error in PowerUp.draw:', err);
    }
  }
  
  /**
   * Draw sparkle effects around the power-up
   */
  private drawSparkles(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Fewer, more elegant sparkles
    const sparkCount = 3;
    const radius = this.width * 0.8;
    
    for (let i = 0; i < sparkCount; i++) {
      // Slower rotation for more elegant movement
      const angle = (this.frameCount * 0.05) + (i * (Math.PI * 2 / sparkCount));
      const sparkX = x + this.width / 2 + Math.cos(angle) * radius;
      const sparkY = y + this.height / 2 + Math.sin(angle) * radius;
      
      // Smaller, more subtle sparkles
      const sparkSize = 2 + Math.sin(this.frameCount * 0.1 + i) * 1;
      
      ctx.save();
      
      // Subtle glow
      ctx.shadowColor = this.getTrickColor();
      ctx.shadowBlur = 3;
      ctx.globalAlpha = 0.7;
      
      // Use the same color as the trick but with transparency
      const color = this.getTrickColor();
      ctx.fillStyle = color;
      
      // Draw a small circle
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }
  
  /**
   * Get color based on trick type - clean, vibrant colors
   */
  private getTrickColor(): string {
    switch (this.type) {
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
   * Create a collection animation and mark as collected
   */
  public collect(): void {
    this.collected = true;
    this.isCollecting = true;
    this.collectionTimer = 600; // Longer, smoother animation
    
    // Create elegant collection particle effects
    const particleCount = 12; // Fewer particles for cleaner look
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 / particleCount) * i;
      this.collectionEffects.push({
        x: this.width / 2,
        y: this.height / 2,
        size: 3 + Math.random() * 2, // Smaller particles
        alpha: 0.8,
        speed: 1 + Math.random() * 1.5, // Slower movement
        color: this.getTrickColor()
      });
    }
    
    console.log(`PowerUp collected: ${this.type}`);
  }
} 