import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Crown, Plus, Trash2, Users, Upload, Search, Film } from 'lucide-react';
import { Movie, CastMember } from '../types';
import { saveLocalFile } from '../lib/indexedDBStorage';
import { getAdminCredentials } from '../lib/firestoreService';

interface MovieFormModalProps {
  key?: string;
  movieToEdit?: Movie | null;
  onClose: () => void;
  onSave: (movie: Movie) => void;
  movieCategories?: string[];
  seriesCategories?: string[];
}

export default function MovieFormModal({
  movieToEdit,
  onClose,
  onSave,
  movieCategories = [],
  seriesCategories = []
}: MovieFormModalProps) {
  const isEditing = !!movieToEdit;

  // Form States
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'movie' | 'series'>('movie');
  const [posterUrl, setPosterUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [rating, setRating] = useState(8.0);
  const [year, setYear] = useState(new Date().getFullYear());
  const [runtime, setRuntime] = useState('2h 10m');
  const [genres, setGenres] = useState('Action, Sci-Fi');
  const [overview, setOverview] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [videoUrl, setVideoUrl] = useState('https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Cinematic');
  
  // Unlimited Dynamic Cast State
  const [cast, setCast] = useState<CastMember[]>([
    { id: 'cast_1', name: 'Timothy Chalamet', character: 'Paul Atreides', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop' }
  ]);

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
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(tmdbQuery)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTmdbResults(data.results || []);
        if ((data.results || []).length === 0) {
          alert("No movies found on TMDB matching your search query.");
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

  const handleSelectTmdbMovie = async (tmdbId: number) => {
    setIsSearchingTmdb(true);
    try {
      const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbApiKey}&append_to_response=credits,videos`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        
        // Populate fields
        setTitle(data.title || '');
        setOverview(data.overview || '');
        setRating(data.vote_average ? Number(data.vote_average.toFixed(1)) : 8.0);
        
        if (data.release_date) {
          const rYear = new Date(data.release_date).getFullYear();
          if (!isNaN(rYear)) setYear(rYear);
        }
        
        if (data.runtime) {
          const hrs = Math.floor(data.runtime / 60);
          const mins = data.runtime % 60;
          setRuntime(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
        }
        
        if (data.genres && data.genres.length > 0) {
          setGenres(data.genres.map((g: any) => g.name).join(', '));
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
        
        // Map YouTube trailer
        if (data.videos && data.videos.results) {
          const trailer = data.videos.results.find((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
          if (trailer) {
            setTrailerUrl(`https://www.youtube.com/watch?v=${trailer.key}`);
          }
        }
        
        setTmdbResults([]);
        setTmdbQuery('');
        alert(`Successfully imported metadata and cast list for "${data.title}" from TMDB!`);
      } else {
        alert("Failed to retrieve details from TMDB.");
      }
    } catch (err) {
      console.error(err);
      alert("Error fetching movie details from TMDB.");
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  useEffect(() => {
    if (movieToEdit) {
      setTitle(movieToEdit.title || '');
      setType(movieToEdit.type || 'movie');
      setPosterUrl(movieToEdit.posterUrl || '');
      setBackdropUrl(movieToEdit.backdropUrl || '');
      setRating(movieToEdit.rating ?? 8.0);
      setYear(movieToEdit.year ?? new Date().getFullYear());
      setRuntime(movieToEdit.runtime || '2h 10m');
      setGenres((movieToEdit.genres || []).join(', '));
      setSelectedCategory(movieToEdit.genres?.[0] || 'Cinematic');
      setOverview(movieToEdit.overview || '');
      setIsPremium(!!movieToEdit.isPremium);
      setVideoUrl(movieToEdit.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4');
      setTrailerUrl(movieToEdit.trailerUrl || '');
      
      if (movieToEdit.cast && movieToEdit.cast.length > 0) {
        setCast(movieToEdit.cast);
      } else {
        setCast([]);
      }
    }
  }, [movieToEdit]);

  // Cast CRUD operations
  const addCastMember = () => {
    const newMember: CastMember = {
      id: `cast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: '',
      character: 'Lead Role',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalPoster = posterUrl.trim() || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop';
    const finalBackdrop = backdropUrl.trim() || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop';

    // Filter out cast members without a name
    const cleanedCast = cast
      .map(c => ({
        ...c,
        name: c.name.trim(),
        character: c.character.trim() || 'Actor',
        avatarUrl: c.avatarUrl.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'
      }))
      .filter(c => c.name.length > 0);

    const genresArray = genres.split(',').map((g) => g.trim()).filter(Boolean);
    if (selectedCategory && !genresArray.includes(selectedCategory)) {
      genresArray.unshift(selectedCategory);
    }

    const updatedMovie: Movie = {
      id: isEditing && movieToEdit ? movieToEdit.id : `movie_${Date.now()}`,
      title: title.trim(),
      type,
      posterUrl: finalPoster,
      backdropUrl: finalBackdrop,
      rating: Number(rating),
      year: Number(year),
      runtime: runtime.trim(),
      genres: genresArray,
      overview: overview.trim(),
      isPremium,
      videoUrl: videoUrl.trim(),
      trailerUrl: trailerUrl.trim() || undefined,
      cast: cleanedCast,
      reviews: isEditing && movieToEdit ? movieToEdit.reviews : []
    };

    onSave(updatedMovie);
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-start justify-center p-4 z-[100] overflow-y-auto py-8 sm:py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="luxury-glass max-w-2xl w-full rounded-3xl border border-white/10 p-6 shadow-2xl relative bg-luxury-gray-dark/95 flex flex-col gap-5 h-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex flex-col">
            <h3 className="text-md font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase">
              {isEditing ? 'EDIT CINEMATIC SPECIFICATION' : 'ADD NEW CINEMATIC EXCLUSIVE'}
            </h3>
            <p className="text-[9px] font-tech text-white/50 tracking-widest uppercase">
              {isEditing ? 'UPDATE MOVIE SPECIFICATIONS' : 'REGISTER EXCLUSIVE MASTER'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white cursor-pointer hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TMDB Search Integration Panel */}
        {!isEditing && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-tech text-gold-base uppercase tracking-widest flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 animate-pulse" />
                TMDB Auto-Fill Search Engine
              </span>
              <span className={`text-[8px] font-tech uppercase ${tmdbApiKey ? 'text-emerald-400' : 'text-red-400'}`}>
                {tmdbApiKey ? 'Connected' : 'Offline / API Key Required'}
              </span>
            </div>

            <form onSubmit={handleSearchTmdb} className="flex gap-2">
              <input
                type="text"
                placeholder="Search movie title on TMDB to auto-fill metadata..."
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
                          alt={m.title}
                          className="w-8 h-11 object-cover rounded-md shrink-0 border border-white/5"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-11 bg-white/5 rounded-md flex items-center justify-center shrink-0 border border-white/5">
                          <Film className="w-4 h-4 text-white/20" />
                        </div>
                      )}
                      <div className="flex flex-col min-w-0 text-left">
                        <span className="text-xs font-bold text-white truncate">{m.title}</span>
                        <span className="text-[9px] font-mono text-white/40">{m.release_date ? m.release_date.substring(0, 4) : 'N/A'} • Rating: {m.vote_average ? m.vote_average.toFixed(1) : '0.0'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectTmdbMovie(m.id)}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Title */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'movie' ? "e.g. Dune: Part Two" : "e.g. Breaking Bad"}
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
              />
            </div>

            {/* Category Select Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Category</label>
              <select
                required
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer h-[38px]"
              >
                {movieCategories
                  .filter(c => c && c.toLowerCase() !== 'all')
                  .map((cat, idx) => (
                    <option key={`modal-select-cat-${cat}-${idx}`} value={cat} className="bg-neutral-900 text-white">
                      {cat}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* General Genre Tag */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">General Genres (comma separated)</label>
              <input
                type="text"
                required
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                placeholder="Action, Sci-Fi, Adventure"
                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(type === 'movie' ? movieCategories : seriesCategories)
                  .filter(c => c && c.toLowerCase() !== 'all')
                  .map((cat, idx) => {
                    const parsedGenres = genres.split(',').map(g => g.trim().toLowerCase());
                    const isSelected = parsedGenres.includes(cat.toLowerCase());
                    return (
                      <button
                        type="button"
                        key={`modal-pill-${cat}-${idx}`}
                        onClick={() => {
                          const currentList = genres.split(',').map(g => g.trim()).filter(Boolean);
                          const lowerList = currentList.map(g => g.toLowerCase());
                          if (isSelected) {
                            // Remove
                            const updatedList = currentList.filter(g => g.toLowerCase() !== cat.toLowerCase());
                            setGenres(updatedList.join(', '));
                          } else {
                            // Add
                            if (!lowerList.includes(cat.toLowerCase())) {
                              setGenres([...currentList, cat].join(', '));
                            }
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[9px] font-tech uppercase tracking-wider border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gold-base/20 border-gold-base/40 text-gold-base'
                            : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Year */}
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

            {/* Running (Runtime) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Running Time / Seasons</label>
              <input
                type="text"
                required
                value={runtime}
                onChange={(e) => setRuntime(e.target.value)}
                placeholder={type === 'movie' ? "e.g. 2h 46m" : "e.g. 5 Seasons"}
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
          </div>

          {/* Poster & Backdrop URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label className="absolute right-2 p-1.5 text-gold-base/70 hover:text-gold-base cursor-pointer hover:bg-white/5 rounded-lg transition-all" title="Upload Local Poster Image">
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
                <label className="absolute right-2 p-1.5 text-gold-base/70 hover:text-gold-base cursor-pointer hover:bg-white/5 rounded-lg transition-all" title="Upload Local Backdrop Image">
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

          {/* Video stream URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Streaming Video Source URL / File</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Direct MP4 URL or stream file"
                  className="bg-black/40 border border-white/10 rounded-xl p-2.5 pr-12 text-xs text-white focus:outline-none focus:border-gold-base font-mono w-full"
                />
                <label className="absolute right-2 p-1.5 text-gold-base/70 hover:text-gold-base cursor-pointer hover:bg-white/5 rounded-lg transition-all" title="Upload Local Video File">
                  <Upload className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        saveLocalFile(file).then(setVideoUrl);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Trailer Video Source URL / File (Optional)</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={trailerUrl}
                  onChange={(e) => setTrailerUrl(e.target.value)}
                  placeholder="Direct MP4 URL or stream file for trailer"
                  className="bg-black/40 border border-white/10 rounded-xl p-2.5 pr-12 text-xs text-white focus:outline-none focus:border-gold-base font-mono w-full"
                />
                <label className="absolute right-2 p-1.5 text-gold-base/70 hover:text-gold-base cursor-pointer hover:bg-white/5 rounded-lg transition-all" title="Upload Local Trailer File">
                  <Upload className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        saveLocalFile(file).then(setTrailerUrl);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Story / Overview */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">Story Synopsis / Overview</label>
            <textarea
              required
              rows={3}
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              placeholder="Enter story outline here..."
              className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
            />
          </div>

          {/* UNLIMITED CAST SECTION - Dynamic fields */}
          <div className="flex flex-col gap-3.5 border-t border-white/10 pt-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gold-base" />
                <h4 className="text-xs font-serif font-black tracking-wide text-white uppercase">TOP CINEMATIC CAST MEMBERS</h4>
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
                <p className="text-[10px] text-white/30 italic">No cast members added. Click button to register cast.</p>
              ) : (
                cast.map((member, index) => (
                  <div key={`cast-member-${member.id}-${index}`} className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center bg-black/40 p-3 rounded-xl border border-white/5 relative group">
                    <span className="text-[9px] font-mono text-white/30 self-center hidden sm:inline">{index + 1}.</span>
                    
                    {/* Cast Name */}
                    <div className="flex-1 w-full flex flex-col gap-1">
                      <input
                        type="text"
                        placeholder="Actor's Full Name"
                        required
                        value={member.name}
                        onChange={(e) => updateCastMember(member.id, 'name', e.target.value)}
                        className="bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold-base w-full"
                      />
                    </div>

                    {/* Role / Character Name */}
                    <div className="flex-1 w-full flex flex-col gap-1">
                      <input
                        type="text"
                        placeholder="Character Name"
                        required
                        value={member.character}
                        onChange={(e) => updateCastMember(member.id, 'character', e.target.value)}
                        className="bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold-base w-full"
                      />
                    </div>

                    {/* Cast Image/Avatar URL */}
                    <div className="flex-1 w-full flex flex-col gap-1">
                      <input
                        type="text"
                        placeholder="Avatar Image URL (optional)"
                        value={member.avatarUrl}
                        onChange={(e) => updateCastMember(member.id, 'avatarUrl', e.target.value)}
                        className="bg-black/60 border border-white/10 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-gold-base w-full font-mono"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCastMember(member.id)}
                      className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg shrink-0 transition-all cursor-pointer"
                      title="Remove Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Premium / VIP Exclusivity */}
          <div className="flex items-center justify-between py-2 border-t border-white/5 mt-2 flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black accent-gold-base cursor-pointer"
              />
              <Crown className="w-3.5 h-3.5 text-gold-base" />
              Mark as Elite VIP exclusive stream
            </label>

            <button
              type="submit"
              className="gold-gradient-bg text-black font-extrabold text-[10px] tracking-widest font-tech py-3.5 px-6 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              {isEditing ? 'COMMIT SPECIFICATIONS' : 'PERSIST TO FIRESTORE'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
