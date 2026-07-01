import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie, Episode, UserProfile, Review } from '../types';
import { MOCK_EPISODES, INITIAL_MOVIES } from '../data/mockData';
import { getEpisodesFromFirestore, isMediaUnlockedForUser } from '../lib/firestoreService';
import {
  Play, Download, Plus, Check, Star, Heart, Calendar, Clock, Copy,
  ArrowLeft, Share2, Sparkles, MessageSquare, Flame, ShieldAlert, FileVideo,
  ChevronLeft, ChevronRight, X, ChevronDown
} from 'lucide-react';
import { playInterfaceTick, playGoldenSuccessChime } from '../lib/soundEffects';

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`;
  }
  return null;
}

interface MovieDetailViewProps {
  movie: Movie;
  onClose: () => void;
  onPlayMovie: (movie: Movie, episode?: Episode) => void;
  onToggleWatchlist: (movie: Movie) => void;
  isInWatchlist: boolean;
  onDownload: (movie: Movie, episode?: Episode) => void;
  isDownloaded: boolean;
  currentUser: UserProfile;
  onUpgradePrompt: () => void;
  key?: string;
  allMovies?: Movie[];
  onSelectMovie?: (movie: Movie) => void;
  premiumLockEnabled?: boolean;
}

export default function MovieDetailView({
  movie,
  onClose,
  onPlayMovie,
  onToggleWatchlist,
  isInWatchlist,
  onDownload,
  isDownloaded,
  currentUser,
  onUpgradePrompt,
  allMovies = [],
  onSelectMovie,
  premiumLockEnabled
}: MovieDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'episodes' | 'info' | 'reviews'>('episodes');
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isFavorited, setIsFavorited] = useState(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewContent, setNewReviewContent] = useState('');
  const [reviews, setReviews] = useState<Review[]>(movie.reviews || []);
  const [episodes, setEpisodes] = useState<Episode[]>(() => {
    if (movie.seasons && movie.seasons.length > 0) {
      return movie.seasons.flatMap((s) => (s.episodes || []).map(ep => ({
        ...ep,
        seasonNumber: ep.seasonNumber || s.seasonNumber
      })));
    }
    return MOCK_EPISODES[movie.id] || [];
  });
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [shareToastMessage, setShareToastMessage] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTrailerUrl, setActiveTrailerUrl] = useState<string | null>(null);

  const isRestricted = premiumLockEnabled !== undefined
    ? (premiumLockEnabled ? (!currentUser?.isPremium && !currentUser?.isAdmin && !isUnlocked) : false)
    : (movie.isPremium && !currentUser?.isPremium && !isUnlocked);

  const showPremiumBadge = premiumLockEnabled !== undefined
    ? premiumLockEnabled
    : movie.isPremium;

  useEffect(() => {
    if (!currentUser?.id || !movie?.id) {
      setIsUnlocked(false);
      return;
    }
    isMediaUnlockedForUser(currentUser.id, movie.id).then((unlocked) => {
      setIsUnlocked(unlocked);
    }).catch((err) => {
      console.error("Error checking media unlock:", err);
      setIsUnlocked(false);
    });
  }, [currentUser?.id, movie?.id]);

  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  // Pool of movies
  const moviesPool = allMovies && allMovies.length > 0 ? allMovies : INITIAL_MOVIES;
  const recommendedMovies = moviesPool
    .filter((m) => m && m.id !== movie.id)
    .filter((m) => (m.genres || []).some((g) => (movie.genres || []).includes(g)))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 10);

  useEffect(() => {
    // Reset scroll when movie changes
    setScrollX(0);
    
    const calcMaxScroll = () => {
      if (carouselRef.current && trackRef.current) {
        const cWidth = carouselRef.current.offsetWidth;
        const tWidth = trackRef.current.scrollWidth;
        setMaxScroll(Math.max(0, tWidth - cWidth));
      }
    };

    const timer = setTimeout(calcMaxScroll, 150);
    window.addEventListener('resize', calcMaxScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calcMaxScroll);
    };
  }, [movie.id, recommendedMovies.length]);

  const handleScroll = (dir: 'left' | 'right') => {
    const step = 160 + 16; // card width + gap
    let target = scrollX + (dir === 'left' ? -step * 2 : step * 2);
    target = Math.max(0, Math.min(target, maxScroll));
    setScrollX(target);
  };

  useEffect(() => {
    if (!movie || !movie.id) return;
    let active = true;
    
    // Ensure activeTab and season are reset when movie changes
    if (movie.type === 'series') {
      setActiveTab('episodes');
    } else {
      setActiveTab('reviews');
    }
    setSelectedSeason(1);

    let initialEps: Episode[] = [];
    if (movie.seasons && movie.seasons.length > 0) {
      initialEps = movie.seasons.flatMap((s) => (s.episodes || []).map(ep => ({
        ...ep,
        seasonNumber: ep.seasonNumber || s.seasonNumber
      })));
    } else {
      initialEps = MOCK_EPISODES[movie.id] || [];
    }
    setEpisodes(initialEps);
    setReviews(movie.reviews || []);

    getEpisodesFromFirestore(movie.id).then((loaded) => {
      if (active && loaded && loaded.length > 0) {
        setEpisodes(loaded);
      }
    }).catch((err) => {
      console.error("Could not fetch episodes from Firestore:", err);
    });
    return () => {
      active = false;
    };
  }, [movie?.id, movie?.seasons]);

  const normalizedEpisodes = episodes.map(ep => ({
    ...ep,
    seasonNumber: ep.seasonNumber || 1
  }));

  const maxSeason = Math.max(
    movie.seasonsCount || 1,
    normalizedEpisodes.reduce((max, ep) => Math.max(max, ep.seasonNumber || 1), 1)
  );

  const filteredEpisodes = normalizedEpisodes.filter((ep) => ep.seasonNumber === selectedSeason);


  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor || !newReviewContent) return;

    const added = {
      id: `rev_${Date.now()}`,
      author: newReviewAuthor,
      rating: 9,
      content: newReviewContent,
      date: 'Just now'
    };
    setReviews([added, ...reviews]);
    setNewReviewAuthor('');
    setNewReviewContent('');
  };

  const handleShare = () => {
    playInterfaceTick();
    setCopiedLink(false);
    setShowShareModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black z-40 overflow-y-auto pb-24">
      {/* 1. Backdrop Poster Area with Glass controls */}
      <div className="relative w-full h-[320px] md:h-[450px]">
        <img
          src={movie.backdropUrl}
          alt={movie.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        {/* Soft dark vignette on bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />

        {/* Floating Top Header bar */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-black/80"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFavorited(!isFavorited)}
              className="w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white cursor-pointer"
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white cursor-pointer"
            >
              <Share2 className="w-5 h-5 text-gold-base" />
            </button>
          </div>
        </div>

        {/* Poster & Main Title floating details */}
        <div className="absolute bottom-6 left-6 right-6 flex items-end gap-5">
          {/* Left Aligned Poster Thumbnail */}
          <div className="w-24 md:w-36 rounded-xxl overflow-hidden shadow-2xl border border-white/10 shrink-0 select-none">
            <img src={movie.posterUrl} alt={movie.title} referrerPolicy="no-referrer" className="w-full object-cover" />
          </div>

          {/* Core metadata text */}
          <div className="flex-1 min-w-0 pb-1">
            {/* VIP Premium Alert Tag */}
            {showPremiumBadge && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md gold-gradient-bg text-black text-[8px] font-tech font-extrabold tracking-widest uppercase mb-2">
                <Flame className="w-2.5 h-2.5" />
                PREMIUM EXCLUSIVE
              </div>
            )}

            <h1 className="text-xl md:text-3xl font-serif font-bold text-white tracking-wide leading-tight uppercase truncate">
              {movie.title}
            </h1>

            {/* Quick stats badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-white/70">
              <span className="flex items-center gap-1 text-gold-base font-semibold">
                <Star className="w-3.5 h-3.5 fill-gold-base stroke-gold-base" />
                {movie.rating}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Calendar className="w-3 h-3 text-white/50" />
                {movie.year}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3 text-white/50" />
                {movie.runtime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main content sections */}
      <div className="px-6 py-6 max-w-4xl mx-auto flex flex-col gap-8">
        {/* Play and Action Center panel */}
        <div className="flex flex-wrap items-center gap-3">
          {isRestricted ? (
            <button
              onClick={onUpgradePrompt}
              className="flex-1 min-w-[200px] gold-gradient-bg text-black font-semibold text-xs py-4 px-6 rounded-xxl cursor-pointer hover:brightness-110 flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(212,175,55,0.35)]"
            >
              <Sparkles className="w-4 h-4 text-black animate-pulse" />
              UPGRADE FOR PREMIUM ACCESS
            </button>
          ) : movie.type === 'series' ? null : (
            <button
              onClick={() => onPlayMovie(movie, filteredEpisodes[0])}
              className="flex-1 min-w-[200px] gold-gradient-bg text-black font-semibold text-xs py-4 px-6 rounded-xxl cursor-pointer hover:brightness-110 flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(212,175,55,0.35)]"
            >
              <Play className="w-4 h-4 text-black fill-black" />
              WATCH MOVIE NOW
            </button>
          )}

          <button
            onClick={() => onToggleWatchlist(movie)}
            className="p-4 rounded-xxl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer text-white flex items-center justify-center gap-2"
          >
            {isInWatchlist ? <Check className="w-4 h-4 text-gold-base" /> : <Plus className="w-4 h-4" />}
            <span className="text-xs font-semibold tracking-wider">{isInWatchlist ? 'WISHLISTED' : 'ADD TO WISHLIST'}</span>
          </button>

          {movie.type === 'movie' && (
            <button
              onClick={() => onDownload(movie)}
              disabled={isDownloaded}
              className={`p-4 rounded-xxl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer text-white flex items-center justify-center gap-2 ${
                isDownloaded ? 'opacity-50' : ''
              }`}
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wider">
                {isDownloaded ? 'DOWNLOADED' : 'DOWNLOAD'}
              </span>
            </button>
          )}

          {movie.trailerUrl && (
            <button
              onClick={() => {
                playInterfaceTick();
                setActiveTrailerUrl(movie.trailerUrl);
              }}
              className="p-4 rounded-xxl bg-gold-base/10 border border-gold-base/30 hover:bg-gold-base/20 cursor-pointer text-gold-base flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <FileVideo className="w-4 h-4 text-gold-base" />
              <span className="text-xs font-semibold tracking-wider">WATCH TRAILER</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="p-4 rounded-xxl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer text-white flex items-center justify-center gap-2 transition-all active:scale-95"
            title="Share this movie or series deep-link with friends"
          >
            <Share2 className="w-4 h-4 text-gold-base" />
            <span className="text-xs font-semibold tracking-wider">SHARE SPEC</span>
          </button>
        </div>

        {/* Narrative & Genre Tags */}
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/80 leading-relaxed font-light">
            {movie.overview}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {(movie.genres || []).map((genre, idx) => (
              <span
                key={`movie-genre-${genre || idx}-${idx}`}
                className="text-[9px] font-tech text-gold-deep font-semibold tracking-wider border border-gold-base/20 bg-gold-base/5 px-2.5 py-1 rounded-full uppercase"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>

        {/* More Like This Recommended Section with Framer Motion Horizontal Carousel */}
        {recommendedMovies.length > 0 && (
          <div className="flex flex-col gap-4 relative w-full group/mlt">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-xs font-tech tracking-[0.2em] text-white/40 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-base animate-pulse" />
                  More Like This
                </h3>
                <p className="text-[9px] text-gold-base/80 uppercase tracking-widest font-mono mt-0.5 leading-relaxed">
                  Cinematic matches in similar genres
                </p>
              </div>

              {/* Minimal Navigation Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleScroll('left')}
                  disabled={scrollX <= 0}
                  className="w-8 h-8 rounded-full border border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/15 text-white/80 disabled:opacity-20 flex items-center justify-center cursor-pointer transition-all active:scale-90"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleScroll('right')}
                  disabled={scrollX >= maxScroll}
                  className="w-8 h-8 rounded-full border border-white/5 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/15 text-white/80 disabled:opacity-20 flex items-center justify-center cursor-pointer transition-all active:scale-90"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slider track wrapper */}
            <div
              ref={carouselRef}
              className="overflow-hidden relative pb-2 w-full select-none cursor-grab active:cursor-grabbing"
            >
              <motion.div
                ref={trackRef}
                drag="x"
                dragConstraints={{ left: -maxScroll, right: 0 }}
                animate={{ x: -scrollX }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                onDrag={() => {
                  if (trackRef.current && carouselRef.current) {
                    const trackRect = trackRef.current.getBoundingClientRect();
                    const containerRect = carouselRef.current.getBoundingClientRect();
                    const dragVal = -(trackRect.left - containerRect.left);
                    setScrollX(Math.max(0, Math.min(dragVal, maxScroll)));
                  }
                }}
                className="flex gap-4 pr-6"
                style={{ width: 'max-content' }}
              >
                {recommendedMovies.map((m, idx) => (
                  <motion.div
                    key={`mlt-${m.id}-${idx}`}
                    whileHover={{ scale: 1.03, y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    onClick={() => onSelectMovie?.(m)}
                    className="w-[140px] md:w-[160px] flex flex-col gap-2 cursor-pointer group"
                  >
                    {/* Poster thumbnail */}
                    <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/5 shadow-lg group-hover:border-gold-base/30 transition-all duration-300">
                      <img
                        src={m.posterUrl}
                        alt={m.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Rating Overlay badge */}
                      <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md border border-white/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow">
                        <Star className="w-2.5 h-2.5 fill-gold-base text-gold-base" />
                        <span className="text-[8px] font-bold text-white">{m.rating}</span>
                      </div>
                      {m.isPremium && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-black text-[6px] font-black px-1 py-0.5 rounded-sm tracking-wider">
                          VIP
                        </div>
                      )}
                    </div>

                    {/* Meta labels */}
                    <div className="flex flex-col min-w-0 px-1">
                      <h4 className="text-[10px] font-extrabold text-white truncate uppercase tracking-wider group-hover:text-gold-base transition-colors">
                        {m.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[8px] text-white/40 font-mono">{m.year}</span>
                        <span className="text-[8px] text-gold-deep/80 font-bold uppercase truncate">
                          {m.genres?.[0] || 'Cinematic'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        )}

        {/* Roster / Cast Horizontal slider */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-tech tracking-[0.2em] text-white/40 uppercase">Top Cinematic Cast</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {(movie.cast || []).map((actor, idx) => (
              <div key={`movie-cast-${actor.id || idx}-${idx}`} className="flex items-center gap-3 luxury-glass py-2 px-4 rounded-full shrink-0 select-none">
                <img
                  src={actor.avatarUrl}
                  alt={actor.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-white/10"
                />
                <div className="min-w-0 pr-1">
                  <p className="text-[11px] font-bold text-white tracking-wide truncate">{actor.name}</p>
                  <p className="text-[9px] text-gold-deep truncate">{actor.character}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs: Episodes (if Series) vs reviews vs Additional Info */}
        <div className="flex flex-col gap-4">
          <div className="flex border-b border-white/10">
            {movie.type === 'series' && (
              <button
                onClick={() => setActiveTab('episodes')}
                className={`py-3 px-6 text-xs font-tech tracking-widest font-semibold border-b-2 transition-all ${
                  activeTab === 'episodes' ? 'border-gold-base text-gold-base' : 'border-transparent text-white/50'
                }`}
              >
                EPISODES
              </button>
            )}
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-3 px-6 text-xs font-tech tracking-widest font-semibold border-b-2 transition-all ${
                activeTab === 'reviews' ? 'border-gold-base text-gold-base' : 'border-transparent text-white/50'
              }`}
            >
              REVIEWS ({reviews.length})
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'episodes' && movie.type === 'series' && (
              <motion.div
                key="episodes-drawer"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-4"
              >
                {/* Season selection container */}
                {maxSeason >= 1 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xxl">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-tech text-gold-base/60 tracking-widest uppercase">Select Season</label>
                      <span className="text-xs font-serif font-black tracking-wider text-white uppercase">
                        Season {selectedSeason} of {maxSeason}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Dropdown Select */}
                      <div className="relative">
                        <select
                          value={selectedSeason}
                          onChange={(e) => setSelectedSeason(Number(e.target.value))}
                          className="appearance-none bg-[#0a0a0c] border border-white/10 hover:border-gold-base/40 text-[11px] text-white font-tech font-bold pl-4 pr-10 py-2 rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-gold-base transition-all"
                        >
                          {Array.from({ length: maxSeason }).map((_, idx) => (
                            <option key={`season-opt-${idx}`} value={idx + 1} className="bg-luxury-gray-dark text-white">
                              SEASON {idx + 1}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gold-base/70">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Pill style quick-select for small/medium amount of seasons */}
                      <div className="hidden sm:flex gap-1.5 overflow-x-auto scrollbar-none">
                        {Array.from({ length: maxSeason }).map((_, idx) => (
                          <button
                            key={`season-tab-${idx}`}
                            onClick={() => setSelectedSeason(idx + 1)}
                            className={`text-[9px] font-tech font-bold py-1.5 px-3 rounded-full border shrink-0 transition-all cursor-pointer ${
                              selectedSeason === idx + 1
                                ? 'border-gold-base bg-gold-base/15 text-gold-base'
                                : 'border-white/5 text-white/55 hover:text-white bg-white/[0.03]'
                            }`}
                          >
                            S{idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Episodes Cards list */}
                {filteredEpisodes.length === 0 ? (
                  <div className="p-8 text-center luxury-glass rounded-xxl text-xs text-white/40">
                    No episodes added for Season {selectedSeason} yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {(filteredEpisodes || []).map((ep, idx) => (
                      <div
                        key={`episode-${ep.id || idx}-${idx}`}
                        className="luxury-glass p-4 rounded-xxl border-white/5 flex flex-col md:flex-row gap-4 hover:border-gold-base/20 transition-all cursor-pointer group"
                        onClick={() => {
                          if (isRestricted) {
                            onUpgradePrompt();
                          } else {
                            onPlayMovie(movie, ep);
                          }
                        }}
                      >
                        {/* Thumbnail overlay */}
                        <div className="relative w-full md:w-36 aspect-video rounded-xl overflow-hidden shadow shrink-0">
                          <img src={ep.thumbnailUrl} alt={ep.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-6 h-6 text-gold-base fill-gold-base" />
                          </div>
                          <span className="absolute bottom-2 right-2 text-[8px] font-mono tracking-widest bg-black/80 px-2 py-0.5 rounded text-white">
                            {ep.duration}
                          </span>
                        </div>

                        {/* Text summaries */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-gold-base transition-colors">
                              E{ep.episodeNumber} • {ep.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDownload(movie, ep);
                              }}
                              className="text-white/40 hover:text-white p-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-white/60 leading-relaxed line-clamp-2">
                            {ep.overview}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div
                key="reviews-drawer"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6"
              >
                {/* Write custom review card */}
                <form onSubmit={handleAddReview} className="luxury-glass p-5 rounded-xxl border-white/5 flex flex-col gap-3">
                  <h4 className="text-xs font-serif text-white tracking-wider font-semibold">LEAVE YOUR DIRECTORS FEEDBACK</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Your author tag (e.g. NolanFan)"
                      value={newReviewAuthor}
                      onChange={(e) => setNewReviewAuthor(e.target.value)}
                      className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                    />
                  </div>
                  <textarea
                    required
                    placeholder="Provide your cinematic critique..."
                    rows={2}
                    value={newReviewContent}
                    onChange={(e) => setNewReviewContent(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="gold-gradient-bg text-black font-semibold text-[10px] tracking-wider py-2 px-5 rounded-full cursor-pointer shadow-md hover:brightness-110"
                    >
                      SUBMIT FEEDBACK
                    </button>
                  </div>
                </form>

                {/* Review listings */}
                <div className="flex flex-col gap-3">
                  {(reviews || []).map((rev, idx) => (
                    <div key={`review-${rev.id || idx}-${idx}`} className="luxury-glass p-4 rounded-xxl border-white/5 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white tracking-wide">{rev.author}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/40">{rev.date}</span>
                          <span className="flex items-center text-gold-base text-[10px] font-bold bg-gold-base/10 px-2 py-0.5 rounded-full">
                            ★ {rev.rating}/10
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed font-light">
                        {rev.content}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. Floating Copy/Share Toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/95 border border-gold-base/40 px-5 py-3 rounded-full flex items-center gap-2.5 shadow-2xl backdrop-blur-md z-50 select-none pointer-events-none"
          >
            <Share2 className="w-4 h-4 text-gold-base animate-pulse" />
            <span className="text-[10px] font-tech font-extrabold tracking-widest text-white uppercase">
              {shareToastMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Elegant Share Link Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="luxury-glass p-6 sm:p-8 rounded-[32px] border border-gold-base/30 w-full max-w-md flex flex-col gap-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-gold-base animate-pulse" />
                  <h3 className="text-sm font-tech font-extrabold text-white tracking-widest uppercase">SHARE CINEMATIC LINK</h3>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Movie info thumbnail */}
              <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  referrerPolicy="no-referrer"
                  className="w-12 h-16 object-cover rounded-lg border border-white/10"
                />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-serif font-black text-white tracking-wide uppercase line-clamp-1">
                    {movie.title}
                  </span>
                  <span className="text-[10px] text-white/40 mt-1 font-mono uppercase">
                    {movie.type} • {movie.year}
                  </span>
                </div>
              </div>

              {/* Link Input and Copy Button */}
              <div className="flex flex-col gap-2 text-left">
                <label className="text-[9px] font-tech text-white/40 tracking-widest uppercase">DEEP-LINK SPEC URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?movie=${movie.id}`}
                    className="bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-gold-light flex-1 focus:outline-none select-all cursor-text"
                  />
                  <button
                    onClick={async () => {
                      try {
                        const deepLink = `${window.location.origin}/?movie=${movie.id}`;
                        await navigator.clipboard.writeText(deepLink);
                        setCopiedLink(true);
                        playGoldenSuccessChime();
                        setTimeout(() => setCopiedLink(false), 2000);
                      } catch (err) {
                        console.error("Failed to copy:", err);
                      }
                    }}
                    className="bg-gold-base hover:bg-gold-light text-black font-tech font-extrabold text-[10px] tracking-widest px-4 py-2.5 rounded-xl cursor-pointer hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 uppercase shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY LINK</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dismiss Action */}
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-tech font-bold text-[10px] tracking-widest uppercase rounded-full border border-white/10 transition-all cursor-pointer active:scale-95"
              >
                CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Custom Mini-Overlay Trailer Player */}
      <AnimatePresence>
        {activeTrailerUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="luxury-glass max-w-3xl w-full rounded-[28px] border border-gold-base/30 overflow-hidden shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/15 px-6 py-4 bg-black/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold-base animate-pulse" />
                  <span className="text-xs font-tech font-extrabold tracking-widest text-white uppercase">
                    OFFICIAL CINEMATIC TRAILER: {movie.title}
                  </span>
                </div>
                <button
                  onClick={() => {
                    playInterfaceTick();
                    setActiveTrailerUrl(null);
                  }}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Video wrapper */}
              <div className="aspect-video w-full bg-black relative">
                {getYouTubeEmbedUrl(activeTrailerUrl) ? (
                  <iframe
                    src={getYouTubeEmbedUrl(activeTrailerUrl)!}
                    title={`${movie.title} Trailer`}
                    className="w-full h-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={activeTrailerUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* Bottom footer with details */}
              <div className="px-6 py-4 bg-black/50 border-t border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    referrerPolicy="no-referrer"
                    className="w-8 h-11 object-cover rounded border border-white/10 shrink-0"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-serif font-black text-white tracking-wide uppercase leading-tight line-clamp-1">
                      {movie.title}
                    </span>
                    <span className="text-[9px] text-white/40 font-mono uppercase mt-0.5">
                      {movie.type} • {movie.genres?.join(', ')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    playInterfaceTick();
                    setActiveTrailerUrl(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gold-base hover:bg-gold-light text-black font-tech font-extrabold text-[10px] tracking-widest uppercase transition-all cursor-pointer active:scale-95"
                >
                  CLOSE PREVIEW
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
