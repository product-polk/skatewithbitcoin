/**
 * GameLoop.ts - Professional game loop with fixed timestep
 */

// Game loop configuration options
export interface GameLoopOptions {
  fps?: number;
  maxFrameTime?: number;
  debug?: boolean;
  maxUpdatesPerFrame?: number; // Add limit to updates per frame
}

export default class GameLoop {
  // Configuration
  private fps: number;
  private frameDuration: number;
  private maxFrameTime: number;
  private debug: boolean;
  private maxUpdatesPerFrame: number; // Max physics updates per frame
  
  // State
  private running: boolean = false;
  private frameId: number | null = null;
  private lastFrameTime: number = 0;
  private accumulator: number = 0;
  private frames: number = 0;
  private frameTime: number = 0;
  private currentFps: number = 0;
  private fpsUpdateTime: number = 0;
  private lastUpdateDuration: number = 0;
  private lastRenderDuration: number = 0;
  
  // Performance monitoring
  private slowFrameCount: number = 0;
  private totalFrameCount: number = 0;
  private performanceInterval: number | null = null;
  
  // Callbacks
  private updateCallback: ((deltaTime: number) => void) | null = null;
  private renderCallback: (() => void) | null = null;
  
  constructor(options: GameLoopOptions = {}) {
    this.fps = options.fps || 60;
    this.frameDuration = 1000 / this.fps;
    this.maxFrameTime = options.maxFrameTime || 250;
    this.debug = options.debug || false;
    this.maxUpdatesPerFrame = options.maxUpdatesPerFrame || 5; // Prevent spiral of death
    
    if (this.debug) {
      console.log(`Game Loop initialized at ${this.fps} FPS (${this.frameDuration.toFixed(2)}ms per frame)`);
    }
  }
  
  /**
   * Set the function to call on each update step
   */
  public setUpdateCallback(callback: (deltaTime: number) => void): void {
    this.updateCallback = callback;
  }
  
  /**
   * Set the function to call on each render step
   */
  public setRenderCallback(callback: () => void): void {
    this.renderCallback = callback;
  }
  
  /**
   * Start the game loop
   */
  public start(): void {
    if (this.running) return;
    
    this.running = true;
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    this.accumulator = 0;
    this.frames = 0;
    this.slowFrameCount = 0;
    this.totalFrameCount = 0;
    
    // Start performance monitoring if in debug mode
    if (this.debug) {
      // Report performance stats every 5 seconds
      this.performanceInterval = window.setInterval(() => {
        const slowFramePercentage = this.totalFrameCount > 0 
          ? (this.slowFrameCount / this.totalFrameCount) * 100 
          : 0;
          
        console.log(`Performance: ${this.slowFrameCount}/${this.totalFrameCount} slow frames (${slowFramePercentage.toFixed(1)}%)`);
        console.log(`Last update: ${this.lastUpdateDuration.toFixed(2)}ms, Last render: ${this.lastRenderDuration.toFixed(2)}ms`);
        
        // Reset counters
        this.slowFrameCount = 0;
        this.totalFrameCount = 0;
      }, 5000);
    }
    
    // Request first frame
    this.frameId = requestAnimationFrame((time) => this.loop(time));
    
    if (this.debug) {
      console.log('Game loop started');
    }
  }
  
  /**
   * Stop the game loop
   */
  public stop(): void {
    if (!this.running) return;
    
    this.running = false;
    
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    
    // Clear performance monitoring
    if (this.performanceInterval !== null) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }
    
    if (this.debug) {
      console.log('Game loop stopped');
    }
  }
  
  /**
   * The main loop function
   */
  private loop(timestamp: number): void {
    if (!this.running) return;
    
    this.frameId = requestAnimationFrame((time) => this.loop(time));
    
    // Calculate time since last frame
    let frameTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    
    // Track frame for performance monitoring
    this.totalFrameCount++;
    
    // Cap max frame time to prevent spiral of death
    if (frameTime > this.maxFrameTime) {
      this.slowFrameCount++;
      
      if (this.debug) {
        console.warn(`Long frame time: ${frameTime.toFixed(2)}ms (capped at ${this.maxFrameTime}ms)`);
      }
      frameTime = this.maxFrameTime;
    }
    
    // Track FPS
    this.frames++;
    this.frameTime += frameTime;
    
    if (timestamp - this.fpsUpdateTime >= 1000) {
      this.currentFps = this.frames;
      this.frames = 0;
      this.frameTime = 0;
      this.fpsUpdateTime = timestamp;
      
      if (this.debug) {
        console.log(`FPS: ${this.currentFps}`);
      }
    }
    
    // Add frame time to the accumulator
    this.accumulator += frameTime;
    
    // Fixed timestep updates - limit to prevent spiral of death
    let updateCount = 0;
    const updateStart = performance.now();
    
    while (this.accumulator >= this.frameDuration && updateCount < this.maxUpdatesPerFrame) {
      // Update game state
      if (this.updateCallback) {
        this.updateCallback(this.frameDuration);
      }
      
      this.accumulator -= this.frameDuration;
      updateCount++;
    }
    
    this.lastUpdateDuration = performance.now() - updateStart;
    
    // If we hit the update limit, discard remaining time to prevent lag
    if (updateCount >= this.maxUpdatesPerFrame && this.accumulator > this.frameDuration) {
      if (this.debug) {
        console.warn(`Max updates per frame (${this.maxUpdatesPerFrame}) reached, discarding ${this.accumulator.toFixed(2)}ms of simulation time`);
      }
      this.accumulator = 0;
    }
    
    // Render at whatever FPS the browser wants
    const renderStart = performance.now();
    if (this.renderCallback) {
      this.renderCallback();
    }
    this.lastRenderDuration = performance.now() - renderStart;
  }
  
  /**
   * Get the current FPS
   */
  public getFPS(): number {
    return this.currentFps;
  }
  
  /**
   * Get detailed debug info about the game loop
   */
  public getDebugInfo(): object {
    return {
      fps: this.currentFps,
      frameDuration: this.frameDuration,
      updateTime: this.lastUpdateDuration,
      renderTime: this.lastRenderDuration,
      running: this.running
    };
  }
} 