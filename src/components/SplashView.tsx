import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface SplashProps {
  onComplete: () => void;
  key?: string;
}

export default function SplashView({ onComplete }: SplashProps) {
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsLoaded(true);
          // Wait for the gorgeous "Access Granted" Loaded animation to finish before calling onComplete
          setTimeout(() => {
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
          }, 1400);
          return 100;
        }
        return prev + 4; // Snappy, premium cinematic scanning
      });
    }, 45);

    return () => clearInterval(interval);
  }, []);

  return (
    <div id="splash-container" className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden z-50">
      {/* Deep Gold Radial Ambient Glow */}
      <div className="absolute inset-0 gold-radial-glow opacity-70 pointer-events-none" />

      {/* Cinematic Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="flex flex-col items-center text-center relative z-10 px-6 max-w-md w-full"
      >
        <AnimatePresence mode="wait">
          {!isLoaded ? (
            <motion.div
              key="loading-state"
              initial={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center w-full"
            >
              {/* Animated Double Ring Circular Luxury Logo */}
              <div className="relative w-36 h-36 mb-10 flex items-center justify-center">
                {/* Rotating outer dash gold ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-gold-base/30"
                />
                {/* Pulse solid middle gold ring */}
                <motion.div
                  animate={{ scale: [0.95, 1.05, 0.95] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-2 rounded-full border border-gold-base/15"
                />
                {/* Rounded inner logo canvas with gold glow */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-b from-luxury-gray-dark to-black flex items-center justify-center shadow-[0_0_35px_rgba(212,175,55,0.2)] border border-gold-base/20">
                  <span className="text-4xl font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark select-none tracking-widest">
                    EP
                  </span>
                </div>
              </div>

              {/* Brand Typography */}
              <motion.h1
                initial={{ letterSpacing: '0.1em', opacity: 0 }}
                animate={{ letterSpacing: '0.22em', opacity: 1 }}
                className="text-4xl md:text-5xl font-serif font-semibold tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-deep mb-3"
              >
                ELITE PLEX
              </motion.h1>

              {/* Subtitle */}
              <p className="text-[10px] md:text-xs font-tech tracking-[0.3em] text-white/40 uppercase mb-8">
                CINEMATIC STREAMING PLATFORM
              </p>

              {/* Side-to-Side Moving Scanner Bar Animation */}
              <div className="w-64 h-[3px] bg-white/10 rounded-full overflow-hidden relative border border-white/5 mb-6">
                <motion.div
                  animate={{
                    left: ['-40%', '110%'],
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute top-0 bottom-0 w-[40%] gold-gradient-bg shadow-[0_0_15px_rgba(212,175,55,1)] rounded-full"
                />
              </div>

              {/* Subtitle / scanning status */}
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-gold-base animate-ping" />
                <span className="text-[9px] font-tech text-gold-base tracking-[0.25em] uppercase">
                  ESTABLISHING SECURE CONNECTION...
                </span>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="loaded-success-state"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 100 }}
              className="flex flex-col items-center w-full"
            >
              {/* Loaded success badge */}
              <div className="relative w-36 h-36 mb-10 flex items-center justify-center">
                {/* Rapid beautiful gold rings */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: [0, 0.8, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full border-2 border-gold-base"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border border-gold-base/40 border-t-0 border-b-0"
                />
                <div className="absolute inset-4 rounded-full bg-gradient-to-b from-gold-base/20 to-black flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.4)] border border-gold-base">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 10 }}
                  >
                    <ShieldCheck className="w-16 h-16 text-gold-light" />
                  </motion.div>
                </div>
              </div>

              {/* Success Messages with Sparkling details */}
              <div className="flex items-center gap-2 justify-center mb-2">
                <Sparkles className="w-3.5 h-3.5 text-gold-light animate-pulse" />
                <motion.h2
                  initial={{ tracking: '0.1em' }}
                  animate={{ tracking: '0.3em' }}
                  className="text-2xl font-serif font-bold tracking-[0.3em] text-white uppercase"
                >
                  SECURE ACCESS
                </motion.h2>
                <Sparkles className="w-3.5 h-3.5 text-gold-light animate-pulse" />
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-[10px] font-tech text-gold-base font-bold tracking-[0.4em] uppercase"
              >
                ELITE STATUS GRANTED • WELCOME
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Luxury aesthetic subtle background noise/vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-90 pointer-events-none" />
    </div>
  );
}
