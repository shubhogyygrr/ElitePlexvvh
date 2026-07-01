import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import {
  Movie,
  UserProfile,
  AppNotification,
  MovieRequest,
  SubscribeRequest,
  RedeemCode,
  StreamingServer,
  LiveChannel,
  ScheduledSegment,
  CustomDomain,
  SupportChat,
  SupportMessage,
} from "../types";
import { MOCK_ANALYTICS, INITIAL_PROFILES } from "../data/mockData";
import {
  BarChart,
  Users,
  Film,
  Bell,
  Plus,
  Shield,
  Check,
  Trash2,
  Edit,
  Tv,
  Sparkles,
  Star,
  TrendingUp,
  Activity,
  Smartphone,
  Flame,
  Lock,
  Crown,
  Inbox,
  HelpCircle,
  User,
  RefreshCw,
  AlertCircle,
  Send,
  Wifi,
  Gauge,
  X,
  Key,
  Gift,
  PlusCircle,
  Server,
  GripVertical,
  Globe,
  Database,
  Download,
  CheckSquare,
  Square,
  Search,
  MessageSquare,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getMovieRequestsFromFirestore,
  updateMovieRequestStatusInFirestore,
  deleteMovieRequestFromFirestore,
  getSubscribeRequestsFromFirestore,
  updateSubscribeRequestStatusInFirestore,
  deleteSubscribeRequestFromFirestore,
  getAllUsersFromFirestore,
  deleteUserFromFirestore,
  banUserInFirestore,
  unbanUserInFirestore,
  updateUserPremiumStatusInFirestore,
  SubscribePlan,
  getPlansFromFirestore,
  addSubscribePlanToFirestore,
  deleteSubscribePlanFromFirestore,
  DEFAULT_PLANS,
  addRedeemCodeToFirestore,
  getRedeemCodesFromFirestore,
  deleteRedeemCodeFromFirestore,
  getNotificationsFromFirestore,
  addNotificationToFirestore,
  deleteNotificationFromFirestore,
  getSystemParamsFromFirestore,
  saveSystemParamsToFirestore,
  SystemParams,
  PaymentSettings,
  getPaymentSettingsFromFirestore,
  savePaymentSettingsToFirestore,
  getAdminCredentials,
  saveAdminCredentials,
  AdminCredentials,
  getStreamingServers,
  saveStreamingServer,
  deleteStreamingServer,
  subscribeToStreamingServers,
  getLiveChannelsFromFirestore,
  saveLiveChannelToFirestore,
  deleteLiveChannelFromFirestore,
  getCustomDomainsFromFirestore,
  saveCustomDomainToFirestore,
  deleteCustomDomainFromFirestore,
  subscribeToSupportChats,
  saveSupportChatToFirestore,
  addMessageToSupportChat,
  deleteSupportChatFromFirestore,
  getSearchQueriesFromFirestore,
  SearchQueryItem,
  getLiveTrafficFromFirestore,
  saveLiveTrafficToFirestore,
} from "../lib/firestoreService";
import { ResolvedImage } from "./ResolvedImage";
import ServerManager from "./ServerManager";

interface AdminPanelViewProps {
  movies: Movie[];
  onAddMovie: (movie: Movie) => void;
  onDeleteMovie: (id: string) => void;
  onClearAllMovies?: () => void;
  onClearAllMoviesOnly?: () => void;
  onClearAllSeriesOnly?: () => void;
  onUpdateFeatured: (id: string) => void;
  onUpdateTrending: (id: string) => void;
  onSendNotification: (notif: AppNotification) => void;
  onClose: () => void;
  movieCategories: string[];
  seriesCategories: string[];
  onSaveMovieCategories: (list: string[]) => void;
  onSaveSeriesCategories: (list: string[]) => void;
  onOpenMovieAddModal?: () => void; // Launches the advanced Movie Modal
  onOpenSeriesAddModal?: () => void; // Launches the advanced Series Modal with Seasons/Episodes
  onEditMovie?: (movie: Movie) => void;
  onEditSeries?: (series: Movie) => void;
  onDeleteMovieClick?: (movie: Movie) => void;
  currentUser?: UserProfile;
  key?: string;
  trendingAutoSliderEnabled: boolean;
  onToggleTrendingAutoSlider: () => void;
}

export default function AdminPanelView({
  movies,
  onAddMovie,
  onDeleteMovie,
  onClearAllMovies,
  onClearAllMoviesOnly,
  onClearAllSeriesOnly,
  onUpdateFeatured,
  onUpdateTrending,
  onSendNotification,
  onClose,
  movieCategories,
  seriesCategories,
  onSaveMovieCategories,
  onSaveSeriesCategories,
  onOpenMovieAddModal,
  onOpenSeriesAddModal,
  onEditMovie,
  onEditSeries,
  onDeleteMovieClick,
  currentUser,
  trendingAutoSliderEnabled,
  onToggleTrendingAutoSlider,
}: AdminPanelViewProps) {
  const [activeTab, setActiveTab] = useState<
    | "analytics"
    | "catalog"
    | "categories"
    | "broadband"
    | "users"
    | "plans"
    | "notifications"
    | "requests"
    | "settings"
    | "servers"
    | "livetv"
  >("catalog");
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  // Dynamically calculate Genre Popularity from current Firestore catalog
  const genrePopularityData = React.useMemo(() => {
    const counts: Record<string, number> = {
      Cinematic: 0,
      Action: 0,
      "Sci-Fi": 0,
      Drama: 0,
      Thriller: 0,
      Mystery: 0,
      Horror: 0,
    };

    movies.forEach((movie) => {
      if (movie.genres && Array.isArray(movie.genres)) {
        movie.genres.forEach((g) => {
          if (g && g !== "All") {
            const norm = g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
            counts[norm] = (counts[norm] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(counts).map(([genre, count]) => ({
      subject: genre,
      count,
      fullMark: Math.max(...Object.values(counts), 5),
    }));
  }, [movies]);

  // Live TV Traffic concurrent data loaded from Firebase
  const [liveTvConcurrentUsersData, setLiveTvConcurrentUsersData] = useState<{ time: string; total: number; uhd: number; hd: number }[]>([]);

  useEffect(() => {
    async function loadTraffic() {
      try {
        const traffic = await getLiveTrafficFromFirestore();
        if (traffic && traffic.length > 0) {
          setLiveTvConcurrentUsersData(traffic);
        } else {
          // Fallback structure
          const baseUsers = [120, 145, 160, 130, 95, 70, 50, 45, 65, 90, 110, 135, 150, 180, 220, 255, 310, 395, 450, 480, 410, 350, 280, 190];
          const data = [];
          const currentHour = new Date().getHours();
          for (let i = 24; i > 0; i--) {
            const hour = (24 + currentHour - i) % 24;
            const formattedHour = `${hour.toString().padStart(2, "0")}:00`;
            const val = baseUsers[(24 - i) % 24];
            const concurrentUsers = val;
            const uhdViewers = Math.floor(concurrentUsers * 0.45);
            const hdViewers = concurrentUsers - uhdViewers;
            data.push({
              time: formattedHour,
              total: concurrentUsers,
              uhd: uhdViewers,
              hd: hdViewers,
            });
          }
          setLiveTvConcurrentUsersData(data);
        }
      } catch (err) {
        console.error("Error loading live traffic from Firestore:", err);
      }
    }
    loadTraffic();
  }, []);

  const [liveTvChartType, setLiveTvChartType] = useState<"line" | "area">("line");

  const peakTrafficInfo = useMemo(() => {
    if (!liveTvConcurrentUsersData || liveTvConcurrentUsersData.length === 0) return null;
    let peak = liveTvConcurrentUsersData[0];
    for (const d of liveTvConcurrentUsersData) {
      if (d.total > peak.total) {
        peak = d;
      }
    }
    return peak;
  }, [liveTvConcurrentUsersData]);

  // States for Live TV Traffic Controller (Firebase Load Add)
  const [showTrafficController, setShowTrafficController] = useState(false);
  const [inputTrafficHour, setInputTrafficHour] = useState("18:00");
  const [inputTrafficUhd, setInputTrafficUhd] = useState(120);
  const [inputTrafficHd, setInputTrafficHd] = useState(150);

  const handleUpdateSingleHourTraffic = async () => {
    try {
      const updatedList = liveTvConcurrentUsersData.map((d) => {
        if (d.time === inputTrafficHour) {
          const total = inputTrafficUhd + inputTrafficHd;
          return {
            time: d.time,
            total,
            uhd: inputTrafficUhd,
            hd: inputTrafficHd,
          };
        }
        return d;
      });

      const exists = liveTvConcurrentUsersData.some(d => d.time === inputTrafficHour);
      if (!exists) {
        const total = inputTrafficUhd + inputTrafficHd;
        updatedList.push({
          time: inputTrafficHour,
          total,
          uhd: inputTrafficUhd,
          hd: inputTrafficHd,
        });
        updatedList.sort((a, b) => a.time.localeCompare(b.time));
      }

      setLiveTvConcurrentUsersData(updatedList);
      await saveLiveTrafficToFirestore(updatedList);
    } catch (err) {
      console.error("Error updating single hour traffic:", err);
    }
  };

  const handleGenerateTrafficPreset = async (preset: "standard" | "peak" | "low") => {
    try {
      let baseUsers = [120, 145, 160, 130, 95, 70, 50, 45, 65, 90, 110, 135, 150, 180, 220, 255, 310, 395, 450, 480, 410, 350, 280, 190];
      let multiplier = 1.0;
      let noiseLevel = 15;

      if (preset === "peak") {
        multiplier = 2.5;
        noiseLevel = 45;
      } else if (preset === "low") {
        multiplier = 0.4;
        noiseLevel = 5;
      }

      const data = [];
      const currentHour = new Date().getHours();
      for (let i = 24; i > 0; i--) {
        const hour = (24 + currentHour - i) % 24;
        const formattedHour = `${hour.toString().padStart(2, "0")}:00`;
        const val = baseUsers[(24 - i) % 24];
        const randomNoise = Math.floor(Math.sin(i) * noiseLevel + Math.cos(i * 2) * (noiseLevel / 3));
        const concurrentUsers = Math.max(10, Math.floor(val * multiplier) + randomNoise);
        const uhdViewers = Math.floor(concurrentUsers * 0.45);
        const hdViewers = concurrentUsers - uhdViewers;
        data.push({
          time: formattedHour,
          total: concurrentUsers,
          uhd: uhdViewers,
          hd: hdViewers,
        });
      }

      setLiveTvConcurrentUsersData(data);
      await saveLiveTrafficToFirestore(data);
    } catch (err) {
      console.error("Error generating traffic preset:", err);
    }
  };

  // Sub-tabs for Catalog and Users to package requests and notifications beautifully
  const [catalogSubTab, setCatalogSubTab] = useState<"manage" | "requests">(
    "manage",
  );
  const [usersSubTab, setUsersSubTab] = useState<
    "directory" | "upgrades" | "plans" | "broadcast" | "redeem" | "config"
  >("directory");

  const [systemParams, setSystemParams] = useState<SystemParams | null>(null);
  const [isParamsLoading, setIsParamsLoading] = useState(false);
  const [isSavingParams, setIsSavingParams] = useState(false);

  // Admin credentials, PIN, and Firebase states
  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [appSecurityPinInput, setAppSecurityPinInput] = useState("");
  const [tmdbApiKeyInput, setTmdbApiKeyInput] = useState("");
  const [firebaseApiKeyInput, setFirebaseApiKeyInput] = useState("");
  const [firebaseAuthDomainInput, setFirebaseAuthDomainInput] = useState("");
  const [firebaseDatabaseURLInput, setFirebaseDatabaseURLInput] = useState("");
  const [firebaseProjectIdInput, setFirebaseProjectIdInput] = useState("");
  const [firebaseStorageBucketInput, setFirebaseStorageBucketInput] =
    useState("");
  const [firebaseMessagingSenderIdInput, setFirebaseMessagingSenderIdInput] =
    useState("");
  const [firebaseAppIdInput, setFirebaseAppIdInput] = useState("");
  const [firebaseMeasurementIdInput, setFirebaseMeasurementIdInput] =
    useState("");
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Backup & Restore Center states
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupSearchQuery, setBackupSearchQuery] = useState("");
  const [backupTypeFilter, setBackupTypeFilter] = useState<"all" | "movie" | "series">("all");
  const [selectedBackupItemIds, setSelectedBackupItemIds] = useState<string[]>([]);
  const [previewImportItems, setPreviewImportItems] = useState<Movie[]>([]);
  const [selectedImportItemIds, setSelectedImportItemIds] = useState<string[]>([]);
  const [selectedPreviewMovie, setSelectedPreviewMovie] = useState<Movie | null>(null);

  // Catalog filtering states
  const [movieCatalogSearch, setMovieCatalogSearch] = useState("");
  const [seriesCatalogSearch, setSeriesCatalogSearch] = useState("");

  const loadSettingsData = async () => {
    setIsSettingsLoading(true);
    try {
      const data = await getAdminCredentials();
      setAdminEmailInput(data.adminEmail || "admin@gmail.com");
      setAdminPasswordInput(data.adminPassword || "AdminPro");
      setAppSecurityPinInput(data.appSecurityPin || "");
      setTmdbApiKeyInput(data.tmdbApiKey || "");
      setFirebaseApiKeyInput(data.firebaseApiKey || "");
      setFirebaseAuthDomainInput(data.firebaseAuthDomain || "");
      setFirebaseDatabaseURLInput(data.firebaseDatabaseURL || "");
      setFirebaseProjectIdInput(data.firebaseProjectId || "");
      setFirebaseStorageBucketInput(data.firebaseStorageBucket || "");
      setFirebaseMessagingSenderIdInput(data.firebaseMessagingSenderId || "");
      setFirebaseAppIdInput(data.firebaseAppId || "");
      setFirebaseMeasurementIdInput(data.firebaseMeasurementId || "");
    } catch (error) {
      console.error("Could not fetch admin credentials:", error);
    } finally {
      setIsSettingsLoading(false);
    }
  };

  // Live TV states
  const [liveChannels, setLiveChannels] = useState<LiveChannel[]>([]);
  const [isLiveChannelsLoading, setIsLiveChannelsLoading] = useState(true);
  const [showLiveChannelModal, setShowLiveChannelModal] = useState(false);
  const [selectedLiveChannelForEdit, setSelectedLiveChannelForEdit] =
    useState<LiveChannel | null>(null);

  // Live TV form inputs
  const [channelIdInput, setChannelIdInput] = useState("");
  const [channelNameInput, setChannelNameInput] = useState("");
  const [channelLogoInput, setChannelLogoInput] = useState("");
  const [channelCurrentProgramInput, setChannelCurrentProgramInput] =
    useState("");
  const [channelNextProgramInput, setChannelNextProgramInput] = useState("");
  const [channelCategoryInput, setChannelCategoryInput] = useState<
    "Sports" | "Movies" | "News" | "Entertainment"
  >("Movies");
  const [channelViewerCountInput, setChannelViewerCountInput] =
    useState("1.5K");
  const [channelStreamUrlInput, setChannelStreamUrlInput] = useState("");
  const [channelIsPremiumInput, setChannelIsPremiumInput] = useState(false);
  const [channelUpcomingTimeInput, setChannelUpcomingTimeInput] = useState("");
  const [channelUpcomingStreamUrlInput, setChannelUpcomingStreamUrlInput] =
    useState("");
  const [channelUpcomingSegments, setChannelUpcomingSegments] = useState<
    ScheduledSegment[]
  >([]);
  const [isSavingLiveChannel, setIsSavingLiveChannel] = useState(false);

  // Custom Domain Management States
  const [customDomains, setCustomDomains] = useState<CustomDomain[]>([]);
  const [isDomainsLoading, setIsDomainsLoading] = useState(true);
  const [domainInput, setDomainInput] = useState("");
  const [siteNameInput, setSiteNameInput] = useState("");
  const [domainAccentInput, setDomainAccentInput] = useState("#D4AF37");
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [dnsLang, setDnsLang] = useState<'bn' | 'hi' | 'en'>('bn');

  // Support Chat States
  const [supportChats, setSupportChats] = useState<SupportChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [chatReplyInput, setChatReplyInput] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  
  // New Chat Form States
  const [newChatTitle, setNewChatTitle] = useState("");
  const [newChatUserName, setNewChatUserName] = useState("");
  const [newChatUserEmail, setNewChatUserEmail] = useState("");
  const [newChatFirstMsg, setNewChatFirstMsg] = useState("");

  // Search Queries States loaded from Firestore
  const [firebaseSearchQueries, setFirebaseSearchQueries] = useState<SearchQueryItem[]>([]);
  const [isSearchQueriesLoading, setIsSearchQueriesLoading] = useState(true);

  // Table search and expand states
  const [tableSearchFilter, setTableSearchFilter] = useState("");
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);

  // Search Date Range Filter States
  const [searchDatePreset, setSearchDatePreset] = useState<"7days" | "30days" | "60days" | "custom">("7days");
  const [searchStartDate, setSearchStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [searchEndDate, setSearchEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const handleSearchPresetChange = (preset: "7days" | "30days" | "60days" | "custom") => {
    setSearchDatePreset(preset);
    if (preset !== "custom") {
      const days = preset === "7days" ? 7 : preset === "30days" ? 30 : 60;
      const d = new Date();
      d.setDate(d.getDate() - days);
      setSearchStartDate(d.toISOString().split("T")[0]);
      setSearchEndDate(new Date().toISOString().split("T")[0]);
    }
  };

  const loadSearchQueries = async () => {
    setIsSearchQueriesLoading(true);
    try {
      const list = await getSearchQueriesFromFirestore();
      setFirebaseSearchQueries(list);
    } catch (err) {
      console.error("Error loading search queries:", err);
    } finally {
      setIsSearchQueriesLoading(false);
    }
  };

  useEffect(() => {
    loadSearchQueries();
  }, []);

  const filteredSearchQueries = useMemo(() => {
    return firebaseSearchQueries
      .map((item) => {
        if (!item.history || item.history.length === 0) {
          const itemDate = item.lastSearchedAt ? item.lastSearchedAt.split("T")[0] : "";
          const isMatch = itemDate && itemDate >= searchStartDate && itemDate <= searchEndDate;
          return {
            ...item,
            count: isMatch ? item.count : 0
          };
        }

        const matchedHistory = item.history.filter(
          (h) => h.date >= searchStartDate && h.date <= searchEndDate
        );
        const rangeCount = matchedHistory.reduce((sum, h) => sum + h.count, 0);

        return {
          ...item,
          count: rangeCount
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [firebaseSearchQueries, searchStartDate, searchEndDate]);

  const tableSearchQueries = useMemo(() => {
    let list = filteredSearchQueries;
    if (tableSearchFilter.trim()) {
      const low = tableSearchFilter.toLowerCase();
      list = list.filter((item) => 
        item.term.toLowerCase().includes(low) || 
        item.category.toLowerCase().includes(low)
      );
    }
    return list.slice(0, 20);
  }, [filteredSearchQueries, tableSearchFilter]);

  useEffect(() => {
    const unsubscribe = subscribeToSupportChats((chatsList) => {
      setSupportChats(chatsList);
      // Keep selected chat updated with real-time messages
      setSelectedChat((current) => {
        if (!current) return null;
        const updated = chatsList.find((c) => c.id === current.id);
        return updated || null;
      });
    });
    return () => unsubscribe();
  }, []);

  const handleSendChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !chatReplyInput.trim()) return;
    setIsSendingReply(true);
    try {
      const newMsg: SupportMessage = {
        id: `msg-${Date.now()}`,
        sender: 'admin',
        text: chatReplyInput.trim(),
        timestamp: new Date().toISOString()
      };
      await addMessageToSupportChat(selectedChat.id, newMsg);
      setChatReplyInput("");
    } catch (err) {
      console.error("Error sending reply:", err);
      alert("Failed to send reply. Please try again.");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatTitle.trim() || !newChatUserName.trim() || !newChatUserEmail.trim() || !newChatFirstMsg.trim()) {
      alert("Please fill in all the chat details.");
      return;
    }
    try {
      const chatId = `chat-${Date.now()}`;
      const firstMsg: SupportMessage = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: newChatFirstMsg.trim(),
        timestamp: new Date().toISOString()
      };
      const newChat: SupportChat = {
        id: chatId,
        title: newChatTitle.trim(),
        userName: newChatUserName.trim(),
        userEmail: newChatUserEmail.trim(),
        status: 'open',
        messages: [firstMsg],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveSupportChatToFirestore(newChat);
      
      // Select the newly created chat
      setSelectedChat(newChat);
      
      // Reset form & state
      setNewChatTitle("");
      setNewChatUserName("");
      setNewChatUserEmail("");
      setNewChatFirstMsg("");
      setIsCreatingNewChat(false);
    } catch (err) {
      console.error("Error creating support chat:", err);
      alert("Failed to create new chat session.");
    }
  };

  const handleDeleteChatSession = async (chatId: string) => {
    if (!window.confirm("Are you sure you want to delete this chat session permanently from Firestore?")) {
      return;
    }
    try {
      await deleteSupportChatFromFirestore(chatId);
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
    } catch (err) {
      console.error("Error deleting chat session:", err);
      alert("Failed to delete chat session.");
    }
  };


  const loadLiveChannels = async () => {
    setIsLiveChannelsLoading(true);
    try {
      const list = await getLiveChannelsFromFirestore();
      setLiveChannels(list);
    } catch (error) {
      console.error("Error loading Live TV channels in AdminPanel:", error);
    } finally {
      setIsLiveChannelsLoading(false);
    }
  };

  const loadCustomDomains = async () => {
    setIsDomainsLoading(true);
    try {
      const list = await getCustomDomainsFromFirestore();
      setCustomDomains(list);
    } catch (error) {
      console.error("Error loading Custom Domains in AdminPanel:", error);
    } finally {
      setIsDomainsLoading(false);
    }
  };

  const handleSaveCustomDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;
    setIsSavingDomain(true);
    try {
      let cleanedDomain = domainInput.trim().toLowerCase();
      // Strip protocols
      if (cleanedDomain.startsWith("http://")) {
        cleanedDomain = cleanedDomain.substring(7);
      } else if (cleanedDomain.startsWith("https://")) {
        cleanedDomain = cleanedDomain.substring(8);
      }
      // Strip trailing slash and path
      const slash = cleanedDomain.indexOf("/");
      if (slash !== -1) {
        cleanedDomain = cleanedDomain.substring(0, slash);
      }
      // Strip port if present
      const colon = cleanedDomain.indexOf(":");
      if (colon !== -1) {
        cleanedDomain = cleanedDomain.substring(0, colon);
      }

      const domainId = `dom-${Date.now()}`;
      const newDomain: CustomDomain = {
        id: domainId,
        domain: cleanedDomain,
        status: "active",
        sslStatus: "active", // Live instant SSL validation
        customAccent: domainAccentInput,
        siteName: siteNameInput.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      await saveCustomDomainToFirestore(newDomain);
      setDomainInput("");
      setSiteNameInput("");
      setDomainAccentInput("#D4AF37");
      await loadCustomDomains();
      alert(`Custom Domain mapping registered: ${cleanedDomain}`);
    } catch (err) {
      console.error("Error saving custom domain:", err);
      alert("Failed to save custom domain to database.");
    } finally {
      setIsSavingDomain(false);
    }
  };

  const handleDeleteCustomDomain = async (id: string) => {
    if (!confirm("Are you sure you want to decommission this custom domain? All mapping will be deactivated.")) return;
    try {
      await deleteCustomDomainFromFirestore(id);
      await loadCustomDomains();
      alert("Custom Domain successfully decommissioned.");
    } catch (err) {
      console.error("Error deleting custom domain:", err);
      alert("Failed to delete custom domain.");
    }
  };

  // Broadband Speed Test & Allocation States
  const [isSpeedTesting, setIsSpeedTesting] = useState(false);
  const [speedTestStage, setSpeedTestStage] = useState<
    "idle" | "ping" | "download" | "upload" | "complete"
  >("idle");
  const [speedTestProgress, setSpeedTestProgress] = useState(0);
  const [measuredPing, setMeasuredPing] = useState(0);
  const [measuredJitter, setMeasuredJitter] = useState(0);
  const [measuredDownload, setMeasuredDownload] = useState(0);
  const [measuredUpload, setMeasuredUpload] = useState(0);
  const [standardSpeed, setStandardSpeed] = useState(50);
  const [eliteSpeed, setEliteSpeed] = useState(150);
  const [vipSpeed, setVipSpeed] = useState(500);
  const [isSavingISPConfig, setIsSavingISPConfig] = useState(false);

  // Movie Requests State
  const [movieRequests, setMovieRequests] = useState<MovieRequest[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);

  // Subscribe/Payment Requests State
  const [requestsSubTab, setRequestsSubTab] = useState<"titles" | "subscribe">(
    "titles",
  );
  const [subscribeRequests, setSubscribeRequests] = useState<
    SubscribeRequest[]
  >([]);
  const [isSubscribeRequestsLoading, setIsSubscribeRequestsLoading] =
    useState(false);

  // Subscription Plans Management States
  const [adminPlans, setAdminPlans] = useState<SubscribePlan[]>([]);
  const [isAdminPlansLoading, setIsAdminPlansLoading] = useState(false);

  // Plan Creation Form States
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanPeriod, setNewPlanPeriod] = useState("1 Month");
  const [newPlanPrice, setNewPlanPrice] = useState("$9.99");
  const [newPlanTag, setNewPlanTag] = useState("VIP TIER");
  const [newPlanColor, setNewPlanColor] = useState(
    "border-white/10 bg-white/5",
  );
  const [newPlanExpireDays, setNewPlanExpireDays] = useState(30);
  const [newPlanBenefitsInput, setNewPlanBenefitsInput] = useState(""); // comma-separated
  const [newPlanClosedBenefitsInput, setNewPlanClosedBenefitsInput] =
    useState(""); // comma-separated
  const [isAddingPlan, setIsAddingPlan] = useState(false);

  // Plan Edit & Delete states
  const [editingPlan, setEditingPlan] = useState<SubscribePlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<SubscribePlan | null>(null);

  // Edit Plan Form States
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanPrice, setEditPlanPrice] = useState("");
  const [editPlanPeriod, setEditPlanPeriod] = useState("");
  const [editPlanExpireDays, setEditPlanExpireDays] = useState(30);
  const [editPlanTag, setEditPlanTag] = useState("");
  const [editPlanColor, setEditPlanColor] = useState(
    "border-white/10 bg-white/5",
  );
  const [editPlanBenefits, setEditPlanBenefits] = useState("");

  useEffect(() => {
    if (editingPlan) {
      setEditPlanName(editingPlan.name);
      setEditPlanPrice(editingPlan.price);
      setEditPlanPeriod(editingPlan.period);
      setEditPlanExpireDays(editingPlan.expireDaysCount || 30);
      setEditPlanTag(editingPlan.tag || "");
      setEditPlanColor(editingPlan.color || "border-white/10 bg-white/5");
      setEditPlanBenefits(editingPlan.benefits.join(", "));
    }
  }, [editingPlan]);

  // Redeem Code States
  const [redeemCodes, setRedeemCodes] = useState<RedeemCode[]>([]);
  const [isRedeemCodesLoading, setIsRedeemCodesLoading] = useState(false);
  const [newCodeText, setNewCodeText] = useState("");
  const [newCodeType, setNewCodeType] = useState<
    "premium" | "movie" | "series"
  >("premium");
  const [newCodePremiumDays, setNewCodePremiumDays] = useState(30);
  const [newCodeTargetId, setNewCodeTargetId] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Broadcasted Notifications state
  const [broadcastNotifications, setBroadcastNotifications] = useState<
    AppNotification[]
  >([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const loadBroadcastNotifications = async () => {
    setIsNotificationsLoading(true);
    try {
      const data = await getNotificationsFromFirestore();
      setBroadcastNotifications(data);
    } catch (error) {
      console.error("Could not fetch broadcast notifications:", error);
    } finally {
      setIsNotificationsLoading(false);
    }
  };

  const loadAdminPlans = async () => {
    setIsAdminPlansLoading(true);
    try {
      const data = await getPlansFromFirestore();
      setAdminPlans(data);
    } catch (error) {
      console.error("Could not fetch plans:", error);
    } finally {
      setIsAdminPlansLoading(false);
    }
  };

  const loadRedeemCodes = async () => {
    setIsRedeemCodesLoading(true);
    try {
      const data = await getRedeemCodesFromFirestore();
      setRedeemCodes(data);
    } catch (error) {
      console.error("Could not fetch redeem codes:", error);
    } finally {
      setIsRedeemCodesLoading(false);
    }
  };

  const handleGenerateRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGeneratingCode) return;
    setIsGeneratingCode(true);
    try {
      const codeStr =
        newCodeText.trim() ||
        Math.random().toString(36).substr(2, 8).toUpperCase();
      let targetTitle = "";
      if (newCodeType === "movie" || newCodeType === "series") {
        const targetMedia = movies.find((m) => m.id === newCodeTargetId);
        targetTitle = targetMedia ? targetMedia.title : "Selected Media";
      }

      const newCode: RedeemCode = {
        id: `code_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        code: codeStr,
        type: newCodeType,
        status: "active",
        premiumDays:
          newCodeType === "premium" ? Number(newCodePremiumDays) : undefined,
        targetId: newCodeType !== "premium" ? newCodeTargetId : undefined,
        targetTitle: newCodeType !== "premium" ? targetTitle : undefined,
        createdAt: new Date().toISOString(),
      };

      await addRedeemCodeToFirestore(newCode);
      setNewCodeText("");
      setNewCodeTargetId("");
      alert(`Redeem code "${codeStr}" generated successfully!`);
      await loadRedeemCodes();
    } catch (error) {
      console.error("Could not generate redeem code:", error);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleOpenAddServer = () => {
    setSelectedServerForEdit(null);
    setServerFormName("");
    setServerFormUrl("");
    setServerFormCountry("United States");
    setServerFormStatus("online");
    setServerFormLatency(45);
    setServerFormIsPremium(false);
    setServerFormSpeed("1 Gbps");
    setServerFormLoad(25);
    setShowServerModal(true);
  };

  const handleOpenEditServer = (srv: StreamingServer) => {
    setSelectedServerForEdit(srv);
    setServerFormName(srv.name);
    setServerFormUrl(srv.url);
    setServerFormCountry(srv.country);
    setServerFormStatus(srv.status);
    setServerFormLatency(srv.latency);
    setServerFormIsPremium(srv.isPremium);
    setServerFormSpeed(srv.speed);
    setServerFormLoad(srv.load);
    setShowServerModal(true);
  };

  const handleSaveServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingServer) return;
    setIsSavingServer(true);
    try {
      const serverId = selectedServerForEdit
        ? selectedServerForEdit.id
        : `srv-${Date.now()}`;
      const serverData: StreamingServer = {
        id: serverId,
        name: serverFormName.trim(),
        url:
          serverFormUrl.trim() ||
          `https://${serverId}.eliteplex.co/stream/cinematic`,
        country: serverFormCountry,
        status: serverFormStatus,
        latency: Number(serverFormLatency),
        isPremium: serverFormIsPremium,
        speed: serverFormSpeed,
        load: Number(serverFormLoad),
      };

      await saveStreamingServer(serverData);
      alert(
        selectedServerForEdit
          ? "Streaming server reconfigured successfully!"
          : "New CDN edge server deployed successfully!",
      );
      setShowServerModal(false);
      loadServers();
    } catch (err: any) {
      alert("Error deploying server: " + err.message);
    } finally {
      setIsSavingServer(false);
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to permanently decommission this streaming server node?",
      )
    ) {
      try {
        await deleteStreamingServer(id);
        alert("Server node decommissioned and removed from active registries.");
        loadServers();
      } catch (err: any) {
        alert("Error decommissioning server: " + err.message);
      }
    }
  };

  // Load requests function
  const loadMovieRequests = async () => {
    setIsRequestsLoading(true);
    try {
      const data = await getMovieRequestsFromFirestore();
      setMovieRequests(data);
    } catch (error) {
      console.error("Could not fetch movie requests from AdminPanel:", error);
    } finally {
      setIsRequestsLoading(false);
    }
  };

  const loadSubscribeRequests = async () => {
    setIsSubscribeRequestsLoading(true);
    try {
      const data = await getSubscribeRequestsFromFirestore();
      setSubscribeRequests(data);
    } catch (error) {
      console.error("Could not fetch subscribe requests in AdminPanel:", error);
    } finally {
      setIsSubscribeRequestsLoading(false);
    }
  };

  // Streaming Servers Management States
  const [servers, setServers] = useState<StreamingServer[]>([]);
  const [isServersLoading, setIsServersLoading] = useState(false);
  const [isSavingServer, setIsSavingServer] = useState(false);
  const [serverSearchQuery, setServerSearchQuery] = useState("");

  // Real-time listener for streaming edge nodes
  useEffect(() => {
    const unsubscribe = subscribeToStreamingServers((data) => {
      setServers(data);
    });
    return () => unsubscribe();
  }, []);

  // Category Drag and Drop indices states
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (index: number) => {
    setDragOverIdx(index);
  };

  const handleDragEndMovie = () => {
    if (
      draggedIdx !== null &&
      dragOverIdx !== null &&
      draggedIdx !== dragOverIdx
    ) {
      const reordered = [...movieCategories];
      const [draggedItem] = reordered.splice(draggedIdx, 1);
      reordered.splice(dragOverIdx, 0, draggedItem);
      onSaveMovieCategories(reordered);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEndSeries = () => {
    if (
      draggedIdx !== null &&
      dragOverIdx !== null &&
      draggedIdx !== dragOverIdx
    ) {
      const reordered = [...seriesCategories];
      const [draggedItem] = reordered.splice(draggedIdx, 1);
      reordered.splice(dragOverIdx, 0, draggedItem);
      onSaveSeriesCategories(reordered);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Movie list selection mode states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([]);

  const handleToggleSelectMovie = (id: string) => {
    setSelectedMovieIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleSelectAll = (type: "movie" | "series") => {
    const list = movies.filter((m) => m.type === type).map((m) => m.id);
    const allSelected = list.every((id) => selectedMovieIds.includes(id));
    if (allSelected) {
      setSelectedMovieIds((prev) => prev.filter((id) => !list.includes(id)));
    } else {
      setSelectedMovieIds((prev) => Array.from(new Set([...prev, ...list])));
    }
  };

  const handleBatchDeleteSelected = async () => {
    if (selectedMovieIds.length === 0) return;
    const count = selectedMovieIds.length;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete the ${count} selected items from the catalog?`,
      )
    ) {
      return;
    }

    setIsServersLoading(true);
    for (const id of selectedMovieIds) {
      if (onDeleteMovie) {
        await onDeleteMovie(id);
      }
    }
    setSelectedMovieIds([]);
    setIsSelectionMode(false);
    setIsServersLoading(false);
    alert(`Successfully deleted ${count} items from Firestore!`);
  };

  // Server Form States
  const [selectedServerForEdit, setSelectedServerForEdit] =
    useState<StreamingServer | null>(null);
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverFormName, setServerFormName] = useState("");
  const [serverFormUrl, setServerFormUrl] = useState("");
  const [serverFormCountry, setServerFormCountry] = useState("United States");
  const [serverFormStatus, setServerFormStatus] = useState<
    "online" | "offline" | "maintenance"
  >("online");
  const [serverFormLatency, setServerFormLatency] = useState(50);
  const [serverFormIsPremium, setServerFormIsPremium] = useState(false);
  const [serverFormSpeed, setServerFormSpeed] = useState("1 Gbps");
  const [serverFormLoad, setServerFormLoad] = useState(30);

  const loadServers = async () => {
    setIsServersLoading(true);
    try {
      const data = await getStreamingServers();
      setServers(data);
    } catch (error) {
      console.error("Could not fetch streaming servers in AdminPanel:", error);
    } finally {
      setIsServersLoading(false);
    }
  };

  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const loadUsers = async () => {
    setIsUsersLoading(true);
    try {
      const data = await getAllUsersFromFirestore();
      if (data && data.length > 0) {
        setUsers(data);
      } else {
        setUsers(INITIAL_PROFILES);
      }
    } catch (err) {
      console.error("Could not fetch users in AdminPanel:", err);
      setUsers(INITIAL_PROFILES);
    } finally {
      setIsUsersLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
      loadSubscribeRequests();
      loadAdminPlans();
      loadRedeemCodes();
      loadSystemParams();
    } else if (activeTab === "notifications") {
      loadUsers();
      loadSubscribeRequests();
      loadBroadcastNotifications();
    } else if (activeTab === "catalog") {
      loadMovieRequests();
    } else if (activeTab === "requests") {
      loadMovieRequests();
      loadSubscribeRequests();
    } else if (activeTab === "plans") {
      loadAdminPlans();
    } else if (activeTab === "settings") {
      loadSettingsData();
    } else if (activeTab === "servers") {
      loadServers();
    } else if (activeTab === "livetv") {
      loadLiveChannels();
    }
  }, [activeTab, catalogSubTab, usersSubTab]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsAdminLoading(false), 400);
          return 100;
        }
        return prev + 5;
      });
    }, 45);
    return () => clearInterval(interval);
  }, []);

  // Add Movie Form States
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"movie" | "series">("movie");
  const [year, setYear] = useState(2026);
  const [runtime, setRuntime] = useState("2h 10m");
  const [rating, setRating] = useState(8.2);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [overview, setOverview] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [backdropUrl, setBackdropUrl] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Set default category when type or category list changes
  React.useEffect(() => {
    const cats = type === "movie" ? movieCategories : seriesCategories;
    const filtered = cats.filter((c) => c !== "All");
    if (filtered.length > 0) {
      setSelectedCategory(filtered[0]);
    } else if (cats.length > 0) {
      setSelectedCategory(cats[0]);
    }
  }, [type, movieCategories, seriesCategories]);

  // Push Notification States
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [selectedNotifMovieId, setSelectedNotifMovieId] = useState("");
  const [selectedNotifSeasonNumber, setSelectedNotifSeasonNumber] = useState<
    number | undefined
  >(undefined);
  const [selectedNotifEpisodeNumber, setSelectedNotifEpisodeNumber] = useState<
    number | undefined
  >(undefined);

  // User States
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_PROFILES);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [showDeleteAllUsersModal, setShowDeleteAllUsersModal] = useState(false);
  const [isDeletingAllUsers, setIsDeletingAllUsers] = useState(false);

  const [paymentSettings, setPaymentSettings] =
    useState<PaymentSettings | null>(null);
  const [isSavingPaymentSettings, setIsSavingPaymentSettings] = useState(false);

  const loadPaymentSettings = async () => {
    try {
      const data = await getPaymentSettingsFromFirestore();
      setPaymentSettings(data);
    } catch (err) {
      console.error("Could not fetch payment settings:", err);
    }
  };

  const loadSystemParams = async () => {
    setIsParamsLoading(true);
    try {
      const data = await getSystemParamsFromFirestore();
      setSystemParams(data);
      await loadPaymentSettings();
    } catch (err) {
      console.error("Could not fetch system parameters:", err);
    } finally {
      setIsParamsLoading(false);
    }
  };

  // Category management states
  const [newMovieCat, setNewMovieCat] = useState("");
  const [editingMovieCatIdx, setEditingMovieCatIdx] = useState<number | null>(
    null,
  );
  const [editingMovieCatVal, setEditingMovieCatVal] = useState("");

  const [newSeriesCat, setNewSeriesCat] = useState("");
  const [editingSeriesCatIdx, setEditingSeriesCatIdx] = useState<number | null>(
    null,
  );
  const [editingSeriesCatVal, setEditingSeriesCatVal] = useState("");

  const handleCreateMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const finalGenres = selectedCategory ? [selectedCategory] : ["Cinematic"];

    const newMovie: Movie = {
      id: `custom_${Date.now()}`,
      title,
      type,
      year: Number(year),
      runtime,
      rating: Number(rating),
      genres: finalGenres,
      overview: overview || "No overview provided.",
      posterUrl:
        posterUrl ||
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80",
      backdropUrl:
        backdropUrl ||
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
      isPremium,
      isTrending,
      videoUrl:
        videoUrl ||
        "https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4",
      cast: [],
      reviews: [],
      createdAt: new Date().toISOString(),
    };

    onAddMovie(newMovie);

    // Reset Form
    setTitle("");
    setOverview("");
    setVideoUrl("");
    setIsPremium(false);
    setIsTrending(false);
    alert(`Successfully registered "${title}" as dynamic database item!`);
  };

  const handleSendNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifBody) return;

    setIsBroadcasting(true);
    try {
      const persistedNotif = await addNotificationToFirestore(
        notifTitle,
        notifBody,
        selectedNotifMovieId || undefined,
        selectedNotifSeasonNumber,
        selectedNotifEpisodeNumber,
      );

      // Dispatch locally so it slides in
      onSendNotification(persistedNotif);

      setNotifTitle("");
      setNotifBody("");
      setSelectedNotifMovieId("");
      setSelectedNotifSeasonNumber(undefined);
      setSelectedNotifEpisodeNumber(undefined);
      alert(
        "Broadcast Notification dispatched and saved to database successfully!",
      );

      // Refresh list of past broadcasts
      await loadBroadcastNotifications();
    } catch (err) {
      console.error("Failed to broadcast notification:", err);
      alert("Failed to broadcast notification due to a database error.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const [isSeedingFeatures, setIsSeedingFeatures] = useState(false);

  const handleSeedNewFeatures = async () => {
    setIsSeedingFeatures(true);
    try {
      const features = [
        {
          title: "Real-Time AI Voice Search Live",
          body: "Decrypted speech-to-text live parser is now active. Tap the microphone inside the Search Console and speak naturally to discover blocks of elite actions and thrillers."
        },
        {
          title: "Interactive Watch History Breakdown",
          body: "Visualize your cinema streaming distribution with our newly built, elegant Recharts Pie Chart analysis, live right now inside your Profile View."
        },
        {
          title: "Advanced Low-Latency Server Controller",
          body: "Enjoy lightning-fast streams! Admins and users can now shift buffer rates dynamically with the new custom server configuration panel."
        },
        {
          title: "Smart Offline Playback & Local Cache",
          body: "Never miss a frame without an internet connection. Cache your favorite films and series to local storage and replay them instantly."
        },
        {
          title: "Real-Time Co-Watching & Synchronized Lobby",
          body: "Create synchronized movie screening parties and broadcast custom screen events globally using the dynamic live websocket/polling service."
        }
      ];

      for (const f of features) {
        await addNotificationToFirestore(f.title, f.body);
      }

      alert("Successfully seeded 5 New App Features in App Notification Page!");
      await loadBroadcastNotifications();
    } catch (error) {
      console.error("Error seeding notifications:", error);
      alert("Failed to seed notifications. Please check your internet connection.");
    } finally {
      setIsSeedingFeatures(false);
    }
  };

  const toggleUserPremium = async (id: string, currentVal: boolean) => {
    try {
      await updateUserPremiumStatusInFirestore(id, !currentVal);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isPremium: !currentVal } : u)),
      );
    } catch (err) {
      console.error("Failed to toggle premium status:", err);
    }
  };

  const handleBanUser = async (id: string) => {
    try {
      await banUserInFirestore(id);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isBanned: true } : u)),
      );
    } catch (err) {
      console.error("Failed to ban user:", err);
    }
  };

  const handleUnbanUser = async (id: string) => {
    try {
      await unbanUserInFirestore(id);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isBanned: false } : u)),
      );
    } catch (err) {
      console.error("Failed to unban user:", err);
    }
  };

  const handleDeleteUserClick = (user: UserProfile) => {
    setUserToDelete(user);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUserFromFirestore(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  const handleConfirmDeleteAllUsers = async () => {
    setIsDeletingAllUsers(true);
    try {
      const currentAdminId = currentUser?.id || "";
      const usersToDelete = users.filter((u) => u.id !== currentAdminId);

      for (const u of usersToDelete) {
        await deleteUserFromFirestore(u.id);
      }

      await loadUsers();
      setShowDeleteAllUsersModal(false);
      alert(
        "All user directories deleted successfully, except for your current active admin account.",
      );
    } catch (err) {
      console.error("Failed to delete all users:", err);
    } finally {
      setIsDeletingAllUsers(false);
    }
  };

  // Movie Category Operations
  const handleAddMovieCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovieCat.trim()) return;
    const clean = newMovieCat.trim();
    if (movieCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      alert("Movie category already exists!");
      return;
    }
    onSaveMovieCategories([...movieCategories, clean]);
    setNewMovieCat("");
  };

  const handleUpdateMovieCategory = (index: number) => {
    if (!editingMovieCatVal.trim()) return;
    const clean = editingMovieCatVal.trim();
    const updated = [...movieCategories];
    updated[index] = clean;
    onSaveMovieCategories(updated);
    setEditingMovieCatIdx(null);
    setEditingMovieCatVal("");
  };

  const handleDeleteMovieCategory = (categoryName: string) => {
    if (categoryName === "All") {
      alert("Cannot delete primary filter 'All'.");
      return;
    }
    const updated = movieCategories.filter((c) => c !== categoryName);
    onSaveMovieCategories(updated);
  };

  // Series Category Operations
  const handleAddSeriesCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeriesCat.trim()) return;
    const clean = newSeriesCat.trim();
    if (seriesCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      alert("Series category already exists!");
      return;
    }
    onSaveSeriesCategories([...seriesCategories, clean]);
    setNewSeriesCat("");
  };

  const handleUpdateSeriesCategory = (index: number) => {
    if (!editingSeriesCatVal.trim()) return;
    const clean = editingSeriesCatVal.trim();
    const updated = [...seriesCategories];
    updated[index] = clean;
    onSaveSeriesCategories(updated);
    setEditingSeriesCatIdx(null);
    setEditingSeriesCatVal("");
  };

  const handleDeleteSeriesCategory = (categoryName: string) => {
    if (categoryName === "All") {
      alert("Cannot delete primary filter 'All'.");
      return;
    }
    const updated = seriesCategories.filter((c) => c !== categoryName);
    onSaveSeriesCategories(updated);
  };

  if (isAdminLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden z-[60]">
        <div className="absolute inset-0 gold-radial-glow opacity-80 pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center max-w-md px-6 z-10"
        >
          {/* Cyber HUD rotating logo */}
          <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-gold-base/40"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full border border-gold-base/20 border-t-0"
            />
            <div className="absolute inset-4 rounded-full bg-gradient-to-b from-luxury-gray-dark to-black flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.3)] border border-gold-base/30">
              <Shield className="w-10 h-10 text-gold-base animate-pulse" />
            </div>
          </div>

          <h2 className="text-xl font-serif font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase mb-2">
            INITIALIZING DIRECTORS HUB
          </h2>
          <p className="text-[9px] font-tech text-gold-base/70 tracking-[0.3em] uppercase mb-6">
            Loading Cinematic Controls {loadProgress}%
          </p>
          <div className="w-48 h-[2px] bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full gold-gradient-bg"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col pt-4 overflow-y-auto pb-32">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-luxury-gray-dark/40 to-black pointer-events-none" />

      {/* Admin Panel Header */}
      <div className="max-w-4xl w-[92%] mx-auto flex flex-col gap-4 border-b border-white/10 pb-4 mb-6 shrink-0 relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-gold-base animate-pulse" />
              <h2 className="text-md font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase">
                CINEMATIC CONTROL CENTRE
              </h2>
            </div>
            <p className="text-[9px] font-tech text-white/50 tracking-widest uppercase mt-0.5">
              REALTIME CLOUD INTERFACE • LIVE PERSISTENCE
            </p>
          </div>

          {/* Admin Profile Icon section & Action */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <button
                onClick={() => {
                  setActiveTab("users");
                  setUsersSubTab("upgrades");
                }}
                className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] hover:border-gold-base/30 px-3 py-1.5 rounded-full shadow-inner cursor-pointer transition-all active:scale-95 text-left"
                title="View Subscription Requests"
              >
                <div className="relative">
                  <img
                    src={
                      currentUser.avatarUrl ||
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"
                    }
                    alt={currentUser.name}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover border border-gold-base/40"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-black animate-pulse" />
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-[10px] font-serif font-bold text-white block leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[7px] font-tech tracking-wider text-gold-base block uppercase">
                    CHIEF ARCHITECT
                  </span>
                </div>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 border border-white/10 rounded-full bg-white/5 text-white/60 hover:text-white text-[10px] font-tech tracking-wider uppercase hover:bg-white/10 cursor-pointer transition-all animate-pulse"
            >
              EXIT CONSOLE
            </button>
          </div>
        </div>

        {/* TOP TAB BAR FOR ADMIN PANEL */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-white/5 pt-3">
          {[
            { id: "analytics", label: "ANALYSIS", icon: Activity },
            { id: "catalog", label: "CATALOG", icon: Film },
            { id: "categories", label: "CATEGORY", icon: Sparkles },
            { id: "livetv", label: "LIVE TV", icon: Tv },
            { id: "notifications", label: "BROADCAST", icon: Bell },
            { id: "users", label: "USERS", icon: Users },
            { id: "settings", label: "SETTINGS", icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[9px] font-tech tracking-wider transition-all whitespace-nowrap cursor-pointer relative ${
                  isActive
                    ? "bg-gold-base/10 border-gold-base text-gold-light font-bold shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                    : "bg-white/[0.02] border-white/5 text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="top-active-glow"
                    className="absolute inset-0 bg-gold-base/[0.05] rounded-xl pointer-events-none"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 max-w-4xl w-[92%] mx-auto pb-10 relative z-10">
        <div className="w-full min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === "analytics" && (
              <motion.div
                key="analytics-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                {/* Visual HUD statistics dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: "TOTAL CATALOC SPECTACLES",
                      val: movies.length,
                      desc: "+2 dynamic items",
                      icon: Film,
                    },
                    {
                      label: "TOTAL TUNNEL CONNECTIONS",
                      val: "1,490",
                      desc: "+15.2% than yesterday",
                      icon: Users,
                    },
                    {
                      label: "BANDWIDTH BROADCASTED",
                      val: "4.8 TB",
                      desc: "99.9% uptime",
                      icon: Activity,
                    },
                    {
                      label: "ELITE REVENUE GENERATOR",
                      val: "$12,490",
                      desc: "+8.4% growth rate",
                      icon: Crown,
                    },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={`stat-${i}`}
                        className="luxury-glass p-4 rounded-2xl border-white/5 hover:border-gold-base/10 transition-all flex flex-col justify-between h-28 relative overflow-hidden group"
                      >
                        <div className="absolute top-2 right-2 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all">
                          <Icon className="w-12 h-12 text-gold-base" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[7.5px] font-tech text-white/40 uppercase tracking-widest block">
                            {stat.label}
                          </span>
                          <span className="text-lg font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 block">
                            {stat.val}
                          </span>
                        </div>
                        <span className="text-[8px] font-tech text-gold-base/80 tracking-wide block">
                          {stat.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* LIVE TV CONCURRENT TRAFFIC TREND (24H) MODULE */}
                <div className="luxury-glass p-6 rounded-xxl border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between flex-wrap gap-4 text-left">
                    <div className="flex-1 min-w-[250px]">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-serif font-black tracking-widest text-white uppercase flex items-center gap-1.5">
                          <Tv className="w-4 h-4 text-gold-base animate-pulse" />
                          LIVE TV TRAFFIC CONCURRENT CONGESTION (LAST 24 HOURS)
                        </h3>
                        <span className="text-[8px] font-mono tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase font-bold">
                          Firebase Realtime
                        </span>
                      </div>
                      <p className="text-[9px] text-white/40 font-tech mt-1">
                        Real-time concurrent subscriber tunnels established across Live TV channels, segmented by premium master 4K-UHD and Standard-HD bitstreams.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Dynamic Peak Hour analysis display */}
                      {peakTrafficInfo && (
                        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[9px] font-tech px-2.5 py-1 rounded-lg">
                          <span className="animate-ping w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shrink-0"></span>
                          <span>PEAK INTERVAL: {peakTrafficInfo.time} ({peakTrafficInfo.total} USERS)</span>
                        </div>
                      )}

                      {/* Traffic Controller Toggle */}
                      <button
                        onClick={() => setShowTrafficController(!showTrafficController)}
                        className={`px-2.5 py-1 text-[9px] font-tech font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          showTrafficController
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        {showTrafficController ? "HIDE CONTROL" : "MANAGE LOAD"}
                      </button>

                      {/* Toggle controls */}
                      <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                        <button
                          onClick={() => setLiveTvChartType("line")}
                          className={`px-2.5 py-1 text-[9px] font-tech font-bold rounded-md transition-all cursor-pointer ${
                            liveTvChartType === "line"
                              ? "bg-gold-base text-black"
                              : "text-white/60 hover:text-white"
                          }`}
                        >
                          LINE TREND
                        </button>
                        <button
                          onClick={() => setLiveTvChartType("area")}
                          className={`px-2.5 py-1 text-[9px] font-tech font-bold rounded-md transition-all cursor-pointer ${
                            liveTvChartType === "area"
                              ? "bg-gold-base text-black"
                              : "text-white/60 hover:text-white"
                          }`}
                        >
                          AREA SEGMENTS
                        </button>
                      </div>

                      <div className="flex gap-2.5 text-[9px] font-tech text-gold-base">
                        <span className="flex items-center gap-1 bg-gold-base/15 border border-gold-base/20 px-2.5 py-1 rounded-lg">
                          ● LIVE TRAFFIC: {liveTvConcurrentUsersData[liveTvConcurrentUsersData.length - 1]?.total || 190} ACTIVE
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Controller Form inside the module */}
                  {showTrafficController && (
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-3 text-left">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h4 className="text-[10px] font-tech font-black tracking-widest text-gold-base uppercase">
                          Firebase Load Controller
                        </h4>
                        <span className="text-[8px] font-mono text-white/40">
                          Configure live congestion levels in the database
                        </span>
                      </div>
                      
                      {/* Presets */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleGenerateTrafficPreset("standard")}
                          className="bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded-lg py-1.5 px-2.5 text-[9px] font-tech font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5 text-blue-400" /> Standard Load
                        </button>
                        <button
                          onClick={() => handleGenerateTrafficPreset("peak")}
                          className="bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/20 rounded-lg py-1.5 px-2.5 text-[9px] font-tech font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Peak Congestion
                        </button>
                        <button
                          onClick={() => handleGenerateTrafficPreset("low")}
                          className="bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/20 rounded-lg py-1.5 px-2.5 text-[9px] font-tech font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Off-Peak Low
                        </button>
                      </div>

                      {/* Update Single Hour Form */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-black/40 p-3 rounded-lg border border-white/5 mt-1">
                        <div>
                          <label className="text-[8px] font-tech text-white/50 block uppercase tracking-wider mb-1">
                            Interval Hour
                          </label>
                          <select
                            value={inputTrafficHour}
                            onChange={(e) => setInputTrafficHour(e.target.value)}
                            className="w-full bg-neutral-900 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-gold-base"
                          >
                            {Array.from({ length: 24 }).map((_, h) => {
                              const formatted = `${h.toString().padStart(2, "0")}:00`;
                              return (
                                <option key={`opt-hour-${h}`} value={formatted}>
                                  {formatted}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="text-[8px] font-tech text-white/50 block uppercase tracking-wider mb-1">
                            Premium UHD Users
                          </label>
                          <input
                            type="number"
                            value={inputTrafficUhd}
                            onChange={(e) => setInputTrafficUhd(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-neutral-900 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-gold-base"
                          />
                        </div>

                        <div>
                          <label className="text-[8px] font-tech text-white/50 block uppercase tracking-wider mb-1">
                            Standard HD Users
                          </label>
                          <input
                            type="number"
                            value={inputTrafficHd}
                            onChange={(e) => setInputTrafficHd(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-neutral-900 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-gold-base"
                          />
                        </div>

                        <button
                          onClick={handleUpdateSingleHourTraffic}
                          className="w-full bg-gold-base text-black font-tech font-bold text-[9px] py-1.5 rounded hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3px]" /> Save Hourly Load
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="w-full h-[280px] mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      {liveTvChartType === "line" ? (
                        <LineChart
                          data={liveTvConcurrentUsersData}
                          margin={{
                            top: 10,
                            right: 15,
                            left: -20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                          />
                          <XAxis
                            dataKey="time"
                            tick={{
                              fill: "rgba(255,255,255,0.5)",
                              fontSize: 8,
                              fontFamily: "monospace",
                            }}
                          />
                          <YAxis
                            tick={{
                              fill: "rgba(255,255,255,0.4)",
                              fontSize: 8,
                              fontFamily: "monospace",
                            }}
                          />
                          <ChartTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const isPeak = peakTrafficInfo?.time === data.time;
                                return (
                                  <div className="bg-black/95 border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md text-left">
                                    <div className="flex items-center justify-between gap-4">
                                      <p className="text-[9px] font-mono font-bold text-white/50 uppercase">
                                        TRAFFIC TIMEPASS: {data.time}
                                      </p>
                                      {isPeak && (
                                        <span className="text-[8px] font-tech text-amber-300 bg-amber-500/20 px-1 rounded">
                                          🔥 PEAK
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-1 mt-2 font-mono text-[10px]">
                                      <p className="text-white font-bold flex items-center justify-between gap-4">
                                        <span>⚡ TOTAL CONCURRENT:</span>
                                        <span className="text-gold-base">{data.total} USERS</span>
                                      </p>
                                      <p className="text-amber-300 flex items-center justify-between gap-4 text-[9px]">
                                        <span>💎 PREMIUM UHD STREAMS:</span>
                                        <span>{data.uhd}</span>
                                      </p>
                                      <p className="text-blue-400 flex items-center justify-between gap-4 text-[9px]">
                                        <span>📺 STANDARD HD STREAMS:</span>
                                        <span>{data.hd}</span>
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend
                            wrapperStyle={{
                              fontSize: "8.5px",
                              fontFamily: "monospace",
                              color: "rgba(255,255,255,0.6)",
                            }}
                            verticalAlign="top"
                            height={36}
                          />
                          <Line
                            type="monotone"
                            dataKey="total"
                            name="TOTAL ACTIVE TRAFFIC"
                            stroke="#ffffff"
                            strokeWidth={3}
                            dot={{ r: 2, stroke: "#ffffff", strokeWidth: 1, fill: "#000000" }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="uhd"
                            name="PREMIUM UHD BITRATE"
                            stroke="#d4af37"
                            strokeWidth={2}
                            dot={{ r: 1 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="hd"
                            name="STANDARD HD BITRATE"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 1 }}
                          />
                        </LineChart>
                      ) : (
                        <AreaChart
                          data={liveTvConcurrentUsersData}
                          margin={{
                            top: 10,
                            right: 15,
                            left: -20,
                            bottom: 5,
                          }}
                        >
                          <defs>
                            <linearGradient id="colorUhd" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#d4af37" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorHd" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                          />
                          <XAxis
                            dataKey="time"
                            tick={{
                              fill: "rgba(255,255,255,0.5)",
                              fontSize: 8,
                              fontFamily: "monospace",
                            }}
                          />
                          <YAxis
                            tick={{
                              fill: "rgba(255,255,255,0.4)",
                              fontSize: 8,
                              fontFamily: "monospace",
                            }}
                          />
                          <ChartTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-black/95 border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md text-left">
                                    <p className="text-[9px] font-mono font-bold text-white/50 uppercase">
                                      TRAFFIC TIMEPASS: {data.time}
                                    </p>
                                    <div className="flex flex-col gap-1 mt-2 font-mono text-[10px]">
                                      <p className="text-gold-base font-bold flex items-center justify-between gap-4">
                                        <span>⚡ TOTAL CONCURRENT:</span>
                                        <span>{data.total} USERS</span>
                                      </p>
                                      <p className="text-amber-300 flex items-center justify-between gap-4 text-[9px]">
                                        <span>💎 PREMIUM UHD STREAMS:</span>
                                        <span>{data.uhd}</span>
                                      </p>
                                      <p className="text-blue-400 flex items-center justify-between gap-4 text-[9px]">
                                        <span>📺 STANDARD HD STREAMS:</span>
                                        <span>{data.hd}</span>
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend
                            wrapperStyle={{
                              fontSize: "8.5px",
                              fontFamily: "monospace",
                              color: "rgba(255,255,255,0.6)",
                            }}
                            verticalAlign="top"
                            height={36}
                          />
                          <Area
                            type="monotone"
                            dataKey="uhd"
                            name="PREMIUM UHD BITRATE"
                            stroke="#d4af37"
                            fillOpacity={1}
                            fill="url(#colorUhd)"
                          />
                          <Area
                            type="monotone"
                            dataKey="hd"
                            name="STANDARD HD BITRATE"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorHd)"
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Visual Demographics & Radar Chart */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Radar Chart */}
                  <div className="luxury-glass p-6 rounded-xxl border-white/5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-serif font-black tracking-widest text-white uppercase">
                        GENRE POPULARITY DISTRIBUTION
                      </h3>
                      <p className="text-[9px] text-white/40 font-tech mt-1">
                        Real-time category frequency across the current catalog.
                      </p>
                    </div>

                    <div className="w-full h-[220px] mt-4 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="75%"
                          data={genrePopularityData}
                        >
                          <PolarGrid stroke="rgba(255,255,255,0.08)" />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={{
                              fill: "rgba(255,255,255,0.5)",
                              fontSize: 8,
                              fontWeight: "bold",
                              fontFamily: "monospace",
                            }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, "auto"]}
                            tick={{ fill: "rgba(212,175,55,0.4)", fontSize: 7 }}
                            stroke="none"
                          />
                          <Radar
                            name="Popularity"
                            dataKey="count"
                            stroke="#d4af37"
                            fill="#d4af37"
                            fillOpacity={0.35}
                          />
                          <ChartTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-black/95 border border-gold-base/30 p-2 rounded-xl shadow-xl backdrop-blur-md">
                                    <p className="text-[10px] font-bold text-white font-serif tracking-wider uppercase">
                                      {data.subject}
                                    </p>
                                    <p className="text-[9px] text-gold-light mt-0.5 font-mono">
                                      Count:{" "}
                                      <span className="font-bold">
                                        {data.count}
                                      </span>{" "}
                                      {data.count === 1
                                        ? "spectacle"
                                        : "spectacles"}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Existing Content Share Demographics */}
                  <div className="luxury-glass p-6 rounded-xxl border-white/5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-serif font-black tracking-widest text-white uppercase">
                        CONTENT SHARE DEMOGRAPHICS
                      </h3>
                      <p className="text-[9px] text-white/40 font-tech mt-1">
                        Relative division of active media formats.
                      </p>
                    </div>
                    <div className="flex-1 flex flex-col justify-center gap-3 mt-4">
                      {MOCK_ANALYTICS.categoryShare.map((cat, i) => (
                        <div
                          key={`category-share-${cat.name}-${i}`}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold-base animate-pulse" />
                            <span className="text-xs font-semibold text-white/80">
                              {cat.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-gold-base">
                            {cat.percent}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content Metrics Chart */}
                {(() => {
                  const contentMetricsData = movies
                    .map((m) => {
                      const views = Number((m as any).viewsCount || (m as any).views || 0);
                      const watchlists = Number((m as any).watchlistAdditions || 0);
                      return {
                        title:
                          m.title.length > 18
                            ? m.title.substring(0, 16) + "..."
                            : m.title,
                        fullTitle: m.title,
                        views,
                        watchlists,
                      };
                    })
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 8);

                  return (
                    <div className="luxury-glass p-6 rounded-xxl border-white/5 flex flex-col gap-4">
                      <div>
                        <h3 className="text-xs font-serif font-black tracking-widest text-white uppercase flex items-center gap-1.5">
                          <BarChart className="w-4 h-4 text-gold-base" />
                          SPECTACLE ENGAGEMENT & RETENTION (CONTENT METRICS)
                        </h3>
                        <p className="text-[9px] text-white/40 font-tech">
                          Visualizing top-performing cinematic assets by total
                          stream count and user watchlist additions.
                        </p>
                      </div>

                      <div className="w-full h-[280px] mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart
                            data={contentMetricsData}
                            margin={{
                              top: 10,
                              right: 10,
                              left: -20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="rgba(255,255,255,0.05)"
                            />
                            <XAxis
                              dataKey="title"
                              tick={{
                                fill: "rgba(255,255,255,0.5)",
                                fontSize: 8,
                                fontFamily: "monospace",
                              }}
                            />
                            <YAxis
                              tick={{
                                fill: "rgba(255,255,255,0.4)",
                                fontSize: 8,
                                fontFamily: "monospace",
                              }}
                            />
                            <ChartTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-black/95 border border-gold-base/30 p-3 rounded-xl shadow-xl backdrop-blur-md text-left">
                                      <p className="text-[10px] font-bold text-white font-serif tracking-wider uppercase">
                                        {data.fullTitle}
                                      </p>
                                      <div className="flex flex-col gap-0.5 mt-2 font-mono text-[9px]">
                                        <p className="text-emerald-400">
                                          🎬 Views:{" "}
                                          <span className="font-bold">
                                            {data.views.toLocaleString()}{" "}
                                            streams
                                          </span>
                                        </p>
                                        <p className="text-gold-light">
                                          ⭐ Watchlist:{" "}
                                          <span className="font-bold">
                                            {data.watchlists.toLocaleString()}{" "}
                                            users
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend
                              wrapperStyle={{
                                fontSize: "8.5px",
                                fontFamily: "monospace",
                                color: "rgba(255,255,255,0.6)",
                              }}
                              verticalAlign="top"
                              height={36}
                            />
                            <Bar
                              dataKey="views"
                              name="TOTAL STREAM VIEWS"
                              fill="#10b981"
                              fillOpacity={0.8}
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="watchlists"
                              name="WATCHLIST ADDITIONS"
                              fill="#d4af37"
                              fillOpacity={0.85}
                              radius={[4, 4, 0, 0]}
                            />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}

                {/* TOP 10 SEARCHED TERMS BY USERS */}
                <div className="luxury-glass p-6 rounded-xxl border-white/5 flex flex-col gap-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between flex-wrap gap-4 text-left">
                      <div>
                        <h3 className="text-xs font-serif font-black tracking-widest text-white uppercase flex items-center gap-1.5">
                          <Search className="w-4 h-4 text-gold-base animate-pulse" />
                          TOP 10 USER SEARCH QUERIES
                        </h3>
                        <p className="text-[9px] text-white/40 font-tech mt-1">
                          Query metrics fetched dynamically in real-time from Google Cloud Firestore database with active date filtering.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-tech text-gold-base">
                        <button
                          onClick={loadSearchQueries}
                          disabled={isSearchQueriesLoading}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Reload search metrics from Firebase"
                        >
                          <RefreshCw className={`w-3 h-3 ${isSearchQueriesLoading ? 'animate-spin' : ''}`} />
                          <span>Sync Now</span>
                        </button>
                        <span className="flex items-center gap-1 bg-gold-base/15 border border-gold-base/20 px-2.5 py-1 rounded-lg">
                          ● RANGE VOLUME: {filteredSearchQueries.reduce((sum, q) => sum + q.count, 0).toLocaleString()} CLICKS
                        </span>
                      </div>
                    </div>

                    {/* Date filter Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/[0.01] border border-white/5 text-left animate-fade-in">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-tech text-white/40 uppercase tracking-widest flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gold-base" />
                          Select Active Range Preset
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(["7days", "30days", "60days", "custom"] as const).map((preset) => (
                            <button
                              key={preset}
                              onClick={() => handleSearchPresetChange(preset)}
                              className={`px-2.5 py-1 rounded-lg text-[8px] font-mono tracking-wider transition-all cursor-pointer border ${
                                searchDatePreset === preset
                                  ? "bg-gold-base text-black font-bold border-gold-base"
                                  : "bg-white/5 text-white/60 hover:text-white border-white/5 hover:bg-white/10"
                              }`}
                            >
                              {preset === "7days"
                                ? "LAST 7 DAYS"
                                : preset === "30days"
                                ? "LAST 30 DAYS"
                                : preset === "60days"
                                ? "LAST 60 DAYS"
                                : "CUSTOM RANGE"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {searchDatePreset === "custom" && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2"
                        >
                          <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[7.5px] font-mono text-white/30 uppercase">START DATE</span>
                            <input
                              type="date"
                              value={searchStartDate}
                              onChange={(e) => setSearchStartDate(e.target.value)}
                              className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-mono text-white focus:outline-none focus:border-gold-base"
                            />
                          </div>
                          <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[7.5px] font-mono text-white/30 uppercase">END DATE</span>
                            <input
                              type="date"
                              value={searchEndDate}
                              onChange={(e) => setSearchEndDate(e.target.value)}
                              className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-mono text-white focus:outline-none focus:border-gold-base"
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-[320px] mt-2 relative flex items-center justify-center">
                    {isSearchQueriesLoading && filteredSearchQueries.length === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20 backdrop-blur-sm rounded-xl z-10">
                        <RefreshCw className="w-6 h-6 text-gold-base animate-spin" />
                        <span className="text-[10px] font-tech uppercase tracking-widest text-white/40">Querying Firestore Database...</span>
                      </div>
                    ) : filteredSearchQueries.length === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                        <p className="text-[10px] text-white/40 font-tech uppercase tracking-widest">No matching query volume found for this range</p>
                        <p className="text-[8px] text-white/20 font-mono">Try selecting a broader date preset above</p>
                      </div>
                    ) : null}

                    {filteredSearchQueries.length > 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart
                          data={filteredSearchQueries.slice(0, 10)}
                          margin={{
                            top: 10,
                            right: 15,
                            left: -15,
                            bottom: 25,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                          />
                          <XAxis
                            dataKey="term"
                            tick={{
                              fill: "rgba(255,255,255,0.5)",
                              fontSize: 7.5,
                              fontFamily: "monospace",
                            }}
                            angle={-15}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis
                            tick={{
                              fill: "rgba(255,255,255,0.4)",
                              fontSize: 8,
                              fontFamily: "monospace",
                            }}
                          />
                          <ChartTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-black/95 border border-gold-base/30 p-3 rounded-xl shadow-xl backdrop-blur-md text-left">
                                    <p className="text-[10px] font-bold text-white font-serif tracking-wider uppercase">
                                      🔍 "{data.term}"
                                    </p>
                                    <div className="flex flex-col gap-0.5 mt-2 font-mono text-[9px]">
                                      <p className="text-gold-light">
                                        🔥 Period Volume:{" "}
                                        <span className="font-bold text-white">
                                          {data.count.toLocaleString()} searches
                                        </span>
                                      </p>
                                      <p className="text-white/50">
                                        📁 Category:{" "}
                                        <span className="font-bold text-white/80">
                                          {data.category}
                                        </span>
                                      </p>
                                      {data.lastSearchedAt && (
                                        <p className="text-white/30 text-[8px] mt-1">
                                          Last Logged Active: {new Date(data.lastSearchedAt).toLocaleDateString()} {new Date(data.lastSearchedAt).toLocaleTimeString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="count"
                            name="SEARCH COUNT"
                            fill="#d4af37"
                            fillOpacity={0.8}
                            radius={[4, 4, 0, 0]}
                          />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* RECENT SEARCH TERMS (CHRONOLOGICAL INTENT TRACKER) */}
                  {(() => {
                    const recentSearchQueries = [...filteredSearchQueries]
                      .map((item) => {
                        if (!item.history || item.history.length === 0) {
                          return { ...item, rangeLastSearched: item.lastSearchedAt || "" };
                        }
                        const rangeHistory = item.history.filter(
                          (h) => h.date >= searchStartDate && h.date <= searchEndDate && h.count > 0
                        );
                        if (rangeHistory.length === 0) {
                          return { ...item, rangeLastSearched: "" };
                        }
                        const sortedHistory = [...rangeHistory].sort((a, b) => b.date.localeCompare(a.date));
                        return { ...item, rangeLastSearched: sortedHistory[0].date };
                      })
                      .filter((item) => item.rangeLastSearched)
                      .sort((a, b) => new Date(b.rangeLastSearched).getTime() - new Date(a.rangeLastSearched).getTime())
                      .slice(0, 20);

                    const formatSearchTime = (isoString?: string) => {
                      if (!isoString) return "Just now";
                      try {
                        const d = new Date(isoString);
                        return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + (isoString.includes("T") ? (" " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : "");
                      } catch (e) {
                        return "Recently";
                      }
                    };

                    return (
                      <div className="flex flex-col gap-3 mt-4 text-left">
                        <div className="h-[1px] bg-white/5 w-full my-1" />
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h4 className="text-[10px] font-serif font-bold tracking-widest text-white/90 uppercase flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gold-base" />
                              REAL-TIME RECENT SEARCH INTENTS ({searchDatePreset === 'custom' ? 'CUSTOM PERIOD' : searchDatePreset.toUpperCase().replace('DAYS', ' DAYS')})
                            </h4>
                            <p className="text-[8px] text-white/30 font-tech">
                              The latest user query submissions recorded across all subscriber terminals within this selected active range.
                            </p>
                          </div>
                          <span className="text-[8px] font-mono text-gold-light/70 bg-gold-base/5 border border-gold-base/15 px-2.5 py-0.5 rounded-lg">
                            {recentSearchQueries.length} ACTIVE TRACKS
                          </span>
                        </div>

                        <div className="max-h-[220px] overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                          {recentSearchQueries.length === 0 ? (
                            <div className="text-center py-6 border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                              <p className="text-[10px] text-white/30 font-tech uppercase tracking-widest">No recent search intents loaded for this range</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {recentSearchQueries.map((item, idx) => (
                                <motion.div
                                  key={`recent-q-${item.id || idx}`}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-5.5 h-5.5 rounded-lg bg-gold-base/5 border border-gold-base/15 flex items-center justify-center text-[8px] font-mono font-bold text-gold-base group-hover:bg-gold-base group-hover:text-black transition-all shrink-0">
                                      {idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-bold text-white tracking-wide truncate group-hover:text-gold-light transition-colors">
                                        "{item.term}"
                                      </p>
                                      <p className="text-[8px] text-white/40 font-mono mt-0.5 uppercase tracking-wider">
                                        {item.category}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-[9px] font-mono font-bold text-gold-light">
                                      {item.count.toLocaleString()} x
                                    </p>
                                    <p className="text-[7.5px] text-white/30 font-mono mt-0.5">
                                      {formatSearchTime(item.rangeLastSearched)}
                                    </p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* SEARCH TRENDS REAL-TIME TABLE */}
                <div className="luxury-glass p-6 rounded-xxl border-white/5 flex flex-col gap-5 text-left">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-xs font-serif font-black tracking-widest text-white uppercase flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-gold-base animate-pulse" />
                        REAL-TIME SEARCH TRENDS (TOP 20 FREQUENT QUERIES)
                      </h3>
                      <p className="text-[9px] text-white/40 font-tech mt-1">
                        Active chronological search frequency table showing detailed counts, categories, and date stamps from Firestore.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Search Bar inside table card */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                        <input
                          type="text"
                          value={tableSearchFilter}
                          onChange={(e) => setTableSearchFilter(e.target.value)}
                          placeholder="Filter trends..."
                          className="pl-8 pr-7 py-1 bg-black/40 border border-white/10 rounded-lg text-[9px] font-mono text-white focus:outline-none focus:border-gold-base w-[140px] md:w-[180px] placeholder:text-white/30"
                        />
                        {tableSearchFilter && (
                          <button
                            onClick={() => setTableSearchFilter("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-[9px] font-bold cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Export Button */}
                      <button
                        onClick={() => {
                          const headers = ["Rank", "Search Term", "Category", "Period Volume (Selected Date Range)", "Total Lifetime Volume", "Last Searched At"];
                          const rows = tableSearchQueries.map((item, idx) => [
                            idx + 1,
                            `"${item.term.replace(/"/g, '""')}"`,
                            item.category,
                            item.count,
                            item.history?.reduce((sum, h) => sum + (h.count || 0), 0) || item.count,
                            item.lastSearchedAt || ""
                          ]);
                          const csvContent = "data:text/csv;charset=utf-8," 
                            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
                          const encodedUri = encodeURI(csvContent);
                          const link = document.createElement("a");
                          link.setAttribute("href", encodedUri);
                          link.setAttribute("download", `search_trends_${searchStartDate}_to_${searchEndDate}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        disabled={tableSearchQueries.length === 0}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-[9px] font-mono text-white disabled:opacity-40 hover:text-gold-base transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Download Top 20 as CSV"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Table Element */}
                  <div className="w-full overflow-x-auto rounded-xl border border-white/5 bg-black/20">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-[8.5px] font-mono uppercase tracking-widest text-white/40">
                          <th className="py-2.5 px-4 font-normal w-12 text-center">Rank</th>
                          <th className="py-2.5 px-4 font-normal">Query Term</th>
                          <th className="py-2.5 px-4 font-normal">Category</th>
                          <th className="py-2.5 px-4 font-normal text-right">Range Volume</th>
                          <th className="py-2.5 px-4 font-normal text-right">Lifetime Volume</th>
                          <th className="py-2.5 px-4 font-normal">Last Action Timestamp</th>
                          <th className="py-2.5 px-4 font-normal text-center w-20">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableSearchQueries.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-white/30 text-[10px] uppercase font-mono tracking-wider">
                              No matching search trends found
                            </td>
                          </tr>
                        ) : (
                          tableSearchQueries.map((item, idx) => {
                            const isExpanded = expandedTermId === item.id;
                            const formatFullTime = (isoString?: string) => {
                              if (!isoString) return "-";
                              try {
                                const d = new Date(isoString);
                                return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                              } catch (e) {
                                return isoString;
                              }
                            };

                            const rankNum = idx + 1;

                            return (
                              <React.Fragment key={item.id || idx}>
                                <tr 
                                  className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer text-[10.5px] font-medium text-white/90 ${isExpanded ? 'bg-white/[0.01]' : ''}`}
                                  onClick={() => setExpandedTermId(isExpanded ? null : (item.id || null))}
                                >
                                  {/* Rank */}
                                  <td className="py-3 px-4 text-center">
                                    <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-lg text-[9px] font-mono font-bold ${
                                      rankNum === 1 
                                        ? 'bg-gold-base text-black' 
                                        : rankNum === 2 
                                        ? 'bg-white/80 text-black' 
                                        : rankNum === 3 
                                        ? 'bg-amber-600/80 text-white' 
                                        : 'bg-white/5 text-white/60 border border-white/5'
                                    }`}>
                                      {rankNum}
                                    </span>
                                  </td>

                                  {/* Term */}
                                  <td className="py-3 px-4">
                                    <span className="font-serif font-bold tracking-wide text-white group-hover:text-gold-light transition-colors">
                                      "{item.term}"
                                    </span>
                                  </td>

                                  {/* Category */}
                                  <td className="py-3 px-4">
                                    <span className="text-[8.5px] font-mono bg-white/5 border border-white/5 px-2 py-0.5 rounded uppercase text-white/50">
                                      {item.category}
                                    </span>
                                  </td>

                                  {/* Range Volume */}
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex flex-col items-end">
                                      <span className="font-mono text-gold-light font-bold">
                                        {item.count.toLocaleString()}
                                      </span>
                                      {/* Proportional micro indicator bar */}
                                      <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden mt-1 text-left">
                                        <div 
                                          className="h-full bg-gold-base rounded-full"
                                          style={{ 
                                            width: `${Math.min(100, Math.max(5, (item.count / (tableSearchQueries[0]?.count || 1)) * 100))}%` 
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  {/* Lifetime Volume */}
                                  <td className="py-3 px-4 text-right font-mono text-white/40">
                                    {(item.history?.reduce((sum, h) => sum + (h.count || 0), 0) || item.count).toLocaleString()}
                                  </td>

                                  {/* Timestamp */}
                                  <td className="py-3 px-4 font-mono text-[9px] text-white/40">
                                    {formatFullTime(item.lastSearchedAt)}
                                  </td>

                                  {/* Action */}
                                  <td className="py-3 px-4 text-center">
                                    <button 
                                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                                      title="Toggle timestamp breakdown"
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="w-3.5 h-3.5 text-gold-base" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </td>
                                </tr>

                                {/* Expanded Timestamp Counts Panel */}
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={7} className="p-0 bg-black/40 border-b border-white/5">
                                      <div className="p-4 flex flex-col gap-3 text-left">
                                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                          <h5 className="text-[9px] font-serif font-bold text-gold-light uppercase tracking-widest flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-gold-base" />
                                            DAILY CHRONOLOGICAL TRACKING HISTORY (TIMESTAMP COUNTS)
                                          </h5>
                                          <span className="text-[7.5px] font-mono text-white/30">
                                            LAST 60 DAYS ACTIVE SERIES
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                          {item.history && item.history.filter(h => h.count > 0).length > 0 ? (
                                            [...item.history]
                                              .filter(h => h.count > 0)
                                              .sort((a, b) => b.date.localeCompare(a.date))
                                              .map((historyItem) => (
                                                <div 
                                                  key={historyItem.date}
                                                  className="p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 flex flex-col gap-0.5"
                                                >
                                                  <span className="text-[7.5px] text-white/40 font-mono">
                                                    {historyItem.date}
                                                  </span>
                                                  <span className="text-[10px] font-mono font-bold text-white">
                                                    {historyItem.count} <span className="text-[8px] font-normal text-white/55">searches</span>
                                                  </span>
                                                </div>
                                              ))
                                          ) : (
                                            <div className="col-span-full py-3 text-center text-white/30 text-[9px] uppercase font-mono">
                                              No chronological sub-series timestamps captured for this item
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* REAL-TIME SUPPORT CHAT (FIREBASE SYNCED) */}
                <div className="luxury-glass p-6 rounded-xxl border-white/5 flex flex-col gap-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="text-left">
                      <h3 className="text-xs font-serif font-black tracking-widest text-white uppercase flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-gold-base animate-pulse" />
                        REAL-TIME FIREBASE SUPPORT DESK
                      </h3>
                      <p className="text-[9px] text-white/40 font-tech mt-1">
                        Active client communications loaded from Google Cloud Firestore. Add new channels, response loops, and sync across administrative terminals instantly.
                      </p>
                    </div>
                    <div>
                      <button
                        onClick={() => setIsCreatingNewChat(!isCreatingNewChat)}
                        className="px-3 py-1.5 rounded-xl bg-gold-base hover:bg-gold-light text-black text-[10px] font-tech tracking-wider uppercase font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        {isCreatingNewChat ? "Close Panel" : "New Support Chat"}
                      </button>
                    </div>
                  </div>

                  {/* New Chat Form Block */}
                  {isCreatingNewChat && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleCreateNewChat}
                      className="p-5 rounded-xxl border border-white/10 bg-white/5 flex flex-col gap-4 text-left"
                    >
                      <h4 className="text-xs font-serif font-bold text-gold-base uppercase tracking-widest">
                        Establish Real-Time Communication Tunnel
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[8px] font-tech text-white/50 uppercase tracking-wider">
                            Topic / Conversation Title
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Ultra HDR buffering error"
                            value={newChatTitle}
                            onChange={(e) => setNewChatTitle(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-base transition-colors"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[8px] font-tech text-white/50 uppercase tracking-wider">
                            Client Full Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Ariful Islam"
                            value={newChatUserName}
                            onChange={(e) => setNewChatUserName(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-base transition-colors"
                            required
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[8px] font-tech text-white/50 uppercase tracking-wider">
                            Client Email Address
                          </label>
                          <input
                            type="email"
                            placeholder="e.g., ariful@gmail.com"
                            value={newChatUserEmail}
                            onChange={(e) => setNewChatUserEmail(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-base transition-colors"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-tech text-white/50 uppercase tracking-wider">
                          Initial Query Message
                        </label>
                        <textarea
                          placeholder="Type the user's initial message or ticket request here..."
                          rows={3}
                          value={newChatFirstMsg}
                          onChange={(e) => setNewChatFirstMsg(e.target.value)}
                          className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-base transition-colors resize-none"
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsCreatingNewChat(false)}
                          className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-white/75 text-[10px] font-tech uppercase"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-tech uppercase font-bold"
                        >
                          Establish Channel
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {/* Main Chat Interface */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 border border-white/5 rounded-xxl overflow-hidden bg-black/20">
                    
                    {/* Left Column: List of Chats */}
                    <div className="md:col-span-5 border-r border-white/5 flex flex-col h-[450px]">
                      <div className="p-3.5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <span className="text-[9px] font-tech text-white/40 uppercase tracking-widest">
                          Active Channels ({supportChats.length})
                        </span>
                        <span className="text-[8px] font-tech text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          ONLINE & SYNCED
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin text-left">
                        {supportChats.length === 0 ? (
                          <div className="p-8 text-center text-white/30 text-xs font-mono">
                            No channels initialized. Use the button above to spawn a real-time Firestore chat stream.
                          </div>
                        ) : (
                          supportChats.map((chat) => {
                            const isSelected = selectedChat?.id === chat.id;
                            const lastMsg = chat.messages?.[chat.messages.length - 1];
                            return (
                              <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`p-3.5 transition-all cursor-pointer flex flex-col gap-1.5 text-left relative group ${
                                  isSelected 
                                    ? "bg-gold-base/10 border-l-2 border-gold-base" 
                                    : "hover:bg-white/5 border-l-2 border-transparent"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-serif font-bold text-white tracking-wide truncate max-w-[150px]">
                                    {chat.title}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[7px] font-tech px-1 py-0.5 rounded uppercase tracking-wider ${
                                      chat.status === "open" 
                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/10" 
                                        : "bg-white/10 text-white/40 border border-white/5"
                                    }`}>
                                      {chat.status}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteChatSession(chat.id);
                                      }}
                                      className="text-white/30 hover:text-red-400 p-0.5 rounded hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100"
                                      title="Delete chat session from Firestore"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[8px] text-white/50 font-mono">
                                  <span>{chat.userName}</span>
                                  <span>{chat.userEmail}</span>
                                </div>

                                {lastMsg && (
                                  <p className="text-[9px] text-white/40 truncate font-mono mt-0.5">
                                    <span className="text-gold-base/60 font-bold mr-1">
                                      {lastMsg.sender === "admin" ? "Admin:" : "User:"}
                                    </span>
                                    {lastMsg.text}
                                  </p>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Right Column: Chat Window */}
                    <div className="md:col-span-7 flex flex-col h-[450px]">
                      {selectedChat ? (
                        <div className="flex flex-col h-full bg-black/40">
                          {/* Chat Window Header */}
                          <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div className="text-left">
                              <h4 className="text-[10px] font-serif font-black text-white tracking-wider uppercase">
                                {selectedChat.title}
                              </h4>
                              <p className="text-[8px] font-tech text-white/40">
                                CHANNEL ID: <span className="font-mono text-gold-base">{selectedChat.id}</span> • CLIENT: {selectedChat.userName} ({selectedChat.userEmail})
                              </p>
                            </div>
                            <span className="text-[8px] font-tech text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                              ● REACTIVE SYNC ACTIVE
                            </span>
                          </div>

                          {/* Message Logs */}
                          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 scrollbar-thin">
                            {selectedChat.messages?.map((msg) => {
                              const isAdmin = msg.sender === "admin";
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex flex-col gap-1 max-w-[85%] ${
                                    isAdmin ? "self-end items-end" : "self-start items-start"
                                  }`}
                                >
                                  <span className="text-[7.5px] font-tech text-white/40 uppercase tracking-widest">
                                    {isAdmin ? "ADMIN CONTROL CENTER" : selectedChat.userName}
                                  </span>
                                  <div className={`p-3 rounded-2xl text-xs text-left ${
                                    isAdmin 
                                      ? "bg-gold-base text-black rounded-tr-none font-medium shadow-[0_4px_12px_rgba(212,175,55,0.15)]" 
                                      : "bg-white/5 border border-white/10 text-white rounded-tl-none"
                                  }`}>
                                    <p className="leading-relaxed break-words whitespace-pre-line">{msg.text}</p>
                                  </div>
                                  <span className="text-[7.5px] font-mono text-white/30">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Message Input Form */}
                          <form onSubmit={handleSendChatReply} className="p-3 border-t border-white/5 bg-white/5 flex gap-2">
                            <input
                              type="text"
                              placeholder="Type your official administrative reply here..."
                              value={chatReplyInput}
                              onChange={(e) => setChatReplyInput(e.target.value)}
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold-base transition-colors font-mono"
                              required
                            />
                            <button
                              type="submit"
                              disabled={isSendingReply || !chatReplyInput.trim()}
                              className="px-4 py-2.5 rounded-xl bg-gold-base hover:bg-gold-light disabled:bg-white/10 disabled:text-white/40 text-black text-xs font-tech uppercase font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Send</span>
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white/30 gap-3">
                          <MessageSquare className="w-10 h-10 text-white/10 animate-bounce" />
                          <div className="max-w-[280px]">
                            <h4 className="text-xs font-serif font-bold text-white/70 uppercase tracking-widest">
                              SUPPORT DESK TERMINAL
                            </h4>
                            <p className="text-[9px] font-tech text-white/40 mt-1">
                              Select a client conversation from the active channels list on the left to review messages and dispatch real-time administrative responses.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "catalog" && (
              <motion.div
                key="catalog-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                {/* Catalog Sub Navigation */}
                <div className="flex gap-1.5 border-b border-white/5 pb-2 shrink-0">
                  <button
                    onClick={() => setCatalogSubTab("manage")}
                    className={`flex items-center gap-2 pb-2.5 px-3 sm:px-5 text-[10px] font-tech font-bold tracking-widest border-b-2 transition-all cursor-pointer ${
                      catalogSubTab === "manage"
                        ? "border-gold-base text-gold-light"
                        : "border-transparent text-white/40 hover:text-white/80"
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    DATABASE MANAGER
                  </button>
                  <button
                    onClick={() => setCatalogSubTab("requests")}
                    className={`flex items-center gap-2 pb-2.5 px-3 sm:px-5 text-[10px] font-tech font-bold tracking-widest border-b-2 transition-all relative cursor-pointer ${
                      catalogSubTab === "requests"
                        ? "border-gold-base text-gold-light"
                        : "border-transparent text-white/40 hover:text-white/80"
                    }`}
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    USER MOVIE REQUESTS
                    {movieRequests.length > 0 && (
                      <span className="bg-red-500 text-white text-[8px] font-sans font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse shrink-0">
                        {movieRequests.length}
                      </span>
                    )}
                  </button>
                </div>

                {catalogSubTab === "manage" ? (
                  <>
                    {/* Catalog Database Manager Control Panel */}
                    <div className="flex flex-col gap-6">
                      {/* Premium Core Action Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Add Movie Card */}
                        <div className="luxury-glass p-6 rounded-3xl border border-white/5 flex flex-col justify-between gap-5 hover:border-gold-base/20 transition-all relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-base/5 rounded-full blur-2xl group-hover:bg-gold-base/10 transition-all pointer-events-none" />
                          <div className="flex flex-col gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gold-base/10 flex items-center justify-center text-gold-base mb-2">
                              <Film className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-serif font-black tracking-wide text-white uppercase">
                              ADD MOVIE (ADVANCED MODEL)
                            </h4>
                            <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                              Upload high-quality cinema titles, specify streaming media sources, import detailed TMDB metadata, and select category types dynamically.
                            </p>
                          </div>
                          {onOpenMovieAddModal && (
                            <button
                              type="button"
                              onClick={onOpenMovieAddModal}
                              className="gold-gradient-bg text-black font-extrabold text-[10px] tracking-widest font-tech py-3.5 px-6 rounded-xl hover:brightness-110 active:scale-95 transition-all w-full cursor-pointer text-center"
                            >
                              ADD NEW MOVIE
                            </button>
                          )}
                        </div>

                        {/* Add Series Card */}
                        <div className="luxury-glass p-6 rounded-3xl border border-white/5 flex flex-col justify-between gap-5 hover:border-gold-base/20 transition-all relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-base/5 rounded-full blur-2xl group-hover:bg-gold-base/10 transition-all pointer-events-none" />
                          <div className="flex flex-col gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gold-base/10 flex items-center justify-center text-gold-base mb-2">
                              <Tv className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-serif font-black tracking-wide text-white uppercase">
                              ADD TV SERIES / SERIALS
                            </h4>
                            <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                              Create full-featured serialized TV shows, establish season architectures, upload dynamic episode sources, and set ratings.
                            </p>
                          </div>
                          {onOpenSeriesAddModal && (
                            <button
                              type="button"
                              onClick={onOpenSeriesAddModal}
                              className="gold-gradient-bg text-black font-extrabold text-[10px] tracking-widest font-tech py-3.5 px-6 rounded-xl hover:brightness-110 active:scale-95 transition-all w-full cursor-pointer text-center"
                            >
                              ADD NEW SERIES
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Backup, Import & Preferences Card */}
                      <div className="luxury-glass p-6 rounded-3xl border border-white/5 flex flex-col gap-5">
                        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                          <Database className="w-4 h-4 text-gold-base" />
                          <h4 className="text-xs font-serif font-black tracking-wider text-white uppercase">
                            DATABASE OPERATIONS & PREFERENCES
                          </h4>
                        </div>

                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-6 flex-wrap">
                            {/* Global Auto Slider Toggle Switch */}
                            <label className="flex items-center gap-2 text-[10px] text-white/50 hover:text-white/80 transition-colors cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={trendingAutoSliderEnabled}
                                onChange={onToggleTrendingAutoSlider}
                                className="rounded border-white/20 bg-black accent-gold-base w-4 h-4 cursor-pointer"
                              />
                              <span className="font-tech tracking-wider uppercase">
                                Trending Now Auto Slider Tick
                              </span>
                            </label>

                            {onClearAllMoviesOnly && (
                              <button
                                type="button"
                                onClick={onClearAllMoviesOnly}
                                className="px-3.5 py-1.5 text-[9px] font-tech font-bold text-rose-400 bg-rose-950/30 border border-rose-500/20 hover:bg-rose-900/40 hover:border-rose-500/40 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                DELETE ALL MOVIES
                              </button>
                            )}

                            {onClearAllSeriesOnly && (
                              <button
                                type="button"
                                onClick={onClearAllSeriesOnly}
                                className="px-3.5 py-1.5 text-[9px] font-tech font-bold text-orange-400 bg-orange-950/30 border border-orange-500/20 hover:bg-orange-900/40 hover:border-orange-500/40 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-orange-400" />
                                DELETE ALL SERIES
                              </button>
                            )}

                            {onClearAllMovies && (
                              <button
                                type="button"
                                onClick={onClearAllMovies}
                                className="px-3.5 py-1.5 text-[9px] font-tech font-bold text-red-400 bg-red-950/40 border border-red-500/20 hover:bg-red-900/40 hover:border-red-500/40 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                CLEAR ALL CATALOG
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                document.getElementById('admin-catalog-import-input')?.click();
                              }}
                              className="text-[9px] font-tech font-bold uppercase tracking-widest text-emerald-400 border border-emerald-500/20 py-2.5 px-4 rounded-xl hover:bg-emerald-500/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                              IMPORT JSON
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBackupItemIds(movies.map(m => m.id));
                                setPreviewImportItems([]);
                                setSelectedImportItemIds([]);
                                setSelectedPreviewMovie(null);
                                setShowBackupModal(true);
                              }}
                              className="text-[9px] font-tech font-bold uppercase tracking-widest text-gold-base border border-gold-base/20 py-2.5 px-4 rounded-xl hover:bg-gold-base/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Database className="w-3.5 h-3.5 text-gold-base" />
                              BACKUP & RESTORE CENTER
                            </button>

                            <input
                              id="admin-catalog-import-input"
                              type="file"
                              accept=".json"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  try {
                                    const parsed = JSON.parse(event.target?.result as string);
                                    const itemsToImport = Array.isArray(parsed) ? parsed : [parsed];
                                    
                                    let successCount = 0;
                                    for (const item of itemsToImport) {
                                      if (item && item.title) {
                                        const importedMovie: Movie = {
                                          id: item.id || `custom_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                                          title: item.title,
                                          type: item.type || "movie",
                                          year: Number(item.year || new Date().getFullYear()),
                                          runtime: item.runtime || (item.type === "series" ? "1 Season" : "2h 00m"),
                                          rating: Number(item.rating || 7.5),
                                          genres: Array.isArray(item.genres) ? item.genres : (item.genre ? [item.genre] : ["Cinematic"]),
                                          overview: item.overview || "No overview provided.",
                                          posterUrl: item.posterUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80",
                                          backdropUrl: item.backdropUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
                                          isPremium: !!item.isPremium,
                                          isTrending: !!item.isTrending,
                                          videoUrl: item.videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4",
                                          cast: Array.isArray(item.cast) ? item.cast : [],
                                          reviews: Array.isArray(item.reviews) ? item.reviews : [],
                                          createdAt: item.createdAt || new Date().toISOString()
                                        };
                                        onAddMovie(importedMovie);
                                        successCount++;
                                      }
                                    }
                                    alert(`Successfully imported ${successCount} dynamic movie items into Catalog database!`);
                                  } catch (err) {
                                    alert("Failed to parse Catalog JSON backup file.");
                                  }
                                };
                                reader.readAsText(file);
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Movie Catalog List Card */}
                      <div className="luxury-glass p-6 rounded-3xl border border-white/5 flex flex-col gap-4 animate-fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2">
                            <Film className="w-4 h-4 text-gold-base" />
                            <h4 className="text-xs font-serif font-black tracking-wider text-white uppercase">
                              Movie List (Catalog Specification)
                            </h4>
                          </div>
                          
                          {/* Search Input */}
                          <div className="relative shrink-0 w-full sm:w-60">
                            <input
                              type="text"
                              value={movieCatalogSearch}
                              onChange={(e) => setMovieCatalogSearch(e.target.value)}
                              placeholder="SEARCH MOVIES..."
                              className="w-full text-[10px] font-tech text-white placeholder-white/30 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 focus:border-gold-base/50 outline-none uppercase"
                            />
                            {movieCatalogSearch && (
                              <button
                                onClick={() => setMovieCatalogSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Movies List Table */}
                        <div className="overflow-x-auto w-full scrollbar-none">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="border-b border-white/10 text-[8px] font-tech text-white/50 tracking-wider uppercase">
                                <th className="pb-3 pl-2">POSTER</th>
                                <th className="pb-3">MOVIE TITLE / YEAR</th>
                                <th className="pb-3">RATING / RUNTIME</th>
                                <th className="pb-3">GENRES</th>
                                <th className="pb-3 text-right pr-2">CONSOLES</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {movies
                                .filter(m => m.type !== 'series')
                                .filter(m => !movieCatalogSearch || m.title.toLowerCase().includes(movieCatalogSearch.toLowerCase()))
                                .length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="py-8 text-center text-xs text-white/30 italic">
                                      No movies found in the active catalog specification.
                                    </td>
                                  </tr>
                                ) : (
                                  movies
                                    .filter(m => m.type !== 'series')
                                    .filter(m => !movieCatalogSearch || m.title.toLowerCase().includes(movieCatalogSearch.toLowerCase()))
                                    .map((movie) => (
                                      <tr key={`catalog-movie-${movie.id}`} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="py-3 pl-2">
                                          <img
                                            src={movie.posterUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80"}
                                            alt={movie.title}
                                            referrerPolicy="no-referrer"
                                            className="w-8 h-12 object-cover rounded-lg border border-white/10"
                                          />
                                        </td>
                                        <td className="py-3">
                                          <div className="font-bold text-white uppercase">{movie.title}</div>
                                          <div className="text-[9px] text-white/40 font-mono mt-0.5">
                                            {movie.type ? movie.type.toUpperCase() : "MOVIE"} • {movie.year}
                                          </div>
                                        </td>
                                        <td className="py-3">
                                          <div className="flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-gold-base text-gold-base shrink-0" />
                                            <span className="font-bold text-white">{movie.rating}</span>
                                          </div>
                                          <div className="text-[9px] text-white/40 font-mono mt-0.5">
                                            {movie.runtime}
                                          </div>
                                        </td>
                                        <td className="py-3 text-white/60">
                                          {Array.isArray(movie.genres) ? movie.genres.join(', ') : 'Cinematic'}
                                        </td>
                                        <td className="py-3 text-right pr-2">
                                          <div className="flex items-center justify-end gap-1.5">
                                            {onEditMovie && (
                                              <button
                                                onClick={() => onEditMovie(movie)}
                                                className="px-2.5 py-1.5 text-[8px] font-tech font-bold text-gold-base border border-gold-base/20 hover:bg-gold-base/10 rounded-lg transition-all active:scale-95 cursor-pointer uppercase"
                                              >
                                                EDIT
                                              </button>
                                            )}
                                            {onDeleteMovieClick && (
                                              <button
                                                onClick={() => onDeleteMovieClick(movie)}
                                                className="px-2.5 py-1.5 text-[8px] font-tech font-bold text-red-400 bg-red-950/20 border border-red-500/20 hover:bg-red-900/25 hover:border-red-500/40 rounded-lg transition-all active:scale-95 cursor-pointer uppercase"
                                              >
                                                DELETE
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Serials Catalog List Card */}
                      <div className="luxury-glass p-6 rounded-3xl border border-white/5 flex flex-col gap-4 animate-fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2">
                            <Tv className="w-4 h-4 text-gold-base" />
                            <h4 className="text-xs font-serif font-black tracking-wider text-white uppercase">
                              Serials List (Series Specification)
                            </h4>
                          </div>
                          
                          {/* Search Input */}
                          <div className="relative shrink-0 w-full sm:w-60">
                            <input
                              type="text"
                              value={seriesCatalogSearch}
                              onChange={(e) => setSeriesCatalogSearch(e.target.value)}
                              placeholder="SEARCH SERIALS..."
                              className="w-full text-[10px] font-tech text-white placeholder-white/30 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 focus:border-gold-base/50 outline-none uppercase"
                            />
                            {seriesCatalogSearch && (
                              <button
                                onClick={() => setSeriesCatalogSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Serials List Table */}
                        <div className="overflow-x-auto w-full scrollbar-none">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="border-b border-white/10 text-[8px] font-tech text-white/50 tracking-wider uppercase">
                                <th className="pb-3 pl-2">POSTER</th>
                                <th className="pb-3">SERIES TITLE / YEAR</th>
                                <th className="pb-3">RATING / SEASONS</th>
                                <th className="pb-3">GENRES</th>
                                <th className="pb-3 text-right pr-2">CONSOLES</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {movies
                                .filter(m => m.type === 'series')
                                .filter(m => !seriesCatalogSearch || m.title.toLowerCase().includes(seriesCatalogSearch.toLowerCase()))
                                .length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="py-8 text-center text-xs text-white/30 italic">
                                      No TV series found in the active catalog specification.
                                    </td>
                                  </tr>
                                ) : (
                                  movies
                                    .filter(m => m.type === 'series')
                                    .filter(m => !seriesCatalogSearch || m.title.toLowerCase().includes(seriesCatalogSearch.toLowerCase()))
                                    .map((series) => (
                                      <tr key={`catalog-series-${series.id}`} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="py-3 pl-2">
                                          <img
                                            src={series.posterUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80"}
                                            alt={series.title}
                                            referrerPolicy="no-referrer"
                                            className="w-8 h-12 object-cover rounded-lg border border-white/10"
                                          />
                                        </td>
                                        <td className="py-3">
                                          <div className="font-bold text-white uppercase">{series.title}</div>
                                          <div className="text-[9px] text-white/40 font-mono mt-0.5">
                                            {series.type.toUpperCase()} • {series.year}
                                          </div>
                                        </td>
                                        <td className="py-3">
                                          <div className="flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-gold-base text-gold-base shrink-0" />
                                            <span className="font-bold text-white">{series.rating}</span>
                                          </div>
                                          <div className="text-[9px] text-white/40 font-mono mt-0.5">
                                            {series.runtime}
                                          </div>
                                        </td>
                                        <td className="py-3 text-white/60">
                                          {Array.isArray(series.genres) ? series.genres.join(', ') : 'Cinematic'}
                                        </td>
                                        <td className="py-3 text-right pr-2">
                                          <div className="flex items-center justify-end gap-1.5">
                                            {onEditSeries && (
                                              <button
                                                onClick={() => onEditSeries(series)}
                                                className="px-2.5 py-1.5 text-[8px] font-tech font-bold text-gold-base border border-gold-base/20 hover:bg-gold-base/10 rounded-lg transition-all active:scale-95 cursor-pointer uppercase"
                                              >
                                                EDIT
                                              </button>
                                            )}
                                            {onDeleteMovieClick && (
                                              <button
                                                onClick={() => onDeleteMovieClick(series)}
                                                className="px-2.5 py-1.5 text-[8px] font-tech font-bold text-red-400 bg-red-950/20 border border-red-500/20 hover:bg-red-900/25 hover:border-red-500/40 rounded-lg transition-all active:scale-95 cursor-pointer uppercase"
                                              >
                                                DELETE
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div>
                        <h3 className="text-xs font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark flex items-center gap-2 uppercase">
                          <Inbox className="w-4 h-4 text-gold-base" />
                          USER MOVIE REQUESTS INBOX ({movieRequests.length})
                        </h3>
                        <p className="text-[9px] text-white/40 font-tech">
                          Suggestions submitted by users. Approve or reject
                          requests directly from here.
                        </p>
                      </div>
                      <button
                        onClick={loadMovieRequests}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-lg hover:bg-white/5 text-[9px] font-tech text-white/60 hover:text-white transition-all cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isRequestsLoading ? "animate-spin text-gold-base" : ""}`}
                        />
                        REFRESH
                      </button>
                    </div>

                    {isRequestsLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 luxury-glass rounded-xxl border-white/5">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.2,
                            ease: "linear",
                          }}
                          className="w-10 h-10 border-2 border-gold-base/20 border-t-gold-base rounded-full"
                        />
                        <span className="text-[9px] font-tech text-white/40 tracking-widest uppercase">
                          RETRIEVING INBOX REQUESTS...
                        </span>
                      </div>
                    ) : movieRequests.length === 0 ? (
                      <div className="luxury-glass p-12 text-center rounded-xxl border-white/5 flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-white/30" />
                        <span className="text-xs font-serif font-bold text-white uppercase tracking-wider">
                          REQUEST INBOX EMPTY
                        </span>
                        <p className="text-[10px] text-white/40 max-w-xs mx-auto">
                          No active requests are present inside the Firestore
                          database. User-submitted suggestions will populate
                          here.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 pb-8">
                        {movieRequests.map((req, idx) => (
                          <div
                            key={`req-inbox-${req.id || idx}-${idx}`}
                            className="luxury-glass p-4 rounded-xxl border border-white/5 hover:border-gold-base/15 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-serif font-bold text-white uppercase tracking-wide">
                                  {req.title}
                                </span>
                                <span className="text-[8px] font-tech px-2 py-0.5 rounded bg-white/10 text-white/70 font-bold uppercase">
                                  {req.type}
                                </span>
                                <span
                                  className={`text-[8px] font-tech px-2 py-0.5 rounded border font-extrabold uppercase ${
                                    req.status === "approved"
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                      : req.status === "rejected"
                                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                                        : "border-gold-base/30 bg-gold-base/10 text-gold-base animate-pulse"
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </div>

                              <div className="flex flex-col gap-0.5 text-[9px] text-white/40">
                                <p>
                                  Requested by:{" "}
                                  <span className="text-white/60 font-semibold">
                                    {req.requestedBy}
                                  </span>{" "}
                                  ({req.userEmail || "No Email"})
                                </p>
                                <p>
                                  Submitted:{" "}
                                  <span className="text-white/60">
                                    {new Date(req.createdAt).toLocaleString()}
                                  </span>
                                </p>
                                {req.notes && (
                                  <p className="mt-1 text-[10px] text-gold-light italic">
                                    "{req.notes}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center font-tech">
                              {req.status === "pending" && (
                                <>
                                  <button
                                    onClick={async () => {
                                      await updateMovieRequestStatusInFirestore(
                                        req.id,
                                        "approved",
                                      );
                                      loadMovieRequests();
                                    }}
                                    className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black rounded-lg text-emerald-400 text-[9px] font-tech font-bold transition-all cursor-pointer"
                                  >
                                    APPROVE
                                  </button>
                                  <button
                                    onClick={async () => {
                                      await updateMovieRequestStatusInFirestore(
                                        req.id,
                                        "rejected",
                                      );
                                      loadMovieRequests();
                                    }}
                                    className="px-3 py-1.5 bg-red-500/15 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg text-red-400 text-[9px] font-tech font-bold transition-all cursor-pointer"
                                  >
                                    REJECT
                                  </button>
                                </>
                              )}
                              <button
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      "Are you sure you want to delete this request permanently?",
                                    )
                                  ) {
                                    await deleteMovieRequestFromFirestore(
                                      req.id,
                                    );
                                    loadMovieRequests();
                                  }
                                }}
                                className="p-1.5 border border-white/10 hover:bg-red-500 hover:border-red-500 hover:text-white text-white/40 rounded-lg transition-all cursor-pointer"
                                title="Delete Request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "categories" && (
              <motion.div
                key="categories-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* TABLE 1: MOVIE CATEGORIES TABLE */}
                <div className="luxury-glass p-5 rounded-2xl border-white/5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-xs font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark flex items-center gap-2">
                      <Film className="w-4 h-4 text-gold-base" />
                      MOVIE CATEGORY persist
                    </h3>
                    <p className="text-[9px] text-white/40 font-tech">
                      Manage active filter labels used inside the Movie
                      collection.
                    </p>
                  </div>

                  {/* Add New Movie Category Form */}
                  <form
                    onSubmit={handleAddMovieCategory}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      required
                      placeholder="New Movie Category e.g. Sci-Fi"
                      value={newMovieCat}
                      onChange={(e) => setNewMovieCat(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-xl p-2 flex-1 text-xs text-white focus:outline-none focus:border-gold-base"
                    />
                    <button
                      type="submit"
                      className="gold-gradient-bg text-black font-tech font-extrabold text-[9px] tracking-wider px-4 rounded-xl cursor-pointer hover:brightness-110 active:scale-95 transition-all shrink-0"
                    >
                      ADD CATEGORY
                    </button>
                  </form>

                  {/* Categories List table */}
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                    {movieCategories.map((cat, idx) => {
                      const isEditingCat = editingMovieCatIdx === idx;
                      const isDragged = draggedIdx === idx;
                      const isOver = dragOverIdx === idx;

                      return (
                        <div
                          key={`movie-cat-${cat}-${idx}`}
                          draggable={cat !== "All" && !isEditingCat}
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={handleDragOver}
                          onDragEnter={() => handleDragEnter(idx)}
                          onDragEnd={handleDragEndMovie}
                          className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                            isOver
                              ? "border-gold-base/50 bg-gold-base/5 scale-[1.01]"
                              : "border-white/5 bg-white/[0.03]"
                          } border ${isDragged ? "opacity-30" : ""}`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {cat !== "All" && !isEditingCat && (
                              <GripVertical className="w-3.5 h-3.5 text-white/30 cursor-grab hover:text-white/60 shrink-0" />
                            )}
                            {isEditingCat ? (
                              <div className="flex items-center gap-2 flex-1 mr-2">
                                <input
                                  type="text"
                                  value={editingMovieCatVal}
                                  onChange={(e) =>
                                    setEditingMovieCatVal(e.target.value)
                                  }
                                  className="bg-black/60 border border-white/10 rounded-lg p-1.5 text-xs text-white flex-1 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMovieCategory(idx)}
                                  className="bg-emerald-500 text-black p-1.5 rounded-lg text-[9px] font-bold"
                                >
                                  SAVE
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingMovieCatIdx(null)}
                                  className="bg-white/10 text-white p-1.5 rounded-lg text-[9px]"
                                >
                                  CANCEL
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-white/90 truncate">
                                {cat}{" "}
                                {cat === "All" && (
                                  <span className="text-[8px] text-white/30 font-normal ml-1">
                                    (Read Only)
                                  </span>
                                )}
                              </span>
                            )}
                          </div>

                          {!isEditingCat && (
                            <div className="flex items-center gap-1 shrink-0">
                              {cat !== "All" && (
                                <button
                                  onClick={() => {
                                    setEditingMovieCatIdx(idx);
                                    setEditingMovieCatVal(cat);
                                  }}
                                  className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"
                                  title="Edit category"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {cat !== "All" && (
                                <button
                                  onClick={() => handleDeleteMovieCategory(cat)}
                                  className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-all"
                                  title="Delete category"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TABLE 2: SERIES CATEGORIES TABLE */}
                <div className="luxury-glass p-5 rounded-2xl border-white/5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-xs font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark flex items-center gap-2">
                      <Tv className="w-4 h-4 text-gold-base" />
                      SERIES CATEGORY persist
                    </h3>
                    <p className="text-[9px] text-white/40 font-tech">
                      Manage active filter labels used inside the Series
                      collection.
                    </p>
                  </div>

                  {/* Add New Series Category Form */}
                  <form
                    onSubmit={handleAddSeriesCategory}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      required
                      placeholder="New Series Category e.g. Suspense"
                      value={newSeriesCat}
                      onChange={(e) => setNewSeriesCat(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-xl p-2 flex-1 text-xs text-white focus:outline-none focus:border-gold-base"
                    />
                    <button
                      type="submit"
                      className="gold-gradient-bg text-black font-tech font-extrabold text-[9px] tracking-wider px-4 rounded-xl cursor-pointer hover:brightness-110 active:scale-95 transition-all shrink-0"
                    >
                      ADD CATEGORY
                    </button>
                  </form>

                  {/* Categories List table */}
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                    {seriesCategories.map((cat, idx) => {
                      const isEditingCat = editingSeriesCatIdx === idx;
                      const isDragged = draggedIdx === idx;
                      const isOver = dragOverIdx === idx;

                      return (
                        <div
                          key={`series-cat-${cat}-${idx}`}
                          draggable={cat !== "All" && !isEditingCat}
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={handleDragOver}
                          onDragEnter={() => handleDragEnter(idx)}
                          onDragEnd={handleDragEndSeries}
                          className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                            isOver
                              ? "border-gold-base/50 bg-gold-base/5 scale-[1.01]"
                              : "border-white/5 bg-white/[0.03]"
                          } border ${isDragged ? "opacity-30" : ""}`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {cat !== "All" && !isEditingCat && (
                              <GripVertical className="w-3.5 h-3.5 text-white/30 cursor-grab hover:text-white/60 shrink-0" />
                            )}
                            {isEditingCat ? (
                              <div className="flex items-center gap-2 flex-1 mr-2">
                                <input
                                  type="text"
                                  value={editingSeriesCatVal}
                                  onChange={(e) =>
                                    setEditingSeriesCatVal(e.target.value)
                                  }
                                  className="bg-black/60 border border-white/10 rounded-lg p-1.5 text-xs text-white flex-1 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSeriesCategory(idx)
                                  }
                                  className="bg-emerald-500 text-black p-1.5 rounded-lg text-[9px] font-bold"
                                >
                                  SAVE
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSeriesCatIdx(null)}
                                  className="bg-white/10 text-white p-1.5 rounded-lg text-[9px]"
                                >
                                  CANCEL
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-white/90 truncate">
                                {cat}{" "}
                                {cat === "All" && (
                                  <span className="text-[8px] text-white/30 font-normal ml-1">
                                    (Read Only)
                                  </span>
                                )}
                              </span>
                            )}
                          </div>

                          {!isEditingCat && (
                            <div className="flex items-center gap-1 shrink-0">
                              {cat !== "All" && (
                                <button
                                  onClick={() => {
                                    setEditingSeriesCatIdx(idx);
                                    setEditingSeriesCatVal(cat);
                                  }}
                                  className="text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"
                                  title="Edit category"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {cat !== "All" && (
                                <button
                                  onClick={() =>
                                    handleDeleteSeriesCategory(cat)
                                  }
                                  className="text-red-400 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-all"
                                  title="Delete category"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Series Category Preview - like Main App Home Page */}
                <div className="col-span-1 md:col-span-2 border-t border-white/5 pt-6 flex flex-col gap-6">
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-sm font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark flex items-center gap-2 uppercase tracking-widest">
                      <Tv className="w-4 h-4 text-gold-base animate-pulse" />
                      Series Categories Preview (Home Style)
                    </h3>
                    <p className="text-[9px] font-tech text-white/40 uppercase tracking-widest">
                      EPISODIC SAGAS CATEGORIZED UNDER CORRESPONDING GENRE
                      SHELVES
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {Array.from(
                      new Set(
                        (seriesCategories || [])
                          .filter(Boolean)
                          .map((c) => c.trim()),
                      ),
                    )
                      .filter((c) => c.toLowerCase() !== "all")
                      .map((category, idx) => {
                        const categorySerials = (movies || []).filter(
                          (m) =>
                            m &&
                            m.type === "series" &&
                            m.genres &&
                            Array.isArray(m.genres) &&
                            m.genres.some(
                              (cat) =>
                                cat.toLowerCase() === category.toLowerCase(),
                            ),
                        );

                        return (
                          <div
                            key={`admin-series-category-${category}-${idx}`}
                            className="flex flex-col gap-3.5 bg-white/[0.01] border border-white/5 p-5 rounded-2xl"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-0.5">
                                <h4 className="text-xs font-serif font-black tracking-widest text-white uppercase italic flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gold-base"></span>
                                  {category} Serials
                                </h4>
                                <span className="text-[8px] font-tech text-gold-base/50 uppercase tracking-widest">
                                  {categorySerials.length} registered{" "}
                                  {categorySerials.length === 1
                                    ? "saga"
                                    : "sagas"}{" "}
                                  online
                                </span>
                              </div>
                            </div>

                            {categorySerials.length === 0 ? (
                              <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                                <p className="text-[10px] text-white/30 italic">
                                  No episodic serials added to "{category}"
                                  category yet.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                                {categorySerials.map((serial, idx) => (
                                  <div
                                    key={`admin-series-preview-${category}-${serial.id || idx}-${idx}`}
                                    className="flex flex-col gap-2 bg-[#0d0d10] border border-white/5 p-2 rounded-xl group relative overflow-hidden shadow-lg hover:border-gold-base/30 transition-all duration-300"
                                  >
                                    <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-white/5 relative">
                                      <ResolvedImage
                                        src={serial.posterUrl}
                                        alt={serial.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        referrerPolicy="no-referrer"
                                      />
                                      {serial.isPremium && (
                                        <div className="absolute top-1.5 right-1.5 bg-gradient-to-r from-yellow-500 to-amber-600 p-1 rounded-md shadow-lg">
                                          <Crown className="w-2.5 h-2.5 text-black" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-bold text-white/90 truncate">
                                        {serial.title}
                                      </span>
                                      <span className="text-[8px] font-tech text-white/40">
                                        {serial.year} •{" "}
                                        {serial.seasonsCount ||
                                          (serial.seasons
                                            ? serial.seasons.length
                                            : 1)}{" "}
                                        Seasons
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "broadband" && (
              <motion.div
                key="broadband-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                {/* Header overview metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="luxury-glass p-4 rounded-xl text-center">
                    <span className="text-[9px] font-tech text-white/40 block tracking-wider uppercase">
                      ISP BACKBONE STATUS
                    </span>
                    <span className="text-sm font-tech font-bold text-emerald-400 block mt-1 uppercase flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping animate-pulse" />
                      DHAKA CORE - ACTIVE
                    </span>
                  </div>
                  <div className="luxury-glass p-4 rounded-xl text-center border-gold-base/10">
                    <span className="text-[9px] font-tech text-white/40 block tracking-wider uppercase">
                      PEAK THROUGHPUT LOAD
                    </span>
                    <span className="text-sm font-tech font-bold text-gold-base block mt-1">
                      4.82 Gbps / 10 Gbps
                    </span>
                  </div>
                  <div className="luxury-glass p-4 rounded-xl text-center border-amber-500/10">
                    <span className="text-[9px] font-tech text-white/40 block tracking-wider uppercase">
                      VIP ALLOCATION BANDWIDTH
                    </span>
                    <span className="text-sm font-tech font-bold text-amber-500 block mt-1">
                      UNLIMITED PRIORITY
                    </span>
                  </div>
                </div>

                {/* 2-Column Dashboard Layout */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {/* Left Column (3 cols): Speed Test Tool */}
                  <div className="md:col-span-3 luxury-glass p-6 rounded-xxl border-white/5 flex flex-col gap-5 items-center justify-center relative min-h-[380px]">
                    <div className="w-full flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="text-left">
                        <h3 className="text-xs font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase tracking-wider">
                          CLIENT BROADBAND DIAGNOSTICS
                        </h3>
                        <p className="text-[9px] text-white/40 font-tech">
                          Measure realtime download, upload, ping, and jitter
                          speeds.
                        </p>
                      </div>
                      <span className="text-[8px] font-tech px-2 py-0.5 rounded bg-white/10 text-white/60 font-bold uppercase tracking-widest">
                        NODE DESKTOP- Dhaka
                      </span>
                    </div>

                    {/* Circular Speed Test Indicator */}
                    <div className="relative w-48 h-48 flex items-center justify-center mt-4">
                      {/* Outer Ring */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          stroke="rgba(255,255,255,0.03)"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        <motion.circle
                          cx="96"
                          cy="96"
                          r="80"
                          stroke={
                            speedTestStage === "download"
                              ? "#d4af37"
                              : speedTestStage === "upload"
                                ? "#f59e0b"
                                : speedTestStage === "ping"
                                  ? "#3b82f6"
                                  : speedTestStage === "complete"
                                    ? "#10b981"
                                    : "rgba(212,175,55,0.15)"
                          }
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray="502"
                          strokeDashoffset={
                            502 - (502 * speedTestProgress) / 100
                          }
                          transition={{ ease: "easeOut", duration: 0.2 }}
                        />
                      </svg>

                      {/* Speed numbers on gauge */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                        {speedTestStage === "idle" && (
                          <>
                            <Wifi className="w-8 h-8 text-white/20 mb-1 animate-pulse" />
                            <span className="text-[10px] font-tech text-white/50 tracking-wider">
                              READY
                            </span>
                          </>
                        )}
                        {speedTestStage === "ping" && (
                          <>
                            <span className="text-[9px] font-tech text-blue-400 tracking-widest uppercase animate-pulse">
                              PING TEST
                            </span>
                            <span className="text-xl font-mono text-white font-bold mt-1">
                              {measuredPing || "--"}{" "}
                              <span className="text-[10px] font-normal text-white/40">
                                ms
                              </span>
                            </span>
                          </>
                        )}
                        {speedTestStage === "download" && (
                          <>
                            <span className="text-[9px] font-tech text-gold-base tracking-widest uppercase animate-pulse">
                              DOWNLOADING
                            </span>
                            <span className="text-2xl font-mono text-white font-black mt-1 leading-none">
                              {measuredDownload || "0.0"}
                            </span>
                            <span className="text-[10px] font-tech text-gold-light mt-0.5">
                              Mbps
                            </span>
                          </>
                        )}
                        {speedTestStage === "upload" && (
                          <>
                            <span className="text-[9px] font-tech text-amber-500 tracking-widest uppercase animate-pulse">
                              UPLOADING
                            </span>
                            <span className="text-2xl font-mono text-white font-black mt-1 leading-none">
                              {measuredUpload || "0.0"}
                            </span>
                            <span className="text-[10px] font-tech text-amber-400 mt-0.5">
                              Mbps
                            </span>
                          </>
                        )}
                        {speedTestStage === "complete" && (
                          <>
                            <Check className="w-6 h-6 text-emerald-400 mb-1 animate-bounce" />
                            <span className="text-[9px] font-tech text-emerald-400 tracking-widest uppercase font-bold">
                              SUCCESS
                            </span>
                            <span className="text-lg font-mono text-white font-black mt-0.5">
                              {measuredDownload}{" "}
                              <span className="text-[8px] font-normal text-white/40">
                                Mbps
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress details */}
                    <div className="w-full grid grid-cols-4 gap-2 text-center mt-2 border-t border-white/5 pt-4">
                      <div>
                        <span className="text-[8px] font-tech text-white/40 block uppercase">
                          PING
                        </span>
                        <span className="text-xs font-mono font-bold text-white block mt-0.5">
                          {measuredPing ? `${measuredPing} ms` : "--"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] font-tech text-white/40 block uppercase">
                          JITTER
                        </span>
                        <span className="text-xs font-mono font-bold text-white block mt-0.5">
                          {measuredJitter ? `${measuredJitter} ms` : "--"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] font-tech text-gold-base/70 block uppercase">
                          DOWNLOAD
                        </span>
                        <span className="text-xs font-mono font-bold text-gold-light block mt-0.5">
                          {measuredDownload ? `${measuredDownload}` : "--"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] font-tech text-amber-500/70 block uppercase">
                          UPLOAD
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400 block mt-0.5">
                          {measuredUpload ? `${measuredUpload}` : "--"}
                        </span>
                      </div>
                    </div>

                    {/* Button */}
                    <button
                      type="button"
                      disabled={isSpeedTesting}
                      onClick={() => {
                        setIsSpeedTesting(true);
                        setSpeedTestStage("ping");
                        setSpeedTestProgress(0);
                        setMeasuredPing(0);
                        setMeasuredJitter(0);
                        setMeasuredDownload(0);
                        setMeasuredUpload(0);

                        let progress = 0;
                        const interval = setInterval(() => {
                          progress += 2;
                          setSpeedTestProgress(Math.min(progress, 100));

                          if (progress < 20) {
                            setSpeedTestStage("ping");
                            setMeasuredPing(Math.floor(12 + Math.random() * 6));
                            setMeasuredJitter(
                              Math.floor(1 + Math.random() * 2),
                            );
                          } else if (progress < 65) {
                            setSpeedTestStage("download");
                            setMeasuredDownload(
                              parseFloat(
                                (180 + Math.random() * 210).toFixed(1),
                              ),
                            );
                          } else if (progress < 95) {
                            setSpeedTestStage("upload");
                            setMeasuredUpload(
                              parseFloat((50 + Math.random() * 65).toFixed(1)),
                            );
                          } else if (progress >= 100) {
                            clearInterval(interval);
                            setSpeedTestStage("complete");
                            setIsSpeedTesting(false);
                          }
                        }, 80);
                      }}
                      className={`w-full py-2.5 rounded-xl text-center font-tech text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer ${
                        isSpeedTesting
                          ? "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed animate-pulse"
                          : "gold-gradient-bg text-black hover:brightness-110 shadow-[0_0_15px_rgba(212,175,55,0.35)]"
                      }`}
                    >
                      {isSpeedTesting
                        ? `ANALYZING CONNECTIVITY... ${speedTestProgress}%`
                        : "RUN SPEED DIAGNOSTICS"}
                    </button>
                  </div>

                  {/* Right Column (2 cols): ISP Settings Configurator */}
                  <div className="md:col-span-2 flex flex-col gap-4">
                    {/* Connection Tiers config */}
                    <div className="luxury-glass p-5 rounded-xxl border-white/5 flex flex-col gap-4">
                      <div className="border-b border-white/5 pb-2">
                        <h4 className="text-[11px] font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase tracking-wider flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-gold-base" />
                          ISP STREAM TIERS
                        </h4>
                        <p className="text-[8px] text-white/30 font-tech">
                          Define default speed throttle profiles assigned to
                          client sessions.
                        </p>
                      </div>

                      <div className="flex flex-col gap-4">
                        {/* Standard Slider */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[9px] font-tech font-bold uppercase">
                            <span className="text-white/60">
                              STANDARD SUBSCRIBER
                            </span>
                            <span className="text-gold-light">
                              {standardSpeed} Mbps
                            </span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={standardSpeed}
                            onChange={(e) =>
                              setStandardSpeed(parseInt(e.target.value))
                            }
                            className="w-full accent-gold-base bg-white/10 rounded-lg appearance-none h-1.5 cursor-pointer"
                          />
                        </div>

                        {/* Elite Slider */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[9px] font-tech font-bold uppercase">
                            <span className="text-white/60">ELITE PLAN</span>
                            <span className="text-gold-light">
                              {eliteSpeed} Mbps
                            </span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="300"
                            step="10"
                            value={eliteSpeed}
                            onChange={(e) =>
                              setEliteSpeed(parseInt(e.target.value))
                            }
                            className="w-full accent-gold-base bg-white/10 rounded-lg appearance-none h-1.5 cursor-pointer"
                          />
                        </div>

                        {/* VIP Premium Slider */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[9px] font-tech font-bold uppercase">
                            <span className="text-amber-500">
                              VIP ULTRA PREMIUM
                            </span>
                            <span className="text-amber-400">
                              {vipSpeed} Mbps
                            </span>
                          </div>
                          <input
                            type="range"
                            min="100"
                            max="1000"
                            step="50"
                            value={vipSpeed}
                            onChange={(e) =>
                              setVipSpeed(parseInt(e.target.value))
                            }
                            className="w-full accent-amber-500 bg-white/10 rounded-lg appearance-none h-1.5 cursor-pointer"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsSavingISPConfig(true);
                            setTimeout(() => {
                              setIsSavingISPConfig(false);
                              alert(
                                "ISP broadband default speed limits have been updated successfully!",
                              );
                            }, 600);
                          }}
                          className="w-full mt-2 py-2 border border-white/10 hover:border-gold-base/30 hover:bg-gold-base/10 text-white/80 hover:text-white rounded-lg text-center font-tech text-[9px] font-bold uppercase transition-all cursor-pointer"
                        >
                          {isSavingISPConfig
                            ? "APPLYING CONFIG..."
                            : "APPLY ISP CONFIGURATION"}
                        </button>
                      </div>
                    </div>

                    {/* Network Nodes Status */}
                    <div className="luxury-glass p-5 rounded-xxl border-white/5 flex flex-col gap-3">
                      <span className="text-[9px] font-tech text-white/40 block uppercase tracking-widest border-b border-white/5 pb-1.5">
                        LIVE CDN PEERING NODES
                      </span>
                      <div className="flex flex-col gap-2 text-[10px] font-tech">
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">NODE DHAKA-A</span>
                          <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                            <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                            9.4 ms PING • ACTIVE
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">
                            NODE CHITTAGONG-B
                          </span>
                          <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                            <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                            14.1 ms PING • ACTIVE
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70">NODE SYLHET-C</span>
                          <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                            <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                            11.8 ms PING • ACTIVE
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "users" && (
              <motion.div
                key="users-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                {/* Users Sub Navigation Bar */}
                <div className="flex gap-1.5 border-b border-white/5 pb-2 shrink-0 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setUsersSubTab("directory")}
                    className={`flex items-center gap-2 pb-2.5 px-3 sm:px-4 text-[10px] font-tech font-bold tracking-widest border-b-2 transition-all shrink-0 cursor-pointer ${
                      usersSubTab === "directory"
                        ? "border-gold-base text-gold-light"
                        : "border-transparent text-white/40 hover:text-white/80"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    CLIENT DIRECTORY
                  </button>
                  <button
                    onClick={() => setUsersSubTab("upgrades")}
                    className={`flex items-center gap-2 pb-2.5 px-3 sm:px-4 text-[10px] font-tech font-bold tracking-widest border-b-2 transition-all relative shrink-0 cursor-pointer ${
                      usersSubTab === "upgrades"
                        ? "border-gold-base text-gold-light"
                        : "border-transparent text-white/40 hover:text-white/80"
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    VIP UPGRADES
                    {subscribeRequests.filter((r) => r.status === "pending")
                      .length > 0 && (
                      <span className="bg-amber-500 text-black text-[8px] font-sans font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse shrink-0">
                        {
                          subscribeRequests.filter(
                            (r) => r.status === "pending",
                          ).length
                        }
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setUsersSubTab("plans")}
                    className={`flex items-center gap-2 pb-2.5 px-3 sm:px-4 text-[10px] font-tech font-bold tracking-widest border-b-2 transition-all shrink-0 cursor-pointer ${
                      usersSubTab === "plans"
                        ? "border-gold-base text-gold-light"
                        : "border-transparent text-white/40 hover:text-white/80"
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5 text-gold-base animate-pulse" />
                    SUBSCRIPTION PLANS
                  </button>
                  <button
                    onClick={() => setUsersSubTab("redeem")}
                    className={`flex items-center gap-2 pb-2.5 px-3 sm:px-4 text-[10px] font-tech font-bold tracking-widest border-b-2 transition-all shrink-0 cursor-pointer ${
                      usersSubTab === "redeem"
                        ? "border-gold-base text-gold-light"
                        : "border-transparent text-white/40 hover:text-white/80"
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5 text-amber-500" />
                    REDEEM CODES
                  </button>
                  <button
                    onClick={() => {
                      setUsersSubTab("config");
                      loadSystemParams();
                    }}
                    className={`flex items-center gap-2 pb-2.5 px-3 sm:px-4 text-[10px] font-tech font-bold tracking-widest border-b-2 transition-all shrink-0 cursor-pointer ${
                      usersSubTab === "config"
                        ? "border-gold-base text-gold-light"
                        : "border-transparent text-white/40 hover:text-white/80"
                    }`}
                  >
                    <Gauge className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                    SYSTEM ENGINE
                  </button>
                </div>

                {usersSubTab === "directory" ? (
                  <>
                    {/* Header Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="luxury-glass p-4 rounded-xl text-center">
                        <span className="text-[9px] font-tech text-white/40 block tracking-wider uppercase">
                          TOTAL USERS
                        </span>
                        <span className="text-xl font-serif font-bold text-white block mt-1">
                          {users.length}
                        </span>
                      </div>
                      <div className="luxury-glass p-4 rounded-xl text-center border-gold-base/20">
                        <span className="text-[9px] font-tech text-gold-base/60 block tracking-wider uppercase">
                          VIP CLIENTS
                        </span>
                        <span className="text-xl font-serif font-bold text-gold-base block mt-1">
                          {users.filter((u) => u.isPremium).length}
                        </span>
                      </div>
                      <div className="luxury-glass p-4 rounded-xl text-center border-red-500/20">
                        <span className="text-[9px] font-tech text-red-400/60 block tracking-wider uppercase">
                          SUSPENDED
                        </span>
                        <span className="text-xl font-serif font-bold text-red-400 block mt-1">
                          {users.filter((u) => u.isBanned).length}
                        </span>
                      </div>
                    </div>

                    {/* Action Panel for Directory */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl luxury-glass border border-red-500/10 gap-3 mt-3">
                      <div>
                        <span className="text-[10px] font-tech text-white uppercase tracking-widest font-bold block">BULK SYSTEM OPERATIONS</span>
                        <p className="text-[9px] text-white/40 font-mono mt-0.5">Purge the entire client registration directory permanently in a single click operation.</p>
                      </div>
                      <button
                        onClick={() => setShowDeleteAllUsersModal(true)}
                        className="px-4 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-tech font-extrabold text-[9px] tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        PURGE ALL USER DIRECTORIES
                      </button>
                    </div>

                    {isUsersLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 luxury-glass rounded-xxl">
                        <div className="w-8 h-8 border-2 border-gold-base border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-white/50 font-tech uppercase tracking-widest">
                          LOADING LIVE DATABASE DIRECTORY...
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* TABLE A: PENDING VIP REGISTRATION REQUESTS */}
                        <div className="luxury-glass p-5 rounded-xxl border-yellow-500/20 bg-yellow-500/[0.01] flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-yellow-500/15 pb-2">
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-yellow-500 animate-pulse" />
                              <h3 className="text-xs font-serif font-bold text-white tracking-widest uppercase">
                                [1] PENDING VIP REQUESTS (
                                {
                                  subscribeRequests.filter(
                                    (r) => r.status === "pending",
                                  ).length
                                }
                                )
                              </h3>
                            </div>
                            <span className="text-[8px] font-mono text-yellow-500/60 uppercase">
                              Manual Verification
                            </span>
                          </div>

                          <div className="flex flex-col gap-3">
                            {subscribeRequests.filter(
                              (r) => r.status === "pending",
                            ).length === 0 ? (
                              <div className="text-center py-4 text-xs text-white/30 italic">
                                No pending manual payments in queue.
                              </div>
                            ) : (
                              subscribeRequests
                                .filter((r) => r.status === "pending")
                                .map((req, idx) => (
                                  <div
                                    key={`pending-req-${req.id || idx}-${idx}`}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 gap-3"
                                  >
                                    <div className="text-left">
                                      <span className="text-xs font-bold text-white block">
                                        {req.name}
                                      </span>
                                      <span className="text-[9px] text-white/50 block">
                                        {req.email}
                                      </span>
                                      <span className="text-[8px] bg-yellow-500/10 text-yellow-400 font-extrabold border border-yellow-500/20 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">
                                        {req.planName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={async () => {
                                          const selectedPlan =
                                            adminPlans.find(
                                              (p) => p.id === req.planId,
                                            ) ||
                                            DEFAULT_PLANS.find(
                                              (p) => p.id === req.planId,
                                            );
                                          const days =
                                            selectedPlan?.expireDaysCount || 30;
                                          await updateUserPremiumStatusInFirestore(
                                            req.userId,
                                            true,
                                            days,
                                          );
                                          await updateSubscribeRequestStatusInFirestore(
                                            req.id,
                                            req.userId,
                                            "approved",
                                          );
                                          loadUsers();
                                          loadSubscribeRequests();
                                          alert(
                                            "Approved VIP upgrade successfully!",
                                          );
                                        }}
                                        className="text-[9px] font-tech font-extrabold py-1.5 px-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                                      >
                                        ACTIVATE VIP
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (
                                            window.confirm(
                                              "Reject this request?",
                                            )
                                          ) {
                                            await updateSubscribeRequestStatusInFirestore(
                                              req.id,
                                              req.userId,
                                              "rejected",
                                            );
                                            loadUsers();
                                            loadSubscribeRequests();
                                          }
                                        }}
                                        className="text-[9px] font-tech font-extrabold py-1.5 px-2.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                      >
                                        DECLINE
                                      </button>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>

                        {/* TABLE B: SOON TO EXPIRE VIP CLIENTS */}
                        <div className="luxury-glass p-5 rounded-xxl border-orange-500/20 bg-orange-500/[0.01] flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-orange-500/15 pb-2">
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-orange-500 animate-pulse" />
                              <h3 className="text-xs font-serif font-bold text-white tracking-widest uppercase">
                                [2] SOON TO EXPIRE VIP CLIENTS (
                                {
                                  users.filter((u) => {
                                    if (!u.isPremium || !u.premiumExpiry)
                                      return false;
                                    const remaining =
                                      u.premiumExpiry - Date.now();
                                    return (
                                      remaining > 0 &&
                                      remaining <= 5 * 24 * 60 * 60 * 1000
                                    );
                                  }).length
                                }
                                )
                              </h3>
                            </div>
                            <span className="text-[8px] font-mono text-orange-500/60 uppercase">
                              Within 5 Days
                            </span>
                          </div>

                          <div className="flex flex-col gap-3">
                            {users.filter((u) => {
                              if (!u.isPremium || !u.premiumExpiry)
                                return false;
                              const remaining = u.premiumExpiry - Date.now();
                              return (
                                remaining > 0 &&
                                remaining <= 5 * 24 * 60 * 60 * 1000
                              );
                            }).length === 0 ? (
                              <div className="text-center py-4 text-xs text-white/30 italic">
                                No clients expiring in the next 5 days.
                              </div>
                            ) : (
                              users
                                .filter((u) => {
                                  if (!u.isPremium || !u.premiumExpiry)
                                    return false;
                                  const remaining =
                                    u.premiumExpiry - Date.now();
                                  return (
                                    remaining > 0 &&
                                    remaining <= 5 * 24 * 60 * 60 * 1000
                                  );
                                })
                                .map((user, idx) => {
                                  const remainingMs = user.premiumExpiry
                                    ? user.premiumExpiry - Date.now()
                                    : 0;
                                  const remainingDays = Math.max(
                                    0,
                                    Math.ceil(
                                      remainingMs / (24 * 60 * 60 * 1000),
                                    ),
                                  );
                                  return (
                                    <div
                                      key={`soon-exp-${user.id || idx}-${idx}`}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 gap-3"
                                    >
                                      <div className="text-left">
                                        <span className="text-xs font-bold text-white block">
                                          {user.name}
                                        </span>
                                        <span className="text-[9px] text-white/50 block">
                                          {user.email || "guest@example.com"}
                                        </span>
                                        <span className="text-[8.5px] text-orange-400 font-tech font-bold block mt-1">
                                          ⏳ {remainingDays} Day
                                          {remainingDays > 1 ? "s" : ""}{" "}
                                          Remaining
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={async () => {
                                            await updateUserPremiumStatusInFirestore(
                                              user.id,
                                              true,
                                              30,
                                            );
                                            loadUsers();
                                            alert(
                                              "Extended VIP access by 30 days!",
                                            );
                                          }}
                                          className="text-[9px] font-tech font-extrabold py-1.5 px-2.5 rounded-lg border border-gold-base/40 bg-gold-base/10 text-gold-base hover:bg-gold-base/20 transition-all cursor-pointer"
                                        >
                                          EXTEND 30 DAYS
                                        </button>
                                        <button
                                          onClick={() =>
                                            toggleUserPremium(
                                              user.id,
                                              user.isPremium,
                                            )
                                          }
                                          className="text-[9px] font-tech font-extrabold py-1.5 px-2.5 rounded-lg border border-white/10 text-white/50 hover:bg-white/5 transition-all cursor-pointer"
                                        >
                                          REVOKE
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </div>

                        {/* TABLE C: EXPIRED VIP MEMBERS */}
                        <div className="luxury-glass p-5 rounded-xxl border-red-500/20 bg-red-500/[0.01] flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-red-500/15 pb-2">
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-red-500" />
                              <h3 className="text-xs font-serif font-bold text-white tracking-widest uppercase">
                                [3] EXPIRED VIP MEMBERS (
                                {
                                  users.filter(
                                    (u) =>
                                      !u.isPremium &&
                                      u.premiumExpiry &&
                                      u.premiumExpiry <= Date.now(),
                                  ).length
                                }
                                )
                              </h3>
                            </div>
                            <span className="text-[8px] font-mono text-red-500/60 uppercase">
                              Expired Access
                            </span>
                          </div>

                          <div className="flex flex-col gap-3">
                            {users.filter(
                              (u) =>
                                !u.isPremium &&
                                u.premiumExpiry &&
                                u.premiumExpiry <= Date.now(),
                            ).length === 0 ? (
                              <div className="text-center py-4 text-xs text-white/30 italic">
                                No expired VIP accounts tracked in logs.
                              </div>
                            ) : (
                              users
                                .filter(
                                  (u) =>
                                    !u.isPremium &&
                                    u.premiumExpiry &&
                                    u.premiumExpiry <= Date.now(),
                                )
                                .map((user, idx) => (
                                  <div
                                    key={`expired-${user.id || idx}-${idx}`}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 gap-3"
                                  >
                                    <div className="text-left">
                                      <span className="text-xs font-bold text-white block">
                                        {user.name}
                                      </span>
                                      <span className="text-[9px] text-white/50 block">
                                        {user.email || "guest@example.com"}
                                      </span>
                                      <span className="text-[8.5px] text-red-400 font-tech uppercase block mt-1">
                                        🔴 Membership Expired
                                      </span>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        await updateUserPremiumStatusInFirestore(
                                          user.id,
                                          true,
                                          30,
                                        );
                                        loadUsers();
                                        alert(
                                          "VIP access reactivated for 30 days!",
                                        );
                                      }}
                                      className="text-[9px] font-tech font-extrabold py-1.5 px-3 rounded-lg border border-gold-base/40 bg-gold-base/10 text-gold-base hover:bg-gold-base/20 transition-all cursor-pointer"
                                    >
                                      REACTIVATE VIP
                                    </button>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>

                        {/* TABLE D: BANNED & SUSPENDED CLIENTS */}
                        <div className="luxury-glass p-5 rounded-xxl border-red-600/30 bg-red-950/[0.05] flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-red-600/20 pb-2">
                            <div className="flex items-center gap-2">
                              <Lock className="w-4 h-4 text-red-500" />
                              <h3 className="text-xs font-serif font-bold text-white tracking-widest uppercase">
                                [4] SUSPENDED & BANNED CLIENTS (
                                {users.filter((u) => u.isBanned).length})
                              </h3>
                            </div>
                            <span className="text-[8px] font-mono text-red-500/60 uppercase">
                              Banned Access
                            </span>
                          </div>

                          <div className="flex flex-col gap-3">
                            {users.filter((u) => u.isBanned).length === 0 ? (
                              <div className="text-center py-4 text-xs text-white/30 italic">
                                No banned or suspended client accounts.
                              </div>
                            ) : (
                              users
                                .filter((u) => u.isBanned)
                                .map((user, idx) => (
                                  <div
                                    key={`banned-${user.id || idx}-${idx}`}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 gap-3"
                                  >
                                    <div className="text-left">
                                      <span className="text-xs font-bold text-white block">
                                        {user.name}
                                      </span>
                                      <span className="text-[9px] text-white/50 block">
                                        {user.email || "guest@example.com"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleUnbanUser(user.id)}
                                        className="text-[9px] font-tech font-extrabold py-1.5 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                                      >
                                        UNBAN CLIENT
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleDeleteUserClick(user)
                                        }
                                        className="p-1.5 border border-white/10 hover:bg-red-600 hover:border-red-600 hover:text-white text-white/40 rounded-lg transition-all cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>

                        {/* TABLE E: NEWLY REGISTERED ACCOUNTS */}
                        <div className="luxury-glass p-5 rounded-xxl border-white/5 flex flex-col gap-4 text-left">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-emerald-400" />
                              <h3 className="text-xs font-serif font-bold text-white tracking-widest uppercase">
                                [5] NEWEST REGISTERED CLIENTS (LATEST 5)
                              </h3>
                            </div>
                            <span className="text-[8px] font-mono text-emerald-400/60 uppercase">
                              Recent Signups
                            </span>
                          </div>

                          <div className="flex flex-col gap-3">
                            {users.filter((u) => !u.isPremium).length === 0 ? (
                              <div className="text-center py-4 text-xs text-white/30 italic">
                                No newly registered free users.
                              </div>
                            ) : (
                              [...users.filter((u) => !u.isPremium)]
                                .slice(-5)
                                .reverse()
                                .map((user, idx) => (
                                  <div
                                    key={`newest-${user.id || idx}-${idx}`}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 gap-3"
                                  >
                                    <div className="text-left">
                                      <span className="text-xs font-bold text-white block">
                                        {user.name}
                                      </span>
                                      <span className="text-[9px] text-white/50 block">
                                        {user.email || "guest@example.com"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={async () => {
                                          await updateUserPremiumStatusInFirestore(
                                            user.id,
                                            true,
                                            30,
                                          );
                                          loadUsers();
                                          alert(
                                            "Upgraded client to VIP for 30 days!",
                                          );
                                        }}
                                        className="text-[9px] font-tech font-extrabold py-1.5 px-2.5 rounded-lg border border-gold-base/40 bg-gold-base/10 text-gold-base hover:bg-gold-base/20 transition-all cursor-pointer"
                                      >
                                        UPGRADE TO VIP
                                      </button>
                                      <button
                                        onClick={() => handleBanUser(user.id)}
                                        className="text-[9px] font-tech font-extrabold py-1.5 px-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                      >
                                        SUSPEND
                                      </button>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>

                        {/* TABLE 1: PREMIUM/VIP CLIENTS */}
                        <div className="luxury-glass p-5 rounded-xxl border-gold-base/10 bg-gold-base/[0.01] flex flex-col gap-4 text-left">
                          <div className="flex items-center justify-between border-b border-gold-base/15 pb-2">
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-gold-base animate-pulse" />
                              <h3 className="text-xs font-serif font-bold text-white tracking-widest uppercase">
                                VIP CLIENT DIRECTORY (
                                {users.filter((u) => u.isPremium).length})
                              </h3>
                            </div>
                            <span className="text-[8px] font-mono text-gold-base/60 uppercase">
                              LICENSE: PREMIUM/VIP
                            </span>
                          </div>

                          <div>
                            {users.filter((u) => u.isPremium).length === 0 ? (
                              <div className="text-center py-6 text-xs text-white/30 italic">
                                No Premium/VIP users found in the registry
                                database.
                              </div>
                            ) : (
                              <div className="overflow-x-auto w-full scrollbar-none">
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="border-b border-white/10 text-[8px] font-tech text-white/50 tracking-wider uppercase">
                                      <th className="pb-3 pl-2">CLIENT</th>
                                      <th className="pb-3">EMAIL / ID</th>
                                      <th className="pb-3">STATUS</th>
                                      <th className="pb-3 text-right pr-2">
                                        SYSTEM CONSOLE
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {users
                                      .filter((u) => u.isPremium)
                                      .map((user, idx) => (
                                        <tr
                                          key={`premium-user-${user.id || idx}-${idx}`}
                                          className="hover:bg-white/[0.02] transition-colors"
                                        >
                                          <td className="py-3 pl-2">
                                            <div className="flex items-center gap-2.5">
                                              <div className="relative shrink-0">
                                                <img
                                                  src={
                                                    user.avatarUrl ||
                                                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"
                                                  }
                                                  alt={user.name}
                                                  referrerPolicy="no-referrer"
                                                  className="w-7 h-7 rounded-full object-cover border border-gold-base/30"
                                                />
                                                {user.isBanned && (
                                                  <div
                                                    className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full p-0.5 border border-black"
                                                    title="Banned"
                                                  >
                                                    <Lock className="w-2 h-2 text-white" />
                                                  </div>
                                                )}
                                              </div>
                                              <span className="font-bold text-white block truncate max-w-[110px]">
                                                {user.name}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-3">
                                            <span className="text-[10px] text-white/50 block truncate max-w-[140px]">
                                              {user.email ||
                                                "guest@example.com"}
                                            </span>
                                            <span className="text-[7px] text-white/30 font-mono block tracking-wider uppercase">
                                              ID: {user.id}
                                            </span>
                                          </td>
                                          <td className="py-3">
                                            {user.isBanned ? (
                                              <span className="text-[7px] bg-red-500/15 text-red-400 font-extrabold border border-red-500/25 px-1 py-0.5 rounded uppercase tracking-wider animate-pulse inline-block">
                                                SUSPENDED
                                              </span>
                                            ) : (
                                              <span className="text-[7px] bg-gold-base/15 text-gold-light font-extrabold border border-gold-base/25 px-1 py-0.5 rounded uppercase tracking-wider inline-block">
                                                ACTIVE VIP
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-3 text-right pr-2">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <button
                                                onClick={() =>
                                                  toggleUserPremium(
                                                    user.id,
                                                    user.isPremium,
                                                  )
                                                }
                                                className="text-[8px] font-tech font-extrabold py-1 px-2 rounded-md border border-gold-base/40 bg-gold-base/10 text-gold-base hover:bg-gold-base/20 transition-all cursor-pointer"
                                                title="Revoke VIP License"
                                              >
                                                REVOKE
                                              </button>
                                              {user.isBanned ? (
                                                <button
                                                  onClick={() =>
                                                    handleUnbanUser(user.id)
                                                  }
                                                  className="text-[8px] font-tech font-extrabold py-1 px-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                                                >
                                                  UNBAN
                                                </button>
                                              ) : (
                                                <button
                                                  onClick={() =>
                                                    handleBanUser(user.id)
                                                  }
                                                  className="text-[8px] font-tech font-extrabold py-1 px-1.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                                >
                                                  BAN
                                                </button>
                                              )}
                                              <button
                                                onClick={() =>
                                                  handleDeleteUserClick(user)
                                                }
                                                className="p-1 border border-white/10 hover:bg-red-600 hover:border-red-600 hover:text-white text-white/40 rounded-md transition-all cursor-pointer"
                                                title="Delete User profile"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* TABLE 2: FREE/STANDARD USERS */}
                        <div className="luxury-glass p-5 rounded-xxl border-white/5 flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-white/60" />
                              <h3 className="text-xs font-serif font-bold text-white tracking-widest uppercase">
                                STANDARD CLIENT DIRECTORY (
                                {users.filter((u) => !u.isPremium).length})
                              </h3>
                            </div>
                            <span className="text-[8px] font-mono text-white/40 uppercase">
                              LICENSE: STANDARD/FREE
                            </span>
                          </div>

                          <div>
                            {users.filter((u) => !u.isPremium).length === 0 ? (
                              <div className="text-center py-6 text-xs text-white/30 italic">
                                No Standard/Free users found in the registry
                                database.
                              </div>
                            ) : (
                              <div className="overflow-x-auto w-full scrollbar-none">
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="border-b border-white/10 text-[8px] font-tech text-white/50 tracking-wider uppercase">
                                      <th className="pb-3 pl-2">CLIENT</th>
                                      <th className="pb-3">EMAIL / ID</th>
                                      <th className="pb-3">STATUS</th>
                                      <th className="pb-3 text-right pr-2">
                                        SYSTEM CONSOLE
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {users
                                      .filter((u) => !u.isPremium)
                                      .map((user, idx) => (
                                        <tr
                                          key={`standard-user-${user.id || idx}-${idx}`}
                                          className="hover:bg-white/[0.02] transition-colors"
                                        >
                                          <td className="py-3 pl-2">
                                            <div className="flex items-center gap-2.5">
                                              <div className="relative shrink-0">
                                                <img
                                                  src={
                                                    user.avatarUrl ||
                                                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80"
                                                  }
                                                  alt={user.name}
                                                  referrerPolicy="no-referrer"
                                                  className="w-7 h-7 rounded-full object-cover border border-white/10"
                                                />
                                                {user.isBanned && (
                                                  <div
                                                    className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full p-0.5 border border-black"
                                                    title="Banned"
                                                  >
                                                    <Lock className="w-2 h-2 text-white" />
                                                  </div>
                                                )}
                                              </div>
                                              <span className="font-bold text-white block truncate max-w-[110px]">
                                                {user.name}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-3">
                                            <span className="text-[10px] text-white/50 block truncate max-w-[140px]">
                                              {user.email ||
                                                "guest@example.com"}
                                            </span>
                                            <span className="text-[7px] text-white/30 font-mono block tracking-wider uppercase">
                                              ID: {user.id}
                                            </span>
                                          </td>
                                          <td className="py-3">
                                            {user.isBanned ? (
                                              <span className="text-[7px] bg-red-500/15 text-red-400 font-extrabold border border-red-500/25 px-1 py-0.5 rounded uppercase tracking-wider animate-pulse inline-block">
                                                SUSPENDED
                                              </span>
                                            ) : (
                                              <span className="text-[7px] bg-white/10 text-white/60 font-extrabold border border-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider inline-block">
                                                STANDARD
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-3 text-right pr-2">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <button
                                                onClick={() =>
                                                  toggleUserPremium(
                                                    user.id,
                                                    user.isPremium,
                                                  )
                                                }
                                                className="text-[8px] font-tech font-extrabold py-1 px-2.5 rounded-md border border-white/10 hover:border-gold-base/50 text-white/50 hover:text-gold-light transition-all cursor-pointer"
                                                title="Grant VIP License"
                                              >
                                                GRANT VIP
                                              </button>
                                              {user.isBanned ? (
                                                <button
                                                  onClick={() =>
                                                    handleUnbanUser(user.id)
                                                  }
                                                  className="text-[8px] font-tech font-extrabold py-1 px-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                                                >
                                                  UNBAN
                                                </button>
                                              ) : (
                                                <button
                                                  onClick={() =>
                                                    handleBanUser(user.id)
                                                  }
                                                  className="text-[8px] font-tech font-extrabold py-1 px-1.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                                >
                                                  BAN
                                                </button>
                                              )}
                                              <button
                                                onClick={() =>
                                                  handleDeleteUserClick(user)
                                                }
                                                className="p-1 border border-white/10 hover:bg-red-600 hover:border-red-600 hover:text-white text-white/40 rounded-md transition-all cursor-pointer"
                                                title="Delete User profile"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : usersSubTab === "upgrades" ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div>
                        <h3 className="text-xs font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase tracking-wider flex items-center gap-2">
                          <Crown className="w-5 h-5 text-gold-base" />
                          VIP MEMBERSHIP & INVOICE REQUESTS
                        </h3>
                        <p className="text-[10px] text-white/40">
                          Verify manual payment submissions and instantly
                          activate VIP status across Firestore.
                        </p>
                      </div>
                      <button
                        onClick={loadSubscribeRequests}
                        className="px-3 py-1.5 border border-white/10 hover:border-amber-500/30 rounded-lg bg-white/5 text-amber-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[9px] font-tech font-bold uppercase"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isSubscribeRequestsLoading ? "animate-spin text-amber-500" : ""}`}
                        />
                        REFRESH
                      </button>
                    </div>

                    {isSubscribeRequestsLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3 luxury-glass rounded-xxl border-white/5">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.2,
                            ease: "linear",
                          }}
                          className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full"
                        />
                        <span className="text-[9px] font-tech text-white/40 tracking-widest uppercase">
                          RETRIEVING SUBSCRIBE REQUESTS...
                        </span>
                      </div>
                    ) : subscribeRequests.length === 0 ? (
                      <div className="luxury-glass p-12 text-center rounded-xxl border-white/5 flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-white/30" />
                        <span className="text-xs font-serif font-bold text-white uppercase tracking-wider">
                          SUBSCRIBE INBOX EMPTY
                        </span>
                        <p className="text-[10px] text-white/40 max-w-xs mx-auto">
                          No active payment or subscription requests present
                          inside Firestore. User-submitted requests will
                          populate here.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 pb-8">
                        {subscribeRequests.map((req, idx) => (
                          <div
                            key={`sub-logs-${req.id || idx}-${idx}`}
                            className="luxury-glass p-4 rounded-xxl border border-white/5 hover:border-amber-500/15 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-serif font-bold text-white uppercase tracking-wide">
                                  {req.name || "Anonymous User"}
                                </span>
                                <span className="text-[9px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                  {req.email}
                                </span>
                                <span className="text-[8px] font-tech px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                                  {req.planName}
                                </span>
                                <span
                                  className={`text-[8px] font-tech px-2 py-0.5 rounded border font-extrabold uppercase ${
                                    req.status === "approved"
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                      : req.status === "rejected"
                                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                                        : "border-amber-500/30 bg-amber-500/10 text-amber-500 animate-pulse"
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </div>

                              <div className="flex flex-col gap-0.5 text-[9px] text-white/40">
                                <p>
                                  Requested by UID:{" "}
                                  <span className="text-white/60 font-mono text-[8px]">
                                    {req.userId}
                                  </span>
                                </p>
                                <p>
                                  Transaction Proof:{" "}
                                  <span className="text-gold-light font-mono font-semibold">
                                    {req.transactionId || "N/A"}
                                  </span>
                                </p>
                                <p>
                                  Submitted:{" "}
                                  <span className="text-white/60">
                                    {new Date(req.createdAt).toLocaleString()}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center font-tech">
                              {req.status === "pending" && (
                                <>
                                  <button
                                    onClick={async () => {
                                      let expireDays = 30;
                                      try {
                                        const plans =
                                          await getPlansFromFirestore();
                                        const reqPlan = plans.find(
                                          (p) => p.id === req.planId,
                                        );
                                        if (
                                          reqPlan &&
                                          reqPlan.expireDaysCount
                                        ) {
                                          expireDays = reqPlan.expireDaysCount;
                                        }
                                      } catch (err) {
                                        console.error(
                                          "Could not find plan duration:",
                                          err,
                                        );
                                      }
                                      await updateSubscribeRequestStatusInFirestore(
                                        req.id,
                                        req.userId,
                                        "approved",
                                      );
                                      await updateUserPremiumStatusInFirestore(
                                        req.userId,
                                        true,
                                        expireDays,
                                      );
                                      loadSubscribeRequests();
                                      loadUsers();
                                    }}
                                    className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black rounded-lg text-emerald-400 text-[9px] font-tech font-bold transition-all cursor-pointer"
                                  >
                                    ACTIVATE VIP
                                  </button>
                                  <button
                                    onClick={async () => {
                                      await updateSubscribeRequestStatusInFirestore(
                                        req.id,
                                        req.userId,
                                        "rejected",
                                      );
                                      loadSubscribeRequests();
                                    }}
                                    className="px-3 py-1.5 bg-red-500/15 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg text-red-400 text-[9px] font-tech font-bold transition-all cursor-pointer"
                                  >
                                    DECLINE
                                  </button>
                                </>
                              )}
                              <button
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      "Delete this transaction entry?",
                                    )
                                  ) {
                                    await deleteSubscribeRequestFromFirestore(
                                      req.id,
                                    );
                                    loadSubscribeRequests();
                                  }
                                }}
                                className="p-1.5 border border-white/10 hover:bg-red-500 hover:border-red-500 hover:text-white text-white/40 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : usersSubTab === "plans" ? (
                  /* PLANS SUB-TAB */
                  <div className="flex flex-col gap-6 pb-12 text-left">
                    {/* Header Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="luxury-glass p-4 rounded-xl text-center">
                        <span className="text-[9px] font-tech text-white/40 block tracking-wider uppercase">
                          ACTIVE SYSTEM TIER PLANS
                        </span>
                        <span className="text-xl font-serif font-bold text-white block mt-1">
                          {adminPlans.length}
                        </span>
                      </div>
                      <div className="luxury-glass p-4 rounded-xl text-center border-amber-500/10">
                        <span className="text-[9px] font-tech text-amber-500 block tracking-wider uppercase">
                          SECURE PREMIUM INTEGRATION
                        </span>
                        <span className="text-sm font-tech font-bold text-gold-base block mt-1 uppercase">
                          FIRESTORE BACKED
                        </span>
                      </div>
                    </div>

                    {/* Grid layout: Left is add plan form, Right is plan cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Create Subscribe Plan Form */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newPlanName.trim()) return;
                          setIsAddingPlan(true);
                          try {
                            const benefits = newPlanBenefitsInput
                              .split(",")
                              .map((b) => b.trim())
                              .filter(Boolean);
                            const closedBenefits = newPlanClosedBenefitsInput
                              .split(",")
                              .map((b) => b.trim())
                              .filter(Boolean);

                            await addSubscribePlanToFirestore({
                              id:
                                newPlanName
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]/g, "_") +
                                "_" +
                                Date.now(),
                              name: newPlanName,
                              period: newPlanPeriod,
                              price: newPlanPrice,
                              benefits,
                              closedBenefits,
                              expireDaysCount: Number(newPlanExpireDays),
                              color: newPlanColor,
                              tag: newPlanTag,
                              popular: false,
                            });

                            // Reset form
                            setNewPlanName("");
                            setNewPlanPeriod("1 Month");
                            setNewPlanPrice("$9.99");
                            setNewPlanTag("VIP TIER");
                            setNewPlanBenefitsInput("");
                            setNewPlanClosedBenefitsInput("");
                            setNewPlanExpireDays(30);

                            // Reload plans
                            await loadAdminPlans();
                            alert(
                              "Subscription Plan created and published successfully!",
                            );
                          } catch (err) {
                            console.error("Could not add plan:", err);
                          } finally {
                            setIsAddingPlan(false);
                          }
                        }}
                        className="lg:col-span-2 luxury-glass p-6 rounded-xxl border border-white/5 flex flex-col gap-4 text-left"
                      >
                        <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-1">
                          <Crown className="w-5 h-5 text-gold-base animate-pulse" />
                          <div>
                            <h3 className="text-xs font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase tracking-wider">
                              CREATE SUBSCRIBE PLAN
                            </h3>
                            <p className="text-[9px] text-white/40 font-tech">
                              Build customized billing tiers & limit client
                              entitlements.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3.5">
                          {/* Name / Title */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                              Plan Title / Name
                            </label>
                            <input
                              type="text"
                              required
                              value={newPlanName}
                              onChange={(e) => setNewPlanName(e.target.value)}
                              placeholder="e.g. ULTIMATE ROYAL VIP"
                              className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                            />
                          </div>

                          {/* Price & Period/Duration */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                                Price Tag
                              </label>
                              <input
                                type="text"
                                required
                                value={newPlanPrice}
                                onChange={(e) =>
                                  setNewPlanPrice(e.target.value)
                                }
                                placeholder="e.g. $14.99"
                                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                                Period / Duration Title
                              </label>
                              <input
                                type="text"
                                required
                                value={newPlanPeriod}
                                onChange={(e) =>
                                  setNewPlanPeriod(e.target.value)
                                }
                                placeholder="e.g. 1 Month"
                                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                              />
                            </div>
                          </div>

                          {/* Expire Days Count */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                                Active Expiry (Days)
                              </label>
                              <select
                                value={newPlanExpireDays}
                                onChange={(e) =>
                                  setNewPlanExpireDays(Number(e.target.value))
                                }
                                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                              >
                                {Array.from(
                                  { length: 32 },
                                  (_, i) => i + 1,
                                ).map((day) => (
                                  <option
                                    key={day}
                                    value={day}
                                    className="bg-neutral-900 text-white"
                                  >
                                    {day} Day{day > 1 ? "s" : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                                Plan Badge / Tag
                              </label>
                              <input
                                type="text"
                                value={newPlanTag}
                                onChange={(e) => setNewPlanTag(e.target.value)}
                                placeholder="e.g. POPULAR VIP"
                                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                              />
                            </div>
                          </div>

                          {/* Theme Preset Selection */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                              Theme Accent Design
                            </label>
                            <select
                              value={newPlanColor}
                              onChange={(e) => setNewPlanColor(e.target.value)}
                              className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white/80 focus:outline-none focus:border-gold-base cursor-pointer"
                            >
                              <option value="border-white/10 bg-white/5">
                                Classic Slate (Standard)
                              </option>
                              <option value="border-gold-base/30 bg-gold-base/5 ring-1 ring-gold-base/20">
                                Rich Gold (Premium)
                              </option>
                              <option value="border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/35">
                                Cosmic Amber (Ultra VIP)
                              </option>
                              <option value="border-purple-accent/30 bg-purple-accent/5 shadow-[0_0_20px_rgba(88,28,135,0.2)]">
                                Royal Purple (Legacy VIP)
                              </option>
                            </select>
                          </div>

                          {/* Benefits Checked Features (✅) */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                              ✅ Checked Features{" "}
                              <span className="text-emerald-400 font-extrabold">
                                (Comma Separated)
                              </span>
                            </label>
                            <textarea
                              rows={2}
                              required
                              value={newPlanBenefitsInput}
                              onChange={(e) =>
                                setNewPlanBenefitsInput(e.target.value)
                              }
                              placeholder="Full 4K Ultra HDR, Dolby Atmos Audio, Unlimited Speed"
                              className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                            />
                          </div>

                          {/* Benefits Closed Features (❌) */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                              ❌ Closed Features{" "}
                              <span className="text-red-400 font-extrabold">
                                (Comma Separated)
                              </span>
                            </label>
                            <textarea
                              rows={2}
                              value={newPlanClosedBenefitsInput}
                              onChange={(e) =>
                                setNewPlanClosedBenefitsInput(e.target.value)
                              }
                              placeholder="No Early bird screenings, No Dedicated VIP Assistance"
                              className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isAddingPlan}
                            className="w-full mt-2 py-3 bg-gold-base hover:bg-gold-light text-black font-tech font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer shadow-[0_4px_15px_rgba(212,175,55,0.25)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)]"
                          >
                            {isAddingPlan
                              ? "PUBLISHING PLAN..."
                              : "PUBLISH BILLING PLAN"}
                          </button>
                        </div>
                      </form>

                      {/* Active Plans List Deck */}
                      <div className="lg:col-span-3 flex flex-col gap-4 text-left">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <span className="text-xs font-serif font-black text-white uppercase tracking-wider">
                            ACTIVE PUBLISHED PLANS ({adminPlans.length})
                          </span>
                          <button
                            type="button"
                            onClick={loadAdminPlans}
                            className="flex items-center gap-1.5 text-[9px] font-tech font-bold text-gold-base hover:text-white cursor-pointer"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${isAdminPlansLoading ? "animate-spin" : ""}`}
                            />
                            SYNC DECK
                          </button>
                        </div>

                        {isAdminPlansLoading ? (
                          <div className="flex flex-col items-center justify-center py-16 gap-2 luxury-glass rounded-xxl border-white/5">
                            <div className="w-8 h-8 border-2 border-gold-base border-t-transparent rounded-full animate-spin" />
                            <span className="text-[9px] font-tech text-white/40 uppercase tracking-widest">
                              SYNCING PLANS PLATFORM...
                            </span>
                          </div>
                        ) : adminPlans.length === 0 ? (
                          <div className="text-center py-12 text-xs text-white/40 italic luxury-glass rounded-xxl border-white/5">
                            No custom published subscription plans found.
                            Preloaded default templates are displayed in the
                            app.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {adminPlans.map((plan, planIdx) => (
                              <div
                                key={`admin-plan-${plan.id || planIdx}-${planIdx}`}
                                className={`p-5 rounded-xxl border flex flex-col justify-between relative bg-black/40 ${plan.color}`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[8px] font-tech font-bold px-2 py-0.5 rounded bg-white/10 text-white/80 uppercase">
                                      {plan.tag}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingPlan(plan);
                                        }}
                                        className="p-1 border border-white/10 hover:border-gold-base hover:bg-gold-base/5 text-white/40 hover:text-gold-light rounded-lg transition-all cursor-pointer"
                                        title="Edit Plan"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (
                                            window.confirm(
                                              `Are you sure you want to delete the published plan "${plan.name}"?`,
                                            )
                                          ) {
                                            await deleteSubscribePlanFromFirestore(
                                              plan.id,
                                            );
                                            await loadAdminPlans();
                                            alert("Plan deleted successfully!");
                                          }
                                        }}
                                        className="p-1 border border-white/10 hover:bg-red-500 hover:border-red-500 text-white/40 hover:text-white rounded-lg transition-all cursor-pointer animate-none"
                                        title="Delete Plan"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <h4 className="text-sm font-serif font-black text-white uppercase tracking-wide">
                                    {plan.name}
                                  </h4>
                                  <p className="text-[8px] font-tech text-white/40 uppercase tracking-widest mt-0.5">
                                    {plan.period} • {plan.expireDaysCount || 30}{" "}
                                    Days Active
                                  </p>

                                  <div className="mt-2.5 text-base font-serif font-black text-gold-base">
                                    {plan.price}
                                  </div>

                                  <div className="mt-3.5 border-t border-white/5 pt-3.5 flex flex-col gap-2">
                                    <span className="text-[8px] font-tech text-white/40 block tracking-wider uppercase">
                                      Entitlements:
                                    </span>
                                    <ul className="flex flex-col gap-1.5 text-[9px] text-white/70">
                                      {plan.benefits.map((b, idx) => (
                                        <li
                                          key={`admin-benefit-${plan.id || planIdx}-${idx}`}
                                          className="flex items-center gap-1.5 min-w-0"
                                        >
                                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                          <span className="truncate">{b}</span>
                                        </li>
                                      ))}
                                      {plan.closedBenefits?.map((cb, idx) => (
                                        <li
                                          key={`admin-closed-benefit-${plan.id || planIdx}-${idx}`}
                                          className="flex items-center gap-1.5 min-w-0 text-white/40 line-through decoration-white/10"
                                        >
                                          <X className="w-3 h-3 text-red-400 shrink-0" />
                                          <span className="truncate">{cb}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : usersSubTab === "redeem" ? (
                  /* REDEEM CODES SUB-TAB */
                  <div className="flex flex-col gap-6 pb-12 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="luxury-glass p-4 rounded-xl text-center">
                        <span className="text-[9px] font-tech text-white/40 block tracking-wider uppercase">
                          ACTIVE CODES IN FIRESTORE
                        </span>
                        <span className="text-xl font-serif font-bold text-white block mt-1">
                          {
                            redeemCodes.filter((c) => c.status === "active")
                              .length
                          }
                        </span>
                      </div>
                      <div className="luxury-glass p-4 rounded-xl text-center">
                        <span className="text-[9px] font-tech text-white/40 block tracking-wider uppercase">
                          TOTAL USED CODES
                        </span>
                        <span className="text-xl font-serif font-bold text-white block mt-1">
                          {
                            redeemCodes.filter((c) => c.status === "used")
                              .length
                          }
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      {/* Generate Form */}
                      <form
                        onSubmit={handleGenerateRedeemCode}
                        className="lg:col-span-2 luxury-glass p-6 rounded-xxl border border-white/5 flex flex-col gap-4 text-left"
                      >
                        <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-1">
                          <Gift className="w-5 h-5 text-gold-base animate-pulse" />
                          <div>
                            <h3 className="text-xs font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase tracking-wider">
                              GENERATE REDEEM CODES
                            </h3>
                            <p className="text-[9px] text-white/40 font-tech">
                              Create promotional VIP codes or single media
                              unlocks.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3.5">
                          {/* Code text */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                              Custom Code (Optional)
                            </label>
                            <input
                              type="text"
                              value={newCodeText}
                              onChange={(e) =>
                                setNewCodeText(e.target.value.toUpperCase())
                              }
                              placeholder="e.g. ULTIMATE50 (Leave blank for random)"
                              className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base animate-none"
                            />
                          </div>

                          {/* Code Type */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                              Reward Entity Type
                            </label>
                            <select
                              value={newCodeType}
                              onChange={(e) =>
                                setNewCodeType(e.target.value as any)
                              }
                              className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                            >
                              <option value="premium">
                                Premium VIP Membership
                              </option>
                              <option value="movie">Unlock Single Movie</option>
                              <option value="series">
                                Unlock Single Series / Serial
                              </option>
                            </select>
                          </div>

                          {/* Premium Days Option */}
                          {newCodeType === "premium" && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                                Membership Expiry Days
                              </label>
                              <select
                                value={newCodePremiumDays}
                                onChange={(e) =>
                                  setNewCodePremiumDays(Number(e.target.value))
                                }
                                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                              >
                                {[
                                  1, 2, 3, 4, 5, 6, 7, 10, 14, 30, 90, 180, 365,
                                ].map((d) => (
                                  <option
                                    key={d}
                                    value={d}
                                    className="bg-neutral-900 text-white"
                                  >
                                    {d} Day{d > 1 ? "s" : ""} VIP
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Target Media selection */}
                          {(newCodeType === "movie" ||
                            newCodeType === "series") && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                                Select Target{" "}
                                {newCodeType === "movie" ? "Movie" : "Series"}
                              </label>
                              <select
                                required
                                value={newCodeTargetId}
                                onChange={(e) =>
                                  setNewCodeTargetId(e.target.value)
                                }
                                className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                              >
                                <option value="">-- Choose Item --</option>
                                {movies
                                  .filter((m) => m.type === newCodeType)
                                  .map((m, idx) => (
                                    <option
                                      key={`redeem-movie-option-${m.id}-${idx}`}
                                      value={m.id}
                                      className="bg-neutral-900 text-white"
                                    >
                                      {m.title}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isGeneratingCode}
                            className="w-full mt-2 py-3 bg-gold-base hover:bg-gold-light text-black font-tech font-extrabold text-[10px] uppercase rounded-xl transition-all cursor-pointer shadow-[0_4px_15px_rgba(212,175,55,0.25)]"
                          >
                            {isGeneratingCode
                              ? "GENERATING..."
                              : "PUBLISH REDEEM CODE"}
                          </button>
                        </div>
                      </form>

                      {/* Redeem Codes List */}
                      <div className="lg:col-span-3 flex flex-col gap-4 text-left">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <span className="text-xs font-serif font-black text-white uppercase tracking-wider">
                            PUBLISHED CODES DECK ({redeemCodes.length})
                          </span>
                          <button
                            type="button"
                            onClick={loadRedeemCodes}
                            className="flex items-center gap-1.5 text-[9px] font-tech font-bold text-gold-base hover:text-white cursor-pointer"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${isRedeemCodesLoading ? "animate-spin" : ""}`}
                            />
                            SYNC CODES
                          </button>
                        </div>

                        {isRedeemCodesLoading ? (
                          <div className="flex flex-col items-center justify-center py-16 gap-2 luxury-glass rounded-xxl border-white/5">
                            <div className="w-8 h-8 border-2 border-gold-base border-t-transparent rounded-full animate-spin" />
                            <span className="text-[9px] font-tech text-white/40 uppercase tracking-widest">
                              SYNCING CODE PLATFORM...
                            </span>
                          </div>
                        ) : redeemCodes.length === 0 ? (
                          <div className="text-center py-12 text-xs text-white/40 italic luxury-glass rounded-xxl border-white/5">
                            No active or used redeem codes exist on Firestore.
                            Generate one now!
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto scrollbar-none pr-1">
                            {redeemCodes.map((code, idx) => (
                              <div
                                key={`redeem-code-${code.id || idx}-${idx}`}
                                className={`p-4 rounded-xl border flex items-center justify-between bg-black/40 ${
                                  code.status === "used"
                                    ? "border-white/5 opacity-50"
                                    : "border-amber-500/20"
                                }`}
                              >
                                <div className="min-w-0 flex-1 pr-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-xs text-white bg-white/5 px-2 py-1 rounded tracking-wider border border-white/10">
                                      {code.code}
                                    </span>
                                    <span
                                      className={`text-[8px] font-tech font-bold px-1.5 py-0.5 rounded uppercase ${
                                        code.status === "active"
                                          ? "bg-emerald-500/15 text-emerald-400"
                                          : "bg-white/10 text-white/40"
                                      }`}
                                    >
                                      {code.status}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-white/60 mt-1.5 font-tech">
                                    REWARD:{" "}
                                    <span className="text-gold-base uppercase font-bold">
                                      {code.type === "premium"
                                        ? `${code.premiumDays} Days VIP Premium`
                                        : `Unlock "${code.targetTitle}"`}
                                    </span>
                                  </div>
                                  {code.status === "used" && (
                                    <div className="text-[9px] text-white/40 mt-1 italic">
                                      Redeemed by{" "}
                                      {code.usedByEmail || code.usedBy} on{" "}
                                      {code.usedAt
                                        ? new Date(
                                            code.usedAt,
                                          ).toLocaleDateString()
                                        : "N/A"}
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (
                                      window.confirm(
                                        `Are you sure you want to delete redeem code "${code.code}"?`,
                                      )
                                    ) {
                                      await deleteRedeemCodeFromFirestore(
                                        code.id,
                                      );
                                      await loadRedeemCodes();
                                      alert("Code deleted successfully!");
                                    }
                                  }}
                                  className="p-1.5 border border-white/10 hover:bg-red-500 hover:border-red-500 text-white/40 hover:text-white rounded-lg transition-all cursor-pointer"
                                  title="Delete Code"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : usersSubTab === "config" ? (
                  /* SYSTEM ENGINE CONFIG SUB-TAB */
                  <div className="flex flex-col gap-6 pb-12 text-left">
                    <div className="luxury-glass p-6 rounded-xxl border border-white/5 flex flex-col gap-6">
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-2.5">
                          <Gauge className="w-5 h-5 text-rose-500 animate-pulse" />
                          <div>
                            <h3 className="text-xs font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 uppercase tracking-wider">
                              SYSTEM PARAMETERS TUNER
                            </h3>
                            <p className="text-[9px] text-white/40 font-tech">
                              Adjust live streaming servers, alert banners, and
                              core configurations.
                            </p>
                          </div>
                        </div>
                        {systemParams?.updatedAt && (
                          <span className="text-[8px] font-mono text-gold-base/50 bg-gold-base/5 border border-gold-base/10 px-2.5 py-1 rounded">
                            LAST RECALIBRATION:{" "}
                            {new Date(
                              systemParams.updatedAt,
                            ).toLocaleTimeString()}
                          </span>
                        )}
                      </div>

                      {isParamsLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[9px] font-tech tracking-widest text-white/40 uppercase">
                            SYNCING CONTROLS...
                          </span>
                        </div>
                      ) : systemParams ? (
                        <div className="flex flex-col gap-6">
                          {/* Live parameters grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Section: Maintenance & Latency */}
                            <div className="flex flex-col gap-5">
                              {/* Maintenance Mode Toggle */}
                              <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 hover:border-rose-500/20 transition-all">
                                <div className="flex flex-col gap-1 pr-4">
                                  <span className="text-xs font-serif font-bold text-white tracking-wide uppercase">
                                    MAINTENANCE BYPASS
                                  </span>
                                  <p className="text-[9px] text-white/40 leading-normal">
                                    Forces all non-admin client tunnels to
                                    display a generic offline/under construction
                                    screen.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSystemParams({
                                      ...systemParams,
                                      maintenanceMode:
                                        !systemParams.maintenanceMode,
                                    });
                                  }}
                                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                                    systemParams.maintenanceMode
                                      ? "bg-rose-600"
                                      : "bg-neutral-800"
                                  }`}
                                >
                                  <span
                                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                                      systemParams.maintenanceMode
                                        ? "translate-x-6"
                                        : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>

                              {/* Premium Lock System Toggle */}
                              <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 hover:border-amber-500/20 transition-all">
                                <div className="flex flex-col gap-1 pr-4">
                                  <span className="text-xs font-serif font-bold text-white tracking-wide uppercase">
                                    PREMIUM PLAYBACK LOCK
                                  </span>
                                  <p className="text-[9px] text-white/40 leading-normal">
                                    Enforces Premium check for all Movies,
                                    Series, and Episodes. When ON, non-premium
                                    play clicks redirect to the Premium Page.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSystemParams({
                                      ...systemParams,
                                      premiumLock: !systemParams.premiumLock,
                                    });
                                  }}
                                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                                    systemParams.premiumLock
                                      ? "bg-amber-500"
                                      : "bg-neutral-800"
                                  }`}
                                >
                                  <span
                                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                                      systemParams.premiumLock
                                        ? "translate-x-6"
                                        : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>

                              {/* Live TV Premium Lock Toggle */}
                              <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 hover:border-amber-500/20 transition-all">
                                <div className="flex flex-col gap-1 pr-4">
                                  <span className="text-xs font-serif font-bold text-white tracking-wide uppercase">
                                    LIVE TV PREMIUM LOCK
                                  </span>
                                  <p className="text-[9px] text-white/40 leading-normal">
                                    Enforces Premium check for LIVE TV Channels.
                                    When ON, normal users cannot play premium
                                    live feeds and will be prompted to upgrade.
                                    When OFF, channels are FREE for everyone to
                                    play.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSystemParams({
                                      ...systemParams,
                                      liveTvPremiumLock:
                                        !systemParams.liveTvPremiumLock,
                                    });
                                  }}
                                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                                    systemParams.liveTvPremiumLock
                                      ? "bg-amber-500"
                                      : "bg-neutral-800"
                                  }`}
                                >
                                  <span
                                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                                      systemParams.liveTvPremiumLock
                                        ? "translate-x-6"
                                        : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>

                              {/* Trending Section Sort Order Toggle */}
                              <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 hover:border-amber-500/20 transition-all animate-fade-in">
                                <div className="flex flex-col gap-1 pr-4">
                                  <span className="text-xs font-serif font-bold text-white tracking-wide uppercase">
                                    TRENDING SECTION SORT ORDER
                                  </span>
                                  <p className="text-[9px] text-white/40 leading-normal">
                                    Choose how the 'Trending Now' list is ordered on the Home Screen.
                                    You can sort by Popularity (Rating) or Release Date (Year).
                                  </p>
                                </div>
                                <div className="flex items-center bg-neutral-900 border border-white/10 rounded-lg p-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSystemParams({
                                        ...systemParams,
                                        trendingSortOrder: 'popularity'
                                      });
                                    }}
                                    className={`px-3 py-1.5 text-[8px] font-tech font-bold uppercase rounded-md transition-all ${
                                      (systemParams?.trendingSortOrder || 'popularity') === 'popularity'
                                        ? "bg-amber-500 text-black shadow-md"
                                        : "text-white/60 hover:text-white hover:bg-white/5"
                                    }`}
                                  >
                                    Popularity
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSystemParams({
                                        ...systemParams,
                                        trendingSortOrder: 'releaseDate'
                                      });
                                    }}
                                    className={`px-3 py-1.5 text-[8px] font-tech font-bold uppercase rounded-md transition-all ${
                                      systemParams?.trendingSortOrder === 'releaseDate'
                                        ? "bg-amber-500 text-black shadow-md"
                                        : "text-white/60 hover:text-white hover:bg-white/5"
                                    }`}
                                  >
                                    Release Date
                                  </button>
                                </div>
                              </div>

                              {/* Latency Slider */}
                              <div className="flex flex-col gap-3 p-4 rounded-xl bg-black/40 border border-white/5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-serif font-bold text-white tracking-wide uppercase">
                                    SERVER RESPONSE LATENCY
                                  </span>
                                  <span className="text-xs font-mono font-bold text-gold-base">
                                    {systemParams.serverSpeedLimit}ms
                                  </span>
                                </div>
                                <p className="text-[9px] text-white/40 leading-normal">
                                  Artificially limits database request speeds to
                                  model throttle profiles under heavy concurrent
                                  load.
                                </p>
                                <input
                                  type="range"
                                  min="50"
                                  max="2000"
                                  step="50"
                                  value={systemParams.serverSpeedLimit}
                                  onChange={(e) => {
                                    setSystemParams({
                                      ...systemParams,
                                      serverSpeedLimit: Number(e.target.value),
                                    });
                                  }}
                                  className="w-full accent-rose-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between text-[8px] font-tech text-white/30 tracking-wider">
                                  <span>LIGHTNING (50ms)</span>
                                  <span>HEAVY THROTTLE (2000ms)</span>
                                </div>
                              </div>
                            </div>

                            {/* Right Section: Global Notice & Version control */}
                            <div className="flex flex-col gap-5">
                              {/* Minimum App Version */}
                              <div className="flex flex-col gap-2 p-4 rounded-xl bg-black/40 border border-white/5">
                                <span className="text-xs font-serif font-bold text-white tracking-wide uppercase">
                                  MINIMUM MANDATORY CLIENT VERSION
                                </span>
                                <p className="text-[9px] text-white/40 leading-normal mb-1">
                                  Devices running versions older than this
                                  threshold will be prompted to pull latest
                                  builds.
                                </p>
                                <input
                                  type="text"
                                  value={systemParams.minAppVersion}
                                  onChange={(e) => {
                                    setSystemParams({
                                      ...systemParams,
                                      minAppVersion: e.target.value,
                                    });
                                  }}
                                  className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                                />
                              </div>

                              {/* Global Notice Area */}
                              <div className="flex flex-col gap-2 p-4 rounded-xl bg-black/40 border border-white/5">
                                <span className="text-xs font-serif font-bold text-white tracking-wide uppercase">
                                  GLOBAL TICKER ALERT BANNER
                                </span>
                                <p className="text-[9px] text-white/40 leading-normal mb-1">
                                  This text will stream continuously in a
                                  neon-gold warning header at the top of all
                                  subscriber accounts.
                                </p>
                                <textarea
                                  value={systemParams.globalNotice}
                                  onChange={(e) => {
                                    setSystemParams({
                                      ...systemParams,
                                      globalNotice: e.target.value,
                                    });
                                  }}
                                  rows={2}
                                  maxLength={160}
                                  className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 leading-normal"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2 border-t border-white/5 mt-2">
                            <button
                              type="button"
                              disabled={isSavingParams}
                              onClick={async () => {
                                setIsSavingParams(true);
                                try {
                                  await saveSystemParamsToFirestore(
                                    systemParams,
                                  );
                                  alert(
                                    "Live Server parameters updated and transmitted successfully!",
                                  );
                                } catch (err) {
                                  console.error(err);
                                  alert("Failed to update server parameters.");
                                } finally {
                                  setIsSavingParams(false);
                                }
                              }}
                              className="px-6 py-3 rounded-xl font-tech font-extrabold text-[10px] tracking-widest uppercase bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_25px_rgba(220,38,38,0.4)]"
                            >
                              {isSavingParams
                                ? "RECONFIGURING..."
                                : "RECALIBRATE CORE STACK"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-xs text-white/40 font-tech">
                          CRITICAL: CONTROL BRIDGE FAILED TO INTEGRATE.
                        </div>
                      )}
                    </div>

                    {/* PAYMENT GATEWAY CONFIGURATOR CARD */}
                    <div className="luxury-glass p-6 rounded-xxl border border-white/5 flex flex-col gap-6 mt-6">
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex items-center gap-2.5">
                          <Crown className="w-5 h-5 text-amber-500 animate-pulse" />
                          <div>
                            <h3 className="text-xs font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 uppercase tracking-wider">
                              PAYMENT GATEWAY CONFIGURATOR
                            </h3>
                            <p className="text-[9px] text-white/40 font-tech">
                              Configure checkout modes, custom UPI addresses,
                              and active payment QR Codes.
                            </p>
                          </div>
                        </div>
                      </div>

                      {paymentSettings ? (
                        <div className="flex flex-col gap-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Section: Payment Type & UPI ID */}
                            <div className="flex flex-col gap-5">
                              {/* Payment Mode Selection */}
                              <div className="flex flex-col gap-2 p-4 rounded-xl bg-black/40 border border-white/5">
                                <span className="text-xs font-serif font-bold text-white tracking-wide uppercase">
                                  PAYMENT MODE
                                </span>
                                <p className="text-[9px] text-white/40 leading-normal mb-3">
                                  <strong>Request Payment:</strong> Admin
                                  manually approves subscriber requests.
                                  <br />
                                  <strong>Auto Payment:</strong> Opens UPI Apps
                                  with instant transaction validation, dynamic
                                  countdown, and automatic feature unlock.
                                </p>
                                <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPaymentSettings({
                                        ...paymentSettings,
                                        paymentType: "request",
                                      })
                                    }
                                    className={`py-2 rounded-lg text-[10px] font-mono tracking-widest uppercase transition-all font-black cursor-pointer ${
                                      paymentSettings.paymentType === "request"
                                        ? "bg-amber-500 text-black shadow-md font-extrabold"
                                        : "text-white/60 hover:text-white hover:bg-white/5"
                                    }`}
                                  >
                                    REQUEST MODE
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPaymentSettings({
                                        ...paymentSettings,
                                        paymentType: "auto",
                                      })
                                    }
                                    className={`py-2 rounded-lg text-[10px] font-mono tracking-widest uppercase transition-all font-black cursor-pointer ${
                                      paymentSettings.paymentType === "auto"
                                        ? "bg-emerald-500 text-black shadow-md font-extrabold"
                                        : "text-white/60 hover:text-white hover:bg-white/5"
                                    }`}
                                  >
                                    AUTO MODE
                                  </button>
                                </div>
                              </div>

                              {/* UPI ID Config */}
                              <div className="flex flex-col gap-2 p-4 rounded-xl bg-black/40 border border-white/5">
                                <span className="text-xs font-serif font-bold text-white tracking-wide uppercase">
                                  UPI ADDRESS (UPI ID)
                                </span>
                                <p className="text-[9px] text-white/40 leading-normal mb-1">
                                  Define the master merchant UPI address for
                                  deep links and QR codes.
                                </p>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={paymentSettings.upiId}
                                    onChange={(e) =>
                                      setPaymentSettings({
                                        ...paymentSettings,
                                        upiId: e.target.value,
                                      })
                                    }
                                    placeholder="e.g. merchant@upi"
                                    className="flex-1 bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const dynamicQR = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(paymentSettings.upiId)}%26pn=Elite%20Plex%26cu=INR`;
                                      setPaymentSettings({
                                        ...paymentSettings,
                                        qrCodeUrl: dynamicQR,
                                      });
                                      alert(
                                        "QR Code URL automatically updated and generated from current UPI address!",
                                      );
                                    }}
                                    className="px-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[9px] font-mono font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                                  >
                                    GENERATE QR
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Right Section: QR Code Configuration & Live Preview */}
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-2 p-4 rounded-xl bg-black/40 border border-white/5">
                                <span className="text-xs font-serif font-bold text-white tracking-wide uppercase">
                                  QR CODE URL / IMAGE SOURCE
                                </span>
                                <p className="text-[9px] text-white/40 leading-normal mb-1">
                                  Configure custom QR Code image URLs or utilize
                                  auto-generated endpoints.
                                </p>
                                <input
                                  type="text"
                                  value={paymentSettings.qrCodeUrl}
                                  onChange={(e) =>
                                    setPaymentSettings({
                                      ...paymentSettings,
                                      qrCodeUrl: e.target.value,
                                    })
                                  }
                                  placeholder="QR Code Image URL"
                                  className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                                />
                              </div>

                              <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
                                <div className="w-24 h-24 bg-white p-2 rounded-lg flex items-center justify-center shrink-0 border border-white/10 shadow-lg">
                                  {paymentSettings.qrCodeUrl ? (
                                    <img
                                      src={paymentSettings.qrCodeUrl}
                                      alt="QR Code Preview"
                                      className="w-full h-full object-contain"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ERROR_INVALID_QR";
                                      }}
                                    />
                                  ) : (
                                    <span className="text-[8px] text-black font-mono font-bold text-center">
                                      NO QR
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] font-serif font-black text-white block mb-1 uppercase tracking-wider">
                                    LIVE QR GATEWAY PREVIEW
                                  </span>
                                  <p className="text-[8px] text-white/50 leading-relaxed font-mono break-all max-w-full">
                                    {paymentSettings.qrCodeUrl ||
                                      "None Configured"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2 border-t border-white/5 mt-2">
                            <button
                              type="button"
                              disabled={isSavingPaymentSettings}
                              onClick={async () => {
                                setIsSavingPaymentSettings(true);
                                try {
                                  await savePaymentSettingsToFirestore(
                                    paymentSettings,
                                  );
                                  alert(
                                    "Payment Gateway parameters saved and active instantly across all subscriber apps!",
                                  );
                                } catch (err) {
                                  console.error(err);
                                  alert(
                                    "Failed to save payment gateway parameters.",
                                  );
                                } finally {
                                  setIsSavingPaymentSettings(false);
                                }
                              }}
                              className="px-6 py-3 rounded-xl font-tech font-extrabold text-[10px] tracking-widest uppercase bg-amber-500 hover:bg-amber-600 text-black cursor-pointer active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]"
                            >
                              {isSavingPaymentSettings
                                ? "SAVING GATEWAY..."
                                : "UPDATE PAYMENT CHANNELS"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-xs text-white/40 font-tech">
                          CRITICAL: PAYMENT BRIDGE INITIALIZING...
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* EMERGENCY BROADCAST SUB-TAB */
                  <form
                    onSubmit={handleSendNotif}
                    className="luxury-glass p-6 rounded-xxl border-white/5 flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-1">
                      <Smartphone className="w-5 h-5 text-gold-base animate-pulse" />
                      <div>
                        <h3 className="text-sm font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase tracking-wider">
                          DISPATCH GLOBAL BROADCAST SIGNALS
                        </h3>
                        <p className="text-[10px] text-white/40 font-tech">
                          Send realtime pushes directly to all online subscriber
                          tunnels.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* Notif Title */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                          Signal Header
                        </label>
                        <input
                          type="text"
                          required
                          value={notifTitle}
                          onChange={(e) => setNotifTitle(e.target.value)}
                          placeholder="e.g. 🔥 BLOCKBUSTER PREMIERE IS ALIVE!"
                          className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                        />
                      </div>

                      {/* Notif Body */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                          Signal Message Body
                        </label>
                        <textarea
                          required
                          value={notifBody}
                          onChange={(e) => setNotifBody(e.target.value)}
                          placeholder="Dune: Part Two is now streaming in Dolby Atmos & Ultra HDR. Switch to VIP to enjoy."
                          rows={3}
                          className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                        />
                      </div>

                      {/* Link Media to Notification */}
                      <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                        <span className="text-[10px] font-tech text-gold-base tracking-widest uppercase">
                          Link Content Showcase (Optional)
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Select Movie / Series */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                              Select Media
                            </label>
                            <select
                              value={selectedNotifMovieId}
                              onChange={(e) => {
                                setSelectedNotifMovieId(e.target.value);
                                setSelectedNotifSeasonNumber(undefined);
                                setSelectedNotifEpisodeNumber(undefined);
                              }}
                              className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                            >
                              <option value="">-- No Link --</option>
                              {movies.map((m, idx) => (
                                <option
                                  key={`notif-m-${m.id || idx}-${idx}`}
                                  value={m.id}
                                  className="bg-neutral-900 text-white"
                                >
                                  [{m.type.toUpperCase()}] {m.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Season Selection (only if series selected) */}
                          {(() => {
                            const selectedMedia = movies.find(
                              (m) => m.id === selectedNotifMovieId,
                            );
                            if (
                              selectedMedia &&
                              selectedMedia.type === "series"
                            ) {
                              const seasons = selectedMedia.seasons || [];
                              return (
                                <>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                                      Select Season
                                    </label>
                                    <select
                                      value={selectedNotifSeasonNumber || ""}
                                      onChange={(e) => {
                                        const val = e.target.value
                                          ? parseInt(e.target.value)
                                          : undefined;
                                        setSelectedNotifSeasonNumber(val);
                                        setSelectedNotifEpisodeNumber(
                                          undefined,
                                        );
                                      }}
                                      className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                                    >
                                      <option value="">
                                        -- Select Season --
                                      </option>
                                      {seasons.map((s, idx) => (
                                        <option
                                          key={`notif-s-${s.id || idx}-${idx}`}
                                          value={s.seasonNumber}
                                          className="bg-neutral-900 text-white"
                                        >
                                          Season {s.seasonNumber} ({s.title})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Episode Selection */}
                                  {selectedNotifSeasonNumber !== undefined && (
                                    <div className="flex flex-col gap-1.5">
                                      <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                                        Select Episode
                                      </label>
                                      <select
                                        value={selectedNotifEpisodeNumber || ""}
                                        onChange={(e) => {
                                          const val = e.target.value
                                            ? parseInt(e.target.value)
                                            : undefined;
                                          setSelectedNotifEpisodeNumber(val);
                                        }}
                                        className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                                      >
                                        <option value="">
                                          -- Select Episode --
                                        </option>
                                        {(
                                          seasons.find(
                                            (s) =>
                                              s.seasonNumber ===
                                              selectedNotifSeasonNumber,
                                          )?.episodes || []
                                        ).map((ep, idx) => (
                                          <option
                                            key={`notif-ep-${ep.id || idx}-${idx}`}
                                            value={ep.episodeNumber}
                                            className="bg-neutral-900 text-white"
                                          >
                                            Ep {ep.episodeNumber}: {ep.title}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      <div className="flex justify-end mt-2">
                        <button
                          type="submit"
                          className="gold-gradient-bg text-black font-tech font-extrabold text-[10px] py-3 px-6 rounded-xl cursor-pointer hover:brightness-110 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.55)] transition-all"
                        >
                          BROADCAST TO CLIENTS
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </motion.div>
            )}

            {activeTab === "requests" && (
              <motion.div
                key="requests-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                {/* Segment Selector for Requests Tab */}
                <div className="flex border-b border-white/10 pb-1.5 gap-6">
                  <button
                    onClick={() => setRequestsSubTab("titles")}
                    className={`pb-2 text-xs font-serif font-black tracking-widest uppercase transition-all relative cursor-pointer ${
                      requestsSubTab === "titles"
                        ? "text-gold-base"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    FILMS & SHOWS ({movieRequests.length})
                    {requestsSubTab === "titles" && (
                      <motion.div
                        layoutId="subTabBorder"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold-base"
                      />
                    )}
                  </button>

                  <button
                    onClick={() => setRequestsSubTab("subscribe")}
                    className={`pb-2 text-xs font-serif font-black tracking-widest uppercase transition-all relative cursor-pointer ${
                      requestsSubTab === "subscribe"
                        ? "text-amber-500 font-extrabold"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    SUBSCRIBE & PAYMENTS ({subscribeRequests.length})
                    {requestsSubTab === "subscribe" && (
                      <motion.div
                        layoutId="subTabBorder"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500"
                      />
                    )}
                  </button>
                </div>

                {requestsSubTab === "subscribe" ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-serif font-bold text-amber-500 uppercase tracking-wider">
                          SUBSCRIBE & PAYMENT REQUESTS
                        </h3>
                        <p className="text-[10px] text-white/40">
                          Verify payment claims and manually approve EP PLEX VIP
                          access.
                        </p>
                      </div>
                      <button
                        onClick={loadSubscribeRequests}
                        className="p-2 border border-white/10 hover:border-amber-500/30 rounded-full bg-white/5 text-amber-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[9px] font-tech font-bold uppercase tracking-wider"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isSubscribeRequestsLoading ? "animate-spin text-amber-500" : ""}`}
                        />
                        REFRESH
                      </button>
                    </div>

                    {isSubscribeRequestsLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.2,
                            ease: "linear",
                          }}
                          className="w-10 h-10 border-2 border-amber-500/20 border-t-amber-500 rounded-full"
                        />
                        <span className="text-[9px] font-tech text-white/40 tracking-widest uppercase">
                          RETRIEVING SUBSCRIBE REQUESTS...
                        </span>
                      </div>
                    ) : subscribeRequests.length === 0 ? (
                      <div className="luxury-glass p-12 text-center rounded-xxl border-white/5 flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-white/30" />
                        <span className="text-xs font-serif font-bold text-white uppercase tracking-wider">
                          SUBSCRIBE INBOX EMPTY
                        </span>
                        <p className="text-[10px] text-white/40 max-w-xs mx-auto">
                          No active payment or subscription requests present
                          inside Firestore. User-submitted requests will
                          populate here.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 pb-8">
                        {subscribeRequests.map((req, idx) => (
                          <div
                            key={`sub-payments-${req.id || idx}-${idx}`}
                            className="luxury-glass p-4 rounded-xxl border border-white/5 hover:border-amber-500/15 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-serif font-bold text-white uppercase tracking-wide">
                                  {req.name || "Anonymous"}
                                </span>
                                <span className="text-[9px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                  {req.email}
                                </span>
                                <span className="text-[8px] font-tech px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                                  {req.planName}
                                </span>
                                <span
                                  className={`text-[8px] font-tech px-2 py-0.5 rounded border font-extrabold uppercase ${
                                    req.status === "approved"
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                      : req.status === "rejected"
                                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                                        : "border-amber-500/30 bg-amber-500/10 text-amber-500 animate-pulse"
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </div>

                              <div className="flex flex-col gap-0.5 text-[9px] text-white/40">
                                <p>
                                  User UID:{" "}
                                  <span className="text-white/60 font-mono">
                                    {req.userId}
                                  </span>
                                </p>
                                <p>
                                  Submitted:{" "}
                                  <span className="text-white/60">
                                    {new Date(req.createdAt).toLocaleString()}
                                  </span>
                                </p>
                                {req.requestNotes && (
                                  <p className="mt-1 text-[10px] text-amber-300/80 italic">
                                    "{req.requestNotes}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {req.status === "pending" && (
                                <>
                                  <button
                                    onClick={async () => {
                                      await updateSubscribeRequestStatusInFirestore(
                                        req.id,
                                        req.userId,
                                        "approved",
                                      );
                                      loadSubscribeRequests();
                                    }}
                                    className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black rounded-lg text-emerald-400 text-[9px] font-tech font-bold transition-all cursor-pointer"
                                  >
                                    APPROVE & ACTIVATE
                                  </button>
                                  <button
                                    onClick={async () => {
                                      await updateSubscribeRequestStatusInFirestore(
                                        req.id,
                                        req.userId,
                                        "rejected",
                                      );
                                      loadSubscribeRequests();
                                    }}
                                    className="px-3 py-1.5 bg-red-500/15 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg text-red-400 text-[9px] font-tech font-bold transition-all cursor-pointer"
                                  >
                                    REJECT
                                  </button>
                                </>
                              )}
                              <button
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      "Are you sure you want to delete this subscribe request permanently?",
                                    )
                                  ) {
                                    await deleteSubscribeRequestFromFirestore(
                                      req.id,
                                    );
                                    loadSubscribeRequests();
                                  }
                                }}
                                className="p-1.5 border border-white/10 hover:bg-red-500 hover:border-red-500 hover:text-white text-white/40 rounded-lg transition-all cursor-pointer"
                                title="Delete Request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-serif font-bold text-white uppercase tracking-wider">
                          USER FILMS & SERIES REQUESTS
                        </h3>
                        <p className="text-[10px] text-white/40">
                          Manage title requests sent by registered platform
                          audience.
                        </p>
                      </div>
                      <button
                        onClick={loadMovieRequests}
                        className="p-2 border border-white/10 hover:border-gold-base/30 rounded-full bg-white/5 text-gold-base hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[9px] font-tech font-bold uppercase tracking-wider"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isRequestsLoading ? "animate-spin text-gold-base" : ""}`}
                        />
                        REFRESH
                      </button>
                    </div>

                    {isRequestsLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.2,
                            ease: "linear",
                          }}
                          className="w-10 h-10 border-2 border-gold-base/20 border-t-gold-base rounded-full"
                        />
                        <span className="text-[9px] font-tech text-white/40 tracking-widest uppercase">
                          RETRIEVING INBOX REQUESTS...
                        </span>
                      </div>
                    ) : movieRequests.length === 0 ? (
                      <div className="luxury-glass p-12 text-center rounded-xxl border-white/5 flex flex-col items-center gap-2">
                        <AlertCircle className="w-8 h-8 text-white/30" />
                        <span className="text-xs font-serif font-bold text-white uppercase tracking-wider">
                          REQUEST INBOX EMPTY
                        </span>
                        <p className="text-[10px] text-white/40 max-w-xs mx-auto">
                          No active requests are present inside the Firestore
                          database. User-submitted suggestions will populate
                          here.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 pb-8">
                        {movieRequests.map((req, idx) => (
                          <div
                            key={`req-manager-${req.id || idx}-${idx}`}
                            className="luxury-glass p-4 rounded-xxl border border-white/5 hover:border-gold-base/15 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-serif font-bold text-white uppercase tracking-wide">
                                  {req.title}
                                </span>
                                <span className="text-[8px] font-tech px-2 py-0.5 rounded bg-white/10 text-white/70 font-bold uppercase">
                                  {req.type}
                                </span>
                                <span
                                  className={`text-[8px] font-tech px-2 py-0.5 rounded border font-extrabold uppercase ${
                                    req.status === "approved"
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                      : req.status === "rejected"
                                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                                        : "border-gold-base/30 bg-gold-base/10 text-gold-base animate-pulse"
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </div>

                              <div className="flex flex-col gap-0.5 text-[9px] text-white/40">
                                <p>
                                  Requested by:{" "}
                                  <span className="text-white/60 font-semibold">
                                    {req.requestedBy}
                                  </span>{" "}
                                  ({req.userEmail || "No Email"})
                                </p>
                                <p>
                                  Submitted:{" "}
                                  <span className="text-white/60">
                                    {new Date(req.createdAt).toLocaleString()}
                                  </span>
                                </p>
                                {req.notes && (
                                  <p className="mt-1 text-[10px] text-gold-light italic">
                                    "{req.notes}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {req.status === "pending" && (
                                <>
                                  <button
                                    onClick={async () => {
                                      await updateMovieRequestStatusInFirestore(
                                        req.id,
                                        "approved",
                                      );
                                      loadMovieRequests();
                                    }}
                                    className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black rounded-lg text-emerald-400 text-[9px] font-tech font-bold transition-all cursor-pointer"
                                  >
                                    APPROVE
                                  </button>
                                  <button
                                    onClick={async () => {
                                      await updateMovieRequestStatusInFirestore(
                                        req.id,
                                        "rejected",
                                      );
                                      loadMovieRequests();
                                    }}
                                    className="px-3 py-1.5 bg-red-500/15 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg text-red-400 text-[9px] font-tech font-bold transition-all cursor-pointer"
                                  >
                                    REJECT
                                  </button>
                                </>
                              )}
                              <button
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      "Are you sure you want to delete this request permanently?",
                                    )
                                  ) {
                                    await deleteMovieRequestFromFirestore(
                                      req.id,
                                    );
                                    loadMovieRequests();
                                  }
                                }}
                                className="p-1.5 border border-white/10 hover:bg-red-500 hover:border-red-500 hover:text-white text-white/40 rounded-lg transition-all cursor-pointer"
                                title="Delete Request"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div
                key="notifications-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h3 className="text-sm font-serif font-bold text-gold-base uppercase tracking-wider">
                    BROADCAST & NOTIFICATIONS CENTER
                  </h3>
                  <p className="text-[10px] text-white/40">
                    Send real-time alerts and persist announcements to the live
                    notifications board.
                  </p>
                </div>

                {/* Form to dispatch notifications */}
                <form
                  onSubmit={handleSendNotif}
                  className="luxury-glass p-6 rounded-xxl border-white/5 flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-1">
                    <Bell className="w-5 h-5 text-gold-base animate-pulse" />
                    <div>
                      <h4 className="text-xs font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase tracking-wider">
                        DISPATCH GLOBAL BROADCAST SIGNALS
                      </h4>
                      <p className="text-[9px] text-white/40 font-tech">
                        Send realtime pushes directly to all subscriber
                        dashboards.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Title */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                        Signal Header
                      </label>
                      <input
                        type="text"
                        required
                        value={notifTitle}
                        onChange={(e) => setNotifTitle(e.target.value)}
                        placeholder="e.g. 🔥 NEW HIT BLOCKBUSTER ARRIVED!"
                        className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                      />
                    </div>

                    {/* Message Body */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                        Signal Message Body
                      </label>
                      <textarea
                        required
                        value={notifBody}
                        onChange={(e) => setNotifBody(e.target.value)}
                        placeholder="e.g. Dune: Part Two is now streaming. Switch to VIP to watch now!"
                        rows={3}
                        className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                      />
                    </div>

                    {/* Link Media to Notification */}
                    <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                      <span className="text-[10px] font-tech text-gold-base tracking-widest uppercase">
                        Link Content Showcase (Optional)
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Select Movie / Series */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                            Select Media
                          </label>
                          <select
                            value={selectedNotifMovieId}
                            onChange={(e) => {
                              setSelectedNotifMovieId(e.target.value);
                              setSelectedNotifSeasonNumber(undefined);
                              setSelectedNotifEpisodeNumber(undefined);
                            }}
                            className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                          >
                            <option value="">-- No Link --</option>
                            {movies.map((m, idx) => (
                              <option
                                key={`notif2-m-${m.id || idx}-${idx}`}
                                value={m.id}
                                className="bg-neutral-900 text-white"
                              >
                                [{m.type.toUpperCase()}] {m.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Season Selection (only if series selected) */}
                        {(() => {
                          const selectedMedia = movies.find(
                            (m) => m.id === selectedNotifMovieId,
                          );
                          if (
                            selectedMedia &&
                            selectedMedia.type === "series"
                          ) {
                            const seasons = selectedMedia.seasons || [];
                            return (
                              <>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                                    Select Season
                                  </label>
                                  <select
                                    value={selectedNotifSeasonNumber || ""}
                                    onChange={(e) => {
                                      const val = e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined;
                                      setSelectedNotifSeasonNumber(val);
                                      setSelectedNotifEpisodeNumber(undefined);
                                    }}
                                    className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                                  >
                                    <option value="">
                                      -- Select Season --
                                    </option>
                                    {seasons.map((s, idx) => (
                                      <option
                                        key={`notif2-s-${s.id || idx}-${idx}`}
                                        value={s.seasonNumber}
                                        className="bg-neutral-900 text-white"
                                      >
                                        Season {s.seasonNumber} ({s.title})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Episode Selection */}
                                {selectedNotifSeasonNumber !== undefined && (
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                                      Select Episode
                                    </label>
                                    <select
                                      value={selectedNotifEpisodeNumber || ""}
                                      onChange={(e) => {
                                        const val = e.target.value
                                          ? parseInt(e.target.value)
                                          : undefined;
                                        setSelectedNotifEpisodeNumber(val);
                                      }}
                                      className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                                    >
                                      <option value="">
                                        -- Select Episode --
                                      </option>
                                      {(
                                        seasons.find(
                                          (s) =>
                                            s.seasonNumber ===
                                            selectedNotifSeasonNumber,
                                        )?.episodes || []
                                      ).map((ep, idx) => (
                                        <option
                                          key={`notif2-ep-${ep.id || idx}-${idx}`}
                                          value={ep.episodeNumber}
                                          className="bg-neutral-900 text-white"
                                        >
                                          Ep {ep.episodeNumber}: {ep.title}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={handleSeedNewFeatures}
                        disabled={isSeedingFeatures}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl border border-purple-500/20 hover:border-purple-500/50 bg-purple-950/10 hover:bg-purple-900/20 text-purple-400 text-[10px] font-tech font-extrabold uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                      >
                        {isSeedingFeatures ? "SEEDING FEATURES..." : "SEED 5 NEW FEATURES"}
                      </button>
                      <button
                        type="submit"
                        disabled={isBroadcasting}
                        className="w-full sm:w-auto gold-gradient-bg text-black font-tech font-extrabold text-[10px] py-3 px-6 rounded-xl cursor-pointer hover:brightness-110 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_20px_rgba(212,175,55,0.55)] transition-all flex items-center justify-center gap-1.5"
                      >
                        {isBroadcasting ? "SENDING..." : "BROADCAST TO CLIENTS"}
                      </button>
                    </div>
                  </div>
                </form>

                {/* History of Past Broadcasts */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-xs font-serif font-bold text-white uppercase tracking-wider">
                      BROADCAST HISTORY ({broadcastNotifications.length})
                    </h4>
                    <button
                      onClick={loadBroadcastNotifications}
                      className="p-1.5 border border-white/10 hover:border-gold-base/30 rounded-full bg-white/5 text-gold-base hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[8px] font-tech font-bold uppercase tracking-wider"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isNotificationsLoading ? "animate-spin text-gold-base" : ""}`}
                      />
                      REFRESH
                    </button>
                  </div>

                  {isNotificationsLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.2,
                          ease: "linear",
                        }}
                        className="w-8 h-8 border-2 border-gold-base/20 border-t-gold-base rounded-full"
                      />
                      <span className="text-[8px] font-tech text-white/40 tracking-widest uppercase">
                        LOADING PAST BROADCASTS...
                      </span>
                    </div>
                  ) : broadcastNotifications.length === 0 ? (
                    <div className="p-10 text-center luxury-glass rounded-xxl border border-white/5 text-[10px] text-white/40">
                      No broadcast history found. Use the composer above to
                      issue global notifications.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                      {broadcastNotifications.map((notif, idx) => (
                        <div
                          key={`broadcast-notif-${notif.id || idx}-${idx}`}
                          className="luxury-glass p-4 rounded-xxl border border-white/5 flex items-center justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-serif font-bold text-white uppercase tracking-wide">
                              {notif.title}
                            </h5>
                            <p className="text-[11px] text-white/75 mt-1">
                              {notif.body}
                            </p>
                            <span className="text-[8px] font-mono text-white/40 mt-1 block">
                              {new Date(notif.time).toLocaleString()}
                            </span>
                          </div>
                          <button
                            onClick={async () => {
                              if (
                                window.confirm(
                                  "Are you sure you want to delete this notification from active feeds?",
                                )
                              ) {
                                await deleteNotificationFromFirestore(notif.id);
                                loadBroadcastNotifications();
                              }
                            }}
                            className="p-2 border border-white/10 hover:bg-red-500 hover:border-red-500 hover:text-white text-white/40 rounded-lg transition-all cursor-pointer"
                            title="Delete Notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "livetv" && (
              <motion.div
                key="livetv-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6 text-left"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                  <div>
                    <h3 className="text-sm font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase">
                      LIVE STREAM BROADCAST MATRIX
                    </h3>
                    <p className="text-[10px] text-white/40 font-tech mt-1">
                      Configure live TV relays, configure active show catalogs,
                      and view live client viewer metrics.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedLiveChannelForEdit(null);
                      setChannelIdInput("ch_" + Date.now());
                      setChannelNameInput("");
                      setChannelLogoInput("📺");
                      setChannelCurrentProgramInput("");
                      setChannelNextProgramInput("");
                      setChannelCategoryInput("Movies");
                      setChannelViewerCountInput("1.5K");
                      setChannelStreamUrlInput("");
                      setChannelIsPremiumInput(false);
                      setChannelUpcomingTimeInput("");
                      setChannelUpcomingStreamUrlInput("");
                      setChannelUpcomingSegments([]);
                      setShowLiveChannelModal(true);
                    }}
                    className="gold-gradient-bg text-black font-semibold text-[10px] py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-[0_4px_12px_rgba(212,175,55,0.2)] hover:scale-105 transition-all cursor-pointer self-start uppercase tracking-wider font-tech"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5px]" />
                    ADD NEW CHANNEL
                  </button>
                </div>

                {isLiveChannelsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-2 border-gold-base border-t-transparent rounded-full animate-spin" />
                    <span className="text-[9px] font-tech tracking-widest text-white/40 uppercase">
                      DECRYPTING BROADCAST ROUTING TABLES...
                    </span>
                  </div>
                ) : liveChannels.length === 0 ? (
                  <div className="p-16 text-center border border-dashed border-white/10 rounded-xxl luxury-glass text-white/40 text-[11px] font-mono">
                    NO LIVE CHANNELS DEPLOYED. CLICK "ADD NEW CHANNEL" TO ROUTE
                    A STREAM.
                  </div>
                ) : (
                  <div className="luxury-glass border border-white/5 rounded-xxl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.01] text-[9px] font-tech tracking-widest text-white/40 uppercase">
                            <th className="py-4 px-5">LOGO / NAME</th>
                            <th className="py-4 px-4">CATEGORY</th>
                            <th className="py-4 px-4">ACCESS</th>
                            <th className="py-4 px-4">CURRENT PROGRAM</th>
                            <th className="py-4 px-4">NEXT SEGMENT</th>
                            <th className="py-4 px-4">VIEWERS</th>
                            <th className="py-4 px-4">STREAM INTERFACE</th>
                            <th className="py-4 px-5 text-right">OPERATIONS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono text-white/80">
                          {liveChannels.map((channel, idx) => (
                            <tr
                              key={`channel-admin-${channel.id || idx}-${idx}`}
                              className="hover:bg-white/[0.01] transition-colors"
                            >
                              <td className="py-3.5 px-5 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-lg shadow-inner shrink-0">
                                  {channel.logo}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-serif font-bold text-white block uppercase tracking-wide truncate max-w-[150px]">
                                    {channel.name}
                                  </span>
                                  <span className="text-[8px] text-white/30 font-mono block tracking-tight uppercase truncate">
                                    {channel.id}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2.5 py-0.5 rounded-full text-[8px] font-tech bg-white/5 border border-white/10 text-gold-base uppercase">
                                  {channel.category}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                {channel.isPremium ? (
                                  <span className="px-2 py-0.5 rounded-full text-[7.5px] font-tech font-extrabold bg-gold-base/10 border border-gold-base/20 text-gold-base uppercase flex items-center gap-1 w-max">
                                    <Crown className="w-2.5 h-2.5 fill-gold-base" />
                                    PREMIUM ✅
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[7.5px] font-tech font-extrabold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase flex items-center gap-1 w-max">
                                    FREE
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-white font-bold truncate max-w-[150px] uppercase">
                                {channel.currentProgram}
                              </td>
                              <td className="py-3.5 px-4 text-white/50 truncate max-w-[120px]">
                                {channel.nextProgram}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-gold-base">
                                {channel.viewerCount}
                              </td>
                              <td className="py-3.5 px-4 text-white/40 text-[9px] truncate max-w-[180px]">
                                {channel.streamUrl}
                              </td>
                              <td className="py-3.5 px-5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedLiveChannelForEdit(channel);
                                      setChannelIdInput(channel.id);
                                      setChannelNameInput(channel.name);
                                      setChannelLogoInput(channel.logo);
                                      setChannelCurrentProgramInput(
                                        channel.currentProgram,
                                      );
                                      setChannelNextProgramInput(
                                        channel.nextProgram || "",
                                      );
                                      setChannelCategoryInput(
                                        channel.category as any,
                                      );
                                      setChannelViewerCountInput(
                                        channel.viewerCount,
                                      );
                                      setChannelStreamUrlInput(
                                        channel.streamUrl,
                                      );
                                      setChannelIsPremiumInput(
                                        channel.isPremium || false,
                                      );
                                      setChannelUpcomingTimeInput(
                                        channel.upcomingTime || "",
                                      );
                                      setChannelUpcomingStreamUrlInput(
                                        channel.upcomingStreamUrl || "",
                                      );
                                      setChannelUpcomingSegments(
                                        channel.upcomingSegments || [],
                                      );
                                      setShowLiveChannelModal(true);
                                    }}
                                    className="p-1.5 border border-white/5 rounded-lg text-white/50 hover:text-gold-base hover:border-gold-base/30 transition-all bg-white/[0.01] hover:bg-gold-base/5 cursor-pointer"
                                    title="Reconfigure Relay"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (
                                        confirm(
                                          `Are you sure you want to terminate relay for ${channel.name}?`,
                                        )
                                      ) {
                                        try {
                                          await deleteLiveChannelFromFirestore(
                                            channel.id,
                                          );
                                          alert(
                                            "Relay terminated successfully!",
                                          );
                                          loadLiveChannels();
                                        } catch (error) {
                                          alert("Failed to terminate relay.");
                                        }
                                      }
                                    }}
                                    className="p-1.5 border border-white/5 rounded-lg text-white/50 hover:text-red-500 hover:border-red-500/30 transition-all bg-white/[0.01] hover:bg-red-500/5 cursor-pointer"
                                    title="Terminate Relay"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6 text-left"
              >
                <div className="luxury-glass p-6 rounded-xxl border border-white/5 flex flex-col gap-6">
                  <div>
                    <h3 className="text-sm font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase">
                      SYSTEM ACCESS CONTROLS
                    </h3>
                    <p className="text-[10px] text-white/40 font-tech mt-1">
                      Configure Administrative Credentials, Security PIN, and
                      local catalog indexing.
                    </p>
                  </div>

                  {isSettingsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-8 h-8 border-2 border-gold-base border-t-transparent rounded-full animate-spin" />
                      <span className="text-[9px] font-tech tracking-widest text-white/40 uppercase">
                        SYNCING ACCESS PRIVILEGES...
                      </span>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSavingSettings(true);
                        try {
                          await saveAdminCredentials({
                            adminEmail: adminEmailInput,
                            adminPassword: adminPasswordInput,
                            appSecurityPin: appSecurityPinInput,
                            tmdbApiKey: tmdbApiKeyInput,
                          });
                          alert(
                            "System security configuration updated successfully in Firestore and synchronized across all terminals!",
                          );
                        } catch (err: any) {
                          alert("Failed to save credentials: " + err.message);
                        } finally {
                          setIsSavingSettings(false);
                        }
                      }}
                      className="flex flex-col gap-5"
                    >
                      {/* Admin Email field */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-tech text-white/50 uppercase tracking-widest">
                          Admin Access Email
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="email"
                            required
                            value={adminEmailInput}
                            onChange={(e) => setAdminEmailInput(e.target.value)}
                            placeholder="admin@gmail.com"
                            className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base w-full pl-10"
                          />
                          <User className="w-4 h-4 text-white/30 absolute left-3.5" />
                        </div>
                        <span className="text-[8px] text-white/30">
                          Changes the primary security email used to sign into
                          the system administration deck.
                        </span>
                      </div>

                      {/* Admin Password / Passkey field */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-tech text-white/50 uppercase tracking-widest">
                          Admin Secure Passcode
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            required
                            value={adminPasswordInput}
                            onChange={(e) =>
                              setAdminPasswordInput(e.target.value)
                            }
                            placeholder="AdminPro"
                            className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base w-full pl-10 font-mono"
                          />
                          <Lock className="w-4 h-4 text-white/30 absolute left-3.5" />
                        </div>
                        <span className="text-[8px] text-white/30">
                          A complex cryptographic passkey to unlock terminal
                          features. Default is "AdminPro".
                        </span>
                      </div>

                      {/* App Security PIN field */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-tech text-white/50 uppercase tracking-widest">
                          App Security PIN Code (4 Digits)
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            maxLength={4}
                            pattern="[0-9]{4}"
                            value={appSecurityPinInput}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              setAppSecurityPinInput(val);
                            }}
                            placeholder="e.g. 1234 (Leave blank to disable PIN page)"
                            className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base w-full pl-10 font-mono tracking-widest"
                          />
                          <Key className="w-4 h-4 text-white/30 absolute left-3.5" />
                        </div>
                        <span className="text-[8px] text-white/30">
                          Set a 4-digit security PIN. When configured, users
                          will be prompted for PIN verification when accessing
                          administrative decks or switching profiles.
                        </span>
                      </div>

                      {/* TMDB API Key field */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-tech text-white/50 uppercase tracking-widest">
                          TMDB API Key (v3 auth)
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={tmdbApiKeyInput}
                            onChange={(e) => setTmdbApiKeyInput(e.target.value)}
                            placeholder="e.g. 8a4c8a... (Enter TMDB API Key for movie/series metadata lookup)"
                            className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base w-full pl-10 font-mono"
                          />
                          <Globe className="w-4 h-4 text-white/30 absolute left-3.5" />
                        </div>
                        <span className="text-[8px] text-white/30">
                          Enter your TMDB API Key to enable movie & series
                          instant search and auto-fill in movie/series add
                          modals.
                        </span>
                      </div>

                      {/* Save Button */}
                      <div className="flex items-center justify-end mt-2">
                        <button
                          type="submit"
                          disabled={isSavingSettings}
                          className="px-6 py-3 rounded-xl gold-gradient-bg text-black font-tech font-black text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(212,175,55,0.2)]"
                        >
                          {isSavingSettings ? (
                            <>
                              <div className="w-3.5 h-3.5 border border-black border-t-transparent rounded-full animate-spin" />
                              SAVING CONFIG...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              SAVE SYSTEM PRIVILEGES
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Firebase Full Box Configuration Card */}
                <div className="luxury-glass p-6 rounded-xxl border border-white/5 flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 uppercase">
                        FIREBASE ENGINE COHESIVE CONTROL BOX
                      </h3>
                      <p className="text-[10px] text-white/40 font-tech mt-1">
                        Configure your custom real-time Cloud Firestore &
                        Authentication database cluster.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8.5px] font-tech font-bold uppercase tracking-wider bg-emerald-500/10 border-emerald-500/30 text-emerald-400 self-start sm:self-auto">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {firebaseApiKeyInput && firebaseProjectIdInput
                        ? "Custom Cluster Loaded"
                        : "System Default Active"}
                    </div>
                  </div>

                  {isSettingsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[9px] font-tech tracking-widest text-white/40 uppercase">
                        SYNCING CLOUD CLUSTER...
                      </span>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSavingSettings(true);
                        try {
                          await saveAdminCredentials({
                            adminEmail: adminEmailInput,
                            adminPassword: adminPasswordInput,
                            appSecurityPin: appSecurityPinInput,
                            tmdbApiKey: tmdbApiKeyInput,
                            firebaseApiKey: firebaseApiKeyInput,
                            firebaseAuthDomain: firebaseAuthDomainInput,
                            firebaseDatabaseURL: firebaseDatabaseURLInput,
                            firebaseProjectId: firebaseProjectIdInput,
                            firebaseStorageBucket: firebaseStorageBucketInput,
                            firebaseMessagingSenderId:
                              firebaseMessagingSenderIdInput,
                            firebaseAppId: firebaseAppIdInput,
                            firebaseMeasurementId: firebaseMeasurementIdInput,
                          });
                          alert(
                            "Firebase custom credentials updated successfully! The system will reload to establish connections.",
                          );
                          window.location.reload();
                        } catch (err: any) {
                          alert(
                            "Failed to save Firebase custom credentials: " +
                              err.message,
                          );
                        } finally {
                          setIsSavingSettings(false);
                        }
                      }}
                      className="flex flex-col gap-5"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Api Key */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                            Firebase API Key (apiKey)
                          </label>
                          <input
                            type="text"
                            value={firebaseApiKeyInput}
                            onChange={(e) =>
                              setFirebaseApiKeyInput(e.target.value)
                            }
                            placeholder="AIzaSy..."
                            className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                          />
                        </div>

                        {/* Project ID */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                            Project ID (projectId)
                          </label>
                          <input
                            type="text"
                            value={firebaseProjectIdInput}
                            onChange={(e) =>
                              setFirebaseProjectIdInput(e.target.value)
                            }
                            placeholder="my-cool-firebase-app"
                            className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                          />
                        </div>

                        {/* Auth Domain */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                            Auth Domain (authDomain)
                          </label>
                          <input
                            type="text"
                            value={firebaseAuthDomainInput}
                            onChange={(e) =>
                              setFirebaseAuthDomainInput(e.target.value)
                            }
                            placeholder="my-cool-firebase-app.firebaseapp.com"
                            className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                          />
                        </div>

                        {/* Database URL */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                            Database URL (databaseURL)
                          </label>
                          <input
                            type="text"
                            value={firebaseDatabaseURLInput}
                            onChange={(e) =>
                              setFirebaseDatabaseURLInput(e.target.value)
                            }
                            placeholder="https://my-cool-firebase-app-default-rtdb.firebaseio.com"
                            className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                          />
                        </div>

                        {/* Storage Bucket */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                            Storage Bucket (storageBucket)
                          </label>
                          <input
                            type="text"
                            value={firebaseStorageBucketInput}
                            onChange={(e) =>
                              setFirebaseStorageBucketInput(e.target.value)
                            }
                            placeholder="my-cool-firebase-app.firebasestorage.app"
                            className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                          />
                        </div>

                        {/* Messaging Sender ID */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                            Messaging Sender ID (messagingSenderId)
                          </label>
                          <input
                            type="text"
                            value={firebaseMessagingSenderIdInput}
                            onChange={(e) =>
                              setFirebaseMessagingSenderIdInput(e.target.value)
                            }
                            placeholder="e.g. 181452542182"
                            className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                          />
                        </div>

                        {/* App ID */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                            App ID (appId)
                          </label>
                          <input
                            type="text"
                            value={firebaseAppIdInput}
                            onChange={(e) =>
                              setFirebaseAppIdInput(e.target.value)
                            }
                            placeholder="e.g. 1:181452542182:web:4103deffd7573ddd812b27"
                            className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                          />
                        </div>

                        {/* Measurement ID */}
                        <div className="flex flex-col gap-1.5 text-left">
                          <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                            Measurement ID (measurementId)
                          </label>
                          <input
                            type="text"
                            value={firebaseMeasurementIdInput}
                            onChange={(e) =>
                              setFirebaseMeasurementIdInput(e.target.value)
                            }
                            placeholder="e.g. G-TCESMZV5YF"
                            className="bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Are you sure you want to revert Firebase configuration to system defaults? This will erase the custom credentials.",
                              )
                            ) {
                              setFirebaseApiKeyInput("");
                              setFirebaseAuthDomainInput("");
                              setFirebaseDatabaseURLInput("");
                              setFirebaseProjectIdInput("");
                              setFirebaseStorageBucketInput("");
                              setFirebaseMessagingSenderIdInput("");
                              setFirebaseAppIdInput("");
                              setFirebaseMeasurementIdInput("");

                              // Clear from localStorage
                              localStorage.removeItem("ep_firebase_apiKey");
                              localStorage.removeItem("ep_firebase_authDomain");
                              localStorage.removeItem(
                                "ep_firebase_databaseURL",
                              );
                              localStorage.removeItem("ep_firebase_projectId");
                              localStorage.removeItem(
                                "ep_firebase_storageBucket",
                              );
                              localStorage.removeItem(
                                "ep_firebase_messagingSenderId",
                              );
                              localStorage.removeItem("ep_firebase_appId");
                              localStorage.removeItem(
                                "ep_firebase_measurementId",
                              );

                              saveAdminCredentials({
                                adminEmail: adminEmailInput,
                                adminPassword: adminPasswordInput,
                                appSecurityPin: appSecurityPinInput,
                                tmdbApiKey: tmdbApiKeyInput,
                                firebaseApiKey: "",
                                firebaseAuthDomain: "",
                                firebaseDatabaseURL: "",
                                firebaseProjectId: "",
                                firebaseStorageBucket: "",
                                firebaseMessagingSenderId: "",
                                firebaseAppId: "",
                                firebaseMeasurementId: "",
                              }).then(() => {
                                alert(
                                  "Firebase config reset to default! Refreshing app...",
                                );
                                window.location.reload();
                              });
                            }
                          }}
                          className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-red-500/30 text-white/50 hover:text-red-400 font-tech font-bold text-[8.5px] tracking-widest transition-all cursor-pointer"
                        >
                          RESET DEFAULTS
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingSettings}
                          className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-tech font-black text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(16,185,129,0.2)]"
                        >
                          {isSavingSettings ? (
                            <>
                              <div className="w-3.5 h-3.5 border border-black border-t-transparent rounded-full animate-spin" />
                              SAVING CONFIG...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              SAVE FIREBASE CONFIG
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Local Storage & Index Info Card */}
                <div className="luxury-glass p-6 rounded-xxl border border-white/5 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-gold-base/10 text-gold-base border border-gold-base/20">
                      <Wifi className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-serif font-bold text-white uppercase tracking-wider">
                        LOCAL STORAGE OFFLINE PLAYBACK
                      </h4>
                      <p className="text-[10px] text-white/40 font-tech mt-0.5">
                        Admin-uploaded movies and custom files are indexed
                        locally in IndexedDB storage.
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-white/70 space-y-2 pl-1.5">
                    <p>
                      All video and media files uploaded directly inside this
                      Admin Panel are securely persisted as Binary Large Objects
                      (Blobs) within the client's sandboxed local IndexedDB
                      storage.
                    </p>
                    <p>
                      These local videos are dynamically linked to shared
                      catalogs in Firestore. When any profile (including guest
                      or premium members) logs into this browser session, the
                      engine retrieves these files from the shared offline
                      database for zero-latency instant playback.
                    </p>
                  </div>
                </div>

                {/* Embedded Streaming Servers Management Card */}
                <div className="luxury-glass p-6 rounded-xxl border border-white/5 flex flex-col gap-4">
                  <ServerManager servers={servers} onRefresh={loadServers} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Premium Plan Edit Modal (EDIT Model) */}
      <AnimatePresence>
        {editingPlan && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto py-8 sm:py-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg luxury-glass border border-white/10 rounded-xxl p-6 shadow-2xl relative bg-black/90 text-left"
            >
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 border-b border-white/10 pb-3 mb-4">
                <Crown className="w-5 h-5 text-gold-base animate-pulse" />
                <div>
                  <h3 className="text-sm font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-base to-gold-dark uppercase tracking-wider">
                    EDIT SUBSCRIPTION SPECIFICATIONS
                  </h3>
                  <p className="text-[10px] text-white/40 font-tech">
                    Modify your active published tier details and entitlement
                    rules.
                  </p>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const benefitsArray = editPlanBenefits
                      .split(",")
                      .map((b) => b.trim())
                      .filter((b) => b.length > 0);

                    await addSubscribePlanToFirestore({
                      id: editingPlan.id,
                      name: editPlanName,
                      price: editPlanPrice,
                      period: editPlanPeriod,
                      expireDaysCount: editPlanExpireDays,
                      tag: editPlanTag,
                      color: editPlanColor,
                      benefits: benefitsArray,
                      closedBenefits: editingPlan.closedBenefits || [],
                      popular: editingPlan.popular || false,
                    });

                    await loadAdminPlans();
                    setEditingPlan(null);
                    alert("Subscription plan updated successfully!");
                  } catch (error) {
                    console.error(error);
                    alert("Failed to update plan specs.");
                  }
                }}
                className="flex flex-col gap-4 text-left"
              >
                {/* Plan Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editPlanName}
                    onChange={(e) => setEditPlanName(e.target.value)}
                    placeholder="e.g. ULTIMATE VIP PASS"
                    className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Price */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      Pricing Model
                    </label>
                    <input
                      type="text"
                      required
                      value={editPlanPrice}
                      onChange={(e) => setEditPlanPrice(e.target.value)}
                      placeholder="e.g. $19.99"
                      className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                    />
                  </div>
                  {/* Period */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      Period / Duration Title
                    </label>
                    <input
                      type="text"
                      required
                      value={editPlanPeriod}
                      onChange={(e) => setEditPlanPeriod(e.target.value)}
                      placeholder="e.g. 1 Month"
                      className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                    />
                  </div>
                </div>

                {/* Expire Days Selector 1-32 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      Active Expiry (Days)
                    </label>
                    <select
                      value={editPlanExpireDays}
                      onChange={(e) =>
                        setEditPlanExpireDays(Number(e.target.value))
                      }
                      className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                    >
                      {Array.from({ length: 32 }, (_, i) => i + 1).map(
                        (day) => (
                          <option
                            key={day}
                            value={day}
                            className="bg-neutral-900 text-white"
                          >
                            {day} Day{day > 1 ? "s" : ""}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  {/* Badge Tag */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      Plan Badge / Tag
                    </label>
                    <input
                      type="text"
                      value={editPlanTag}
                      onChange={(e) => setEditPlanTag(e.target.value)}
                      placeholder="e.g. MOST POPULAR"
                      className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                    />
                  </div>
                </div>

                {/* Theme Preset Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                    Theme Accent Design
                  </label>
                  <select
                    value={editPlanColor}
                    onChange={(e) => setEditPlanColor(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                  >
                    <option value="border-white/10 bg-white/5">
                      Slate Glass Standard
                    </option>
                    <option value="border-gold-base/30 bg-gold-base/5 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                      Royal Gold Premium
                    </option>
                    <option value="border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                      Amber Sunset Glow
                    </option>
                    <option value="border-indigo-500/30 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                      Indigo Ultra Premium
                    </option>
                  </select>
                </div>

                {/* Benefits list (Comma separated) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                    Entitlements (Comma separated)
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={editPlanBenefits}
                    onChange={(e) => setEditPlanBenefits(e.target.value)}
                    placeholder="Unlimited HD Streaming, Dolby Atmos, Multi Device Sync"
                    className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-gold-base"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(null)}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white/60 hover:text-white rounded-xl text-[10px] font-tech font-bold uppercase cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 gold-gradient-bg text-black rounded-xl text-[10px] font-tech font-black uppercase cursor-pointer hover:brightness-110 shadow-[0_4px_12px_rgba(212,175,55,0.25)]"
                  >
                    SAVE SPECIFICATIONS
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD/EDIT SERVER MODAL */}
      <AnimatePresence>
        {showServerModal && (
          <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto py-8 sm:py-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg luxury-glass border border-white/10 rounded-xxl p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-rose-500 animate-pulse" />
                  <h3 className="text-sm font-serif font-black tracking-wider text-white uppercase">
                    {selectedServerForEdit
                      ? "RECONFIGURE STREAM ROUTER"
                      : "DEPLOY NEW CDN RELAY"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowServerModal(false)}
                  className="p-1 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={handleSaveServerSubmit}
                className="flex flex-col gap-4 text-left"
              >
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                    RELAY PROVIDER IDENTIFIER
                  </label>
                  <input
                    type="text"
                    required
                    value={serverFormName}
                    onChange={(e) => setServerFormName(e.target.value)}
                    placeholder="e.g. Apex Stream US-4"
                    className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Endpoint URL */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                    CDN STREAM ENDPOINT
                  </label>
                  <input
                    type="url"
                    value={serverFormUrl}
                    onChange={(e) => setServerFormUrl(e.target.value)}
                    placeholder="e.g. https://srv-3.eliteplex.co/stream (leave blank for auto-generate)"
                    className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                {/* Zone (Country) & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      ZONE (COUNTRY)
                    </label>
                    <select
                      value={serverFormCountry}
                      onChange={(e) => setServerFormCountry(e.target.value)}
                      className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="India">India</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Japan">Japan</option>
                      <option value="Canada">Canada</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Australia">Australia</option>
                      <option value="South Korea">South Korea</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      TUNNEL STATUS
                    </label>
                    <select
                      value={serverFormStatus}
                      onChange={(e) =>
                        setServerFormStatus(e.target.value as any)
                      }
                      className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>

                {/* Latency & Load Slider */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                        LATENCY
                      </label>
                      <span className="text-[10px] font-mono font-bold text-rose-400">
                        {serverFormLatency} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="5"
                      value={serverFormLatency}
                      onChange={(e) =>
                        setServerFormLatency(Number(e.target.value))
                      }
                      className="accent-rose-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                        CAPACITY LOAD
                      </label>
                      <span className="text-[10px] font-mono font-bold text-amber-400">
                        {serverFormLoad}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={serverFormLoad}
                      onChange={(e) =>
                        setServerFormLoad(Number(e.target.value))
                      }
                      className="accent-rose-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Speed Selection & Premium switch */}
                <div className="grid grid-cols-2 gap-3 items-center mt-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      BANDWIDTH CHANNEL
                    </label>
                    <select
                      value={serverFormSpeed}
                      onChange={(e) => setServerFormSpeed(e.target.value)}
                      className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      <option value="10 Gbps">10 Gbps (Ultra-Fiber)</option>
                      <option value="5 Gbps">5 Gbps (High-Fiber)</option>
                      <option value="1 Gbps">1 Gbps (Standard Fiber)</option>
                      <option value="500 Mbps">500 Mbps (Standard Fast)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 mt-5">
                    <span className="text-[9px] font-tech text-white/40 uppercase tracking-widest">
                      VIP PASS REQUIRED
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setServerFormIsPremium(!serverFormIsPremium)
                      }
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        serverFormIsPremium ? "bg-amber-500" : "bg-neutral-800"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${
                          serverFormIsPremium
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowServerModal(false)}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white/60 hover:text-white rounded-xl text-[10px] font-tech font-bold uppercase cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingServer}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-tech font-black uppercase cursor-pointer shadow-[0_4px_12px_rgba(220,38,38,0.25)]"
                  >
                    {isSavingServer
                      ? "DEPLOYING NODE..."
                      : "INITIALIZE INSTANCE"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD/EDIT LIVE TV CHANNEL MODAL */}
      <AnimatePresence>
        {showLiveChannelModal && (
          <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto py-8 sm:py-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg luxury-glass border border-white/10 rounded-xxl p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
                <div className="flex items-center gap-2">
                  <Tv className="w-5 h-5 text-gold-base animate-pulse" />
                  <h3 className="text-sm font-serif font-black tracking-wider text-white uppercase">
                    {selectedLiveChannelForEdit
                      ? "RECONFIGURE BROADCAST RELAY"
                      : "PROVISION NEW STREAM RELAY"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLiveChannelModal(false)}
                  className="p-1 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSavingLiveChannel(true);
                  try {
                    const channelData: LiveChannel = {
                      id: channelIdInput.trim() || "ch_" + Date.now(),
                      name: channelNameInput.trim(),
                      logo: channelLogoInput.trim() || "📺",
                      currentProgram: channelCurrentProgramInput.trim(),
                      nextProgram: channelNextProgramInput.trim(),
                      category: channelCategoryInput as any,
                      viewerCount: channelViewerCountInput.trim() || "1.2K",
                      streamUrl: channelStreamUrlInput.trim(),
                      isPremium: channelIsPremiumInput,
                      upcomingTime:
                        channelUpcomingTimeInput.trim() || undefined,
                      upcomingStreamUrl:
                        channelUpcomingStreamUrlInput.trim() || undefined,
                      upcomingSegments: channelUpcomingSegments,
                    };
                    await saveLiveChannelToFirestore(channelData);
                    alert(
                      selectedLiveChannelForEdit
                        ? "Live channel updated successfully!"
                        : "Live channel created successfully!",
                    );
                    setShowLiveChannelModal(false);
                    loadLiveChannels();
                  } catch (error) {
                    console.error("Error saving Live channel:", error);
                    alert("Failed to save Live channel.");
                  } finally {
                    setIsSavingLiveChannel(false);
                  }
                }}
                className="flex flex-col gap-4 text-left"
              >
                {/* ID & Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      RELAY ID
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!selectedLiveChannelForEdit}
                      value={channelIdInput}
                      onChange={(e) =>
                        setChannelIdInput(e.target.value.replace(/\s+/g, ""))
                      }
                      placeholder="e.g. ch5"
                      className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base disabled:opacity-50 font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      STREAM GENRE / CATEGORY
                    </label>
                    <select
                      value={channelCategoryInput}
                      onChange={(e) =>
                        setChannelCategoryInput(e.target.value as any)
                      }
                      className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base cursor-pointer"
                    >
                      <option value="Movies">Movies / Cinema</option>
                      <option value="Sports">Sports / Live Athletics</option>
                      <option value="News">News / Global Feed</option>
                      <option value="Entertainment">Entertainment</option>
                    </select>
                  </div>
                </div>

                {/* Name & Logo */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      CHANNEL NAME
                    </label>
                    <input
                      type="text"
                      required
                      value={channelNameInput}
                      onChange={(e) => setChannelNameInput(e.target.value)}
                      placeholder="e.g. Elite Action HD"
                      className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      LOGO EMOJI / SYMBOL
                    </label>
                    <input
                      type="text"
                      required
                      value={channelLogoInput}
                      onChange={(e) => setChannelLogoInput(e.target.value)}
                      placeholder="e.g. 🍿"
                      className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white text-center focus:outline-none focus:border-gold-base"
                    />
                  </div>
                </div>

                {/* Stream URL */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                    MP4 / HLS STREAM INTERFACE (VIDEO URL)
                  </label>
                  <input
                    type="url"
                    required
                    value={channelStreamUrlInput}
                    onChange={(e) => setChannelStreamUrlInput(e.target.value)}
                    placeholder="https://assets.mixkit.co/videos/preview/..."
                    className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base font-mono"
                  />
                </div>

                {/* Current Program & Next Program */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      ACTIVE TRANSMISSION TITLE
                    </label>
                    <input
                      type="text"
                      required
                      value={channelCurrentProgramInput}
                      onChange={(e) =>
                        setChannelCurrentProgramInput(e.target.value)
                      }
                      placeholder="e.g. Midnight Action Blockbuster"
                      className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      UPCOMING SEGMENT
                    </label>
                    <input
                      type="text"
                      value={channelNextProgramInput}
                      onChange={(e) =>
                        setChannelNextProgramInput(e.target.value)
                      }
                      placeholder="e.g. Morning News Brief"
                      className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base"
                    />
                  </div>
                </div>

                {/* Upcoming segment scheduled time and dynamic link */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      UPCOMING SEGMENT TIME
                    </label>
                    <input
                      type="text"
                      value={channelUpcomingTimeInput}
                      onChange={(e) =>
                        setChannelUpcomingTimeInput(e.target.value)
                      }
                      placeholder="e.g. 06:30 PM"
                      className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base font-mono"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                      UPCOMING SEGMENT STREAM URL
                    </label>
                    <input
                      type="text"
                      value={channelUpcomingStreamUrlInput}
                      onChange={(e) =>
                        setChannelUpcomingStreamUrlInput(e.target.value)
                      }
                      placeholder="e.g. https://... (Dynamic Playback Link)"
                      className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base font-mono"
                    />
                  </div>
                </div>

                {/* Dynamic Schedule Guide Builder - Unlimited Upcoming Transmissions */}
                <div className="flex flex-col gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-tech text-gold-base uppercase tracking-widest font-extrabold">
                        UPCOMING TRANSMISSIONS GUIDE
                      </span>
                      <span className="text-[8px] font-mono text-white/30 uppercase tracking-wider">
                        Add unlimited future scheduled items with dynamic links
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setChannelUpcomingSegments((prev) => [
                          ...prev,
                          {
                            id:
                              "seg_" +
                              Date.now() +
                              "_" +
                              Math.random().toString(36).substr(2, 4),
                            title: "",
                            time: "",
                            streamUrl: "",
                          },
                        ]);
                      }}
                      className="border border-gold-base/30 text-gold-base font-semibold text-[9px] py-1.5 px-3 rounded-lg flex items-center gap-1 hover:bg-gold-base/5 hover:border-gold-base/50 transition-all cursor-pointer uppercase tracking-wider font-tech"
                    >
                      <Plus className="w-3 h-3" />
                      ADD TRANSMISSION
                    </button>
                  </div>

                  {channelUpcomingSegments.length === 0 ? (
                    <div className="py-6 text-center text-[10px] font-mono text-white/30 border border-dashed border-white/10 rounded-xl bg-black/20 uppercase tracking-wider">
                      No additional scheduled transmissions configured
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1">
                      {channelUpcomingSegments.map((segment, index) => (
                        <div
                          key={`admin-seg-${segment.id || index}-${index}`}
                          className="flex flex-col gap-2 p-3 bg-black/40 border border-white/5 rounded-xl relative group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest">
                              TRANSMISSION #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setChannelUpcomingSegments((prev) =>
                                  prev.filter((s) => s.id !== segment.id),
                                );
                              }}
                              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-all cursor-pointer"
                              title="Remove Segment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="flex flex-col gap-1">
                              <label className="text-[8px] font-mono text-white/40 uppercase tracking-wider">
                                Title
                              </label>
                              <input
                                type="text"
                                required
                                value={segment.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setChannelUpcomingSegments((prev) =>
                                    prev.map((s) =>
                                      s.id === segment.id
                                        ? { ...s, title: val }
                                        : s,
                                    ),
                                  );
                                }}
                                placeholder="e.g. UFC Main Event Fight"
                                className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold-base"
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[8px] font-mono text-white/40 uppercase tracking-wider">
                                Scheduled Time (e.g. 08:30 PM)
                              </label>
                              <input
                                type="text"
                                required
                                value={segment.time}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setChannelUpcomingSegments((prev) =>
                                    prev.map((s) =>
                                      s.id === segment.id
                                        ? { ...s, time: val }
                                        : s,
                                    ),
                                  );
                                }}
                                placeholder="e.g. 08:30 PM"
                                className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-gold-base font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-mono text-white/40 uppercase tracking-wider">
                              Dynamic Playback Stream URL
                            </label>
                            <input
                              type="text"
                              required
                              value={segment.streamUrl}
                              onChange={(e) => {
                                const val = e.target.value;
                                setChannelUpcomingSegments((prev) =>
                                  prev.map((s) =>
                                    s.id === segment.id
                                      ? { ...s, streamUrl: val }
                                      : s,
                                  ),
                                );
                              }}
                              placeholder="e.g. https://.../stream.mp4"
                              className="bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:outline-none focus:border-gold-base font-mono"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Viewer Count Mock/Initial */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-tech text-white/50 uppercase tracking-widest">
                    INITIAL / SIMULATED VIEWER COUNT
                  </label>
                  <input
                    type="text"
                    required
                    value={channelViewerCountInput}
                    onChange={(e) => setChannelViewerCountInput(e.target.value)}
                    placeholder="e.g. 2.4K"
                    className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-base font-mono"
                  />
                </div>

                {/* Premium Lock Checkbox */}
                <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex flex-col text-left max-w-[70%]">
                    <span className="font-bold text-white flex items-center gap-1 uppercase tracking-wide text-[10px] font-serif">
                      <Crown className="w-3.5 h-3.5 text-gold-base animate-pulse" />
                      PREMIUM LOCK ACCESS
                    </span>
                    <span className="text-[9px] text-white/40 leading-tight">
                      Restrict streaming feed to elite members with active VIP
                      status
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelIsPremiumInput}
                      onChange={(e) =>
                        setChannelIsPremiumInput(e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-base"></div>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowLiveChannelModal(false)}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white/60 hover:text-white rounded-xl text-[10px] font-tech font-bold uppercase cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingLiveChannel}
                    className="px-5 py-2.5 gold-gradient-bg text-black font-tech font-black uppercase cursor-pointer shadow-[0_4px_12px_rgba(212,175,55,0.25)] rounded-xl text-[10px]"
                  >
                    {isSavingLiveChannel
                      ? "ROUTING STREAM..."
                      : "DEPLOY STREAM RELAY"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. Single User Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUserToDelete(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md luxury-glass border border-red-500/20 rounded-xxl p-6 text-left shadow-[0_10px_50px_rgba(239,68,68,0.15)] flex flex-col gap-5 overflow-hidden"
            >
              {/* Top Warning Glow Bar */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />
              
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                  <AlertCircle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-black tracking-wider text-red-400 uppercase">
                    DELETE CLIENT DIRECTORY PROFILE?
                  </h3>
                  <p className="text-[10px] text-white/40 font-tech mt-0.5 uppercase tracking-widest animate-pulse">Wiping authentication access record</p>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-white/40 uppercase tracking-wider text-[9px] font-tech">User Name:</span>
                  <span className="text-white font-mono font-bold">{userToDelete.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                  <span className="text-white/40 uppercase tracking-wider text-[9px] font-tech">Email Address:</span>
                  <span className="text-white font-mono">{userToDelete.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                  <span className="text-white/40 uppercase tracking-wider text-[9px] font-tech">Membership Level:</span>
                  <span className={`font-tech font-extrabold text-[9px] px-2 py-0.5 rounded ${userToDelete.isPremium ? 'bg-gold-base/10 border border-gold-base/30 text-gold-light' : 'bg-neutral-800 text-white/40'}`}>
                    {userToDelete.isPremium ? 'VIP LICENSE' : 'STANDARD CLIENT'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-white/50 leading-relaxed">
                Warning: This operation is irreversible. All cached profiles, personalized watchlist indices, settings, and authorization history tied to this account will be permanently expunged from the active database cluster.
              </p>

              <div className="flex items-center justify-end gap-3 mt-1 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white/60 hover:text-white text-[10px] font-tech font-bold uppercase transition-all cursor-pointer"
                >
                  ABORT OPERATION
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 active:scale-95 text-white font-tech font-black text-[10px] tracking-widest transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_4px_12px_rgba(239,68,68,0.25)]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  PERMANENTLY ERASE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. All Users Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteAllUsersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteAllUsersModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md luxury-glass border border-red-500/30 rounded-xxl p-6 text-left shadow-[0_15px_60px_rgba(239,68,68,0.25)] flex flex-col gap-5 overflow-hidden"
            >
              {/* Critical Threat Visualizer Bar */}
              <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-red-600 via-rose-500 via-red-500 to-red-600 animate-pulse" />
              
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl">
                  <AlertCircle className="w-7 h-7 text-red-500 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-black tracking-wider text-red-500 uppercase">
                    MASS PURGE ENTIRE SYSTEM DIRECTORY?
                  </h3>
                  <p className="text-[10px] text-white/40 font-tech mt-0.5 uppercase tracking-widest animate-pulse">Critical system operation</p>
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-xs text-red-400 flex flex-col gap-1.5 leading-relaxed">
                <span className="font-tech font-extrabold uppercase tracking-wider text-[9px] text-red-400/80">CLUSTER THREAT ASSESSMENT:</span>
                <p>This action will initiate an automatic mass-purge loop. It will programmatically iterate through all client registration documents in Firestore and execute permanent deletion, excluding only your own active administrative profile.</p>
              </div>

              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex flex-col gap-2 text-[11px] text-white/50">
                <div className="flex justify-between items-center">
                  <span>Registered Accounts for Erasure:</span>
                  <span className="font-mono text-red-400 font-bold text-xs">{users.filter(u => u.id !== currentUser?.id).length} accounts</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2 text-[10px]">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-tech font-bold uppercase tracking-wider">Ready for Execution</span>
                </div>
              </div>

              <p className="text-[10.5px] text-white/40 leading-relaxed italic">
                By clicking "CONFIRM DEVASTATING PURGE", you acknowledge that this action cannot be recovered or reverted. All subscriber credentials, tier upgrades, and watchlists will be permanently deleted.
              </p>

              <div className="flex items-center justify-end gap-3 mt-1 pt-3 border-t border-white/5">
                <button
                  type="button"
                  disabled={isDeletingAllUsers}
                  onClick={() => setShowDeleteAllUsersModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white/60 hover:text-white text-[10px] font-tech font-bold uppercase transition-all cursor-pointer disabled:opacity-40"
                >
                  ABORT MASS OPERATIONS
                </button>
                <button
                  type="button"
                  disabled={isDeletingAllUsers}
                  onClick={handleConfirmDeleteAllUsers}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:brightness-110 active:scale-95 text-white font-tech font-black text-[10px] tracking-widest transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_5px_15px_rgba(239,68,68,0.35)] disabled:opacity-50"
                >
                  {isDeletingAllUsers ? (
                    <>
                      <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                      WIPING DATABASE...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 animate-pulse" />
                      CONFIRM DEVASTATING PURGE
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showBackupModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-neutral-950 border border-white/10 rounded-[32px] shadow-[0_25px_50px_rgba(212,175,55,0.15)] overflow-hidden flex flex-col my-8 text-white"
            >
              <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-gold-dark via-gold-base to-gold-light" />
              
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gold-base/10 border border-gold-base/20 rounded-xl">
                    <Database className="w-5 h-5 text-gold-base" />
                  </div>
                  <div>
                    <h3 className="text-md font-serif font-black tracking-wider text-gold-base uppercase">
                      CATALOG BACKUP & RESTORE CENTER
                    </h3>
                    <p className="text-[9px] text-white/40 font-tech mt-0.5 uppercase tracking-widest">
                      SYSTEM DATA BACKUP PROTOCOL • DYNAMIC CATALOG SELECTIONS
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBackupModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Bento Grid Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-y-auto max-h-[65vh]">
                
                {/* 1. EXPORT CONTAINER */}
                <div className="flex flex-col gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-xs font-serif font-black tracking-wider text-gold-base uppercase flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      1. SELECT & EXPORT
                    </h4>
                    <span className="text-[9px] font-mono text-white/40 uppercase">
                      Local Catalog: {movies.length} Items
                    </span>
                  </div>

                  {/* Filters and Search */}
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/30" />
                      <input
                        type="text"
                        placeholder="Search existing movies/series..."
                        value={backupSearchQuery}
                        onChange={(e) => setBackupSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-base font-sans"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      {(["all", "movie", "series"] as const).map((t) => (
                        <button
                          key={`b-filter-${t}`}
                          type="button"
                          onClick={() => setBackupTypeFilter(t)}
                          className={`px-3 py-1 rounded-lg text-[9px] font-tech font-extrabold uppercase tracking-widest transition-all cursor-pointer border ${
                            backupTypeFilter === t
                              ? "gold-gradient-bg text-black border-transparent"
                              : "bg-white/5 border-white/5 text-white/50 hover:text-white"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Existing items selector checklist */}
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 rounded-xl px-3 py-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = movies.filter((m) => {
                            const matchQuery = m.title.toLowerCase().includes(backupSearchQuery.toLowerCase());
                            const matchType = backupTypeFilter === "all" || m.type === backupTypeFilter;
                            return matchQuery && matchType;
                          });
                          const filteredIds = filtered.map(f => f.id);
                          const allSelected = filteredIds.every(id => selectedBackupItemIds.includes(id));
                          if (allSelected) {
                            setSelectedBackupItemIds(prev => prev.filter(id => !filteredIds.includes(id)));
                          } else {
                            setSelectedBackupItemIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                          }
                        }}
                        className="text-gold-base/80 hover:text-gold-base flex items-center gap-1.5 font-bold uppercase tracking-wide cursor-pointer font-tech text-left"
                      >
                        TOGGLE CURRENT FILTER VIEW
                      </button>
                      <span className="font-mono font-bold text-white/60">
                        {selectedBackupItemIds.length} Selected
                      </span>
                    </div>

                    <div className="border border-white/5 bg-black/45 rounded-xl p-2.5 flex flex-col gap-1.5 overflow-y-auto h-64 scrollbar-thin">
                      {movies
                        .filter((m) => {
                          const matchQuery = m.title.toLowerCase().includes(backupSearchQuery.toLowerCase());
                          const matchType = backupTypeFilter === "all" || m.type === backupTypeFilter;
                          return matchQuery && matchType;
                        })
                        .map((m) => {
                          const isSelected = selectedBackupItemIds.includes(m.id);
                          return (
                            <div
                              key={`backup-select-${m.id}`}
                              className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedBackupItemIds(prev => prev.filter(id => id !== m.id));
                                    } else {
                                      setSelectedBackupItemIds(prev => [...prev, m.id]);
                                    }
                                  }}
                                  className="text-white/60 hover:text-white transition-all cursor-pointer shrink-0"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-gold-base" />
                                  ) : (
                                    <Square className="w-4 h-4 text-white/20" />
                                  )}
                                </button>
                                
                                <img
                                  src={m.posterUrl}
                                  alt={m.title}
                                  className="w-7 h-10 object-cover rounded border border-white/10 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                
                                <div className="flex flex-col min-w-0 text-left">
                                  <span className="text-xs font-bold text-white truncate">{m.title}</span>
                                  <div className="flex items-center gap-1.5 text-[9px] font-tech text-white/45">
                                    <span className={`px-1 rounded-sm text-[8px] ${m.type === "series" ? "bg-purple-500/15 text-purple-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                                      {m.type === "series" ? "SERIES" : "MOVIE"}
                                    </span>
                                    <span>•</span>
                                    <span>{m.year}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setSelectedPreviewMovie(m)}
                                className="px-2 py-1 rounded text-[8px] font-tech uppercase tracking-widest text-gold-base bg-gold-base/5 border border-gold-base/20 hover:bg-gold-base/20 cursor-pointer shrink-0"
                              >
                                Preview Specs
                              </button>
                            </div>
                          );
                        })}
                      {movies.filter((m) => {
                        const matchQuery = m.title.toLowerCase().includes(backupSearchQuery.toLowerCase());
                        const matchType = backupTypeFilter === "all" || m.type === backupTypeFilter;
                        return matchQuery && matchType;
                      }).length === 0 && (
                        <div className="text-center py-10 text-white/30 text-xs italic">
                          No matching catalog specifications found.
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={selectedBackupItemIds.length === 0}
                    onClick={() => {
                      const itemsToExport = movies.filter(m => selectedBackupItemIds.includes(m.id));
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(itemsToExport, null, 2));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `eliteplex_catalog_backup_${Date.now()}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      document.body.removeChild(downloadAnchor);
                    }}
                    className="w-full mt-2 py-3 rounded-xl gold-gradient-bg text-black font-tech font-black text-[10px] tracking-widest uppercase transition-all hover:brightness-110 active:scale-95 disabled:opacity-30 cursor-pointer flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(212,175,55,0.2)] shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    DOWNLOAD CATALOG BACKUP JSON ({selectedBackupItemIds.length})
                  </button>
                </div>

                {/* 2. IMPORT CONTAINER */}
                <div className="flex flex-col gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-xs font-serif font-black tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5" />
                      2. UPLOAD & RESTORE
                    </h4>
                    <span className="text-[9px] font-mono text-emerald-400/70 uppercase">
                      Verified Restore System
                    </span>
                  </div>

                  {/* Upload Box Trigger */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById('admin-catalog-modal-file-restore-input')?.click();
                      }}
                      className="w-full h-24 border border-dashed border-emerald-500/30 hover:border-emerald-400/50 rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                    >
                      <PlusCircle className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-all" />
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-tech font-bold uppercase tracking-widest text-emerald-400">
                          LOAD BACKUP FILE
                        </span>
                        <span className="text-[8px] text-white/30 uppercase mt-0.5">
                          Drag & drop or click to upload backup.json
                        </span>
                      </div>
                    </button>
                    <input
                      id="admin-catalog-modal-file-restore-input"
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
                            const items = Array.isArray(parsed) ? parsed : [parsed];
                            const validated = items.filter(item => item && item.title).map(item => ({
                              id: item.id || `custom_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                              title: item.title,
                              type: item.type || "movie",
                              year: Number(item.year || new Date().getFullYear()),
                              runtime: item.runtime || (item.type === "series" ? "1 Season" : "2h 00m"),
                              rating: Number(item.rating || 7.5),
                              genres: Array.isArray(item.genres) ? item.genres : (item.genre ? [item.genre] : ["Cinematic"]),
                              overview: item.overview || "No overview provided.",
                              posterUrl: item.posterUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80",
                              backdropUrl: item.backdropUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
                              isPremium: !!item.isPremium,
                              isTrending: !!item.isTrending,
                              videoUrl: item.videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4",
                              cast: Array.isArray(item.cast) ? item.cast : [],
                              reviews: Array.isArray(item.reviews) ? item.reviews : [],
                              createdAt: item.createdAt || new Date().toISOString()
                            }));
                            setPreviewImportItems(validated);
                            setSelectedImportItemIds(validated.map(v => v.id));
                          } catch (err) {
                            alert("Invalid backup file. Ensure standard JSON format is uploaded.");
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </div>

                  {/* Loaded Backup Checklist */}
                  <div className="flex flex-col gap-2 flex-1">
                    {previewImportItems.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 rounded-xl px-3 py-2 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const allSel = previewImportItems.length === selectedImportItemIds.length;
                              if (allSel) {
                                setSelectedImportItemIds([]);
                              } else {
                                setSelectedImportItemIds(previewImportItems.map(p => p.id));
                              }
                            }}
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 font-bold uppercase tracking-wide cursor-pointer font-tech"
                          >
                            SELECT / DESELECT ALL LOADED ITEMS
                          </button>
                          <span className="font-mono font-bold text-emerald-400">
                            {selectedImportItemIds.length} Loaded
                          </span>
                        </div>

                        <div className="border border-white/5 bg-black/45 rounded-xl p-2.5 flex flex-col gap-1.5 overflow-y-auto h-36 scrollbar-thin">
                          {previewImportItems.map((m) => {
                            const isSelected = selectedImportItemIds.includes(m.id);
                            return (
                              <div
                                key={`import-select-${m.id}`}
                                className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedImportItemIds(prev => prev.filter(id => id !== m.id));
                                      } else {
                                        setSelectedImportItemIds(prev => [...prev, m.id]);
                                      }
                                    }}
                                    className="text-white/60 hover:text-white transition-all cursor-pointer shrink-0"
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <Square className="w-4 h-4 text-white/20" />
                                    )}
                                  </button>
                                  
                                  <img
                                    src={m.posterUrl}
                                    alt={m.title}
                                    className="w-7 h-10 object-cover rounded border border-white/10 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  
                                  <div className="flex flex-col min-w-0 text-left">
                                    <span className="text-xs font-bold text-white truncate">{m.title}</span>
                                    <div className="flex items-center gap-1.5 text-[9px] font-tech text-white/45">
                                      <span className={`px-1 rounded-sm text-[8px] ${m.type === "series" ? "bg-purple-500/15 text-purple-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                                        {m.type === "series" ? "SERIES" : "MOVIE"}
                                      </span>
                                      <span>•</span>
                                      <span>{m.year}</span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setSelectedPreviewMovie(m)}
                                  className="px-2 py-1 rounded text-[8px] font-tech uppercase tracking-widest text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer shrink-0"
                                >
                                  Preview Specs
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          disabled={selectedImportItemIds.length === 0}
                          onClick={() => {
                            const itemsToRestore = previewImportItems.filter(item => selectedImportItemIds.includes(item.id));
                            itemsToRestore.forEach(item => {
                              onAddMovie(item);
                            });
                            alert(`Successfully restored ${itemsToRestore.length} specifications into database catalog!`);
                            setPreviewImportItems([]);
                            setSelectedImportItemIds([]);
                            setShowBackupModal(false);
                          }}
                          className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:brightness-110 active:scale-95 text-white font-tech font-black text-[10px] tracking-widest uppercase transition-all disabled:opacity-30 cursor-pointer flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(16,185,129,0.2)] shrink-0"
                        >
                          <Check className="w-4 h-4" />
                          CONFIRM DATA RESTORE ({selectedImportItemIds.length})
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 border border-white/5 bg-black/30 rounded-2xl h-64 text-center px-4">
                        <Database className="w-8 h-8 text-white/10 animate-pulse mb-3" />
                        <span className="text-[10px] text-white/50 font-tech uppercase tracking-wider">No backup package loaded</span>
                        <p className="text-[9px] text-white/30 max-w-xs mt-1 uppercase tracking-widest leading-relaxed">
                          Upload your backup.json file to trigger instant metadata validation, selective imports, and specifications checklists.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Specification Preview popover ("Ek movie open হবে select movie & series") */}
              {selectedPreviewMovie && (
                <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-[80] flex items-center justify-center p-6">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative max-w-lg w-full bg-neutral-900 border border-white/10 p-6 rounded-3xl shadow-2xl flex flex-col gap-4 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPreviewMovie(null)}
                      className="absolute right-4 top-4 w-7 h-7 bg-white/5 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex gap-4">
                      <img
                        src={selectedPreviewMovie.posterUrl}
                        alt={selectedPreviewMovie.title}
                        className="w-24 h-36 object-cover rounded-xl border border-white/10 shrink-0 shadow-lg shadow-black/50"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-tech font-bold uppercase w-fit ${selectedPreviewMovie.type === "series" ? "bg-purple-500/15 text-purple-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                          {selectedPreviewMovie.type === "series" ? "SERIES SPECIFICATIONS" : "MOVIE SPECIFICATIONS"}
                        </span>
                        <h4 className="text-md font-serif font-black text-white truncate uppercase tracking-wide mt-1">
                          {selectedPreviewMovie.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-white/40 mt-1">
                          <span>YEAR: {selectedPreviewMovie.year}</span>
                          <span>•</span>
                          <span>RUNTIME: {selectedPreviewMovie.runtime}</span>
                          <span>•</span>
                          <span>RATING: {selectedPreviewMovie.rating}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedPreviewMovie.genres?.map((g, i) => (
                            <span key={`prev-genre-${g}-${i}`} className="px-1.5 py-0.5 rounded text-[8px] font-tech uppercase tracking-wider bg-white/5 border border-white/5 text-white/60">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                      <span className="text-[8px] font-tech text-white/40 uppercase tracking-widest">Story Outline / Synopsis:</span>
                      <p className="text-[10.5px] leading-relaxed text-white/70 line-clamp-4">
                        {selectedPreviewMovie.overview || "No synopsis recorded."}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                      <span className="text-[8px] font-tech text-white/40 uppercase tracking-widest">Digital Specifications Stream Link:</span>
                      <span className="text-[9px] font-mono text-gold-base break-all bg-black/40 p-2 rounded-lg border border-white/5">
                        {selectedPreviewMovie.videoUrl}
                      </span>
                    </div>

                    <div className="flex justify-end mt-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => setSelectedPreviewMovie(null)}
                        className="px-4 py-2 bg-gold-base hover:bg-gold-light text-black font-tech font-extrabold text-[9px] tracking-wider rounded-xl transition-all cursor-pointer"
                      >
                        DISMISS PREVIEW
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5-Button Bottom Nav Bar for Admin Panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 py-3 px-6 z-[55] flex justify-around items-center max-w-lg mx-auto md:max-w-xl rounded-t-3xl shadow-[0_-10px_35px_rgba(0,0,0,0.9)]">
        {[
          { id: "analytics", icon: Activity },
          { id: "catalog", icon: Film },
          { id: "livetv", icon: Tv },
          { id: "notifications", icon: Bell },
          { id: "users", icon: Users },
        ].map((btn) => {
          const Icon = btn.icon;
          const isActive = activeTab === btn.id;
          return (
            <motion.button
              key={`bottom-nav-${btn.id}`}
              onClick={() => {
                setActiveTab(btn.id as any);
                // If switching to users tab, default to premium sub-tab so they see user lists/upgrades cleanly
                if (btn.id === "users") {
                  setUsersSubTab("all");
                }
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="flex flex-col items-center justify-center cursor-pointer relative py-2.5 px-4 transition-all group focus:outline-none"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-active-indicator"
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-gold-base rounded-full shadow-[0_0_12px_#d4af37]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <motion.div
                animate={{
                  scale: isActive ? 1.15 : 1,
                  y: isActive ? -1 : 0
                }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <Icon
                  className={`w-5.5 h-5.5 transition-all duration-300 ${
                    isActive ? "text-gold-base drop-shadow-[0_0_10px_rgba(212,175,55,0.75)]" : "text-white/40 group-hover:text-white/80"
                  }`}
                />
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
