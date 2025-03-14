'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import to avoid SSR issues with Canvas
const Canvas = dynamic(() => import('@/components/Game/Canvas'), {
  ssr: false,
});

export default function Home() {
  // Set debug mode to true by default and remove the toggle functionality
  const debugMode = true;
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-0 bg-gray-900">
      <div className="w-full h-full flex-grow">
        <Canvas debug={debugMode} />
      </div>
      {/* Instruction text removed */}
    </main>
  );
} 