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

// Create a cache for power-up images to avoid loading the same image multiple times
const powerUpImageCache: {[key: string]: HTMLImageElement | null} = {};

// Create a fallback canvas-based image for power-ups
const createFallbackPowerUpImage = (type: TrickType): HTMLImageElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size to match power-up dimensions
  canvas.width = 44;
  canvas.height = 44;
  
  if (ctx) {
    // Get color based on trick type
    let color = '#4dabf7'; // Default blue
    
    switch (type) {
      case 'blockflip':
        color = '#4dabf7'; // Blue
        break;
      case 'hashspin':
        color = '#da77f2'; // Purple
        break;
      case 'hodlgrab':
        color = '#69db7c'; // Green
        break;
    }
    
    // Draw a circular background
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, canvas.width/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw an inner colored circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, canvas.width/2 - 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw text label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let label = 'K';
    if (type === 'hashspin') label = '3';
    if (type === 'hodlgrab') label = 'H';
    
    ctx.fillText(label, canvas.width/2, canvas.height/2);
    
    // Add a glowing effect
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, canvas.width/2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Convert canvas to image
  const img = new Image();
  img.src = canvas.toDataURL();
  return img;
};

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
    // Check if this image is already in the cache
    const cacheKey = `powerup-${this.type}`;
    
    if (powerUpImageCache[cacheKey]) {
      // Use cached image
      this.image = powerUpImageCache[cacheKey];
      this.imageLoaded = true;
      return;
    }
    
    // If not in cache, try to load it
    const img = new Image();
    img.src = `/images/powerup-${this.type}.png`;
    
    img.onload = () => {
      console.log(`Loaded power-up image: ${this.type}`);
      this.image = img;
      this.imageLoaded = true;
      powerUpImageCache[cacheKey] = img; // Add to cache
    };
    
    img.onerror = (err) => {
      console.error(`Failed to load power-up image: ${this.type}`, err);
      // Create fallback image
      const fallbackImg = createFallbackPowerUpImage(this.type);
      this.image = fallbackImg;
      this.imageLoaded = true;
      powerUpImageCache[cacheKey] = fallbackImg; // Add to cache
    };
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
      // If not active or already collected, don't draw
      if (!this.active) {
        return;
      }
      
      const screenX = this.x - cameraOffset;
      
      // Skip drawing if off-screen (optimization)
      if (screenX + this.width < 0 || screenX > ctx.canvas.width) {
        return;
      }
      
      this.frameCount++;
      
      // Draw the collection effects if being collected
      if (this.isCollecting) {
        this.drawCollectionEffects(ctx, screenX);
        return;
      }
      
      // Save context state
      ctx.save();
      
      // Check if image is loaded, use it or draw a fallback
      if (this.imageLoaded && this.image) {
        // Add floating animation
        const floatOffset = Math.sin(this.frameCount * 0.1) * 5;
        
        // Add pulsing scale
        const scale = 1 + Math.sin(this.frameCount * 0.1) * 0.1;
        
        // Set up transformation for animation
        ctx.translate(screenX + this.width / 2, this.y + this.height / 2 + floatOffset);
        ctx.scale(scale, scale);
        
        // Draw with a slight rotation
        ctx.rotate(Math.sin(this.frameCount * 0.05) * 0.1);
        
        // Draw the image
        ctx.drawImage(
          this.image,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        );
        
        // Draw sparkles
        this.drawSparkles(ctx, 0, 0);
        
      } else {
        // Fallback: Draw directly without waiting for image to load
        const fallbackImage = createFallbackPowerUpImage(this.type);
        
        // Add floating animation
        const floatOffset = Math.sin(this.frameCount * 0.1) * 5;
        
        // Draw the fallback image
        ctx.translate(screenX + this.width / 2, this.y + this.height / 2 + floatOffset);
        ctx.drawImage(
          fallbackImage,
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        );
        
        // Draw sparkles
        this.drawSparkles(ctx, 0, 0);
      }
      
      // Restore context state
      ctx.restore();
      
    } catch (err) {
      console.error('Error drawing power-up:', err);
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
      case 'blockflip':
        return '#4dabf7'; // Clean blue
      case 'hashspin':
        return '#da77f2'; // Clean purple
      case 'hodlgrab':
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
  
  /**
   * Draw collection effects (particles)
   */
  private drawCollectionEffects(ctx: CanvasRenderingContext2D, screenX: number): void {
    try {
      // Floating animation
      const floatOffset = Math.sin(this.frameCount * 0.05) * 6;
      
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
    } catch (err) {
      console.error('Error drawing collection effects:', err);
    }
  }
} 