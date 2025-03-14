'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import to avoid SSR issues with Canvas
const Canvas = dynamic(() => import('@/components/Game/Canvas'), {
  ssr: false,
});

export default function Home() {
  const [debugMode, setDebugMode] = useState(true);
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
      <h1 className="text-3xl font-bold text-white mb-4">Skate with Bitcoin</h1>
      <div className="w-full max-w-3xl">
        <Canvas debug={debugMode} />
      </div>
      <p className="text-white text-sm mt-4 opacity-70">
        Use the Start Game button or press SPACE to begin
      </p>
      <div className="flex gap-2 mt-2">
        <button 
          onClick={() => {
            console.log('Debug mode toggled');
            setDebugMode(!debugMode);
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-1 px-2 rounded"
        >
          Toggle Debug Mode: {debugMode ? 'ON' : 'OFF'}
        </button>
        <button 
          onClick={() => {
            console.log('Test high scores API');
            fetch('/api/highscores')
              .then(res => res.json())
              .then(data => {
                console.log('High scores data:', data);
                alert('Check console for high scores data');
              })
              .catch(err => {
                console.error('Error fetching high scores:', err);
                alert('Error fetching high scores. Check console.');
              });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-2 rounded"
        >
          Test API
        </button>
      </div>
    </main>
  );
} 