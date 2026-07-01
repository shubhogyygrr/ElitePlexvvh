export interface Movie {
  id: string;
  title: string;
  type: 'movie' | 'series';
  posterUrl: string;
  backdropUrl: string;
  rating: number;
  year: number;
  runtime: string;
  genres: string[];
  overview: string;
  isPremium: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  videoUrl: string;
  trailerUrl?: string;
  cast: CastMember[];
  reviews: Review[];
  seasonsCount?: number;
  titleLogoUrl?: string;
  seasons?: Season[];
  createdAt?: string;
}

export interface CastMember {
  id: string;
  name: string;
  character: string;
  avatarUrl: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  content: string;
  date: string;
}

export interface Season {
  id: string;
  seasonNumber: number;
  title: string;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  title: string;
  episodeNumber: number;
  seasonNumber: number;
  duration: string;
  thumbnailUrl: string;
  overview: string;
  videoUrl: string;
}

export interface ScheduledSegment {
  id: string;
  title: string;
  time: string;
  streamUrl: string;
}

export interface LiveChannel {
  id: string;
  name: string;
  logo: string;
  currentProgram: string;
  nextProgram: string;
  category: 'Sports' | 'Movies' | 'News' | 'Entertainment';
  viewerCount: string;
  streamUrl: string;
  isPremium?: boolean;
  upcomingTime?: string;
  upcomingStreamUrl?: string;
  upcomingSegments?: ScheduledSegment[];
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
  isPremium: boolean;
  isAdmin?: boolean;
  email?: string;
  isBanned?: boolean;
  premiumExpiry?: number;
  autoRenew?: boolean;
}

export interface DownloadItem {
  id: string;
  title: string;
  type: 'movie' | 'episode';
  posterUrl: string;
  progress: number;
  size: string;
  status: 'downloading' | 'completed' | 'queued' | 'paused';
  addedAt?: number;
  videoUrl?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  isRead: boolean;
  movieId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface MovieRequest {
  id: string;
  title: string;
  type: 'movie' | 'series';
  requestedBy: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  notes?: string;
}

export interface SubscribeRequest {
  id: string;
  name: string;
  email: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  requestNotes?: string;
}

export interface RedeemCode {
  id: string;
  code: string;
  type: 'premium' | 'movie' | 'series';
  status: 'active' | 'used';
  premiumDays?: number;
  targetId?: string; // Movie/Series ID to unlock if type is movie/series
  targetTitle?: string; // Visual name of Movie/Series
  usedBy?: string; // User ID
  usedByEmail?: string;
  usedAt?: string;
  createdAt: string;
}

export interface StreamingServer {
  id: string;
  name: string;
  url: string;
  country: string;
  status: 'online' | 'offline' | 'maintenance';
  latency: number;
  isPremium: boolean;
  speed: string;
  load: number;
}

export interface CustomDomain {
  id: string;
  domain: string;
  status: 'active' | 'pending' | 'error';
  sslStatus: 'active' | 'pending' | 'none';
  customAccent?: string;
  siteName?: string;
  createdAt: string;
}

export function isNewMovie(movie: { createdAt?: string }): boolean {
  if (!movie.createdAt) return false;
  try {
    const createdDate = new Date(movie.createdAt).getTime();
    const currentDate = new Date().getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    return currentDate - createdDate <= sevenDaysInMs;
  } catch {
    return false;
  }
}

export interface SupportMessage {
  id: string;
  sender: 'user' | 'admin' | 'system';
  text: string;
  timestamp: string;
}

export interface SupportChat {
  id: string;
  title: string;
  userEmail: string;
  userName: string;
  status: 'open' | 'closed';
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

