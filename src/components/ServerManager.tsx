import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Server, Plus, Trash2, Edit, Check, X, RefreshCw, 
  Wifi, Shield, Activity, Globe, Zap, AlertCircle
} from 'lucide-react';
import { StreamingServer } from '../types';
import { saveStreamingServer, deleteStreamingServer } from '../lib/firestoreService';
import { playInterfaceTick, playGoldenSuccessChime } from '../lib/soundEffects';

interface ServerManagerProps {
  servers: StreamingServer[];
  onRefresh?: () => void;
}

export default function ServerManager({ servers, onRefresh }: ServerManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingServer, setEditingServer] = useState<StreamingServer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [country, setCountry] = useState('United States');
  const [status, setStatus] = useState<'online' | 'offline' | 'maintenance'>('online');
  const [isPremium, setIsPremium] = useState(false);
  const [speed, setSpeed] = useState('10 Gbps');
  const [load, setLoad] = useState(15);
  
  // Real-time ping health checks
  const [healthStatus, setHealthStatus] = useState<Record<string, { state: 'checking' | 'online' | 'offline' | 'maintenance'; latency: number }>>({});

  // Trigger background health check ping for configured endpoints
  useEffect(() => {
    servers.forEach((srv) => {
      pingServerHealth(srv);
    });
    
    // Background ping interval every 45 seconds
    const interval = setInterval(() => {
      servers.forEach((srv) => {
        pingServerHealth(srv);
      });
    }, 45000);
    
    return () => clearInterval(interval);
  }, [servers]);

  const pingServerHealth = async (srv: StreamingServer) => {
    setHealthStatus(prev => ({
      ...prev,
      [srv.id]: { state: 'checking', latency: prev[srv.id]?.latency || srv.latency }
    }));

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout

      // Perform background ping
      await fetch(srv.url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      
      const latency = Date.now() - startTime;
      setHealthStatus(prev => ({
        ...prev,
        [srv.id]: { state: srv.status === 'offline' ? 'offline' : 'online', latency: Math.min(latency, 250) }
      }));
    } catch (err) {
      const latency = Date.now() - startTime;
      // Fallback for default simulation nodes
      if (srv.url.includes('eliteplex.co') || srv.url.includes('example.com')) {
        setHealthStatus(prev => ({
          ...prev,
          [srv.id]: { 
            state: srv.status, 
            latency: srv.status === 'online' ? Math.floor(Math.random() * 40) + 20 : 999 
          }
        }));
      } else {
        setHealthStatus(prev => ({
          ...prev,
          [srv.id]: { state: 'offline', latency: 999 }
        }));
      }
    }
  };

  const handleOpenAddForm = () => {
    playInterfaceTick();
    setEditingServer(null);
    setName('');
    setUrl('');
    setCountry('United States');
    setStatus('online');
    setIsPremium(false);
    setSpeed('10 Gbps');
    setLoad(15);
    setIsAdding(true);
  };

  const handleOpenEditForm = (srv: StreamingServer) => {
    playInterfaceTick();
    setEditingServer(srv);
    setName(srv.name);
    setUrl(srv.url);
    setCountry(srv.country);
    setStatus(srv.status);
    setIsPremium(srv.isPremium);
    setSpeed(srv.speed);
    setLoad(srv.load);
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      alert("Name and custom stream mapping URL are required!");
      return;
    }

    setIsSaving(true);
    playInterfaceTick();

    const serverId = editingServer ? editingServer.id : `srv-custom-${Date.now()}`;
    const newServer: StreamingServer = {
      id: serverId,
      name: name.trim(),
      url: url.trim(),
      country: country,
      status: status,
      isPremium: isPremium,
      speed: speed,
      load: Math.min(Math.max(Number(load), 0), 100),
      latency: editingServer ? editingServer.latency : Math.floor(Math.random() * 45) + 15
    };

    try {
      await saveStreamingServer(newServer);
      playGoldenSuccessChime();
      setIsAdding(false);
      setEditingServer(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Failed to save streaming node: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, srvName: string) => {
    if (!window.confirm(`Are you sure you want to permanently decommission server node "${srvName}"?`)) return;
    
    playInterfaceTick();
    try {
      await deleteStreamingServer(id);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Failed to decommission server: " + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="flex items-center justify-between border-b border-white/5 pb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-xs font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400 uppercase flex items-center gap-2">
            <Server className="w-4 h-4 text-rose-400" />
            STREAMING RELAY MANAGER
          </h3>
          <p className="text-[9px] text-white/40 font-mono tracking-wider mt-0.5">
            Admin deck to map custom load-balancer stream endpoints and monitor active nodes.
          </p>
        </div>

        <button
          onClick={handleOpenAddForm}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-black font-tech font-extrabold text-[9px] tracking-widest transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-[0_4px_15px_rgba(239,68,68,0.2)]"
        >
          <Plus className="w-3.5 h-3.5" />
          ADD RELAY NODE
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="bg-black/50 border border-white/10 rounded-xxl p-5 flex flex-col gap-4 relative">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-tech font-bold text-rose-400 tracking-wider uppercase">
                  {editingServer ? 'EDIT STREAM RELAY CONFIG' : 'REGISTER NEW RELAY STREAM'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="p-1 rounded-lg border border-white/5 hover:border-white/10 text-white/40 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Node Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-mono text-white/50 uppercase tracking-wider">Relay Node Label</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Apex Engine US-West"
                    className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Custom URL */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-mono text-white/50 uppercase tracking-wider">Streaming Target URL (Load Balancer)</label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-cdn.co/stream/hls"
                    className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                {/* Country */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-mono text-white/50 uppercase tracking-wider">Geographic Region</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    {['United States', 'United Kingdom', 'India', 'Singapore', 'Japan', 'Canada', 'Germany', 'France', 'Australia', 'South Korea'].map((c) => (
                      <option key={c} value={c} className="bg-neutral-950 text-white">{c}</option>
                    ))}
                  </select>
                </div>

                {/* Speed */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-mono text-white/50 uppercase tracking-wider">FIBER BROADCAST CAPACITY</label>
                  <select
                    value={speed}
                    onChange={(e) => setSpeed(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  >
                    <option value="1 Gbps" className="bg-neutral-950 text-white">1 Gbps Standard Channel</option>
                    <option value="10 Gbps" className="bg-neutral-950 text-white">10 Gbps VIP Hyper-Fiber</option>
                    <option value="40 Gbps" className="bg-neutral-950 text-white">40 Gbps Ultra-Core Relay</option>
                  </select>
                </div>

                {/* Current Load & isPremium */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[8px] font-mono text-white/50 uppercase tracking-wider">Starting Load (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={load}
                      onChange={(e) => setLoad(Number(e.target.value))}
                      className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>

                  <div className="flex flex-col justify-end pb-1 select-none">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white">
                      <input
                        type="checkbox"
                        checked={isPremium}
                        onChange={(e) => setIsPremium(e.target.checked)}
                        className="rounded border-white/20 bg-black accent-rose-500 w-4 h-4"
                      />
                      <span className="font-mono text-[9px] uppercase tracking-wider text-rose-300">VIP Exclusive</span>
                    </label>
                  </div>
                </div>

                {/* Administrative Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[8px] font-mono text-white/50 uppercase tracking-wider">Initial Deployment Status</label>
                  <div className="flex gap-2">
                    {['online', 'offline', 'maintenance'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(st as any)}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-mono font-bold uppercase transition-all border ${
                          status === st
                            ? st === 'online'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : st === 'maintenance'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-rose-500/20 border-rose-500 text-rose-300'
                            : 'bg-black/40 border-white/5 text-white/40 hover:text-white/80'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2 border-t border-white/5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 font-tech text-[9px] tracking-wider uppercase"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-rose-500 hover:brightness-110 text-white font-tech font-bold text-[9px] tracking-wider uppercase flex items-center gap-1"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      DEPLOYING...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      DEPLOY DECK
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Servers List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-[9px] font-mono text-white/40 uppercase tracking-wider px-1">
          <span>Active Fiber Relay Terminals ({servers.length})</span>
          <span>Background Pinging Live Status</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
          <AnimatePresence>
            {servers.map((srv, idx) => {
              const pInfo = healthStatus[srv.id] || { state: srv.status, latency: srv.latency };
              const isOnline = pInfo.state === 'online';
              const isChecking = pInfo.state === 'checking';
              const isMaint = pInfo.state === 'maintenance';

              return (
                <motion.div
                  key={`server-${srv.id || idx}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.25 }}
                  className={`luxury-glass p-4 rounded-xxl border transition-all relative overflow-hidden flex flex-col justify-between group ${
                    srv.isPremium ? 'border-rose-500/20' : 'border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-serif font-black text-white truncate">{srv.name}</span>
                      {srv.isPremium && (
                        <span className="text-[6.5px] font-mono font-bold px-1 py-0.5 rounded gold-gradient-bg text-black uppercase tracking-widest shrink-0">
                          VIP
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isOnline 
                            ? 'bg-emerald-400 animate-pulse' 
                            : isChecking 
                            ? 'bg-rose-400 animate-spin border border-t-transparent border-rose-500' 
                            : isMaint 
                            ? 'bg-amber-400 animate-pulse' 
                            : 'bg-rose-500'
                        }`} />
                        <span className={`text-[7px] font-mono font-bold uppercase ${
                          isOnline ? 'text-emerald-400' : isChecking ? 'text-rose-400' : isMaint ? 'text-amber-400' : 'text-rose-500'
                        }`}>
                          {pInfo.state}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => pingServerHealth(srv)}
                        title="Manual Ping Check"
                        className="p-1 border border-white/5 hover:border-rose-500/30 rounded-lg text-white/30 hover:text-rose-400 transition-all cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <span className="text-[8px] font-mono text-white/30 truncate block max-w-full mt-1">{srv.url}</span>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="bg-black/35 border border-white/5 rounded-xl p-1.5 flex flex-col justify-center">
                      <span className="text-[6px] font-mono text-white/30 uppercase">REGION</span>
                      <span className="text-[8.5px] font-bold text-white/80 truncate">{srv.country}</span>
                    </div>
                    <div className="bg-black/35 border border-white/5 rounded-xl p-1.5 flex flex-col justify-center">
                      <span className="text-[6px] font-mono text-white/30 uppercase">FIBER PORT</span>
                      <span className="text-[8.5px] font-bold text-white/80 truncate">{srv.speed}</span>
                    </div>
                    <div className="bg-black/35 border border-white/5 rounded-xl p-1.5 flex flex-col justify-center">
                      <span className="text-[6px] font-mono text-white/30 uppercase">LATENCY</span>
                      <span className={`text-[8.5px] font-mono font-black ${
                        pInfo.latency < 50 ? 'text-emerald-400' : pInfo.latency < 150 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {pInfo.latency} ms
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 w-1/2">
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            srv.load > 80 ? 'bg-rose-500' : srv.load > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${srv.load}%` }}
                        />
                      </div>
                      <span className="text-[7px] font-mono text-white/40 shrink-0">{srv.load}% LOAD</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(srv)}
                        className="p-1.5 rounded-lg border border-white/5 hover:border-gold-base hover:text-gold-light hover:bg-gold-base/5 text-white/40 transition-all"
                        title="Edit Node Config"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(srv.id, srv.name)}
                        className="p-1.5 rounded-lg border border-white/5 hover:border-red-500 hover:text-red-400 hover:bg-red-500/5 text-white/40 transition-all"
                        title="Decommission Node"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
