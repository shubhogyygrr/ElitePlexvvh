import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  Bell,
  Radio,
  Cpu,
  Volume2,
  Image,
  Zap,
  Tv,
  Bookmark,
  Activity,
  Download,
  CreditCard,
  Fingerprint,
  MapPin,
  Lock,
  CheckCircle,
  X,
  Search,
  Sliders,
  Sparkles,
  Info,
  Mic
} from 'lucide-react';
import { PermissionItem } from '../lib/permissions';

// Dynamic icon lookup helper
const getPermissionIcon = (name: string) => {
  switch (name) {
    case 'Shield': return Shield;
    case 'HardDrive': return HardDrive;
    case 'Bell': return Bell;
    case 'Radio': return Radio;
    case 'Cpu': return Cpu;
    case 'Volume2': return Volume2;
    case 'Image': return Image;
    case 'Zap': return Zap;
    case 'Tv': return Tv;
    case 'Bookmark': return Bookmark;
    case 'Activity': return Activity;
    case 'Download': return Download;
    case 'CreditCard': return CreditCard;
    case 'Fingerprint': return Fingerprint;
    case 'MapPin': return MapPin;
    case 'Mic': return Mic;
    default: return Shield;
  }
};

interface PermissionsModalProps {
  isOpen: boolean;
  type: 'first-open' | 'settings' | 'action-prompt';
  promptTitle?: string;
  promptSubtitle?: string;
  permissionsList: PermissionItem[];
  onSave: (updated: PermissionItem[]) => void;
  onClose?: () => void;
  isDarkMode?: boolean;
}

export default function PermissionsModal({
  isOpen,
  type,
  promptTitle = "SECURITY ACCESS REQUIRED",
  promptSubtitle = "Elite Plex requires hardware and interface system authorizations to execute safely.",
  permissionsList,
  onSave,
  onClose,
  isDarkMode = true
}: PermissionsModalProps) {
  // Local state for permissions copy to allow modifications before saving
  const [localPermissions, setLocalPermissions] = useState<PermissionItem[]>(() => [...permissionsList]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('All');

  // Keep local state in sync when permissionsList prop changes (for prompt mode)
  React.useEffect(() => {
    setLocalPermissions([...permissionsList]);
  }, [permissionsList]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set(localPermissions.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [localPermissions]);

  // Filtered permissions
  const filteredPermissions = useMemo(() => {
    return localPermissions.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategoryTab === 'All' || p.category === activeCategoryTab;
      return matchesSearch && matchesCategory;
    });
  }, [localPermissions, searchQuery, activeCategoryTab]);

  // Toggle single permission status
  const togglePermission = async (id: string) => {
    let targetStatus: 'granted' | 'denied' | 'pending' | null = null;

    if (id === 'core-notifications') {
      if ('Notification' in window) {
        try {
          const res = await Notification.requestPermission();
          targetStatus = res === 'granted' ? 'granted' : 'denied';
        } catch (e) {
          console.error("Error requesting notifications:", e);
        }
      }
    } else if (id === 'subscribe-geo') {
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<any>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          if (pos) {
            targetStatus = 'granted';
          }
        } catch (e) {
          console.error("Error requesting geolocation:", e);
          targetStatus = 'denied';
        }
      }
    } else if (id === 'core-microphone') {
      targetStatus = 'granted';
      localStorage.setItem('ep_microphone_permission_granted', 'true');
      
      if ('mediaDevices' in navigator) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop all audio tracks immediately to release hardware
          stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.error("Error requesting microphone (gracefully caught for compatibility):", e);
        }
      }
    }

    setLocalPermissions(prev => prev.map(p => {
      if (p.id === id) {
        const nextStatus = targetStatus !== null ? targetStatus : (p.status === 'granted' ? 'denied' : 'granted');
        return { ...p, status: nextStatus };
      }
      return p;
    }));
  };

  // Grant all local permissions
  const grantAll = () => {
    setLocalPermissions(prev => prev.map(p => ({ ...p, status: 'granted' })));
  };

  // Deny all local permissions
  const denyAll = () => {
    setLocalPermissions(prev => prev.map(p => ({ ...p, status: 'denied' })));
  };

  // Handle saving
  const handleSaveAndSubmit = () => {
    // Check if core-microphone is granted in localPermissions
    const micPerm = localPermissions.find(p => p.id === 'core-microphone');
    if (micPerm) {
      if (micPerm.status === 'granted') {
        localStorage.setItem('ep_microphone_permission_granted', 'true');
      } else {
        localStorage.setItem('ep_microphone_permission_granted', 'false');
      }
    }
    onSave(localPermissions);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-4xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl ${
            isDarkMode ? 'bg-[#0a0a0a] text-white' : 'bg-white text-neutral-900'
          }`}
          style={{ maxHeight: '90vh' }}
        >
          {/* Top Decorative Border (Gold Gradient for Elite Plex aesthetic) */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700" />

          {/* Close button for settings / prompts */}
          {type !== 'first-open' && onClose && (
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white/60 hover:text-white" />
            </button>
          )}

          {/* Modal Layout split or full depending on type */}
          <div className="p-6 md:p-8 flex flex-col h-full overflow-y-auto" style={{ maxHeight: 'calc(90vh - 6px)' }}>
            
            {/* Header */}
            <div className="mb-6 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <div className="mx-auto md:mx-0 w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-amber-500 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] tracking-widest font-mono text-amber-500 uppercase font-black">
                    {type === 'first-open' ? 'SYSTEM INITIALIZATION' : type === 'settings' ? 'SECURITY CONSOLE' : 'AUTHORIZATION PROMPT'}
                  </span>
                  <h2 className="text-xl md:text-2xl font-serif font-black tracking-wider text-white uppercase">
                    {type === 'first-open' ? 'GLOBAL PERMISSION ACCESS PANEL' : promptTitle}
                  </h2>
                </div>
              </div>
              <p className="text-xs text-white/60 max-w-2xl leading-relaxed mt-2 font-sans">
                {type === 'first-open' 
                  ? 'Welcome to Elite Plex. To provide uninterrupted premium streaming, background downloading, spatial audio, and localized billing systems, please authorize our sandbox permission matrix.'
                  : promptSubtitle}
              </p>
            </div>

            {/* Main Action Block if prompt type */}
            {type === 'action-prompt' ? (
              <div className="flex-1 flex flex-col justify-between">
                <div className="my-4 bg-black/40 border border-white/5 rounded-2xl p-5">
                  <div className="text-[10px] font-mono text-white/40 mb-3 tracking-wider uppercase flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-500" />
                    Requested Sandbox Clearances ({localPermissions.length})
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {localPermissions.map((perm, idx) => {
                      const IconComponent = getPermissionIcon(perm.iconName);
                      const isGranted = perm.status === 'granted';
                      
                      return (
                        <div 
                          key={`perm-prompt-${perm.id}-${idx}`} 
                          className={`p-3 rounded-xl border transition-all duration-300 ${
                            isGranted 
                              ? 'bg-amber-500/5 border-amber-500/30 shadow-sm' 
                              : 'bg-white/5 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${isGranted ? 'bg-amber-500/10 text-amber-500' : 'bg-white/5 text-white/50'}`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold tracking-wide text-white truncate">{perm.name}</h4>
                              <p className="text-[10px] text-white/50 leading-relaxed mt-1 line-clamp-2">{perm.description}</p>
                              <div className="flex items-center justify-between mt-2.5">
                                <span className="text-[8px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-white/40 uppercase">
                                  {perm.category}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePermission(perm.id)}
                                  className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded-md transition-all font-bold ${
                                    isGranted 
                                      ? 'bg-amber-500 text-black font-extrabold shadow-md' 
                                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                                  }`}
                                >
                                  {isGranted ? 'AUTHORIZED' : 'GRANT'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={grantAll}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-yellow-400 text-black text-xs font-mono font-black tracking-widest uppercase rounded-xl transition-all shadow-lg active:scale-95"
                  >
                    GRANT ALL REQUESTED
                  </button>
                  <button
                    onClick={handleSaveAndSubmit}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-mono font-black tracking-widest uppercase rounded-xl transition-all"
                  >
                    CONFIRM & PROCEED
                  </button>
                </div>
              </div>
            ) : (
              // First Open and Settings Full Management Layout
              <div className="flex-1 flex flex-col min-h-0">
                {/* Dashboard Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3.5 mb-5 items-center">
                  <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search simulated hardware / system permissions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-amber-500/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/30 outline-none transition-all font-sans"
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={grantAll}
                      className="flex-1 sm:flex-none px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black rounded-lg text-[10px] font-mono tracking-wider uppercase font-black transition-all"
                    >
                      Authorize All (27)
                    </button>
                    <button
                      onClick={denyAll}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-500/5 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg text-[10px] font-mono tracking-wider uppercase font-bold transition-all"
                    >
                      Reset All
                    </button>
                  </div>
                </div>

                {/* Category Navigation Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-thin">
                  {categories.map((cat, idx) => (
                    <button
                      key={`perm-cat-${cat}-${idx}`}
                      onClick={() => setActiveCategoryTab(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wider uppercase font-extrabold whitespace-nowrap transition-all ${
                        activeCategoryTab === cat 
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10' 
                          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Permissions Grid Panel */}
                <div className="flex-1 overflow-y-auto max-h-[350px] pr-1.5 border border-white/5 bg-black/30 rounded-2xl p-4">
                  {filteredPermissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-white/40">
                      <Sliders className="w-8 h-8 text-white/20 mb-2 animate-bounce" />
                      <p className="text-xs font-mono uppercase tracking-widest">No matching permissions found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredPermissions.map((perm, idx) => {
                        const IconComponent = getPermissionIcon(perm.iconName);
                        const isGranted = perm.status === 'granted';

                        return (
                          <div 
                            key={`perm-settings-${perm.id}-${idx}`} 
                            onClick={() => togglePermission(perm.id)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 ${
                              isGranted 
                                ? 'bg-amber-500/[0.04] border-amber-500/35 shadow-sm shadow-amber-500/5' 
                                : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg transition-colors ${
                                isGranted ? 'bg-amber-500/10 text-amber-400' : 'bg-white/5 text-white/40'
                              }`}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="text-xs font-bold tracking-wide text-white truncate">{perm.name}</h4>
                                  <div className={`w-2.5 h-2.5 rounded-full ${isGranted ? 'bg-amber-500 animate-pulse' : 'bg-neutral-700'}`} />
                                </div>
                                <p className="text-[10px] text-white/55 leading-relaxed mt-1">{perm.description}</p>
                                <div className="flex items-center justify-between mt-3">
                                  <span className="text-[8px] font-mono bg-white/5 border border-white/5 px-2 py-0.5 rounded text-white/40 uppercase">
                                    {perm.category}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[9px] font-mono font-black tracking-wider ${isGranted ? 'text-amber-500' : 'text-white/40'}`}>
                                      {isGranted ? 'AUTHORIZED' : 'DISABLED'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-white/40 font-mono text-[9px] tracking-wider uppercase">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span>
                      {localPermissions.filter(p => p.status === 'granted').length} of {localPermissions.length} Authorized
                    </span>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    {type === 'settings' && onClose && (
                      <button
                        onClick={onClose}
                        className="flex-1 sm:flex-none px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold tracking-widest uppercase rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={handleSaveAndSubmit}
                      className="flex-1 sm:flex-none px-8 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-yellow-400 text-black text-xs font-mono font-black tracking-widest uppercase rounded-xl transition-all shadow-md active:scale-95"
                    >
                      {type === 'first-open' ? 'SAVE & LAUNCH APP' : 'SAVE CHANGES'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
