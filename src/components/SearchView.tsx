import * as React from 'react';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie, isNewMovie } from '../types';
import { Search, Mic, Star, ArrowLeft, Trash2, Clock, Play, X, Heart } from 'lucide-react';
import { translateText } from '../lib/translator';
import { playInterfaceTick } from '../lib/soundEffects';

interface SearchViewProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onClose: () => void;
  watchlistIds?: string[];
  onToggleWatchlist?: (movie: Movie) => void;
  isDarkMode?: boolean;
  language?: string;
  key?: string;
  startVoiceImmediately?: boolean;
}

const RECENT_KEYWORDS = ['Nolan', 'From Season 3', 'Futuristic Thriller', 'Cyberpunk Gold'];
const TRENDING_SUGGESTIONS = ['Over Your Dead Body', 'FROM Series', 'Dune Masters', 'Peddi Ancient Staff'];

export default function SearchView({ 
  movies, 
  onSelectMovie, 
  onClose,
  watchlistIds = [],
  onToggleWatchlist,
  isDarkMode = true,
  language = 'English',
  startVoiceImmediately = false
}: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [recentHistory, setRecentHistory] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem('eliteplex_recent_searches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 5);
      }
    } catch (e) {
      console.error(e);
    }
    return RECENT_KEYWORDS.slice(0, 5);
  });

  const saveSearchQuery = (q: string) => {
    if (!q || !q.trim()) return;
    const trimmed = q.trim();
    setRecentHistory(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      try {
        window.localStorage.setItem('eliteplex_recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<any>(null);

  const [activeSection, setActiveSection] = useState<'suggestions' | 'results' | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Auto-complete Search Suggestions
  const suggestions = React.useMemo(() => {
    if (!query || query.trim().length === 0) return [];
    const term = query.toLowerCase().trim();
    const list: { type: 'title' | 'genre' | 'category'; value: string; label: string; item?: Movie }[] = [];

    // 1. Matches for titles
    movies.forEach(m => {
      if (m.title && m.title.toLowerCase().includes(term)) {
        list.push({
          type: 'title',
          value: m.title,
          label: m.title,
          item: m
        });
      }
    });

    // 2. Matches for genres
    const uniqueGenres = Array.from(new Set(movies.flatMap(m => m.genres || [])));
    uniqueGenres.forEach(g => {
      if (g && g.toLowerCase().includes(term)) {
        list.push({
          type: 'genre',
          value: g,
          label: g
        });
      }
    });

    // 3. Matches for categories
    const categories = ['Movies', 'Series', 'Live TV', 'Anime', 'Documentaries', 'Kdrama'];
    categories.forEach(c => {
      if (c.toLowerCase().includes(term)) {
        list.push({
          type: 'category',
          value: c,
          label: c
        });
      }
    });

    // Remove duplicates (e.g. if a genre matches category)
    const seen = new Set<string>();
    return list.filter(item => {
      const key = `${item.type}-${item.value.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
  }, [query, movies]);

  // Filtered Results
  const filtered = movies.filter((m) => {
    if (!query) return false;
    const term = query.toLowerCase();
    const titleMatch = m.title && m.title.toLowerCase().includes(term);
    const genresMatch = m.genres && Array.isArray(m.genres) && m.genres.some((g) => g && g.toLowerCase().includes(term));
    const overviewMatch = m.overview && m.overview.toLowerCase().includes(term);
    return titleMatch || genresMatch || overviewMatch;
  });

  React.useEffect(() => {
    setActiveIndex(-1);
    setActiveSection(null);
  }, [query]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isListening) return;

      const hasSuggestions = query.trim().length > 0 && suggestions.length > 0;
      const hasResults = query.trim().length > 0 && filtered.length > 0;

      if (!hasSuggestions && !hasResults) return;

      const colCount = window.innerWidth >= 640 ? 3 : 2;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeSection === null) {
          if (hasSuggestions) {
            setActiveSection('suggestions');
            setActiveIndex(0);
          } else if (hasResults) {
            setActiveSection('results');
            setActiveIndex(0);
          }
        } else if (activeSection === 'suggestions') {
          if (activeIndex < suggestions.length - 1) {
            setActiveIndex(prev => prev + 1);
          } else if (hasResults) {
            setActiveSection('results');
            setActiveIndex(0);
          }
        } else if (activeSection === 'results') {
          if (activeIndex + colCount < filtered.length) {
            setActiveIndex(prev => prev + colCount);
          } else {
            const nextIdx = Math.min(activeIndex + colCount, filtered.length - 1);
            if (nextIdx !== activeIndex) {
              setActiveIndex(nextIdx);
            }
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeSection === 'suggestions') {
          if (activeIndex > 0) {
            setActiveIndex(prev => prev - 1);
          } else {
            setActiveSection(null);
            setActiveIndex(-1);
          }
        } else if (activeSection === 'results') {
          if (activeIndex - colCount >= 0) {
            setActiveIndex(prev => prev - colCount);
          } else if (hasSuggestions) {
            setActiveSection('suggestions');
            setActiveIndex(suggestions.length - 1);
          } else {
            setActiveSection(null);
            setActiveIndex(-1);
          }
        }
      } else if (e.key === 'ArrowRight') {
        if (activeSection === 'results') {
          e.preventDefault();
          if (activeIndex < filtered.length - 1) {
            setActiveIndex(prev => prev + 1);
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (activeSection === 'results') {
          e.preventDefault();
          if (activeIndex > 0) {
            setActiveIndex(prev => prev - 1);
          }
        }
      } else if (e.key === 'Enter') {
        if (activeSection === 'suggestions' && activeIndex >= 0 && activeIndex < suggestions.length) {
          e.preventDefault();
          if (typeof playInterfaceTick === 'function') playInterfaceTick();
          const suggestion = suggestions[activeIndex];
          if (suggestion.type === 'title' && suggestion.item) {
            saveSearchQuery(suggestion.value);
            onSelectMovie(suggestion.item);
          } else {
            saveSearchQuery(suggestion.value);
            setQuery(suggestion.value);
          }
        } else if (activeSection === 'results' && activeIndex >= 0 && activeIndex < filtered.length) {
          e.preventDefault();
          if (typeof playInterfaceTick === 'function') playInterfaceTick();
          saveSearchQuery(query);
          onSelectMovie(filtered[activeIndex]);
        } else if (query.trim()) {
          saveSearchQuery(query);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, activeIndex, suggestions, filtered, query, isListening]);

  React.useEffect(() => {
    if (startVoiceImmediately) {
      // Delay slightly to let layout mount and transition smoothly
      const timer = setTimeout(() => {
        startVoiceRecognition();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [startVoiceImmediately]);

  const handleRecentClick = (keyword: string) => {
    if (typeof playInterfaceTick === 'function') playInterfaceTick();
    setQuery(keyword);
    saveSearchQuery(keyword);
  };

  const handleClearHistory = () => {
    if (typeof playInterfaceTick === 'function') playInterfaceTick();
    setRecentHistory([]);
    try {
      window.localStorage.removeItem('eliteplex_recent_searches');
    } catch (e) {
      console.error(e);
    }
  };

  const startVoiceRecognition = () => {
    if (typeof playInterfaceTick === 'function') playInterfaceTick();
    setVoiceError('');
    setVoiceText('');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Speech Recognition is not supported on this browser.");
      setIsListening(true);
      setVoiceText("Listening (Simulator Fallback)...");
      setTimeout(() => {
        setIsListening(false);
        setQuery("Over Your Dead Body");
        setVoiceText("");
        setVoiceError("");
      }, 1800);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = language === 'Bengali' ? 'bn-BD' : 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setVoiceError('');
        setVoiceText("Listening... Speak now");
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceText(transcript);
        setQuery(transcript);
        
        // Add to recent search history on successful final result
        if (event.results[0].isFinal) {
          if (transcript && transcript.trim() && !recentHistory.includes(transcript.trim())) {
            setRecentHistory(prev => [transcript.trim(), ...prev].slice(0, 10));
          }
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition error:", event);
        if (event.error === 'not-allowed') {
          setVoiceError("Microphone access denied.");
        } else if (event.error === 'no-speech') {
          setVoiceError("No speech detected. Try again.");
        } else {
          setVoiceError("Speech failed: " + event.error);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error(err);
      setVoiceError("Failed to access speech stream.");
      setIsListening(false);
    }
  };

  const handleStopVoice = () => {
    if (typeof playInterfaceTick === 'function') playInterfaceTick();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto pb-24 px-6 pt-6 transition-colors duration-300 ${
      isDarkMode ? 'bg-black text-white' : 'bg-[#f7f6f2] text-black'
    }`}>
      {/* 1. Header Search Bar floating */}
      <div className="flex items-center gap-4 max-w-2xl mx-auto mb-6 relative z-50">
        <button
          onClick={() => {
            if (typeof playInterfaceTick === 'function') playInterfaceTick();
            onClose();
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors border ${
            isDarkMode 
              ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
              : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <div className={`flex items-center justify-between py-2.5 px-4 rounded-xxl border shadow-lg ${
            isDarkMode 
              ? 'bg-white/[0.03] border-white/10' 
              : 'bg-white border-black/[0.08] shadow-sm'
          }`}>
            <div className="flex items-center gap-3 flex-1">
              <Search className="w-4 h-4 text-gold-base shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={translateText("Search premium cinema, directors, genres...", language)}
                className={`bg-transparent border-none text-xs outline-none w-full ${
                  isDarkMode ? 'text-white placeholder-white/30' : 'text-black placeholder-black/35'
                }`}
              />
              {query && (
                <button
                  onClick={() => {
                    if (typeof playInterfaceTick === 'function') playInterfaceTick();
                    setQuery('');
                  }}
                  className={`transition-colors p-1 rounded-full ${
                    isDarkMode ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-black/40 hover:text-black hover:bg-black/5'
                  }`}
                  title="Clear Search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={isListening ? handleStopVoice : startVoiceRecognition}
              className={`p-1.5 rounded-full transition-all ${isListening ? 'bg-amber-500/25 text-amber-500 animate-pulse scale-110' : isDarkMode ? 'text-white/50 hover:text-white hover:bg-white/5' : 'text-black/50 hover:text-black hover:bg-black/5'}`}
              title={isListening ? "Stop Voice" : "Real Voice Search"}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Search Suggestions dropdown */}
          <AnimatePresence>
            {query.trim().length > 0 && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`absolute left-0 right-0 mt-2 p-2.5 rounded-2xl border shadow-2xl z-50 text-left ${
                  isDarkMode 
                    ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-white/10 text-white' 
                    : 'bg-white/95 backdrop-blur-md border-black/10 text-black'
                }`}
              >
                <div className="text-[8px] font-tech text-gold-base tracking-wider uppercase px-2 py-1 mb-1.5 font-bold border-b border-white/5">
                  REAL-TIME AUTOCOMPLETE SUGGESTIONS
                </div>
                <div className="flex flex-col gap-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.type}-${suggestion.value}-${index}`}
                      onClick={() => {
                        if (typeof playInterfaceTick === 'function') playInterfaceTick();
                        if (suggestion.type === 'title' && suggestion.item) {
                          saveSearchQuery(suggestion.value);
                          onSelectMovie(suggestion.item);
                        } else {
                          saveSearchQuery(suggestion.value);
                          setQuery(suggestion.value);
                        }
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer active:scale-[0.99] border ${
                        activeSection === 'suggestions' && activeIndex === index
                          ? 'bg-gold-base/20 border-gold-base text-gold-base font-bold scale-[1.01] shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                          : isDarkMode 
                            ? 'hover:bg-white/5 border-transparent text-white/90' 
                            : 'hover:bg-black/5 border-transparent text-black/95'
                      }`}
                    >
                      <span className="truncate flex items-center gap-2">
                        {suggestion.type === 'title' ? (
                          <Play className="w-3 h-3 text-gold-base fill-gold-base/20 shrink-0" />
                        ) : suggestion.type === 'genre' ? (
                          <Heart className="w-3 h-3 text-red-500 shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                        )}
                        {suggestion.label}
                      </span>

                      {/* Genre/Category badges */}
                      <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full uppercase font-bold border shrink-0 ${
                        suggestion.type === 'title' 
                          ? 'bg-gold-base/10 border-gold-base/20 text-gold-base' 
                          : suggestion.type === 'genre'
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      }`}>
                        {suggestion.type}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <AnimatePresence mode="wait">
          {/* Real Listening or Voice Error State */}
          {(isListening || voiceError) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-8 text-center rounded-xxl border ${
                voiceError 
                  ? 'bg-red-500/[0.02] border-red-500/20 shadow-sm' 
                  : isDarkMode 
                    ? 'bg-white/[0.02] border-amber-500/15' 
                    : 'bg-amber-500/[0.02] border-amber-500/20 shadow-sm'
              }`}
            >
              {voiceError ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-3">
                    <Mic className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className={`text-sm font-bold tracking-wide text-red-500`}>
                    {translateText(voiceError, language)}
                  </h3>
                  <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-white/40' : 'text-black/50'}`}>
                    {translateText("Click the microphone button to try again.", language)}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-4 relative">
                    <span className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping" />
                    <Mic className="w-5 h-5 text-amber-500 relative z-10 animate-pulse" />
                  </div>
                  <h3 className={`text-sm font-extrabold tracking-wide text-amber-500`}>
                    {translateText(voiceText || "Listening... Speak now", language)}
                  </h3>
                  <p className={`text-[10px] mt-1.5 ${isDarkMode ? 'text-white/40' : 'text-black/50'}`}>
                    {translateText("Real-time speech stream decryption enabled.", language)}
                  </p>
                  <button
                    onClick={handleStopVoice}
                    className="mt-4 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border border-red-500/20 cursor-pointer"
                  >
                    {translateText("Stop", language)}
                  </button>
                </>
              )}
            </motion.div>
          )}

          {/* Core lists based on query existence */}
          {!query && !isListening ? (
            <motion.div
              key="suggestions-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-6"
            >
              {/* Recent search history list */}
              {recentHistory.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-tech tracking-widest uppercase ${isDarkMode ? 'text-white/40' : 'text-black/50'}`}>
                      {translateText("RECENT SEARCHES", language)}
                    </span>
                    <button
                      onClick={handleClearHistory}
                      className="text-[9px] font-tech text-red-400 hover:text-red-500 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {translateText("CLEAR ALL", language)}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentHistory.map((keyword, idx) => (
                      <button
                        key={`recent-query-${keyword}-${idx}`}
                        onClick={() => handleRecentClick(keyword)}
                        className={`py-2 px-4 rounded-full border text-[10px] flex items-center gap-1.5 cursor-pointer transition-all ${
                          isDarkMode 
                            ? 'bg-white/[0.03] border-white/5 hover:border-gold-base/15 text-white/70 hover:text-white' 
                            : 'bg-white border-black/[0.06] hover:border-gold-dark/25 text-black/70 hover:text-black shadow-sm'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 text-gold-base/50" />
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending suggestion rows */}
              <div className="flex flex-col gap-3">
                <span className={`text-[9px] font-tech tracking-widest uppercase ${isDarkMode ? 'text-white/40' : 'text-black/50'}`}>
                  {translateText("TRENDING SPOTLIGHT KEYWORDS", language)}
                </span>
                <div className="flex flex-col gap-2">
                  {TRENDING_SUGGESTIONS.map((s, idx) => (
                    <button
                      key={`trending-suggest-${s}-${idx}`}
                      onClick={() => handleRecentClick(s)}
                      className={`p-3 rounded-xl border text-left text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${
                        isDarkMode 
                          ? 'bg-white/5 border-white/5 hover:border-gold-base/15 text-white/80 hover:text-white' 
                          : 'bg-white border-black/[0.06] hover:border-gold-dark/20 text-black/80 hover:text-black shadow-sm'
                      }`}
                    >
                      <span className="text-gold-base font-serif font-black">#</span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            query && !isListening && (
              <motion.div
                key="results-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <span className={`text-[10px] font-tech tracking-widest uppercase ${isDarkMode ? 'text-white/40' : 'text-black/50'}`}>
                  {translateText("RESULTS FOUND FOR", language)} &quot;{String(query || '').toUpperCase()}&quot; ({filtered.length})
                </span>

                {filtered.length === 0 ? (
                  <div className={`p-12 text-center rounded-xxl border ${
                    isDarkMode ? 'bg-white/[0.02] border-white/5 text-white/40' : 'bg-white border-black/[0.08] text-black/50 shadow-sm'
                  }`}>
                    {translateText("No cinematic matches found. Try queries like \"Over Your Dead Body\" or \"FROM\".", language)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5 pb-8">
                    {filtered.map((movie, idx) => {
                      const isWatched = (watchlistIds || []).includes(movie.id);
                      const isNew = isNewMovie(movie);
                      return (
                        <motion.div
                          key={`search-grid-movie-${movie.id || idx}-${idx}`}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ y: -5, scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{
                            duration: 0.4,
                            ease: [0.16, 1, 0.3, 1],
                            delay: Math.min(idx * 0.03, 0.15)
                          }}
                          className={`flex flex-col gap-2 w-full select-none group cursor-pointer p-2 rounded-[28px] transition-all duration-300 ${
                            activeSection === 'results' && activeIndex === idx
                              ? 'ring-2 ring-gold-base bg-gold-base/5 scale-[1.03] shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                              : 'border border-transparent'
                          }`}
                          onClick={() => {
                            if (typeof playInterfaceTick === 'function') playInterfaceTick();
                            saveSearchQuery(query);
                            onSelectMovie(movie);
                          }}
                        >
                          {/* Poster frame */}
                          <div
                            className={`relative aspect-[2/3] rounded-[24px] overflow-hidden border shadow-md group-hover:border-gold-base/30 transition-all duration-300 ${
                              isDarkMode 
                                ? 'border-white/5 bg-black/40 shadow-black/40' 
                                : 'border-black/[0.08] bg-white shadow-black/10'
                            }`}
                          >
                            <img
                              src={movie.posterUrl}
                              alt={movie.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />

                            {isNew && (
                              <div className="absolute top-3 left-3 bg-emerald-500 text-black text-[7px] font-extrabold px-1.5 py-0.5 rounded-sm z-10 shadow-[0_2px_8px_rgba(16,185,129,0.4)] tracking-widest uppercase font-tech">
                                NEW
                              </div>
                            )}

                            {/* Rating Badge Overlay */}
                            <div className={`absolute left-3 bg-black/75 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 shadow z-10 transition-all ${isNew ? 'top-[34px]' : 'top-3'}`}>
                              <Star className="w-2.5 h-2.5 fill-gold-base text-gold-base" />
                              <span className="text-[8px] font-bold text-white">{movie.rating}</span>
                            </div>

                            {/* Favorite heart button */}
                            {onToggleWatchlist && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (typeof playInterfaceTick === 'function') playInterfaceTick();
                                  onToggleWatchlist(movie);
                                }}
                                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 z-20"
                              >
                                <Heart className={`w-3.5 h-3.5 ${isWatched ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                              </button>
                            )}

                            {/* Visual Glass Info plate on poster bottom */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end pt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <button className="gold-gradient-bg text-black font-semibold text-[8px] py-2 rounded-xl flex items-center justify-center gap-1 w-full">
                                <Play className="w-2.5 h-2.5 fill-black stroke-none" />
                                {translateText("DETAILS", language)}
                              </button>
                            </div>
                          </div>

                          {/* Text titles */}
                          <div className="flex flex-col min-w-0 px-1">
                            <h4
                              className={`text-xs font-bold truncate group-hover:text-gold-base uppercase tracking-wide transition-colors ${
                                isDarkMode ? 'text-white' : 'text-black'
                              }`}
                            >
                              {translateText(movie.title, language)}
                            </h4>
                            <span className={`text-[10px] font-mono mt-0.5 ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>
                              {movie.year} • {translateText(movie.type === 'series' ? 'Series' : 'Movie', language).toUpperCase()}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
