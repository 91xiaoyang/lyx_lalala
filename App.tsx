import React, { Suspense, useState, useEffect, useRef } from 'react';
import { CatTreeScene } from './components/CatTreeScene';

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Attempt autoplay on mount
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3; // Gentle volume
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.log("Autoplay prevented by browser, waiting for user interaction.");
            setIsPlaying(false);
          });
      }
    }
  }, []);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#312e81] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Music */}
      <audio 
        ref={audioRef} 
        loop 
        src="https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3?filename=christmas-magic-12753.mp3" 
      />

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 p-8 flex flex-col items-center z-10 pointer-events-none">
        <div className="text-center">
           <h1 className="text-3xl md:text-5xl font-bold text-white tracking-widest font-serif drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
             Merry Apple Christmas
           </h1>
           <p className="text-pink-200 text-sm md:text-base mt-2 font-medium tracking-[0.2em] uppercase drop-shadow-md">
             A Cat Tree For You
           </p>
        </div>
      </div>

      {/* Music Control - Bottom Right */}
      <div className="absolute bottom-8 right-8 z-20">
        <button 
          onClick={toggleMusic}
          className={`flex items-center justify-center w-12 h-12 rounded-full backdrop-blur-md shadow-xl transition-all duration-500 border border-white/30 ${
            isPlaying ? 'bg-white/20 text-white animate-pulse-slow' : 'bg-black/30 text-gray-400'
          }`}
          title="Toggle Music"
        >
          <span className="text-xl">{isPlaying ? '🎵' : '🔇'}</span>
        </button>
      </div>

      <div className="w-full h-full cursor-move">
        <Suspense fallback={<div className="flex items-center justify-center h-full text-white font-serif text-xl tracking-widest animate-pulse">Sculpting Magic...</div>}>
          <CatTreeScene />
        </Suspense>
      </div>
    </div>
  );
}