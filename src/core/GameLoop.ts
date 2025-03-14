/**
 * GameLoop.ts - Professional game loop with fixed timestep
 */

// Game loop configuration options
export interface GameLoopOptions {
  fps?: number;
  maxFrameTime?: number;
  debug?: boolean;
}

export default class GameLoop {
  // Configuration
  private fps: number;
  private frameDuration: number;
  private maxFrameTime: number;
  private debug: boolean;
  
  // State
  private running: boolean = false;
  private frameId: number | null = null;
  private lastFrameTime: number = 0;
  private accumulator: number = 0;
  private frames: number = 0;
  private frameTime: number = 0;
  private currentFps: number = 0;
  private fpsUpdateTime: number = 0;
  
  // Callbacks
  private updateCallback: ((deltaTime: number) => void) | null = null;
  private renderCallback: (() => void) | null = null;
  
  constructor(options: GameLoopOptions = {}) {
    this.fps = options.fps || 60;
    this.frameDuration = 1000 / this.fps;
    this.maxFrameTime = options.maxFrameTime || 250;
    this.debug = options.debug || false;
    
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
    
    if (this.debug) {
      console.log('Game Loop started');
    }
    
    this.loop(this.lastFrameTime);
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
    
    if (this.debug) {
      console.log('Game Loop stopped');
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
    
    // Cap max frame time to prevent spiral of death
    if (frameTime > this.maxFrameTime) {
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
    
    // Fixed timestep updates
    while (this.accumulator >= this.frameDuration) {
      // Update game state
      if (this.updateCallback) {
        this.updateCallback(this.frameDuration);
      }
      
      this.accumulator -= this.frameDuration;
    }
    
    // Render at whatever FPS the browser wants
    if (this.renderCallback) {
      this.renderCallback();
    }
  }
  
  /**
   * Get the current FPS
   */
  public getFPS(): number {
    return this.currentFps;
  }
  
  /**
   * Get debug info
   */
  public getDebugInfo(): object {
    return {
      fps: this.currentFps,
      targetFps: this.fps,
      frameTime: this.frameTime / Math.max(1, this.frames),
      running: this.running
    };
  }
} 