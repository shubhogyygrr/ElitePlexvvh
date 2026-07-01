import { Movie, LiveChannel, Episode, UserProfile } from '../types';

export const GENRES = [
  'All',
  'Cinematic',
  'Action',
  'Sci-Fi',
  'Drama',
  'Thriller',
  'Mystery',
  'Horror'
];

export const MOCK_CAST = [
  { id: 'c1', name: 'Timothée Chalamet', character: 'Paul Atreides', avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80' },
  { id: 'c2', name: 'Zendaya', character: 'Chani', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
  { id: 'c3', name: 'Cillian Murphy', character: 'J. Robert Oppenheimer', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { id: 'c4', name: 'Harold Perrineau', character: 'Boyd Stevens', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' },
  { id: 'c5', name: 'Rebecca Ferguson', character: 'Lady Jessica', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
  { id: 'c6', name: 'Florence Pugh', character: 'Princess Irulan', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80' }
];

export const MOCK_REVIEWS = [
  { id: 'r1', author: 'CinemaMaster', rating: 9, content: 'A visually arresting masterpiece that demands to be experienced in the highest quality. Absolutely outstanding cinematography and sound.', date: '2 days ago' },
  { id: 'r2', author: 'Sophia G.', rating: 10, content: 'Elite Plex delivers this in breathtaking HDR gold. The depth of the dark scenes combined with the score is legendary.', date: '1 week ago' },
  { id: 'r3', author: 'Marcus_Reviewer', rating: 8, content: 'Excellent pacing and strong performances all around. Captivating from the first frame to the last.', date: '3 weeks ago' }
];

export const INITIAL_MOVIES: Movie[] = [
  {
    id: 'm1',
    title: 'Over Your Dead Body',
    type: 'movie',
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    rating: 8.8,
    year: 2026,
    runtime: '2h 15m',
    genres: ['Cinematic', 'Thriller', 'Mystery'],
    overview: 'A chilling psychological puzzle where the thin line between reality and the spectral theater of the mind dissolves. A masterclass in luxury dark thriller design.',
    isPremium: true,
    isFeatured: true,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4',
    cast: [MOCK_CAST[0], MOCK_CAST[1], MOCK_CAST[4]],
    reviews: MOCK_REVIEWS,
    createdAt: '2026-06-25T12:00:00.000Z'
  },
  {
    id: 'm2',
    title: 'Obsession',
    type: 'movie',
    posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=500&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    rating: 7.9,
    year: 2026,
    runtime: '1h 58m',
    genres: ['Cinematic', 'Drama', 'Mystery'],
    overview: 'An intense cinematic exploration of ambition, power, and the inescapable gravitational pull of desire. Winner of the Elite Gold Palm.',
    isPremium: false,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-under-the-traffic-lights-in-a-rainy-night-42037-large.mp4',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-under-the-traffic-lights-in-a-rainy-night-42037-large.mp4',
    cast: [MOCK_CAST[2], MOCK_CAST[1], MOCK_CAST[5]],
    reviews: [MOCK_REVIEWS[0]],
    createdAt: '2026-06-24T09:00:00.000Z'
  },
  {
    id: 'm3',
    title: 'Peddi',
    type: 'movie',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=500&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    rating: 5.9,
    year: 2026,
    runtime: '2h 32m',
    genres: ['Action', 'Drama'],
    overview: 'In a forgotten ancient empire, an unstoppable warrior embarks on an odyssey to reclaim his ancestral staff and rewrite history with sheer force.',
    isPremium: true,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-burning-fire-sparks-texture-background-40748-large.mp4',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-burning-fire-sparks-texture-background-40748-large.mp4',
    cast: [MOCK_CAST[3], MOCK_CAST[0], MOCK_CAST[2]],
    reviews: [MOCK_REVIEWS[1], MOCK_REVIEWS[2]],
    createdAt: '2026-06-28T11:00:00.000Z'
  },
  {
    id: 'm4',
    title: 'FROM',
    type: 'series',
    posterUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=500&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=1200&q=80',
    rating: 8.5,
    year: 2022,
    runtime: '3 Seasons',
    genres: ['Mystery', 'Horror', 'Sci-Fi'],
    overview: 'Unravel the mystery of a nightmarish city in middle America that traps everyone who enters. As the unwilling residents fight to keep a sense of normalcy and search for a way out, they must also survive the threats of the surrounding forest.',
    isPremium: true,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-mysterious-foggy-pine-forest-at-dusk-41695-large.mp4',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-mysterious-foggy-pine-forest-at-dusk-41695-large.mp4',
    cast: [MOCK_CAST[3], MOCK_CAST[4]],
    reviews: MOCK_REVIEWS,
    seasonsCount: 3,
    createdAt: '2026-06-26T08:00:00.000Z'
  },
  {
    id: 'm5',
    title: 'Off Campus',
    type: 'series',
    posterUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=500&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
    rating: 9.0,
    year: 2026,
    runtime: '1 Season',
    genres: ['Drama', 'Cinematic'],
    overview: 'A premium coming-of-age drama detailing the luxury high-stakes rivalries, romances, and secrets of elite college hockey stars.',
    isPremium: false,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-lights-on-stadium-field-during-a-foggy-night-42211-large.mp4',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-lights-on-stadium-field-during-a-foggy-night-42211-large.mp4',
    cast: [MOCK_CAST[1], MOCK_CAST[0], MOCK_CAST[5]],
    reviews: [MOCK_REVIEWS[0]],
    seasonsCount: 1,
    createdAt: '2026-06-27T15:30:00.000Z'
  },
  {
    id: 'm6',
    title: 'Stellar Odyssey',
    type: 'movie',
    posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=500&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80',
    rating: 9.3,
    year: 2025,
    runtime: '2h 45m',
    genres: ['Sci-Fi', 'Cinematic', 'Drama'],
    overview: 'Across interstellar limits and temporal loops, a father and daughter race against planetary decay to establish an oasis for humanity.',
    isPremium: true,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-constellations-41984-large.mp4',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-constellations-41984-large.mp4',
    cast: [MOCK_CAST[2], MOCK_CAST[1], MOCK_CAST[4]],
    reviews: MOCK_REVIEWS,
    createdAt: '2026-06-22T14:00:00.000Z'
  },
  {
    id: 'm7',
    title: 'The Golden Empire',
    type: 'series',
    posterUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=500&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    rating: 8.9,
    year: 2024,
    runtime: '2 Seasons',
    genres: ['Drama', 'Cinematic'],
    overview: 'Deep dive into royal lineages, gold-mining cartels, and the global power struggles that secure the throne of the highest financial empire.',
    isPremium: true,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-golden-particle-waves-background-40742-large.mp4',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-golden-particle-waves-background-40742-large.mp4',
    cast: [MOCK_CAST[3], MOCK_CAST[5], MOCK_CAST[0]],
    reviews: [MOCK_REVIEWS[1]],
    seasonsCount: 2,
    createdAt: '2026-06-20T10:00:00.000Z'
  }
];

export const MOCK_EPISODES: Record<string, Episode[]> = {
  'm4': [
    {
      id: 'ep1',
      title: 'Pilot: The Red Road',
      episodeNumber: 1,
      seasonNumber: 1,
      duration: '52m',
      thumbnailUrl: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=300&q=80',
      overview: 'A family vacation takes a nightmarish detour when they get trapped in a mysterious town that is physically inescapable.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-mysterious-foggy-pine-forest-at-dusk-41695-large.mp4'
    },
    {
      id: 'ep2',
      title: 'The Forest Whispers',
      episodeNumber: 2,
      seasonNumber: 1,
      duration: '48m',
      thumbnailUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=300&q=80',
      overview: 'As darkness falls, Sheriff Boyd establishes defense procedures against the terrifying creatures emerging from the woods.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-mysterious-foggy-pine-forest-at-dusk-41695-large.mp4'
    },
    {
      id: 'ep3',
      title: 'Talisman Sanctuary',
      episodeNumber: 3,
      seasonNumber: 1,
      duration: '50m',
      thumbnailUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=300&q=80',
      overview: 'Tabitha uncovers ancient geometric structures in the basement that might provide temporary defense locks.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-mysterious-foggy-pine-forest-at-dusk-41695-large.mp4'
    }
  ],
  'm5': [
    {
      id: 'ep5_1',
      title: 'Premium Face-off',
      episodeNumber: 1,
      seasonNumber: 1,
      duration: '45m',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=300&q=80',
      overview: 'Tensions peak when top scorer Leo encounters a secret rival off campus, changing the stakes of the championship.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-lights-on-stadium-field-during-a-foggy-night-42211-large.mp4'
    },
    {
      id: 'ep5_2',
      title: 'Midnight Overtime',
      episodeNumber: 2,
      seasonNumber: 1,
      duration: '47m',
      thumbnailUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=300&q=80',
      overview: 'A late-night celebration turns into an interrogation after a vital piece of playbook material goes missing.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-lights-on-stadium-field-during-a-foggy-night-42211-large.mp4'
    }
  ],
  'm7': [
    {
      id: 'ep7_1',
      title: 'Liquid Gold Flow',
      episodeNumber: 1,
      seasonNumber: 1,
      duration: '58m',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
      overview: 'The ascension of a young heir triggers unexpected backlashes from existing board members.',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-golden-particle-waves-background-40742-large.mp4'
    }
  ]
};

export const MOCK_CHANNELS: LiveChannel[] = [
  {
    id: 'ch1',
    name: 'ELITE GOLD ACTION',
    logo: '🏆',
    currentProgram: 'Over Your Dead Body: Exclusive Live Q&A',
    nextProgram: 'Dune: Behind the Golden Scenes',
    category: 'Movies',
    viewerCount: '14.2K',
    streamUrl: 'https://assets.mixkit.co/videos/preview/mixkit-burning-fire-sparks-texture-background-40748-large.mp4'
  },
  {
    id: 'ch2',
    name: 'Plex Grand Prix Live',
    logo: '🏎️',
    currentProgram: 'Monaco Premium Qualifying Rounds',
    nextProgram: 'F1 Post-Race Studio Analysis',
    category: 'Sports',
    viewerCount: '38.9K',
    streamUrl: 'https://assets.mixkit.co/videos/preview/mixkit-under-the-traffic-lights-in-a-rainy-night-42037-large.mp4'
  },
  {
    id: 'ch3',
    name: 'CineMinds Global News',
    logo: '🌐',
    currentProgram: 'Cannes Film Festival Direct Broadcast',
    nextProgram: 'The Art of Cinematic Lighting',
    category: 'News',
    viewerCount: '8.5K',
    streamUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cinematic-shot-of-the-city-lights-at-night-42220-large.mp4'
  },
  {
    id: 'ch4',
    name: 'VIP Premium Comedy',
    logo: '🍿',
    currentProgram: 'Elite Stand-up Specials',
    nextProgram: 'Midnight Satire Live',
    category: 'Entertainment',
    viewerCount: '5.1K',
    streamUrl: 'https://assets.mixkit.co/videos/preview/mixkit-lights-on-stadium-field-during-a-foggy-night-42211-large.mp4'
  }
];

export const INITIAL_PROFILES: UserProfile[] = [
  { id: 'p1', name: 'Premium Chief', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', isPremium: true },
  { id: 'p2', name: 'Guest Cinephile', avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80', isPremium: false },
  { id: 'p3', name: 'Elite Family', avatarUrl: 'https://images.unsplash.com/photo-1527983359383-4758693f760c?auto=format&fit=crop&w=150&q=80', isPremium: true }
];

export const MOCK_ANALYTICS = {
  activeUsers: '148,290',
  currentStreams: '41,085',
  premiumRatio: '74%',
  totalHoursWatched: '1.2M hrs',
  dailyStreamsData: [
    { day: 'Mon', value: 34000 },
    { day: 'Tue', value: 38000 },
    { day: 'Wed', value: 45000 },
    { day: 'Thu', value: 42000 },
    { day: 'Fri', value: 58000 },
    { day: 'Sat', value: 72000 },
    { day: 'Sun', value: 68000 }
  ],
  categoryShare: [
    { name: 'Cinematic Thrillers', percent: '35%' },
    { name: 'Sci-Fi', percent: '28%' },
    { name: 'Premium Series', percent: '22%' },
    { name: 'Live Sports', percent: '15%' }
  ]
};
