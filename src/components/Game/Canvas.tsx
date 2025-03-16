'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import GameLoop from '../../core/GameLoop';
import InputManager from '../../core/InputManager';
import SoundManager from '../../core/SoundManager';
import Player from '../../entities/Player';
import ObstacleManager, { CollisionResult } from '../../entities/ObstacleManager';
import HighScores from './HighScores';
import { isMobileDevice } from '../../utils/device';

// Define game window properties
interface GameProps {
  width?: number;
  height?: number;
  debug?: boolean;
}

declare global {
  interface Window {
    DEBUG_MODE?: boolean;
  }
}

// Define a floating score indicator
interface FloatingScore {
  value: number;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
}

// Background image type definitions
interface BackgroundImages {
  sky: HTMLImageElement | null;
  mountains: HTMLImageElement | null;
  buildings: HTMLImageElement | null;
  ground: HTMLImageElement | null;
}

export const Canvas: React.FC<GameProps> = ({ 
  width = 1000, 
  height = 600,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(0);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [debug, setDebug] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isHighScoresOpen, setIsHighScoresOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [modalCooldown, setModalCooldown] = useState<boolean>(false);
  const [gameState, setGameState] = useState<'playing' | 'crashed' | 'idle' | 'highScoreShown'>('idle');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  // Background image references
  const backgroundImagesRef = useRef<BackgroundImages>({
    sky: null,
    mountains: null,
    buildings: null,
    ground: null
  });
  const [backgroundImagesLoaded, setBackgroundImagesLoaded] = useState<boolean>(false);
  
  // Game asset loader
  const [images, setImages] = useState<{[key: string]: HTMLImageElement}>({});
  
  // Load image utility
  const loadImage = (key: keyof typeof images, src: string) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.src = src;
      
      img.onload = () => {
        setImages(prev => ({
          ...prev,
          [key]: img
        }));
        resolve();
      };
      
      img.onerror = (err) => {
        console.error(`Failed to load image: ${key}`, err);
        reject(err);
      };
    });
  };
  
  // Load background images
  const loadBackgroundImages = useCallback(() => {
    const imagesLoading: BackgroundImages = {
      sky: null,
      mountains: null,
      buildings: new Image(),
      ground: new Image()
    };
    
    // Set image sources - only load buildings and ground
    if (imagesLoading.buildings) imagesLoading.buildings.src = '/images/background-buildings.png';
    if (imagesLoading.ground) imagesLoading.ground.src = '/images/background-ground.png';
    
    // Pre-set dimensions to avoid layout shifts
    const imageDimensions = {
      sky: { width: 0, height: 0 },
      mountains: { width: 0, height: 0 },
      buildings: { width: 1600, height: 400 }, // Height to match ground level (400px)
      ground: { width: 1600, height: 200 }
    };
    
    // Pre-set dimensions to help browser rendering
    Object.keys(imagesLoading).forEach(key => {
      const img = imagesLoading[key as keyof BackgroundImages];
      if (img) {
        const dims = imageDimensions[key as keyof typeof imageDimensions];
        img.width = dims.width;
        img.height = dims.height;
        
        // Enable image-rendering optimization for pixel art
        (img as any).style = 'image-rendering: pixelated;';
      }
    });
    
    // Track loaded images
    let loadedCount = 0;
    // We're only loading 2 images now (buildings and ground)
    const totalImages = 2;
    
    // Create fallback images for any that fail to load
    const createFallbackImage = (key: keyof BackgroundImages) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const dims = imageDimensions[key];
      
      if (ctx) {
        canvas.width = dims.width;
        canvas.height = dims.height;
        
        // Fill with appropriate fallback pattern based on the image type
        switch(key) {
          case 'buildings':
            ctx.fillStyle = '#333';
            // Draw some rectangles for buildings
            for (let i = 0; i < 8; i++) {
              const x = i * (canvas.width / 8);
              const width = canvas.width / 9;
              const height = 50 + (i % 4) * 40;
              ctx.fillRect(x, canvas.height - height, width, height);
            }
            break;
          case 'ground':
            ctx.fillStyle = '#3e291e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Add some texture
            ctx.strokeStyle = '#4a3528';
            ctx.lineWidth = 2;
            for (let i = 0; i < 20; i++) {
              const x = i * (canvas.width / 20);
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x + 30, canvas.height);
              ctx.stroke();
            }
            break;
          default:
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      
      const fallbackImg = new Image();
      fallbackImg.src = canvas.toDataURL();
      fallbackImg.width = dims.width;
      fallbackImg.height = dims.height;
      return fallbackImg;
    };
    
    // Check if all background images are loaded
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        backgroundImagesRef.current = imagesLoading;
        setBackgroundImagesLoaded(true);
        console.log('All background images loaded successfully');
      }
    };
    
    // Set up load and error handlers for each image
    ['buildings', 'ground'].forEach(key => {
      const img = imagesLoading[key as keyof BackgroundImages];
      
      if (img) {
        // If already loaded, count it
        if (img.complete) {
          checkAllLoaded();
        } else {
          img.onload = () => {
            console.log(`Loaded background image: ${key}`);
            checkAllLoaded();
          };
          
          img.onerror = (err) => {
            console.error(`Failed to load background image: ${key}`, err);
            // Replace with fallback image instead of just counting it
            imagesLoading[key as keyof BackgroundImages] = createFallbackImage(key as keyof BackgroundImages);
            checkAllLoaded();
          };
        }
      }
    });
  }, []);
  
  // Load background images on component mount
  useEffect(() => {
    loadBackgroundImages();
  }, [loadBackgroundImages]);
  
  useEffect(() => {
    console.log('isHighScoresOpen state changed:', isHighScoresOpen);
  }, [isHighScoresOpen]);
  
  // Add high score ref to track the latest value
  const highScoreRef = useRef<number>(0);
  
  // References to game objects
  const gameLoopRef = useRef<GameLoop | null>(null);
  const playerRef = useRef<Player | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const obstacleManagerRef = useRef<ObstacleManager | null>(null);
  const cameraOffsetRef = useRef<number>(0);
  const floatingScoresRef = useRef<FloatingScore[]>([]);
  const soundManagerRef = useRef<SoundManager | null>(null);
  
  // Load high score from localStorage on component mount
  useEffect(() => {
    try {
      const savedHighScore = localStorage.getItem('skatewithbitcoinHighScore');
      console.log(`[Initial Load] Saved high score from localStorage:`, savedHighScore);
      if (savedHighScore) {
        const parsedHighScore = parseInt(savedHighScore, 10);
        console.log(`[Initial Load] Parsed high score:`, parsedHighScore);
        setHighScore(parsedHighScore);
        highScoreRef.current = parsedHighScore;
      } else {
        console.log(`[Initial Load] No saved high score found, using default:`, highScore);
      }
      
      // Also load device ID if available
      const savedDeviceId = localStorage.getItem('skatewithbitcoinDeviceId');
      if (savedDeviceId) {
        setDeviceId(savedDeviceId);
      }
    } catch (err) {
      console.error('Error loading high score from localStorage:', err);
    }
  }, []);
  
  // Update high score when player's score changes and manage leaderboard opening
  useEffect(() => {
    // Only proceed if player reference exists
    if (!playerRef.current) return;
    
    const playerScore = playerRef.current.score;
    
    // Check if player's score is a new high score
    if (playerScore > 0 && playerScore > highScore) {
      console.log(`New high score achieved: ${playerScore} > ${highScore}`);
      
      // Update high score in state and ref
      setHighScore(playerScore);
      highScoreRef.current = playerScore;
      
      // Save to localStorage immediately
      try {
        localStorage.setItem('skatewithbitcoinHighScore', playerScore.toString());
        console.log(`[Score Update] High score saved to localStorage: ${playerScore}`);
      } catch (err) {
        console.error('[Score Update] Error saving high score to localStorage:', err);
      }
    }
    
    // If player has crashed, check for high score and show modal ONLY ONCE per game session
    if (playerRef.current.crashed && gameState === 'playing') {
      console.log('Player crashed with score:', playerScore);
      setGameState('crashed');
      
      // Only show high scores if this is a new/equal high score
      if (playerScore > 0 && playerScore >= highScore) {
        console.log('Will show high scores due to new high score');
        // Delay showing high scores to ensure game over screen is shown first
        setTimeout(() => {
          if (!isHighScoresOpen && !modalCooldown) {
            console.log('Opening high score modal after crash');
            setIsHighScoresOpen(true);
            setGameState('highScoreShown');
          }
        }, 1500);
      }
    }
  }, [playerRef.current?.score, playerRef.current?.crashed, highScore, isHighScoresOpen, modalCooldown, gameState]);
  
  // Add an effect to handle the modal cooldown
  useEffect(() => {
    if (!isHighScoresOpen && modalCooldown) {
      // Reset the cooldown after a short delay
      const cooldownTimeout = setTimeout(() => {
        setModalCooldown(false);
        console.log('Modal cooldown period ended');
      }, 3000); // 3 second cooldown
      
      return () => clearTimeout(cooldownTimeout);
    }
  }, [isHighScoresOpen, modalCooldown]);
  
  // Function to start the game (exposed to UI)
  const handleStartGame = useCallback(() => {
    try {
      console.log('Start button clicked');
      if (playerRef.current && obstacleManagerRef.current) {
        console.log('Starting game from button');
        playerRef.current.state = 'skating';
        
        // Add test obstacles if in debug mode
        if (debug && obstacleManagerRef.current) {
          obstacleManagerRef.current.createTestObstacles();
        }
        
        // Start background music immediately - make sure this happens before setting gameStarted
        if (soundManagerRef.current && soundEnabled) {
          console.log('Playing background music from start button');
          soundManagerRef.current.stop('music'); // Stop any existing music first to ensure clean start
          setTimeout(() => soundManagerRef.current?.play('music'), 100); // Small delay to ensure audio context is ready
        }
        
        // We do this last to ensure all game objects are ready
        setGameStarted(true);
      }
    } catch (err) {
      console.error('Error in handleStartGame:', err);
    }
  }, [debug, soundEnabled]);
  
  // Handle high score submission - enhanced to ensure callback is passed correctly
  const handleHighScoreSubmit = (name: string) => {
    console.log(`High score submitted by ${name}: ${score}`);
    
    // Create a verification hash using timestamp to prevent replay attacks
    const timestamp = Date.now().toString();
    
    // Save player name to localStorage immediately
    try {
      localStorage.setItem('skatewithbitcoinPlayerName', name);
      console.log('Player name saved in handleHighScoreSubmit:', name);
    } catch (err) {
      console.error('Error saving player name:', err);
    }
    
    // The actual API call is handled by the HighScores component
  };
  
  // Function to restart the game (exposed to user)
  const handleRestartGame = useCallback(() => {
    try {
      console.log('[Manual Restart] Restart button clicked');
      if (playerRef.current && obstacleManagerRef.current) {
        // Check if current score is a new high score before resetting
        if (playerRef.current.score > highScoreRef.current) {
          console.log(`[Manual Restart] Saving new high score before restart: ${playerRef.current.score} > ${highScoreRef.current}`);
          setHighScore(playerRef.current.score);
          highScoreRef.current = playerRef.current.score;
          localStorage.setItem('skatewithbitcoinHighScore', playerRef.current.score.toString());
          
          // Reset game state for next session
          setGameState('idle');
          
          // Always show high scores on restart if it's a high score
          if (playerRef.current.score > 0 && !isHighScoresOpen && !modalCooldown) {
            console.log('[Manual Restart] Showing high scores modal');
            setIsHighScoresOpen(true);
            return; // Exit early - we'll restart when modal is closed
          }
        }
        
        // Reset all game state except high score
        setScore(0);
        floatingScoresRef.current = []; // Clear all floating score indicators
        
        // Reset player position and state
        playerRef.current.reset(100, 300);
        playerRef.current.state = 'skating';
        
        // Clear and reset obstacles
        obstacleManagerRef.current.reset();
        cameraOffsetRef.current = 0;
        
        // Re-enable game
        setGameStarted(true);
        // Reset game state to playing for next session
        setGameState('playing');
        
        console.log('Game fully reset and restarted, high score preserved: ' + highScoreRef.current);
      }
    } catch (err) {
      console.error('Error in handleRestartGame:', err);
    }
  }, [highScore, isHighScoresOpen, modalCooldown]);
  
  // Set up game engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas ref is null');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }
    
    // Set global debug mode
    window.DEBUG_MODE = debug;
    console.log('Game canvas initialized, debug mode:', debug);
    
    try {
      // Draw initial loading screen
      const drawLoadingScreen = () => {
        try {
          // Use dark background color as base
          ctx.fillStyle = '#222';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Use background image for loading screen if loaded
          if (backgroundImagesLoaded && backgroundImagesRef.current.buildings) {
            // Draw buildings to end at ground level (y=400)
            ctx.drawImage(
              backgroundImagesRef.current.buildings,
              0, 0, canvas.width, 400
            );
            
            // Draw ground if available
            if (backgroundImagesRef.current.ground) {
              const groundY = 400;
              const groundHeight = canvas.height - groundY;
              ctx.drawImage(
                backgroundImagesRef.current.ground,
                0, groundY, canvas.width, groundHeight
              );
            }
          }
          
          // Semi-transparent overlay for text readability
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(canvas.width/2 - 200, 120, 400, 250);
          
          ctx.fillStyle = 'white';
          ctx.font = '24px Arial';
          ctx.textAlign = 'center';
          
          ctx.fillText('Skate with Bitcoin', canvas.width / 2, 150);
          
          ctx.font = '18px Arial';
          ctx.fillText('Press SPACE to start', canvas.width / 2, 220);
          
          ctx.font = '14px Arial';
          ctx.fillText('SPACE/UP = Jump', canvas.width / 2, 280);
          ctx.fillText('LEFT = Slow down', canvas.width / 2, 305);
          ctx.fillText('RIGHT = Speed up', canvas.width / 2, 330);
          ctx.fillText('ANY KEY (except SPACE) = Use power-up (when available)', canvas.width / 2, 355);
        } catch (err) {
          console.error('Error in drawLoadingScreen:', err);
        }
      };
      
      drawLoadingScreen();
      
      // Create sound manager
      const soundManager = new SoundManager();
      soundManagerRef.current = soundManager;
      console.log('Sound manager created');
      
      // Create game components
      const inputManager = new InputManager();
      inputManagerRef.current = inputManager;
      console.log('Input manager created');
      
      // Create obstacle manager
      const obstacleManager = new ObstacleManager();
      obstacleManagerRef.current = obstacleManager;
      console.log('Obstacle manager created');
      
      // Create player with appropriate jump height
      const player = new Player({
        x: 100,
        y: 300,
        width: 60,
        height: 120,
        speed: 200,
        jumpForce: 500,
        gravity: 1200
      });
      
      player.debug = debug;
      playerRef.current = player;
      console.log('Player created');
      
      // Set up input bindings
      inputManager.bindKeys();
      console.log('Input keys bound');
      
      if (window.matchMedia('(max-width: 768px)').matches && document.body) {
        inputManager.bindTouchControls(document.body);
        console.log('Touch controls bound');
      }
      
      // Create game loop
      const gameLoop = new GameLoop({
        fps: 60,
        debug: debug
      });
      
      gameLoopRef.current = gameLoop;
      console.log('Game loop created');
      
      // Debug check for localStorage and high score
      console.log('[Debug] Current high score state:', highScore);
      console.log('[Debug] localStorage high score:', localStorage.getItem('skatewithbitcoinHighScore'));
      
      // Start the game function (internal)
      const startGame = () => {
        try {
          console.log('startGame function called, current state:', gameStarted);
          if (!gameStarted) {
            console.log('Setting game started to true');
            if (player) {
              console.log('Setting player state to skating');
              player.state = 'skating';
            }
            
            // Add test obstacles if in debug mode
            if (debug) {
              console.log('Creating test obstacles');
              obstacleManager.createTestObstacles();
            }
            
            // Start background music - ensure this happens before setting gameStarted state
            if (soundManagerRef.current && soundEnabled) {
              console.log('Playing background music from spacebar start');
              soundManagerRef.current.stop('music'); // Stop any existing music first
              setTimeout(() => soundManagerRef.current?.play('music'), 100); // Small delay to ensure audio context is ready
            }
            
            setGameStarted(true);
          }
        } catch (err) {
          console.error('Error in startGame:', err);
        }
      };
      
      // Restart the game after crash
      const restartGame = () => {
        try {
          console.log('[Restart] restartGame function called');
          if (player) {
            // Check if current score is a new high score before resetting
            if (player.score > highScoreRef.current) {
              console.log(`[Restart] Saving new high score before restart: ${player.score} > ${highScoreRef.current}`);
              setHighScore(player.score);
              highScoreRef.current = player.score;
              localStorage.setItem('skatewithbitcoinHighScore', player.score.toString());
            }
            
            // Reset all game state except high score
            setScore(0);
            floatingScoresRef.current = []; // Clear all floating score indicators
            
            // Reset player position and state
            player.reset(100, 300);
            player.state = 'skating';
            
            // Clear and reset obstacles
            obstacleManager.reset();
            
            // Explicitly reset the powerup system for reliable respawning
            obstacleManager.resetPowerUpSystem();
            
            cameraOffsetRef.current = 0;
            
            // Resume background music if sound is enabled
            if (soundManagerRef.current && soundEnabled) {
              soundManagerRef.current.play('music');
            }
            
            // Re-enable game
            setGameStarted(true);
            
            console.log('Game fully reset and restarted, high score preserved: ' + highScoreRef.current);
          }
        } catch (err) {
          console.error('Error in restartGame:', err);
        }
      };
      
      // Listen for game start
      const checkForGameStart = (e: KeyboardEvent) => {
        try {
          // Ignore key events when handling text input (e.g. if a form element is focused)
          if (document.activeElement && 
              (document.activeElement.tagName === 'INPUT' || 
               document.activeElement.tagName === 'TEXTAREA')) {
            return;
          }
          
          console.log('Key pressed:', e.code);
          if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp')) {
            // Prevent default browser behavior (scrolling with space)
            e.preventDefault();
            
            console.log('Start/jump key detected, gameStarted:', gameStarted, 'crashed:', player.crashed);
            
            // Prevent multiple rapid restarts
            const now = Date.now();
            const lastRestartTime = player._lastRestartTime || 0;
            const cooldownPeriod = 1000; // 1 second cooldown
            
            // Only start if not already started
            if (!gameStarted) {
              startGame();
            } 
            // Only restart if crashed AND cooldown period has passed
            else if (player.crashed && (now - lastRestartTime > cooldownPeriod)) {
              player._lastRestartTime = now; // Store timestamp for cooldown
              restartGame();
            }
          }
        } catch (err) {
          console.error('Error in checkForGameStart:', err);
        }
      };
      
      window.addEventListener('keydown', checkForGameStart);
      console.log('Key event listener added');
      
      // Update function
      gameLoop.setUpdateCallback((deltaTime: number) => {
        try {
          // Skip updates if game hasn't started
          if (!gameStarted) return;
          
          // Limit maximum delta time to prevent physics glitches
          const cappedDeltaTime = Math.min(deltaTime, 100);
          
          // Check if player just jumped (to play sound)
          const wasJumping = player.state === 'jumping';
          
          // Update player
          player.update(cappedDeltaTime, inputManager);
          
          // Play jump sound if player just started jumping
          if (player.state === 'jumping' && !wasJumping && soundManagerRef.current) {
            soundManagerRef.current.play('jump');
          }
          
          // Update camera to follow player
          cameraOffsetRef.current = Math.max(0, player.x - 100);
          
          // Update obstacles and check for collisions
          if (!player.crashed) {
            const collisionResult = obstacleManager.update(cappedDeltaTime, player);
            
            // Handle collisions
            if (collisionResult.type === 'crash') {
              // Ensure we don't double-crash or crash during special states
              if (!player.crashed) {
                console.log('Player crashed into obstacle');
                player.crash();
                
                // Play crash sound and pause background music
                if (soundManagerRef.current) {
                  soundManagerRef.current.play('crash');
                  soundManagerRef.current.pause('music');
                }
              }
            } else if (collisionResult.type === 'score') {
              if (collisionResult.points) {
                const pointsToAdd = collisionResult.points;
                // Play score sound
                if (soundManagerRef.current) {
                  soundManagerRef.current.play('score');
                }
                
                // Update the component's score state to stay in sync with player.score
                setScore(player.score);
                
                // Update high score if needed
                if (player.score > highScoreRef.current) {
                  console.log(`[Score Update] New high score! ${player.score} > ${highScoreRef.current}`);
                  
                  // Update high score state
                  const newHighScore = player.score;
                  setHighScore(newHighScore);
                  highScoreRef.current = newHighScore;
                  
                  // Store in localStorage
                  try {
                    localStorage.setItem('skatewithbitcoinHighScore', newHighScore.toString());
                    console.log(`[Score Update] High score saved to localStorage: ${newHighScore}`);
                  } catch (err) {
                    console.error('[Score Update] Error saving high score to localStorage:', err);
                  }
                } else {
                  console.log(`[Score Update] Score updated (${player.score}), but not higher than high score (${highScoreRef.current})`);
                }
                
                // Show a floating score indicator
                if (collisionResult.obstacle) {
                  const obstacle = collisionResult.obstacle;
                  console.log(`Scored ${pointsToAdd} points for passing obstacle at ${obstacle.x}`);
                  
                  // Create floating score indicator
                  floatingScoresRef.current.push({
                    value: pointsToAdd,
                    x: obstacle.x + obstacle.width / 2,
                    y: obstacle.y - 20,
                    color: '#FFFFFF', // Always white now that points are always 1
                    life: 1500, // ms
                    maxLife: 1500
                  });
                }
              }
            }
          }
          
          // Update floating score indicators
          floatingScoresRef.current.forEach((indicator, index) => {
            indicator.life -= cappedDeltaTime;
            indicator.y -= 0.05 * cappedDeltaTime; // Float upward
          });
          
          // Remove expired floating score indicators
          floatingScoresRef.current = floatingScoresRef.current.filter(indicator => indicator.life > 0);
          
          // Update FPS display if in debug mode
          if (debug) {
            setFps(Math.round(gameLoop.getFPS()));
          }
          
          // Update input manager
          inputManager.update();
        } catch (err) {
          console.error('Error in update callback:', err);
        }
      });
      
      // Render function
      gameLoop.setRenderCallback(() => {
        try {
          // Clear canvas - change the background to match ground color instead of blue/black
          ctx.fillStyle = '#3e291e'; // Match the ground color
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          if (!gameStarted) {
            drawLoadingScreen();
            return;
          }
          
          // Draw backgrounds with parallax effect
          const bgImages = backgroundImagesRef.current;
          
          // Use only the new background-buildings.png for the entire background
          if (backgroundImagesLoaded && bgImages.buildings) {
            const buildingParallax = cameraOffsetRef.current * 0.5;
            
            // Draw the buildings image to end at ground level (y=400)
            // Draw the image twice to create a seamless loop
            ctx.drawImage(
              bgImages.buildings,
              -buildingParallax % bgImages.buildings.width,
              0, // Start from the top of the canvas
              bgImages.buildings.width,
              400 // End at the ground level (y=400)
            );
            ctx.drawImage(
              bgImages.buildings,
              (-buildingParallax % bgImages.buildings.width) + bgImages.buildings.width,
              0, // Start from the top of the canvas
              bgImages.buildings.width,
              400 // End at the ground level (y=400)
            );
          } else {
            // Fallback if image not loaded
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw some simple buildings as fallback
            ctx.fillStyle = '#333';
            for (let i = 0; i < 5; i++) {
              const buildingX = ((i * 200) - ((cameraOffsetRef.current * 0.5) % 200));
              const buildingHeight = 100 + (i % 3) * 50;
              ctx.fillRect(buildingX, 400 - buildingHeight, 100, buildingHeight);
            }
          }
          
          // Draw ground with camera offset and parallax
          if (backgroundImagesLoaded && bgImages.ground) {
            const groundParallax = cameraOffsetRef.current * 1.0; // Full parallax for ground
            
            // Calculate the exact position once to avoid redundant calculations
            const groundWidth = bgImages.ground.width;
            const groundHeight = canvas.height - 400; // Adjust ground height to fill the entire bottom
            const groundY = 400;
            const parallaxOffset = -groundParallax % groundWidth;
            
            // Use double buffering technique - only draw what's visible plus a small buffer
            // Draw first copy
            ctx.drawImage(
              bgImages.ground,
              parallaxOffset,
              groundY,
              groundWidth, 
              groundHeight
            );
            
            // Draw second copy only if it would be visible on screen
            if (parallaxOffset + groundWidth < canvas.width) {
              ctx.drawImage(
                bgImages.ground,
                parallaxOffset + groundWidth,
                groundY,
                groundWidth,
                groundHeight
              );
            }
            
            // Draw additional ground fill beneath to ensure no blue showing
            ctx.fillStyle = '#3e291e'; // Match ground color
            ctx.fillRect(0, groundY + groundHeight, canvas.width, canvas.height - (groundY + groundHeight));
          } else {
            // Efficient fallback - just draw the ground once
            ctx.fillStyle = '#3e291e'; // Dark brown for ground
            ctx.fillRect(0, 400, canvas.width, canvas.height - 400);
            
            // Draw fewer ground lines for better performance
            const visibleWidth = canvas.width;
            const lineSpacing = 100;
            const linesNeeded = Math.ceil(visibleWidth / lineSpacing) + 1;
            
            ctx.strokeStyle = '#4a3528';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            for (let i = 0; i < linesNeeded; i++) {
              const lineX = ((i * lineSpacing) - (cameraOffsetRef.current % lineSpacing));
              ctx.moveTo(lineX, 400);
              ctx.lineTo(lineX + 60, 500);
            }
            ctx.stroke();
          }
          
          // Draw obstacles
          obstacleManager.draw(ctx);
          
          // Draw player with camera offset
          player.draw(ctx, cameraOffsetRef.current);
          
          // Draw floating score indicators
          floatingScoresRef.current.forEach(indicator => {
            const screenX = indicator.x - cameraOffsetRef.current;
            // Skip if off screen
            if (screenX < -50 || screenX > canvas.width + 50) return;
            
            // Fade out as life decreases
            const alpha = indicator.life / indicator.maxLife;
            const size = 14 + (1 - alpha) * 10; // Get bigger as they fade
            
            ctx.fillStyle = indicator.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(`+${indicator.value}`, screenX, indicator.y);
          });
          
          // Draw HUD
          player.drawHUD(ctx, canvas.width, canvas.height);
          
          // Draw high score in top right (more visible now)
          ctx.fillStyle = 'white';
          ctx.font = '16px Arial';
          ctx.textAlign = 'right';
          ctx.fillText(`HIGH SCORE: ${highScoreRef.current}`, canvas.width - 10, 25);
          
          // Draw game over text
          if (player.crashed) {
            // Semi-transparent overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Game over panel with border
            ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
            ctx.fillRect(canvas.width/2 - 200, 100, 400, 250);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(canvas.width/2 - 200, 100, 400, 250);
            
            // Game over title
            ctx.fillStyle = 'white';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over', canvas.width / 2, 150);
            
            // Final score with large prominent display
            ctx.font = '48px Arial';
            ctx.fillText(`${player.score}`, canvas.width / 2, 220);
            
            // Display current high score
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText(`High Score: ${highScoreRef.current}`, canvas.width / 2, 250);
            
            // New high score indicator
            if (player.score >= highScoreRef.current) {
              console.log(`[Game Over] Showing new high score message: ${player.score} >= ${highScoreRef.current}`);
              ctx.fillStyle = '#FFD700'; // Gold color
              ctx.font = '24px Arial';
              ctx.fillText('New High Score!', canvas.width / 2, 280);
            }
            
            // Restart instruction
            ctx.fillStyle = 'white';
            ctx.font = '18px Arial';
            ctx.fillText('Press SPACE to restart', canvas.width / 2, 320);
          }
          
          // Draw debug info
          if (debug) {
            ctx.fillStyle = 'yellow';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`FPS: ${fps}`, 10, height - 10);
            ctx.fillText(`Obstacles: ${obstacleManager.obstacles.length}`, 10, height - 25);
            ctx.fillText(`Speed: ${Math.round(player.speed)}`, 10, height - 40);
            ctx.fillText(`Position: ${Math.round(player.x)},${Math.round(player.y)}`, 10, height - 55);
            ctx.fillText(`Camera: ${Math.round(cameraOffsetRef.current)}`, 10, height - 70);
            ctx.fillText(`Player state: ${player.state}`, 10, height - 85);
            ctx.fillText(`Can double jump: ${player.canDoubleJump}`, 10, height - 100);
          }
        } catch (err) {
          console.error('Error in render callback:', err);
        }
      });
      
      // Handle window resize
      const handleResize = () => {
        if (canvas) {
          try {
            // Get the parent container dimensions
            const container = canvas.parentElement;
            if (container) {
              // Get available space (accounting for minimal UI elements)
              const availableHeight = window.innerHeight - 30; // Smaller footer buffer
              const availableWidth = container.clientWidth;
              
              console.log(`Available space: ${availableWidth}x${availableHeight}`);
              
              // Game aspect ratio
              const aspectRatio = width / height;
              
              // Calculate optimal dimensions to fill the space better
              let newWidth, newHeight;
              
              if (availableWidth / availableHeight > aspectRatio) {
                // Container is wider than needed - use most of available height
                newHeight = availableHeight * 0.95; // Use 95% of available height
                newWidth = newHeight * aspectRatio;
              } else {
                // Container is taller - use most of available width
                newWidth = availableWidth * 0.98; // Use 98% of available width
                newHeight = newWidth / aspectRatio;
              }
              
              // Apply new dimensions
              canvas.style.width = `${newWidth}px`;
              canvas.style.height = `${newHeight}px`;
              
              console.log(`Canvas resized to ${newWidth}x${newHeight}`);
            }
          } catch (err) {
            console.error('Error in resize handler:', err);
          }
        }
      };
      
      // Initial resize and add window resize listener
      window.addEventListener('resize', handleResize);
      handleResize();
      
      // Also handle orientation changes on mobile
      window.addEventListener('orientationchange', handleResize);
      
      // Start game loop
      setTimeout(() => {
        setIsLoading(false);
        gameLoop.start();
        console.log('Game loop started');
      }, 500);
      
      // Clean up
      return () => {
        try {
          gameLoop.stop();
          inputManager.unbindKeys();
          
          // Stop all sounds
          if (soundManagerRef.current) {
            soundManagerRef.current.stop('music');
            soundManagerRef.current.stop('jump');
            soundManagerRef.current.stop('crash');
            soundManagerRef.current.stop('score');
          }
          
          // Remove event listeners
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('orientationchange', handleResize);
          window.removeEventListener('keydown', checkForGameStart);
          
          // Clear game state
          floatingScoresRef.current = []; // Clear floating scores
          
          console.log('Cleanup: game resources released');
        } catch (err) {
          console.error('Error in cleanup:', err);
        }
      };
    } catch (e) {
      console.error('Error in game initialization:', e);
    }
  }, [width, height, debug, gameStarted]);
  
  // Prevent scrolling on the body
  useEffect(() => {
    // Prevent scrolling on body and html
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.documentElement.style.height = '100vh';
      document.body.style.margin = '0';
      document.documentElement.style.margin = '0';
    }
    
    return () => {
      // Restore normal scrolling when component unmounts
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        document.body.style.height = '';
        document.documentElement.style.height = '';
        document.body.style.margin = '';
        document.documentElement.style.margin = '';
      }
    };
  }, []);
  
  // Toggle sound on/off
  const toggleSound = useCallback(() => {
    if (soundManagerRef.current) {
      const newMuted = soundManagerRef.current.toggleMute();
      setSoundEnabled(!newMuted);
      
      // If enabling sound and game is already started, play the music
      if (!newMuted && gameStarted) {
        soundManagerRef.current.play('music');
      }
    }
  }, [gameStarted]);
  
  // Insert attribution directly into document body
  useEffect(() => {
    // Create attribution element
    const attributionElement = document.createElement('div');
    attributionElement.id = 'skatewithbitcoin-attribution';
    attributionElement.style.position = 'fixed';
    attributionElement.style.bottom = '0';
    attributionElement.style.left = '0';
    attributionElement.style.right = '0';
    attributionElement.style.backgroundColor = 'rgba(30, 30, 30, 0.85)';
    attributionElement.style.color = 'white';
    attributionElement.style.textAlign = 'center';
    attributionElement.style.padding = '12px';
    attributionElement.style.fontWeight = 'bold';
    attributionElement.style.zIndex = '100000';
    attributionElement.style.fontSize = '16px';
    attributionElement.style.boxShadow = '0 -2px 10px rgba(0,0,0,0.3)';
    
    // Set content
    attributionElement.innerHTML = 'If you like the game, follow me <a href="https://x.com/jas_jaski" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: 800; text-decoration: none;">@jas_jaski</a>';
    
    // Check if element already exists
    const existingElement = document.getElementById('skatewithbitcoin-attribution');
    if (existingElement) {
      document.body.removeChild(existingElement);
    }
    
    // Append to body
    document.body.appendChild(attributionElement);
    
    // Cleanup function
    return () => {
      const element = document.getElementById('skatewithbitcoin-attribution');
      if (element) {
        document.body.removeChild(element);
      }
    };
  }, []);
  
  // Play background music when game starts
  useEffect(() => {
    if (gameStarted && soundManagerRef.current && soundEnabled) {
      console.log('Playing background music from gameStarted state change');
      soundManagerRef.current.stop('music'); // Stop any existing music first
      setTimeout(() => soundManagerRef.current?.play('music'), 200); // Slightly longer delay for state changes
    }
  }, [gameStarted, soundEnabled]);
  
  // Function to show high scores
  const showHighScores = useCallback(() => {
    if (!modalCooldown) {
      console.log('Show high scores button clicked');
      setIsHighScoresOpen(true);
    }
  }, [modalCooldown]);

  return (
    <div className="fixed inset-0 flex flex-col bg-black overflow-hidden">
      {/* Main game container - takes all space */}
      <div className="flex-grow relative w-full flex items-center justify-center bg-black overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 m-auto max-w-full max-h-full"
          width={width}
          height={height}
        />
        
        {/* Start instruction - shown when game hasn't started */}
        {!gameStarted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              style={{
                backgroundColor: 'rgba(0,0,0,0.85)',
                borderRadius: '12px',
                padding: '32px 40px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.1) inset',
                maxWidth: '90%',
                backdropFilter: 'blur(5px)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <h1 
                style={{
                  fontSize: '42px',
                  fontWeight: 'bold',
                  color: 'white',
                  marginBottom: '24px',
                  textAlign: 'center',
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)'
                }}
              >
                Skateboarding Game
              </h1>
              <p 
                style={{
                  fontSize: '18px',
                  color: 'white',
                  marginBottom: '32px',
                  textAlign: 'center',
                  opacity: '0.9'
                }}
              >
                Press SPACE or click Start Game to begin
              </p>
              <div 
                style={{
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  borderRadius: '8px',
                  padding: '12px 18px',
                  marginBottom: '16px'
                }}
              >
                <p 
                  style={{
                    fontSize: '14px',
                    color: 'white',
                    opacity: '0.8',
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontWeight: 'bold' }}>SPACE/UP</span> = Jump | <span style={{ fontWeight: 'bold' }}>LEFT/RIGHT</span> = Control Speed<br/>
                  <span style={{ fontWeight: 'bold' }}>ANY KEY (except SPACE)</span> = Use power-ups (when available)
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Control buttons container */}
        <div 
          style={{
            position: 'absolute',
            top: '100px',
            right: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {/* Restart Game Button removed */}
          
          {/* Sound Toggle Button */}
          <button 
            onClick={toggleSound}
            style={{
              backgroundColor: soundEnabled ? 'rgba(55, 65, 81, 0.85)' : 'rgba(239, 68, 68, 0.85)',
              color: 'white',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            }}
          >
            {soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
          </button>
          
          {/* High Scores Button with enhanced styling */}
          <button 
            id="highscores-toggle-button"
            onClick={showHighScores}
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.85)',
              color: 'white',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              zIndex: 100
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
              e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.85)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.85)';
            }}
          >
            📊 Leaderboard
          </button>
        </div>
        
        {/* Game Over Screen - Only show Start Game button, not Restart */}
        <div className="absolute bottom-16 left-0 right-0 flex justify-center">
          {!gameStarted && (
            <button 
              onClick={handleStartGame}
              style={{
                backgroundColor: 'rgba(22, 163, 74, 0.85)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: '0.95'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
                e.currentTarget.style.backgroundColor = 'rgba(21, 128, 61, 0.85)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                e.currentTarget.style.backgroundColor = 'rgba(22, 163, 74, 0.85)';
                e.currentTarget.style.opacity = '0.95';
              }}
            >
              Start Game
            </button>
          )}
        </div>
      </div>

      {/* High Scores Modal */}
      <HighScores 
        isOpen={isHighScoresOpen}
        onClose={() => {
          console.log('Closing high scores modal, setting cooldown');
          setIsHighScoresOpen(false);
          setModalCooldown(true); // Set cooldown when modal is closed
          
          // If we just showed high scores for a crash, reset the game state
          if (gameState === 'highScoreShown' || gameState === 'crashed') {
            setGameState('idle');
          }
        }}
        currentScore={score}
        playerHighScore={highScore}
        onSubmit={handleHighScoreSubmit}
      />
    </div>
  );
};

export default Canvas; 