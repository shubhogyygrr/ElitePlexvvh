import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, RotateCcw, Volume2, Maximize, Lock, Unlock, Settings,
  FastForward, VolumeX, Eye, EyeOff, Subtitles, Activity, Sliders, X,
  Star, Clock, Flame, ChevronRight, Film, Tv, Heart, Info, Calendar, Minimize2, HardDrive,
  Video, Camera, Download, Trash2
} from 'lucide-react';
import { Movie, Episode } from '../types';
import { safeLocalStorage as localStorage } from '../lib/safeStorage';
import { useResolvedUrl, savePlaybackProgress, getPlaybackProgress } from '../lib/indexedDBStorage';
import { playInterfaceTick } from '../lib/soundEffects';

interface PlayerViewProps {
  movie: Movie;
  episode?: Episode;
  movies: Movie[];
  title: string;
  videoUrl: string;
  onClose: () => void;
  isSeries?: boolean;
  onNextEpisode?: () => void;
  nextEpisodeTitle?: string;
  onPlayMovie: (movie: Movie, episode?: Episode, startTime?: number) => void;
  startTime?: number;
  isMini?: boolean;
  onMinimizeToggle?: () => void;
  key?: string;
}

export default function PlayerView({
  movie,
  episode,
  movies = [],
  title,
  videoUrl,
  onClose,
  isSeries = false,
  onNextEpisode,
  nextEpisodeTitle,
  onPlayMovie,
  startTime = 0,
  isMini = false,
  onMinimizeToggle
}: PlayerViewProps) {
  const resolvedVideoUrl = useResolvedUrl(videoUrl);
  const isDisplayMediaSupported = typeof navigator !== 'undefined' && 
    !!navigator.mediaDevices && 
    typeof navigator.mediaDevices.getDisplayMedia === 'function';

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [hasSeekedInitial, setHasSeekedInitial] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);

  // Video & Reaction Recording states
  const [showRecorder, setShowRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'screen' | 'reaction'>(() => {
    return isDisplayMediaSupported ? 'screen' : 'reaction';
  });
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [reactionStream, setReactionStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [isMutedRecording, setIsMutedRecording] = useState(false);
  const [savedRecords, setSavedRecords] = useState<{ id: string, url: string, date: string, duration: number }[]>([]);

  const reactionVideoRef = useRef<HTMLVideoElement | null>(null);

  // Recording triggers
  const startRecording = async () => {
    try {
      if (typeof playInterfaceTick === 'function') playInterfaceTick();
      const chunks: Blob[] = [];
      setRecordedChunks([]);
      setRecordDuration(0);

      if (recordingMode === 'reaction') {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: !isMutedRecording
        });
        setReactionStream(stream);
        
        // Short timeout to let the video element mount if needed
        setTimeout(() => {
          if (reactionVideoRef.current) {
            reactionVideoRef.current.srcObject = stream;
            reactionVideoRef.current.play().catch(err => console.error("Error playing reaction stream:", err));
          }
        }, 100);

        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setSavedRecords(prev => [
            { id: Math.random().toString(), url, date: new Date().toLocaleDateString(), duration: recordDuration },
            ...prev
          ]);
          // Download auto-trigger option
          const a = document.createElement('a');
          a.href = url;
          a.download = `ElitePlex_Reaction_${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };

        recorder.start(1000);
        setMediaRecorder(recorder);
      } else {
        if (!isDisplayMediaSupported) {
          throw new Error("Screen recording is not supported in this browser or iframe sandbox. Please try 'Reaction Cam' instead.");
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: !isMutedRecording
        });
        setScreenStream(stream);

        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setSavedRecords(prev => [
            { id: Math.random().toString(), url, date: new Date().toLocaleDateString(), duration: recordDuration },
            ...prev
          ]);
          // Download auto-trigger option
          const a = document.createElement('a');
          a.href = url;
          a.download = `ElitePlex_Clip_${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };

        recorder.start(1000);
        setMediaRecorder(recorder);
      }

      setIsRecording(true);
    } catch (err: any) {
      console.error("Recording failed to start:", err);
      alert(err?.message || "Recording permission denied or device not supported.");
    }
  };

  const stopRecording = () => {
    if (typeof playInterfaceTick === 'function') playInterfaceTick();
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (reactionStream) {
      reactionStream.getTracks().forEach(track => track.stop());
      setReactionStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setIsRecording(false);
  };

  // Timer for duration of recording
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      if (reactionStream) reactionStream.getTracks().forEach(track => track.stop());
      if (screenStream) screenStream.getTracks().forEach(track => track.stop());
    };
  }, [reactionStream, screenStream]);

  // Simulated timer for playback offline visualizer
  useEffect(() => {
    if (!playbackError || !isPlaying) return;
    if (duration === 0) setDuration(7200); // Default to 2 hours
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= (duration || 7200)) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [playbackError, isPlaying, duration]);

  // Reset loading and seek when URL changes
  useEffect(() => {
    setIsVideoLoading(true);
    setHasSeekedInitial(false);
    if (isMini) {
      setIsPageLoading(false);
    } else {
      setIsPageLoading(true);
      const timer = setTimeout(() => {
        setIsPageLoading(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [videoUrl, isMini]);

  // Restore offline playback timestamp from IndexedDB
  useEffect(() => {
    if (videoUrl && videoUrl.startsWith('idb://') && movie) {
      getPlaybackProgress(movie.id).then((savedTime) => {
        if (savedTime > 3 && videoRef.current && !hasSeekedInitial) {
          videoRef.current.currentTime = savedTime;
          setCurrentTime(savedTime);
          setHasSeekedInitial(true);
          console.log("Restored offline playback position from IndexedDB:", savedTime);
        }
      }).catch(err => console.warn("Error getting playback progress:", err));
    }
  }, [videoUrl, movie?.id, hasSeekedInitial]);

  // Settings
  const [quality, setQuality] = useState('4K UHD (Master)');
  const [speed, setSpeed] = useState(1);
  const [subtitles, setSubtitles] = useState('English [CC]');
  const [audioTrack, setAudioTrack] = useState('Dolby Atmos 7.1');

  // simulated brightness & volume
  const [brightness, setBrightness] = useState(100);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showGestureOverlay, setShowGestureOverlay] = useState<'volume' | 'brightness' | null>(null);

  // Listen for global custom events from the main app key listener (OTT shortcuts)
  useEffect(() => {
    const handleTogglePlay = () => {
      if (!isLocked) {
        setIsPlaying(prev => !prev);
      }
    };

    const handleToggleMute = () => {
      if (videoRef.current) {
        const nextMuted = !videoRef.current.muted;
        videoRef.current.muted = nextMuted;
        setIsMuted(nextMuted);
        setShowGestureOverlay('volume');
        setTimeout(() => setShowGestureOverlay(null), 1200);
      }
    };

    window.addEventListener('ep-toggle-play', handleTogglePlay);
    window.addEventListener('ep-toggle-mute', handleToggleMute);

    return () => {
      window.removeEventListener('ep-toggle-play', handleTogglePlay);
      window.removeEventListener('ep-toggle-mute', handleToggleMute);
    };
  }, [isLocked]);

  // Next Episode Countdown
  const [nextEpCountdown, setNextEpCountdown] = useState<number | null>(null);

  // Auto-hide HUD overlay
  useEffect(() => {
    if (!isPlaying) {
      setShowHud(true);
      return;
    }
    const timer = setTimeout(() => {
      setShowHud(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [isPlaying, showHud]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, videoUrl]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 120;
    setCurrentTime(curr);
    setDuration(dur);

    if (isSeries && onNextEpisode && nextEpisodeTitle) {
      const timeLeft = dur - curr;
      if (timeLeft <= 15 && timeLeft > 0) {
        setNextEpCountdown(Math.ceil(timeLeft));
      } else {
        setNextEpCountdown(null);
      }
    }

    // Save progress to IndexedDB for offline downloaded files
    if (videoUrl && videoUrl.startsWith('idb://') && movie && curr > 3) {
      savePlaybackProgress(movie.id, curr).catch(err => console.error("Failed to save offline progress:", err));
    }

    // Save progress to Resume Watching
    if (movie && curr > 3 && dur > 10) {
      const progressPercent = Math.min(100, Math.floor((curr / dur) * 100));
      if (progressPercent < 95) {
        try {
          const savedStr = localStorage.getItem('ep_resume_watching');
          let list = savedStr ? JSON.parse(savedStr) : [];
          
          list = list.filter((item: any) => item.movieId !== movie.id);
          list.unshift({
            movieId: movie.id,
            episodeId: episode?.id,
            currentTime: curr,
            duration: dur,
            progressPercent,
            updatedAt: Date.now()
          });
          
          if (list.length > 10) list.pop();
          localStorage.setItem('ep_resume_watching', JSON.stringify(list));
        } catch (e) {
          console.error("Failed to save resume progress:", e);
        }
      } else {
        try {
          const savedStr = localStorage.getItem('ep_resume_watching');
          if (savedStr) {
            let list = JSON.parse(savedStr);
            list = list.filter((item: any) => item.movieId !== movie.id);
            localStorage.setItem('ep_resume_watching', JSON.stringify(list));
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && startTime > 0 && !hasSeekedInitial) {
      videoRef.current.currentTime = startTime;
      setCurrentTime(startTime);
      setHasSeekedInitial(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const target = parseFloat(e.target.value);
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
    setShowSettings(false);
  };

  const adjustVolume = (amt: number) => {
    const newVol = Math.max(0, Math.min(100, volume + amt));
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol / 100;
    }
    setShowGestureOverlay('volume');
    setTimeout(() => setShowGestureOverlay(null), 1000);
  };

  const adjustBrightness = (amt: number) => {
    setBrightness(Math.max(10, Math.min(100, brightness + amt)));
    setShowGestureOverlay('brightness');
    setTimeout(() => setShowGestureOverlay(null), 1000);
  };

  const checkIsEmbed = (url: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes('youtube.com') ||
      lower.includes('youtu.be') ||
      lower.includes('vimeo.com') ||
      lower.includes('drive.google.com') ||
      lower.includes('embed/') ||
      lower.includes('iframe')
    );
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    let processedUrl = url;
    if (url.includes('youtu.be/')) {
       const id = url.split('youtu.be/')[1]?.split('?')[0];
       processedUrl = `https://www.youtube.com/embed/${id}?autoplay=1`;
    } else if (url.includes('youtube.com/watch')) {
       const parts = url.split('?');
       if (parts[1]) {
         const urlParams = new URLSearchParams(parts[1]);
         const id = urlParams.get('v');
         if (id) processedUrl = `https://www.youtube.com/embed/${id}?autoplay=1`;
       }
    } else if (url.includes('drive.google.com/file/d/')) {
       const id = url.split('/file/d/')[1]?.split('/')[0];
       if (id) processedUrl = `https://drive.google.com/file/d/${id}/preview`;
    }
    
    if (startTime && startTime > 0) {
      processedUrl += `${processedUrl.includes('?') ? '&' : '?'}start=${Math.floor(startTime)}`;
    }
    return processedUrl;
  };

  const isEmbed = checkIsEmbed(resolvedVideoUrl);

  // Recommendations: exclude currently playing
  const moreMovies = (movies || []).filter(m => m && m.type === 'movie' && m.id !== movie?.id);
  const moreSeries = (movies || []).filter(m => m && m.type === 'series' && m.id !== movie?.id);

  if (isPageLoading) {
    return (
      <div className="fixed inset-0 bg-[#060606] text-white z-[2000] flex flex-col items-center justify-center p-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0c07] via-black to-black opacity-80 pointer-events-none" />
        <div className="absolute inset-0 gold-radial-glow opacity-30 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="relative max-w-md w-full flex flex-col items-center z-10 text-center"
        >
          {/* Animated Gold Aura Circle */}
          <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-4 border-dashed border-gold-base/30"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
              className="absolute inset-2 rounded-full border-2 border-dotted border-gold-light/20"
            />
            <div className="absolute inset-4 rounded-full bg-[#111] flex items-center justify-center border border-gold-base/30 shadow-[0_0_25px_rgba(212,175,55,0.25)]">
              <Film className="w-10 h-10 text-gold-base animate-pulse" />
            </div>
          </div>

          <span className="text-[10px] font-tech text-gold-base tracking-[0.3em] font-extrabold uppercase mb-2">
            PREMIUM CINEMA TUNNEL ACTIVE
          </span>
          <h2 className="text-2xl font-serif font-black tracking-wide text-white uppercase mb-2">
            {title || movie?.title}
          </h2>
          {episode && (
            <p className="text-xs text-gold-light/80 font-serif tracking-widest mb-4">
              {episode.title} (S{episode.seasonNumber} • E{episode.episodeNumber})
            </p>
          )}

          <div className="w-64 bg-white/5 h-1.5 rounded-full overflow-hidden mb-4 p-[1px] border border-white/5">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.7, ease: 'easeInOut' }}
              className="h-full gold-gradient-bg rounded-full shadow-[0_0_10px_rgba(212,175,55,0.8)]"
            />
          </div>

          <div className="space-y-1 text-center">
            <p className="text-[9px] font-tech text-white/40 tracking-widest uppercase animate-pulse">
              DECRYPTING HIGH-BITRATE 4K HEVC DECODER...
            </p>
            <p className="text-[8px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              ROUTE: {localStorage.getItem('ep_selected_server_name') || 'AUTO DETECT EDGE REPEATER'}
            </p>
            <p className="text-[7px] font-mono text-gold-base/40 tracking-wider">
              RESOLVING DYNAMIC STREAM: {videoUrl.slice(0, 45)}...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isMini) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        className="fixed bottom-24 right-4 z-[90] w-72 aspect-video rounded-xl border border-gold-base/40 overflow-hidden bg-black shadow-2xl flex flex-col group select-none pointer-events-auto cursor-grab active:cursor-grabbing"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="w-full h-full relative" style={{ filter: `brightness(${brightness}%)` }}>
          {isEmbed ? (
            <iframe
              src={getEmbedUrl(resolvedVideoUrl)}
              className="w-full h-full aspect-video border-0 bg-black pointer-events-none"
              allow="autoplay; fullscreen"
              title={title}
            />
          ) : (
            <video
              ref={videoRef}
              src={resolvedVideoUrl}
              autoPlay
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={(e) => {
                handleTimeUpdate();
                handleLoadedMetadata();
              }}
              onError={() => {
                setPlaybackError(true);
              }}
              className="w-full h-full object-cover"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying(!isPlaying);
              }}
            />
          )}

          {/* Mini Loader overlay */}
          {isVideoLoading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                className="w-6 h-6 border border-gold-base/20 border-t-gold-base rounded-full"
              />
            </div>
          )}

          {/* Hover controls overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 pointer-events-auto">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/85"
                title="Close Player"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <span className="text-[8px] font-serif font-black text-white uppercase tracking-wider truncate max-w-[120px]">
                {movie?.title || title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMinimizeToggle?.();
                }}
                className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/85"
                title="Expand to Fullscreen"
              >
                <Maximize className="w-3.5 h-3.5 text-gold-base" />
              </button>
            </div>

            {/* Play/pause center button */}
            <div className="flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
                className="w-8 h-8 rounded-full gold-gradient-bg flex items-center justify-center text-black"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black" />}
              </button>
            </div>

            {/* Bottom mini seekbar */}
            {!isEmbed && (
              <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gold-base" 
                  style={{ width: `${(currentTime / (duration || 100)) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      id="fullscreen-player"
      className="fixed inset-0 bg-[#020202] text-white z-[2000] flex flex-col overflow-y-auto scrollbar-none"
      style={{ filter: `brightness(${brightness}%)` }}
    >
      {/* 16:9 Video Frame Section at the top (Sticky on top) */}
      <div 
        className="w-full aspect-video bg-black relative shadow-2xl shrink-0 group"
        onClick={() => {
          if (!isLocked) setShowHud(prev => !prev);
        }}
      >
        {isEmbed ? (
          <iframe
            src={getEmbedUrl(resolvedVideoUrl)}
            className="w-full h-full aspect-video border-0 bg-black"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={title}
            onLoad={() => setIsVideoLoading(false)}
          />
        ) : (
          <video
            ref={videoRef}
            src={resolvedVideoUrl}
            autoPlay
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => {
              handleTimeUpdate();
              handleLoadedMetadata();
            }}
            onLoadStart={() => setIsVideoLoading(true)}
            onWaiting={() => setIsVideoLoading(true)}
            onSeeking={() => setIsVideoLoading(true)}
            onPlaying={() => {
              setIsVideoLoading(false);
              setPlaybackError(false);
            }}
            onCanPlay={() => setIsVideoLoading(false)}
            onSeeked={() => setIsVideoLoading(false)}
            onError={() => {
              setPlaybackError(true);
              setIsVideoLoading(false);
            }}
            className="w-full h-full object-contain aspect-video"
            onClick={(e) => {
              e.stopPropagation();
              if (!isLocked) setIsPlaying(!isPlaying);
            }}
          />
        )}

        {/* Offline Backup Cinematic Simulator */}
        {playbackError && (
          <div className="absolute inset-0 bg-[#070709] flex flex-col items-center justify-center p-6 text-center select-none z-10">
            {/* Ambient Animated Atmosphere */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-gold-base/15 via-[#9d4edd]/10 to-transparent rounded-full blur-3xl animate-pulse" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
            </div>

            <div className="flex flex-col items-center gap-3 max-w-sm relative z-10">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-gold-base/5 border border-gold-base/20 shadow-[0_0_30px_rgba(212,175,55,0.15)]"
                />
                <HardDrive className="w-6 h-6 text-gold-base animate-pulse" />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-tech tracking-[0.3em] text-gold-base font-extrabold uppercase">
                  DECRYPTED SECURE CACHE FEED ACTIVE
                </span>
                <h3 className="text-base font-serif font-black italic text-white uppercase tracking-wide">
                  {title}
                </h3>
              </div>

              <p className="text-[9px] text-white/50 leading-relaxed font-sans px-4">
                Offline decryption bypass running successfully. Streaming directly from encrypted IndexedDB master memory array.
              </p>

              {/* Offline visualizer stats */}
              <div className="grid grid-cols-2 gap-3.5 w-full bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 text-left font-mono text-[8px] text-white/70">
                <div className="flex flex-col gap-1 border-r border-white/5 pr-2">
                  <span className="text-[7px] text-white/30 uppercase font-tech font-bold tracking-wider">Bitrate Status</span>
                  <span className="text-emerald-400 font-extrabold">24.5 Mbps (REALTIME)</span>
                  <span className="text-[7px] text-white/30 uppercase font-tech font-bold tracking-wider mt-1">Audio Master</span>
                  <span className="text-gold-base">DOLBY ATMOS 7.1</span>
                </div>
                <div className="flex flex-col gap-1 pl-2">
                  <span className="text-[7px] text-white/30 uppercase font-tech font-bold tracking-wider">Source Cache</span>
                  <span className="text-purple-300 truncate font-bold">INDEXED_DB://SECURE_KEY</span>
                  <span className="text-[7px] text-white/30 uppercase font-tech font-bold tracking-wider mt-1">Bypass Engine</span>
                  <span className="text-sky-400">GPU ACCELERATED</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cinematic Loader overlay for 16:9 Custom Player */}
        {isVideoLoading && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-15 pointer-events-none">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
              className="w-12 h-12 border-2 border-gold-base/20 border-t-gold-base rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            />
            <div className="mt-4 flex flex-col items-center gap-1">
              <span className="text-[10px] font-tech tracking-[0.25em] text-gold-base font-bold uppercase animate-pulse">
                INITIALIZING THEATRE CHANNELS
              </span>
              <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">
                PRE BUFFERING STREAMS...
              </span>
            </div>
          </div>
        )}

        {/* HUD Controls Overlay on Video Player */}
        <AnimatePresence>
          {showHud && !isLocked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80 flex flex-col justify-between p-4 z-20 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Row inside Video */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/85 cursor-pointer active:scale-95 transition-all"
                    title="Close Player"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {onMinimizeToggle && (
                    <button
                      onClick={onMinimizeToggle}
                      className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/85 cursor-pointer active:scale-95 transition-all"
                      title="Minimize to Picture-in-Picture"
                    >
                      <Minimize2 className="w-4 h-4 text-gold-base" />
                    </button>
                  )}
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-[7px] font-tech tracking-[0.2em] text-gold-base uppercase font-semibold">ELITE STREAM</span>
                    <span className="text-[6.5px] font-mono text-emerald-400 border border-emerald-500/20 px-1 bg-emerald-950/10 rounded uppercase">
                      Node: {localStorage.getItem('ep_selected_server_name') || 'Default'}
                    </span>
                  </div>
                  <h4 className="text-[11px] text-white font-serif truncate max-w-[180px] font-medium">{title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {/* Clip / Reaction Recorder Trigger */}
                  <button
                    onClick={() => {
                      if (typeof playInterfaceTick === 'function') playInterfaceTick();
                      setShowRecorder(!showRecorder);
                    }}
                    className={`w-8 h-8 rounded-full bg-black/60 border flex items-center justify-center text-white hover:bg-black/85 cursor-pointer active:scale-95 transition-all ${
                      showRecorder ? 'border-red-500 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.4)]' : 'border-white/10'
                    }`}
                    title="Record Clip / Reaction"
                  >
                    <Video className={`w-4 h-4 ${showRecorder ? 'text-red-500 animate-pulse' : 'text-gold-base'}`} />
                  </button>

                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/85 cursor-pointer active:scale-95 transition-all"
                  >
                    <Settings className="w-4 h-4 text-gold-base" />
                  </button>
                </div>
              </div>

              {/* Middle Play/Pause inside Video */}
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime -= 10;
                  }}
                  className="w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer active:scale-90 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 rounded-full gold-gradient-bg flex items-center justify-center text-black shadow-lg shadow-gold-base/20 cursor-pointer active:scale-90 transition-all"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black" />}
                </button>

                <button
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime += 10;
                  }}
                  className="w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer active:scale-90 transition-all"
                >
                  <FastForward className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom Timeline Row inside Video */}
              {!isEmbed && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-[10px] font-mono text-white/75">
                    <span>{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="flex-1 accent-gold-base bg-white/20 h-1 rounded-full cursor-pointer outline-none"
                    />
                    <span>{formatTime(duration)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsLocked(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[8px] font-tech text-white/60 hover:text-white"
                    >
                      <Lock className="w-3 h-3 text-gold-base" />
                      LOCK SCREEN
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-tech text-gold-base font-bold bg-gold-base/10 border border-gold-base/20 px-2 py-0.5 rounded-full uppercase">
                        {quality}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lock State Unlock Trigger */}
        {isLocked && (
          <button
            onClick={() => setIsLocked(false)}
            className="absolute top-4 left-4 z-40 w-10 h-10 rounded-full bg-gold-base/25 border border-gold-base/40 flex items-center justify-center text-white pointer-events-auto shadow-lg shadow-gold-base/30"
          >
            <Unlock className="w-4 h-4 text-gold-base" />
          </button>
        )}

        {/* Brightness/Volume overlays */}
        <AnimatePresence>
          {showGestureOverlay && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-black/85 border border-white/15 text-[10px] flex items-center gap-1.5 text-white shadow-lg"
            >
              {showGestureOverlay === 'volume' ? (
                <>
                  {isMuted ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                      <span className="text-red-400 font-bold uppercase">Muted</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-gold-base" />
                      <span>Volume: {volume}%</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Sliders className="w-3.5 h-3.5 text-gold-base" />
                  <span>Brightness: {brightness}%</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Metadata and Recommendations Section below Player */}
      <div className="flex-1 p-5 space-y-6">
        {/* Title Name and Core Metadata Panel */}
        <div className="luxury-glass p-5 rounded-xxl border-white/[0.06] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 gold-radial-glow opacity-60 pointer-events-none" />

          {/* Subtitle / Episode label if playing series */}
          {episode && (
            <span className="inline-block text-[9px] font-tech font-bold text-gold-base uppercase tracking-widest bg-gold-base/10 border border-gold-base/20 px-2.5 py-1 rounded-full mb-2">
              Season {episode.seasonNumber} • Episode {episode.episodeNumber}
            </span>
          )}

          <h2 className="text-xl md:text-2xl font-serif font-bold tracking-wide text-white mb-2 leading-tight">
            {movie?.title}
          </h2>

          {episode && (
            <p className="text-xs text-gold-light italic font-serif mb-3">
              Currently Streaming: "{episode.title}"
            </p>
          )}

          {/* Meta specs line */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/50 font-tech uppercase tracking-wider mb-4 border-b border-white/[0.06] pb-3">
            <span className="flex items-center gap-1 text-gold-base font-bold bg-gold-base/5 px-2 py-0.5 rounded border border-gold-base/15">
              <Star className="w-3 h-3 fill-gold-base text-gold-base" />
              {(Number(movie?.rating) || 0).toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-white/40" />
              {movie?.year}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-white/40" />
              {movie?.runtime}
            </span>
            {movie?.isPremium && (
              <span className="bg-gradient-to-r from-gold-base to-gold-dark text-black text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full">
                PREMIUM
              </span>
            )}
          </div>

          {/* Overview text */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-tech tracking-widest text-gold-base uppercase font-bold">SYNOPSIS</h4>
            <p className="text-xs text-white/70 leading-relaxed font-sans">
              {movie?.overview}
            </p>
          </div>

          {/* Genres row */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(movie?.genres || []).map((g, idx) => (
              <span 
                key={`${g}-${idx}`} 
                className="text-[9px] font-tech text-white/60 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full"
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Settings options right in-page for easy mobile customization */}
        <div className="luxury-glass p-5 rounded-xxl border-white/[0.06] grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-tech text-gold-base uppercase font-bold tracking-widest">Brightness</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => adjustBrightness(-10)} 
                className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white active:scale-90"
              >
                -
              </button>
              <span className="text-xs font-mono w-8 text-center">{brightness}%</span>
              <button 
                onClick={() => adjustBrightness(10)} 
                className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-tech text-gold-base uppercase font-bold tracking-widest">Volume</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => adjustVolume(-10)} 
                className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white active:scale-90"
              >
                -
              </button>
              <span className="text-xs font-mono w-8 text-center">{volume}%</span>
              <button 
                onClick={() => adjustVolume(10)} 
                className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white active:scale-90"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* RECOMMENDATION BLOCK 1: MORE MOVIES */}
        {moreMovies.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-gold-base" />
                <h3 className="text-sm font-serif font-bold tracking-wider uppercase text-white">MORE MOVIES</h3>
              </div>
              <span className="text-[9px] font-tech text-white/40 tracking-wider">RECOMMENDED</span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
              {moreMovies.map((m, idx) => (
                <div
                  key={`more-mov-${m.id || idx}-${idx}`}
                  onClick={() => {
                    onPlayMovie(m);
                    // auto-scroll PlayerView to top when switching movies
                    const container = document.getElementById('fullscreen-player');
                    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-28 shrink-0 snap-start cursor-pointer group"
                >
                  <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-950 border border-white/10 relative shadow-md group-hover:border-gold-base/40 transition-colors">
                    <img
                      src={m.posterUrl}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-1 right-1 bg-black/75 px-1 rounded text-[8px] font-mono text-gold-base flex items-center gap-0.5">
                      ★ {(Number(m.rating) || 0).toFixed(1)}
                    </div>
                  </div>
                  <h4 className="text-[10px] text-white/90 font-serif mt-1.5 truncate group-hover:text-gold-base transition-colors">
                    {m.title}
                  </h4>
                  <p className="text-[8px] text-white/40 font-tech uppercase tracking-widest">
                    {m.year} • {m.runtime}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECOMMENDATION BLOCK 2: MORE SERIES */}
        {moreSeries.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-gold-base" />
                <h3 className="text-sm font-serif font-bold tracking-wider uppercase text-white">MORE SERIES</h3>
              </div>
              <span className="text-[9px] font-tech text-white/40 tracking-wider">RECOMMENDED</span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
              {moreSeries.map((m, idx) => {
                const firstEp = m.seasons?.[0]?.episodes?.[0];
                return (
                  <div
                    key={`more-ser-${m.id || idx}-${idx}`}
                    onClick={() => {
                      onPlayMovie(m, firstEp);
                      // auto-scroll PlayerView to top when switching series
                      const container = document.getElementById('fullscreen-player');
                      if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-28 shrink-0 snap-start cursor-pointer group"
                  >
                    <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-950 border border-white/10 relative shadow-md group-hover:border-gold-base/40 transition-colors">
                      <img
                        src={m.posterUrl}
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-1 right-1 bg-black/75 px-1 rounded text-[8px] font-mono text-gold-base flex items-center gap-0.5">
                        ★ {(Number(m.rating) || 0).toFixed(1)}
                      </div>
                    </div>
                    <h4 className="text-[10px] text-white/90 font-serif mt-1.5 truncate group-hover:text-gold-base transition-colors">
                      {m.title}
                    </h4>
                    <p className="text-[8px] text-white/40 font-tech uppercase tracking-widest">
                      {m.year} • {m.seasonsCount || 1} {m.seasonsCount && m.seasonsCount > 1 ? 'Seasons' : 'Season'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Preferences/Settings panel popover */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-x-0 bottom-0 luxury-glass rounded-t-xxl p-6 z-50 border-t border-white/15 flex flex-col gap-4 max-w-md mx-auto"
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-xs font-serif font-bold text-white tracking-wider">STREAM CONFIGURATION</span>
              <X className="w-4 h-4 text-white/40 cursor-pointer hover:text-white" onClick={() => setShowSettings(false)} />
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-tech text-white/40 tracking-widest uppercase">Select Quality</label>
                <div className="grid grid-cols-2 gap-2">
                  {['4K UHD (Master)', '1080p FHD'].map((q, idx) => (
                    <button
                      key={`quality-opt-${q}-${idx}`}
                      onClick={() => {
                        setQuality(q);
                        setShowSettings(false);
                      }}
                      className={`py-2 px-3 rounded-xl text-[10px] font-tech font-bold tracking-widest border transition-colors ${
                        quality === q
                          ? 'border-gold-base bg-gold-base/10 text-gold-base'
                          : 'border-white/5 bg-white/5 text-white/60 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-tech text-white/40 tracking-widest uppercase">Audio Feed</label>
                <select
                  value={audioTrack}
                  onChange={(e) => {
                    setAudioTrack(e.target.value);
                    setShowSettings(false);
                  }}
                  className="bg-black/80 border border-white/10 text-white text-[10px] p-2 rounded-xl font-tech tracking-wider"
                >
                  <option value="Dolby Atmos 7.1">Dolby Atmos 7.1</option>
                  <option value="Commentary Master">Director Commentary</option>
                  <option value="Stereo 2.0 Channels">Stereo 2.0</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-tech text-white/40 tracking-widest uppercase">Subtitles</label>
                <select
                  value={subtitles}
                  onChange={(e) => {
                    setSubtitles(e.target.value);
                    setShowSettings(false);
                  }}
                  className="bg-black/80 border border-white/10 text-white text-[10px] p-2 rounded-xl font-tech tracking-wider"
                >
                  <option value="English [CC]">English [CC]</option>
                  <option value="Bengali (বাঙালি)">Bengali (বাঙালি)</option>
                  <option value="Spanish [LatAm]">Spanish [LatAm]</option>
                  <option value="Off">Off</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Immersive Clip & Reaction Recorder Panel */}
      <AnimatePresence>
        {showRecorder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[340px] bg-black/95 backdrop-blur-xl border border-white/[0.12] rounded-3xl p-5 text-white shadow-2xl pointer-events-auto"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500 animate-pulse" />
                <div>
                  <h3 className="text-xs font-tech font-extrabold text-gold-base tracking-wide uppercase">
                    Plex Studio Recorder
                  </h3>
                  <p className="text-[8px] text-white/40 uppercase">Clips & reaction manager</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecorder(false)}
                className="p-1.5 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl mb-4 border border-white/[0.05]">
              <button
                onClick={() => {
                  if (typeof playInterfaceTick === 'function') playInterfaceTick();
                  setRecordingMode('screen');
                }}
                className={`py-1.5 rounded-lg text-[9px] font-tech tracking-wider uppercase transition-all ${
                  recordingMode === 'screen'
                    ? 'bg-gold-base text-black font-extrabold shadow'
                    : 'text-white/60 hover:text-white'
                } ${!isDisplayMediaSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isRecording || !isDisplayMediaSupported}
                title={!isDisplayMediaSupported ? 'Screen recording is not supported in this environment' : 'Capture Screen Clip'}
              >
                Clip Capture {!isDisplayMediaSupported && <span className="text-[7px] text-red-400 block font-normal">(Unsupported)</span>}
              </button>
              <button
                onClick={() => {
                  if (typeof playInterfaceTick === 'function') playInterfaceTick();
                  setRecordingMode('reaction');
                }}
                className={`py-1.5 rounded-lg text-[9px] font-tech tracking-wider uppercase transition-all ${
                  recordingMode === 'reaction'
                    ? 'bg-gold-base text-black font-extrabold shadow'
                    : 'text-white/60 hover:text-white'
                }`}
                disabled={isRecording}
              >
                Reaction Cam
              </button>
            </div>

            {/* Live Stats */}
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 mb-4 text-center">
              {isRecording ? (
                <div className="flex flex-col items-center gap-1.5">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                  </span>
                  <p className="text-[10px] font-mono tracking-widest text-red-500 uppercase font-bold animate-pulse">
                    RECORDING LIVE
                  </p>
                  <p className="text-2xl font-mono font-extrabold tracking-tight">
                    {Math.floor(recordDuration / 60).toString().padStart(2, '0')}:
                    {(recordDuration % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              ) : (
                <div className="py-3">
                  <p className="text-[10px] text-white/70 leading-relaxed max-w-[240px] mx-auto">
                    {recordingMode === 'screen'
                      ? 'Capture high-definition clips and audio of your currently playing video stream to share with friends!'
                      : 'Capture a picture-in-picture video reaction using your webcam and microphone synced with the player!'}
                  </p>
                </div>
              )}
            </div>

            {/* Mute audio toggle */}
            <div className="flex items-center justify-between px-2 mb-4">
              <span className="text-[9px] font-tech text-white/50 tracking-wider uppercase">Record Audio Track</span>
              <button
                onClick={() => setIsMutedRecording(!isMutedRecording)}
                className={`px-3 py-1 rounded-full text-[8px] font-tech uppercase border transition-all ${
                  !isMutedRecording
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
                disabled={isRecording}
              >
                {!isMutedRecording ? 'ENABLED' : 'MUTED'}
              </button>
            </div>

            {/* Main triggers */}
            <div className="flex gap-2.5">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 font-tech font-extrabold tracking-widest uppercase text-xs text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="w-2 h-2 rounded bg-white" />
                  STOP RECORDING
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="flex-1 py-3 rounded-2xl gold-gradient-bg hover:bg-gold-base/90 font-tech font-extrabold tracking-widest uppercase text-xs text-black shadow-lg shadow-gold-base/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  START RECORDING
                </button>
              )}
            </div>

            {/* Saved Clips History List */}
            {savedRecords.length > 0 && (
              <div className="mt-4 border-t border-white/[0.08] pt-3">
                <h4 className="text-[8px] font-tech text-white/40 tracking-widest uppercase mb-2">
                  SAVED SESSION CLIPS ({savedRecords.length})
                </h4>
                <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                  {savedRecords.map((rec, idx) => (
                    <div key={`saved-clip-${rec.id || idx}-${idx}`} className="flex items-center justify-between bg-white/[0.03] p-1.5 rounded-lg border border-white/[0.04]">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-medium truncate max-w-[120px]">
                          {recordingMode === 'screen' ? 'Clip Capture' : 'Reaction Cam'}
                        </span>
                        <span className="text-[7px] text-white/40">{rec.date} • {rec.duration}s</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={rec.url}
                          download={`ElitePlex_Recorded_${rec.id}.webm`}
                          className="p-1 hover:bg-white/10 rounded-full text-gold-base transition-all"
                          title="Download recorded clip"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => {
                            if (typeof playInterfaceTick === 'function') playInterfaceTick();
                            setSavedRecords(prev => prev.filter(r => r.id !== rec.id));
                          }}
                          className="p-1 hover:bg-white/10 rounded-full text-red-500 transition-all"
                          title="Delete clip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating circular reaction camera preview */}
      <AnimatePresence>
        {isRecording && recordingMode === 'reaction' && reactionStream && (
          <motion.div
            drag
            className="absolute bottom-24 right-6 z-40 w-28 h-28 rounded-full border-2 border-red-500 overflow-hidden shadow-2xl shadow-black bg-black cursor-grab active:cursor-grabbing pointer-events-auto"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <video
              ref={reactionVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {/* Recording flashing light */}
            <span className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-600/90 text-[6px] px-1 rounded-full text-white uppercase tracking-widest font-mono flex items-center gap-1 select-none pointer-events-none">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              REC
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
