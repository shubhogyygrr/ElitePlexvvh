import React, { useState } from 'react';
import { motion } from 'motion/react';
import { WifiOff, RefreshCw, HardDrive, Download, AlertTriangle, Globe } from 'lucide-react';

interface NoInternetViewProps {
  key?: React.Key;
  onRetry: () => void;
  onGoToDownloads: () => void;
}

export default function NoInternetView({ onRetry, onGoToDownloads }: NoInternetViewProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryClick = () => {
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      onRetry();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-[#070709] z-[999] flex flex-col justify-center items-center px-6 overflow-hidden select-none">
      {/* Dynamic scanline overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.01)_0%,transparent_100%)]" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-base/10 to-transparent animate-pulse" />

      <div className="w-full max-w-md flex flex-col items-center text-center relative">
        {/* Animated Radar/Wi-fi Outer Rings */}
        <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.4, 1.6], opacity: [0.3, 0.1, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border border-red-500/20"
          />
          <motion.div 
            animate={{ scale: [1, 1.25, 1.45], opacity: [0.4, 0.15, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut", delay: 0.8 }}
            className="absolute inset-0 rounded-full border border-gold-base/15"
          />
          <div className="w-16 h-16 rounded-3xl bg-[#151010] border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)] flex items-center justify-center z-10">
            <WifiOff className="w-7 h-7 text-red-400 animate-pulse" />
          </div>
        </div>

        {/* Text Details */}
        <h2 className="text-xs font-tech tracking-[0.3em] text-red-400 font-extrabold uppercase mb-2">
          OFFLINE PORTAL ACTIVE
        </h2>
        
        <h1 className="text-2xl font-serif font-black italic text-white tracking-wide mb-3 uppercase">
          CONNECTION LOST
        </h1>

        <p className="text-xs text-white/50 leading-relaxed max-w-xs mb-8">
          Your terminal has lost synchronization with our high-bitrate streaming arrays. Check your network or enter the local offline decrypted cinema.
        </p>

        {/* Action Panel */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleRetryClick}
            disabled={isRetrying}
            className="w-full py-3 px-5 rounded-xxl bg-white text-black font-tech font-extrabold tracking-widest text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all cursor-pointer active:scale-98 shadow-lg shadow-white/5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'SYNCING TERMINAL...' : 'RETRY CONNECTION'}
          </button>

          <button
            onClick={onGoToDownloads}
            className="w-full py-3 px-5 rounded-xxl bg-white/5 border border-white/15 text-gold-base font-tech font-extrabold tracking-widest text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-white/10 hover:border-gold-base/30 transition-all cursor-pointer active:scale-98"
          >
            <Download className="w-3.5 h-3.5" />
            WATCH OFFLINE DOWNLOADS
          </button>
        </div>

        {/* Footer Technical Telemetry */}
        <div className="mt-12 flex items-center gap-6 text-[8px] font-mono text-white/30 tracking-widest uppercase border-t border-white/5 pt-6 w-full justify-center">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-red-500/50" />
            <span>DISCONNECTED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3 h-3 text-gold-base/50" />
            <span>LOCAL MEMORY SAFE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
