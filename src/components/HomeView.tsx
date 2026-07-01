import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie, UserProfile, isNewMovie, Episode } from '../types';
import { GENRES } from '../data/mockData';
import {
  Search, Mic, Star, Heart, Play, Plus, Check, Tv, Sparkles, Crown,
  Clapperboard, Flame, ChevronRight, ChevronLeft, MessageCircle, RefreshCcw, Sun, Moon, User, Bell, Clock, Globe, Download
} from 'lucide-react';
import { translateText } from '../lib/translator';
import { safeLocalStorage as localStorage } from '../lib/safeStorage';
import { playInterfaceTick } from '../lib/soundEffects';
import { SystemParams } from '../lib/firestoreService';

interface HomeViewProps {
  movies: Movie[];
  genres?: string[];
  movieCategories?: string[];
  seriesCategories?: string[];
  watchHistory?: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
  onOpenPremium: () => void;
  onToggleWatchlist: (movie: Movie) => void;
  watchlistIds: string[];
  currentUser: UserProfile;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onOpenNotifications?: () => void;
  trendingAutoSliderEnabled?: boolean;
  language?: string;
  onPlayMovie?: (movie: Movie, episode?: Episode, startTime?: number) => void;
  onOpenLanguage?: () => void;
  onOpenVoiceSearch?: () => void;
  onOpenDownloads?: () => void;
  customSiteName?: string;
  systemParams?: SystemParams | null;
}

export default function HomeView({
  movies,
  genres = GENRES,
  movieCategories = [],
  seriesCategories = [],
  onSelectMovie,
  onOpenSearch,
  onOpenProfile,
  onOpenPremium,
  onToggleWatchlist,
  watchlistIds,
  currentUser,
  isDarkMode = true,
  onToggleTheme,
  onOpenNotifications,
  trendingAutoSliderEnabled = true,
  language = 'English',
  onPlayMovie,
  onOpenLanguage,
  onOpenVoiceSearch,
  watchHistory = [],
  onOpenDownloads,
  customSiteName,
  systemParams
}: HomeViewProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [scrolled, setScrolled] = useState(false);

  // Premium Custom App Banner States and Synchronization Listener
  const [showAppBanner, setShowAppBanner] = useState(() => {
    return localStorage.getItem('ep_show_app_banner') === 'true';
  });
  const [selectedBannerIndex, setSelectedBannerIndex] = useState(() => {
    const saved = localStorage.getItem('ep_selected_banner_index');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    const handleBannerSettingsUpdate = () => {
      setShowAppBanner(localStorage.getItem('ep_show_app_banner') === 'true');
      const savedIndex = localStorage.getItem('ep_selected_banner_index');
      setSelectedBannerIndex(savedIndex ? parseInt(savedIndex, 10) : 0);
    };

    window.addEventListener('ep-banner-settings-updated', handleBannerSettingsUpdate);
    return () => {
      window.removeEventListener('ep-banner-settings-updated', handleBannerSettingsUpdate);
    };
  }, []);

  const activeCategories = Array.from(new Set([
    'All',
    ...(movieCategories || []).filter(c => c && c.toLowerCase() !== 'all').map(c => c.trim()),
    ...(seriesCategories || []).filter(c => c && c.toLowerCase() !== 'all').map(c => c.trim())
  ]));
  const [showSearchInsteadOfTitle, setShowSearchInsteadOfTitle] = useState(false);
  const [resumeList, setResumeList] = useState<any[]>([]);
  const [cycleState, setCycleState] = useState<'theme' | 'notifications' | 'language'>('theme');
  const [recommendations, setRecommendations] = useState<Movie[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState<boolean>(false);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false);

  const [lastWatchedMap, setLastWatchedMap] = useState<Record<string, { episodeId: string, updatedAt: number }>>({});

  useEffect(() => {
    const loadLastWatched = () => {
      try {
        const saved = localStorage.getItem('ep_series_last_watched');
        if (saved) {
          setLastWatchedMap(JSON.parse(saved));
        } else {
          setLastWatchedMap({});
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadLastWatched();

    window.addEventListener('ep-series-last-watched-updated', loadLastWatched);
    return () => {
      window.removeEventListener('ep-series-last-watched-updated', loadLastWatched);
    };
  }, []);

  // Strict defensive de-duplication of movies array by ID
  const uniqueMovies = useMemo(() => {
    const seen = new Set();
    return (movies || []).filter((m) => {
      if (!m || !m.id) return false;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [movies]);

  const watchNextQueue = useMemo(() => {
    const seriesList = uniqueMovies.filter(m => m.type === 'series');
    const queueItems: Array<{
      series: Movie;
      lastWatchedEpisodeId?: string;
      upcomingEpisode: Episode;
      remainingCount: number;
    }> = [];

    seriesList.forEach(series => {
      let lastEpId: string | undefined = undefined;

      if (lastWatchedMap && lastWatchedMap[series.id]) {
        lastEpId = lastWatchedMap[series.id].episodeId;
      }

      const resumeItem = resumeList.find(item => item.movieId === series.id);
      if (resumeItem && resumeItem.episodeId) {
        lastEpId = resumeItem.episodeId;
      }

      if (!series.seasons || series.seasons.length === 0) return;
      const sortedSeasons = [...series.seasons].sort((a, b) => a.seasonNumber - b.seasonNumber);
      const allEps: Episode[] = [];
      sortedSeasons.forEach(season => {
        if (season.episodes) {
          const sortedEps = [...season.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);
          allEps.push(...sortedEps);
        }
      });

      if (allEps.length === 0) return;

      let upcomingEp: Episode | undefined = undefined;
      let remainingCount = 0;

      if (!lastEpId) {
        const isCurrentlyWatching = resumeItem || watchHistory.some(h => h.id === series.id);
        if (isCurrentlyWatching) {
          upcomingEp = allEps[0];
          remainingCount = allEps.length;
        }
      } else {
        const currIdx = allEps.findIndex(ep => ep.id === lastEpId);
        if (currIdx !== -1) {
          if (currIdx + 1 < allEps.length) {
            upcomingEp = allEps[currIdx + 1];
            remainingCount = allEps.length - (currIdx + 1);
          }
        } else {
          upcomingEp = allEps[0];
          remainingCount = allEps.length;
        }
      }

      if (upcomingEp) {
        queueItems.push({
          series,
          lastWatchedEpisodeId: lastEpId,
          upcomingEpisode: upcomingEp,
          remainingCount
        });
      }
    });

    return queueItems.sort((a, b) => {
      const timeA = Math.max(
        lastWatchedMap[a.series.id]?.updatedAt || 0,
        resumeList.find(item => item.movieId === a.series.id)?.updatedAt || 0
      );
      const timeB = Math.max(
        lastWatchedMap[b.series.id]?.updatedAt || 0,
        resumeList.find(item => item.movieId === b.series.id)?.updatedAt || 0
      );
      return timeB - timeA;
    });
  }, [uniqueMovies, resumeList, lastWatchedMap, watchHistory]);

  const suggestedQueue = useMemo(() => {
    if (watchNextQueue.length > 0) return [];
    const seriesList = uniqueMovies.filter(m => m.type === 'series').slice(0, 4);
    return seriesList.map(series => {
      if (!series.seasons || series.seasons.length === 0) return null;
      const firstSeason = [...series.seasons].sort((a, b) => a.seasonNumber - b.seasonNumber)[0];
      if (!firstSeason || !firstSeason.episodes || firstSeason.episodes.length === 0) return null;
      const firstEp = [...firstSeason.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber)[0];
      const totalEps = series.seasons.reduce((sum, s) => sum + (s.episodes?.length || 0), 0);

      return {
        series,
        upcomingEpisode: firstEp,
        remainingCount: totalEps,
        isSuggestion: true
      };
    }).filter(Boolean) as Array<{
      series: Movie;
      upcomingEpisode: Episode;
      remainingCount: number;
      isSuggestion: boolean;
    }>;
  }, [uniqueMovies, watchNextQueue]);

  const handlePlayUpcomingEpisode = (series: Movie, episode: Episode) => {
    if (typeof playInterfaceTick === 'function') playInterfaceTick();
    if (onPlayMovie) {
      onPlayMovie(series, episode, 0);
    } else {
      onSelectMovie(series);
    }
  };

  // Extract top watched genres from history for metadata subtitle
  const topWatchedGenres = useMemo(() => {
    const counts: Record<string, number> = {};
    (watchHistory || []).forEach(m => {
      if (m && Array.isArray(m.genres)) {
        m.genres.forEach(g => {
          if (g) {
            const cleanG = g.trim();
            counts[cleanG] = (counts[cleanG] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre)
      .slice(0, 3);
  }, [watchHistory]);

  // Hybrid computed recommendations (AI curations + Local Genre-based filter)
  const computedRecommendations = useMemo(() => {
    // 1. Get watched genres
    const watchedGenres = new Set<string>();
    (watchHistory || []).forEach(m => {
      if (m && Array.isArray(m.genres)) {
        m.genres.forEach(g => {
          if (g) watchedGenres.add(g.toLowerCase().trim());
        });
      }
    });

    const watchedMovieIds = new Set((watchHistory || []).map(m => m.id));

    // 2. Filter our catalog based on these genres
    let genreMatches: Movie[] = [];
    if (watchedGenres.size > 0) {
      genreMatches = uniqueMovies.filter(m => {
        if (!m || watchedMovieIds.has(m.id)) return false;
        if (!m.genres || !Array.isArray(m.genres)) return false;
        return m.genres.some(g => g && watchedGenres.has(g.toLowerCase().trim()));
      });

      // Sort by rating desc
      genreMatches.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    // 3. De-duplicate and merge with current server-side recommendations
    const mergedList: Movie[] = [];
    const seenIds = new Set<string>();

    // First add AI recommendations
    (recommendations || []).forEach(m => {
      if (m && m.id && !seenIds.has(m.id)) {
        mergedList.push(m);
        seenIds.add(m.id);
      }
    });

    // Then add genre matches
    genreMatches.forEach(m => {
      if (m && m.id && !seenIds.has(m.id)) {
        mergedList.push(m);
        seenIds.add(m.id);
      }
    });

    // 4. If we still have fewer than 6 movies, fill with highest rated unwatched movies from the catalog
    if (mergedList.length < 6) {
      const highestRated = [...uniqueMovies]
        .filter(m => !watchedMovieIds.has(m.id))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));

      highestRated.forEach(m => {
        if (mergedList.length >= 10) return;
        if (m && m.id && !seenIds.has(m.id)) {
          mergedList.push(m);
          seenIds.add(m.id);
        }
      });
    }

    return mergedList.slice(0, 10);
  }, [uniqueMovies, recommendations, watchHistory]);

  // Create stable primitive dependencies for recommendations fetching
  const watchHistoryIdsKey = useMemo(() => {
    return (watchHistory || []).map((m) => m.id).join(",");
  }, [watchHistory]);

  const uniqueMoviesIdsKey = useMemo(() => {
    return uniqueMovies.map((m) => m.id).join(",");
  }, [uniqueMovies]);

  // Gemini recommendations system based on user's watch history
  useEffect(() => {
    let active = true;
    const fetchRecommendations = async () => {
      setLoadingRecommendations(true);
      try {
        const minimalWatchHistory = (watchHistory || []).map((m) => ({
          id: m.id,
          title: m.title || '',
          genre: m.genres ? m.genres.join(", ") : '',
          description: m.overview || ''
        }));

        const minimalCatalog = uniqueMovies.map((m) => ({
          id: m.id,
          title: m.title || '',
          genre: m.genres ? m.genres.join(", ") : '',
          description: m.overview || ''
        }));

        const response = await fetch("/api/curations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            watchHistory: minimalWatchHistory,
            catalog: minimalCatalog
          })
        });
        if (response.ok && active) {
          const data = await response.json();
          if (data && Array.isArray(data.recommendations)) {
            const seenRec = new Set();
            const uniqRec = data.recommendations
              .map((m: any) => m && m.id ? uniqueMovies.find((x) => x.id === m.id) : null)
              .filter((m: any): m is Movie => {
                if (!m || !m.id) return false;
                if (seenRec.has(m.id)) return false;
                seenRec.add(m.id);
                return true;
              });
            setRecommendations(uniqRec);
            setIsFallbackMode(!!data.isFallback);
          }
        }
      } catch (err) {
        console.error("Error fetching recommendations from server:", err);
      } finally {
        if (active) {
          setLoadingRecommendations(false);
        }
      }
    };

    fetchRecommendations();
    return () => {
      active = false;
    };
  }, [watchHistoryIdsKey, uniqueMoviesIdsKey]);

  // Multi-function header button auto-cycling effect
  useEffect(() => {
    const cycleInterval = setInterval(() => {
      setCycleState((prev) => {
        if (prev === 'theme') return 'notifications';
        if (prev === 'notifications') return 'language';
        return 'theme';
      });
    }, 4500);
    return () => clearInterval(cycleInterval);
  }, []);

  useEffect(() => {
    try {
      const savedStr = localStorage.getItem('ep_resume_watching');
      if (savedStr) {
        const parsed = JSON.parse(savedStr);
        const list = parsed.map((item: any) => {
          const matchedMovie = uniqueMovies.find((m) => m.id === item.movieId);
          if (matchedMovie) {
            return {
              ...item,
              movie: matchedMovie
            };
          }
          return null;
        }).filter(Boolean);
        setResumeList(list);
      } else {
        setResumeList([]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [uniqueMovies]);

  const handleResumePlay = (item: any) => {
    if (onPlayMovie) {
      let matchedEpisode;
      if (item.episodeId && item.movie.episodes) {
        matchedEpisode = item.movie.episodes.find((ep: any) => ep.id === item.episodeId);
      }
      onPlayMovie(item.movie, matchedEpisode, item.currentTime);
    } else {
      onSelectMovie(item.movie);
    }
  };

  // Periodic alternation timer (4.5 seconds for title, 4.5 seconds for search box)
  useEffect(() => {
    const interval = setInterval(() => {
      setShowSearchInsteadOfTitle((prev) => !prev);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Track window scroll to make the Header float dynamically
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once initially to capture current state
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get at least 3 unique movies/series for the 3-card sliding carousel
  const carouselMovies = (() => {
    const featured = uniqueMovies.filter((m) => m.isFeatured || m.rating >= 8.4);
    let list: any[] = [];
    const seenIds = new Set<string>();

    // Add featured first
    for (const m of featured) {
      if (!seenIds.has(m.id)) {
        list.push(m);
        seenIds.add(m.id);
      }
    }

    // Fill up to 4 items with other top-rated unique movies & serials from catalog
    if (list.length < 4) {
      const remaining = [...uniqueMovies]
        .filter((m) => !seenIds.has(m.id))
        .sort((a, b) => b.rating - a.rating);
      
      for (const m of remaining) {
        if (list.length >= 4) break;
        list.push(m);
        seenIds.add(m.id);
      }
    }

    if (list.length === 0) return [];
    // Ensure we have at least 3 items to show the left/center/right layout perfectly
    while (list.length < 3) {
      list = [...list, ...list];
    }
    return list;
  })();

  const prevIdx = carouselMovies.length > 0 ? (activeSlide - 1 + carouselMovies.length) % carouselMovies.length : 0;
  const currentIdx = carouselMovies.length > 0 ? activeSlide % carouselMovies.length : 0;
  const nextIdx = carouselMovies.length > 0 ? (activeSlide + 1) % carouselMovies.length : 0;

  const activeSpotlight = carouselMovies.length > 0 ? carouselMovies[currentIdx] : null;

  // Carousel auto rotate interval
  useEffect(() => {
    if (carouselMovies.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselMovies.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [carouselMovies.length]);

  // Filtering movie catalogs
  const filteredMovies = (uniqueMovies || []).filter((m) => {
    if (!m) return false;
    if (selectedGenre === 'All') return true;
    return m.genres && Array.isArray(m.genres) && m.genres.includes(selectedGenre);
  });

  const trendingMovies = filteredMovies.filter((m) => m && m.rating >= 8.5 && m.type === 'movie');
  const popularCinematic = filteredMovies.filter((m) => m && m.genres && Array.isArray(m.genres) && m.genres.includes('Cinematic'));
  const tvSeries = filteredMovies.filter((m) => m && m.type === 'series');
  const latestReleases = filteredMovies.filter((m) => m && m.year >= 2025);

  const markedTrending = [...uniqueMovies].filter((m) => m && m.isTrending);
  const sortCriteria = systemParams?.trendingSortOrder || 'popularity';
  
  const trendingNowMovies = (markedTrending.length > 0 ? markedTrending : [...uniqueMovies].filter(Boolean))
    .sort((a, b) => {
      if (sortCriteria === 'releaseDate') {
        return (b.year - a.year) || (b.rating - a.rating);
      } else {
        return b.rating - a.rating;
      }
    })
    .slice(0, 10);

  // Retrieve top 5 most recently added movies or series
  const recentlyAddedMovies = [...(uniqueMovies || [])]
    .filter(Boolean)
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <div id="home-view-container" className="pb-32 px-4 pt-24 md:pt-28 max-w-5xl mx-auto flex flex-col gap-8 w-full min-w-0 overflow-x-hidden">
      {/* 1. Pill-Shaped Luxury Header Bar Area (Fixed & Floating based on scroll at the top) */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className={`fixed left-1/2 -translate-x-1/2 z-40 px-4 transition-all duration-500 ease-out top-4 w-full ${
          scrolled 
            ? 'max-w-[440px] sm:max-w-[520px] drop-shadow-[0_10px_30px_rgba(157,85,237,0.25)]' 
            : 'max-w-[480px] sm:max-w-[580px]'
        }`}
      >
        <div className={`backdrop-blur-md border rounded-[32px] p-2 flex items-center justify-between relative overflow-hidden transition-all duration-500 ease-out ${
          isDarkMode 
            ? scrolled 
              ? 'bg-black/95 border-[#9d4edd]/50 shadow-[0_12px_30px_rgba(157,85,237,0.3)] pl-4.5 pr-4.5' 
              : 'bg-[#0d0a0a]/95 border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.8)] pl-3.5 pr-3.5'
            : scrolled 
              ? 'bg-[var(--custom-day-bg,#f7f6f2)]/95 border-[#9d4edd]/40 shadow-[0_12px_30px_rgba(157,85,237,0.12)] pl-4.5 pr-4.5' 
              : 'bg-[var(--custom-day-card,#fcfbfa)]/95 border-black/[0.12] shadow-[0_12px_40px_rgba(0,0,0,0.06)] pl-3.5 pr-3.5'
        }`}>
          {/* Inner ambient shine/glass sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-2.5 sm:gap-3.5 flex-1 min-w-0">
            {/* Custom Golden EP Logo */}
            <div className={`rounded-[15px] border flex items-center justify-center shrink-0 shadow-md transition-all duration-500 ${
              isDarkMode 
                ? 'bg-[#1a1717] border-white/[0.08]' 
                : 'bg-white border-black/[0.08]'
            } ${
              scrolled ? 'w-[36px] h-[36px]' : 'w-[42px] h-[42px]'
            }`}>
              <div className="flex items-center justify-center relative -space-x-[1px]">
                <span className={`font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-yellow-500 to-amber-700 tracking-tighter leading-none select-none transition-all duration-500 ${
                  scrolled ? 'text-[16px]' : 'text-[19px]'
                }`}>
                  E
                </span>
                <Play className={`text-yellow-500 fill-yellow-500 mt-0.5 shrink-0 drop-shadow-[0_0_4px_rgba(234,179,8,0.6)] transition-all duration-500 ${
                  scrolled ? 'w-[8px] h-[8px]' : 'w-[10px] h-[10px]'
                }`} />
              </div>
            </div>
            
            {/* Alternating Brand Title / Interactive Search Box with AnimatePresence */}
            <div className="relative flex-1 min-w-0 flex items-center h-10">
              <AnimatePresence mode="wait">
                {!showSearchInsteadOfTitle ? (
                  <motion.h1 
                    key="branding-title"
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: {
                          staggerChildren: 0.05
                        }
                      },
                      exit: {
                        opacity: 0,
                        x: 12,
                        transition: {
                          staggerChildren: 0.03,
                          staggerDirection: -1
                        }
                      }
                    }}
                    className={`font-serif italic font-black text-[#9d4edd] drop-shadow-[0_0_10px_rgba(157,85,237,0.5)] select-none transition-all duration-500 flex items-center shrink-0 ${
                      scrolled ? 'text-[13px] sm:text-[15px] tracking-[0.12em]' : 'text-[15px] sm:text-[17px] tracking-[0.14em]'
                    }`}
                  >
                    {(customSiteName || "ELITE PLEX").split("").map((char, index) => (
                      <motion.span
                        key={`branding-char-${char}-${index}`}
                        variants={{
                          hidden: { opacity: 0, y: index % 2 === 0 ? -8 : 8, scale: 0.8 },
                          visible: { 
                            opacity: 1, 
                            y: 0, 
                            scale: 1,
                            transition: { type: "spring", stiffness: 350, damping: 14 }
                          },
                          exit: { opacity: 0, y: index % 2 === 0 ? 8 : -8, scale: 0.8 }
                        }}
                        className={char === " " ? "w-1.5" : `inline-block ${isDarkMode ? 'text-white' : 'text-black'}`}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </motion.h1>
                ) : (
                  <div className="flex items-center gap-1.5 w-full max-w-[170px] sm:max-w-[210px]">
                    <motion.div
                      key="branding-search-box"
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -15, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      onClick={onOpenSearch}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border active:scale-95 transition-all duration-300 cursor-pointer select-none flex-1 min-w-0 shadow-[0_0_12px_rgba(234,179,8,0.15)] group ${
                        isDarkMode
                          ? 'border-gold-base/30 bg-gold-base/[0.02] hover:bg-gold-base/[0.08] hover:border-gold-base/50'
                          : 'border-gold-base/45 bg-white shadow-sm hover:bg-gold-base/5'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5 text-gold-base shrink-0 animate-pulse group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-[10px] font-tech text-gold-base font-extrabold tracking-wider uppercase truncate">
                        Search...
                      </span>
                    </motion.div>
                    
                    <motion.button
                      key="branding-mic-button"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof playInterfaceTick === 'function') playInterfaceTick();
                        onOpenVoiceSearch?.();
                      }}
                      className={`p-2 rounded-full border flex items-center justify-center active:scale-90 transition-all shrink-0 cursor-pointer ${
                        isDarkMode
                          ? 'border-gold-base/30 bg-gold-base/[0.02] text-gold-base hover:bg-gold-base/10 hover:border-gold-base/50'
                          : 'border-gold-base/45 bg-white text-gold-dark shadow-sm hover:bg-gold-base/5'
                      }`}
                      title="Voice Search"
                    >
                      <Mic className="w-3.5 h-3.5 text-gold-base animate-pulse" />
                    </motion.button>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <motion.div 
            className="flex items-center gap-2"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: 0.2,
                  delayChildren: 0.1
                }
              }
            }}
          >
            {/* Multi-Function Cycler Button (Theme -> Notifications -> Language) */}
            <motion.button
              variants={{
                hidden: { opacity: 0, scale: 0.4, y: -12, rotate: -45 },
                show: { opacity: 1, scale: 1, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 260, damping: 14 } }
              }}
              onClick={() => {
                if (typeof playInterfaceTick === 'function') playInterfaceTick();
                if (cycleState === 'theme') {
                  onToggleTheme?.();
                } else if (cycleState === 'notifications') {
                  onOpenNotifications?.();
                } else {
                  if (onOpenLanguage) {
                    onOpenLanguage();
                  } else {
                    onOpenProfile?.();
                  }
                }
              }}
              title={
                cycleState === 'theme' 
                  ? (isDarkMode ? "Switch to Day Mode" : "Switch to Night Mode")
                  : cycleState === 'notifications'
                    ? "Notifications"
                    : "Select Language"
              }
              className={`rounded-full border flex items-center justify-center active:scale-95 transition-all duration-300 cursor-pointer shadow relative overflow-hidden group ${
                isDarkMode 
                  ? 'bg-[#141212]/80 border-white/[0.08] hover:border-white/20 hover:bg-gold-base/[0.03]' 
                  : 'bg-white border-black/[0.12] hover:border-black/25 hover:bg-gold-base/[0.03]'
              } ${
                scrolled ? 'w-[32px] h-[32px]' : 'w-[38px] h-[38px]'
              }`}
            >
              <div className="absolute inset-0 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <AnimatePresence mode="wait">
                {cycleState === 'theme' && (
                  <motion.div
                    key="theme-state"
                    initial={{ opacity: 0, rotate: -180, scale: 0.5 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 180, scale: 0.5 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="flex items-center justify-center w-full h-full"
                  >
                    {isDarkMode ? (
                      <Sun className="text-yellow-500 stroke-[2] drop-shadow-[0_0_8px_rgba(234,179,8,0.7)] w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                    ) : (
                      <Moon className="text-[#9d4edd] stroke-[2] drop-shadow-[0_0_8px_rgba(157,85,237,0.7)] w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                    )}
                  </motion.div>
                )}

                {cycleState === 'notifications' && (
                  <motion.div
                    key="notification-state"
                    initial={{ opacity: 0, y: 15, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.6 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="flex items-center justify-center w-full h-full relative"
                  >
                    <Bell className="text-gold-base stroke-[2] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)] w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  </motion.div>
                )}

                {cycleState === 'language' && (
                  <motion.div
                    key="language-state"
                    initial={{ opacity: 0, rotate: 180, scale: 0.5 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: -180, scale: 0.5 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="flex items-center justify-center w-full h-full relative"
                  >
                    {/* Animation 1: Ambient Breathing Ring Pulse */}
                    <motion.div 
                      className="absolute inset-0 rounded-full bg-gold-base/15 border border-gold-base/20"
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.6, 0, 0.6],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />

                    {/* Animation 2: Infinite Earth Rotation */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className="relative z-10 flex items-center justify-center w-full h-full"
                    >
                      <Globe className="text-gold-base stroke-[2] drop-shadow-[0_0_8px_rgba(212,175,55,0.7)] w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                    </motion.div>

                    {/* Animation 3: Hover Twist & Tap badge popping */}
                    <motion.span 
                      className="absolute -bottom-0.5 right-0 text-[6px] font-tech font-extrabold bg-gold-base text-black px-0.5 rounded shadow scale-75 uppercase tracking-tighter"
                      animate={{
                        scale: [0.7, 0.85, 0.7],
                      }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      {language === 'Bengali' ? 'BN' : language === 'English' ? 'EN' : language.slice(0, 2)}
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Premium Active Custom App Banner Injection (16:9 selected design) */}
      {showAppBanner && currentUser?.isPremium && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`aspect-[16/9] w-full rounded-2xl relative overflow-hidden flex flex-col justify-end p-5 md:p-8 border shadow-2xl transition-all duration-500 ease-out shrink-0 mb-4 ${
            selectedBannerIndex === 0
              ? "bg-gradient-to-br from-[#0c0a09] via-[#1c1917] to-[#0c0a09] border-[#d4af37]/40 text-white shadow-[0_0_25px_rgba(212,175,55,0.15)]"
              : selectedBannerIndex === 1
                ? "bg-gradient-to-br from-[#0d001a] via-[#050014] to-[#120024] border-[#00f5ff]/40 text-white shadow-[0_0_25px_rgba(0,245,255,0.15)]"
                : selectedBannerIndex === 2
                  ? "bg-gradient-to-br from-[#1c0202] via-[#0d0101] to-[#240303] border-[#f43f5e]/40 text-white shadow-[0_0_25px_rgba(244,63,94,0.15)]"
                  : selectedBannerIndex === 3
                    ? "bg-gradient-to-br from-[#010314] via-[#050616] to-[#0f021c] border-[#8b5cf6]/40 text-white shadow-[0_0_25px_rgba(139,92,246,0.15)]"
                    : "bg-gradient-to-br from-[#01140e] via-[#000503] to-[#032115] border-[#10b981]/40 text-white shadow-[0_0_25px_rgba(16,185,129,0.15)]"
          }`}
          style={{
            backgroundImage: 
              selectedBannerIndex === 0 ? "radial-gradient(circle at center, rgba(212,175,55,0.1) 0%, transparent 70%)" :
              selectedBannerIndex === 1 ? "radial-gradient(circle at center, rgba(0,245,255,0.1) 0%, transparent 70%)" :
              selectedBannerIndex === 2 ? "radial-gradient(circle at center, rgba(244,63,94,0.1) 0%, transparent 70%)" :
              selectedBannerIndex === 3 ? "radial-gradient(circle at center, rgba(139,92,246,0.1) 0%, transparent 70%)" :
              "radial-gradient(circle at center, rgba(16,185,129,0.1) 0%, transparent 70%)"
          }}
        >
          {/* Atmospheric ambient drop gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-0 pointer-events-none" />
          
          {/* Tag Watermark Badge */}
          <div className="absolute top-4 right-4 z-10">
            <span 
              className="text-[9px] font-tech font-extrabold border px-2.5 py-1 rounded-md bg-black/45 backdrop-blur shadow uppercase tracking-widest flex items-center gap-1"
              style={{
                borderColor: 
                  selectedBannerIndex === 0 ? "#D4AF37" :
                  selectedBannerIndex === 1 ? "#00f5ff" :
                  selectedBannerIndex === 2 ? "#f43f5e" :
                  selectedBannerIndex === 3 ? "#8b5cf6" :
                  "#10b981",
                color:
                  selectedBannerIndex === 0 ? "#D4AF37" :
                  selectedBannerIndex === 1 ? "#00f5ff" :
                  selectedBannerIndex === 2 ? "#f43f5e" :
                  selectedBannerIndex === 3 ? "#8b5cf6" :
                  "#10b981"
              }}
            >
              <Sparkles className="w-3 h-3 animate-spin shrink-0" style={{ animationDuration: '6s' }} />
              {
                selectedBannerIndex === 0 ? "ROYAL VIP" :
                selectedBannerIndex === 1 ? "FUTURE 8K" :
                selectedBannerIndex === 2 ? "LEGENDS ONLY" :
                selectedBannerIndex === 3 ? "COSMIC STREAMS" :
                "CONNOISSEUR'S DECK"
              }
            </span>
          </div>

          {/* Banner Content */}
          <div className="relative z-10 flex flex-col gap-1.5 text-left max-w-[90%] md:max-w-[70%]">
            <div className="flex items-center gap-1.5">
              <Crown className="w-4.5 h-4.5 text-gold-base shrink-0 animate-bounce" />
              <span className="text-[10px] font-tech font-black uppercase tracking-widest text-gold-base">
                {
                  selectedBannerIndex === 0 ? "ROYAL VIP" :
                  selectedBannerIndex === 1 ? "FUTURE 8K" :
                  selectedBannerIndex === 2 ? "LEGENDS ONLY" :
                  selectedBannerIndex === 3 ? "COSMIC STREAMS" :
                  "CONNOISSEUR'S DECK"
                } MASTERPIECE
              </span>
            </div>
            
            <h3 className="text-sm sm:text-lg md:text-2xl font-serif font-black tracking-wide leading-tight drop-shadow uppercase text-white">
              {
                selectedBannerIndex === 0 ? "ELITE PLEX GRAND VIP" :
                selectedBannerIndex === 1 ? "NEON FUTURE 8K RESOLUTION" :
                selectedBannerIndex === 2 ? "GOLDEN AGE CINEMA" :
                selectedBannerIndex === 3 ? "INTERSTELLAR PLATINUM VIP" :
                "IMPERIAL JADE SELECTION"
              }
            </h3>
            
            <p className="text-[10px] sm:text-xs text-white/95 font-medium tracking-wide">
              {
                selectedBannerIndex === 0 ? "EXPERIENCE THE PINNACLE OF LUXURY CINEMA" :
                selectedBannerIndex === 1 ? "VIP EDGE PIPELINE - QUANTUM TUNNEL CHANNELS ACTIVE" :
                selectedBannerIndex === 2 ? "CURATED CLASSIC HOLLYWOOD & BOLLYWOOD MASTERPIECES" :
                selectedBannerIndex === 3 ? "DURABLE UNIFIED COSMIC ATMOSPHERIC INTERFACE" :
                "EXCLUSIVELY CRAFTED CHANNELS & INDEPENDENT OSCAR WINNERS"
              }
            </p>
            
            <p className="text-[9px] sm:text-xs text-white/60 font-light line-clamp-1 max-w-[85%] mt-0.5">
              {
                selectedBannerIndex === 0 ? "Unrestricted master catalog stream access with lossless Dolby soundscapes." :
                selectedBannerIndex === 1 ? "Hyper-bitrate streaming running directly on fiber tier-1 CDN trans-pacific routes." :
                selectedBannerIndex === 2 ? "A timeless hand-picked archive preserved in pristine direct master Cinerama copy." :
                selectedBannerIndex === 3 ? "Astral-grade scene ambient lighting projections mapped live to your display device." :
                "Premium independent masterworks and live global awards in silk-smooth 120 FPS."
              }
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button 
                onClick={() => {
                  if (typeof playInterfaceTick === 'function') playInterfaceTick();
                  alert("Premium Edge Stream Session initialized successfully! Buffering lossless raw codec copy...");
                }}
                className="gold-gradient-bg text-black font-tech text-[9px] sm:text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                LAUNCH STREAM
              </button>
              <button 
                onClick={() => {
                  if (typeof playInterfaceTick === 'function') playInterfaceTick();
                  alert("Decryption Channel locked as prioritized premium favorite.");
                }}
                className="bg-white/10 border border-white/10 text-white font-tech text-[9px] sm:text-xs font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-white/20 transition-all cursor-pointer"
              >
                ADD FAVORITES
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. Hero Visual Spotlight Banner Carousel (3-card peek slider effect) */}
      {activeSpotlight && (
        <div className="flex flex-col gap-3.5 relative py-2 overflow-hidden w-full select-none max-w-[480px] sm:max-w-[720px] md:max-w-[900px] lg:max-w-[1050px] mx-auto animate-fade-in">
          {/* Slider Row */}
          <div className="w-full flex items-center justify-center gap-3 relative px-2">
            {/* Left Card Peek */}
            {carouselMovies.length >= 3 && carouselMovies[prevIdx] && (
              <motion.div
                key={`prev-${prevIdx}`}
                onClick={() => {
                  playInterfaceTick();
                  setActiveSlide(prevIdx);
                }}
                initial={{ opacity: 0.5, scale: 0.88 }}
                animate={{ opacity: 0.8, scale: 0.96 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-[30%] aspect-[2/3] rounded-[20px] overflow-hidden relative cursor-pointer shrink-0 border-[2px] border-gold-base/35 hover:border-gold-base/70 shadow-2xl select-none group/peek-left"
              >
                <img
                  src={carouselMovies[prevIdx].posterUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover/peek-left:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/55 group-hover/peek-left:bg-black/35 transition-colors duration-300" />
                
                {/* Subtle title at peek bottom */}
                <div className="absolute bottom-3 left-2 right-2 text-center pointer-events-none opacity-60 group-hover/peek-left:opacity-90 transition-opacity">
                  <p className="text-[10px] sm:text-xs font-serif font-bold text-white tracking-wider uppercase line-clamp-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    {translateText(carouselMovies[prevIdx].title, language)}
                  </p>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/peek-left:opacity-100 transition-opacity">
                  <ChevronLeft className="w-8 h-8 text-gold-base drop-shadow-[0_0_8px_rgba(212,175,55,0.7)]" />
                </div>
              </motion.div>
            )}

            {/* Centered Active Card */}
            <motion.div
              key={`active-${activeSpotlight.id}`}
              initial={{ opacity: 0.9, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              onClick={() => {
                playInterfaceTick();
                onSelectMovie(activeSpotlight);
              }}
              className="w-[48%] aspect-[2/3] rounded-[20px] overflow-hidden relative shrink-0 border-[3.5px] border-gold-base shadow-[0_15px_35px_rgba(212,175,55,0.3)] select-none group cursor-pointer z-10"
            >
              <img
                src={activeSpotlight.posterUrl}
                alt={activeSpotlight.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700"
              />
              {/* Golden radial gradient shine & vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              
              {/* Title overlay at card bottom */}
              <div className="absolute bottom-5 left-3 right-3 text-center pointer-events-none">
                <h3 className="text-xs sm:text-sm md:text-base font-serif font-black text-white tracking-wide uppercase drop-shadow-[0_2px_5px_rgba(0,0,0,1)] line-clamp-2">
                  {translateText(activeSpotlight.title, language)}
                </h3>
              </div>
            </motion.div>

            {/* Right Card Peek */}
            {carouselMovies.length >= 3 && carouselMovies[nextIdx] && (
              <motion.div
                key={`next-${nextIdx}`}
                onClick={() => {
                  playInterfaceTick();
                  setActiveSlide(nextIdx);
                }}
                initial={{ opacity: 0.5, scale: 0.88 }}
                animate={{ opacity: 0.8, scale: 0.96 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-[30%] aspect-[2/3] rounded-[20px] overflow-hidden relative cursor-pointer shrink-0 border-[2px] border-gold-base/35 hover:border-gold-base/70 shadow-2xl select-none group/peek-right"
              >
                <img
                  src={carouselMovies[nextIdx].posterUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover/peek-right:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/55 group-hover/peek-right:bg-black/35 transition-colors duration-300" />
                
                {/* Subtle title at peek bottom */}
                <div className="absolute bottom-3 left-2 right-2 text-center pointer-events-none opacity-60 group-hover/peek-right:opacity-90 transition-opacity">
                  <p className="text-[10px] sm:text-xs font-serif font-bold text-white tracking-wider uppercase line-clamp-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    {translateText(carouselMovies[nextIdx].title, language)}
                  </p>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/peek-right:opacity-100 transition-opacity">
                  <ChevronRight className="w-8 h-8 text-gold-base drop-shadow-[0_0_8px_rgba(212,175,55,0.7)]" />
                </div>
              </motion.div>
            )}
          </div>

          {/* Controller and Watchlist Action Row underneath the active card */}
          <div className="w-full px-4 flex items-center gap-3 mt-1">
            {/* Streaming Spotlight Button with custom styling */}
            <button
              onClick={() => onSelectMovie(activeSpotlight)}
              className="flex-1 gold-gradient-bg hover:brightness-115 text-black py-2.5 px-4 rounded-[20px] flex items-center justify-center gap-3.5 shadow-[0_8px_25px_rgba(212,175,55,0.25)] cursor-pointer transition-all active:scale-[0.98] h-[58px]"
            >
              <Play className="w-4 h-4 text-black fill-black shrink-0" />
              <span className="text-left leading-tight">
                <span className="block text-[10px] font-serif font-black italic tracking-wider text-black/80 uppercase">
                  Streaming
                </span>
                <span className="block text-[12px] font-serif font-black italic tracking-widest text-black uppercase">
                  Spotlight
                </span>
              </span>
            </button>

            {/* Watchlist Heart Button */}
            <button
              onClick={() => onToggleWatchlist(activeSpotlight)}
              className="w-[58px] h-[58px] rounded-[20px] bg-[#1a1510]/80 border border-white/10 hover:bg-white/5 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all shrink-0 shadow-lg"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  (watchlistIds || []).includes(activeSpotlight.id)
                    ? 'fill-gold-base text-gold-base'
                    : 'text-white/80'
                }`}
              />
            </button>
          </div>

          {/* Carousel indicator dots with matching pill stretch style */}
          {carouselMovies.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-2">
              {carouselMovies.map((_, i) => (
                <button
                  key={`carousel-dot-${i}`}
                  onClick={() => setActiveSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeSlide % carouselMovies.length ? 'w-6 bg-gold-base' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

       {/* 4. Luxury Genre Grid selector */}
      <div className="flex flex-col gap-3">
        <span className={`text-[9px] font-tech tracking-widest uppercase ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>EXLUSIVE GENRE TILES</span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {activeCategories.map((g, idx) => {
            const isSel = selectedGenre === g;
            return (
              <button
                key={`genre-${g}-${idx}`}
                onClick={() => setSelectedGenre(g)}
                className={`relative text-[10px] font-tech font-bold tracking-wider py-2 px-5 rounded-full border shrink-0 transition-all cursor-pointer overflow-hidden ${
                  isSel
                    ? 'border-gold-base text-gold-base shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                    : isDarkMode 
                      ? 'border-white/10 text-white/50 hover:text-white bg-white/5'
                      : 'border-black/12 text-black/65 hover:text-black bg-black/5 shadow-sm'
                }`}
              >
                {isSel && (
                  <motion.div
                    layoutId="activeGenreHighlight"
                    className="absolute inset-0 bg-gold-base/15 z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <span className="relative z-10">
                  {translateText(g, language).toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Trending / Categorized Content Sections */}
      {selectedGenre !== 'All' ? (
        <>
          {/* Category Movies Row */}
          {filteredMovies.filter((m) => m && (m.type === 'movie' || !m.type)).length > 0 && (
            <MovieRow
              title={`${selectedGenre} Movies`}
              subtitle={`Premium cinematic movies listed under ${selectedGenre}`}
              movies={filteredMovies.filter((m) => m && (m.type === 'movie' || !m.type))}
              onSelect={onSelectMovie}
              onToggleWatch={onToggleWatchlist}
              watchIds={watchlistIds}
              syncIcon
              isDarkMode={isDarkMode}
              language={language}
              onGenreClick={setSelectedGenre}
            />
          )}

          {/* Category Series Row */}
          {filteredMovies.filter((m) => m && m.type === 'series').length > 0 && (
            <MovieRow
              title={`${selectedGenre} Series`}
              subtitle={`Elite episodic TV series listed under ${selectedGenre}`}
              movies={filteredMovies.filter((m) => m && m.type === 'series')}
              onSelect={onSelectMovie}
              onToggleWatch={onToggleWatchlist}
              watchIds={watchlistIds}
              isDarkMode={isDarkMode}
              language={language}
              onGenreClick={setSelectedGenre}
            />
          )}

          {filteredMovies.length === 0 && (
            <div className={`p-12 text-center rounded-xxl border text-xs ${
              isDarkMode 
                ? 'luxury-glass border-white/5 text-white/40' 
                : 'bg-white border-black/[0.08] text-black/55 shadow-sm'
            }`}>
              No titles discovered under the "{selectedGenre}" genre index.
            </div>
          )}
        </>
      ) : (
        <>
          {/* 5. Trending Now - Framer Motion Horizontal Carousel */}
          {trendingNowMovies.length > 0 && (
            <TrendingNowCarousel
              movies={trendingNowMovies}
              onSelect={onSelectMovie}
              onToggleWatch={onToggleWatchlist}
              watchIds={watchlistIds}
              autoSliderEnabled={trendingAutoSliderEnabled}
              isDarkMode={isDarkMode}
              language={language}
            />
          )}

          {/* Recently Added Horizontal Carousel */}
          {recentlyAddedMovies.length > 0 && (
            <MovieRow
              title="Recently Added"
              subtitle="Fresh cinematic drops and serialized episodes added this week."
              movies={recentlyAddedMovies}
              onSelect={onSelectMovie}
              onToggleWatch={onToggleWatchlist}
              watchIds={watchlistIds}
              isDarkMode={isDarkMode}
              language={language}
              showRecentlyAddedBadge={true}
              onGenreClick={setSelectedGenre}
            />
          )}

          {/* Genre-based & AI Recommendations Section */}
          <div className="flex flex-col gap-1">
            {loadingRecommendations && computedRecommendations.length === 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className={`text-md font-serif font-bold tracking-wide uppercase italic flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                      <Sparkles className="w-4 h-4 text-gold-base shrink-0 animate-pulse" />
                      {translateText("Recommended for You", language)}
                    </h3>
                    <p className={`text-[8px] uppercase tracking-widest font-tech mt-0.5 leading-relaxed ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>
                      {translateText("ANALYSING YOUR VIEWING FOOTPRINT...", language)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none animate-pulse">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={`rec-loader-${idx}`} className="shrink-0 w-32 flex flex-col gap-2">
                      <div className={`aspect-[2/3] rounded-[20px] ${isDarkMode ? 'bg-neutral-900 border border-neutral-800' : 'bg-neutral-200 border border-neutral-300'}`} />
                      <div className={`h-3 w-3/4 rounded ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
                      <div className={`h-2.5 w-1/2 rounded ${isDarkMode ? 'bg-neutral-900' : 'bg-neutral-200'}`} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <MovieRow
                title="Recommended for You"
                subtitle={topWatchedGenres.length > 0 ? `FILTERED BY YOUR INTEREST IN ${topWatchedGenres.join(", ").toUpperCase()}` : "HIGHLY RATED BLOCKBUSTER CURATIONS"}
                movies={computedRecommendations}
                onSelect={onSelectMovie}
                onToggleWatch={onToggleWatchlist}
                watchIds={watchlistIds}
                sparkleIcon
                isDarkMode={isDarkMode}
                language={language}
                onGenreClick={setSelectedGenre}
              />
            )}
          </div>

          {/* 6. Popular Cinematic Row (Syncs with TMDB layout) */}
          {popularCinematic.length > 0 && (
            <MovieRow
              title="Popular Cinematic Movies"
              subtitle="Continuously syncs live with TMDB core popular lists."
              movies={popularCinematic}
              onSelect={onSelectMovie}
              onToggleWatch={onToggleWatchlist}
              watchIds={watchlistIds}
              syncIcon
              isDarkMode={isDarkMode}
              language={language}
              onGenreClick={setSelectedGenre}
            />
          )}

          {/* Custom Movie Categories Rows */}
          {Array.from(new Set((movieCategories || []).filter(cat => cat && cat.toLowerCase() !== 'all').map(c => c.trim()))).map((category, index) => {
            const categoryMovies = uniqueMovies.filter(m => m && (m.type === 'movie' || !m.type) && m.genres && Array.isArray(m.genres) && m.genres.some(g => g && g.toLowerCase() === category.toLowerCase()));
            if (categoryMovies.length === 0) return null;
            return (
              <MovieRow
                key={`movie-cat-row-${category}-${index}`}
                title={`${category} Movies`}
                subtitle={`Custom curations under our premium ${category} cinematic catalog.`}
                movies={categoryMovies}
                onSelect={onSelectMovie}
                onToggleWatch={onToggleWatchlist}
                watchIds={watchlistIds}
                isDarkMode={isDarkMode}
                language={language}
                onGenreClick={setSelectedGenre}
              />
            );
          })}

          {/* Custom Series Categories Rows */}
          {Array.from(new Set((seriesCategories || []).filter(cat => cat && cat.toLowerCase() !== 'all').map(c => c.trim()))).map((category, index) => {
            const categorySeries = uniqueMovies.filter(m => m && m.type === 'series' && m.genres && Array.isArray(m.genres) && m.genres.some(g => g && g.toLowerCase() === category.toLowerCase()));
            if (categorySeries.length === 0) return null;
            return (
              <MovieRow
                key={`series-cat-row-${category}-${index}`}
                title={`${category} Serials`}
                subtitle={`Custom curations under our premium ${category} serials catalog.`}
                movies={categorySeries}
                onSelect={onSelectMovie}
                onToggleWatch={onToggleWatchlist}
                watchIds={watchlistIds}
                isDarkMode={isDarkMode}
                language={language}
                onGenreClick={setSelectedGenre}
              />
            );
          })}

          {/* 7. Continue Watching Series / Movies (Simulates progress bar) */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className={`text-md font-serif font-bold tracking-wide uppercase italic ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  {translateText("Continue Watching", language)}
                </h3>
                <span className={`text-[8px] uppercase tracking-widest font-tech mt-0.5 ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>RESUME DECRYPTION</span>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {resumeList.length > 0 ? (
                resumeList.map((item, idx) => {
                  const m = item.movie;
                  return (
                    <div
                      key={`continue-resume-${m.id || idx}-${idx}`}
                      onClick={() => handleResumePlay(item)}
                      className="flex flex-col gap-2 shrink-0 w-44 cursor-pointer group select-none"
                    >
                      <div className={`relative aspect-video rounded-xxl overflow-hidden border shadow-md transition-colors ${
                        isDarkMode ? 'border-white/5 bg-[#141212]' : 'border-black/[0.08] bg-white'
                      }`}>
                        <img src={m.backdropUrl} alt={m.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-8 h-8 text-gold-base fill-gold-base animate-pulse" />
                        </div>

                        {/* Progress Line HUD */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                          <div className="h-full gold-gradient-bg" style={{ width: `${item.progressPercent}%` }} />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <h4 className={`text-xs font-bold truncate group-hover:text-gold-base transition-colors uppercase tracking-wide ${isDarkMode ? 'text-white' : 'text-black'}`}>
                          {translateText(m.title, language)}
                        </h4>
                        <span className={`text-[9px] ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>
                          {item.progressPercent}% watched • {String(m.type || '').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                uniqueMovies.slice(0, 3).map((m, idx) => {
                  const simulatedProgress = [72, 45, 18][idx % 3];
                  return (
                    <div
                      key={`continue-simulated-${m.id || idx}-${idx}`}
                      onClick={() => onSelectMovie(m)}
                      className="flex flex-col gap-2 shrink-0 w-44 cursor-pointer group select-none opacity-55 hover:opacity-100 transition-opacity"
                    >
                      <div className={`relative aspect-video rounded-xxl overflow-hidden border shadow-md transition-colors ${
                        isDarkMode ? 'border-white/5 bg-[#141212]' : 'border-black/[0.08] bg-white'
                      }`}>
                        <img src={m.backdropUrl} alt={m.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-8 h-8 text-gold-base fill-gold-base" />
                        </div>

                        {/* Progress Line HUD */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                          <div className="h-full gold-gradient-bg" style={{ width: `${simulatedProgress}%` }} />
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <h4 className={`text-xs font-bold truncate group-hover:text-gold-base transition-colors uppercase tracking-wide ${isDarkMode ? 'text-white' : 'text-black'}`}>
                          {translateText(m.title, language)}
                        </h4>
                        <span className={`text-[9px] ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>
                          {simulatedProgress}% watched • DEMO PREVIEW
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Watch Next Queue */}
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className={`text-md font-serif font-bold tracking-wide uppercase italic flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  <Clock className="w-4 h-4 text-gold-base shrink-0" />
                  {translateText("Watch Next", language)}
                </h3>
                <span className={`text-[8px] uppercase tracking-widest font-tech mt-0.5 ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>UPCOMING EPISODES LOBBY</span>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
              {watchNextQueue.length > 0 ? (
                watchNextQueue.map((item, idx) => {
                  const s = item.series;
                  const ep = item.upcomingEpisode;
                  const thumb = ep.thumbnailUrl || s.backdropUrl || s.posterUrl;
                  
                  return (
                    <motion.div
                      key={`watch-next-item-${s.id}-${ep.id}-${idx}`}
                      onClick={() => handlePlayUpcomingEpisode(s, ep)}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex flex-col gap-2 shrink-0 w-64 cursor-pointer group select-none"
                    >
                      <div className={`relative aspect-video rounded-xxl overflow-hidden border shadow-md transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.25)] group-hover:border-gold-base/40 ${
                        isDarkMode ? 'border-white/5 bg-[#141212]' : 'border-black/[0.08] bg-white'
                      }`}>
                        <img 
                          src={thumb} 
                          alt={ep.title} 
                          referrerPolicy="no-referrer" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-12 h-12 rounded-full bg-gold-base/95 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                          </div>
                        </div>

                        {/* Season/Episode Badge */}
                        <div className="absolute top-3 left-3 bg-black/75 border border-white/10 px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider text-gold-base font-bold uppercase backdrop-blur-sm">
                          S{ep.seasonNumber}:E{ep.episodeNumber}
                        </div>

                        {/* Remaining Count Badge */}
                        {item.remainingCount > 1 && (
                          <div className="absolute bottom-3 right-3 bg-gold-base/95 text-black text-[8px] font-tech font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            +{item.remainingCount} more
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col px-1">
                        <h4 className={`text-xs font-bold truncate group-hover:text-gold-base transition-colors uppercase tracking-wide leading-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>
                          {translateText(s.title, language)}
                        </h4>
                        <p className={`text-[10px] font-medium truncate mt-0.5 ${isDarkMode ? 'text-white/70' : 'text-black/80'}`}>
                          {ep.episodeNumber}. {translateText(ep.title, language)}
                        </p>
                        <span className={`text-[8px] font-tech mt-0.5 ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>
                          {ep.duration || '45m'} • UP NEXT
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              ) : suggestedQueue.length > 0 ? (
                // If there is no series actively in progress, show suggestions
                suggestedQueue.map((item, idx) => {
                  if (!item) return null;
                  const s = item.series;
                  const ep = item.upcomingEpisode;
                  const thumb = ep.thumbnailUrl || s.backdropUrl || s.posterUrl;

                  return (
                    <motion.div
                      key={`watch-next-suggest-${s.id}-${idx}`}
                      onClick={() => handlePlayUpcomingEpisode(s, ep)}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex flex-col gap-2 shrink-0 w-64 cursor-pointer group select-none opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <div className={`relative aspect-video rounded-xxl overflow-hidden border shadow-md transition-all duration-300 group-hover:border-gold-base/40 ${
                        isDarkMode ? 'border-white/5 bg-[#141212]' : 'border-black/[0.08] bg-white'
                      }`}>
                        <img 
                          src={thumb} 
                          alt={ep.title} 
                          referrerPolicy="no-referrer" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-12 h-12 rounded-full bg-gold-base/95 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                            <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                          </div>
                        </div>

                        {/* Season/Episode Badge */}
                        <div className="absolute top-3 left-3 bg-black/75 border border-white/10 px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider text-gold-base font-bold uppercase backdrop-blur-sm">
                          S{ep.seasonNumber}:E{ep.episodeNumber}
                        </div>

                        {/* Recommendation Badge */}
                        <div className="absolute bottom-3 right-3 bg-white/15 text-white border border-white/10 text-[8px] font-tech font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                          SUGGESTED
                        </div>
                      </div>

                      <div className="flex flex-col px-1">
                        <h4 className={`text-xs font-bold truncate group-hover:text-gold-base transition-colors uppercase tracking-wide leading-tight ${isDarkMode ? 'text-white' : 'text-black'}`}>
                          {translateText(s.title, language)}
                        </h4>
                        <p className={`text-[10px] font-medium truncate mt-0.5 ${isDarkMode ? 'text-white/70' : 'text-black/80'}`}>
                          {translateText("Series Premiere", language)}: {translateText(ep.title, language)}
                        </p>
                        <span className={`text-[8px] font-tech mt-0.5 ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>
                          {item.remainingCount} EPISODES • START WATCHING
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className={`w-full py-10 text-center border border-dashed rounded-[20px] text-[10px] uppercase tracking-widest font-tech ${
                  isDarkMode ? 'bg-white/[0.02] border-white/5 text-white/30' : 'bg-black/[0.02] border-black/10 text-black/45'
                }`}>
                  {translateText("No serials found to queue", language)}
                </div>
              )}
            </div>
          </div>

          {/* 8. Popular TV Series Row */}
          {tvSeries.length > 0 && (
            <MovieRow
              title="Popular TV Series"
              movies={tvSeries}
              onSelect={onSelectMovie}
              onToggleWatch={onToggleWatchlist}
              watchIds={watchlistIds}
              isDarkMode={isDarkMode}
              language={language}
              onGenreClick={setSelectedGenre}
            />
          )}

          {/* 9. Latest Releases Row */}
          {latestReleases.length > 0 && (
            <MovieRow
              title="Latest Releases"
              movies={latestReleases}
              onSelect={onSelectMovie}
              onToggleWatch={onToggleWatchlist}
              watchIds={watchlistIds}
              isDarkMode={isDarkMode}
              language={language}
              onGenreClick={setSelectedGenre}
            />
          )}
        </>
      )}
    </div>
  );
}

// Inner Component for clean rows
interface MovieRowProps {
  key?: string | number;
  title: string;
  subtitle?: string;
  movies: Movie[];
  onSelect: (movie: Movie) => void;
  onToggleWatch: (movie: Movie) => void;
  watchIds: string[];
  syncIcon?: boolean;
  sparkleIcon?: boolean;
  isDarkMode: boolean;
  language?: string;
  showRecentlyAddedBadge?: boolean;
  onGenreClick?: (genre: string) => void;
}

function getRecentlyAddedBadgeText(createdAt?: string): string {
  if (!createdAt) return 'NEW';
  try {
    const createdTime = new Date(createdAt).getTime();
    const currentTime = Date.now();
    const diffMs = currentTime - createdTime;
    
    if (diffMs < 0) {
      return 'NEW';
    }
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  } catch (e) {
    return 'NEW';
  }
}

function MovieRow({ title, subtitle, movies, onSelect, onToggleWatch, watchIds, syncIcon = false, sparkleIcon = false, isDarkMode, language = 'English', showRecentlyAddedBadge = false, onGenreClick }: MovieRowProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Row Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className={`text-md font-serif font-bold tracking-wide uppercase italic flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            {syncIcon && <Clapperboard className="w-4 h-4 text-gold-base shrink-0" />}
            {sparkleIcon && <Sparkles className="w-4 h-4 text-gold-base shrink-0 animate-pulse" />}
            {translateText(title, language)}
          </h3>
          {subtitle && (
            <p className={`text-[8px] uppercase tracking-widest font-tech mt-0.5 leading-relaxed ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>
              {translateText(subtitle, language)}
            </p>
          )}
        </div>
        <button className={`text-[10px] font-tech font-bold tracking-wider flex items-center gap-1 ${
          isDarkMode ? 'text-gold-base hover:text-white' : 'text-gold-dark hover:text-black'
        }`}>
          {translateText("SEE ALL", language)}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontal Scroller list */}
      {!movies || movies.length === 0 ? (
        <div className={`py-6 px-8 text-center border border-dashed rounded-[20px] text-[10px] uppercase tracking-widest font-tech ${
          isDarkMode ? 'bg-white/[0.02] border-white/5 text-white/30' : 'bg-black/[0.02] border-black/10 text-black/45'
        }`}>
          {translateText("No spectacles assigned to this category yet", language)}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
          {(() => {
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
            // Limit to max 16 items for superb mobile performance and reduced memory footprint
            const displayedMovies = (movies || []).filter(Boolean).slice(0, 16);
            return displayedMovies.map((m, idx) => {
              const isWatched = (watchIds || []).includes(m.id);
              const isNew = isNewMovie(m);
              return (
                <motion.div
                  key={`movie-row-${title}-${m.id || idx}-${idx}`}
                  initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
                  animate={isMobile ? { opacity: 1, y: 0 } : undefined}
                  whileInView={isMobile ? undefined : { opacity: 1, y: 0 }}
                  viewport={isMobile ? undefined : { once: true, margin: "-30px" }}
                  whileHover={isMobile ? undefined : { y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={isMobile ? { duration: 0.1 } : {
                    duration: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                    delay: Math.min(idx * 0.02, 0.15)
                  }}
                  className="flex flex-col gap-2 shrink-0 w-36 select-none group"
                >
                  {/* Poster frame */}
                  <div
                    onClick={() => onSelect(m)}
                    className={`relative aspect-[2/3] rounded-[24px] overflow-hidden border cursor-pointer shadow-md group-hover:border-gold-base/30 transition-all duration-300 ${
                      isDarkMode 
                        ? 'border-white/5 bg-black/40 shadow-black/40' 
                        : 'border-black/[0.08] bg-white shadow-black/10'
                    }`}
                  >
                    <img
                      src={m.posterUrl}
                      alt={m.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {showRecentlyAddedBadge ? (
                      <div className="absolute top-3 left-3 bg-amber-500 text-black text-[7px] font-extrabold px-1.5 py-0.5 rounded-sm z-10 shadow-[0_2px_8px_rgba(245,158,11,0.4)] tracking-widest uppercase font-tech flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-black stroke-[3px]" />
                        <span>{getRecentlyAddedBadgeText(m.createdAt)}</span>
                      </div>
                    ) : isNew ? (
                      <div className="absolute top-3 left-3 bg-emerald-500 text-black text-[7px] font-extrabold px-1.5 py-0.5 rounded-sm z-10 shadow-[0_2px_8px_rgba(16,185,129,0.4)] tracking-widest uppercase font-tech">
                        NEW
                      </div>
                    ) : null}

                    {/* Rating Badge Overlay */}
                    <div className={`absolute left-3 bg-black/75 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 shadow z-10 transition-all ${(isNew || showRecentlyAddedBadge) ? 'top-[34px]' : 'top-3'}`}>
                      <Star className="w-2.5 h-2.5 fill-gold-base text-gold-base" />
                      <span className="text-[8px] font-bold text-white">{m.rating}</span>
                    </div>

                    {/* Favorite heart button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatch(m);
                      }}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 z-10"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isWatched ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    </button>

                    {m.isPremium && (
                      <div className="absolute top-3 right-12 bg-gold-base/90 p-1 rounded-full z-10 shadow-lg transition-all duration-300 transform scale-100 opacity-70 group-hover:scale-125 group-hover:opacity-100 group-hover:bg-gold-light">
                        <Crown className="w-2.5 h-2.5 text-black" />
                      </div>
                    )}

                    {/* Visual Glass Info plate on poster bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end pt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button className="gold-gradient-bg text-black font-semibold text-[8px] py-2 rounded-xl flex items-center justify-center gap-1 w-full">
                        <Play className="w-2.5 h-2.5 fill-black stroke-none" />
                        DETAILS
                      </button>
                    </div>
                  </div>

                  {/* Text titles */}
                  <div className="flex flex-col min-w-0 px-1">
                    <h4
                      onClick={() => onSelect(m)}
                      className={`text-xs font-bold truncate cursor-pointer group-hover:text-gold-base uppercase tracking-wide transition-colors ${
                        isDarkMode ? 'text-white' : 'text-black'
                      }`}
                    >
                      {translateText(m.title, language)}
                    </h4>
                    <div className="flex items-center justify-between gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-mono shrink-0 ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>{m.year}</span>
                      
                      {/* Clickable Genre tags on Card! */}
                      {m.genres && Array.isArray(m.genres) && m.genres.length > 0 && (
                        <div className="flex gap-1 overflow-hidden">
                          {m.genres.slice(0, 1).map((g, gIdx) => (
                            <button
                              key={`${m.id}-genre-${g}-${gIdx}`}
                              id={`card-genre-${m.id}-${g}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (typeof onGenreClick === 'function') {
                                  onGenreClick(g);
                                }
                              }}
                              className={`text-[7px] font-mono px-1 rounded transition-all cursor-pointer font-bold select-none truncate max-w-[54px] border ${
                                isDarkMode 
                                  ? 'bg-gold-base/5 text-gold-base border-gold-base/20 hover:bg-gold-base/20 hover:text-white' 
                                  : 'bg-gold-dark/5 text-gold-dark border-gold-dark/20 hover:bg-gold-dark/20 hover:text-black'
                              }`}
                              title={`Click to filter by ${g}`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

// Beautiful Netflix/HBO-style Framer Motion Powered 'Trending Now' Carousel
interface TrendingNowCarouselProps {
  movies: Movie[];
  onSelect: (movie: Movie) => void;
  onToggleWatch: (movie: Movie) => void;
  watchIds: string[];
  autoSliderEnabled?: boolean;
  isDarkMode: boolean;
  language?: string;
}

function TrendingNowCarousel({
  movies,
  onSelect,
  onToggleWatch,
  watchIds,
  autoSliderEnabled = true,
  isDarkMode,
  language = 'English'
}: TrendingNowCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxScroll, setMaxScroll] = useState(0);
  const [currentScrollX, setCurrentScrollX] = useState(0);

  // Auto Slider Effect
  useEffect(() => {
    if (!autoSliderEnabled || maxScroll <= 0) return;

    const interval = setInterval(() => {
      setCurrentScrollX((prev) => {
        const step = 280; // card width + gaps
        let target = prev + step;
        // If it goes past maxScroll, wrap around back to 0 (starts from rank 1 / first item)
        if (target > maxScroll + 10) {
          return 0;
        }
        return target;
      });
    }, 4000); // automatic slide every 4 seconds

    return () => clearInterval(interval);
  }, [autoSliderEnabled, maxScroll]);

  useEffect(() => {
    const calculateBounds = () => {
      if (containerRef.current && trackRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const trackWidth = trackRef.current.scrollWidth;
        setMaxScroll(Math.max(0, trackWidth - containerWidth));
      }
    };

    // Calculate with a brief timeout to let layout settle
    const timer = setTimeout(calculateBounds, 150);
    window.addEventListener('resize', calculateBounds);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateBounds);
    };
  }, [movies]);

  const handleArrowScroll = (direction: 'left' | 'right') => {
    const step = 280; // card width + gaps
    let target = currentScrollX + (direction === 'left' ? -step : step);
    target = Math.max(0, Math.min(target, maxScroll));
    setCurrentScrollX(target);
  };

  return (
    <div className="flex flex-col gap-4 relative w-full group/carousel">
      {/* Title & Scroll Trigger Buttons Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className={`text-md font-serif font-bold tracking-wide uppercase italic flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            <Flame className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
            {translateText("Trending Now", language)}
          </h3>
          <p className={`text-[8px] uppercase tracking-widest font-tech mt-0.5 leading-relaxed ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>
            Highly rated elite recommendations
          </p>
        </div>

        {/* Minimal Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleArrowScroll('left')}
            disabled={currentScrollX <= 0}
            className={`w-8 h-8 rounded-full border disabled:opacity-20 flex items-center justify-center cursor-pointer transition-all active:scale-90 ${
              isDarkMode 
                ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/15 text-white/80' 
                : 'border-black/10 bg-black/[0.02] hover:bg-black/[0.05] hover:border-black/15 text-black/80'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleArrowScroll('right')}
            disabled={currentScrollX >= maxScroll}
            className={`w-8 h-8 rounded-full border disabled:opacity-20 flex items-center justify-center cursor-pointer transition-all active:scale-90 ${
              isDarkMode 
                ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/15 text-white/80' 
                : 'border-black/10 bg-black/[0.02] hover:bg-black/[0.05] hover:border-black/15 text-black/80'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main horizontal track frame */}
      <div
        ref={containerRef}
        className="overflow-hidden relative pb-2 w-full select-none cursor-grab active:cursor-grabbing"
      >
        <motion.div
          ref={trackRef}
          drag="x"
          dragConstraints={{ left: -maxScroll, right: 0 }}
          animate={{ x: -currentScrollX }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          onDrag={() => {
            if (trackRef.current && containerRef.current) {
              const trackRect = trackRef.current.getBoundingClientRect();
              const containerRect = containerRef.current.getBoundingClientRect();
              const dragX = -(trackRect.left - containerRect.left);
              setCurrentScrollX(Math.max(0, Math.min(dragX, maxScroll)));
            }
          }}
          className="flex gap-4 pl-6 pr-6"
          style={{ width: 'max-content' }}
        >
          {movies.map((m, idx) => {
            const isWatched = (watchIds || []).includes(m.id);
            const rank = idx + 1;

            return (
              <motion.div
                key={`trending-${m.id}-${idx}`}
                className="flex items-center shrink-0 relative py-2"
                style={{ width: '250px' }}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 250, damping: 20 }}
              >
                {/* Netflix/Premium Style Giant Rank Indicator in Background */}
                <div className="absolute -left-2 bottom-2 select-none pointer-events-none z-0">
                  <span
                    className={`text-[120px] font-sans font-black italic tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b drop-shadow-md`}
                    style={{ 
                      WebkitTextStroke: isDarkMode ? '2px rgba(234, 179, 8, 0.25)' : '2px rgba(157, 85, 237, 0.35)',
                      backgroundImage: isDarkMode 
                        ? 'linear-gradient(to bottom, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 100%)' 
                        : 'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.01) 100%)'
                    }}
                  >
                    {rank}
                  </span>
                </div>

                {/* Main Card Frame with image */}
                <div className={`relative aspect-[2/3] w-[110px] rounded-[20px] overflow-hidden border cursor-pointer shadow-xl group ml-12 z-10 hover:border-gold-base/30 transition-all duration-300 ${
                  isDarkMode 
                    ? 'border-white/5 bg-black/40 shadow-black/80' 
                    : 'border-black/[0.08] bg-white shadow-black/10'
                }`}>
                  <img
                    src={m.posterUrl}
                    alt={m.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onClick={() => onSelect(m)}
                  />

                  {/* Tiny Premium Indicator Overlay */}
                  {m.isPremium && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-[6px] font-black px-1 py-0.5 rounded-sm z-20 tracking-wider">
                      VIP
                    </div>
                  )}

                  {/* Rating Overlay */}
                  <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md border border-white/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow z-20">
                    <Star className="w-2.5 h-2.5 fill-gold-base text-gold-base" />
                    <span className="text-[7.5px] font-extrabold text-white">{m.rating}</span>
                  </div>

                  {/* Favorite heart icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWatch(m);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 z-20"
                  >
                    <Heart className={`w-3 h-3 ${isWatched ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>

                  {/* Details Quick Play hover pane */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => onSelect(m)}
                      className="w-8 h-8 rounded-full gold-gradient-bg flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                    >
                      <Play className="w-3.5 h-3.5 fill-black stroke-none ml-0.5" />
                    </button>
                  </div>
                </div>

                {/* Right text metadata block for the movie */}
                <div className="flex flex-col justify-center min-w-0 flex-1 pl-4 pr-1 z-10 select-text">
                  <h4
                    onClick={() => onSelect(m)}
                    className={`text-[10px] font-extrabold group-hover:text-gold-base transition-colors truncate uppercase tracking-wider cursor-pointer leading-tight ${
                      isDarkMode ? 'text-white' : 'text-black'
                    }`}
                  >
                    {translateText(m.title, language)}
                  </h4>
                  <span className={`text-[8px] font-mono mt-0.5 ${isDarkMode ? 'text-white/40' : 'text-black/55'}`}>{m.year}</span>
                  
                  {/* Genres / Tags */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className={`text-[7px] border px-1 py-0.5 rounded uppercase tracking-widest ${
                      isDarkMode 
                        ? 'bg-white/5 border-white/10 text-white/50' 
                        : 'bg-black/5 border-black/10 text-black/55'
                    }`}>
                      {String(m.type).toUpperCase()}
                    </span>
                    <span className="text-[7px] text-gold-base font-bold uppercase truncate max-w-[50px]">
                      {m.genres?.[0] || 'CINEMATIC'}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
