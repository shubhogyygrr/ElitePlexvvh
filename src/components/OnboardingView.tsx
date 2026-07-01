import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ArrowRight, Check, Sparkles, Film, Volume2, Tv, Monitor } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
  key?: string;
}

const CINEMATIC_GENRES = [
  {
    name: 'Cinematic',
    desc: 'Breathtaking auteur masterworks',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Sci-Fi',
    desc: 'Space odyssey & future dimensions',
    image: 'https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Thriller',
    desc: 'Edge-of-your-seat suspense',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Mystery',
    desc: 'Deep puzzles & film noir stories',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Action',
    desc: 'High-octane blockbusters',
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=80'
  },
  {
    name: 'Drama',
    desc: 'Intense human experiences',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80'
  }
];

const EXPERIENCES = [
  { id: '4k', label: '4K Master UHD', icon: Monitor, desc: 'Highest Bitrate' },
  { id: 'dolby', label: 'Dolby Atmos 3D', icon: Volume2, desc: 'Immersive Audio' },
  { id: 'directors', label: 'Directors Cut', icon: Film, desc: 'Auteur Editions' }
];

export default function OnboardingView({ onComplete }: OnboardingProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Cinematic', 'Sci-Fi']);
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>(['4k', 'dolby']);
  const [step, setStep] = useState<1 | 2>(1);

  const toggleGenre = (name: string) => {
    if (selectedGenres.includes(name)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== name));
    } else {
      setSelectedGenres([...selectedGenres, name]);
    }
  };

  const toggleExperience = (id: string) => {
    if (selectedExperiences.includes(id)) {
      setSelectedExperiences(selectedExperiences.filter((e) => e !== id));
    } else {
      setSelectedExperiences([...selectedExperiences, id]);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else {
      onComplete();
    }
  };

  return (
    <div id="onboarding-container" className="fixed inset-0 bg-black flex flex-col justify-between overflow-y-auto z-40 pb-10 w-full min-w-0">
      {/* Top Brand Bar */}
      <div className="flex items-center justify-between p-6 w-full max-w-lg mx-auto shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-gold-light to-gold-dark flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)]">
            <span className="text-xs font-serif font-extrabold text-black">EP</span>
          </div>
          <span className="text-sm font-serif font-bold tracking-[0.15em] gold-gradient-text">ELITE PLEX</span>
        </div>
        <div className="text-[9px] font-tech tracking-widest text-gold-base/80 bg-gold-base/5 border border-gold-base/20 px-2.5 py-1 rounded-full">
          STEP {step} OF 2
        </div>
      </div>

      {/* Main Form Content */}
      <div className="px-6 w-full max-w-lg mx-auto flex-1 flex flex-col justify-center py-4">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step-genres"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-5 w-full"
            >
              <div className="text-center">
                <span className="text-[10px] font-tech tracking-[0.25em] text-gold-base font-semibold uppercase flex items-center justify-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-base animate-pulse" />
                  CINEMATIC PREFERENCES
                </span>
                <h2 className="text-2xl font-serif font-medium tracking-tight text-white mb-2">
                  Select Your Cinematic Styles
                </h2>
                <p className="text-xs text-white/50 max-w-xs mx-auto">
                  Customize your feed with high-fidelity streams tailored to your auteur preferences.
                </p>
              </div>

              {/* Genres Grid */}
              <div className="grid grid-cols-2 gap-4 my-2">
                {CINEMATIC_GENRES.map((genre, idx) => {
                  const isSelected = selectedGenres.includes(genre.name);
                  return (
                    <motion.div
                      key={`onboarding-genre-${genre.name}-${idx}`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleGenre(genre.name)}
                      className={`relative aspect-[16/10] rounded-[20px] overflow-hidden cursor-pointer border transition-all duration-300 ${
                        isSelected
                          ? 'border-gold-base ring-2 ring-gold-base/20 shadow-[0_8px_25px_rgba(212,175,55,0.15)]'
                          : 'border-white/[0.06] hover:border-white/15'
                      }`}
                    >
                      {/* Genre Background Image */}
                      <img
                        src={genre.image}
                        alt={genre.name}
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover transition-transform duration-700 ${
                          isSelected ? 'scale-105 saturate-[1.15]' : 'scale-100 saturate-[0.65]'
                        }`}
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      
                      {/* Text info */}
                      <div className="absolute bottom-3 left-3 right-3 flex flex-col">
                        <span className="text-xs font-serif font-bold tracking-wide text-white flex items-center gap-1.5">
                          {genre.name}
                        </span>
                        <span className="text-[8px] text-white/60 truncate tracking-wide">
                          {genre.desc}
                        </span>
                      </div>

                      {/* Selection Badge */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full gold-gradient-bg flex items-center justify-center shadow-md border border-black/50"
                          >
                            <Check className="w-3 h-3 text-black stroke-[3.5px]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-experience"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6 w-full"
            >
              <div className="text-center">
                <span className="text-[10px] font-tech tracking-[0.25em] text-gold-base font-semibold uppercase flex items-center justify-center gap-1.5 mb-1.5">
                  <Tv className="w-3.5 h-3.5 text-gold-base" />
                  EXPERIENCE DESIGN
                </span>
                <h2 className="text-2xl font-serif font-medium tracking-tight text-white mb-2">
                  Select Your Cinematic Settings
                </h2>
                <p className="text-xs text-white/50 max-w-xs mx-auto">
                  Configure hardware & mastering settings for your premier device.
                </p>
              </div>

              {/* Experience list */}
              <div className="flex flex-col gap-4 my-2">
                {EXPERIENCES.map((exp, idx) => {
                  const Icon = exp.icon;
                  const isSelected = selectedExperiences.includes(exp.id);
                  return (
                    <motion.div
                      key={`onboarding-exp-${exp.id}-${idx}`}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => toggleExperience(exp.id)}
                      className={`luxury-glass p-5 rounded-[22px] border transition-all duration-300 flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-gold-base/50 bg-gold-base/[0.03] shadow-[0_8px_30px_rgba(212,175,55,0.08)]'
                          : 'border-white/[0.06] hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-gold-base/10 border-gold-base/30 text-gold-base'
                            : 'bg-white/[0.03] border-white/5 text-white/55'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase tracking-wider text-white">
                            {exp.label}
                          </span>
                          <span className="text-[10px] text-white/40 font-tech uppercase tracking-widest mt-0.5">
                            {exp.desc}
                          </span>
                        </div>
                      </div>

                      {/* Switch layout */}
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-gold-base bg-gold-base text-black'
                          : 'border-white/20 bg-transparent text-transparent'
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3.5px]" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Button Area */}
      <div className="px-6 w-full max-w-lg mx-auto flex items-center justify-between shrink-0 mt-6 gap-4">
        {step === 2 && (
          <button
            onClick={() => setStep(1)}
            className="text-xs font-tech tracking-widest text-white/60 hover:text-white transition-colors py-3.5 px-6 rounded-xxl border border-white/10 hover:bg-white/5"
          >
            BACK
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleNext}
          disabled={step === 1 && selectedGenres.length === 0}
          className={`gold-gradient-bg text-black font-bold tracking-wider text-xs py-4 px-7 rounded-xxl flex items-center justify-center gap-2.5 shadow-[0_4px_25px_rgba(212,175,55,0.25)] hover:shadow-[0_4px_30px_rgba(212,175,55,0.4)] cursor-pointer hover:brightness-110 transition-all ${
            step === 2 ? 'flex-1' : 'ml-auto'
          } ${step === 1 && selectedGenres.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {step === 1 ? (
            <>
              NEXT STEP
              <ChevronRight className="w-4 h-4 text-black stroke-[2.5px]" />
            </>
          ) : (
            <>
              ENTER ELITE PLEX
              <ArrowRight className="w-4 h-4 text-black stroke-[2.5px]" />
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}

