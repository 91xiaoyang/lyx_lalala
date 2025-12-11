import React, { Suspense } from 'react';
import { CatTreeScene } from './components/CatTreeScene';

export default function App() {
  return (
    <div className="relative w-full h-screen bg-[#0b1026] flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-6 left-0 right-0 text-center z-10 pointer-events-none px-4">
        <h1 className="text-2xl md:text-4xl font-bold text-white tracking-wider font-serif drop-shadow-[0_2px_4px_rgba(255,255,255,0.3)]">Merry Apple Christmas</h1>
        <p className="text-gray-300 text-xs md:text-sm mt-2 font-medium tracking-widest uppercase">A Christmas Cat Tree Just For You</p>
      </div>

      <div className="w-full h-full cursor-move">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-white font-serif text-xl tracking-widest">Loading Magic...</div>}>
          <CatTreeScene />
        </Suspense>
      </div>
    </div>
  );
}
