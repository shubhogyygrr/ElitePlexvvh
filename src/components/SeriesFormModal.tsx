import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Crown, Plus, Trash2, Users, Tv, Film, PlusCircle, Check, ChevronDown, ChevronUp, Upload, Search } from 'lucide-react';
import { Movie, CastMember, Season, Episode } from '../types';
import { saveLocalFile } from '../lib/indexedDBStorage';
import { getAdminCredentials } from '../lib/firestoreService';

interface SeriesFormModalProps {
  key?: string;
  seriesToEdit?: Movie | null;
  seriesCategories: string[];
  onClose: () => void;
  onSave: (series: Movie) => void;
}

export default function SeriesFormModal({
  seriesToEdit,
  seriesCategories,
  onClose,
  onSave
}: SeriesFormModalProps) {
  const isEditing = !!seriesToEdit;

  // Form States
  const [title, setTitle] = useState('');
  const [titleLogoUrl, setTitleLogoUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [rating, setRating] = useState(8.5);
  const [year, setYear] = useState(new Date().getFullYear());
  const [runtime, setRuntime] = useState('1 Season'); // Running status e.g. "Ended" or "Running" or "3 Seasons"
  const [selectedCategory, setSelectedCategory] = useState('');
  const [genresText, setGenresText] = useState('Sci-Fi, Drama'); // general tags
  const [overview, setOverview] = useState('');
  const [isPremium, setIsPremium] = useState(false);

  // Unlimited Dynamic Cast State
  const [cast, setCast] = useState<CastMember[]>([]);

  // Unlimited Dynamic Seasons & Episodes state
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);

  // TMDB Search States
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
  const [tmdbApiKey, setTmdbApiKey] = useState('');

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const data = await getAdminCredentials();
        if (data && data.tmdbApiKey) {
          setTmdbApiKey(data.tmdbApiKey);
        }
      } catch (err) {
        console.error("Failed to load TMDB API Key:", err);
      }
    };
    fetchApiKey();
  }, []);

  const handleSearchTmdb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmdbQuery.trim()) return;
    if (!tmdbApiKey) {
      alert("Please enter and save your TMDB API Key first in Admin Panel -> Settings!");
      return;
    }

    setIsSearchingTmdb(true);
    try {
      const url = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbApiKey}&query=${encodeURIComponent(tmdbQuery)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTmdbResults(data.results || []);
        if ((data.results || []).length === 0) {
          alert("No TV series found on TMDB matching your search query.");
        }
      } else {
        alert("Failed to search TMDB. Please check your API Key and network connection.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while searching TMDB.");
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  const handleSelectTmdbSeries = async (tmdbId: number) => {
    setIsSearchingTmdb(true);
    try {
      const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${tmdbApiKey}&append_to_response=credits,videos`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        
        // Populate fields
        setTitle(data.name || '');
        setOverview(data.overview || '');
        setRating(data.vote_average ? Number(data.vote_average.toFixed(1)) : 8.5);
        
        if (data.first_air_date) {
          const rYear = new Date(data.first_air_date).getFullYear();
          if (!isNaN(rYear)) setYear(rYear);
        }
        
        if (data.number_of_seasons) {
          setRuntime(`${data.number_of_seasons} ${data.number_of_seasons === 1 ? 'Season' : 'Seasons'}`);
        }
        
        if (data.genres && data.genres.length > 0) {
          setGenresText(data.genres.map((g: any) => g.name).join(', '));
        }
        
        if (data.poster_path) {
          setPosterUrl(`https://image.tmdb.org/t/p/w500${data.poster_path}`);
        }
        if (data.backdrop_path) {
          setBackdropUrl(`https://image.tmdb.org/t/p/original${data.backdrop_path}`);
        }
        
        // Map cast members
        if (data.credits && data.credits.cast) {
          const tmdbCast = data.credits.cast.slice(0, 8).map((actor: any) => ({
            id: `cast_tmdb_${actor.id}_${Date.now()}`,
            name: actor.name || '',
            character: actor.character || 'Actor',
            avatarUrl: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'
          }));
          setCast(tmdbCast);
        }

        // Map seasons & episodes
        if (data.seasons && data.seasons.length > 0) {
          const mappedSeasons: Season[] = [];
          
          // Fetch the first few seasons' episodes (up to 3 seasons max to prevent rate-limit / lag)
          const validSeasons = data.seasons.filter((s: any) => s.season_number > 0);
          
          for (let i = 0; i < Math.min(validSeasons.length, 3); i++) {
            const s = validSeasons[i];
            const sNum = s.season_number;
            let episodesList: Episode[] = [];
            
            try {
              const epRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${sNum}?api_key=${tmdbApiKey}`);
              if (epRes.ok) {
                const epData = await epRes.json();
                if (epData.episodes && epData.episodes.length > 0) {
                  episodesList = epData.episodes.map((ep: any) => ({
                    id: `ep_tmdb_${ep.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    title: ep.name || `Episode ${ep.episode_number}`,
                    episodeNumber: ep.episode_number,
                    seasonNumber: sNum,
                    duration: ep.runtime ? `${ep.runtime}m` : '45m',
                    thumbnailUrl: ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop',
                    overview: ep.overview || '',
                    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4'
                  }));
                }
              }
            } catch (err) {
              console.error(`Failed to fetch episodes for Season ${sNum}`, err);
            }
            
            if (episodesList.length === 0) {
              const count = s.episode_count || 5;
              for (let e = 1; e <= count; e++) {
                episodesList.push({
                  id: `ep_placeholder_${sNum}_${e}_${Date.now()}`,
                  title: `Episode ${e}: Discovery`,
                  episodeNumber: e,
                  seasonNumber: sNum,
                  duration: '45m',
                  thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop',
                  overview: '',
                  videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4'
                });
              }
            }
            
            mappedSeasons.push({
              id: `season_tmdb_${s.id || sNum}_${Date.now()}`,
              seasonNumber: sNum,
              title: s.name || `Season ${sNum}`,
              episodes: episodesList
            });
          }
          
          setSeasons(mappedSeasons);
          if (mappedSeasons.length > 0) {
            setExpandedSeasonId(mappedSeasons[0].id);
          }
        }
        
        setTmdbResults([]);
        setTmdbQuery('');
        alert(`Successfully imported metadata, cast, seasons, and episode lists for "${data.name}" from TMDB!`);
      } else {
        alert("Failed to retrieve series details from TMDB.");
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching series details from TMDB.");
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  useEffect(() => {
    // Populate categories default
    const filteredCats = (seriesCategories || []).filter(c => c && c.toLowerCase() !== 'all');
    if (filteredCats.length > 0) {
      setSelectedCategory(filteredCats[0]);
    } else {
      setSelectedCategory("Web Series"); // robust standard fallback
    }
  }, [seriesCategories]);

  useEffect(() => {
    if (seriesToEdit) {
      setTitle(seriesToEdit.title || '');
      setTitleLogoUrl(seriesToEdit.titleLogoUrl || '');
      setPosterUrl(seriesToEdit.posterUrl || '');
      setBackdropUrl(seriesToEdit.backdropUrl || '');
      setRating(seriesToEdit.rating ?? 8.5);
      setYear(seriesToEdit.year ?? new Date().getFullYear());
      setRuntime(seriesToEdit.runtime || '1 Season');
      setOverview(seriesToEdit.overview || '');
      setIsPremium(!!seriesToEdit.isPremium);
      
      // Categorization
      if (seriesToEdit.genres && seriesToEdit.genres.length > 0) {
        setGenresText(seriesToEdit.genres.join(', '));
        // Match first category from existing list
        const match = seriesToEdit.genres.find(g => seriesCategories.includes(g));
        if (match) {
          setSelectedCategory(match);
        }
      }

      if (seriesToEdit.cast && seriesToEdit.cast.length > 0) {
        setCast(seriesToEdit.cast);
      } else {
        setCast([]);
      }

      if (seriesToEdit.seasons && seriesToEdit.seasons.length > 0) {
        setSeasons(seriesToEdit.seasons);
        setExpandedSeasonId(seriesToEdit.seasons[0].id);
      } else {
        setSeasons([]);
      }
    }
  }, [seriesToEdit, seriesCategories]);

  // Cast CRUD operations
  const addCastMember = () => {
    const newMember: CastMember = {
      id: `cast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: '',
      character: 'Lead Cast',
      avatarUrl: ''
    };
    setCast([...cast, newMember]);
  };

  const removeCastMember = (id: string) => {
    setCast(cast.filter((c) => c.id !== id));
  };

  const updateCastMember = (id: string, field: keyof CastMember, value: string) => {
    setCast(cast.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  // Seasons & Episodes Operations
  const addSeason = () => {
    const nextNum = seasons.length + 1;
    const newSeasonId = `season_${Date.now()}_${nextNum}`;
    const newSeason: Season = {
      id: newSeasonId,
      seasonNumber: nextNum,
      title: `Season ${nextNum}`,
      episodes: []
    };
    setSeasons([...seasons, newSeason]);
    setExpandedSeasonId(newSeasonId);
  };

  const removeSeason = (seasonId: string) => {
    setSeasons(seasons.filter((s) => s.id !== seasonId));
    if (expandedSeasonId === seasonId) {
      setExpandedSeasonId(null);
    }
  };

  const addEpisode = (seasonId: string) => {
    setSeasons(
      seasons.map((s) => {
        if (s.id === seasonId) {
          const nextEpNum = s.episodes.length + 1;
          const newEp: Episode = {
            id: `ep_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            title: `Episode ${nextEpNum}: Discovery`,
            episodeNumber: nextEpNum,
            seasonNumber: s.seasonNumber,
            duration: '45m',
            thumbnailUrl: '',
            overview: '',
            videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4'
          };
          return {
            ...s,
            episodes: [...s.episodes, newEp]
          };
        }
        return s;
      })
    );
  };

  const removeEpisode = (seasonId: string, episodeId: string) => {
    setSeasons(
      seasons.map((s) => {
        if (s.id === seasonId) {
          return {
            ...s,
            episodes: s.episodes.filter((e) => e.id !== episodeId)
          };
        }
        return s;
      })
    );
  };

  const updateEpisodeField = (seasonId: string, episodeId: string, field: keyof Episode, value: any) => {
    setSeasons(
      seasons.map((s) => {
        if (s.id === seasonId) {
          return {
            ...s,
            episodes: s.episodes.map((e) => (e.id === episodeId ? { ...e, [field]: value } : e))
          };
        }
        return s;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please provide a Title for the Series.");
      return;
    }

    const finalPoster = posterUrl.trim() || 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500&auto=format&fit=crop';
    const finalBackdrop = backdropUrl.trim() || 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=1200&auto=format&fit=crop';

    // Clean genres list
    const categoryList = genresText.split(',').map(g => g.trim()).filter(Boolean);
    if (selectedCategory && !categoryList.includes(selectedCategory)) {
      categoryList.unshift(selectedCategory);
    }

    // Filter cast members
    const cleanedCast = cast
      .map(c => ({
        ...c,
        name: c.name.trim(),
        character: c.character.trim() || 'Actor',
        avatarUrl: c.avatarUrl.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'
      }))
      .filter(c => c.name.length > 0);

    // Filter empty seasons/episodes
    const cleanedSeasons = seasons.map(s => {
      const episodes = s.episodes.map(ep => ({
        ...ep,
        title: ep.title.trim() || `Episode ${ep.episodeNumber}`,
        duration: ep.duration.trim() || '45m',
        thumbnailUrl: ep.thumbnailUrl.trim() || finalBackdrop,
        overview: ep.overview.trim() || 'No overview provided for this episode.',
        videoUrl: ep.videoUrl.trim() || 'https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4'
      }));
      return {
        ...s,
        episodes
      };
    });

    // Default first video stream URL if episodes exist
    const defaultVideoUrl = cleanedSeasons[0]?.episodes[0]?.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4';

    const updatedSeries: Movie = {
      id: isEditing && seriesToEdit ? seriesToEdit.id : `series_${Date.now()}`,
      title: title.trim(),
      type: 'series',
      posterUrl: finalPoster,
      backdropUrl: finalBackdrop,
      rating: Number(rating),
      year: Number(year),
      runtime: seasons.length > 0 ? `${seasons.length} Season${seasons.length > 1 ? 's' : ''}` : runtime.trim(),
      genres: categoryList,
      overview: overview.trim(),
      isPremium,
      videoUrl: defaultVideoUrl,
      titleLogoUrl: titleLogoUrl.trim() || undefined,
      cast: cleanedCast,
      seasons: cleanedSeasons,
      seasonsCount: cleanedSeasons.length,
      reviews: isEditing && seriesToEdit ? seriesToEdit.reviews : [],
      createdAt: isEditing && seriesToEdit ? seriesToEdit.createdAt : new Date().toISOString()
    };

    onSave(updatedSeries);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-start justify-center p-4 z-[100] overflow-y-auto backdrop-blur-sm py-8 sm:py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.93 }}
        className="luxury-glass max-w-3xl w-full rounded-3xl border border-white/10 p-6 shadow-2xl relative bg-luxury-gray-dark/95 flex flex-col gap-5 h-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex flex-col">
            <h3 className="text-md font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase flex items-center gap-2">
              <Tv className="w-5 h-5 text-gold-base" />
              {isEditing ? 'EDIT EXCLUSIVE SERIES PROTOCOL' : 'REGISTER NEW EPISODIC SAGA'}
            </h3>
            <p className="text-[9px] font-tech text-white/50 tracking-widest uppercase">
              {isEditing ? 'UPDATE MASTER TELEVISION SPECIFICATIONS' : 'ENTER NEW SERIES INTO MEMORY'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white cursor-pointer hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TMDB Series Search Integration Panel */}
        {!isEditing && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-tech text-gold-base uppercase tracking-widest flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 animate-pulse" />
                TMDB TV Series Auto-Fill Search Engine
              </span>
              <span className={`text-[8px] font-tech uppercase ${tmdbApiKey ? 'text-emerald-400' : 'text-red-400'}`}>
                {tmdbApiKey ? 'Connected' : 'Offline / API Key Required'}
              </span>
            </div>

            <form onSubmit={handleSearchTmdb} className="flex gap-2">
              <input
                type="text"
                placeholder="Search TV series title on TMDB to auto-fill metadata, cast, seasons & episodes..."
                value={tmdbQuery}
                onChange={(e) => setTmdbQuery(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 flex-1 text-xs text-white focus:outline-none focus:border-gold-base font-sans"
              />
              <button
                type="submit"
                disabled={isSearchingTmdb}
                className="gold-gradient-bg text-black font-tech font-black text-[9px] tracking-widest px-4 py-2 rounded-xl cursor-pointer hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shrink-0 uppercase"
              >
                {isSearchingTmdb ? 'SEARCHING...' : 'SEARCH'}
              </button>
            </form>

            {/* TMDB Search Results list */}
            {tmdbResults.length > 0 && (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 border-t border-white/5 pt-2 mt-1">
                {tmdbResults.slice(0, 5).map((m: any, idx) => (
                  <div key={`tmdb-result-${m.id || idx}-${idx}`} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all gap-2 text-left">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {m.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                          alt={m.name}
                          className="w-8 h-11 object-cover rounded-md shrink-0 border border-white/5"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-11 bg-white/5 rounded-md flex items-center justify-center shrink-0 border border-white/5">
                          <Tv className="w-4 h-4 text-white/20" />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0 text-left">
                        <span className="text-xs font-bold text-white truncate">{m.name}</span>
                        <span className="text-[9px] font-mono text-white/40">{m.first_air_date ? m.first_air_date.substring(0, 4) : 'N/A'} • Rating: {m.vote_average ? m.vote_average.toFixed(1) : '0.0'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectTmdbSeries(m.id)}
                      className="bg-gold-base/10 border border-gold-base/35 text-gold-base hover:bg-gold-base hover:text-black font-tech font-bold text-[9px] tracking-wider px-3 py-1.5 rounded-lg transition-all shrink-0 uppercase"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Series Page Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Stranger Things"
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
              />
            </div>

            {/* Title Logo URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Title Logo PNG Image URL</label>
              <input
                type="text"
                value={titleLogoUrl}
                onChange={(e) => setTitleLogoUrl(e.target.value)}
                placeholder="e.g. Transparent Logo PNG"
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Release Year */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Release Year</label>
              <input
                type="number"
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
              />
            </div>

            {/* Running status / Seasons text */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Running status description</label>
              <input
                type="text"
                required
                value={runtime}
                onChange={(e) => setRuntime(e.target.value)}
                placeholder="e.g. 1 Season, Ended, Running"
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
              />
            </div>

            {/* Rating Badge */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Rating Badge (1-10)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                required
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
              />
            </div>

            {/* Category Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Category Select</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
              >
                {(() => {
                  const cats = Array.from(new Set((seriesCategories || []).filter(Boolean).map(c => c.trim()))).filter(c => c.toLowerCase() !== 'all');
                  const finalCats = cats.length > 0 ? cats : ["Web Series", "TV Shows", "Serials", "Drama", "Anime"];
                  return finalCats.map((cat, idx) => (
                    <option key={`series-form-cat-${cat}-${idx}`} value={cat} className="bg-black text-white">{cat}</option>
                  ));
                })()}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* General Genres comma-separated */}
            <div className="flex flex-col gap-1.5 sm:col-span-1">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">General genres / tags</label>
              <input
                type="text"
                value={genresText}
                onChange={(e) => setGenresText(e.target.value)}
                placeholder="Sci-Fi, Drama, Mystery"
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
              />
            </div>

            {/* Poster URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Poster Image URL / File</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  placeholder="https://... or upload local file"
                  className="bg-black/40 border border-white/10 rounded-xl p-2.5 pr-12 text-xs text-white focus:outline-none focus:border-gold-base w-full"
                />
                <label className="absolute right-2 p-1.5 text-gold-base/70 hover:text-gold-base cursor-pointer hover:bg-white/5 rounded-lg transition-all" title="Upload Local Poster">
                  <Upload className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        saveLocalFile(file).then(setPosterUrl);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Backdrop URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Backdrop Image URL / File</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={backdropUrl}
                  onChange={(e) => setBackdropUrl(e.target.value)}
                  placeholder="https://... or upload local file"
                  className="bg-black/40 border border-white/10 rounded-xl p-2.5 pr-12 text-xs text-white focus:outline-none focus:border-gold-base w-full"
                />
                <label className="absolute right-2 p-1.5 text-gold-base/70 hover:text-gold-base cursor-pointer hover:bg-white/5 rounded-lg transition-all" title="Upload Local Backdrop">
                  <Upload className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        saveLocalFile(file).then(setBackdropUrl);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Story / Synopsis */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Story Synopsis / Overview</label>
            <textarea
              required
              rows={2}
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              placeholder="Enter television series story outline here..."
              className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
            />
          </div>

          {/* DYNAMIC SEASONS & EPISODES MANAGER (UNLIMITED SEASONS AND EPISODES!) */}
          <div className="flex flex-col gap-3.5 border-t border-white/10 pt-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-gold-base" />
                <h4 className="text-xs font-serif font-black tracking-wide text-white uppercase">SEASONS & EPISODES MANAGER ({seasons.length})</h4>
              </div>
              <button
                type="button"
                onClick={addSeason}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gold-base/30 bg-gold-base/5 text-gold-base hover:bg-gold-base/10 transition-all font-tech text-[9px] font-bold cursor-pointer"
              >
                <PlusCircle className="w-3 h-3" />
                ADD NEW SEASON
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {seasons.length === 0 ? (
                <p className="text-[10px] text-white/30 italic text-center py-4">No seasons added. Click "ADD NEW SEASON" to begin scheduling episodes.</p>
              ) : (
                seasons.map((season, idx) => {
                  const isExpanded = expandedSeasonId === season.id;
                  return (
                    <div key={`season-${season.id || idx}-${idx}`} className="flex flex-col border border-white/5 bg-black/30 rounded-xl overflow-hidden transition-all">
                      {/* Season Accordion Header */}
                      <div
                        onClick={() => setExpandedSeasonId(isExpanded ? null : season.id)}
                        className="flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-serif font-black text-gold-base">SEASON {season.seasonNumber}</span>
                          <span className="text-[9px] font-tech text-white/40">({season.episodes.length} Episodes)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addEpisode(season.id);
                            }}
                            className="text-[8px] font-tech font-extrabold text-black gold-gradient-bg py-1 px-2.5 rounded-lg mr-2 hover:brightness-110"
                          >
                            + EPISODE
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSeason(season.id);
                            }}
                            className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1 rounded-lg"
                            title="Remove Season"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />}
                        </div>
                      </div>

                      {/* Expanded Season Episodes list */}
                      {isExpanded && (
                        <div className="p-3 border-t border-white/5 flex flex-col gap-3.5 bg-black/60">
                          {season.episodes.length === 0 ? (
                            <p className="text-[9px] text-white/30 italic">No episodes added. Click "+ EPISODE" to add an episode.</p>
                          ) : (
                            season.episodes.map((episode, epIdx) => (
                              <div key={`series-form-ep-${episode.id || epIdx}-${epIdx}`} className="flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/5 relative">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-tech text-gold-base font-extrabold uppercase">EPISODE {episode.episodeNumber}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeEpisode(season.id, episode.id)}
                                    className="text-red-400 hover:text-red-500 p-1 rounded-md"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {/* Episode Title */}
                                  <input
                                    type="text"
                                    placeholder="Episode Title"
                                    required
                                    value={episode.title}
                                    onChange={(e) => updateEpisodeField(season.id, episode.id, 'title', e.target.value)}
                                    className="bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white"
                                  />

                                  {/* Episode Duration */}
                                  <input
                                    type="text"
                                    placeholder="Duration e.g. 45m"
                                    required
                                    value={episode.duration}
                                    onChange={(e) => updateEpisodeField(season.id, episode.id, 'duration', e.target.value)}
                                    className="bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white"
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {/* Episode Video/Stream URL */}
                                  <div className="relative flex items-center w-full">
                                    <input
                                      type="text"
                                      placeholder="Streaming Video URL (.mp4)"
                                      required
                                      value={episode.videoUrl}
                                      onChange={(e) => updateEpisodeField(season.id, episode.id, 'videoUrl', e.target.value)}
                                      className="bg-black/50 border border-white/10 rounded-lg p-2 pr-10 text-[10px] text-white font-mono w-full focus:outline-none focus:border-gold-base"
                                    />
                                    <label className="absolute right-2 p-1 text-gold-base/70 hover:text-gold-base cursor-pointer hover:bg-white/5 rounded transition-all" title="Upload Local Episode Video">
                                      <Upload className="w-3 h-3" />
                                      <input
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            saveLocalFile(file).then((localUrl) => {
                                              updateEpisodeField(season.id, episode.id, 'videoUrl', localUrl);
                                            });
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>

                                  {/* Episode Thumbnail URL */}
                                  <div className="relative flex items-center w-full">
                                    <input
                                      type="text"
                                      placeholder="Thumbnail Image URL (optional)"
                                      value={episode.thumbnailUrl}
                                      onChange={(e) => updateEpisodeField(season.id, episode.id, 'thumbnailUrl', e.target.value)}
                                      className="bg-black/50 border border-white/10 rounded-lg p-2 pr-10 text-[10px] text-white font-mono w-full focus:outline-none focus:border-gold-base"
                                    />
                                    <label className="absolute right-2 p-1 text-gold-base/70 hover:text-gold-base cursor-pointer hover:bg-white/5 rounded transition-all" title="Upload Local Episode Thumbnail">
                                      <Upload className="w-3 h-3" />
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            saveLocalFile(file).then((localUrl) => {
                                              updateEpisodeField(season.id, episode.id, 'thumbnailUrl', localUrl);
                                            });
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                </div>

                                {/* Episode Overview */}
                                <textarea
                                  placeholder="Episode Synopsis..."
                                  rows={1}
                                  value={episode.overview}
                                  onChange={(e) => updateEpisodeField(season.id, episode.id, 'overview', e.target.value)}
                                  className="bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none"
                                />
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CAST MEMBERS SECTION */}
          <div className="flex flex-col gap-3.5 border-t border-white/10 pt-4 mt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gold-base" />
                <h4 className="text-xs font-serif font-black tracking-wide text-white uppercase font-serif">TOP SERIES STAR CAST</h4>
              </div>
              <button
                type="button"
                onClick={addCastMember}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gold-base/30 bg-gold-base/5 text-gold-base hover:bg-gold-base/10 transition-all font-tech text-[9px] font-bold cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                ADD CAST MEMBER
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {cast.length === 0 ? (
                <p className="text-[10px] text-white/30 italic text-center py-1">No cast members added. Click to register core cast.</p>
              ) : (
                cast.map((member, index) => (
                  <div key={`cast-member-${member.id}-${index}`} className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center bg-black/40 p-2.5 rounded-xl border border-white/5 relative group">
                    <span className="text-[9px] font-mono text-white/30 self-center hidden sm:inline">{index + 1}.</span>
                    
                    {/* Cast Name */}
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        placeholder="Actor's Name"
                        required
                        value={member.name}
                        onChange={(e) => updateCastMember(member.id, 'name', e.target.value)}
                        className="bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold-base w-full"
                      />
                    </div>

                    {/* Character Name */}
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        placeholder="Character Role"
                        required
                        value={member.character}
                        onChange={(e) => updateCastMember(member.id, 'character', e.target.value)}
                        className="bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold-base w-full"
                      />
                    </div>

                    {/* Image URL */}
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        placeholder="Avatar URL"
                        value={member.avatarUrl}
                        onChange={(e) => updateCastMember(member.id, 'avatarUrl', e.target.value)}
                        className="bg-black/60 border border-white/10 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-gold-base w-full font-mono"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCastMember(member.id)}
                      className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg shrink-0 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Premium & Submit Footer */}
          <div className="flex items-center justify-between py-2 border-t border-white/5 mt-2 flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black accent-gold-base cursor-pointer"
              />
              <Crown className="w-3.5 h-3.5 text-gold-base" />
              Mark as VIP Premium Exclusive
            </label>

            <button
              type="submit"
              className="gold-gradient-bg text-black font-extrabold text-[10px] tracking-widest font-tech py-3.5 px-6 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer animate-pulse"
            >
              {isEditing ? 'UPDATE SERIES DATA' : 'PUBLISH EPISODIC SAGA'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
