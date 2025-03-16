/**
 * InputManager.ts - Handles keyboard and touch input
 */

// Define supported input actions
export type InputAction = 
  'jump' | 'left' | 'right' | 
  'trickBlockflip' | 'trickHashSpin' | 'trickHodlGrab';

// Interface for a key binding
interface KeyBinding {
  code: string;
  key?: string;
  action: InputAction;
}

export default class InputManager {
  // Key state tracking
  private keysDown: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private keysReleased: Set<string> = new Set();
  
  // Touch controls tracking
  private touchElements: HTMLElement[] = [];

  // Key mapping configuration
  private keyMap: KeyBinding[] = [
    { code: 'Space', action: 'jump' },
    { code: 'KeyW', action: 'jump' },
    { code: 'ArrowUp', action: 'jump' },
    
    { code: 'ArrowLeft', action: 'left' },
    { code: 'KeyA', action: 'left' },
    
    { code: 'ArrowRight', action: 'right' },
    { code: 'KeyD', action: 'right' },
    
    { code: 'KeyQ', action: 'trickBlockflip' },
    { code: 'KeyE', action: 'trickHashSpin' },
    { code: 'KeyR', action: 'trickHodlGrab' }
  ];

  constructor() {
    console.log('InputManager created');
  }

  // Check if a key is currently pressed
  public isPressed(action: InputAction): boolean {
    return this.keyMap.some(mapping => 
      mapping.action === action && this.keysDown.has(mapping.code)
    );
  }

  // Check if a key was just pressed this frame
  public wasJustPressed(action: InputAction): boolean {
    return this.keyMap.some(mapping => 
      mapping.action === action && this.keysPressed.has(mapping.code)
    );
  }

  // Check if a key was just released this frame
  public wasJustReleased(action: InputAction): boolean {
    return this.keyMap.some(mapping => 
      mapping.action === action && this.keysReleased.has(mapping.code)
    );
  }

  // Check if any key was just pressed this frame (used for power-up activation)
  public hasAnyKeyJustPressed(): boolean {
    return this.keysPressed.size > 0;
  }

  // Bind keyboard event listeners
  public bindKeys(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Find if this is a game key we care about
      const isGameKey = this.keyMap.some(mapping => mapping.code === e.code);
      
      // Prevent default browser actions for game keys (like space causing page scroll)
      if (isGameKey) {
        e.preventDefault();
      }
      
      console.log('Key down event:', e.code);
      if (!this.keysDown.has(e.code)) {
        this.keysDown.add(e.code);
        this.keysPressed.add(e.code);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Find if this is a game key we care about
      const isGameKey = this.keyMap.some(mapping => mapping.code === e.code);
      
      // Prevent default browser actions for game keys
      if (isGameKey) {
        e.preventDefault();
      }
      
      console.log('Key up event:', e.code);
      this.keysReleased.add(e.code);
      this.keysDown.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    console.log('Key bindings attached with mappings:', this.keyMap);
  }

  // Bind touch controls for mobile devices
  public bindTouchControls(container: HTMLElement): void {
    this.createTouchButton(container, 'left', 20, -70, 'LEFT');
    this.createTouchButton(container, 'right', 100, -70, 'RIGHT');
    this.createTouchButton(container, 'jump', -70, -70, 'JUMP');
    
    // Add trick buttons on right side
    this.createTouchButton(container, 'trickBlockflip', -70, -150, 'FLIP');
    this.createTouchButton(container, 'trickHashSpin', -150, -150, '360');
    
    console.log('Touch controls added to container');
  }

  // Create a touch button element
  private createTouchButton(
    container: HTMLElement, 
    action: InputAction, 
    right: number, 
    bottom: number, 
    label: string
  ): HTMLElement {
    const button = document.createElement('div');
    button.className = 'touch-control';
    button.textContent = label;
    button.style.right = `${right}px`;
    button.style.bottom = `${bottom}px`;
    
    // Handle touch events
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      console.log(`Touch ${action} started`);
      
      // Find the corresponding keyboard action
      const binding = this.keyMap.find(k => k.action === action);
      if (binding) {
        this.keysDown.add(binding.code);
        this.keysPressed.add(binding.code);
      }
    });
    
    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      console.log(`Touch ${action} ended`);
      
      // Find the corresponding keyboard action
      const binding = this.keyMap.find(k => k.action === action);
      if (binding) {
        this.keysDown.delete(binding.code);
        this.keysReleased.add(binding.code);
      }
    });
    
    container.appendChild(button);
    this.touchElements.push(button);
    return button;
  }

  // Update input state (called once per frame)
  public update(): void {
    // Clear the just-pressed and just-released sets
    this.keysPressed.clear();
    this.keysReleased.clear();
  }

  // Remove all event listeners (called on cleanup)
  public unbindKeys(): void {
    // Note: For proper cleanup we should store and remove the exact
    // event listener functions, but this simplifies our example
    window.removeEventListener('keydown', () => {});
    window.removeEventListener('keyup', () => {});
    
    // Remove touch buttons
    this.touchElements.forEach(el => {
      el.parentNode?.removeChild(el);
    });
    this.touchElements = [];
    
    console.log('Input bindings removed');
  }
} 