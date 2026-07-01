export interface PermissionItem {
  id: string;
  name: string;
  description: string;
  category: string;
  iconName: string; // Map to a lucide-react icon name dynamically
  status: 'granted' | 'denied' | 'pending';
  requiredCount: number; // For mapping pages/actions
}

export const ALL_PERMISSIONS: PermissionItem[] = [
  // 1. Core App / Sign Up Permissions (5 items)
  {
    id: 'core-storage',
    name: 'Secure Local Storage Access',
    description: 'Required to cache cinematic files, trailers, and database assets.',
    category: 'Core App',
    iconName: 'HardDrive',
    status: 'pending',
    requiredCount: 5
  },
  {
    id: 'core-notifications',
    name: 'Push Notification Dispatcher',
    description: 'Enables alerts for new episodes, admin broadcast messages, and premium events.',
    category: 'Core App',
    iconName: 'Bell',
    status: 'pending',
    requiredCount: 5
  },
  {
    id: 'core-bandwidth',
    name: 'Network Bandwidth Optimizer',
    description: 'Measures connection speeds to select the optimal high-fidelity stream.',
    category: 'Core App',
    iconName: 'Radio',
    status: 'pending',
    requiredCount: 5
  },
  {
    id: 'core-drm',
    name: 'Hardware DRM Identity Check',
    description: 'Verifies hardware certificates for protected 4K Ultra HD video playback.',
    category: 'Core App',
    iconName: 'Cpu',
    status: 'pending',
    requiredCount: 5
  },
  {
    id: 'core-audio-driver',
    name: 'Dolby Atmos Audio Decoder',
    description: 'Injects professional multi-channel spatial audio decoders.',
    category: 'Core App',
    iconName: 'Volume2',
    status: 'pending',
    requiredCount: 5
  },

  // 2. Movie Details Permissions (4 items)
  {
    id: 'movie-backdrop',
    name: 'Cinema Backdrop Synchronizer',
    description: 'Loads high-definition backdrop artwork and matching color palettes.',
    category: 'Movie Details',
    iconName: 'Image',
    status: 'pending',
    requiredCount: 4
  },
  {
    id: 'movie-resolution',
    name: 'Dynamic Bitrate Adaptation',
    description: 'Scales viewport parameters seamlessly during high-movement scenes.',
    category: 'Movie Details',
    iconName: 'Zap',
    status: 'pending',
    requiredCount: 4
  },
  {
    id: 'movie-pip',
    name: 'Picture-in-Picture Controller',
    description: 'Allows keeping a floating movie thumb running while browsing other series.',
    category: 'Movie Details',
    iconName: 'Tv',
    status: 'pending',
    requiredCount: 4
  },
  {
    id: 'movie-cast',
    name: 'Wireless Playback Transmitter',
    description: 'Discovers and streams content to Smart TVs, Chromecasts, and AirPlay devices.',
    category: 'Movie Details',
    iconName: 'Radio',
    status: 'pending',
    requiredCount: 4
  },

  // 3. Series Details Permissions (5 items)
  {
    id: 'series-continuous',
    name: 'Binge-Watch Queue Handler',
    description: 'Handles background queue pre-loading for uninterrupted multi-episode viewing.',
    category: 'Series Details',
    iconName: 'Tv',
    status: 'pending',
    requiredCount: 5
  },
  {
    id: 'series-progress',
    name: 'Episode Progress Sync',
    description: 'Maintains granular progress state down to the exact frame for continuous episodes.',
    category: 'Series Details',
    iconName: 'Bookmark',
    status: 'pending',
    requiredCount: 5
  },
  {
    id: 'series-hevc',
    name: 'HEVC Stream Decoder',
    description: 'Launches high-efficiency H.265 decoders to save up to 40% bandwidth on serials.',
    category: 'Series Details',
    iconName: 'Cpu',
    status: 'pending',
    requiredCount: 5
  },
  {
    id: 'series-subtitles',
    name: 'Multi-Language Caption Bridge',
    description: 'Retrieves translation files for global series in real-time.',
    category: 'Series Details',
    iconName: 'Activity',
    status: 'pending',
    requiredCount: 5
  },
  {
    id: 'series-prefetch',
    name: 'Intelligent Episode Pre-Fetch',
    description: 'Pre-buffers the next serial chapter while you are watching the current one.',
    category: 'Series Details',
    iconName: 'Download',
    status: 'pending',
    requiredCount: 5
  },

  // 4. Movie Player Permissions (3 items)
  {
    id: 'player-hifi-audio',
    name: 'Ultra Hi-Fi Audio Bridge',
    description: 'Enables raw multi-channel audio path mapping to bypass basic sound layers.',
    category: 'Movie Player',
    iconName: 'Volume2',
    status: 'pending',
    requiredCount: 3
  },
  {
    id: 'player-gpu',
    name: 'Direct GPU Acceleration',
    description: 'Leverages hardware graphics cards for smooth 60fps cinematic playback.',
    category: 'Movie Player',
    iconName: 'Cpu',
    status: 'pending',
    requiredCount: 3
  },
  {
    id: 'player-sleep',
    name: 'Display Sleep Inhibitor',
    description: 'Prevents the browser and monitor from going dark during longer films.',
    category: 'Movie Player',
    iconName: 'Tv',
    status: 'pending',
    requiredCount: 3
  },

  // 5. Series Player Permissions (2 items)
  {
    id: 'player-interactive-sub',
    name: 'Dynamic Subtitle Renderer',
    description: 'Overlays custom vector font layers over the video renderer.',
    category: 'Series Player',
    iconName: 'Activity',
    status: 'pending',
    requiredCount: 2
  },
  {
    id: 'player-keepalive',
    name: 'Binge Tunnel Keep-Alive',
    description: 'Keeps connection channels open to bypass standard router idle-disconnects.',
    category: 'Series Player',
    iconName: 'Zap',
    status: 'pending',
    requiredCount: 2
  },

  // 6. Download Movie Permissions (3 items)
  {
    id: 'download-readwrite',
    name: 'Offline Media Cache Storage',
    description: 'Grants raw filesystem blocks to store offline encrypted movies.',
    category: 'Download Movie',
    iconName: 'HardDrive',
    status: 'pending',
    requiredCount: 3
  },
  {
    id: 'download-background',
    name: 'Background Service Daemon',
    description: 'Allows movie downloads to continue operating when you minimize the browser.',
    category: 'Download Movie',
    iconName: 'Activity',
    status: 'pending',
    requiredCount: 3
  },
  {
    id: 'download-battery',
    name: 'Power Saver Exclusion Lock',
    description: 'Bypasses system CPU throttling to download cinematic contents faster.',
    category: 'Download Movie',
    iconName: 'Zap',
    status: 'pending',
    requiredCount: 3
  },

  // 7. Download Page Permissions (2 items)
  {
    id: 'downloads-index',
    name: 'Storage Partition Indexer',
    description: 'Maintains catalog mappings for all downloaded movies for fast local lookup.',
    category: 'Download Page',
    iconName: 'HardDrive',
    status: 'pending',
    requiredCount: 2
  },
  {
    id: 'downloads-integrity',
    name: 'Cryptographic Corruption Guard',
    description: 'Scans downloaded video files to verify blocks haven\'t been corrupted.',
    category: 'Download Page',
    iconName: 'Shield',
    status: 'pending',
    requiredCount: 2
  },

  // 8. Subscribe Page Permissions (3 items)
  {
    id: 'subscribe-gateway',
    name: 'Secure Payment Processor Proxy',
    description: 'Safely pipes billing operations through encrypted external modules.',
    category: 'Subscribe Page',
    iconName: 'CreditCard',
    status: 'pending',
    requiredCount: 3
  },
  {
    id: 'subscribe-biometrics',
    name: 'Biometric Authenticator Connection',
    description: 'Allows verification of premium checkout using face/fingerprint hardware.',
    category: 'Subscribe Page',
    iconName: 'Fingerprint',
    status: 'pending',
    requiredCount: 3
  },
  {
    id: 'subscribe-geo',
    name: 'Regional Billing Country Lookup',
    description: 'Analyzes connection point to calculate correct national VAT and currencies.',
    category: 'Subscribe Page',
    iconName: 'MapPin',
    status: 'pending',
    requiredCount: 3
  }
];

export function getSavedPermissions(): PermissionItem[] {
  try {
    const raw = localStorage.getItem('elite_plex_permissions');
    if (raw) {
      const parsed = JSON.parse(raw) as PermissionItem[];
      // Sync any newly added permissions in code to user storage
      const merged = ALL_PERMISSIONS.map(p => {
        const found = parsed.find(item => item.id === p.id);
        return found ? { ...p, status: found.status } : p;
      });
      return merged;
    }
  } catch (err) {
    console.error("Failed to fetch permissions from storage:", err);
  }
  return [...ALL_PERMISSIONS];
}

export function savePermissions(permissions: PermissionItem[]) {
  try {
    localStorage.setItem('elite_plex_permissions', JSON.stringify(permissions));
  } catch (err) {
    console.error("Failed to save permissions to storage:", err);
  }
}

export function grantAllPermissions(): PermissionItem[] {
  const allGranted = ALL_PERMISSIONS.map(p => ({ ...p, status: 'granted' as const }));
  savePermissions(allGranted);
  return allGranted;
}
