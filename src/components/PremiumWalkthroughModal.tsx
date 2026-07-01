import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tv, Sparkles, Palette, Crown, Server, ChevronRight, X, Volume2, ShieldAlert, Cpu, CheckCircle, ChevronLeft, Play } from 'lucide-react';
import { UserProfile } from '../types';

interface PremiumWalkthroughModalProps {
  key?: React.Key;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpgradePrompt?: () => void;
  language?: string;
}

export default function PremiumWalkthroughModal({
  isOpen,
  onClose,
  currentUser,
  onUpgradePrompt,
  language = 'English'
}: PremiumWalkthroughModalProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-play / cycle simulated variables for previews
  const [themeColorIndex, setThemeColorIndex] = useState(0);
  const [waveHeight, setWaveHeight] = useState<number[]>([15, 30, 10, 40, 20]);
  const [speedVal, setSpeedVal] = useState(12);

  // Colors to rotate through on theme slide
  const PREVIEW_THEME_COLORS = [
    { name: 'Royal Gold', bg: '#0b0f19', accent: '#D4AF37' },
    { name: 'Cyber Neon', bg: '#040112', accent: '#00f5ff' },
    { name: 'Amethyst Twilight', bg: '#0e021c', accent: '#8b5cf6' },
    { name: 'Emerald Velvet', bg: '#03140f', accent: '#10b981' }
  ];

  // Animation cycle loops
  useEffect(() => {
    if (!isOpen) return;

    // Theme color rotation
    const themeTimer = setInterval(() => {
      setThemeColorIndex((prev) => (prev + 1) % PREVIEW_THEME_COLORS.length);
    }, 2500);

    // Wave bounce simulation for voice assistance
    const waveTimer = setInterval(() => {
      setWaveHeight(Array.from({ length: 7 }, () => Math.floor(Math.random() * 45) + 10));
    }, 150);

    // Speed meter count up simulation
    const speedTimer = setInterval(() => {
      setSpeedVal((prev) => {
        if (prev >= 98) return 12; // loop back
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 300);

    return () => {
      clearInterval(themeTimer);
      clearInterval(waveTimer);
      clearInterval(speedTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const slides = [
    {
      id: 'custom_themes',
      title: 'BESPOKE LOOKBOOK',
      subtitle: 'System Color Themes',
      icon: Palette,
      iconColor: 'text-amber-400',
      description: 'Break away from rigid slate aesthetics. Customize your entire interface with gorgeous designer palettes or build your own bespoke lookbook using our raw RGB/Hex custom color pickers.',
      preview: (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
          <div 
            style={{ backgroundColor: PREVIEW_THEME_COLORS[themeColorIndex].bg }}
            className="w-full max-w-[200px] h-[110px] rounded-2xl border border-white/10 p-3 shadow-2xl flex flex-col justify-between transition-all duration-700 ease-out relative overflow-hidden"
          >
            <div className="absolute top-1 right-2 text-[7px] font-mono opacity-30 text-white uppercase">PREVIEW</div>
            
            <div className="flex items-center justify-between border-b border-white/10 pb-1">
              <span className="text-[9px] font-serif font-extrabold text-white">EP PLEX ULTRA</span>
              <div 
                className="w-2 h-2 rounded-full transition-colors duration-700" 
                style={{ backgroundColor: PREVIEW_THEME_COLORS[themeColorIndex].accent }} 
              />
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <div className="h-1.5 w-16 bg-white/20 rounded-full" />
              <div className="h-1.5 w-24 bg-white/10 rounded-full" />
            </div>

            <button 
              className="w-full py-1.5 rounded-lg text-[8px] font-extrabold font-mono text-black text-center uppercase tracking-wider transition-colors duration-700 shadow-lg"
              style={{ backgroundColor: PREVIEW_THEME_COLORS[themeColorIndex].accent }}
            >
              WATCH MASTER
            </button>
          </div>
          <div className="flex gap-2">
            {PREVIEW_THEME_COLORS.map((col, idx) => (
              <span 
                key={idx} 
                className={`w-2.5 h-2.5 rounded-full border border-white/20 transition-transform ${themeColorIndex === idx ? 'scale-125 border-gold-base' : 'opacity-40'}`} 
                style={{ backgroundColor: col.accent }}
              />
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'voice_ai',
      title: 'COGNITIVE CO-PILOT',
      subtitle: 'Gemini Voice Search Assistant',
      icon: Sparkles,
      iconColor: 'text-purple-400',
      description: 'Search, categorize, and select movies or series with your natural speech. Simply click the microphone, ask "Find me top-rated action movies from 2025," and let the voice model curate live recommendations.',
      preview: (
        <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
          <div className="w-full max-w-[220px] rounded-2xl bg-black/40 border border-white/10 p-4 flex flex-col items-center justify-center gap-3 relative">
            <div className="absolute -top-2 left-4 bg-purple-500/20 border border-purple-500/30 text-purple-300 font-tech text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              AI Listening
            </div>
            
            {/* Dynamic Waveform Visualizer */}
            <div className="flex items-center justify-center gap-1 h-12 w-full mt-2">
              {waveHeight.map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ height: h }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                  className="w-1.5 rounded-full bg-gradient-to-t from-purple-500 via-pink-400 to-amber-300 shadow-md"
                />
              ))}
            </div>

            <span className="text-[10px] text-white/70 italic text-center font-serif">
              &quot;Find me some cyber-thrillers...&quot;
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'live_tv',
      title: 'VIP CHANNEL DECODER',
      subtitle: 'HD Live Broadcast Channels',
      icon: Tv,
      iconColor: 'text-gold-base',
      description: 'Unlock 24/7 premium broadcast streams from our VIP live relays. Watch curated news grids, live athletic finals, and high-bitrate action blockbusters with synchronized guide timelines.',
      preview: (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="w-full max-w-[200px] rounded-2xl bg-black/60 border border-gold-base/20 overflow-hidden relative shadow-2xl">
            <div className="absolute top-2 left-2 bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-white animate-ping" />
              LIVE HD
            </div>
            <div className="aspect-video w-full bg-neutral-900 flex items-center justify-center overflow-hidden relative">
              <Tv className="w-10 h-10 text-gold-base/20 absolute animate-pulse" />
              {/* Overlay animated static grid scanning */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent bg-[length:100%_4px] animate-[scan_2s_linear_infinite]" />
              <Play className="w-6 h-6 text-gold-base" />
            </div>
            <div className="p-2.5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-extrabold text-white uppercase tracking-wide">ELITE SPORT TV</span>
                <span className="text-[7px] text-white/40">Curating Premier Leagues</span>
              </div>
              <span className="text-[8px] text-gold-base font-bold bg-gold-base/10 px-1.5 py-0.5 rounded border border-gold-base/20 font-mono">15.4K Viewers</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'speed_servers',
      title: 'CINEMATIC SPEEDWAY',
      subtitle: 'Ultra CDN Priority Servers',
      icon: Server,
      iconColor: 'text-cyan-400',
      description: 'Route your stream through specialized CDN fiber lines. Enjoy 0% server-side virtual queue wait times, bypass standard user congestion throttling, and download files at extreme network gigabit speeds.',
      preview: (
        <div className="flex flex-col items-center justify-center h-full p-4 gap-3">
          <div className="w-full max-w-[190px] rounded-2xl bg-black/50 border border-cyan-500/10 p-4 flex flex-col gap-2 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
              <span className="text-[9px] text-cyan-400 font-tech uppercase tracking-widest">VIP LINK-04 ACTIVE</span>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            
            {/* Speed Dial Preview */}
            <div className="flex flex-col items-center justify-center py-2 relative">
              <span className="text-2xl font-black font-tech text-white tracking-tighter">
                {speedVal >= 90 ? '98.4' : speedVal}.2
                <span className="text-xs text-cyan-400 font-bold ml-0.5">Gbps</span>
              </span>
              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden mt-2 border border-white/5">
                <motion.div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
                  animate={{ width: `${speedVal >= 90 ? 98 : speedVal}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-[7px] text-white/40 font-mono mt-1">
              <span>PING: 1.5ms</span>
              <span>BUFFERING: 0.00%</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const currentSlide = slides[activeSlide];
  const IconComponent = currentSlide.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: -15 }}
        className="w-full max-w-xl luxury-glass border border-white/10 rounded-xxl overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.9)] flex flex-col"
      >
        {/* Header section with brand and close */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold-base animate-bounce" />
            <span className="text-xs font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase">
              ELITE VIP SUITE UNLOCKED
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-white/10 hover:border-white/20 text-white/40 hover:text-white rounded-lg transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Interactive Showroom / Preview box */}
        <div className="bg-black/40 h-[190px] border-b border-white/5 flex items-center justify-center overflow-hidden relative">
          {/* Subtle background graphics */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full h-full"
            >
              {currentSlide.preview}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Information Showcase & Text Layout */}
        <div className="p-6 flex flex-col gap-5 text-left bg-neutral-950/20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-2 min-h-[110px]"
            >
              <div className="flex items-center gap-2">
                <IconComponent className={`w-5 h-5 ${currentSlide.iconColor}`} />
                <span className="text-[10px] font-tech text-gold-base tracking-widest uppercase">
                  {currentSlide.title}
                </span>
              </div>
              
              <h2 className="text-lg font-serif font-black text-white italic uppercase tracking-wide">
                {currentSlide.subtitle}
              </h2>

              <p className="text-[11px] text-white/60 leading-relaxed font-sans font-normal mt-1">
                {currentSlide.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Stepper Dots & Navigation buttons */}
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeSlide ? 'w-6 bg-gold-base' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="p-2 border border-white/5 bg-white/[0.02] hover:bg-white/5 rounded-xl text-white/50 hover:text-white transition-all cursor-pointer"
                title="Previous VIP Feature"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleNext}
                className="gold-gradient-bg text-black font-semibold text-[10px] py-2 px-4 rounded-xl flex items-center gap-1 cursor-pointer hover:brightness-110 transition-all uppercase tracking-wider font-tech"
                title="Next VIP Feature"
              >
                <span>{activeSlide === slides.length - 1 ? 'REPLAY TOUR' : 'NEXT FEATURE'}</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5px]" />
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Conversion CTA Bar */}
        <div className="px-6 py-4 bg-black/60 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col text-center sm:text-left gap-0.5">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">
              {currentUser.isPremium ? 'YOUR STATUS: VIP ELITE ACCESS' : 'READY TO UPGRADE TO ELITE?'}
            </span>
            <span className="text-[8px] text-white/40 tracking-tight font-mono uppercase">
              {currentUser.isPremium 
                ? 'YOU HAVE UNLOCKED UNLIMITED CINEMATIC POWERS' 
                : 'GET PRESETS, AUDIO TRACKS, AND REAL-TIME DECODERS'
              }
            </span>
          </div>

          {currentUser.isPremium ? (
            <button
              onClick={onClose}
              className="border border-gold-base/20 hover:border-gold-base text-gold-base bg-gold-base/5 font-tech text-[9px] font-black tracking-widest py-2 px-5 rounded-xl transition-all cursor-pointer uppercase"
            >
              ENTER THE COLD CORE
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                if (onUpgradePrompt) {
                  onUpgradePrompt();
                }
              }}
              className="gold-gradient-bg text-black font-tech text-[9px] font-black tracking-widest py-2 px-5 rounded-xl shadow-[0_4px_15px_rgba(212,175,55,0.3)] hover:scale-105 transition-all cursor-pointer uppercase"
            >
              UPGRADE TO ELITE
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
