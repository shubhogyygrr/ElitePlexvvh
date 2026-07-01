import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Movie } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import {
  User, Settings, Sparkles, HardDrive, Bell, Eye, LogOut,
  ChevronRight, Volume2, Shield, Languages, Globe, RefreshCw, Crown,
  Trash2, X, AlertTriangle, Sun, Moon, Palette, Play, Search, Check, Activity, Server,
  Clock, Monitor, Calendar, Download, Upload, Zap, Tv, Key, Cookie, Database
} from 'lucide-react';
import { 
  addMovieRequestToFirestore, 
  addSubscribeRequestToFirestore,
  getAllUsersFromFirestore,
  deleteUserFromFirestore,
  updateUserPremiumStatusInFirestore,
  updateUserAutoRenewInFirestore,
  redeemCodeInFirestore,
  getUserProfileFromFirestore,
  getUserRedeemedCodesFromFirestore,
  getUserSubscribeRequestsFromFirestore,
  saveAdminCredentials,
  getAdminCredentials
} from '../lib/firestoreService';
import { 
  isSoundEnabled, 
  setSoundEnabled, 
  playToggleBeep, 
  playInterfaceTick, 
  playCinematicSwell, 
  playGoldenSuccessChime 
} from '../lib/soundEffects';
import { translateText } from '../lib/translator';
import { safeLocalStorage as localStorage } from '../lib/safeStorage';

interface LanguageOption {
  id: string;
  name: string;
  native: string;
  code: string;
  premium?: boolean;
}

const LANGUAGES: LanguageOption[] = [
  { id: 'English', name: 'English', native: 'English (US)', code: 'EN' },
  { id: 'Bengali', name: 'Bengali', native: 'বাঙালি', code: 'BN' },
  { id: 'Spanish', name: 'Spanish', native: 'Español', code: 'ES' },
  { id: 'French', name: 'French', native: 'Français', code: 'FR', premium: true },
  { id: 'German', name: 'German', native: 'Deutsch', code: 'DE', premium: true },
  { id: 'Japanese', name: 'Japanese', native: '日本語', code: 'JA', premium: true },
  { id: 'Korean', name: 'Korean', native: '한국어', code: 'KO', premium: true },
  { id: 'Chinese', name: 'Chinese', native: '简体中文', code: 'ZH', premium: true },
  { id: 'Hindi', name: 'Hindi', native: 'हिन्दी', code: 'HI', premium: true },
  { id: 'Arabic', name: 'Arabic', native: 'العربية', code: 'AR', premium: true },
  { id: 'Portuguese', name: 'Portuguese', native: 'Português', code: 'PT', premium: true },
  { id: 'Italian', name: 'Italian', native: 'Italiano', code: 'IT', premium: true },
  { id: 'Russian', name: 'Russian', native: 'Русский', code: 'RU', premium: true },
  { id: 'Turkish', name: 'Turkish', native: 'Türkçe', code: 'TR', premium: true },
  { id: 'Vietnamese', name: 'Vietnamese', native: 'Tiếng Việt', code: 'VI', premium: true },
  { id: 'Thai', name: 'Thai', native: 'ไทย', code: 'TH', premium: true },
  { id: 'Indonesian', name: 'Indonesian', native: 'Bahasa Indonesia', code: 'ID', premium: true },
  { id: 'Malay', name: 'Malay', native: 'Bahasa Melayu', code: 'MS', premium: true },
  { id: 'Filipino', name: 'Filipino', native: 'Filipino (Tagalog)', code: 'TL', premium: true },
  { id: 'Dutch', name: 'Dutch', native: 'Nederlands', code: 'NL', premium: true },
  { id: 'Swedish', name: 'Swedish', native: 'Svenska', code: 'SV', premium: true },
  { id: 'Polish', name: 'Polish', native: 'Polski', code: 'PL', premium: true },
  { id: 'Ukrainian', name: 'Ukrainian', native: 'Українська', code: 'UK', premium: true },
  { id: 'Hebrew', name: 'Hebrew', native: 'עברית', code: 'HE', premium: true },
  { id: 'Greek', name: 'Greek', native: 'Ελληνικά', code: 'EL', premium: true },
  { id: 'Persian', name: 'Persian', native: 'فারসি', code: 'FA', premium: true },
  { id: 'Urdu', name: 'Urdu', native: 'اردو', code: 'UR', premium: true },
  { id: 'Tamil', name: 'Tamil', native: 'தமிழ்', code: 'TA', premium: true },
  { id: 'Danish', name: 'Danish', native: 'Dansk', code: 'DA', premium: true },
  { id: 'Finnish', name: 'Finnish', native: 'Suomi', code: 'FI', premium: true },
  { id: 'Norwegian', name: 'Norwegian', native: 'Norsk', code: 'NO', premium: true },
  { id: 'Hungarian', name: 'Hungarian', native: 'Magyar', code: 'HU', premium: true },
  { id: 'Romanian', name: 'Romanian', native: 'Română', code: 'RO', premium: true },
  { id: 'Czech', name: 'Czech', native: 'Čeština', code: 'CS', premium: true },
  { id: 'Slovak', name: 'Slovak', native: 'Slovenčina', code: 'SK', premium: true },
  { id: 'Catalan', name: 'Catalan', native: 'Català', code: 'CA', premium: true },
  { id: 'Croatian', name: 'Croatian', native: 'Hrvatski', code: 'HR', premium: true },
  { id: 'Bulgarian', name: 'Bulgarian', native: 'Български', code: 'BG', premium: true }
];

interface ProfileViewProps {
  currentUser: UserProfile;
  onSwitchProfile: (user?: UserProfile) => void;
  onUpgradePrompt: () => void;
  watchHistory: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie?: (movie: Movie) => void;
  onOpenDownloads: () => void;
  onOpenFavorites: () => void;
  onOpenAdmin: () => void;
  onOpenServers?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  customDayBg?: string;
  setCustomDayBg?: (color: string) => void;
  customNightBg?: string;
  setCustomNightBg?: (color: string) => void;
  customAccent?: string;
  setCustomAccent?: (color: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  onOpenPermissions?: () => void;
  preOpenLanguage?: boolean;
  onLanguageViewed?: () => void;
  onOpenAIVoiceAssistant?: () => void;
  syncWithSystem?: boolean;
  setSyncWithSystem?: (val: boolean) => void;
  autoThemeScheduler?: boolean;
  setAutoThemeScheduler?: (val: boolean) => void;
  autoThemeStartHour?: number;
  setAutoThemeStartHour?: (val: number) => void;
  autoThemeEndHour?: number;
  setAutoThemeEndHour?: (val: number) => void;
  onOpenPremiumWalkthrough?: () => void;
  onImportWatchHistory?: (history: Movie[]) => void;
  onOpenCookieSupport?: () => void;
  offlineMode?: boolean;
  onToggleOfflineMode?: (val: boolean) => void;
}

export default function ProfileView({
  currentUser,
  onSwitchProfile,
  onUpgradePrompt,
  watchHistory,
  onSelectMovie,
  onOpenDownloads,
  onOpenFavorites,
  onOpenAdmin,
  onOpenServers,
  isDarkMode,
  onToggleTheme,
  customDayBg,
  setCustomDayBg,
  onImportWatchHistory,
  customNightBg,
  setCustomNightBg,
  customAccent,
  setCustomAccent,
  language,
  onLanguageChange,
  onOpenPermissions,
  preOpenLanguage,
  onLanguageViewed,
  onOpenAIVoiceAssistant,
  syncWithSystem = false,
  setSyncWithSystem,
  autoThemeScheduler = false,
  setAutoThemeScheduler,
  autoThemeStartHour = 18,
  setAutoThemeStartHour,
  autoThemeEndHour = 6,
  setAutoThemeEndHour,
  onOpenPremiumWalkthrough,
  onOpenCookieSupport,
  onPlayMovie,
  offlineMode = false,
  onToggleOfflineMode
}: ProfileViewProps) {
  // Settings Preferences States
  const [autoplay, setAutoplay] = useState(true);
  const [premiumStream, setPremiumStream] = useState(true);
  const [showLanguageView, setShowLanguageView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheSize, setCacheSize] = useState('1.42 GB');
  const [showSettingsPage, setShowSettingsPage] = useState(false);

  // VIP Premium Features state variables
  const [spatialAudio, setSpatialAudio] = useState(() => localStorage.getItem('ep_spatial_audio') !== 'false');
  const [preBuffer, setPreBuffer] = useState(() => localStorage.getItem('ep_pre_buffer') !== 'false');
  const [uhdMode, setUhdMode] = useState(() => localStorage.getItem('ep_uhd_mode') !== 'false');
  const [hapticSync, setHapticSync] = useState(() => localStorage.getItem('ep_haptic_sync') === 'true');
  const [hdrBitrate, setHdrBitrate] = useState(() => localStorage.getItem('ep_hdr_bitrate') || '50mbps');
  const [aiAccent, setAiAccent] = useState(() => localStorage.getItem('ep_ai_accent') || 'british');
  const [ambientLight, setAmbientLight] = useState(() => localStorage.getItem('ep_ambient_light') !== 'false');
  const [vipRelay, setVipRelay] = useState(() => localStorage.getItem('ep_vip_relay') || 'tokyo');

  React.useEffect(() => {
    localStorage.setItem('ep_spatial_audio', spatialAudio ? 'true' : 'false');
  }, [spatialAudio]);

  React.useEffect(() => {
    localStorage.setItem('ep_pre_buffer', preBuffer ? 'true' : 'false');
  }, [preBuffer]);

  React.useEffect(() => {
    localStorage.setItem('ep_uhd_mode', uhdMode ? 'true' : 'false');
  }, [uhdMode]);

  React.useEffect(() => {
    localStorage.setItem('ep_haptic_sync', hapticSync ? 'true' : 'false');
  }, [hapticSync]);

  React.useEffect(() => {
    localStorage.setItem('ep_hdr_bitrate', hdrBitrate);
  }, [hdrBitrate]);

  React.useEffect(() => {
    localStorage.setItem('ep_ai_accent', aiAccent);
  }, [aiAccent]);

  React.useEffect(() => {
    localStorage.setItem('ep_ambient_light', ambientLight ? 'true' : 'false');
  }, [ambientLight]);

  React.useEffect(() => {
    localStorage.setItem('ep_vip_relay', vipRelay);
  }, [vipRelay]);

  const [showBulkImportHistory, setShowBulkImportHistory] = useState(false);
  const [bulkHistoryJson, setBulkHistoryJson] = useState("");

  const isAdmin = currentUser && (
    currentUser.isAdmin || 
    currentUser.name === 'Premium Chief' || 
    currentUser.email?.toLowerCase().includes('admin')
  );

  const chartData = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    if (watchHistory && watchHistory.length > 0) {
      watchHistory.forEach(movie => {
        if (movie.genres && Array.isArray(movie.genres)) {
          movie.genres.forEach(g => {
            counts[g] = (counts[g] || 0) + 1;
          });
        }
      });
    } else {
      counts['Cinematic'] = 5;
      counts['Action'] = 3;
      counts['Sci-Fi'] = 4;
      counts['Drama'] = 2;
      counts['Thriller'] = 3;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [watchHistory]);

  const PIE_COLORS = [
    'var(--custom-accent, #D4AF37)',
    '#AA7C11',
    '#F5E6C4',
    '#3B0764',
    '#8B5CF6',
    '#10B981',
    '#3B82F6',
    '#EF4444',
  ];

  React.useEffect(() => {
    if (preOpenLanguage) {
      setShowLanguageView(true);
      if (onLanguageViewed) {
        onLanguageViewed();
      }
    }
  }, [preOpenLanguage, onLanguageViewed]);

  const [redeemedCodes, setRedeemedCodes] = useState<any[]>([]);
  const [subscribeRequests, setSubscribeRequests] = useState<any[]>([]);
  const [isRedeemsLoading, setIsRedeemsLoading] = useState(false);
  const [isPlansLoading, setIsPlansLoading] = useState(false);

  const fetchUserData = React.useCallback(async () => {
    if (!currentUser.id) return;
    setIsRedeemsLoading(true);
    setIsPlansLoading(true);
    try {
      const redeems = await getUserRedeemedCodesFromFirestore(currentUser.id);
      setRedeemedCodes(redeems);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRedeemsLoading(false);
    }

    try {
      const plans = await getUserSubscribeRequestsFromFirestore(currentUser.id);
      setSubscribeRequests(plans);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlansLoading(false);
    }
  }, [currentUser.id]);

  React.useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Realtime Expiration Countdown State
  const [countdownText, setCountdownText] = useState('');

  React.useEffect(() => {
    if (!currentUser.isPremium) {
      setCountdownText('');
      return;
    }

    const calculateCountdown = () => {
      // Use premiumExpiry if present, otherwise fall back to a stored or new 30-day countdown
      const storageKey = `ep_premium_expiry_${currentUser.id || currentUser.email || 'guest'}`;
      let expiry = currentUser.premiumExpiry;
      
      if (!expiry) {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          expiry = parseInt(cached, 10);
        } else {
          expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
          localStorage.setItem(storageKey, String(expiry));
        }
      } else {
        localStorage.setItem(storageKey, String(expiry));
      }

      const remaining = expiry - Date.now();

      if (remaining <= 0) {
        setCountdownText('EXPIRED');
        if (currentUser.isPremium) {
          updateUserPremiumStatusInFirestore(currentUser.id, false, 0)
            .then(() => {
              onSwitchProfile({ ...currentUser, isPremium: false, premiumExpiry: 0 });
            })
            .catch((err) => console.error("Error auto-expiring premium status:", err));
        }
        return;
      }

      const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

      setCountdownText(
        `${days}d ${hours}h ${minutes}m ${seconds}s`
      );
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [currentUser.isPremium, currentUser.premiumExpiry, currentUser.id, currentUser.email]);

  // Auto-Renew Settings State
  const [isUpdatingAutoRenew, setIsUpdatingAutoRenew] = useState(false);
  const handleToggleAutoRenew = async () => {
    try {
      setIsUpdatingAutoRenew(true);
      if (typeof playInterfaceTick === 'function') playInterfaceTick();
      const nextVal = !currentUser.autoRenew;
      await updateUserAutoRenewInFirestore(currentUser.id, nextVal);
      onSwitchProfile({ ...currentUser, autoRenew: nextVal });
    } catch (err) {
      console.error("Error toggling auto-renew:", err);
    } finally {
      setIsUpdatingAutoRenew(false);
    }
  };

  // Modals States
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  
  // Redeem Code States
  const [redeemCode, setRedeemCode] = useState('');
  const [submittingRedeem, setSubmittingRedeem] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  // User lists state for Switching Accounts
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Local list of saved device accounts for Account Exchange
  const [localSavedUsers, setLocalSavedUsers] = useState<UserProfile[]>([]);
  const [isAddingIdentity, setIsAddingIdentity] = useState(false);
  const [newIdentityName, setNewIdentityName] = useState('');
  const [newIdentityEmail, setNewIdentityEmail] = useState('');

  React.useEffect(() => {
    try {
      const savedStr = localStorage.getItem('ep_device_saved_users');
      let saved: UserProfile[] = [];
      if (savedStr) {
        saved = JSON.parse(savedStr);
      }
      if (!Array.isArray(saved)) saved = [];
      
      if (currentUser) {
        const index = saved.findIndex(u => u.id === currentUser.id);
        if (index >= 0) {
          // Sync all up-to-date fields (isAdmin, isPremium, etc.)
          saved[index] = { ...saved[index], ...currentUser };
        } else {
          saved.push(currentUser);
        }
        localStorage.setItem('ep_device_saved_users', JSON.stringify(saved));
      }
      setLocalSavedUsers(saved);
    } catch (e) {
      console.error("Failed to load local saved users:", e);
    }
  }, [currentUser]);

  const handleAddNewIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdentityName.trim() || !newIdentityEmail.trim()) return;
    const name = newIdentityName.trim();
    const email = newIdentityEmail.trim();

    const newId = `usr_${Date.now()}`;
    const newProfile: UserProfile = {
      id: newId,
      name,
      email,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80`,
      isPremium: false,
      premiumExpiry: 0,
    };

    const updatedList = [...localSavedUsers, newProfile];
    localStorage.setItem('ep_device_saved_users', JSON.stringify(updatedList));
    setLocalSavedUsers(updatedList);
    setNewIdentityName('');
    setNewIdentityEmail('');
    setIsAddingIdentity(false);

    // Switch to it
    onSwitchProfile(newProfile);
    alert(`Switched system identity to ${name.toUpperCase()} successfully!`);
  };

  const handleOpenSwitchModal = async () => {
    setShowSwitchModal(true);
    setLoadingUsers(true);
    try {
      // Get saved users from device localStorage
      const savedStr = localStorage.getItem('ep_device_saved_users');
      let savedUsers: UserProfile[] = [];
      if (savedStr) {
        try {
          savedUsers = JSON.parse(savedStr);
        } catch (e) {
          savedUsers = [];
        }
      }
      
      if (!Array.isArray(savedUsers)) {
        savedUsers = [];
      }

      // Ensure current user is in the list
      if (currentUser && !savedUsers.some(u => u.id === currentUser.id)) {
        savedUsers.push(currentUser);
        localStorage.setItem('ep_device_saved_users', JSON.stringify(savedUsers));
      }
      
      setUsersList(savedUsers);
    } catch (error) {
      console.error("Error loading users for profile switching:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.id) return;
    setDeletingAccount(true);
    try {
      await deleteUserFromFirestore(currentUser.id);
      
      // Remove from device saved list in localStorage
      const savedStr = localStorage.getItem('ep_device_saved_users');
      if (savedStr) {
        try {
          let savedUsers: UserProfile[] = JSON.parse(savedStr);
          if (Array.isArray(savedUsers)) {
            savedUsers = savedUsers.filter(u => u.id !== currentUser.id);
            localStorage.setItem('ep_device_saved_users', JSON.stringify(savedUsers));
          }
        } catch (e) {
          console.error(e);
        }
      }

      setShowDeleteModal(false);
      onSwitchProfile(); // trigger logout / profile clear
      alert("Your account has been deleted permanently.");
    } catch (error) {
      console.error("Error deleting user account:", error);
      alert("An error occurred while deleting your account. Please try again.");
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleRedeemCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;
    setSubmittingRedeem(true);
    setRedeemError(null);
    setRedeemSuccess(false);

    const code = redeemCode.trim().toUpperCase();

    try {
      if (!currentUser?.id) {
        throw new Error("No active user session.");
      }

      // Execute live Firestore-backed redemption!
      const result = await redeemCodeInFirestore(code, currentUser.id, currentUser.email || 'guest@example.com');
      
      if (!result.success) {
        setRedeemError(result.message.toUpperCase());
        setSubmittingRedeem(false);
        return;
      }
      
      // Fetch latest profile state from Firestore to get updated premium status & expiry days count!
      const latestProfile = await getUserProfileFromFirestore(currentUser.id);
      const updatedUser = latestProfile || { ...currentUser, isPremium: true };
      
      setRedeemSuccess(true);
      setRedeemCode('');
      playGoldenSuccessChime();
      
      alert(result.message);

      setTimeout(() => {
        setShowRedeemModal(false);
        // Sync state to App.tsx and local storage device state
        onSwitchProfile(updatedUser);
        fetchUserData();
      }, 1500);
    } catch (err: any) {
      console.error("Redeem error:", err);
      setRedeemError(err?.message?.toUpperCase() || 'REDEMPTION TRANSACTION FAILED. TRY AGAIN.');
    } finally {
      setSubmittingRedeem(false);
    }
  };

  const handleClearCache = () => {
    setClearingCache(true);
    setTimeout(() => {
      setClearingCache(false);
      setCacheSize('0.00 MB');
      playGoldenSuccessChime();
      alert('Local video cache buffers successfully flushed!');
    }, 1200);
  };

  // Requests States
  const [reqTitle, setReqTitle] = useState('');
  const [reqType, setReqType] = useState<'movie' | 'series'>('movie');
  const [reqNotes, setReqNotes] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);

  // Subscription Requests States
  const [submittingSubRequest, setSubmittingSubRequest] = useState(false);
  const [subRequestSuccess, setSubRequestSuccess] = useState(false);

  const handleSendSubscriptionRequest = async () => {
    if (!currentUser?.id) {
      alert("Invalid user session. Please log in again.");
      return;
    }
    setSubmittingSubRequest(true);
    setSubRequestSuccess(false);
    try {
      await addSubscribeRequestToFirestore({
        userId: currentUser.id,
        name: currentUser.name || 'Anonymous User',
        email: currentUser.email || 'guest@example.com',
        planId: 'ep_plex_vip',
        planName: 'EP PLEX VIP ACCESS',
        status: 'pending',
        createdAt: new Date().toISOString(),
        requestNotes: `Requested subscription activation from profile screen.`
      });
      setSubRequestSuccess(true);
      fetchUserData();
      setTimeout(() => setSubRequestSuccess(false), 5000);
    } catch (err) {
      console.error("Error submitting subscription request:", err);
      alert("Failed to submit subscription request. Please check connection.");
    } finally {
      setSubmittingSubRequest(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim()) return;
    setSubmittingReq(true);
    setReqSuccess(false);

    try {
      await addMovieRequestToFirestore({
        title: reqTitle.trim(),
        type: reqType,
        requestedBy: currentUser.name || 'Anonymous Guest',
        userEmail: currentUser.email || 'guest@example.com',
        status: 'pending',
        createdAt: new Date().toISOString(),
        notes: reqNotes.trim() || undefined
      });
      setReqSuccess(true);
      setReqTitle('');
      setReqNotes('');
      setTimeout(() => setReqSuccess(false), 4000);
    } catch (err) {
      console.error("Error submitting movie request:", err);
      alert("Failed to submit request to database. Please check connection.");
    } finally {
      setSubmittingReq(false);
    }
  };

  // If Language Selection Page is active, show the dedicated full-screen LanguageView
  if (showLanguageView) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className={`pb-32 px-4 pt-6 max-w-2xl mx-auto flex flex-col gap-6 w-full min-w-0 min-h-screen ${
          isDarkMode ? 'text-white' : 'text-black'
        }`}
      >
        {/* Full Screen Header */}
        <div className={`flex items-center justify-between border-b pb-4 ${
          isDarkMode ? 'border-white/10' : 'border-black/10'
        }`}>
          <button
            onClick={() => {
              playInterfaceTick();
              setShowLanguageView(false);
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 text-[10px] font-tech font-bold tracking-widest px-4 py-2.5 rounded-full border cursor-pointer active:scale-95 transition-all ${
              isDarkMode 
                ? 'bg-white/5 border-white/10 text-gold-base hover:bg-white/10' 
                : 'bg-black/5 border-black/10 text-gold-dark hover:bg-black/10'
            }`}
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            {translateText("BACK", language).toUpperCase()}
          </button>
          <div className="flex flex-col items-center text-center">
            <h2 className={`text-xs sm:text-sm font-serif font-black tracking-widest uppercase flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-black'
            }`}>
              <Globe className="w-4 h-4 text-gold-base animate-pulse" />
              {translateText("Select App Language", language)}
            </h2>
            <p className={`text-[8px] uppercase tracking-widest font-tech mt-0.5 ${
              isDarkMode ? 'text-white/40' : 'text-black/55'
            }`}>
              {LANGUAGES.length} {translateText("INTERACTIVE DECRYPTION SYSTEMS", language)}
            </p>
          </div>
          <div className="w-16" /> {/* Spacer */}
        </div>

        {/* Real-time Search Box */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-base/50" />
          <input
            type="text"
            placeholder={translateText("Search among 38 available languages...", language)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full border rounded-2xl pl-10 pr-10 py-3.5 text-xs placeholder-white/30 focus:outline-none focus:border-gold-base/50 shadow-inner ${
              isDarkMode 
                ? 'bg-[#14100c] border-gold-base/20 text-white placeholder-white/30' 
                : 'bg-white border-gold-base/40 text-black placeholder-black/40'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                isDarkMode ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Popular / Fast Access Row */}
        {searchQuery === '' && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 px-1">
              <Sparkles className="w-3.5 h-3.5 text-gold-base animate-pulse" />
              <span className={`text-[10px] uppercase font-tech font-extrabold tracking-widest ${
                isDarkMode ? 'text-white/40' : 'text-black/55'
              }`}>
                {translateText("Popular Scripts", language)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.filter(l => ['English', 'Bengali', 'Spanish', 'French', 'Hindi', 'Japanese'].includes(l.id)).map((lang) => {
                const isSelected = language === lang.id;
                return (
                  <motion.button
                    key={`pop-${lang.id}`}
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      playInterfaceTick();
                      if (lang.premium && !currentUser.isPremium) {
                        onUpgradePrompt();
                        alert("Premium Decryption Script: This language script is locked for Standard License holders. Please activate Elite VIP Inner Circle access to unlock 35+ premium scripts!");
                        return;
                      }
                      onLanguageChange(lang.id);
                    }}
                    className={`flex items-center justify-between gap-1.5 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-gold-base bg-gold-base/10 text-gold-base shadow-[0_0_10px_rgba(212,175,55,0.1)]'
                        : isDarkMode
                          ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 text-white'
                          : 'border-black/5 bg-white hover:bg-black/[0.01] hover:border-black/10 text-black shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10.5px] font-bold truncate leading-none">{lang.name}</span>
                      <span className={`text-[8px] mt-0.5 truncate leading-none ${isSelected ? 'text-gold-base/70' : isDarkMode ? 'text-white/40' : 'text-black/50'}`}>{lang.native}</span>
                    </div>
                    <span className={`text-[8px] font-tech font-black px-1.5 py-0.5 rounded ${
                      isSelected 
                        ? 'bg-gold-base/20 border border-gold-base/30 text-gold-base' 
                        : isDarkMode
                          ? 'bg-white/5 border border-white/5 text-white/45'
                          : 'bg-black/5 border border-black/5 text-black/50'
                    }`}>
                      {lang.code}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Language Selection Grid */}
        <div className="flex-1 w-full my-2">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 max-h-[42vh] overflow-y-auto pr-1">
            {LANGUAGES.filter(lang => 
              lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              lang.native.toLowerCase().includes(searchQuery.toLowerCase()) ||
              lang.code.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((lang) => {
              const isSelected = language === lang.id;
              return (
                <motion.div
                  key={lang.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playInterfaceTick();
                    if (lang.premium && !currentUser.isPremium) {
                      onUpgradePrompt();
                      alert("Premium Decryption Script: This language script is locked for Standard License holders. Please activate Elite VIP Inner Circle access to unlock 35+ premium scripts!");
                      return;
                    }
                    onLanguageChange(lang.id);
                  }}
                  className={`relative rounded-2xl p-4 border cursor-pointer flex flex-col gap-2 transition-all group ${
                    isSelected
                      ? 'border-gold-base bg-gold-base/10 text-gold-base shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                      : isDarkMode
                        ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 text-white'
                        : 'border-black/10 bg-white hover:bg-black/[0.02] hover:border-black/15 text-black shadow-sm'
                  }`}
                >
                  {/* Language Code Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-tech font-extrabold px-2 py-0.5 rounded-md border ${
                      isSelected 
                        ? 'bg-gold-base/20 border-gold-base/30 text-gold-base' 
                        : isDarkMode
                          ? 'bg-white/5 border-white/10 text-white/50 group-hover:text-white group-hover:border-white/20'
                          : 'bg-black/5 border-black/10 text-black/55 group-hover:text-black group-hover:border-black/20'
                    }`}>
                      {lang.code}
                    </span>
                    {lang.premium && (
                      <span className="text-[7.5px] font-tech bg-[#9d4edd]/20 border border-[#9d4edd]/40 text-[#c77dff] px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold">
                        {translateText("PREMIUM", language)}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-4 h-4 text-gold-base animate-pulse shrink-0" />
                    )}
                  </div>

                  {/* Name and Native Script */}
                  <div className="flex flex-col mt-1">
                    <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-gold-base' : isDarkMode ? 'text-white' : 'text-black'}`}>
                      {lang.name}
                    </span>
                    <span className={`text-[10.5px] mt-0.5 font-sans ${isSelected ? 'text-gold-base/75' : isDarkMode ? 'text-white/40 group-hover:text-white/60' : 'text-black/50 group-hover:text-black/70'}`}>
                      {lang.native}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* No results state */}
          {LANGUAGES.filter(lang => 
            lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            lang.native.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lang.code.toLowerCase().includes(searchQuery.toLowerCase())
          ).length === 0 && (
            <div className={`py-12 text-center text-xs font-tech border border-dashed rounded-2xl ${
              isDarkMode ? 'text-white/35 border-white/5' : 'text-black/45 border-black/10'
            }`}>
              {translateText("No decryption languages matching", language)} "{searchQuery}" {translateText("detected", language)}.
            </div>
          )}
        </div>

        {/* Interactive Translation Preview Banner */}
        <div className={`p-4 rounded-2xl border flex flex-col gap-2.5 mt-1 transition-all duration-300 relative overflow-hidden ${
          isDarkMode
            ? 'bg-[#14100c]/80 border-gold-base/15 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
            : 'bg-white border-gold-base/20 shadow-[0_4px_30px_rgba(212,175,55,0.04)]'
        }`}>
          {/* Accent Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-base/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-gold-base animate-spin" style={{ animationDuration: '10s' }} />
              <span className={`text-[9px] uppercase font-tech font-black tracking-widest ${
                isDarkMode ? 'text-white/40' : 'text-black/55'
              }`}>
                {translateText("Live Interface Preview", language)}
              </span>
            </div>
            <span className="text-[7.5px] font-tech text-gold-base/80 border border-gold-base/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
              {translateText("Active Translation Stream", language)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-0.5">
            {[
              { label: 'Home Tab', original: 'Home', translated: translateText('Home', language) },
              { label: 'Live TV', original: 'Live Channels', translated: translateText('Live Channels', language) },
              { label: 'My Watchlist', original: 'My Watchlist', translated: translateText('My Watchlist', language) },
              { label: 'Trending', original: 'Trending Now', translated: translateText('Trending Now', language) }
            ].map((item, index) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-2 rounded-xl border ${
                  isDarkMode 
                    ? 'bg-black/40 border-white/[0.03]' 
                    : 'bg-black/[0.01] border-black/[0.03]'
                }`}
              >
                <div className="flex flex-col">
                  <span className={`text-[7px] uppercase font-tech tracking-wider ${isDarkMode ? 'text-white/30' : 'text-black/40'}`}>
                    {item.label}
                  </span>
                  <span className={`text-[9px] font-mono leading-none mt-0.5 ${isDarkMode ? 'text-white/50' : 'text-black/60'}`}>
                    {item.original}
                  </span>
                </div>
                <ChevronRight className="w-3 h-3 text-gold-base/45" />
                <span className="text-[10px] font-bold text-gold-base leading-none text-right truncate max-w-[85px]">
                  {item.translated}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Footer */}
        <div className={`border-t pt-4 flex items-center justify-between gap-4 pb-4 sticky bottom-0 ${
          isDarkMode ? 'border-white/10 bg-black/95' : 'border-black/10 bg-[#f7f6f2]/95'
        }`}>
          <div className="flex flex-col">
            <span className={`text-[9px] font-tech uppercase tracking-widest ${
              isDarkMode ? 'text-white/40' : 'text-black/55'
            }`}>{translateText("Selected Decryption Script", language)}</span>
            <span className="text-xs font-bold text-gold-base uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              {LANGUAGES.find(l => l.id === language)?.name || language}
            </span>
          </div>
          <button
            onClick={() => {
              playGoldenSuccessChime();
              setShowLanguageView(false);
              setSearchQuery('');
            }}
            className="gold-gradient-bg text-black text-[11px] sm:text-xs font-bold font-tech tracking-widest px-6 py-3 rounded-full hover:brightness-110 active:scale-95 cursor-pointer transition-all uppercase flex items-center gap-2 shadow-[0_4px_20px_rgba(212,175,55,0.35)]"
          >
            {translateText("Apply Translation", language)}
          </button>
        </div>
      </motion.div>
    );
  }

  // If Settings Page is active, show the system configuration and admin gate
  if (showSettingsPage) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="pb-32 px-4 pt-4 max-w-2xl mx-auto flex flex-col gap-6 w-full min-w-0 overflow-x-hidden"
      >
        {/* Settings Header with Back Button */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <button
            onClick={() => {
              playCinematicSwell();
              setShowSettingsPage(false);
            }}
            className="flex items-center gap-2 text-[10px] font-tech font-bold tracking-widest text-gold-base bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full border border-gold-base/20 cursor-pointer active:scale-95 transition-all"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            BACK
          </button>
          <h2 className="text-xs font-serif font-black text-white tracking-widest uppercase flex items-center gap-2">
            <Settings className="w-4 h-4 text-gold-base" />
            System Settings
          </h2>
          <div className="w-16" /> {/* Spacer */}
        </div>

        {/* System Configurations card */}
        <div className="luxury-glass p-5 rounded-[24px] border-white/5 flex flex-col gap-5">
          <h3 className="text-xs font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-gold-base" />
            SYSTEM CONFIGURATIONS
          </h3>

          <div className="flex flex-col gap-4">
            {/* Autoplay Toggler */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="font-bold text-white">Autoplay Next Episode</span>
                <span className="text-[10px] text-white/40">Launch upcoming streams immediately</span>
              </div>
              <button
                onClick={() => {
                  playInterfaceTick();
                  setAutoplay(!autoplay);
                }}
                className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                  autoplay ? 'gold-gradient-bg' : 'bg-white/10'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-black transition-transform ${autoplay ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* High Bitrate Stream */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="font-bold text-white">4K Master Bitrate stream</span>
                <span className="text-[10px] text-white/40">Requires high bandwidth connections</span>
              </div>
              <button
                onClick={() => {
                  playInterfaceTick();
                  setPremiumStream(!premiumStream);
                }}
                className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                  premiumStream ? 'gold-gradient-bg' : 'bg-white/10'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-black transition-transform ${premiumStream ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Offline Mode Toggler */}
            <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
              <div className="flex flex-col text-left">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-gold-base" />
                  Offline Mode
                </span>
                <span className="text-[10px] text-white/40">Force-download all currently watchlisted content for future offline playback</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (typeof playInterfaceTick === 'function') playInterfaceTick();
                  if (onToggleOfflineMode) {
                    onToggleOfflineMode(!offlineMode);
                  }
                }}
                className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  offlineMode ? 'gold-gradient-bg' : 'bg-white/10'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-black transition-transform ${offlineMode ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Cinematic Sound Toggle */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-gold-base" />
                  Cinematic Sound Effects
                </span>
                <span className="text-[10px] text-white/40">Immersive atmospheric synthesizer cues</span>
              </div>
              <button
                onClick={() => {
                  const newVal = !soundOn;
                  setSoundEnabled(newVal);
                  setSoundOn(newVal);
                  playToggleBeep(newVal);
                }}
                className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                  soundOn ? 'gold-gradient-bg' : 'bg-white/10'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-black transition-transform ${soundOn ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Developer Mode Admin Bypass */}
            {isAdmin && (
              <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
                <div className="flex flex-col">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-gold-base animate-pulse" />
                    Developer Bypass (Admin Panel)
                  </span>
                  <span className="text-[10px] text-white/40">Bypass verification to open Director's Gate</span>
                </div>
                <button
                  onClick={() => {
                    playInterfaceTick();
                    onSwitchProfile({
                      ...currentUser,
                      isAdmin: !currentUser.isAdmin
                    });
                  }}
                  className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    currentUser.isAdmin ? 'gold-gradient-bg' : 'bg-white/10'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-black transition-transform ${currentUser.isAdmin ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            )}

            {/* Bilingual Trigger with Custom Selection Trigger */}
            <div className="flex items-center justify-between text-xs gap-4">
              <div className="flex flex-col">
                <span className="font-bold text-white">{translateText("App Interface Language", language)}</span>
                <span className="text-[10px] text-white/40">{translateText("Configure primary visual copy", language)}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] font-tech font-extrabold px-2.5 py-1 rounded-lg uppercase border ${
                  isDarkMode 
                    ? 'text-gold-base bg-gold-base/10 border-gold-base/20' 
                    : 'text-gold-dark bg-gold-base/15 border-gold-base/30'
                }`}>
                  {LANGUAGES.find(l => l.id === language)?.code || 'EN'}
                </span>
                <button
                  onClick={() => {
                    playInterfaceTick();
                    setShowLanguageView(true);
                  }}
                  className={`border text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0 ${
                    isDarkMode 
                      ? 'bg-gold-base/15 border-gold-base/30 text-gold-base hover:bg-gold-base/25' 
                      : 'bg-gold-base/20 border-gold-base/40 text-gold-dark hover:bg-gold-base/30'
                  }`}
                >
                  <Globe className="w-3 h-3 animate-spin" style={{ animationDuration: '8s' }} />
                  {translateText("More Languages", language)}
                </button>
              </div>
            </div>

            {/* Permissions Manager Option */}
            {onOpenPermissions && (
              <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
                <div className="flex flex-col text-left">
                  <span className="font-bold text-white flex items-center gap-1.5 uppercase font-serif tracking-wider">
                    <Shield className="w-3.5 h-3.5 text-gold-base" />
                    Sandbox Permissions Manager
                  </span>
                  <span className="text-[10px] text-white/40">Inspect, authorize, or reset all 27 hardware & system clearances</span>
                </div>
                <button
                  onClick={() => {
                    playInterfaceTick();
                    onOpenPermissions();
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-tech font-extrabold tracking-wider bg-gold-base hover:bg-gold-light text-black border border-gold-base px-4 py-2 rounded-xl cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all uppercase"
                >
                  Configure Permissions
                </button>
              </div>
            )}

            {/* Cookie Support & Diagnostics Option */}
            {onOpenCookieSupport && (
              <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
                <div className="flex flex-col text-left">
                  <span className="font-bold text-white flex items-center gap-1.5 uppercase font-serif tracking-wider">
                    <Cookie className="w-3.5 h-3.5 text-gold-base" />
                    Browser Cookie Support
                  </span>
                  <span className="text-[10px] text-white/40">Check cookie permissions & diagnose browser sandbox issues</span>
                </div>
                <button
                  onClick={() => {
                    playInterfaceTick();
                    onOpenCookieSupport();
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-tech font-extrabold tracking-wider bg-gold-base hover:bg-gold-light text-black border border-gold-base px-4 py-2 rounded-xl cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all uppercase"
                >
                  Run Cookie Diagnostics
                </button>
              </div>
            )}

            {/* Remove / Disable Security PIN setting */}
            {localStorage.getItem('ep_security_pin') ? (
              <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
                <div className="flex flex-col">
                  <span className="font-bold text-white flex items-center gap-1.5 uppercase font-serif tracking-wider">
                    <Key className="w-3.5 h-3.5 text-gold-base" />
                    Security PIN Lock
                  </span>
                  <span className="text-[10px] text-white/40">Remove or clear the system security PIN to unlock all administrative features</span>
                </div>
                <button
                  onClick={async () => {
                    playInterfaceTick();
                    if (confirm("Are you sure you want to remove and disable the system security PIN? This will unlock the administrative panel and other lockouts.")) {
                      try {
                        const adminCreds = await getAdminCredentials();
                        await saveAdminCredentials({
                          ...adminCreds,
                          appSecurityPin: ''
                        });
                        localStorage.removeItem('ep_security_pin');
                        alert("Security PIN has been successfully removed and disabled!");
                        window.location.reload();
                      } catch (err) {
                        localStorage.removeItem('ep_security_pin');
                        alert("Security PIN removed from local cache successfully!");
                        window.location.reload();
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-tech font-extrabold tracking-wider bg-red-600 hover:bg-red-500 text-white border border-red-600 px-4 py-2 rounded-xl cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.15)] transition-all uppercase"
                >
                  Remove Pin Lock
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
                <div className="flex flex-col">
                  <span className="font-bold text-white flex items-center gap-1.5 uppercase font-serif tracking-wider">
                    <Key className="w-3.5 h-3.5 text-gold-base" />
                    Security PIN Lock
                  </span>
                  <span className="text-[10px] text-white/40">No security PIN configured. System access is fully unlocked and passwordless.</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                  Unlocked
                </span>
              </div>
            )}

            {/* Day/Night Toggler & Custom Colors (VIP ONLY) */}
            {currentUser.isPremium && onToggleTheme && (
              <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
                <div className="flex flex-col">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    {isDarkMode ? <Moon className="w-3.5 h-3.5 text-gold-base" /> : <Sun className="w-3.5 h-3.5 text-gold-base" />}
                    Theme Mode
                  </span>
                  <span className="text-[10px] text-white/40">
                    {syncWithSystem 
                      ? translateText("Managed by System Sync", language)
                      : autoThemeScheduler 
                        ? translateText("Managed by Scheduler", language)
                        : translateText("Toggle between Day (Light) and Night (Dark) mode", language)}
                  </span>
                </div>
                <button
                  disabled={syncWithSystem || autoThemeScheduler}
                  onClick={() => {
                    playInterfaceTick();
                    onToggleTheme();
                  }}
                  className={`flex items-center gap-1.5 text-[10px] font-tech font-extrabold tracking-wider border px-4 py-2 rounded-xl cursor-pointer transition-all ${
                    syncWithSystem || autoThemeScheduler
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-50'
                      : 'bg-gold-base/10 hover:bg-gold-base/20 text-gold-base border border-gold-base/25'
                  }`}
                >
                  {isDarkMode ? translateText("SWITCH TO DAY", language) : translateText("SWITCH TO NIGHT", language)}
                </button>
              </div>
            )}

            {/* Premium Subscription Auto-Renew Management */}
            {currentUser.isPremium && (
              <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase font-serif tracking-wider">
                    <Crown className="w-4 h-4 text-gold-base animate-pulse" />
                    {translateText("Subscription Settings", language)}
                  </span>
                  <span className="text-[10px] text-white/40">{translateText("Manage premium membership parameters", language)}</span>
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex flex-col text-left max-w-[70%]">
                    <span className="font-bold text-white flex items-center gap-1">
                      <RefreshCw className={`w-3.5 h-3.5 text-gold-base ${isUpdatingAutoRenew ? 'animate-spin' : ''}`} />
                      {translateText("Auto-Renew Subscription", language)}
                    </span>
                    <span className="text-[9px] text-white/40 leading-tight">
                      {translateText("Automatically renew VIP membership to prevent stream disruption", language)}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!currentUser.autoRenew}
                      disabled={isUpdatingAutoRenew}
                      onChange={handleToggleAutoRenew}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-base"></div>
                  </label>
                </div>
              </div>
            )}

            {/* Theme Automation System (NEW requested feature) */}
            {currentUser.isPremium && (
              <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase font-serif tracking-wider">
                    <Clock className="w-4 h-4 text-gold-base animate-pulse" />
                    {translateText("Theme Automation Services", language)}
                  </span>
                  <span className="text-[10px] text-white/40">{translateText("Configure smart triggers for dynamic visual adaptation", language)}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl">
                  {/* Sync with System toggle */}
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <div className="flex flex-col text-left max-w-[70%]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <Monitor className="w-3.5 h-3.5 text-gold-base" />
                        {translateText("Sync with System", language)}
                      </span>
                      <span className="text-[9px] text-white/40 leading-tight">
                        {translateText("Matches device dark/light preference automatically", language)}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncWithSystem}
                        onChange={(e) => {
                          playInterfaceTick();
                          const val = e.target.checked;
                          if (setSyncWithSystem) setSyncWithSystem(val);
                          if (val && setAutoThemeScheduler) setAutoThemeScheduler(false);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-base"></div>
                    </label>
                  </div>

                  {/* Auto-Theme Scheduler toggle */}
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <div className="flex flex-col text-left max-w-[70%]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gold-base" />
                        {translateText("Auto-Theme Scheduler", language)}
                      </span>
                      <span className="text-[9px] text-white/40 leading-tight">
                        {translateText("Automated cycle matching custom twilight hours", language)}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoThemeScheduler}
                        onChange={(e) => {
                          playInterfaceTick();
                          const val = e.target.checked;
                          if (setAutoThemeScheduler) setAutoThemeScheduler(val);
                          if (val && setSyncWithSystem) setSyncWithSystem(false);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-base"></div>
                    </label>
                  </div>
                </div>

                {/* Scheduler Configuration hours (only shown when Scheduler is active) */}
                {autoThemeScheduler && (
                  <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-gold-base/[0.02] border border-gold-base/20">
                    <span className="text-[9px] font-tech text-gold-base tracking-widest uppercase">
                      {translateText("Twilight Interval Matrix", language)}
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Dark mode start */}
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] font-bold text-white/80">{translateText("Night Mode Trigger", language)}</label>
                        <select
                          value={autoThemeStartHour}
                          onChange={(e) => {
                            if (typeof playInterfaceTick === 'function') playInterfaceTick();
                            if (setAutoThemeStartHour) setAutoThemeStartHour(parseInt(e.target.value, 10));
                          }}
                          className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white/95 focus:border-gold-base outline-none cursor-pointer text-white"
                        >
                          {Array.from({ length: 24 }).map((_, h) => (
                            <option key={h} value={h} className="bg-[#0a0a0a] text-white">
                              {h === 0 ? "12 AM (Midnight)" : h === 12 ? "12 PM (Noon)" : h > 12 ? `${h - 12} PM` : `${h} AM`} ({h.toString().padStart(2, '0')}:00)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dark mode end */}
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] font-bold text-white/80">{translateText("Day Mode Trigger", language)}</label>
                        <select
                          value={autoThemeEndHour}
                          onChange={(e) => {
                            if (typeof playInterfaceTick === 'function') playInterfaceTick();
                            if (setAutoThemeEndHour) setAutoThemeEndHour(parseInt(e.target.value, 10));
                          }}
                          className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white/95 focus:border-gold-base outline-none cursor-pointer text-white"
                        >
                          {Array.from({ length: 24 }).map((_, h) => (
                            <option key={h} value={h} className="bg-[#0a0a0a] text-white">
                              {h === 0 ? "12 AM (Midnight)" : h === 12 ? "12 PM (Noon)" : h > 12 ? `${h - 12} PM` : `${h} AM`} ({h.toString().padStart(2, '0')}:00)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 justify-center mt-1 text-[9px] font-mono text-white/40 uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-base animate-ping"></span>
                      <span>{translateText("Active cycle", language)}: {autoThemeStartHour}:00 {translateText("to", language)} {autoThemeEndHour}:00</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIP Premium Exclusive Features */}
            {currentUser.isPremium && (
              <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase font-serif tracking-wider">
                    <Crown className="w-4 h-4 text-gold-base animate-pulse" />
                    Elite VIP Premium Features
                  </span>
                  <span className="text-[10px] text-white/40">Configure advanced high-fidelity audio, streaming, and visual settings</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Spatial Audio Toggle */}
                  <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex flex-col text-left max-w-[70%]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-gold-base" />
                        4D Spatial Audio (Dolby Atmos)
                      </span>
                      <span className="text-[9px] text-white/40 leading-tight">
                        Enable immersive multi-dimensional cinema surround sound during movie playbacks.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spatialAudio}
                        onChange={(e) => {
                          if (typeof playInterfaceTick === 'function') playInterfaceTick();
                          setSpatialAudio(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-base"></div>
                    </label>
                  </div>

                  {/* Pre-buffer toggle */}
                  <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex flex-col text-left max-w-[70%]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-gold-base" />
                        AI Scene Pre-Buffering
                      </span>
                      <span className="text-[9px] text-white/40 leading-tight">
                        Intelligently download subsequent segments for ultra-fast instant seek times.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preBuffer}
                        onChange={(e) => {
                          if (typeof playInterfaceTick === 'function') playInterfaceTick();
                          setPreBuffer(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-base"></div>
                    </label>
                  </div>

                  {/* UHD 4K stream Toggle */}
                  <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex flex-col text-left max-w-[70%]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <Tv className="w-3.5 h-3.5 text-gold-base" />
                        UHD 4K Streaming Mode
                      </span>
                      <span className="text-[9px] text-white/40 leading-tight">
                        Unlock and auto-request true 4K resolution stream sources from CDN relays.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uhdMode}
                        onChange={(e) => {
                          if (typeof playInterfaceTick === 'function') playInterfaceTick();
                          setUhdMode(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-base"></div>
                    </label>
                  </div>

                  {/* Haptic Synchronization Toggle */}
                  <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex flex-col text-left max-w-[70%]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-gold-base" />
                        Tactile Haptic Sync
                      </span>
                      <span className="text-[9px] text-white/40 leading-tight">
                        Synchronize device vibration feedback with cinema high-impact sounds.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hapticSync}
                        onChange={(e) => {
                          if (typeof playInterfaceTick === 'function') playInterfaceTick();
                          setHapticSync(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-base"></div>
                    </label>
                  </div>

                  {/* HDR Bitrate Customizer */}
                  <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex flex-col text-left max-w-[60%]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-gold-base" />
                        HDR Bitrate Customizer
                      </span>
                      <span className="text-[9px] text-white/40 leading-tight">
                        Configure stream bandwidth pipeline. Higher bitrate increases picture depth.
                      </span>
                    </div>
                    <select
                      value={hdrBitrate}
                      onChange={(e) => {
                        if (typeof playInterfaceTick === 'function') playInterfaceTick();
                        setHdrBitrate(e.target.value);
                      }}
                      className="bg-black/60 border border-white/10 rounded-lg p-1.5 text-[10px] text-gold-base font-mono outline-none focus:border-gold-base cursor-pointer"
                    >
                      <option value="15mbps" className="bg-[#0a0a0a]">Standard (15 Mbps)</option>
                      <option value="50mbps" className="bg-[#0a0a0a]">Cinema Ultra (50 Mbps)</option>
                      <option value="120mbps" className="bg-[#0a0a0a]">Direct Copy Lossless (120 Mbps)</option>
                    </select>
                  </div>

                  {/* AI Co-Pilot Accent */}
                  <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex flex-col text-left max-w-[60%]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <Languages className="w-3.5 h-3.5 text-gold-base" />
                        AI Co-Pilot Persona Accent
                      </span>
                      <span className="text-[9px] text-white/40 leading-tight">
                        Customize the spoken voice accent and dialogue style of Gemini companion.
                      </span>
                    </div>
                    <select
                      value={aiAccent}
                      onChange={(e) => {
                        if (typeof playInterfaceTick === 'function') playInterfaceTick();
                        setAiAccent(e.target.value);
                      }}
                      className="bg-black/60 border border-white/10 rounded-lg p-1.5 text-[10px] text-gold-base font-mono outline-none focus:border-gold-base cursor-pointer"
                    >
                      <option value="british" className="bg-[#0a0a0a]">British Aristocrat</option>
                      <option value="cyberpunk" className="bg-[#0a0a0a]">Tokyo Cyberpunk</option>
                      <option value="philosopher" className="bg-[#0a0a0a]">French Philosopher</option>
                      <option value="space" className="bg-[#0a0a0a]">Deep Space AI</option>
                    </select>
                  </div>

                  {/* Ambient Light Sync */}
                  <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex flex-col text-left max-w-[70%]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5 text-gold-base animate-pulse" />
                        Dynamic Ambient Backlight
                      </span>
                      <span className="text-[9px] text-white/40 leading-tight">
                        Generate immersive glowing frame light reflections mapped to current video scene tones.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ambientLight}
                        onChange={(e) => {
                          if (typeof playInterfaceTick === 'function') playInterfaceTick();
                          setAmbientLight(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-base"></div>
                    </label>
                  </div>

                  {/* VIP Server Edge Relay */}
                  <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex flex-col text-left max-w-[60%]">
                      <span className="font-bold text-white flex items-center gap-1">
                        <Server className="w-3.5 h-3.5 text-gold-base" />
                        VIP Fiber Edge Routing
                      </span>
                      <span className="text-[9px] text-white/40 leading-tight">
                        Completely bypass congested generic public CDN nodes by tunneling direct to dedicated tier-1 trans-pacific links.
                      </span>
                    </div>
                    <select
                      value={vipRelay}
                      onChange={(e) => {
                        if (typeof playInterfaceTick === 'function') playInterfaceTick();
                        setVipRelay(e.target.value);
                      }}
                      className="bg-black/60 border border-white/10 rounded-lg p-1.5 text-[10px] text-gold-base font-mono outline-none focus:border-gold-base cursor-pointer"
                    >
                      <option value="london" className="bg-[#0a0a0a]">London-Edge Fiber</option>
                      <option value="singapore" className="bg-[#0a0a0a]">Singapore CDN Direct</option>
                      <option value="tokyo" className="bg-[#0a0a0a]">Tokyo Direct Route</option>
                      <option value="la" className="bg-[#0a0a0a]">Los Angeles Ultra Node</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Predefined Color Themes (Instantly updating CSS custom variables) */}
            {currentUser.isPremium && setCustomDayBg && setCustomNightBg && setCustomAccent && (
              <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase font-serif tracking-wider">
                    <Palette className="w-4 h-4 text-gold-base" />
                    System Color Themes
                  </span>
                  <span className="text-[10px] text-white/40">Select a predefined theme to update application styles instantly</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { name: 'Royal Gold', day: '#f7f6f2', night: '#000000', accent: '#D4AF37' },
                    { name: 'Midnight Obsidian', day: '#f1f5f9', night: '#0b0f19', accent: '#f43f5e' },
                    { name: 'Cyber Neon', day: '#fcf8ff', night: '#040112', accent: '#00f5ff' },
                    { name: 'Emerald Velvet', day: '#f0f4f1', night: '#03140f', accent: '#10b981' },
                    { name: 'Sapphire Silk', day: '#eef2f7', night: '#020c1b', accent: '#3b82f6' },
                    { name: 'Amethyst Twilight', day: '#f5f0f9', night: '#0e021c', accent: '#8b5cf6' },
                  ].map((preset) => {
                    const isSelected = customDayBg === preset.day && customNightBg === preset.night && customAccent === preset.accent;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => {
                          playInterfaceTick();
                          if (!currentUser.isPremium) {
                            if (onOpenPremiumWalkthrough) {
                              onOpenPremiumWalkthrough();
                            } else {
                              onUpgradePrompt();
                            }
                          } else {
                            if (setCustomDayBg) setCustomDayBg(preset.day);
                            if (setCustomNightBg) setCustomNightBg(preset.night);
                            if (setCustomAccent) setCustomAccent(preset.accent);
                          }
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl text-[10px] border text-left transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-gold-base bg-gold-base/15 text-white font-bold shadow-[0_0_12px_rgba(212,175,55,0.15)]' 
                            : 'border-white/5 bg-white/[0.02] hover:border-white/10 text-white/70'
                        }`}
                      >
                        <div className="flex gap-1 shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: preset.day }} />
                          <div className="w-2.5 h-2.5 rounded-full border border-white/10" style={{ backgroundColor: preset.night }} />
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.accent }} />
                        </div>
                        <span className="truncate">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* VIP Custom RGB Tuning Pickers */}
                {currentUser.isPremium ? (
                  <div className="flex flex-col gap-2 mt-1">
                    <span className="text-[9px] font-tech tracking-wider text-white/55">VIP COLOR PICKERS</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Custom Day Color */}
                      <div className="flex items-center justify-between sm:flex-col sm:items-start p-2.5 rounded-xl bg-white/[0.02] border border-white/5 gap-2">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-bold text-white">Day Background</span>
                          <span className="text-[8px] text-white/40 font-mono">{customDayBg}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="color;charset=UTF-8"
                            value={customDayBg}
                            onChange={(e) => {
                              setCustomDayBg(e.target.value);
                            }}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none p-0 outline-none"
                          />
                        </div>
                      </div>

                      {/* Custom Night Color */}
                      <div className="flex items-center justify-between sm:flex-col sm:items-start p-2.5 rounded-xl bg-white/[0.02] border border-white/5 gap-2">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-bold text-white">Night Background</span>
                          <span className="text-[8px] text-white/40 font-mono">{customNightBg}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="color;charset=UTF-8"
                            value={customNightBg}
                            onChange={(e) => {
                              setCustomNightBg(e.target.value);
                            }}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none p-0 outline-none"
                          />
                        </div>
                      </div>

                      {/* Custom Normal/Accent Color */}
                      <div className="flex items-center justify-between sm:flex-col sm:items-start p-2.5 rounded-xl bg-white/[0.02] border border-white/5 gap-2">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-bold text-white">Accent Gold color</span>
                          <span className="text-[8px] text-white/40 font-mono">{customAccent}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="color;charset=UTF-8"
                            value={customAccent}
                            onChange={(e) => {
                              setCustomAccent(e.target.value);
                            }}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none p-0 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => {
                      playInterfaceTick();
                      if (onOpenPremiumWalkthrough) onOpenPremiumWalkthrough();
                    }}
                    className="flex flex-col gap-2 mt-2 p-3 rounded-xxl bg-gold-base/5 border border-gold-base/10 hover:bg-gold-base/10 transition-colors cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-gold-base flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" />
                      VIP Custom Color Tuner Locked
                    </span>
                    <p className="text-[9px] text-white/50 leading-relaxed">
                      Upgrade to Elite VIP to unlock full access to raw hex/RGB color tuning sliders and design your own bespoke color styles.
                    </p>
                  </div>
                )}

                {/* Live Preview Box */}
                <div className="flex flex-col gap-2 mt-2 p-3 rounded-xxl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-tech tracking-wider text-white/55 uppercase flex items-center gap-1">
                      <Eye className="w-3 h-3 text-gold-base" />
                      Live Lookbook Preview
                    </span>
                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-gold-base/15 text-gold-base font-extrabold uppercase tracking-widest animate-pulse">
                      Real-time
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-1">
                    {/* Day Mode Miniature Preview */}
                    <div 
                      style={{ backgroundColor: customDayBg }} 
                      className="rounded-2xl p-3 border border-black/10 flex flex-col gap-2 shadow-inner transition-colors duration-300 overflow-hidden relative"
                    >
                      <div className="absolute top-1.5 right-2 text-[7px] font-bold text-black/40 font-mono">DAY</div>
                      
                      {/* Mini Header */}
                      <div className="flex items-center justify-between border-b border-black/5 pb-1">
                        <span className="text-[9px] font-serif font-black tracking-wider text-black">Elite Plex</span>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: customAccent }} />
                      </div>
                      
                      {/* Mini Feature Card */}
                      <div className="rounded-lg p-2 flex flex-col gap-1" style={{ backgroundColor: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
                        <div className="w-full h-10 rounded bg-black/5 flex items-center justify-center">
                          <Play className="w-3 h-3 fill-current" style={{ color: customAccent }} />
                        </div>
                        <div className="h-1 w-8 rounded bg-black/20" />
                        <div className="h-1 w-12 rounded bg-black/10" />
                      </div>
                      
                      {/* Mini Button */}
                      <div 
                        style={{ backgroundColor: customAccent }} 
                        className="w-full py-1.5 rounded-lg text-[8px] text-black font-extrabold text-center uppercase tracking-wider cursor-default select-none shadow-sm"
                      >
                        Watch Now
                      </div>
                    </div>

                    {/* Night Mode Miniature Preview */}
                    <div 
                      style={{ backgroundColor: customNightBg }} 
                      className="rounded-2xl p-3 border border-white/10 flex flex-col gap-2 shadow-inner transition-colors duration-300 overflow-hidden relative"
                    >
                      <div className="absolute top-1.5 right-2 text-[7px] font-bold text-white/40 font-mono">NIGHT</div>
                      
                      {/* Mini Header */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-1">
                        <span className="text-[9px] font-serif font-black tracking-wider text-white">Elite Plex</span>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: customAccent }} />
                      </div>
                      
                      {/* Mini Feature Card */}
                      <div className="rounded-lg p-2 flex flex-col gap-1" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="w-full h-10 rounded bg-white/5 flex items-center justify-center">
                          <Play className="w-3 h-3 fill-current" style={{ color: customAccent }} />
                        </div>
                        <div className="h-1 w-8 rounded bg-white/20" />
                        <div className="h-1 w-12 rounded bg-white/10" />
                      </div>
                      
                      {/* Mini Button */}
                      <div 
                        style={{ backgroundColor: customAccent }} 
                        className="w-full py-1.5 rounded-lg text-[8px] text-black font-extrabold text-center uppercase tracking-wider cursor-default select-none shadow-sm"
                      >
                        Watch Now
                      </div>
                    </div>
                  </div>
                </div>

                {/* Update To Premium button below custom themes for non-premium users */}
                {!currentUser.isPremium && (
                  <div className="mt-4 p-4.5 rounded-xxl bg-gradient-to-r from-gold-base/15 via-gold-base/10 to-transparent text-white flex flex-col gap-3 shadow-2xl border border-gold-base/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gold-base/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                    
                    <div className="flex items-start gap-3 text-left relative z-10">
                      <div className="p-2 rounded-xl bg-gold-base/10 shrink-0">
                        <Crown className="w-5 h-5 text-gold-base animate-bounce" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-serif font-black tracking-widest uppercase text-gold-base">UNLOCK CUSTOM COLOR THEMES</span>
                        <p className="text-[10px] font-normal leading-relaxed text-white/60">
                          Upgrade to premium to unleash the full Lookbook experience, customize day/night hues, configure premium streams, and interact with the Gemini AI co-pilot.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        playInterfaceTick();
                        if (onOpenPremiumWalkthrough) {
                          onOpenPremiumWalkthrough();
                        } else {
                          onUpgradePrompt();
                        }
                      }}
                      className="w-full gold-gradient-bg text-black font-tech text-[10px] font-black tracking-widest py-2.5 px-4 rounded-xl shadow-[0_4px_12px_rgba(212,175,55,0.25)] transition-all cursor-pointer uppercase flex items-center justify-center gap-1.5 hover:scale-[1.02]"
                    >
                      <span>UPDATE TO PREMIUM</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Storage cache clearing */}
            <div className="flex items-center justify-between text-xs border-t border-white/5 pt-4">
              <div className="flex flex-col">
                <span className="font-bold text-white">Clear Temporary Buffers</span>
                <span className="text-[10px] text-white/40">Reclaim {cacheSize} used cache</span>
              </div>
              <button
                onClick={handleClearCache}
                disabled={clearingCache || cacheSize === '0.00 MB'}
                className="text-[10px] font-tech font-extrabold tracking-wider text-red-400 hover:text-red-500 bg-white/5 border border-white/5 hover:bg-white/10 px-4 py-2 rounded-xl disabled:opacity-30 cursor-pointer"
              >
                {clearingCache ? 'FLUSHING...' : 'CLEAR CACHE'}
              </button>
            </div>
          </div>
        </div>

        {/* Server settings page link (CDN RELAY NODES) */}
        {isAdmin && (
          <div className="luxury-glass p-5 rounded-[24px] border-white/5 flex items-center justify-between group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-2xl pointer-events-none rounded-full" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-serif font-black tracking-widest text-white uppercase block">CDN RELAY NODES</span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider block mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  SELECT STABLE REAL SERVER
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-tech text-white/30 uppercase tracking-widest mr-1">
                {localStorage.getItem('ep_selected_server_name') || 'AUTO DETECT'}
              </span>
              <button
                onClick={() => {
                  playInterfaceTick();
                  if (onOpenServers) onOpenServers();
                }}
                className="text-[10px] font-tech font-extrabold tracking-widest text-gold-base border border-gold-base/20 py-2.5 px-4 rounded-full hover:bg-gold-base/10 cursor-pointer active:scale-95 transition-all"
              >
                CONFIGURE
              </button>
            </div>
          </div>
        )}

        {/* Master Admin Panel Dashboard Card (Directors Gate) */}
        {isAdmin && (
          <div className="luxury-glass p-5 rounded-[24px] border border-gold-base/25 flex items-center justify-between group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gold-base/5 blur-2xl pointer-events-none rounded-full" />
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold-base/10 text-gold-base border border-gold-base/20 rounded-xl group-hover:scale-110 transition-transform">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-serif font-black tracking-widest text-white uppercase block">ADMIN DECK (DIRECTORS GATE)</span>
                <span className="text-[9px] font-mono text-gold-base font-bold uppercase tracking-wider block mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-gold-base rounded-full animate-pulse" />
                  MANAGE MOVIES, USERS, PAYMENTS & NOTIFICATIONS
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playCinematicSwell();
                  if (onOpenAdmin) onOpenAdmin();
                }}
                className="text-[10px] font-tech font-extrabold tracking-widest bg-gold-base hover:bg-gold-light text-black border border-gold-base py-2.5 px-5 rounded-full cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.25)] active:scale-95 transition-all uppercase"
              >
                LAUNCH PANEL
              </button>
            </div>
          </div>
        )}


      </motion.div>
    );
  }

  // Otherwise, show standard profile detail screen with Settings Button in header
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-32 px-4 pt-4 max-w-2xl mx-auto flex flex-col gap-6 w-full min-w-0 overflow-x-hidden"
    >
      {/* 1. Top Action Bar with Settings, Redeem and Switch beside each other */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 gap-4">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-gold-base animate-pulse" />
          <span className="text-[9px] font-tech tracking-widest text-white/40 uppercase">CONSOLE SYSTEM</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
          {/* Settings Button */}
          <button
            onClick={() => {
              playCinematicSwell();
              setShowSettingsPage(true);
            }}
            className="flex items-center gap-1.5 text-[9px] font-tech font-extrabold tracking-widest text-white/80 bg-white/5 border border-white/10 py-2 px-2.5 sm:px-4 rounded-full hover:bg-white/10 hover:text-white cursor-pointer active:scale-95 transition-all animate-fade-in"
          >
            <Settings className="w-3.5 h-3.5 text-gold-base" />
            SETTINGS
          </button>

          {/* Redeem Button */}
          <button
            onClick={() => {
              playInterfaceTick();
              setShowRedeemModal(true);
            }}
            className="flex items-center gap-1.5 text-[9px] font-tech font-extrabold tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 py-2 px-2.5 sm:px-4 rounded-full hover:bg-amber-400/20 hover:text-amber-300 cursor-pointer active:scale-95 transition-all animate-fade-in"
          >
            <Crown className="w-3.5 h-3.5" />
            REDEEM
          </button>

          {/* Switch Button */}
          <button
            onClick={() => {
              playInterfaceTick();
              handleOpenSwitchModal();
            }}
            className="flex items-center gap-1.5 text-[9px] font-tech font-extrabold tracking-widest text-gold-base bg-gold-base/10 border border-gold-base/20 py-2 px-2.5 sm:px-4 rounded-full hover:bg-gold-base/20 hover:text-gold-light cursor-pointer active:scale-95 transition-all animate-fade-in"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            SWITCH
          </button>
        </div>
      </div>

      {/* 2. Middle Centered Profile Hero */}
      <div className="flex flex-col items-center text-center py-6 gap-4">
        <div className="relative">
          {/* Glowing atmosphere effect */}
          <div className={`absolute inset-0 rounded-full blur-xl animate-pulse ${
            currentUser.isPremium ? 'bg-gold-base/35' : 'bg-neutral-800/10'
          }`} />
          
          <div className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full p-[3px] shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-500 ${
            currentUser.isPremium 
              ? 'bg-gradient-to-tr from-gold-light via-gold-base to-gold-dark ring-2 ring-gold-base/50 ring-offset-2 ring-offset-neutral-950'
              : 'bg-gradient-to-tr from-neutral-700 via-neutral-500 to-neutral-700'
          }`}>
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-full border border-black/80"
            />
            
            {/* Premium Verify Badge icon overlapping bottom right of profile image */}
            {currentUser.isPremium && (
              <div 
                id="premium-verify-badge-profile"
                className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-gold-light via-gold-base to-gold-dark text-black rounded-full p-1.5 shadow-xl border border-neutral-950 z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 hover:scale-110 transition-transform"
                title="Premium Verified VIP Account"
              >
                <Crown className="w-4 h-4 text-black stroke-[3]" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <h2 className={`text-xl sm:text-2xl font-serif font-black tracking-wide uppercase mt-2 transition-colors duration-500 ${
            currentUser.isPremium
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark filter drop-shadow-[0_2px_8px_rgba(212,175,55,0.3)]'
              : 'text-white'
          }`}>
            {currentUser.name}
          </h2>
          
          {/* Email displayed right below Profile name */}
          <p className={`text-xs font-tech lowercase mt-0.5 select-all transition-colors duration-500 ${
            currentUser.isPremium ? 'text-gold-light/60' : 'text-white/50'
          }`}>
            {currentUser.email || 'guest@example.com'}
          </p>

          {/* Expiration Countdown displayed under email */}
          {currentUser.isPremium && countdownText && (
            <div className="flex flex-col items-center mt-2.5 gap-1 animate-fade-in">
              <span className="text-[8px] font-tech text-amber-500 tracking-widest uppercase">VIP ACCESS EXPIRES IN</span>
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 font-mono text-xs text-gold-base font-bold tracking-wider animate-pulse">
                ⏳ {countdownText}
              </div>
            </div>
          )}

          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-2 border transition-all duration-500 ${
            currentUser.isPremium 
              ? 'bg-gold-base/10 border-gold-base/30 text-gold-base' 
              : 'bg-white/[0.03] border-white/5 text-white/60'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${currentUser.isPremium ? 'bg-gold-base animate-pulse' : 'bg-white/40'}`} />
            <span className="text-[8px] font-tech font-bold tracking-widest uppercase">
              {currentUser.isPremium ? '★ INNER CIRCLE VIP' : 'STANDARD LICENSE HOLDER'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Premium VIP Card upgrade widget */}
      <div 
        onClick={onUpgradePrompt}
        className="luxury-glass p-5 rounded-[24px] border-gold-base/20 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden transition-all duration-300 cursor-pointer hover:border-gold-base/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] active:scale-[0.99]"
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 gold-radial-glow opacity-30 pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full gold-gradient-bg flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)] shrink-0">
            <Crown className="w-6 h-6 text-black stroke-[2.2px]" />
          </div>
          <div>
            <h3 className="text-xs font-serif font-black tracking-wider text-white uppercase flex items-center gap-1.5">
              EP PLEX VIP ACCESS
            </h3>
            <p className="text-[10px] text-white/60 leading-relaxed mt-0.5 max-w-xs">
              {currentUser.isPremium
                ? 'Your premium access is fully unlocked. Click here to extend or upgrade.'
                : 'Unlock high-bitrate HDR, bypass ads, and decrpyt all master files.'}
            </p>
          </div>
        </div>

        {currentUser.isPremium ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpgradePrompt();
            }}
            className="bg-amber-500/10 border border-amber-500/30 text-gold-base font-bold text-[10px] tracking-wider py-2.5 px-5 rounded-full cursor-pointer shadow-md shrink-0 w-full sm:w-auto text-center hover:bg-amber-500/25 transition-colors"
          >
            MORE PREMIUM
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpgradePrompt();
            }}
            className="gold-gradient-bg text-black font-semibold text-[10px] tracking-wider py-2.5 px-5 rounded-full cursor-pointer shadow-md shrink-0 w-full sm:w-auto text-center"
          >
            ACTIVATE NOW
          </button>
        )}
      </div>

      {/* 3. Quick Lists Toggles */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpenFavorites}
          className="luxury-glass p-4 rounded-xxl border-white/5 hover:border-gold-base/15 text-left flex items-center justify-between cursor-pointer"
        >
          <span className="text-xs font-serif font-bold text-white uppercase tracking-wider">My Sanctuary</span>
          <ChevronRight className="w-4 h-4 text-gold-base" />
        </button>

        <button
          onClick={onOpenDownloads}
          className="luxury-glass p-4 rounded-xxl border-white/5 hover:border-gold-base/15 text-left flex items-center justify-between cursor-pointer"
        >
          <span className="text-xs font-serif font-bold text-white uppercase tracking-wider">Offline Cache</span>
          <ChevronRight className="w-4 h-4 text-gold-base" />
        </button>
      </div>

      {/* 3.1 Custom Request a Film/TV Show Block */}
      <div className="luxury-glass p-5 rounded-[24px] border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 gold-radial-glow opacity-10 pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-gold-base/10 border border-gold-base/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-gold-base" />
          </div>
          <div>
            <h3 className="text-xs font-serif font-black tracking-wider text-white uppercase">
              REQUEST MEDIA TITLE
            </h3>
            <p className="text-[9px] text-white/55 leading-relaxed mt-0.5 max-w-xs">
              Submit custom movie or serial TV show requests to be parsed by moderators.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="gold-gradient-bg text-black font-extrabold text-[9px] tracking-widest font-tech py-2.5 px-5 rounded-full shadow-lg shadow-gold-base/5 hover:brightness-110 active:scale-95 transition-all cursor-pointer w-full sm:w-auto text-center uppercase"
        >
          REQUEST NOW
        </button>
      </div>

      {/* 3.1.5 AI Voice Assistant Block */}
      <div className="luxury-glass p-5 rounded-[24px] border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-xl pointer-events-none" />

        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-gold-base/10 border border-gold-base/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-gold-base animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-serif font-black tracking-wider text-white uppercase flex items-center gap-1.5">
              ELITE VOICE ASSISTANT
            </h3>
            <p className="text-[9px] text-white/55 leading-relaxed mt-0.5 max-w-xs">
              Talk with our Gemini-powered cinema guide using your voice or keyboard.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (typeof playInterfaceTick === 'function') playInterfaceTick();
            onOpenAIVoiceAssistant?.();
          }}
          className="gold-gradient-bg text-black font-extrabold text-[9px] tracking-widest font-tech py-2.5 px-5 rounded-full shadow-lg shadow-gold-base/5 hover:brightness-110 active:scale-95 transition-all cursor-pointer w-full sm:w-auto text-center uppercase"
        >
          LAUNCH MODEL
        </button>
      </div>

      {/* 3.2 My Redeem Codes & Logs */}
      <div className="luxury-glass p-5 rounded-[24px] border-white/5 flex flex-col gap-4 relative overflow-hidden">
        <div>
          <h3 className="text-xs font-serif font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-gold-base" />
            MY REDEEMED LOGS
          </h3>
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-tech mt-0.5">
            History of codes redeemed on this profile
          </p>
        </div>

        {isRedeemsLoading ? (
          <div className="text-center py-4 text-[9px] text-white/30 tracking-widest font-tech uppercase animate-pulse">
            LOADING SECURE TRANSACTION LOGS...
          </div>
        ) : redeemedCodes.length === 0 ? (
          <div className="text-center py-4 text-[9px] text-white/30 tracking-wider font-tech uppercase border border-dashed border-white/5 rounded-xl">
            NO REDEEMED CODES LOGGED YET
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {redeemedCodes.map((item, index) => (
              <div
                key={`redeem-log-${item.id || index}-${index}`}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
              >
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-mono font-bold text-gold-light tracking-wider">
                    {item.code}
                  </span>
                  <span className="text-[8px] text-white/30 font-tech mt-0.5 uppercase">
                    REDEEMED ON {item.redeemedAt ? new Date(item.redeemedAt).toLocaleDateString() : 'UNKNOWN'}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full uppercase tracking-widest font-tech">
                    {item.type === 'premium' ? `${item.premiumDays || 30} DAYS PREMIUM` : item.targetTitle || 'MEDIA UNLOCK'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3.2.5 System Identities Account Swap & Account Exchange */}
      <div className="luxury-glass p-5 rounded-[24px] border-white/5 flex flex-col gap-4 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <h3 className="text-xs font-serif font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase flex items-center gap-1.5">
              <User className="w-4 h-4 text-gold-base animate-pulse" />
              SYSTEM IDENTITIES (SWAP & EXCHANGE)
            </h3>
            <p className="text-[9px] text-white/40 uppercase tracking-widest font-tech mt-0.5">
              Instantly switch profiles or exchange linked accounts on this device
            </p>
          </div>
          <button
            onClick={() => setIsAddingIdentity(!isAddingIdentity)}
            className="text-[9px] font-tech font-extrabold text-gold-base border border-gold-base/20 px-2.5 py-1 rounded bg-gold-base/5 hover:bg-gold-base/15 transition-all uppercase shrink-0"
          >
            {isAddingIdentity ? "CANCEL" : "ADD ACCOUNT"}
          </button>
        </div>

        {isAddingIdentity && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleAddNewIdentity}
            className="p-4 rounded-xl bg-white/[0.02] border border-gold-base/25 flex flex-col gap-3 text-left"
          >
            <span className="text-[9px] font-tech text-gold-base tracking-widest uppercase font-bold">
              REGISTER NEW DEVICE ACCOUNT (EXCHANGE)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-tech text-white/45 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={newIdentityName}
                  onChange={(e) => setNewIdentityName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold-base font-serif"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-tech text-white/45 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={newIdentityEmail}
                  onChange={(e) => setNewIdentityEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold-base font-mono"
                />
              </div>
            </div>
            <button
              type="submit"
              className="gold-gradient-bg text-black font-tech font-extrabold text-[9px] py-2 px-4 rounded-lg cursor-pointer hover:brightness-110 active:scale-95 transition-all text-center uppercase"
            >
              SAVE & SWITCH IDENTITY
            </button>
          </motion.form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
          {localSavedUsers.map((user, idx) => {
            const isCurrent = user.id === currentUser.id;
            return (
              <div
                key={`saved-user-${user.id || idx}-${idx}`}
                onClick={() => {
                  if (!isCurrent) {
                    playCinematicSwell();
                    onSwitchProfile(user);
                  }
                }}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                  isCurrent
                    ? 'border-gold-base/30 bg-gold-base/5'
                    : 'border-white/5 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.04] cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-8 h-8 rounded-full p-[1px] bg-gradient-to-tr from-purple-accent via-gold-base to-purple-accent shrink-0">
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full border border-black"
                    />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[10px] font-serif font-black text-white tracking-wide uppercase truncate">
                      {user.name}
                    </span>
                    <span className="text-[8px] text-white/40 truncate font-mono">
                      {user.email || 'guest@example.com'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isCurrent ? (
                    <span className="text-[7px] font-tech font-extrabold tracking-widest text-gold-base border border-gold-base/20 px-1.5 py-0.5 rounded bg-gold-base/5 uppercase shrink-0">
                      ACTIVE
                    </span>
                  ) : user.isPremium ? (
                    <span className="text-[7px] font-tech font-extrabold tracking-widest text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded bg-amber-500/5 uppercase shrink-0">
                      ★ VIP
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3.3 My Plans & Upgrade Requests */}
      <div className="luxury-glass p-5 rounded-[24px] border-white/5 flex flex-col gap-4 relative overflow-hidden">
        <div>
          <h3 className="text-xs font-serif font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-gold-base" />
            MY PLANS & ACTIVATION REQUESTS
          </h3>
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-tech mt-0.5">
            Active plans and custom manual payment requests
          </p>
        </div>

        {/* Current Base Plan Card */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-serif font-extrabold text-white uppercase tracking-wider flex items-center gap-1">
              CURRENT STATUS: {currentUser.isPremium ? 'EP VIP PLEX ACCESS' : 'STANDARD GUEST'}
            </span>
            <span className="text-[8px] text-white/40 font-mono mt-0.5 uppercase">
              {currentUser.isPremium ? 'Bypassing ad-blocks, high-bitrate HDR enabled' : 'Limited visual fidelity, offline download restricted'}
            </span>
          </div>
          <span className={`text-[8px] font-tech font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
            currentUser.isPremium ? 'bg-gold-base/10 border border-gold-base/20 text-gold-base' : 'bg-white/10 text-white/40'
          }`}>
            {currentUser.isPremium ? 'ACTIVE VIP' : 'FREE ACCESS'}
          </span>
        </div>

        {/* Pending/Historical Requests */}
        {isPlansLoading ? (
          <div className="text-center py-4 text-[9px] text-white/30 tracking-widest font-tech uppercase animate-pulse">
            LOADING DECRYPTED SUBSCRIPTION REQUESTS...
          </div>
        ) : subscribeRequests.length > 0 ? (
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {subscribeRequests.map((req, index) => (
              <div
                key={`sub-req-log-${req.id || index}-${index}`}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/5"
              >
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-bold text-white uppercase tracking-wider">
                    {req.planName || 'VIP SUBSCRIPTION REQUEST'}
                  </span>
                  <span className="text-[8px] text-white/30 font-mono mt-0.5">
                    REQUESTED {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span className={`text-[8px] font-tech font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border ${
                  req.status === 'approved' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : req.status === 'rejected'
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                }`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Cinematic Genre Preferences Pie Chart */}
      <div className="luxury-glass p-5 rounded-[24px] border-white/5 flex flex-col gap-4 relative overflow-hidden text-left">
        <div>
          <h3 className="text-xs font-serif font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-gold-base animate-pulse" />
            {translateText("Watch History Breakdown", language)}
          </h3>
          <p className="text-[9px] uppercase tracking-widest font-tech mt-0.5 text-white/40">
            {watchHistory.length > 0 
              ? translateText("Distribution of genres watched by you", language)
              : translateText("Decrypted default taste profile (Stream movies to update)", language)}
          </p>
        </div>

        <div className="h-48 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(8, 8, 8, 0.95)',
                  border: '1px solid rgba(212, 175, 55, 0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontFamily: 'var(--font-tech)',
                  fontSize: '10px'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
                wrapperStyle={{
                  fontFamily: 'var(--font-tech)',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Watch History Horiz lists */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-tech tracking-widest text-white/40 uppercase">RECENT STREAM HISTORY</span>
          <div className="flex items-center gap-2">
            {watchHistory.length > 0 && (
              <button
                onClick={() => {
                  try {
                    playInterfaceTick();
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(watchHistory, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `eliteplex_watch_history_${currentUser?.name || 'user'}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  } catch (e) {
                    console.error("Failed to export watch history:", e);
                  }
                }}
                className="text-[9px] font-tech font-bold uppercase tracking-widest text-gold-base border border-gold-base/20 py-1.5 px-3 rounded-full hover:bg-gold-base/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-2.5 h-2.5 text-gold-base" />
                Backup
              </button>
            )}
            <button
              onClick={() => {
                playInterfaceTick();
                document.getElementById('profile-history-import-input')?.click();
              }}
              className="text-[9px] font-tech font-bold uppercase tracking-widest text-emerald-400 border border-emerald-500/20 py-1.5 px-3 rounded-full hover:bg-emerald-500/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-2.5 h-2.5 text-emerald-400" />
              Import
            </button>
            <button
              onClick={() => {
                if (typeof playInterfaceTick === 'function') playInterfaceTick();
                setShowBulkImportHistory(!showBulkImportHistory);
              }}
              className="text-[9px] font-tech font-bold uppercase tracking-widest text-gold-base border border-gold-base/20 py-1.5 px-3 rounded-full hover:bg-gold-base/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Database className="w-2.5 h-2.5 text-gold-base" />
              Bulk JSON Import
            </button>
            <input
              id="profile-history-import-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const parsed = JSON.parse(event.target?.result as string);
                    if (Array.isArray(parsed)) {
                      if (onImportWatchHistory) {
                        onImportWatchHistory(parsed);
                        playGoldenSuccessChime();
                      } else {
                        localStorage.setItem('ep_watch_history', JSON.stringify(parsed));
                        window.location.reload();
                      }
                    } else {
                      alert("Invalid file format. Please upload a valid watch history JSON array.");
                    }
                  } catch (err) {
                    alert("Failed to parse JSON file.");
                  }
                };
                reader.readAsText(file);
              }}
            />
          </div>
        </div>

        {showBulkImportHistory && (
          <div className="p-4 rounded-2xl border border-white/5 bg-black/40 flex flex-col gap-3">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider font-sans">Restore History via JSON String</span>
            <p className="text-[9px] text-white/40 leading-relaxed uppercase tracking-wider text-left">
              Paste a valid JSON array of movie specifications exported from a previous session or device to populate your local streaming history logs.
            </p>
            <textarea
              placeholder='[{"id": "movie-1", "title": "Inception", "posterUrl": "...", "videoUrl": "..."}]'
              value={bulkHistoryJson}
              onChange={(e) => setBulkHistoryJson(e.target.value)}
              className="w-full h-24 bg-neutral-900 border border-white/10 rounded-xl p-3 text-[11px] font-mono text-emerald-400 placeholder-white/20 focus:outline-none focus:border-gold-base/50"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setBulkHistoryJson("");
                  setShowBulkImportHistory(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-[9px] font-tech font-bold text-white/60 uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof playInterfaceTick === 'function') playInterfaceTick();
                  try {
                    const parsed = JSON.parse(bulkHistoryJson.trim());
                    if (Array.isArray(parsed)) {
                      // Validate if each item has at least an id and a title
                      const isValid = parsed.every(item => item && typeof item === 'object' && 'id' in item && 'title' in item);
                      if (!isValid) {
                        alert("Invalid format: Every movie item must have at least an 'id' and 'title'.");
                        return;
                      }
                      
                      if (onImportWatchHistory) {
                        onImportWatchHistory(parsed);
                        if (typeof playGoldenSuccessChime === 'function') playGoldenSuccessChime();
                        alert(`Successfully restored ${parsed.length} items to watch history!`);
                      } else {
                        localStorage.setItem('ep_watch_history', JSON.stringify(parsed));
                        alert(`Successfully restored ${parsed.length} items to watch history. Reloading...`);
                        window.location.reload();
                      }
                      setBulkHistoryJson("");
                      setShowBulkImportHistory(false);
                    } else {
                      alert("Invalid format. Please paste a valid JSON array of movies.");
                    }
                  } catch (e) {
                    alert("Failed to parse JSON string. Please verify it's a valid JSON array format.");
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-gold-base hover:bg-gold-light text-black text-[9px] font-tech font-black tracking-widest uppercase cursor-pointer"
              >
                RESTORE HISTORY
              </button>
            </div>
          </div>
        )}

        {watchHistory.length === 0 ? (
          <div className="p-8 text-center luxury-glass rounded-xxl border-white/5 text-xs text-white/40">
            No stream logs detected yet. Initiate movies to populate history.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
            {watchHistory.map((movie, idx) => (
              <div
                key={`history-${movie.id || idx}-${idx}`}
                onClick={() => {
                  if (onPlayMovie) {
                    onPlayMovie(movie);
                  } else {
                    onSelectMovie(movie);
                  }
                }}
                className="flex items-center gap-3 luxury-glass py-2 px-4 rounded-full shrink-0 select-none cursor-pointer hover:border-gold-base/15"
              >
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-white/10 shadow animate-fade-in"
                />
                <span className="text-[10px] font-bold text-white uppercase truncate tracking-wide max-w-[100px]">{movie.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Account Management Actions */}
      <div className="flex flex-col gap-3 border-t border-white/5 pt-6 mt-2">
        <span className="text-[9px] font-tech tracking-widest text-white/40 uppercase">ACCOUNT ACCESS SYSTEM</span>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="luxury-glass p-4 rounded-[20px] border-white/5 hover:border-red-500/20 hover:bg-red-500/5 text-left flex items-center justify-between cursor-pointer transition-all duration-300"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="text-xs font-serif font-bold text-red-400 uppercase tracking-wider">LOG OUT SESSION</span>
            </div>
            <ChevronRight className="w-4 h-4 text-red-500/40" />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="luxury-glass p-4 rounded-[20px] border-white/5 hover:border-red-600/30 hover:bg-red-600/10 text-left flex items-center justify-between cursor-pointer transition-all duration-300"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-red-500" />
              <span className="text-xs font-serif font-bold text-red-500 uppercase tracking-wider">DELETE ACCOUNT</span>
            </div>
            <ChevronRight className="w-4 h-4 text-red-500/40" />
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="luxury-glass p-6 sm:p-8 rounded-[32px] border border-white/10 w-full max-w-sm flex flex-col items-center text-center gap-6"
          >
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <LogOut className="w-6 h-6" />
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-serif font-black text-white tracking-wide uppercase">LOG OUT SESSION</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Are you sure you want to terminate your secure stream session? You can sign back in at any time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-tech font-bold text-[10px] tracking-widest uppercase rounded-full border border-white/10 transition-all cursor-pointer active:scale-95"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  onSwitchProfile();
                }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-750 text-white font-tech font-extrabold text-[10px] tracking-widest uppercase rounded-full transition-all cursor-pointer active:scale-95"
              >
                LOG OUT
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="luxury-glass p-6 sm:p-8 rounded-[32px] border border-red-500/20 w-full max-w-sm flex flex-col items-center text-center gap-6"
          >
            <div className="w-14 h-14 rounded-full bg-red-600/15 border border-red-600/30 flex items-center justify-center text-red-500 animate-pulse">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-serif font-black text-white tracking-wide uppercase">DELETE ACCOUNT</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                WARNING: This action is permanent and irreversible. All your watch history, favorites, settings, and VIP benefits will be deleted.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-tech font-bold text-[10px] tracking-widest uppercase rounded-full border border-white/10 transition-all cursor-pointer active:scale-95"
              >
                CANCEL
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 py-3 bg-red-600 hover:bg-red-750 text-white font-tech font-extrabold text-[10px] tracking-widest uppercase rounded-full transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {deletingAccount ? 'DELETING...' : 'DELETE FOREVER'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Switch Profile Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="luxury-glass p-6 rounded-[32px] border border-white/10 w-full max-w-md flex flex-col gap-5 max-h-[80vh] overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-gold-base animate-pulse" />
                <h3 className="text-sm font-serif font-black text-white tracking-widest uppercase">SELECT SYSTEM IDENTITY</h3>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-gold-base border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-tech tracking-widest text-white/40 uppercase">ACCESSING ID DATABASE...</span>
              </div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-10 text-xs text-white/40">
                No system accounts discovered.
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[50vh] scrollbar-thin scrollbar-thumb-white/10">
                {usersList.map((user, idx) => {
                  const isCurrent = user.id === currentUser.id;
                  return (
                    <div
                      key={`switch-user-${user.id || idx}-${idx}`}
                      onClick={() => {
                        onSwitchProfile(user);
                        setShowSwitchModal(false);
                      }}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                        isCurrent
                          ? 'border-gold-base/30 bg-gold-base/5'
                          : 'border-white/5 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-11 h-11 rounded-full p-[1.5px] bg-gradient-to-tr from-purple-accent via-gold-base to-purple-accent">
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover rounded-full border border-black"
                          />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-serif font-bold text-white tracking-wide uppercase line-clamp-1">
                            {user.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCurrent && (
                          <span className="text-[7px] font-tech font-extrabold tracking-widest text-gold-base border border-gold-base/20 px-2 py-1 rounded bg-gold-base/5 uppercase shrink-0">
                            ACTIVE ID
                          </span>
                        )}
                        {user.isPremium && !isCurrent && (
                          <span className="text-[7px] font-tech font-extrabold tracking-widest text-amber-500 border border-amber-500/20 px-2 py-1 rounded bg-amber-500/5 uppercase shrink-0">
                            ★ VIP
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-white/5 pt-4 text-[9px] font-tech text-white/30 text-center tracking-wider uppercase">
              CLICK AN IDENTITY TO TRANSMIT TERMINAL AUTHORITY
            </div>
          </motion.div>
        </div>
      )}

      {/* Redeem VIP Code Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="luxury-glass p-6 sm:p-8 rounded-[32px] border border-amber-500/30 w-full max-w-md flex flex-col gap-6 shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400 animate-pulse" />
                <h3 className="text-sm font-serif font-black text-white tracking-widest uppercase">REDEEM VIP ACCESS CODE</h3>
              </div>
              <button
                onClick={() => {
                  setShowRedeemModal(false);
                  setRedeemCode('');
                  setRedeemError(null);
                  setRedeemSuccess(false);
                }}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {redeemSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce">
                  <Crown className="w-8 h-8" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-md font-serif font-black text-emerald-400 uppercase tracking-widest">ACTIVATION SUCCESSFUL</h4>
                  <p className="text-xs text-white/70">Your Premium VIP Access has been successfully unlocked on this terminal.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRedeemCodeSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-tech text-white/40 tracking-wider uppercase">VIP Passkey Code</label>
                  <input
                    type="text"
                    required
                    placeholder="ENTER CODE (e.g. VIP2026, CINEPASS...)"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-center font-mono tracking-widest text-white focus:outline-none focus:border-amber-500/40 placeholder-white/20 transition-all uppercase"
                  />
                  {redeemError && (
                    <span className="text-[9px] font-tech text-red-400 uppercase tracking-wider text-center mt-1 animate-pulse">
                      {redeemError}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submittingRedeem}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110 text-black font-tech font-extrabold text-[10px] tracking-widest uppercase rounded-full transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
                >
                  {submittingRedeem ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'VERIFY AND REDEEM VIP'
                  )}
                </button>
              </form>
            )}

            <div className="border-t border-white/5 pt-4 text-[8px] font-tech text-white/30 text-center tracking-wider uppercase">
              REDEEM CODES ARE GENERATED BY SYSTEM ADMINISTRATORS
            </div>
          </motion.div>
        </div>
      )}

      {/* Movie / TV Serial Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="luxury-glass p-6 sm:p-8 rounded-[32px] border border-gold-base/30 w-full max-w-md flex flex-col gap-6 shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-base animate-pulse" />
                <h3 className="text-sm font-serif font-black text-white tracking-widest uppercase">REQUEST CINEMATIC TITLE</h3>
              </div>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setReqTitle('');
                  setReqNotes('');
                  setReqSuccess(false);
                }}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reqSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-md font-serif font-black text-emerald-400 uppercase tracking-widest">SUBMISSION SUCCESS</h4>
                  <p className="text-xs text-white/70">Your film/serial request has been transmitted successfully to the curator queue!</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-tech text-white/40 tracking-wider uppercase">Title of Spectacle</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Interstellar 2, Breaking Bad Season 6"
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-base/40 placeholder-white/20 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-tech text-white/40 tracking-wider uppercase">Media Category</label>
                  <select
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value as any)}
                    className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white/80 focus:outline-none focus:border-gold-base/40 transition-all"
                  >
                    <option value="movie">FILM / MOVIE</option>
                    <option value="series">DRAMA / TV SERIAL SERIES</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-tech text-white/40 tracking-wider uppercase">Desired Specifications (Optional)</label>
                  <textarea
                    placeholder="Desired resolution (4K, 1080p), audio track, IMDB links or language preferences..."
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    rows={3}
                    className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-base/40 placeholder-white/20 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReq}
                  className="w-full py-3.5 gold-gradient-bg text-black font-tech font-extrabold text-[10px] tracking-widest uppercase rounded-full transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-gold-base/10"
                >
                  {submittingReq ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'TRANSMIT REQUEST TO CURATORS'
                  )}
                </button>
              </form>
            )}

            <div className="border-t border-white/5 pt-4 text-[8px] font-tech text-white/30 text-center tracking-wider uppercase">
              MODERATORS ACTIVELY MONITOR THE TRANSMISSION FEED
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
