import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LiveChannel, UserProfile, ScheduledSegment } from '../types';
import { MOCK_CHANNELS } from '../data/mockData';
import { Radio, Users, Play, Tv, Sparkles, ChevronRight, Volume2, Maximize, AlertCircle, Loader2, Crown, Clock } from 'lucide-react';
import { translateText } from '../lib/translator';
import { getLiveChannelsFromFirestore } from '../lib/firestoreService';

interface LiveTvViewProps {
  onPlayChannel: (channel: LiveChannel) => void;
  currentUser: UserProfile;
  onUpgradePrompt: () => void;
  language?: string;
  premiumLockEnabled?: boolean;
  liveTvPremiumLockEnabled?: boolean;
}

export default function LiveTvView({ onPlayChannel, currentUser, onUpgradePrompt, language = 'English', premiumLockEnabled, liveTvPremiumLockEnabled }: LiveTvViewProps) {
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Sports' | 'Movies' | 'News'>('All');
  const [selectedActiveChannel, setSelectedActiveChannel] = useState<LiveChannel | null>(null);
  const [simulatedTime, setSimulatedTime] = useState('LIVE');
  const [simulatedProgress, setSimulatedProgress] = useState(45);

  useEffect(() => {
    let active = true;
    async function fetchChannels() {
      try {
        const list = await getLiveChannelsFromFirestore();
        if (active) {
          setChannels(list);
          if (list.length > 0) {
            setSelectedActiveChannel(list[0]);
          }
        }
      } catch (err) {
        console.error("Error loading Live TV channels from Firebase:", err);
        if (active) {
          setChannels(MOCK_CHANNELS);
          setSelectedActiveChannel(MOCK_CHANNELS[0]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    fetchChannels();
    return () => {
      active = false;
    };
  }, []);

  // Filter channels
  const currentChannels = channels.length > 0 ? channels : MOCK_CHANNELS;
  const filteredChannels = currentChannels.filter(
    (ch) => selectedCategory === 'All' || ch.category === selectedCategory
  );

  const activeChannel = selectedActiveChannel || currentChannels[0] || MOCK_CHANNELS[0];
  const isChannelPremium = activeChannel 
    ? (liveTvPremiumLockEnabled !== undefined
        ? (liveTvPremiumLockEnabled ? (activeChannel.isPremium ?? (activeChannel.id !== 'ch1')) : false)
        : (activeChannel.isPremium ?? (activeChannel.id !== 'ch1')))
    : false;

  const isActiveChannelActuallyPremium = activeChannel
    ? (activeChannel.isPremium ?? (activeChannel.id !== 'ch1'))
    : false;

  const [selectedStreamUrl, setSelectedStreamUrl] = useState<string | null>(null);
  const [lastAutoTriggeredId, setLastAutoTriggeredId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStreamUrl(null);
    setLastAutoTriggeredId(null);
  }, [activeChannel?.id]);

  function parseTimeToMinutes(timeStr: string): number | null {
    if (!timeStr) return null;
    try {
      const clean = timeStr.trim().toUpperCase();
      // Case 1: 08:30 PM or 8:30 AM
      const pmAmMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
      if (pmAmMatch) {
        let hours = parseInt(pmAmMatch[1], 10);
        const minutes = parseInt(pmAmMatch[2], 10);
        const ampm = pmAmMatch[3];
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
      // Case 2: 20:30 or 08:30
      const militaryMatch = clean.match(/^(\d{1,2}):(\d{2})$/);
      if (militaryMatch) {
        const hours = parseInt(militaryMatch[1], 10);
        const minutes = parseInt(militaryMatch[2], 10);
        return hours * 60 + minutes;
      }
    } catch (e) {
      console.error("Error parsing time string:", timeStr, e);
    }
    return null;
  }

  // Track current system local minutes and update every 5 seconds for real-time schedule checks
  const [currentLocalMinutes, setCurrentLocalMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentLocalMinutes(d.getHours() * 60 + d.getMinutes());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Parse, sort and compute exact end times for upcoming segments
  const rawSegments = activeChannel?.upcomingSegments || [];
  const parsedSegments = rawSegments
    .map((seg) => ({
      ...seg,
      startMins: parseTimeToMinutes(seg.time) || 0
    }))
    .filter((s) => s.startMins > 0)
    .sort((a, b) => a.startMins - b.startMins);

  const segmentsWithEndTimes = parsedSegments.map((seg, idx, arr) => {
    const nextSeg = arr[idx + 1];
    // A segment ends when the next segment starts, or in 60 minutes if it's the last/only segment
    const endMins = nextSeg ? nextSeg.startMins : (seg.startMins + 60);
    return {
      ...seg,
      endMins
    };
  });

  // Filter out any segment that has already ended
  const activeAndFutureSegments = segmentsWithEndTimes.filter(
    (seg) => currentLocalMinutes < seg.endMins
  );

  // Find the currently active segment (if any matches current system time)
  const activeSegment = activeAndFutureSegments.find(
    (seg) => currentLocalMinutes >= seg.startMins && currentLocalMinutes < seg.endMins
  );

  // Future upcoming segments
  const futureSegments = activeAndFutureSegments.filter(
    (seg) => currentLocalMinutes < seg.startMins
  );

  // Automatically reset the manual selection when the active segment changes or ends
  useEffect(() => {
    setSelectedStreamUrl(null);
  }, [activeSegment?.id]);

  const activeStreamUrl = selectedStreamUrl 
    || (activeSegment ? activeSegment.streamUrl : (activeChannel?.streamUrl || ''));

  // Update live stream timeline progress simulated
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedProgress((p) => {
        if (p >= 100) return 0;
        return p + 0.1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getFormattedActiveTime = () => {
    const d = new Date();
    const minutes = d.getMinutes();
    const startMins = minutes >= 30 ? 30 : 0;
    d.setMinutes(startMins);
    d.setSeconds(0);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getFormattedNextTime = () => {
    if (activeChannel?.upcomingTime) {
      return activeChannel.upcomingTime;
    }
    const d = new Date();
    const minutes = d.getMinutes();
    const startMins = minutes >= 30 ? 30 : 0;
    d.setHours(d.getHours() + 2);
    d.setMinutes(startMins);
    d.setSeconds(0);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleChannelSelect = (channel: LiveChannel) => {
    setSelectedActiveChannel(channel);
    setSimulatedProgress(Math.floor(Math.random() * 60) + 15); // randomize stream placement
  };

  const handleLaunchFullPlayer = () => {
    if (!activeChannel) return;
    if (isChannelPremium && !currentUser.isPremium) {
      onUpgradePrompt();
    } else {
      onPlayChannel({
        ...activeChannel,
        streamUrl: activeStreamUrl
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-gold-base animate-spin" />
        <span className="text-xs font-mono tracking-widest text-white/40 uppercase">DECRYPTING CHANNELS...</span>
      </div>
    );
  }

  if (!activeChannel) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-gold-base" />
        <span className="text-xs font-mono tracking-widest text-white/40 uppercase">NO LIVE CHANNELS INSTALLED</span>
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 pt-4 max-w-4xl mx-auto flex flex-col gap-6 w-full min-w-0 overflow-x-hidden">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
        <h2 className="text-xl font-serif font-black tracking-wide italic flex items-center gap-2">
          <Radio className="w-5 h-5 text-gold-base animate-pulse" />
          {translateText("ELITE TV DECODER", language)}
        </h2>
        <span className="text-[8px] text-white/40 uppercase tracking-widest font-tech">{translateText("DECRYPTING GLOBAL PREMIUM CHANNELS", language)}</span>
      </div>

      {/* 1. Live Feed Mini Player Frame Mockup */}
      <div className="relative aspect-video rounded-[24px] overflow-hidden border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)] group bg-luxury-gray-dark">
        {/* Active stream video backdrop mock */}
        {!(isChannelPremium && !currentUser.isPremium) ? (
          <video
            key={`${activeChannel.id}-${activeStreamUrl}`}
            src={activeStreamUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover animate-fade-in"
          />
        ) : (
          <div className="w-full h-full bg-neutral-950 flex flex-col items-center justify-center gap-2">
            <Crown className="w-10 h-10 text-gold-base animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-white/30 uppercase">VIP ACCESS ONLY</span>
          </div>
        )}
        {/* Shaders */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Floating LIVE badge & Viewers count */}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="bg-red-600 text-white text-[9px] font-tech font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow animate-pulse">
            <Radio className="w-3 h-3 text-white" />
            {translateText("LIVE", language)}
          </span>
          <span className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[9px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
            <Users className="w-3 h-3 text-gold-base" />
            {activeChannel.viewerCount} {translateText("Viewers", language)}
          </span>
        </div>

        {/* Restrict overlay if not Premium */}
        {isChannelPremium && !currentUser.isPremium && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-10 h-10 text-gold-base mb-3" />
            <h4 className="text-sm font-serif font-bold text-white tracking-wide">{translateText("ELITE TV LOCKED", language)}</h4>
            <p className="text-[10px] text-white/60 leading-relaxed max-w-xs mt-1.5 mb-4">
              &quot;{translateText(activeChannel.name, language)}&quot; {translateText("is reserved for VIP Inner Circle subscribers.", language)}
            </p>
            <button
              onClick={onUpgradePrompt}
              className="gold-gradient-bg text-black font-semibold text-[10px] py-2 px-5 rounded-full cursor-pointer shadow-md animate-pulse"
            >
              {translateText("UPGRADE ACCOUNT NOW", language)}
            </button>
          </div>
        )}

        {/* Live Channel Info Plate (Bottom HUD of the video viewport) */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono tracking-wider text-gold-base">{activeChannel.category.toUpperCase()}</span>
              {isActiveChannelActuallyPremium && (
                <span className="bg-gold-base text-black text-[7px] px-1 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                  PREMIUM
                </span>
              )}
            </div>
            <h3 className="text-xs font-bold text-white tracking-wide truncate mt-0.5 uppercase">
              {activeChannel.currentProgram}
            </h3>
            <p className="text-[9px] text-white/40 truncate">On: {activeChannel.name}</p>
          </div>

          <button
            onClick={handleLaunchFullPlayer}
            className="p-3 rounded-full gold-gradient-bg text-black shadow-lg cursor-pointer hover:scale-105 transition-all flex items-center justify-center"
          >
            <Play className="w-3.5 h-3.5 fill-black stroke-none" />
          </button>
        </div>

        {/* Live Timeline indicator line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 pointer-events-none">
          <div className="h-full gold-gradient-bg" style={{ width: `${simulatedProgress}%` }} />
        </div>
      </div>

      {/* 2. Category Tab filters */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        {(['All', 'Movies', 'Sports', 'News'] as const).map((cat) => {
          const isSel = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`relative text-[10px] font-tech tracking-wider font-bold py-2 px-4 rounded-full border transition-all cursor-pointer overflow-hidden ${
                isSel ? 'border-gold-base text-gold-base' : 'border-transparent text-white/40 hover:text-white'
              }`}
            >
              {isSel && (
                <motion.div
                  layoutId="activeLiveTvCategoryHighlight"
                  className="absolute inset-0 bg-gold-base/15 z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              <span className="relative z-10">
                {translateText(cat, language).toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Horizontal list of Live channels */}
      <div className="flex flex-col gap-3">
        <span className="text-[9px] font-tech tracking-widest text-white/40 uppercase">{translateText("AVAILABLE LIVE BROADCASTS", language)}</span>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {filteredChannels.map((channel, idx) => {
            const isActive = activeChannel.id === channel.id;
            const isChActuallyPremium = channel.isPremium ?? (channel.id !== 'ch1');
            return (
              <button
                key={`channel-${channel.id}-${idx}`}
                onClick={() => handleChannelSelect(channel)}
                className={`flex items-center gap-3 py-3 px-4 rounded-xxl border shrink-0 transition-all text-left cursor-pointer ${
                  isActive
                    ? 'border-gold-base bg-gold-base/5 shadow-md'
                    : 'border-white/5 bg-white/5 hover:border-white/10'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-white/10 shadow relative">
                  <span className="text-lg">{channel.logo}</span>
                  {isChActuallyPremium && (
                    <div className="absolute -top-1 -right-1 bg-gold-base p-0.5 rounded-full shadow border border-black/50">
                      <Crown className="w-1.5 h-1.5 text-black fill-black animate-pulse" />
                    </div>
                  )}
                </div>
                <div className="pr-1">
                  <span className="text-[11px] font-bold text-white flex items-center gap-1.5 truncate uppercase tracking-wider">
                    {translateText(channel.name, language)}
                    {isChActuallyPremium && (
                      <span className="text-[8px] bg-gold-base text-black font-extrabold px-1.5 py-0.5 rounded font-mono uppercase tracking-tighter shrink-0">
                        PRO
                      </span>
                    )}
                  </span>
                  <span className="text-[9px] text-white/40 block mt-0.5 truncate max-w-[120px]">{translateText(channel.currentProgram, language)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Mini TV Guide Schedule list */}
      <div className="luxury-glass p-5 rounded-xxl border-white/5">
        <h3 className="text-xs font-serif font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Tv className="w-4 h-4 text-gold-base" />
          {translateText("UPCOMING TRANSMISSIONS GUIDE", language)}
        </h3>

        <div className="flex flex-col gap-4">
          {/* Main Feed / Active Segment (Top Item - Non-Clickable & Unchangeable) */}
          <div 
            className="flex gap-4 p-3 rounded-xl border bg-gold-base/10 border-gold-base/30 select-none cursor-default"
          >
            <span className="text-xs font-mono font-bold text-gold-base tracking-widest min-w-[50px]">
              {activeSegment ? activeSegment.time : getFormattedActiveTime()}
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate">
                {activeSegment ? translateText(activeSegment.title, language) : translateText(activeChannel.currentProgram, language)}
              </h4>
              <p className="text-[10px] text-white/40 truncate">
                {activeSegment ? translateText("Currently active scheduled transmission", language) : translateText("Streaming live on", language)} {translateText(activeChannel.name, language)}
              </p>
              {activeSegment && (
                <p className="text-[8px] text-white/30 truncate mt-1 font-mono tracking-tight lowercase">
                  Stream: {activeSegment.streamUrl}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-tech text-gold-base border border-gold-base/20 px-2 py-0.5 rounded uppercase font-bold">
                {translateText("PLAYING NOW", language)}
              </span>
            </div>
          </div>

          {/* Dynamic Upcoming Future Transmissions List */}
          {activeChannel.upcomingSegments && activeChannel.upcomingSegments.length > 0 ? (
            futureSegments.length > 0 ? (
              futureSegments.map((segment, idx) => {
                return (
                  <div 
                    key={`tv-seg-${segment.id || idx}-${idx}`}
                    className="flex gap-4 p-3 rounded-xl border bg-transparent border-white/5 opacity-60 cursor-default"
                  >
                    <span className="text-xs font-mono font-bold text-white/50 tracking-widest min-w-[50px] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-white/30" />
                      {segment.time}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white/60 truncate">{translateText(segment.title, language)}</h4>
                      <p className="text-[10px] text-white/40 truncate">
                        {translateText("Upcoming dynamic schedule", language)}
                      </p>
                      <p className="text-[8px] text-white/30 truncate mt-1 font-mono tracking-tight lowercase">
                        {translateText("Plays automatically when time starts", language)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-tech text-white/40 border border-white/10 px-2 py-0.5 rounded uppercase font-bold">
                        {translateText("SCHEDULED", language)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center text-[10px] font-mono text-white/30 uppercase tracking-wider">
                {translateText("No more upcoming scheduled transmissions for today", language)}
              </div>
            )
          ) : (
            /* Fallback single upcoming program for legacy channels */
            <div 
              className="flex gap-4 p-3 rounded-xl border bg-transparent border-white/5 opacity-60 cursor-default"
            >
              <span className="text-xs font-mono font-bold text-white/50 tracking-widest min-w-[50px]">{getFormattedNextTime()}</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white/60 truncate">{translateText(activeChannel.nextProgram, language)}</h4>
                <p className="text-[10px] text-white/40 truncate">
                  {translateText("Upcoming segment", language)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-tech text-white/30 border border-white/10 px-2 py-0.5 rounded uppercase font-bold">
                  {translateText("NEXT SEGMENT", language)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
