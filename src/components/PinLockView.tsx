import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Delete, ShieldAlert, Check, X, Shield, Key } from 'lucide-react';

interface PinLockViewProps {
  key?: string | number;
  correctPin: string;
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export default function PinLockView({
  correctPin,
  onSuccess,
  onCancel,
  title = "ENTER SYSTEM PIN",
  subtitle = "Please enter the 4-digit security code to proceed."
}: PinLockViewProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Sync physical keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (success) return;
      
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          setPin(prev => prev + e.key);
          setError(false);
        }
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
        setError(false);
      } else if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, onCancel, success]);

  // Check pin when it reaches the correct length
  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 600);
      } else {
        setError(true);
        // Haptic feedback or shake
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        setTimeout(() => {
          setPin('');
        }, 800);
      }
    }
  }, [pin, correctPin, onSuccess]);

  const handleNumberClick = (num: number) => {
    if (pin.length < 4 && !success) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleBackspace = () => {
    if (!success) {
      setPin(prev => prev.slice(0, -1));
      setError(false);
    }
  };

  const handleClear = () => {
    if (!success) {
      setPin('');
      setError(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-4 text-white"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_65%)] pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-sm rounded-[32px] luxury-glass border border-white/10 p-8 shadow-2xl flex flex-col items-center relative text-center bg-black/40"
      >
        {/* Cancel Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Shield Icon Lock animation */}
        <div className="mb-6 relative flex items-center justify-center">
          <motion.div
            animate={
              success 
                ? { scale: [1, 1.2, 1], rotate: 360 } 
                : error 
                ? { x: [-10, 10, -10, 10, 0] } 
                : { y: [0, -4, 0] }
            }
            transition={
              success 
                ? { duration: 0.5 } 
                : error 
                ? { duration: 0.4 } 
                : { repeat: Infinity, duration: 4, ease: "easeInOut" }
            }
            className={`w-16 h-16 rounded-full flex items-center justify-center border ${
              success 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                : error 
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]" 
                : "bg-gold-base/10 border-gold-base/20 text-gold-light shadow-[0_0_20px_rgba(212,175,55,0.1)]"
            }`}
          >
            {success ? (
              <Check className="w-7 h-7" />
            ) : error ? (
              <ShieldAlert className="w-7 h-7" />
            ) : (
              <Shield className="w-7 h-7" />
            )}
          </motion.div>
        </div>

        {/* Title / Subtitle */}
        <h2 className="text-sm font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase mb-1">
          {success ? "ACCESS GRANTED" : error ? "INCORRECT PIN" : title}
        </h2>
        <p className="text-[10px] text-white/50 tracking-wider max-w-[240px] leading-relaxed">
          {error ? "Please check your pin and try again." : subtitle}
        </p>

        {/* Dots Indicators */}
        <div className="flex gap-4 my-8 justify-center">
          {Array.from({ length: 4 }).map((_, idx) => {
            const hasDigit = pin.length > idx;
            return (
              <div
                key={`pin-dot-${idx}`}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-300 border ${
                  success
                    ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    : error
                    ? "bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"
                    : hasDigit
                    ? "bg-gold-base border-gold-light shadow-[0_0_8px_rgba(212,175,55,0.6)] scale-110"
                    : "bg-white/5 border-white/10"
                }`}
              />
            );
          })}
        </div>

        {/* Numeric Virtual Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mb-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={`keypad-${num}`}
              onClick={() => handleNumberClick(num)}
              className="h-14 rounded-full bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-white/15 transition-all flex items-center justify-center text-lg font-mono font-bold select-none cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-full flex items-center justify-center text-[10px] font-tech text-white/40 hover:text-white transition-all select-none cursor-pointer"
          >
            CLEAR
          </button>
          <button
            onClick={() => handleNumberClick(0)}
            className="h-14 rounded-full bg-white/[0.02] border border-white/5 hover:bg-white/10 hover:border-white/15 transition-all flex items-center justify-center text-lg font-mono font-bold select-none cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-all select-none cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
