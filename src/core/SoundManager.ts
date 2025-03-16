/**
 * SoundManager.ts - Handles game audio playback and management
 */

type SoundType = 'jump' | 'crash' | 'music' | 'score' | 'trick';

class SoundManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private musicVolume: number = 0.165;
  private sfxVolume: number = 0.275;
  private muted: boolean = false;

  constructor() {
    this.preloadSounds();
  }

  /**
   * Preload all game sounds
   */
  private preloadSounds(): void {
    try {
      // Sound effects
      this.loadSound('jump', '/sounds/jump.mp3');
      this.loadSound('crash', '/sounds/crash.mp3');
      this.loadSound('score', '/sounds/score.mp3');
      this.loadSound('trick', '/sounds/score.mp3'); // Reusing score sound for trick temporarily
      
      // Background music
      this.loadSound('music', '/sounds/background.mp3', true);
      
      console.log('SoundManager: Sounds preloaded');
    } catch (err) {
      console.error('SoundManager: Error preloading sounds:', err);
    }
  }

  /**
   * Load a sound file
   */
  private loadSound(type: SoundType, src: string, loop: boolean = false): void {
    try {
      const audio = new Audio(src);
      audio.loop = loop;
      
      // Set appropriate volume based on sound type
      if (type === 'music') {
        audio.volume = this.musicVolume;
      } else {
        audio.volume = this.sfxVolume;
      }
      
      this.sounds.set(type, audio);
      
      // Handle loading errors
      audio.addEventListener('error', (e) => {
        console.error(`SoundManager: Error loading sound ${type} from ${src}:`, e);
      });
    } catch (err) {
      console.error(`SoundManager: Error creating sound ${type}:`, err);
    }
  }

  /**
   * Play a sound
   */
  public play(type: SoundType): void {
    if (this.muted) return;
    
    try {
      const sound = this.sounds.get(type);
      if (sound) {
        // For sound effects, we want to reset them to start each time
        if (type !== 'music') {
          sound.currentTime = 0;
        }
        
        sound.play().catch(err => {
          console.warn(`SoundManager: Error playing ${type} sound:`, err);
        });
      } else {
        console.warn(`SoundManager: Sound ${type} not found`);
      }
    } catch (err) {
      console.error(`SoundManager: Error playing ${type} sound:`, err);
    }
  }

  /**
   * Stop a sound
   */
  public stop(type: SoundType): void {
    try {
      const sound = this.sounds.get(type);
      if (sound) {
        sound.pause();
        sound.currentTime = 0;
      }
    } catch (err) {
      console.error(`SoundManager: Error stopping ${type} sound:`, err);
    }
  }

  /**
   * Pause a sound
   */
  public pause(type: SoundType): void {
    try {
      const sound = this.sounds.get(type);
      if (sound) {
        sound.pause();
      }
    } catch (err) {
      console.error(`SoundManager: Error pausing ${type} sound:`, err);
    }
  }

  /**
   * Mute or unmute all sounds
   */
  public toggleMute(): boolean {
    this.muted = !this.muted;
    
    this.sounds.forEach((sound) => {
      if (this.muted) {
        sound.volume = 0;
      } else {
        if (sound === this.sounds.get('music')) {
          sound.volume = this.musicVolume;
        } else {
          sound.volume = this.sfxVolume;
        }
      }
    });
    
    return this.muted;
  }

  /**
   * Get mute state
   */
  public isMuted(): boolean {
    return this.muted;
  }
}

export default SoundManager; 