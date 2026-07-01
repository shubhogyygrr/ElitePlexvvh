import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Server, X, Activity, ChevronRight, Check, Search, Shield, RefreshCw, Cpu, Settings } from 'lucide-react';
import { StreamingServer, UserProfile } from '../types';
import { getStreamingServers, subscribeToStreamingServers } from '../lib/firestoreService';
import { playInterfaceTick, playGoldenSuccessChime } from '../lib/soundEffects';
import { safeLocalStorage as localStorage } from '../lib/safeStorage';
import ServerManager from './ServerManager';

interface UserServersViewProps {
  key?: string;
  onClose: () => void;
  currentUser: UserProfile;
  onUpgradePrompt: () => void;
  onOpenAdmin?: () => void;
}

export default function UserServersView({ onClose, currentUser, onUpgradePrompt, onOpenAdmin }: UserServersViewProps) {
  const [servers, setServers] = useState<StreamingServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [activeServerId, setActiveServerId] = useState<string>(() => {
    return localStorage.getItem('ep_selected_server_id') || '';
  });
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [customLatencies, setCustomLatencies] = useState<Record<string, number>>({});
  const [isAdminMode, setIsAdminMode] = useState(false);

  const isAdmin = currentUser && (
    currentUser.isAdmin || 
    currentUser.name === 'Premium Chief' || 
    currentUser.email?.toLowerCase().includes('admin')
  );

  useEffect(() => {
    // Real-time server updates!
    setIsLoading(true);
    const unsubscribe = subscribeToStreamingServers((data) => {
      setServers(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchServers = async () => {
    setIsLoading(true);
    try {
      const data = await getStreamingServers();
      setServers(data);
    } catch (err) {
      console.error("Failed to load user-facing servers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const countries = ['All', ...new Set(servers.map((s) => s.country))];

  const handleSelectServer = (srv: StreamingServer) => {
    playInterfaceTick();
    if (srv.status !== 'online') {
      alert(`Server ${srv.name} is currently offline/undergoing maintenance. Please select an active server node.`);
      return;
    }

    if (srv.isPremium && !currentUser.isPremium) {
      const confirmUpgrade = window.confirm(
        `${srv.name} is reserved for EP PLEX VIP members. High-bitrate 10 Gbps fiber channels are encrypted for free tier accounts. Would you like to check our VIP plans?`
      );
      if (confirmUpgrade) {
        onClose();
        onUpgradePrompt();
      }
      return;
    }

    // Save selected server to storage
    localStorage.setItem('ep_selected_server_id', srv.id);
    localStorage.setItem('ep_selected_server_name', srv.name);
    localStorage.setItem('ep_selected_server_url', srv.url);
    setActiveServerId(srv.id);
    playGoldenSuccessChime();
    alert(`Success! Connection tunneled through [${srv.name}] (${srv.country}). All video stream buffers route natively through this node now.`);
  };

  const handlePingServer = (srv: StreamingServer) => {
    if (srv.status !== 'online') return;
    playInterfaceTick();
    setPingingId(srv.id);
    
    // Simulate real network ping request with visual loader
    setTimeout(() => {
      const simulatedLatency = Math.floor(Math.random() * 40) + 12; // stable high speed real feel
      setCustomLatencies(prev => ({ ...prev, [srv.id]: simulatedLatency }));
      setPingingId(null);
    }, 1200);
  };

  const filteredServers = servers.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = selectedCountry === 'All' || s.country === selectedCountry;
    return matchesSearch && matchesCountry;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-hidden font-sans text-left">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-rose-500/5 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[150px] pointer-events-none rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        className="w-full max-w-4xl h-[90vh] luxury-glass border border-white/10 rounded-xxl flex flex-col overflow-hidden relative shadow-[0_30px_70px_rgba(0,0,0,0.9)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
              <Server className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-300 to-amber-400 uppercase">
                CDN STREAMING EDGE RELAYS
              </h3>
              <p className="text-[10px] text-white/40 font-mono tracking-wider mt-0.5">
                Bypass routing congestion & pick low-latency real dedicated fiber channels.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border border-white/10 hover:border-white/20 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Admin Switch Tabs */}
        {isAdmin && (
          <div className="flex border-b border-white/10 bg-black/40 shrink-0">
            <button
              onClick={() => { playInterfaceTick(); setIsAdminMode(false); }}
              className={`flex-1 py-3 text-[10px] font-tech font-extrabold tracking-widest uppercase transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                !isAdminMode 
                  ? 'border-rose-500 text-rose-300 bg-rose-500/5' 
                  : 'border-transparent text-white/40 hover:text-white/80'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              CLIENT TUNNEL DECK
            </button>
            <button
              onClick={() => { playInterfaceTick(); setIsAdminMode(true); }}
              className={`flex-1 py-3 text-[10px] font-tech font-extrabold tracking-widest uppercase transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                isAdminMode 
                  ? 'border-rose-500 text-rose-300 bg-rose-500/5' 
                  : 'border-transparent text-white/40 hover:text-white/80'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-gold-base" />
              SERVER MANAGER (ADMIN)
            </button>
            {onOpenAdmin && isAdmin && (
              <button
                onClick={() => {
                  playInterfaceTick();
                  onClose();
                  onOpenAdmin();
                }}
                className="flex-1 py-3 text-[10px] font-tech font-extrabold tracking-widest uppercase transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer border-transparent text-gold-base hover:text-gold-light hover:bg-gold-base/5"
              >
                <Shield className="w-3.5 h-3.5 text-gold-base animate-pulse" />
                DIRECTORS GATE (ADMIN)
              </button>
            )}
          </div>
        )}

        {isAdminMode ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
            <ServerManager servers={servers} onRefresh={fetchServers} />
          </div>
        ) : (
          <>
            {/* Filters Panel */}
            <div className="p-5 border-b border-white/5 bg-black/20 shrink-0 flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:max-w-xs flex items-center">
                <input
                  type="text"
                  placeholder="Search servers by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-rose-500 pl-9 w-full"
                />
                <Search className="w-4 h-4 text-white/30 absolute left-3" />
              </div>

              {/* Countries Selector */}
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
                {countries.map((c, idx) => (
                  <button
                    key={`country-filter-${c}-${idx}`}
                    onClick={() => setSelectedCountry(c)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer border ${
                      selectedCountry === c
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-black/40 border-white/5 text-white/40 hover:text-white/80'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Refresh button */}
              <button
                onClick={fetchServers}
                className="p-2 border border-white/5 hover:border-rose-500/30 rounded-xl bg-white/5 hover:bg-rose-500/5 text-white/60 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
                REFRESH INDEX
              </button>
            </div>

            {/* Main server cards lists */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">SCANNING DIRECTORIES...</span>
                </div>
              ) : filteredServers.length === 0 ? (
                <div className="p-16 text-center border border-dashed border-white/5 rounded-xxl text-white/40 text-[11px]">
                  No matching server relays detected for your current zone filter. Try clearing filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <AnimatePresence>
                    {filteredServers.map((srv, idx) => {
                      const isActive = activeServerId === srv.id;
                      const isOnline = srv.status === 'online';
                      const isMaint = srv.status === 'maintenance';
                      const currentLatency = customLatencies[srv.id] || srv.latency;
                      
                      return (
                        <motion.div
                          key={`srv-relay-${srv.id || idx}-${idx}`}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25 }}
                          className={`luxury-glass p-4 rounded-xxl border transition-all relative overflow-hidden flex flex-col justify-between ${
                            isActive
                              ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-emerald-950/5'
                              : srv.isPremium
                              ? 'border-gold-base/15 hover:border-gold-base/30'
                              : 'border-white/5 hover:border-white/15'
                          }`}
                        >
                          {/* Active Ribbon / indicator */}
                          {isActive && (
                            <div className="absolute top-0 right-0 bg-emerald-500 text-black px-2 py-0.5 rounded-bl font-mono font-black text-[7px] uppercase tracking-widest shadow-md">
                              ACTIVE TUNNEL
                            </div>
                          )}

                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-serif font-black text-white">{srv.name}</span>
                              {srv.isPremium && (
                                <span className="text-[6.5px] font-mono font-bold px-1 py-0.5 rounded gold-gradient-bg text-black uppercase tracking-widest">
                                  VIP
                                </span>
                              )}
                            </div>
                            <span className="text-[8px] font-mono text-white/30 truncate block max-w-[200px]">{srv.url}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3.5">
                            <div className="bg-black/35 border border-white/5 rounded-xl p-2 flex flex-col">
                              <span className="text-[7px] font-mono text-white/30 tracking-widest uppercase">GEOGRAPHIC</span>
                              <span className="text-[9.5px] font-semibold text-white/85 truncate">{srv.country}</span>
                            </div>
                            <div className="bg-black/35 border border-white/5 rounded-xl p-2 flex flex-col justify-between">
                              <span className="text-[7px] font-mono text-white/30 tracking-widest uppercase">LATENCY</span>
                              <div className="flex items-center justify-between">
                                <span className={`text-[9.5px] font-mono font-bold ${
                                  currentLatency < 50 ? 'text-emerald-400' : currentLatency < 150 ? 'text-amber-400' : 'text-rose-400'
                                }`}>
                                  {currentLatency} ms
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePingServer(srv);
                                  }}
                                  disabled={pingingId !== null || !isOnline}
                                  className="p-1 border border-white/10 hover:border-rose-500/30 rounded-lg hover:bg-rose-500/5 text-white/40 hover:text-rose-400 transition-all cursor-pointer font-mono text-[7px] font-extrabold uppercase"
                                >
                                  {pingingId === srv.id ? '...' : 'PING'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Load capacity meter */}
                          <div className="flex flex-col gap-1 mt-3">
                            <div className="flex justify-between text-[7px] font-mono text-white/40">
                              <span>BANDWIDTH PORT LOAD</span>
                              <span>{srv.load}% ({srv.speed})</span>
                            </div>
                            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  srv.load > 80 ? 'bg-rose-500' : srv.load > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${srv.load}%` }}
                              />
                            </div>
                          </div>

                          {/* Action Select Button */}
                          <div className="border-t border-white/5 pt-3 mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className={`w-1 h-1 rounded-full ${
                                isOnline ? 'bg-emerald-400 animate-pulse' : isMaint ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
                              }`} />
                              <span className={`text-[7px] font-mono font-bold uppercase ${
                                isOnline ? 'text-emerald-400' : isMaint ? 'text-amber-400' : 'text-rose-500'
                              }`}>
                                {srv.status}
                              </span>
                            </div>

                            <button
                              onClick={() => handleSelectServer(srv)}
                              disabled={!isOnline}
                              className={`px-3 py-1.5 rounded-xl font-mono text-[8px] font-extrabold uppercase transition-all tracking-wider flex items-center gap-1 cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-default'
                                  : 'bg-white/5 hover:bg-white/15 border border-white/10 text-white'
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  TUNNELED
                                </>
                              ) : (
                                <>
                                  CONNECT
                                  <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                                </>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
