import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertTriangle, X, ShieldAlert, CheckCircle, ShieldCheck, Cpu } from 'lucide-react';
import { Movie } from '../types';

interface DeleteConfirmationModalProps {
  key?: string;
  movie: Movie;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmationModal({
  movie,
  onClose,
  onConfirm
}: DeleteConfirmationModalProps) {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [typedConfirm, setTypedConfirm] = useState('');
  const [mathAnswer, setMathAnswer] = useState('');
  const [timerCount, setTimerCount] = useState(3);
  
  // Checklist confirmation state for Step 4
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);

  // Generate random numbers for step 2 math puzzle
  const [mathNum1] = useState(() => Math.floor(Math.random() * 8) + 3);
  const [mathNum2] = useState(() => Math.floor(Math.random() * 7) + 2);
  const correctAnswer = mathNum1 + mathNum2;

  useEffect(() => {
    if (step !== 3) return;
    setTimerCount(3);
    const interval = setInterval(() => {
      setTimerCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStep(4); // Advance to checklist verification step 4
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={`step-${step}`}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -15 }}
          className="luxury-glass max-w-sm w-full rounded-3xl border border-red-500/25 p-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] relative bg-[#0a0505] flex flex-col items-center text-center gap-5"
        >
          {/* Header Close Button (Only on preliminary screens) */}
          {step < 5 && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white cursor-pointer hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Stepper progress indicator */}
          {step > 0 && (
            <div className="w-full flex items-center justify-between gap-1 px-1 pt-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="flex-1 flex flex-col gap-1 items-center">
                  <div
                    className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                      step >= num ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-white/10'
                    }`}
                  />
                  <span className={`text-[6.5px] font-mono tracking-widest ${step >= num ? 'text-red-400 font-bold' : 'text-white/20'}`}>
                    SEP {num}
                  </span>
                </div>
              ))}
            </div>
          )}

          {step === 0 && (
            /* STEP 0: INITIAL CONFIRMATION */
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mt-3 text-red-500">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <h3 className="text-sm font-serif font-black tracking-widest text-red-400 uppercase">
                  INITIAL DESTRUCTION WARNING
                </h3>
                <p className="text-[9px] text-white/40 font-mono mt-1">
                  PRE-DELETION SANITY GATE ACTIVE
                </p>
              </div>

              {/* Mini Card Preview */}
              <div className="flex items-center gap-3 bg-black/40 p-2.5 rounded-xl border border-white/5 w-full text-left">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  referrerPolicy="no-referrer"
                  className="w-10 h-14 object-cover rounded-lg border border-white/10 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{movie.title}</h4>
                  <p className="text-[10px] text-gold-base uppercase tracking-widest font-mono">
                    YEAR: {movie.year} • {movie.runtime}
                  </p>
                </div>
              </div>

              <p className="text-xs text-white/60 leading-relaxed">
                You are about to initiate the permanent deletion protocol of <strong className="text-white">"{movie.title}"</strong>. This is irreversible.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                <button
                  onClick={onClose}
                  className="border border-white/10 hover:bg-white/5 text-white/80 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ABORT PROTOCOL
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                  DELETE FOREVER
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            /* STEP 1 (Verification Sep 1): KEYWORD TYPING VALIDATION */
            <>
              <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mt-3 text-amber-500">
                <ShieldAlert className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <h3 className="text-sm font-serif font-black tracking-widest text-amber-400 uppercase">
                  VERIFICATION SEP 1
                </h3>
                <p className="text-[9px] text-white/40 font-mono mt-1 uppercase">
                  KEYWORD IDENTITY AUTHENTICATION
                </p>
              </div>

              <p className="text-xs text-white/60 leading-normal">
                To proceed with deletion, please type exactly <strong className="text-white bg-red-500/20 px-2 py-0.5 rounded">DELETE</strong> in the input below.
              </p>

              <div className="w-full text-left flex flex-col gap-1.5">
                <input
                  type="text"
                  required
                  value={typedConfirm}
                  onChange={(e) => setTypedConfirm(e.target.value)}
                  placeholder="Type 'DELETE' here..."
                  className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 text-center font-mono tracking-widest uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                <button
                  onClick={onClose}
                  className="border border-white/10 hover:bg-white/5 text-white/80 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ABORT DELETION
                </button>
                <button
                  disabled={typedConfirm.toUpperCase() !== 'DELETE'}
                  onClick={() => setStep(2)}
                  className="bg-red-600 disabled:bg-neutral-800 disabled:text-neutral-500 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  PROCEED SIGNAL
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            /* STEP 2 (Verification Sep 2): INTELLECTUAL SAFETY SOLVER */
            <>
              <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mt-3 text-amber-500">
                <Cpu className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
              </div>

              <div>
                <h3 className="text-sm font-serif font-black tracking-widest text-amber-400 uppercase">
                  VERIFICATION SEP 2
                </h3>
                <p className="text-[9px] text-white/40 font-mono mt-1 uppercase">
                  NON-AUTOMATED ENGINE TEST
                </p>
              </div>

              <p className="text-xs text-white/60 leading-normal">
                Solve this system safe equation to bypass automatic deletion block:
                <br />
                <strong className="text-base text-gold-base font-mono block mt-2 tracking-widest">
                  {mathNum1} + {mathNum2} = ?
                </strong>
              </p>

              <div className="w-full text-left flex flex-col gap-1.5">
                <input
                  type="number"
                  required
                  value={mathAnswer}
                  onChange={(e) => setMathAnswer(e.target.value)}
                  placeholder="Input equation answer..."
                  className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 text-center font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                <button
                  onClick={onClose}
                  className="border border-white/10 hover:bg-white/5 text-white/80 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ABORT DELETION
                </button>
                <button
                  disabled={Number(mathAnswer) !== correctAnswer}
                  onClick={() => setStep(3)}
                  className="bg-red-600 disabled:bg-neutral-800 disabled:text-neutral-500 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  PROCEED SIGNAL
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            /* STEP 3 (Verification Sep 3): COOLDOWN CHRONOMETER DELAY */
            <>
              <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center mt-3 text-red-500">
                <span className="text-xl font-bold font-mono animate-pulse">{timerCount}s</span>
              </div>

              <div>
                <h3 className="text-sm font-serif font-black tracking-widest text-red-500 uppercase animate-pulse">
                  VERIFICATION SEP 3
                </h3>
                <p className="text-[9px] text-white/40 font-mono mt-1 uppercase">
                  THERMAL STACK DISCHARGING
                </p>
              </div>

              <p className="text-xs text-white/60 leading-relaxed max-w-xs">
                Synchronizing live file servers before executing hard purge. Standby for release validation...
              </p>

              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-2 border border-white/10">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 3, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-red-600 to-amber-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]"
                />
              </div>

              <div className="w-full flex justify-center text-[8px] font-tech text-white/30 tracking-widest uppercase">
                CALIBRATING SYSTEM PACKETS...
              </div>
            </>
          )}

          {step === 4 && (
            /* STEP 4 (Verification Sep 4): ASSET SAFEGUARD CHECKLIST */
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mt-3 text-red-500 animate-pulse">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-sm font-serif font-black tracking-widest text-red-400 uppercase">
                  VERIFICATION SEP 4
                </h3>
                <p className="text-[9px] text-white/40 font-mono mt-1 uppercase">
                  ASSET CONSISTENCY SANITY AUDIT
                </p>
              </div>

              <p className="text-[11px] text-white/70 leading-normal">
                Perform final manual verification checks on corresponding media indexes:
              </p>

              {/* Checklist inputs */}
              <div className="w-full flex flex-col gap-2 bg-black/50 p-3.5 rounded-2xl border border-white/5 text-left">
                <label className="flex items-start gap-3 cursor-pointer select-none text-white/80 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={check1}
                    onChange={(e) => setCheck1(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-black/60 text-red-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono leading-tight">Wipe stream transcoder & HLS master links.</span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none text-white/80 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={check2}
                    onChange={(e) => setCheck2(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-black/60 text-red-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono leading-tight">Erase cover poster CDN cache & metadata references.</span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none text-white/80 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={check3}
                    onChange={(e) => setCheck3(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-black/60 text-red-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono leading-tight">Purge user reviews, streaks & watchlist registers.</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                <button
                  onClick={onClose}
                  className="border border-white/10 hover:bg-white/5 text-white/80 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  ABORT DELETION
                </button>
                <button
                  disabled={!check1 || !check2 || !check3}
                  onClick={() => setStep(5)}
                  className="bg-red-600 disabled:bg-neutral-800 disabled:text-neutral-500 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  PROCEED TO SEP 5
                </button>
              </div>
            </>
          )}

          {step === 5 && (
            /* STEP 5 (Verification Sep 5): FINAL HARD PURGE AND DATA RE-INDEX */
            <>
              <div className="w-16 h-16 rounded-full bg-red-600/30 border-2 border-red-500 flex items-center justify-center mt-3 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xs font-serif font-black tracking-widest text-red-400 uppercase animate-bounce">
                  VERIFICATION SEP 5
                </h3>
                <p className="text-[9px] text-gold-base font-mono mt-1 uppercase">
                  FINAL CLEARANCE RECEIVED
                </p>
              </div>

              <div className="bg-red-950/20 border border-red-500/30 p-3 rounded-xl text-left">
                <p className="text-[10px] text-red-300 font-mono leading-relaxed uppercase">
                  ⚠️ ALL FILTERS PASSED SUCCESSFULLY. DIRECT PURGE OF "{movie.title.toUpperCase()}" FROM LIVE FIRESTORE DATABASE WILL TAKE PLACE IMMEDIATELY UPON CLICK.
                </p>
              </div>

              <div className="flex flex-col gap-2.5 w-full mt-2">
                <button
                  onClick={onConfirm}
                  className="bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_30px_rgba(220,38,38,0.4)] border border-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                  ERASE FROM UNIVERSE FOREVER
                </button>
                <button
                  onClick={onClose}
                  className="border border-white/10 hover:bg-white/5 text-white/60 py-2.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer"
                >
                  ABORT SYSTEM RELEASE
                </button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
