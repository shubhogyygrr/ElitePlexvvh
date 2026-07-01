import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Movie, isNewMovie } from '../types';
import { Star, Heart, Play, X, HeartCrack, Flame, Sparkles, Trash2, Filter, Layers, Film } from 'lucide-react';

interface FavoritesViewProps {
  favoriteMovies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onRemoveFavorite: (movie: Movie) => void;
  onClose: () => void;
  key?: string;
}

export default function FavoritesView({
  favoriteMovies,
  onSelectMovie,
  onRemoveFavorite,
  onClose
}: FavoritesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // Dynamic Categories present in favorites
  const categories = useMemo(() => {
    const list = new Set<string>();
    favoriteMovies.forEach(m => {
      if (m.type) list.add(m.type);
    });
    return ['all', ...Array.from(list)];
  }, [favoriteMovies]);

  // Dynamic Genres present in favorites
  const genres = useMemo(() => {
    const list = new Set<string>();
    favoriteMovies.forEach(m => {
      if (Array.isArray(m.genres)) {
        m.genres.forEach(g => {
          if (g) list.add(g);
        });
      }
    });
    return ['all', ...Array.from(list)];
  }, [favoriteMovies]);

  // Filtered favorite movies
  const filteredFavorites = useMemo(() => {
    return favoriteMovies.filter(m => {
      const matchesCategory = selectedCategory === 'all' || m.type === selectedCategory;
      const matchesGenre = selectedGenre === 'all' || (Array.isArray(m.genres) && m.genres.includes(selectedGenre));
      return matchesCategory && matchesGenre;
    });
  }, [favoriteMovies, selectedCategory, selectedGenre]);

  const getFriendlyTypeName = (type: string) => {
    if (type === 'all') return 'All Categories';
    if (type === 'movie') return 'Movies';
    if (type === 'series') return 'Series';
    if (type === 'live_tv') return 'Live TV';
    if (type === 'kdrama') return 'Kdrama';
    if (type === 'anime') return 'Anime';
    if (type === 'documentary') return 'Documentaries';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="fixed inset-0 bg-black z-40 overflow-y-auto pb-24 px-6 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-6 max-w-3xl mx-auto">
        <h2 className="text-xl font-serif font-black tracking-wide italic flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          MY PRIVATE SANCTUARY
        </h2>
        <button
          onClick={onClose}
          className="text-xs font-tech tracking-widest text-gold-base border border-gold-base/20 px-4 py-2 rounded-full hover:bg-gold-base/10"
        >
          BACK
        </button>
      </div>

      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <span className="text-[9px] font-tech tracking-widest text-white/40 uppercase">
          SAVED MOVIES & SERIES ({favoriteMovies.length})
        </span>

        {/* Filters Panel (Only show if there are favorite movies) */}
        {favoriteMovies.length > 0 && (
          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-neutral-950/60 border border-white/5 shadow-md">
            {/* Category Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-[8px] font-mono text-gold-base/60 tracking-wider uppercase flex items-center gap-1">
                <Layers className="w-3 h-3" /> CATEGORY FILTER
              </span>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={`cat-${cat}`}
                    onClick={() => {
                      setSelectedCategory(cat);
                    }}
                    className={`px-3 py-1 text-[9px] font-tech font-bold uppercase rounded-lg transition-all ${
                      selectedCategory === cat
                        ? "bg-gradient-to-tr from-amber-500 to-gold-base text-black shadow-md shadow-gold-base/10"
                        : "bg-neutral-900 text-white/60 hover:text-white hover:bg-neutral-850 border border-white/5"
                    }`}
                  >
                    {getFriendlyTypeName(cat)}
                  </button>
                ))}
              </div>
            </div>

            {/* Genre Filter */}
            {genres.length > 1 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <span className="text-[8px] font-mono text-gold-base/60 tracking-wider uppercase flex items-center gap-1">
                  <Film className="w-3 h-3" /> GENRE FILTER
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {genres.map((g) => (
                    <button
                      key={`genre-${g}`}
                      onClick={() => {
                        setSelectedGenre(g);
                      }}
                      className={`px-3 py-1 text-[9px] font-tech font-bold uppercase rounded-lg transition-all ${
                        selectedGenre === g
                          ? "bg-gradient-to-tr from-amber-500 to-gold-base text-black shadow-md shadow-gold-base/10"
                          : "bg-neutral-900 text-white/60 hover:text-white hover:bg-neutral-850 border border-white/5"
                      }`}
                    >
                      {g === 'all' ? 'All Genres' : g}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {favoriteMovies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="p-12 md:p-16 text-center luxury-glass rounded-[32px] border border-white/5 flex flex-col items-center gap-6 relative overflow-hidden max-w-xl mx-auto w-full my-4"
          >
            {/* Glowing background blob */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-red-500/10 to-transparent rounded-full filter blur-2xl" />
            </div>

            {/* Lottie-style heart interactive illustration */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* expanding waves (heartbeats) */}
              {[1, 2].map((idx) => (
                <motion.div
                  key={`heart-wave-${idx}`}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{
                    scale: [0.7, 1.3, 1.6],
                    opacity: [0, 0.35, 0]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    delay: idx * 1.2,
                    ease: 'easeInOut'
                  }}
                  className="absolute w-16 h-16 rounded-full border border-red-500/30"
                />
              ))}

              {/* Rotating tech circle overlay */}
              <motion.svg
                className="absolute w-24 h-24 text-red-500/15"
                viewBox="0 0 100 100"
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="8, 8"
                  fill="none"
                />
              </motion.svg>

              <motion.svg
                className="absolute w-20 h-20 text-gold-base/20"
                viewBox="0 0 100 100"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              >
                <circle
                  cx="50"
                  cy="50"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="25, 15, 10, 15"
                  fill="none"
                />
              </motion.svg>

              {/* Core beating heart element */}
              <div className="relative z-10 w-14 h-14 rounded-full bg-gradient-to-b from-luxury-gray-dark to-black border border-white/10 flex items-center justify-center shadow-xl">
                <motion.div
                  animate={{
                    scale: [1, 1.15, 1, 1.15, 1],
                    rotate: [0, 2, -2, 2, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <HeartCrack className="w-6 h-6 text-red-500" />
                </motion.div>
              </div>

              {/* Dynamic floating sparkles */}
              <motion.div
                animate={{
                  y: [0, -6, 0],
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-2 right-4 z-20 text-gold-light"
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>

              {/* Mini particle stars */}
              {[
                { top: '15%', left: '10%', d: 0 },
                { bottom: '20%', right: '12%', d: 0.6 },
                { top: '45%', right: '8%', d: 1.2 }
              ].map((p, i) => (
                <motion.div
                  key={`fav-p-${i}`}
                  className="absolute w-1 h-1 rounded-full bg-red-400"
                  style={{ top: p.top, left: p.left, right: p.right, bottom: p.bottom }}
                  animate={{
                    opacity: [0.2, 0.8, 0.2],
                    scale: [0.7, 1.3, 0.7]
                  }}
                  transition={{ duration: 3, repeat: Infinity, delay: p.d, ease: 'easeInOut' }}
                />
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <h4 className="text-xs font-serif font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-white via-red-200 to-white uppercase">
                SANCTUARY EMPTY
              </h4>
              <p className="text-[9px] font-tech text-red-400/50 tracking-widest uppercase">
                NO SAVED CODES SECURED
              </p>
            </div>

            <p className="text-[11px] text-white/50 leading-relaxed max-w-xs">
              Saved cinematic items will populate here. Tap the heart icons or wishlist buttons inside catalogs to secure them!
            </p>
          </motion.div>
        ) : filteredFavorites.length === 0 ? (
          <div className="p-12 text-center bg-neutral-950/40 rounded-[24px] border border-white/5 flex flex-col items-center gap-3">
            <Filter className="w-8 h-8 text-gold-base/40" />
            <h4 className="text-xs font-serif font-black tracking-widest text-white uppercase">
              NO MATCHES FOUND
            </h4>
            <p className="text-[10px] text-white/50 leading-relaxed max-w-xs">
              No watchlist items match the selected category & genre filters. Try selecting "All Categories" or "All Genres".
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedGenre('all');
              }}
              className="mt-2 text-[9px] font-tech text-black bg-gold-base px-3 py-1 rounded-full font-bold uppercase"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Responsive posters Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {filteredFavorites.map((movie, idx) => {
              const isNew = isNewMovie(movie);
              return (
                <div
                  key={`${movie.id}-${idx}`}
                  className="flex flex-col gap-2 relative group animate-fade-in"
                >
                  <div className="relative overflow-hidden rounded-[24px] bg-neutral-950 w-full aspect-[2/3]">
                    {/* Red deletion reveal background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-red-600/30 flex items-center justify-end px-4 rounded-[24px] pointer-events-none z-0">
                      <Trash2 className="w-4 h-4 text-red-500 animate-pulse" />
                    </div>

                    <motion.div
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={{ left: 0.6, right: 0.1 }}
                      onDragEnd={(event, info) => {
                        if (info.offset.x < -80) {
                          onRemoveFavorite(movie);
                        }
                      }}
                      className="w-full h-full relative z-10 cursor-grab active:cursor-grabbing touch-pan-y"
                    >
                      {/* Poster Frame */}
                      <div
                        onClick={() => onSelectMovie(movie)}
                        className="relative w-full h-full rounded-[24px] overflow-hidden border border-white/5 cursor-pointer shadow-lg hover:border-gold-base/25 transition-all duration-300 select-none"
                      >
                        <img src={movie.posterUrl} alt={movie.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />

                        {isNew && (
                          <div className="absolute top-3 left-3 bg-emerald-500 text-black text-[7px] font-extrabold px-1.5 py-0.5 rounded-sm z-10 shadow-[0_2px_8px_rgba(16,185,129,0.4)] tracking-widest uppercase font-tech">
                            NEW
                          </div>
                        )}

                        {/* Rating badge */}
                        <div className={`absolute left-3 bg-black/70 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 shadow z-10 transition-all ${isNew ? 'top-[34px]' : 'top-3'}`}>
                          <Star className="w-2.5 h-2.5 fill-gold-base text-gold-base" />
                          <span className="text-[8px] font-bold text-white">{movie.rating}</span>
                        </div>

                        {/* Dismiss heart click */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFavorite(movie);
                          }}
                          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-red-400 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        {/* Featured Tag */}
                        {movie.isPremium && (
                          <div className="absolute bottom-3 left-3 flex gap-1 items-center">
                            <span className="gold-gradient-bg text-black text-[7px] font-tech font-extrabold px-1.5 py-0.5 rounded-full tracking-wider shadow">
                              VIP
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* Text details */}
                  <div className="px-1">
                    <h4
                      onClick={() => onSelectMovie(movie)}
                      className="text-xs font-bold text-white truncate cursor-pointer group-hover:text-gold-base transition-colors uppercase tracking-wide"
                    >
                      {movie.title}
                    </h4>
                    <p className="text-[10px] text-white/40 mt-0.5 uppercase font-mono">
                      {getFriendlyTypeName(movie.type || 'movie')} • {movie.year}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
