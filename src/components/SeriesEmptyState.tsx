import React from 'react';
import { motion } from 'motion/react';
import { Tv, Sparkles, Plus } from 'lucide-react';

interface SeriesEmptyStateProps {
  isAdmin: boolean;
  onAddSeries: () => void;
}

export default function SeriesEmptyState({ isAdmin, onAddSeries }: SeriesEmptyStateProps) {
  // Stagger children animations
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
        type: 'spring',
        stiffness: 70,
        damping: 15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col items-center justify-center text-center p-8 py-16 luxury-glass rounded-3xl border border-white/5 max-w-lg mx-auto my-8 gap-5 relative overflow-hidden"
    >
      {/* Absolute background premium visual guides */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-gradient-to-br from-gold-base/10 to-transparent rounded-full filter blur-xl" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-gradient-to-tl from-gold-base/10 to-transparent rounded-full filter blur-xl" />
      </div>

      {/* Lottie-style dynamic vector illustration */}
      <motion.div variants={itemVariants} className="relative w-36 h-36 flex items-center justify-center">
        {/* Dynamic expanding signal waves (Lottie feel) */}
        {[1, 2, 3].map((index) => (
          <motion.div
            key={`wave-${index}`}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: [0.6, 1.4, 1.8],
              opacity: [0, 0.4, 0]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: index * 0.9,
              ease: 'easeInOut'
            }}
            className="absolute w-20 h-20 rounded-full border border-gold-base/30"
          />
        ))}

        {/* Rotating tech rings (Lottie feel) */}
        <motion.svg
          className="absolute w-28 h-28 text-gold-base/20"
          viewBox="0 0 100 100"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="6, 6"
            fill="none"
          />
        </motion.svg>

        <motion.svg
          className="absolute w-24 h-24 text-gold-light/40"
          viewBox="0 0 100 100"
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <circle
            cx="50"
            cy="50"
            r="38"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="40, 25, 10, 25"
            fill="none"
          />
        </motion.svg>

        {/* Floating background tech-particles (Lottie feel) */}
        {[
          { top: '10%', left: '15%', delay: 0 },
          { bottom: '15%', right: '10%', delay: 0.5 },
          { top: '40%', right: '15%', delay: 1 },
          { bottom: '25%', left: '10%', delay: 1.5 }
        ].map((pt, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1.5 h-1.5 rounded-full bg-gold-light/60"
            style={{ top: pt.top, left: pt.left, right: pt.right, bottom: pt.bottom }}
            animate={{
              y: [0, -8, 0],
              opacity: [0.3, 0.9, 0.3],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: pt.delay,
              ease: 'easeInOut'
            }}
          />
        ))}

        {/* Core animated TV container */}
        <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-b from-luxury-gray-dark to-black border border-white/10 flex items-center justify-center shadow-2xl">
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              rotate: [0, 3, -3, 0]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            <Tv className="w-7 h-7 text-gold-base" />
          </motion.div>
        </div>

        {/* Pulsing Sparkles */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.6, 1, 0.6],
            y: [0, -4, 0]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1 right-4 z-20"
        >
          <Sparkles className="w-5 h-5 text-gold-light" />
        </motion.div>
      </motion.div>

      {/* Main Text Content */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
        <h3 className="text-sm font-serif font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase">
          THE VAULT IS SILENT
        </h3>
        <p className="text-[9px] font-tech text-gold-base/50 tracking-widest uppercase">
          NO CURATED SAGAS DISCOVERED
        </p>
      </motion.div>

      <motion.p variants={itemVariants} className="text-[11px] text-white/50 max-w-xs leading-relaxed">
        No direct-to-viewer episodic sagas currently populate the cinema vaults. Administrators have not yet registered serial keys.
      </motion.p>

      {isAdmin && (
        <motion.div variants={itemVariants}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddSeries}
            className="mt-2 flex items-center gap-1.5 gold-gradient-bg text-black font-extrabold text-[9px] tracking-widest font-tech py-2.5 px-5 rounded-full shadow-lg shadow-gold-base/10 hover:brightness-110 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            ADD EXCLUSIVE SERIES
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
