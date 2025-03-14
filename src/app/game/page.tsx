'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import to avoid SSR issues with Canvas
const Canvas = dynamic(() => import('@/components/Game/Canvas'), {
  ssr: false,
});

export default function GamePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
      <div className="w-full max-w-3xl">
        <Canvas debug={true} />
      </div>
      
      <div className="mt-4 flex flex-col items-center text-white">
        <h2 className="text-lg font-bold mb-2">Controls:</h2>
        <ul className="list-disc flex flex-col gap-1 text-sm opacity-80">
          <li>SPACE/UP: Jump</li>
          <li>LEFT/RIGHT: Control speed</li>
          <li>Q/E/R: Perform tricks (in air)</li>
        </ul>
      </div>
    </div>
  );
} 