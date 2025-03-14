/**
 * Utility functions for device detection
 */

/**
 * Check if the current device is a mobile device based on user agent and screen size
 */
export const isMobileDevice = (): boolean => {
  // Check if window is defined (for SSR)
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check user agent for mobile devices
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
  
  // Check screen dimensions
  const isSmallScreen = window.innerWidth <= 768;
  
  // Check for touch capability
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Consider it a mobile device if it has a mobile user agent AND either a small screen or touch capability
  return isMobileUserAgent && (isSmallScreen || hasTouchScreen);
};

/**
 * Get the device orientation (portrait or landscape)
 */
export const getDeviceOrientation = (): 'portrait' | 'landscape' => {
  if (typeof window === 'undefined') {
    return 'landscape'; // Default for SSR
  }
  
  return window.innerWidth < window.innerHeight ? 'portrait' : 'landscape';
}; 