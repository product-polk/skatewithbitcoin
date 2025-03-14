'use client';

import { useEffect, useState } from 'react';

// Define high score interface
interface HighScore {
  id: string;
  score: number;
  name: string;
  date: string;
}

interface HighScoresProps {
  isOpen: boolean;
  onClose: () => void;
  currentScore: number;
  playerHighScore: number;
  onSubmit?: (name: string) => void;
}

const HighScores: React.FC<HighScoresProps> = ({
  isOpen,
  onClose,
  currentScore,
  playerHighScore,
  onSubmit
}) => {
  // Always log when component renders
  console.log('HighScores component rendering with props:', { isOpen, currentScore, playerHighScore });

  const [globalScores, setGlobalScores] = useState<HighScore[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState<boolean>(false);
  const [autoSubmitted, setAutoSubmitted] = useState<boolean>(false);

  // Generate a device ID based on browser information
  useEffect(() => {
    const savedDeviceId = localStorage.getItem('skatewithbitcoinDeviceId');
    
    if (savedDeviceId) {
      setDeviceId(savedDeviceId);
    } else {
      const newDeviceId = `device_${Math.round(Math.random() * 1000000)}`;
      localStorage.setItem('skatewithbitcoinDeviceId', newDeviceId);
      setDeviceId(newDeviceId);
    }
    
    // Load saved player name if available
    const savedPlayerName = localStorage.getItem('skatewithbitcoinPlayerName');
    if (savedPlayerName) {
      setPlayerName(savedPlayerName);
    }
  }, []);

  // Fetch global high scores when the modal opens
  useEffect(() => {
    console.log('HighScores isOpen effect triggered:', isOpen);
    if (isOpen) {
      fetchHighScores();
    }
  }, [isOpen]);

  // Auto-submit high score if we have a saved name
  useEffect(() => {
    console.log('Auto-submit effect triggered with:', { 
      isOpen, 
      currentScore, 
      playerName, 
      autoSubmitted 
    });
    
    // Only auto-submit if we have a saved name from before
    if (isOpen && currentScore > 0) {
      const savedPlayerName = localStorage.getItem('skatewithbitcoinPlayerName');
      
      if (savedPlayerName && playerName && !autoSubmitted) {
        // We have a SAVED name from before and haven't submitted yet - auto-submit
        console.log('Auto-submitting high score with saved name:', playerName);
        // Add a small delay to ensure component is fully mounted
        setTimeout(() => {
          submitScore();
          setAutoSubmitted(true);
        }, 700);
      } else if (!savedPlayerName) {
        // No saved name, make sure the input form is shown but DON'T auto-submit
        console.log('No saved player name found, showing input form for manual entry');
        setShowNameInput(true);
      }
    }
  }, [isOpen, currentScore, playerName, autoSubmitted]);

  // Always force showing the input form if we have a score but no player name
  useEffect(() => {
    if (isOpen && currentScore > 0 && !playerName) {
      console.log('Force showing name input because no saved name exists');
      setShowNameInput(true);
    }
  }, [isOpen, currentScore, playerName]);

  // Make sure to show the form when it's opened and we don't have a player name yet
  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened with currentScore:', currentScore);
      if (currentScore > 0 && !playerName) {
        console.log('Showing name input form on modal open');
        setShowNameInput(true);
      }
    }
  }, [isOpen]);

  // When the component mounts, check localStorage values to help with debugging
  useEffect(() => {
    // Log all localStorage items related to the game
    console.log('Current localStorage state:');
    console.log('- High Score:', localStorage.getItem('skatewithbitcoinHighScore'));
    console.log('- Player Name:', localStorage.getItem('skatewithbitcoinPlayerName'));
    console.log('- Device ID:', localStorage.getItem('skatewithbitcoinDeviceId'));
    console.log('- Auto Submitted:', localStorage.getItem('skatewithbitcoinAutoSubmitted'));
    
    // Component state
    console.log('Component state on mount:');
    console.log('- isOpen:', isOpen);
    console.log('- currentScore:', currentScore);
    console.log('- playerHighScore:', playerHighScore);
    console.log('- playerName state:', playerName);
  }, []);
  
  // Reset the autoSubmitted flag whenever the modal is closed
  useEffect(() => {
    if (!isOpen) {
      console.log('Modal closed, resetting autoSubmitted state for next time');
      setAutoSubmitted(false);
      
      // Clean up local storage flag to ensure future submissions work
      try {
        localStorage.removeItem('skatewithbitcoinAutoSubmitted');
      } catch (e) {
        console.error('Error removing autoSubmitted flag:', e);
      }
    }
  }, [isOpen]);

  // Add an effect to handle keyboard event capture when the modal is open
  useEffect(() => {
    if (isOpen) {
      // Function to prevent keyboard events from reaching the game
      const preventKeyboardEvents = (e: KeyboardEvent) => {
        // Only prevent events when the modal is open
        if (isOpen) {
          // Stop all keyboard events from bubbling up
          e.stopPropagation();
          
          // Prevent default actions for game control keys
          if (e.code === 'Space' || e.code === 'ArrowUp' || 
              e.code === 'ArrowDown' || e.code === 'ArrowLeft' || 
              e.code === 'ArrowRight') {
            e.preventDefault();
          }
          
          console.log('Blocked keyboard event in high scores modal:', e.code);
        }
      };
      
      // Add event listener with capture phase to catch events before they reach other handlers
      document.addEventListener('keydown', preventKeyboardEvents, true);
      
      // Clean up
      return () => {
        document.removeEventListener('keydown', preventKeyboardEvents, true);
      };
    }
  }, [isOpen]);

  const fetchHighScores = async () => {
    console.log('Attempting to fetch high scores from API');
    try {
      setIsLoading(true);
      setError(null);
      
      // Add a timestamp to bypass cache
      const response = await fetch(`/api/highscores?t=${Date.now()}`);
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch high scores');
      }
      
      const data = await response.json();
      console.log('Received high scores data:', data);
      setGlobalScores(data);
      
    } catch (err) {
      console.error('Error fetching high scores:', err);
      setError('Failed to load high scores. Please try again later.');
      // Add fallback data if API fails
      setGlobalScores([
        { id: 'fallback1', score: 1000, name: 'API Error Player', date: new Date().toISOString() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const submitScore = async () => {
    if (!playerName.trim()) {
      console.log('Player name is empty, cannot submit score');
      return;
    }
    
    try {
      setSubmitting(true);
      console.log('Starting score submission process with name:', playerName, 'score:', currentScore);
      
      // Save player name to localStorage immediately so it's available even if API submission fails
      localStorage.setItem('skatewithbitcoinPlayerName', playerName);
      console.log('Player name saved to localStorage:', playerName);
      
      // Generate timestamp for score verification
      const timestamp = Date.now().toString();
      
      // Create a simple client-side hash for score verification
      const scoreHash = await generateScoreHash(currentScore, deviceId || 'unknown', timestamp);
      
      console.log('Submitting high score:', { 
        score: currentScore, 
        name: playerName, 
        deviceId,
        timestamp,
        scoreHash
      });
      
      try {
        const response = await fetch('/api/highscores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            score: currentScore,
            name: playerName,
            deviceId,
            timestamp,
            scoreHash
          }),
        });
        
        console.log('Score submission response status:', response.status);
        
        if (!response.ok) {
          throw new Error('Failed to submit high score');
        }
        
        const data = await response.json();
        console.log('Score submission response data:', data);
        
        // Update global scores with the response
        if (data.topScores) {
          setGlobalScores(data.topScores);
        }
        if (data.rank) {
          setPlayerRank(data.rank);
        }
        setShowNameInput(false);
        
        // Call the onSubmit callback if provided
        if (onSubmit) {
          console.log('Calling onSubmit callback with name:', playerName);
          onSubmit(playerName);
        }
      } catch (fetchError) {
        console.error('Fetch error during score submission:', fetchError);
        throw fetchError;
      }
      
    } catch (err) {
      console.error('Error submitting high score:', err);
      setError('Failed to submit your score. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with player name:', playerName);
    
    if (!playerName.trim()) {
      console.log('Empty player name, not submitting');
      return;
    }
    
    submitScore();
  };

  // Helper function to generate a hash for score verification
  // This is a simplified version and not cryptographically secure
  // In a real app, you would use a more secure method
  const generateScoreHash = async (score: number, deviceId: string, timestamp: string) => {
    // In a real app, this would use crypto APIs and match server implementation
    // For this demo, we're using a simple concatenation as a placeholder
    const data = `${score}:${deviceId}:${timestamp}`;
    
    // Convert to a simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Always render a visible container, but control content with isOpen
  return (
    <div id="highscores-component-root">
      {isOpen && (
        <div 
          id="highscores-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            animation: 'fadeIn 0.3s ease-out'
          }}
          // Add event handlers to prevent keyboard events from reaching the game
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
          onKeyUp={(e) => {
            e.stopPropagation();
          }}
          onKeyPress={(e) => {
            e.stopPropagation();
          }}
        >
          <div 
            id="highscores-modal-content"
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
              color: 'white',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              animation: 'scaleIn 0.3s ease-out',
              scrollbarWidth: 'thin',
              scrollbarColor: '#3b82f6 #1e293b'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '16px'
            }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: 'white',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
              }}>Global Leaderboard</h2>
              <button 
                onClick={onClose}
                style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{
              backgroundColor: 'rgba(51, 65, 85, 0.5)',
              padding: '16px',
              marginBottom: '24px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <p style={{ 
                color: 'white', 
                marginBottom: '12px',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                Your Stats
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Current Score:</p>
                <p style={{ 
                  color: '#4ADE80', 
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>{currentScore}</p>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: playerRank ? '8px' : '0'
              }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Your High Score:</p>
                <p style={{ 
                  color: '#FBBF24', 
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>{playerHighScore}</p>
              </div>
              {playerRank && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(79, 70, 229, 0.2)',
                  borderRadius: '8px'
                }}>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Global Rank:</p>
                  <p style={{ 
                    color: '#A78BFA', 
                    fontWeight: 'bold',
                    fontSize: '18px'
                  }}>#{playerRank}</p>
                </div>
              )}
            </div>
            
            {/* Make name input form more prominent and always visible when needed */}
            {(showNameInput || (currentScore > 0 && !playerName)) && (
              <div style={{ 
                marginBottom: '28px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                animation: 'pulse 1.5s infinite ease-in-out'
              }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      color: 'white', 
                      display: 'block', 
                      marginBottom: '12px', 
                      fontWeight: 'bold',
                      fontSize: '16px' 
                    }}>
                      {currentScore > playerHighScore 
                        ? 'New high score! Enter your name:' 
                        : 'Enter your name to join the leaderboard:'}
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => {
                        console.log('Name input changed:', e.target.value);
                        setPlayerName(e.target.value);
                      }}
                      onClick={(e) => {
                        // Prevent event bubbling
                        e.stopPropagation();
                      }}
                      placeholder="Your name"
                      required
                      maxLength={20}
                      // Key event handler to prevent auto-submission
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          // Let the form handle the submission
                          return;
                        }
                        // Log other key presses to debug
                        console.log('Key pressed in name input:', e.key);
                        // Prevent event bubbling
                        e.stopPropagation();
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        color: '#1e293b',
                        border: '2px solid #3b82f6',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '500',
                        boxSizing: 'border-box',
                        outline: 'none',
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                      }}
                      onFocus={(e) => {
                        console.log('Input field focused');
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3), 0 2px 10px rgba(0, 0, 0, 0.1)';
                        // Prevent event bubbling
                        e.stopPropagation();
                      }}
                      onBlur={(e) => {
                        console.log('Input field blurred');
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      opacity: submitting ? '0.7' : '1'
                    }}
                    onMouseOver={(e) => {
                      if (!submitting) {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 10px rgba(0, 0, 0, 0.15)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!submitting) {
                        e.currentTarget.style.backgroundColor = '#3b82f6';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                      }
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Score'}
                  </button>
                </form>
              </div>
            )}
            
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: 'white', 
              marginBottom: '16px',
              position: 'relative',
              paddingLeft: '12px'
            }}>
              <span style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: '4px',
                height: '20px',
                backgroundColor: '#3b82f6',
                borderRadius: '2px'
              }}></span>
              Top Scores
            </h3>
            
            {isLoading ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 0', 
                color: 'white',
                opacity: '0.7'
              }}>
                <div style={{
                  border: '3px solid rgba(59, 130, 246, 0.3)',
                  borderTop: '3px solid #3b82f6',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px auto'
                }}></div>
                <p>Loading high scores...</p>
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ 
                  color: '#f87171', 
                  marginBottom: '12px',
                  fontWeight: 'bold'
                }}>{error}</p>
                <button 
                  onClick={fetchHighScores}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#60a5fa',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : globalScores.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 0',
                color: 'rgba(255, 255, 255, 0.7)',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                border: '1px dashed rgba(255, 255, 255, 0.2)'
              }}>
                <p>No high scores yet. Be the first!</p>
              </div>
            ) : (
              <div style={{ 
                borderRadius: '12px', 
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: 'rgba(51, 65, 85, 0.8)' }}>
                    <tr>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        fontSize: '13px',
                        fontWeight: 'bold', 
                        color: 'rgba(255, 255, 255, 0.8)', 
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        Rank
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        fontSize: '13px',
                        fontWeight: 'bold', 
                        color: 'rgba(255, 255, 255, 0.8)', 
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        Name
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'right', 
                        fontSize: '13px',
                        fontWeight: 'bold', 
                        color: 'rgba(255, 255, 255, 0.8)', 
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        Score
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'right', 
                        fontSize: '13px',
                        fontWeight: 'bold', 
                        color: 'rgba(255, 255, 255, 0.8)', 
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {globalScores.map((score, index) => (
                      <tr 
                        key={score.id}
                        style={{ 
                          backgroundColor: score.id === deviceId 
                            ? 'rgba(30, 64, 175, 0.3)' 
                            : index % 2 === 0 
                            ? 'rgba(30, 41, 59, 0.3)' 
                            : 'rgba(31, 41, 55, 0.5)',
                          borderBottom: '1px solid rgba(75, 85, 99, 0.2)',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          if (score.id === deviceId) {
                            e.currentTarget.style.backgroundColor = 'rgba(30, 64, 175, 0.5)';
                          } else {
                            e.currentTarget.style.backgroundColor = index % 2 === 0 
                              ? 'rgba(30, 41, 59, 0.3)' 
                              : 'rgba(31, 41, 55, 0.5)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (score.id === deviceId) {
                            e.currentTarget.style.backgroundColor = 'rgba(30, 64, 175, 0.3)';
                          } else {
                            e.currentTarget.style.backgroundColor = index % 2 === 0 
                              ? 'rgba(30, 41, 59, 0.3)' 
                              : 'rgba(31, 41, 55, 0.5)';
                          }
                        }}
                      >
                        <td style={{ 
                          padding: '14px 16px', 
                          color: index < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][index] : '#ffffff',
                          fontWeight: 'bold',
                          fontSize: index < 3 ? '18px' : '16px'
                        }}>
                          {index + 1}
                        </td>
                        <td style={{ 
                          padding: '14px 16px', 
                          color: '#d1d5db',
                          fontWeight: score.id === deviceId ? 'bold' : 'normal'
                        }}>
                          {score.name} {score.id === deviceId && <span style={{ color: '#60a5fa', fontSize: '12px' }}>(You)</span>}
                        </td>
                        <td style={{ 
                          padding: '14px 16px', 
                          color: '#fbbf24', 
                          fontWeight: 'bold', 
                          textAlign: 'right',
                          fontSize: '16px'
                        }}>
                          {score.score.toLocaleString()}
                        </td>
                        <td style={{ 
                          padding: '14px 16px', 
                          color: '#9ca3af', 
                          textAlign: 'right',
                          fontSize: '14px'
                        }}>
                          {formatDate(score.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div style={{ 
              marginTop: '28px', 
              display: 'flex', 
              justifyContent: 'flex-end',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '20px'
            }}>
              <button
                onClick={onClose}
                style={{
                  backgroundColor: 'rgba(75, 85, 99, 0.8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '15px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.8)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default HighScores; 