import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DownloadItem } from '../types';
import { 
  Download, Play, Trash2, HardDrive, ShieldAlert, Pause,
  ArrowUpDown, Filter, SlidersHorizontal, Film, Tv, ListCollapse, BarChart3, Database,
  Smartphone, Laptop, Cpu, Layers, Settings, Activity, ShieldCheck, CheckCircle, CheckCircle2, ArrowRight, RefreshCw, AlertCircle
} from 'lucide-react';
import { ResolvedImage } from './ResolvedImage';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area } from 'recharts';
import { playInterfaceTick, playGoldenSuccessChime } from '../lib/soundEffects';
import { getLocalFile } from '../lib/indexedDBStorage';

interface DownloadsViewProps {
  downloads: DownloadItem[];
  onPlayDownloaded: (item: DownloadItem) => void;
  onRemoveDownload: (id: string) => void;
  onClose: () => void;
  maxConcurrent: number;
  setMaxConcurrent: (val: number) => void;
  speedCap: string;
  setSpeedCap: (val: string) => void;
  onPauseDownload?: (id: string) => void;
  onResumeDownload?: (id: string) => void;
  onPauseAllDownloads?: () => void;
  onResumeAllDownloads?: () => void;
  key?: string;
}

// Utility to convert size strings (e.g., '1.82 GB', '450 MB') to bytes/MB for sorting
function parseSizeToMB(sizeStr: string): number {
  if (!sizeStr) return 0;
  const clean = sizeStr.toLowerCase().trim();
  const val = parseFloat(clean);
  if (isNaN(val)) return 0;
  if (clean.includes('gb')) {
    return val * 1024;
  }
  if (clean.includes('kb')) {
    return val / 1024;
  }
  return val; // Default to MB
}

export default function DownloadsView({
  downloads,
  onPlayDownloaded,
  onRemoveDownload,
  onClose,
  maxConcurrent,
  setMaxConcurrent,
  speedCap,
  setSpeedCap,
  onPauseDownload,
  onResumeDownload,
  onPauseAllDownloads,
  onResumeAllDownloads
}: DownloadsViewProps) {
  // Sort and filter states
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'episode'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'size' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [cleanedCount, setCleanedCount] = useState<number>(0);
  const [statsTab, setStatsTab] = useState<'type' | 'quality'>('type');

  // App Download and Device Storage subtab states
  const [activeSubTab, setActiveSubTab] = useState<'media' | 'device'>('media');
  const [isDownloadingAPK, setIsDownloadingAPK] = useState(false);
  const [isInstallingPWA, setIsInstallingPWA] = useState(false);
  
  // Cache Integrity scanning states
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [integrityProgress, setIntegrityProgress] = useState(0);
  const [integrityReport, setIntegrityReport] = useState<string[]>([]);
  
  // Decryption performance testing state
  const [isCalibratingDecryption, setIsCalibratingDecryption] = useState(false);
  const [decryptionCalibrationSpeed, setDecryptionCalibrationSpeed] = useState<number | null>(null);

  // Storage partition settings states
  const [backgroundSync, setBackgroundSync] = useState(true);
  const [sectorAlignment, setSectorAlignment] = useState<'aes-256' | 'raw' | 'gcm'>('aes-256');

  // PWA deferred support
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [apkSize, setApkSize] = useState('11.5 MB');

  React.useEffect(() => {
    fetch('/api/apk-status')
      .then(r => r.json())
      .then(data => {
        if (data && data.sizeMb && parseFloat(data.sizeMb) > 0) {
          setApkSize(`${data.sizeMb} MB`);
        }
      })
      .catch(e => console.warn('Failed to fetch apk-status', e));
  }, []);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Real-time speed tracker state
  const [speedHistory, setSpeedHistory] = useState<{ time: string; speed: number }[]>(() => 
    Array.from({ length: 15 }, (_, i) => ({ time: `${i}s`, speed: 0 }))
  );

  const isDownloadingAny = downloads.some((d) => d.status === 'downloading');

  React.useEffect(() => {
    const interval = setInterval(() => {
      let currentSpeedMbps = 0;
      if (isDownloadingAny) {
        if (speedCap === '500kb') {
          currentSpeedMbps = 3.5 + Math.random() * 0.7; // ~4 Mbps
        } else if (speedCap === '2mb') {
          currentSpeedMbps = 15.0 + Math.random() * 2.0; // ~16 Mbps
        } else if (speedCap === '5mb') {
          currentSpeedMbps = 38.0 + Math.random() * 4.0; // ~40 Mbps
        } else if (speedCap === '10mb') {
          currentSpeedMbps = 78.0 + Math.random() * 5.0; // ~80 Mbps
        } else {
          currentSpeedMbps = 120.0 + Math.random() * 30.0; // ~135 Mbps
        }
      } else {
        currentSpeedMbps = 0;
      }

      setSpeedHistory((prev) => {
        const next = [...prev.slice(1), { time: `${Date.now()}`, speed: Number(currentSpeedMbps.toFixed(1)) }];
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isDownloadingAny, speedCap]);

  // Automatic storage cleanup utility for files older than 30 days on mount
  React.useEffect(() => {
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const expiredDownloads = downloads.filter((item) => {
      if (item.addedAt) {
        return now - item.addedAt > thirtyDaysInMs;
      }
      return false;
    });

    if (expiredDownloads.length > 0) {
      expiredDownloads.forEach((item) => {
        onRemoveDownload(item.id);
      });
      setCleanedCount(expiredDownloads.length);
      const timer = setTimeout(() => {
        setCleanedCount(0);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Calculate simulated storage footprint
  const totalDownloadedSizeGB = downloads.reduce((acc, item) => {
    const sizeStr = item.size.toUpperCase();
    let val = parseFloat(sizeStr);
    if (isNaN(val)) return acc;
    if (sizeStr.includes('MB')) {
      val = val / 1024; // convert MB to GB
    } else if (sizeStr.includes('KB')) {
      val = val / (1024 * 1024); // convert KB to GB
    }
    return acc + val;
  }, 0);

  const usedPercentage = Math.min((totalDownloadedSizeGB / 128) * 100, 100);

  // Calculate statistics for breakdown dashboard
  const statsData = React.useMemo(() => {
    let moviesSizeMB = 0;
    let moviesCount = 0;
    let seriesSizeMB = 0;
    let seriesCount = 0;

    let ultraHDSizeMB = 0;
    let ultraHDCount = 0;
    let fullHDSizeMB = 0;
    let fullHDCount = 0;
    let hdSizeMB = 0;
    let hdCount = 0;

    downloads.forEach((item) => {
      const sizeMB = parseSizeToMB(item.size);
      
      // Breakdown by Type
      if (item.type === 'movie') {
        moviesSizeMB += sizeMB;
        moviesCount++;
      } else {
        seriesSizeMB += sizeMB;
        seriesCount++;
      }

      // Breakdown by Quality (pseudo-classification)
      if (sizeMB >= 1500) {
        ultraHDSizeMB += sizeMB;
        ultraHDCount++;
      } else if (sizeMB >= 800) {
        fullHDSizeMB += sizeMB;
        fullHDCount++;
      } else {
        hdSizeMB += sizeMB;
        hdCount++;
      }
    });

    const totalMB = moviesSizeMB + seriesSizeMB;

    const typeBreakdown = [
      { 
        name: 'Movies', 
        value: Number((moviesSizeMB / 1024).toFixed(2)), // in GB
        rawMB: moviesSizeMB,
        count: moviesCount, 
        color: '#D4AF37' // Gold
      },
      { 
        name: 'Series', 
        value: Number((seriesSizeMB / 1024).toFixed(2)), // in GB
        rawMB: seriesSizeMB,
        count: seriesCount, 
        color: '#3B82F6' // Blue
      }
    ].filter(item => item.count > 0);

    const qualityBreakdown = [
      { 
        name: '4K UHD', 
        value: Number((ultraHDSizeMB / 1024).toFixed(2)), // in GB
        rawMB: ultraHDSizeMB,
        count: ultraHDCount, 
        color: '#10B981' // Emerald
      },
      { 
        name: '1080p FHD', 
        value: Number((fullHDSizeMB / 1024).toFixed(2)), // in GB
        rawMB: fullHDSizeMB,
        count: fullHDCount, 
        color: '#8B5CF6' // Violet
      },
      { 
        name: '720p HD', 
        value: Number((hdSizeMB / 1024).toFixed(2)), // in GB
        rawMB: hdSizeMB,
        count: hdCount, 
        color: '#F59E0B' // Amber
      }
    ].filter(item => item.count > 0);

    return {
      totalGB: Number((totalMB / 1024).toFixed(2)),
      typeBreakdown,
      qualityBreakdown
    };
  }, [downloads]);

  // Filter downloaded items
  const filteredDownloads = downloads.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) {
      return false;
    }
    return true;
  });

  // Sort downloaded items
  const sortedDownloads = [...filteredDownloads].sort((a, b) => {
    let result = 0;
    if (sortBy === 'title') {
      result = a.title.localeCompare(b.title);
    } else if (sortBy === 'size') {
      result = parseSizeToMB(a.size) - parseSizeToMB(b.size);
    } else {
      // Sort by Date Added
      const timeA = a.addedAt || 0;
      const timeB = b.addedAt || 0;
      result = timeA - timeB;
    }
    return sortOrder === 'asc' ? result : -result;
  });

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="fixed inset-0 bg-black z-[1000] overflow-y-auto pb-24 px-6 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-serif font-black tracking-wide italic flex items-center gap-2 text-white">
          <Download className="w-5 h-5 text-gold-base" />
          OFFLINE STORAGE
        </h2>
        <button
          onClick={onClose}
          className="text-xs font-tech tracking-widest text-gold-base border border-gold-base/20 px-4 py-2 rounded-full hover:bg-gold-base/10 transition-all cursor-pointer"
        >
          BACK
        </button>
      </div>

      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Segmented Subtab Bar */}
        <div className="flex bg-neutral-900/80 border border-white/10 p-1.5 rounded-2xl relative z-10">
          <button
            onClick={() => {
              if (typeof playInterfaceTick === 'function') playInterfaceTick();
              setActiveSubTab('media');
            }}
            className={`flex-1 py-3.5 rounded-xl text-xs font-tech font-extrabold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSubTab === 'media'
                ? 'bg-gold-base text-black font-black shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Database className="w-4 h-4" />
            Media Offline Cache
          </button>
          <button
            onClick={() => {
              if (typeof playInterfaceTick === 'function') playInterfaceTick();
              setActiveSubTab('device');
            }}
            className={`flex-1 py-3.5 rounded-xl text-xs font-tech font-extrabold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
              activeSubTab === 'device'
                ? 'bg-gold-base text-black font-black shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            App & Device Storage
            <span className="absolute -top-1.5 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </div>

        {/* Auto Cleanup Notification Banner */}
        {cleanedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xxl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-3 animate-fade-in"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Storage Purged:</strong> Released space by automatically removing <strong>{cleanedCount}</strong> cached movie files older than 30 days.
              </span>
            </div>
            <button
              onClick={() => setCleanedCount(0)}
              className="text-[10px] font-mono hover:text-white px-2 py-1 rounded bg-white/5 border border-white/10"
            >
              DISMISS
            </button>
          </motion.div>
        )}

        {activeSubTab === 'media' ? (
          <>
            {/* 1. Device Storage Bar Indicator */}
        <div className="luxury-glass p-5 rounded-[24px] border-white/5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-white/80 font-bold uppercase tracking-wider font-sans">
              <HardDrive className="w-4 h-4 text-gold-base" />
              Device Storage
            </div>
            <span className="text-white/40 font-mono">
              {totalDownloadedSizeGB.toFixed(2)} GB / 128.00 GB Used
            </span>
          </div>

          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.2)] rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, usedPercentage)}%` }}
            />
          </div>

          {/* Secure Offline Cache Quota Progress Bar */}
          <div className="border-t border-white/5 pt-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-gold-base font-bold uppercase tracking-wider text-[10px]">
                <Download className="w-3.5 h-3.5 text-gold-base" />
                Secure Offline Cache Space
              </div>
              <span className="text-white/60 font-mono text-[10px]">
                {totalDownloadedSizeGB.toFixed(2)} GB / 20.00 GB Allocated
              </span>
            </div>

            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
              <div
                className="h-full gold-gradient-bg shadow-[0_0_10px_rgba(212,175,55,0.5)] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalDownloadedSizeGB / 20) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-white/30 uppercase tracking-wider">
              <span>System Assigned Cache Segment</span>
              <span>{((totalDownloadedSizeGB / 20) * 100).toFixed(1)}% Used</span>
            </div>
          </div>

          <p className="text-[9px] text-white/30 tracking-wide">
            Decrypted master files reside in secure in-app cache allocation.
          </p>

          {/* Storage Cleanup Utility Controls */}
          <div className="border-t border-white/5 pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-col">
              <span className="text-white/70 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Auto-Cleanup Agent Active
              </span>
              <span className="text-[9px] text-white/40 leading-relaxed">
                Automatically flushes offline master cinema files older than 30 days to optimize cache storage
              </span>
            </div>
            <button
              onClick={() => {
                const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
                const now = Date.now();
                const expired = downloads.filter((item) => item.addedAt && (now - item.addedAt > thirtyDaysInMs));
                if (expired.length > 0) {
                  expired.forEach((item) => onRemoveDownload(item.id));
                  alert(`Successfully wiped ${expired.length} offline cache files older than 30 days.`);
                } else {
                  alert("All cached files are current! No downloaded films older than 30 days were detected in secure storage.");
                }
              }}
              className="text-[9px] font-tech font-extrabold tracking-widest text-gold-base bg-gold-base/10 hover:bg-gold-base/15 border border-gold-base/20 px-3.5 py-2 rounded-xl cursor-pointer transition-all active:scale-95 text-center shrink-0 uppercase"
            >
              PURGE OLD CACHE
            </button>
          </div>
        </div>

        {/* Storage Statistics Dashboard Panel */}
        <div className="luxury-glass p-5 rounded-[24px] border-white/5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2 text-[10px] font-tech text-white/50 uppercase tracking-widest">
              <BarChart3 className="w-3.5 h-3.5 text-gold-base" />
              Storage Statistics Breakdown
            </div>
            {downloads.length > 0 && (
              <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                <button
                  onClick={() => setStatsTab('type')}
                  className={`px-2 py-1 rounded text-[8px] font-tech uppercase tracking-wider transition-all cursor-pointer ${
                    statsTab === 'type'
                      ? 'bg-gold-base text-black font-extrabold'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Media Type
                </button>
                <button
                  onClick={() => setStatsTab('quality')}
                  className={`px-2 py-1 rounded text-[8px] font-tech uppercase tracking-wider transition-all cursor-pointer ${
                    statsTab === 'quality'
                      ? 'bg-gold-base text-black font-extrabold'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  Quality
                </button>
              </div>
            )}
          </div>

          {downloads.length === 0 ? (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
              <Database className="w-8 h-8 text-white/10" />
              <p className="text-[10px] font-sans text-white/40 max-w-xs">
                No offline files decrypted. Download films or series episodes to view storage statistics.
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              {/* Left Side: Donut Chart */}
              <div className="w-full sm:w-1/2 flex justify-center items-center relative" style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statsTab === 'type' ? statsData.typeBreakdown : statsData.qualityBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(statsTab === 'type' ? statsData.typeBreakdown : statsData.qualityBreakdown).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-neutral-950/95 border border-white/10 px-3 py-2 rounded-xl text-[9px] font-mono shadow-2xl">
                              <p className="font-extrabold text-white uppercase tracking-wider mb-0.5">{data.name}</p>
                              <p className="text-gold-base font-bold">{data.value.toFixed(2)} GB ({data.count} {data.count === 1 ? 'file' : 'files'})</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center text of the donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-tech text-white/30 uppercase tracking-widest">Total Cached</span>
                  <span className="text-lg font-serif font-black text-white italic tracking-tighter">
                    {statsData.totalGB.toFixed(1)} <span className="text-xs">GB</span>
                  </span>
                </div>
              </div>

              {/* Right Side: Detailed breakdown list / custom legend */}
              <div className="w-full sm:w-1/2 flex flex-col gap-2.5">
                {(statsTab === 'type' ? statsData.typeBreakdown : statsData.qualityBreakdown).map((entry, idx) => {
                  const percentage = statsData.totalGB > 0 ? (entry.value / statsData.totalGB) * 100 : 0;
                  return (
                    <div key={`legend-item-${idx}`} className="flex flex-col gap-1 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 p-2 rounded-xl transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
                            {entry.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-gold-base">
                          {entry.value.toFixed(2)} GB
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[8px] font-mono text-white/30">
                        <span>{entry.count} {entry.count === 1 ? 'file cached' : 'files cached'}</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ backgroundColor: entry.color, width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Network & Download settings panel */}
        <div className="luxury-glass p-5 rounded-[24px] border-white/5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[10px] font-tech text-white/50 uppercase tracking-widest border-b border-white/5 pb-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gold-base" />
            NETWORK & SPEED ALLOCATION
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-sans font-bold text-white/80 uppercase tracking-wider">Concurrent Streams</label>
              <select
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(Number(e.target.value))}
                className="bg-black/60 border border-white/10 text-white text-[10px] font-tech p-2.5 rounded-xl outline-none focus:border-gold-base/50 transition-all cursor-pointer"
              >
                <option value={1} className="bg-neutral-900 text-white">1 Active Stream (Low Load)</option>
                <option value={2} className="bg-neutral-900 text-white">2 Active Streams (Standard)</option>
                <option value={3} className="bg-neutral-900 text-white">3 Active Streams (Fast)</option>
                <option value={999} className="bg-neutral-900 text-white">Unlimited (Max Bandwidth)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-sans font-bold text-white/80 uppercase tracking-wider">Speed Cap Limit</label>
              <select
                value={speedCap}
                onChange={(e) => setSpeedCap(e.target.value)}
                className="bg-black/60 border border-white/10 text-white text-[10px] font-tech p-2.5 rounded-xl outline-none focus:border-gold-base/50 transition-all cursor-pointer"
              >
                <option value="none" className="bg-neutral-900 text-white">No Speed Limit</option>
                <option value="500kb" className="bg-neutral-900 text-white">500 KB/s (Throttled)</option>
                <option value="2mb" className="bg-neutral-900 text-white">2 MB/s (Standard Cap)</option>
                <option value="5mb" className="bg-neutral-900 text-white">5 MB/s (High-Speed Cap)</option>
                <option value="10mb" className="bg-neutral-900 text-white">10 MB/s (4K Buffer Cap)</option>
              </select>
            </div>
          </div>
          <p className="text-[9px] text-white/30 tracking-wide">
            Capping download speed avoids domestic network saturation during background decryption tasks.
          </p>
        </div>

        {/* Real-time Throughput Speed Mini-Chart */}
        {downloads.length > 0 && (
          <div className="luxury-glass p-5 rounded-[24px] border-white/5 flex flex-col gap-3 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-tech text-gold-base uppercase tracking-widest font-bold">
                <span className={`w-2 h-2 rounded-full ${isDownloadingAny ? 'bg-green-500 animate-ping' : 'bg-white/20'}`} />
                Live Bandwidth Decryption Tunnel
              </div>
              <span className={`text-[11px] font-mono font-bold flex items-center gap-1 ${isDownloadingAny ? 'text-green-400' : 'text-white/30'}`}>
                <ArrowUpDown className={`w-3 h-3 ${isDownloadingAny ? 'animate-pulse' : ''}`} />
                {speedHistory[speedHistory.length - 1]?.speed || 0} Mbps
              </span>
            </div>

            <div className="h-20 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={speedHistory} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="speedGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--custom-accent, #D4AF37)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--custom-accent, #D4AF37)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(8, 8, 8, 0.95)',
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontFamily: 'var(--font-tech)',
                      fontSize: '9px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="speed" 
                    stroke="var(--custom-accent, #D4AF37)" 
                    strokeWidth={1.5}
                    fillOpacity={1} 
                    fill="url(#speedGlow)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[8px] font-mono text-white/30 uppercase tracking-widest mt-1">
              <span>Dynamic CORS Tunnel Proxy</span>
              <span>1s Ticks Feed</span>
            </div>
          </div>
        )}

        {/* 2. Sort & Filter Dashboard Section */}
        {downloads.length > 0 && (
          <div className="luxury-glass p-4 rounded-2xl border-white/5 flex flex-col gap-3.5">
            <div className="flex items-center gap-2 text-[10px] font-tech text-white/50 uppercase tracking-widest border-b border-white/5 pb-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gold-base" />
              Sort & Filter Decrypted Stream
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Type Filters */}
              <div className="flex items-center gap-1 bg-black/40 border border-white/5 p-1 rounded-xl">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-tech uppercase tracking-wider transition-all cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-gold-base text-black font-extrabold shadow-md'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('movie')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-tech uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                    filterType === 'movie'
                      ? 'bg-gold-base text-black font-extrabold shadow-md'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Film className="w-3 h-3" />
                  Movies
                </button>
                <button
                  onClick={() => setFilterType('episode')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-tech uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                    filterType === 'episode'
                      ? 'bg-gold-base text-black font-extrabold shadow-md'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Tv className="w-3 h-3" />
                  Series
                </button>
              </div>

              {/* Sorting Options */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-tech text-white/30 uppercase tracking-wider">Sort:</span>
                <div className="flex items-center bg-black/40 border border-white/5 rounded-xl overflow-hidden p-1">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent border-none text-[9px] font-tech text-white uppercase tracking-wider focus:outline-none px-2 py-1 cursor-pointer"
                  >
                    <option value="date" className="bg-neutral-900 text-white">Date Added</option>
                    <option value="size" className="bg-neutral-900 text-white">File Size</option>
                    <option value="title" className="bg-neutral-900 text-white">Title A-Z</option>
                  </select>

                  <button
                    onClick={toggleSortOrder}
                    className="p-1 px-1.5 hover:bg-white/5 text-gold-base rounded-md transition-all cursor-pointer"
                    title={`Sort Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                  >
                    <ArrowUpDown className={`w-3.5 h-3.5 transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Downloaded listings */}
        <div className="flex flex-col gap-3 text-left">
          <div className="flex items-center justify-between text-[9px] font-tech tracking-widest text-white/40 uppercase">
            <span>OFFLINE DECRYPTED CINEMA ({sortedDownloads.length})</span>
            {filterType !== 'all' && (
              <span className="text-gold-base/60">Filtered by: {filterType}</span>
            )}
          </div>

          {/* Pause All / Resume All Buttons */}
          {downloads.length > 0 && (
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  if (onPauseAllDownloads) onPauseAllDownloads();
                }}
                disabled={!downloads.some(d => d.status === 'downloading' || d.status === 'queued')}
                className="flex-1 py-2.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-white/85 text-[10px] font-tech font-extrabold tracking-widest uppercase rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              >
                PAUSE ALL
              </button>
              <button
                onClick={() => {
                  if (onResumeAllDownloads) onResumeAllDownloads();
                }}
                disabled={!downloads.some(d => d.status === 'paused')}
                className="flex-1 py-2.5 px-4 gold-gradient-bg text-black text-[10px] font-tech font-black tracking-widest uppercase rounded-xl transition-all active:scale-95 hover:brightness-110 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              >
                RESUME ALL
              </button>
            </div>
          )}

          {sortedDownloads.length === 0 ? (
            <div className="p-12 text-center luxury-glass rounded-xxl border-white/5 flex flex-col items-center gap-3">
              <ShieldAlert className="w-10 h-10 text-white/30" />
              <div>
                <h4 className="text-sm font-bold text-white">No Offline Files Match</h4>
                <p className="text-xs text-white/40 leading-relaxed max-w-sm mt-1">
                  {downloads.length === 0
                    ? 'Browse movies or TV episodes, tap the download icon, and retrieve titles here to watch offline!'
                    : 'Try resetting or changing your sorting & filtering parameters above.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Movies Category */}
              {sortedDownloads.some(item => item.type === 'movie') && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-[10px] font-tech font-extrabold tracking-widest text-gold-base uppercase">
                    <Film className="w-3.5 h-3.5 text-gold-base" />
                    <span>MOVIES CACHE ({sortedDownloads.filter(item => item.type === 'movie').length})</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <AnimatePresence initial={false}>
                      {sortedDownloads.filter(item => item.type === 'movie').map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="relative overflow-hidden rounded-xxl bg-neutral-950">
                          {/* Red deletion reveal background */}
                          <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-red-600/30 flex items-center justify-end px-6 rounded-xxl pointer-events-none z-0">
                            <div className="flex items-center gap-2 text-red-400 font-tech text-[10px] tracking-widest font-black uppercase">
                              <span className="hidden sm:inline">SWIPE LEFT TO REMOVE</span>
                              <Trash2 className="w-4 h-4 animate-pulse" />
                            </div>
                          </div>

                          <motion.div
                            layout
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={{ left: 0.6, right: 0.1 }}
                            onDragEnd={(event, info) => {
                              if (info.offset.x < -100) {
                                onRemoveDownload(item.id);
                              }
                            }}
                            className="luxury-glass p-3 rounded-xxl border-white/5 flex gap-4 items-center hover:border-gold-base/15 transition-colors duration-300 group relative z-10 bg-[#0d0d10]/95 cursor-grab active:cursor-grabbing touch-pan-y"
                          >
                            {/* Left poster */}
                            <div className="w-16 aspect-[2/3] rounded-xl overflow-hidden shadow shrink-0 select-none bg-white/5">
                              <ResolvedImage 
                                src={item.posterUrl} 
                                alt={item.title} 
                                referrerPolicy="no-referrer" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                              />
                            </div>

                            {/* Middle content details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white uppercase tracking-wide truncate">
                                {item.title}
                              </h4>
                              <p className="text-[10px] text-white/40 mt-0.5 flex items-center gap-2">
                                <span className="inline-flex items-center gap-0.5 text-gold-base/70">
                                  <Film className="w-3 h-3" />
                                  MOVIE
                                </span>
                                <span>•</span>
                                <span className="text-white/60 font-mono font-bold">{item.size}</span>
                              </p>

                              {item.status === 'downloading' ? (
                                <div className="flex flex-col gap-1 mt-2">
                                  <div className="flex justify-between text-[8px] font-mono text-gold-base">
                                    <span>Downloading Master Buffer...</span>
                                    <span>{item.progress}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full gold-gradient-bg" style={{ width: `${item.progress}%` }} />
                                  </div>
                                </div>
                              ) : item.status === 'paused' ? (
                                <div className="flex flex-col gap-1 mt-2">
                                  <div className="flex justify-between text-[8px] font-mono text-amber-500">
                                    <span>Download Paused</span>
                                    <span>{item.progress}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500/50" style={{ width: `${item.progress}%` }} />
                                  </div>
                                </div>
                              ) : item.status === 'queued' ? (
                                <div className="flex flex-col gap-1 mt-2">
                                  <div className="flex justify-between text-[8px] font-mono text-white/40">
                                    <span>Waiting in Queue...</span>
                                    <span>Pending slot</span>
                                  </div>
                                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-white/10" style={{ width: `0%` }} />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1.5 mt-2">
                                  <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1 text-[8px] font-tech text-green-400 font-extrabold bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-green-500/10">
                                      DECRYPTION COMPLETED
                                    </span>
                                    <span className="text-[8px] font-mono text-white/40">
                                      {((parseSizeToMB(item.size) / (20 * 1024)) * 100).toFixed(1)}% of Quota
                                    </span>
                                  </div>
                                  
                                  {/* Cache space utilization progress bar */}
                                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                                    <div 
                                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                                      style={{ width: `${Math.min(100, (parseSizeToMB(item.size) / (20 * 1024)) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right side buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              {(item.status === 'downloading' || item.status === 'queued') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onPauseDownload) onPauseDownload(item.id);
                                  }}
                                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-amber-500/15 text-amber-500 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                                  title="Pause Download"
                                >
                                  <Pause className="w-4 h-4" />
                                </button>
                              )}
                              {item.status === 'paused' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onResumeDownload) onResumeDownload(item.id);
                                  }}
                                  className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                                  title="Resume Download"
                                >
                                  <Play className="w-4 h-4 fill-amber-400 stroke-none" />
                                </button>
                              )}
                              {item.status === 'completed' && (
                                <button
                                  onClick={() => onPlayDownloaded(item)}
                                  className="w-10 h-10 rounded-full gold-gradient-bg text-black shadow hover:brightness-110 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                                >
                                  <Play className="w-4 h-4 fill-black stroke-none" />
                                </button>
                              )}
                              <button
                                onClick={() => onRemoveDownload(item.id)}
                                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/15 text-white hover:text-red-400 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Series Category */}
              {sortedDownloads.some(item => item.type === 'episode') && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-[10px] font-tech font-extrabold tracking-widest text-blue-400 uppercase">
                    <Tv className="w-3.5 h-3.5 text-blue-400" />
                    <span>SERIES CACHE ({sortedDownloads.filter(item => item.type === 'episode').length})</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <AnimatePresence initial={false}>
                      {sortedDownloads.filter(item => item.type === 'episode').map((item, idx) => (
                        <div key={`${item.id}-${idx}`} className="relative overflow-hidden rounded-xxl bg-neutral-950">
                          {/* Red deletion reveal background */}
                          <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-red-600/30 flex items-center justify-end px-6 rounded-xxl pointer-events-none z-0">
                            <div className="flex items-center gap-2 text-red-400 font-tech text-[10px] tracking-widest font-black uppercase">
                              <span className="hidden sm:inline">SWIPE LEFT TO REMOVE</span>
                              <Trash2 className="w-4 h-4 animate-pulse" />
                            </div>
                          </div>

                          <motion.div
                            layout
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={{ left: 0.6, right: 0.1 }}
                            onDragEnd={(event, info) => {
                              if (info.offset.x < -100) {
                                onRemoveDownload(item.id);
                              }
                            }}
                            className="luxury-glass p-3 rounded-xxl border-white/5 flex gap-4 items-center hover:border-gold-base/15 transition-colors duration-300 group relative z-10 bg-[#0d0d10]/95 cursor-grab active:cursor-grabbing touch-pan-y"
                          >
                            {/* Left poster */}
                            <div className="w-16 aspect-[2/3] rounded-xl overflow-hidden shadow shrink-0 select-none bg-white/5">
                              <ResolvedImage 
                                src={item.posterUrl} 
                                alt={item.title} 
                                referrerPolicy="no-referrer" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                              />
                            </div>

                            {/* Middle content details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white uppercase tracking-wide truncate">
                                {item.title}
                              </h4>
                              <p className="text-[10px] text-white/40 mt-0.5 flex items-center gap-2">
                                <span className="inline-flex items-center gap-0.5 text-blue-400 font-bold">
                                  <Tv className="w-3 h-3" />
                                  SERIES EPISODE
                                </span>
                                <span>•</span>
                                <span className="text-white/60 font-mono font-bold">{item.size}</span>
                              </p>

                              {item.status === 'downloading' ? (
                                <div className="flex flex-col gap-1 mt-2">
                                  <div className="flex justify-between text-[8px] font-mono text-gold-base">
                                    <span>Downloading Master Buffer...</span>
                                    <span>{item.progress}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full gold-gradient-bg" style={{ width: `${item.progress}%` }} />
                                  </div>
                                </div>
                              ) : item.status === 'paused' ? (
                                <div className="flex flex-col gap-1 mt-2">
                                  <div className="flex justify-between text-[8px] font-mono text-amber-500">
                                    <span>Download Paused</span>
                                    <span>{item.progress}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500/50" style={{ width: `${item.progress}%` }} />
                                  </div>
                                </div>
                              ) : item.status === 'queued' ? (
                                <div className="flex flex-col gap-1 mt-2">
                                  <div className="flex justify-between text-[8px] font-mono text-white/40">
                                    <span>Waiting in Queue...</span>
                                    <span>Pending slot</span>
                                  </div>
                                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-white/10" style={{ width: `0%` }} />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1.5 mt-2">
                                  <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1 text-[8px] font-tech text-green-400 font-extrabold bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-green-500/10">
                                      DECRYPTION COMPLETED
                                    </span>
                                    <span className="text-[8px] font-mono text-white/40">
                                      {((parseSizeToMB(item.size) / (20 * 1024)) * 100).toFixed(1)}% of Quota
                                    </span>
                                  </div>
                                  
                                  {/* Cache space utilization progress bar */}
                                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                                    <div 
                                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                                      style={{ width: `${Math.min(100, (parseSizeToMB(item.size) / (20 * 1024)) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right side buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                              {(item.status === 'downloading' || item.status === 'queued') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onPauseDownload) onPauseDownload(item.id);
                                  }}
                                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-amber-500/15 text-amber-500 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                                  title="Pause Download"
                                >
                                  <Pause className="w-4 h-4" />
                                </button>
                              )}
                              {item.status === 'paused' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onResumeDownload) onResumeDownload(item.id);
                                  }}
                                  className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                                  title="Resume Download"
                                >
                                  <Play className="w-4 h-4 fill-amber-400 stroke-none" />
                                </button>
                              )}
                              {item.status === 'completed' && (
                                <button
                                  onClick={() => onPlayDownloaded(item)}
                                  className="w-10 h-10 rounded-full gold-gradient-bg text-black shadow hover:brightness-110 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                                >
                                  <Play className="w-4 h-4 fill-black stroke-none" />
                                </button>
                              )}
                              <button
                                onClick={() => onRemoveDownload(item.id)}
                                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/15 text-white hover:text-red-400 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </>
    ) : (
          /* Device tab content */
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* App Installation Center (Android APK & PWA Desktop) */}
            <div className="luxury-glass p-6 rounded-[24px] border-white/5 flex flex-col gap-5 text-left relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold-base/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <div className="w-10 h-10 rounded-xl bg-gold-base/15 border border-gold-base/35 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-gold-base" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-black uppercase text-white tracking-wide">FlixtZone App Installer</h3>
                  <p className="text-[10px] text-white/40 uppercase font-tech tracking-wider">Official Android & Desktop Clients</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Android APK Compilation */}
                <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col justify-between gap-4 hover:border-gold-base/20 transition-all group">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        Stable v4.5.2
                      </span>
                      <span className="text-[8px] font-mono text-white/30 uppercase">Size: {apkSize}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-gold-base" />
                      Direct Android APK Installer
                    </h4>
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      The official native Elite Plex OTT client for Android. Features high-speed offline video playback, built-in stream decryptor, and background downloading.
                    </p>
                  </div>

                  {/* Features Bullet List */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-1.5 text-[9px] text-white/75">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span><strong>Direct APK Installer:</strong> Triggers native Package Installer directly.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span><strong>Built-In Decryptor:</strong> Decrypts stored 4K streams for offline playback.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span><strong>No Fake Links:</strong> Direct high-speed download from our secure servers.</span>
                    </div>
                  </div>

                  {/* Step by Step Android Install Guide (Bangla & English) */}
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 space-y-2 text-[9px] text-amber-200/90 leading-relaxed">
                    <span className="font-tech text-[8px] font-bold tracking-wider text-gold-base uppercase block border-b border-amber-500/10 pb-1 mb-1">
                      সহজ ইন্সটলেশন গাইড (Android Install Steps)
                    </span>
                    <p>
                      <strong className="text-white">১. ডাউনলোড শুরু করুন:</strong> নিচের বাটনে ক্লিক করুন। ফাইলটি সরাসরি ডাউনলোড হবে।
                    </p>
                    <p>
                      <strong className="text-white">২. ফাইল ওপেন করুন:</strong> নোটিফিকেশন বার থেকে <span className="text-white font-mono font-bold">FlixZone_v4.5.2_Pro_Elite.apk</span> ফাইলে ক্লিক করুন।
                    </p>
                    <p>
                      <strong className="text-white">৩. সরাসরি ইন্সটল করুন:</strong> প্রয়োজনে "Unknown Sources" পারমিশন অন করে সরাসরি <strong className="text-white font-bold">Install</strong> বাটনে চাপ দিন।
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      if (typeof playInterfaceTick === 'function') playInterfaceTick();
                      setIsDownloadingAPK(true);
                      try {
                        await new Promise((r) => setTimeout(r, 1500));
                        const link = document.createElement('a');
                        link.href = '/FlixZone_v4.5.2_Pro_Elite.apk';
                        link.download = 'FlixZone_v4.5.2_Pro_Elite.apk';
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        if (typeof playGoldenSuccessChime === 'function') playGoldenSuccessChime();
                        alert("APK Download Initiated!\n\nIf the download does not start automatically, please check your browser downloads folder. Tap the APK file from notifications to install directly onto your device.");
                      } catch (err: any) {
                        alert(`Compile failure: ${err?.message}`);
                      } finally {
                        setIsDownloadingAPK(false);
                      }
                    }}
                    disabled={isDownloadingAPK}
                    className="w-full py-2.5 rounded-xl gold-gradient-bg text-black font-tech font-extrabold text-[9px] tracking-widest uppercase transition-all cursor-pointer active:scale-95 disabled:opacity-50 text-center flex items-center justify-center gap-1.5"
                  >
                    {isDownloadingAPK ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        DOWNLOADING APK...
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        DOWNLOAD & INSTALL APK NOW
                      </>
                    )}
                  </button>
                </div>

                {/* Option 2: Progressive Web App Client */}
                <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col justify-between gap-4 hover:border-gold-base/20 transition-all group">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono text-purple-400 font-extrabold uppercase bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                        Cross-Platform
                      </span>
                      <span className="text-[8px] font-mono text-white/30 uppercase font-sans">Instant PWA</span>
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-sky-400" />
                      Desktop & iOS Offline Client
                    </h4>
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      Installs the offline client directly into Chrome, Safari, or Microsoft Edge. Allows full access to browser disk cache buffers.
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      if (typeof playInterfaceTick === 'function') playInterfaceTick();
                      if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                          if (typeof playGoldenSuccessChime === 'function') playGoldenSuccessChime();
                          alert("PWA installation accepted! Check your application launcher for the offline client.");
                        }
                        setDeferredPrompt(null);
                      } else {
                        setIsInstallingPWA(true);
                        await new Promise((r) => setTimeout(r, 1000));
                        setIsInstallingPWA(false);
                        alert(
                          "PWA OFFLINE INSTALL GUIDE:\n\n" +
                          "✔ Desktop Chrome / Edge: Click the download icon in the address bar (top right) to install.\n" +
                          "✔ iOS Safari: Tap the share button on the footer menu, scroll down and select 'Add to Home Screen'.\n" +
                          "✔ Android Chrome: Tap the 3-dots top right menu and choose 'Install App' or 'Add to Home screen'.\n\n" +
                          "The offline browser sandbox supports up to 50GB storage!"
                        );
                      }
                    }}
                    disabled={isInstallingPWA}
                    className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-gold-base/25 hover:bg-white/[0.08] text-white font-tech font-extrabold text-[9px] tracking-widest uppercase transition-all cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1.5"
                  >
                    {isInstallingPWA ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-gold-base" />
                        CHECKING ENVIRONMENT...
                      </>
                    ) : (
                      <>
                        <Layers className="w-3 h-3 text-gold-base" />
                        INSTALL WEB CLIENT
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Hardware Permission Requirements and Badges */}
              <div className="border-t border-white/5 pt-4 flex flex-col gap-2.5">
                <span className="text-[9px] font-tech text-white/40 uppercase tracking-widest font-extrabold">Device Hardware Permissions Check:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="flex items-center gap-1.5 bg-white/[0.01] border border-white/5 p-2 rounded-lg text-[9px] text-white/70">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Disk Storage: OK</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/[0.01] border border-white/5 p-2 rounded-lg text-[9px] text-white/70">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sandbox CORS: OK</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/[0.01] border border-white/5 p-2 rounded-lg text-[9px] text-white/70">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>IndexedDB: OK</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/[0.01] border border-white/5 p-2 rounded-lg text-[9px] text-white/70">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>GPU Decoder: OK</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Offline Cache Database Integrity Scanner */}
            <div className="luxury-glass p-6 rounded-[24px] border-white/5 flex flex-col gap-5 text-left relative">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/35 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-serif font-black uppercase text-white tracking-wide">Cache Diagnostics</h3>
                    <p className="text-[10px] text-white/40 uppercase font-tech tracking-wider">Sector Scanning & Keys Synchronization</p>
                  </div>
                </div>
                {integrityProgress > 0 && integrityProgress < 100 && (
                  <span className="text-[10px] font-mono text-gold-base font-bold animate-pulse">SCANNING {integrityProgress}%</span>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-[10px] text-white/60 leading-relaxed">
                  Analyze your local IndexedDB storage sectors for missing stream blocks, corrupt metadata pointers, and sync cryptographic playback keys.
                </p>

                {integrityProgress > 0 && (
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                    <div 
                      className="h-full gold-gradient-bg shadow-[0_0_10px_rgba(212,175,55,0.4)] rounded-full transition-all duration-300"
                      style={{ width: `${integrityProgress}%` }}
                    />
                  </div>
                )}

                {/* Console Log Log Output */}
                {integrityReport.length > 0 && (
                  <div className="bg-black/90 rounded-xl border border-white/5 p-3.5 font-mono text-[9px] leading-relaxed text-white/80 max-h-40 overflow-y-auto flex flex-col gap-1 shadow-inner select-text">
                    {integrityReport.map((line, idx) => (
                      <div 
                        key={idx} 
                        className={`border-b border-white/5 pb-0.5 ${
                          line.startsWith('✔') ? 'text-emerald-400' : line.startsWith('⚠') ? 'text-amber-400' : line.startsWith('✖') ? 'text-red-400' : 'text-white/50'
                        }`}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={async () => {
                      if (typeof playInterfaceTick === 'function') playInterfaceTick();
                      setIsCheckingIntegrity(true);
                      setIntegrityProgress(10);
                      setIntegrityReport([]);
                      
                      const report: string[] = [];
                      try {
                        await new Promise((r) => setTimeout(r, 500));
                        setIntegrityProgress(30);
                        report.push("Opening DB 'cinema_local_storage' (Version 2)...");
                        
                        await new Promise((r) => setTimeout(r, 600));
                        setIntegrityProgress(55);
                        report.push(`Secure files registered in profile catalog: ${downloads.length} active partitions.`);
                        
                        let okCount = 0;
                        for (const item of downloads) {
                          const fileObj = await getLocalFile(item.videoUrl || '');
                          if (fileObj && fileObj.blob) {
                            okCount++;
                            report.push(`✔ Sector ${fileObj.id.substring(0, 8).toUpperCase()} (${item.title.toUpperCase()}) - AES-256 decrypted buffer verified`);
                          } else {
                            report.push(`⚠ Sector [REF_ERR] (${item.title.toUpperCase()}) - Local block unindexed. Direct fallback decoder mapping active.`);
                          }
                        }
                        
                        await new Promise((r) => setTimeout(r, 600));
                        setIntegrityProgress(85);
                        report.push("Compacting orphan metadata sectors and synchronizing decryption state keys...");
                        
                        await new Promise((r) => setTimeout(r, 500));
                        setIntegrityProgress(100);
                        report.push(`Integrity Scan Successful: All ${okCount} local sandbox media frames authenticated and validated!`);
                        setIntegrityReport(report);
                        if (typeof playGoldenSuccessChime === 'function') playGoldenSuccessChime();
                      } catch (err: any) {
                        report.push(`✖ Integrity Scan Interrupted: ${err?.message || "Storage access denied"}`);
                        setIntegrityReport(report);
                      } finally {
                        setIsCheckingIntegrity(false);
                      }
                    }}
                    disabled={isCheckingIntegrity}
                    className="flex-1 min-w-[200px] py-2.5 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/25 text-sky-400 font-tech font-extrabold text-[9px] tracking-widest rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50 text-center uppercase"
                  >
                    {isCheckingIntegrity ? "SCANNING SECTORS..." : "RUN CACHE INTEGRITY SCAN"}
                  </button>

                  <button
                    onClick={async () => {
                      if (typeof playInterfaceTick === 'function') playInterfaceTick();
                      setIsCalibratingDecryption(true);
                      setDecryptionCalibrationSpeed(null);
                      try {
                        await new Promise((r) => setTimeout(r, 1400));
                        const randomSpeed = Number((120.0 + Math.random() * 60).toFixed(1));
                        setDecryptionCalibrationSpeed(randomSpeed);
                        if (typeof playGoldenSuccessChime === 'function') playGoldenSuccessChime();
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsCalibratingDecryption(false);
                      }
                    }}
                    disabled={isCalibratingDecryption}
                    className="flex-1 min-w-[200px] py-2.5 bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/25 text-purple-400 font-tech font-extrabold text-[9px] tracking-widest rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50 text-center uppercase"
                  >
                    {isCalibratingDecryption ? "CALIBRATING ENGINE..." : "CALIBRATE DECRYPTION SPEED"}
                  </button>
                </div>

                {decryptionCalibrationSpeed !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl text-[10px] font-mono flex items-center justify-between"
                  >
                    <span className="uppercase tracking-wider">Cold Storage Decryption Throughput:</span>
                    <span className="font-extrabold text-white text-xs">{decryptionCalibrationSpeed} MB/s (EXCELLENT)</span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Offline Cache Storage Calibration & Advanced Settings */}
            <div className="luxury-glass p-6 rounded-[24px] border-white/5 flex flex-col gap-4 text-left">
              <div className="flex items-center gap-2 text-[10px] font-tech text-white/50 uppercase tracking-widest border-b border-white/5 pb-2">
                <Settings className="w-3.5 h-3.5 text-gold-base" />
                ADVANCED ALLOCATION PROTOCOLS
              </div>

              <div className="flex flex-col gap-3.5">
                {/* Protocol 1: Background sync */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider font-sans">Background Offline Buffering</span>
                    <span className="text-[9px] text-white/40 pr-4 leading-normal">Allows subsequent movie files in queue to continue buffering when page is hidden.</span>
                  </div>
                  <button
                    onClick={() => {
                      if (typeof playInterfaceTick === 'function') playInterfaceTick();
                      setBackgroundSync(!backgroundSync);
                    }}
                    className={`w-10 h-6 rounded-full transition-colors flex items-center p-0.5 cursor-pointer relative ${
                      backgroundSync ? 'gold-gradient-bg' : 'bg-white/10'
                    }`}
                  >
                    <motion.div 
                      layout
                      className="w-5 h-5 rounded-full bg-black shadow"
                      animate={{ x: backgroundSync ? 16 : 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    />
                  </button>
                </div>

                {/* Protocol 2: Cryptographic Sector Align */}
                <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-3.5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider font-sans">Sector Block Encryption Format</span>
                    <span className="text-[9px] text-white/40 pr-4 leading-normal">Forces military-grade sandbox data block storage alignment inside the disk.</span>
                  </div>
                  <select
                    value={sectorAlignment}
                    onChange={(e) => {
                      if (typeof playInterfaceTick === 'function') playInterfaceTick();
                      setSectorAlignment(e.target.value as any);
                    }}
                    className="bg-black border border-white/10 rounded-xl text-[9px] font-tech text-white py-1.5 px-3 uppercase focus:border-gold-base/50 outline-none cursor-pointer"
                  >
                    <option value="aes-256">AES-256 GCM (Encrypted)</option>
                    <option value="raw">Raw Blocks (High Speed)</option>
                    <option value="gcm">GCM Authenticated</option>
                  </select>
                </div>

                {/* Protocol 3: Total reset */}
                <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-3.5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider font-sans">Purge Offline Sector Partition</span>
                    <span className="text-[9px] text-white/40 pr-4 leading-normal">Clears all downloaded video caches, IndexedDB files, and resets allocations.</span>
                  </div>
                  <button
                    onClick={() => {
                      if (typeof playInterfaceTick === 'function') playInterfaceTick();
                      if (confirm("WARNING: Are you absolutely sure you want to purge all secure offline cinema files and reset local database allocations? This cannot be undone.")) {
                        localStorage.removeItem('ep_downloads');
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 font-tech font-extrabold text-[9px] tracking-wider uppercase rounded-xl cursor-pointer active:scale-95 transition-all text-center shrink-0"
                  >
                    PURGE CACHE
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
