import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  writeBatch, 
  getDoc,
  query,
  where,
  addDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Movie, Episode, UserProfile, MovieRequest, SubscribeRequest, RedeemCode, AppNotification, StreamingServer, LiveChannel, CustomDomain, SupportChat, SupportMessage } from '../types';
import { INITIAL_MOVIES, MOCK_EPISODES, GENRES, MOCK_CHANNELS } from '../data/mockData';

/**
 * Recursively removes undefined properties from an object so Firestore operations do not fail.
 */
function cleanObject<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObject(item)) as any;
  }
  const result = {} as any;
  Object.keys(obj).forEach((key) => {
    const val = (obj as any)[key];
    if (val !== undefined) {
      result[key] = cleanObject(val);
    }
  });
  return result;
}

// Subscription Plan Interface
export interface SubscribePlan {
  id: string;
  name: string;
  period: string;
  price: string;
  benefits: string[];
  closedBenefits?: string[];
  expireDaysCount?: number;
  color: string;
  tag: string;
  popular?: boolean;
}

export const DEFAULT_PLANS: SubscribePlan[] = [
  {
    id: 'monthly',
    name: 'PREMIUM PASS',
    period: 'Monthly',
    price: '$9.99',
    benefits: ['Full 4K Ultra HDR Master', 'Dolby Atmos Digital Audio', 'All Premium Exclusives', 'Unlimited High-Speed Downloads'],
    closedBenefits: ['Director Commentaries', 'Beta Live TV Access', 'Priority Stream Bandwidth'],
    expireDaysCount: 30,
    color: 'border-white/10 bg-white/5',
    tag: 'Standard VIP'
  },
  {
    id: 'yearly',
    name: 'ELITE SECTOR',
    period: 'Yearly',
    price: '$79.99',
    benefits: ['Everything in Premium Pass', 'Save 33% Annually', 'Director Commentaries', 'Beta Live TV Access', 'Priority Stream Bandwidth'],
    closedBenefits: ['Dedicated Premium Discord Badge'],
    expireDaysCount: 365,
    color: 'border-gold-base/30 bg-gold-base/5 ring-1 ring-gold-base/20',
    tag: 'Most Popular',
    popular: true
  },
  {
    id: 'ep_plex_vip',
    name: 'EP PLEX VIP ACCESS',
    period: 'Lifetime VIP',
    price: '$149.99',
    benefits: ['Ultimate VIP Server Access', 'Zero buffering cinematic relay', 'Early bird screenings & exclusive premiere access', 'Dedicated premium discord guild badge', 'Full Dolby Vision & 8K Resolution Streams'],
    closedBenefits: [],
    expireDaysCount: 9999,
    color: 'border-amber-500 bg-amber-500/10 shadow-[0_0_35px_rgba(245,158,11,0.35)] ring-1 ring-amber-500/30',
    tag: 'ULTIMATE VIP',
    popular: false
  },
  {
    id: 'lifetime',
    name: 'INFINITE ROYAL',
    period: 'Lifetime',
    price: '$199.99',
    benefits: ['Eternal Cinematic Access', 'Dedicated VIP Assistance', 'Elite Plex Founder Guild Badge', 'Early Screening Invitations'],
    closedBenefits: [],
    expireDaysCount: 9999,
    color: 'border-purple-accent/30 bg-purple-accent/5 shadow-[0_0_25px_rgba(88,28,135,0.25)]',
    tag: 'Legacy VIP'
  }
];

/**
 * Checks if the database is initialized, and seeds it with default data if empty.
 */
export async function seedDatabaseIfNeeded() {
  try {
    const setupRef = doc(db, 'config', 'setupState');
    const setupDoc = await getDoc(setupRef);
    if (setupDoc.exists()) {
      // Respect user choices: database was already seeded, so do not seed again.
      return;
    }

    console.log('Performing first-time database seeding...');

    // 1. Seed Movies
    const moviesSnapshot = await getDocs(collection(db, 'movies'));
    if (moviesSnapshot.empty) {
      console.log('Seeding movies to Firestore...');
      const batch = writeBatch(db);
      for (const movie of INITIAL_MOVIES) {
        const movieRef = doc(collection(db, 'movies'), movie.id);
        batch.set(movieRef, cleanObject(movie));
      }
      await batch.commit();
      console.log('Successfully seeded movies!');
    }

    // 2. Seed Episodes
    const episodesSnapshot = await getDocs(collection(db, 'episodes'));
    if (episodesSnapshot.empty) {
      console.log('Seeding episodes to Firestore...');
      const batch = writeBatch(db);
      for (const [movieId, episodesList] of Object.entries(MOCK_EPISODES)) {
        for (const episode of episodesList) {
          // Store with composite ID to avoid duplicates and allow querying
          const epRef = doc(collection(db, 'episodes'), `${movieId}_${episode.id}`);
          batch.set(epRef, cleanObject({
            ...episode,
            movieId: movieId
          }));
        }
      }
      await batch.commit();
      console.log('Successfully seeded episodes!');
    }

    // 3. Seed Subscription Plans (Always keep updated)
    console.log('Syncing subscription plans to Firestore...');
    const batchPlans = writeBatch(db);
    for (const plan of DEFAULT_PLANS) {
      const planRef = doc(collection(db, 'plans'), plan.id);
      batchPlans.set(planRef, cleanObject(plan));
    }
    await batchPlans.commit();
    console.log('Successfully synced plans!');

    // 4. Seed Genres / Categories
    const genresRef = doc(db, 'config', 'genres');
    const genresDoc = await getDoc(genresRef);
    if (!genresDoc.exists()) {
      console.log('Seeding genres to Firestore...');
      await setDoc(genresRef, { list: GENRES });
      console.log('Successfully seeded genres config!');
    }

    const movieCatRef = doc(db, 'config', 'movieCategories');
    const movieCatDoc = await getDoc(movieCatRef);
    if (!movieCatDoc.exists()) {
      await setDoc(movieCatRef, { list: ['All', 'Cinematic', 'Action', 'Sci-Fi', 'Drama', 'Thriller', 'Mystery', 'Horror'] });
    }

    const seriesCatRef = doc(db, 'config', 'seriesCategories');
    const seriesCatDoc = await getDoc(seriesCatRef);
    if (!seriesCatDoc.exists()) {
      await setDoc(seriesCatRef, { list: ['All', 'Sci-Fi', 'Horror', 'Drama', 'Cinematic', 'Suspense', 'Fantasy'] });
    }

    // 5. Seed Live TV Channels
    const channelsSnapshot = await getDocs(collection(db, 'channels'));
    if (channelsSnapshot.empty) {
      console.log('Seeding Live TV channels to Firestore...');
      const batch = writeBatch(db);
      for (const channel of MOCK_CHANNELS) {
        const channelRef = doc(collection(db, 'channels'), channel.id);
        batch.set(channelRef, cleanObject(channel));
      }
      await batch.commit();
      console.log('Successfully seeded Live TV channels!');
    }

    // 6. Seed Support Chats
    const supportChatsSnapshot = await getDocs(collection(db, 'support_chats'));
    if (supportChatsSnapshot.empty) {
      console.log('Seeding initial Support Chats...');
      const sampleChats: SupportChat[] = [
        {
          id: 'chat-1',
          title: 'Premium pass activation query',
          userName: 'Ariful Islam',
          userEmail: 'ariful.islam@gmail.com',
          status: 'open',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
          messages: [
            {
              id: 'm1',
              sender: 'user',
              text: 'Assalamualaikum, I just subscribed to the Premium Pass but I am still seeing some locked status indicator banners. Can you help?',
              timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
            },
            {
              id: 'm2',
              sender: 'admin',
              text: 'Walikumassalam Ariful! Thanks for reaching out. Please make sure to refresh your session. We have manually verified and updated your VIP clearance. Let us know if you can view everything now.',
              timestamp: new Date(Date.now() - 3600000).toISOString()
            }
          ]
        },
        {
          id: 'chat-2',
          title: 'Movie request error response',
          userName: 'Farhana Yeasmin',
          userEmail: 'farhana.y@yahoo.com',
          status: 'open',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          messages: [
            {
              id: 'm3',
              sender: 'user',
              text: 'Hello, I requested "Avatar: The Way of Water" movie through the catalog portal. Is it approved yet?',
              timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
            },
            {
              id: 'm4',
              sender: 'admin',
              text: 'Hi Farhana! Yes, we have added it to our high-speed movie server queue. It will be live on the Home page in under 30 minutes! Stay tuned.',
              timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
            }
          ]
        }
      ];

      for (const chat of sampleChats) {
        await setDoc(doc(db, 'support_chats', chat.id), cleanObject(chat));
      }
      console.log('Successfully seeded initial Support Chats!');
    }

    // 7. Seed Live TV Traffic
    const trafficRef = doc(db, 'config', 'liveTraffic');
    const trafficDoc = await getDoc(trafficRef);
    if (!trafficDoc.exists()) {
      console.log('Seeding Live TV Traffic to Firestore...');
      const baseUsers = [120, 145, 160, 130, 95, 70, 50, 45, 65, 90, 110, 135, 150, 180, 220, 255, 310, 395, 450, 480, 410, 350, 280, 190];
      const data = [];
      const currentHour = new Date().getHours();
      for (let i = 24; i > 0; i--) {
        const hour = (24 + currentHour - i) % 24;
        const formattedHour = `${hour.toString().padStart(2, "0")}:00`;
        const val = baseUsers[(24 - i) % 24];
        const randomNoise = Math.floor(Math.sin(i) * 15 + Math.cos(i * 2) * 5);
        const concurrentUsers = Math.max(10, val + randomNoise);
        const uhdViewers = Math.floor(concurrentUsers * 0.45);
        const hdViewers = concurrentUsers - uhdViewers;
        data.push({
          time: formattedHour,
          total: concurrentUsers,
          uhd: uhdViewers,
          hd: hdViewers,
        });
      }
      await setDoc(trafficRef, { data });
      console.log('Successfully seeded Live TV Traffic!');
    }

    // Write the setupState flag so we never re-seed
    await setDoc(setupRef, { seeded: true });
    console.log('Database setup state successfully locked!');
  } catch (error) {
    console.error('Error seeding Firestore database:', error);
  }
}

/**
 * Fetches the entire Live TV channels list from Firestore.
 */
export async function getLiveChannelsFromFirestore(): Promise<LiveChannel[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'channels'));
    const channelsList: LiveChannel[] = [];
    querySnapshot.forEach((docSnap) => {
      channelsList.push({ id: docSnap.id, ...docSnap.data() } as LiveChannel);
    });
    return channelsList;
  } catch (error) {
    console.error('Error fetching live channels from Firestore:', error);
    return MOCK_CHANNELS;
  }
}

/**
 * Adds or updates a Live TV channel in Firestore.
 */
export async function saveLiveChannelToFirestore(channel: LiveChannel): Promise<void> {
  try {
    const cleaned = cleanObject(channel);
    await setDoc(doc(db, 'channels', channel.id), cleaned);
  } catch (error) {
    console.error('Error saving live channel to Firestore:', error);
    throw error;
  }
}

/**
 * Deletes a Live TV channel from Firestore.
 */
export async function deleteLiveChannelFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'channels', id));
  } catch (error) {
    console.error('Error deleting live channel from Firestore:', error);
    throw error;
  }
}

/**
 * Fetches the entire movie catalog (including series) from Firestore.
 */
export async function getMoviesFromFirestore(): Promise<Movie[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'movies'));
    const moviesList: Movie[] = [];
    querySnapshot.forEach((docSnap) => {
      moviesList.push({ id: docSnap.id, ...docSnap.data() } as Movie);
    });
    // Return empty list if database was cleared, do not fall back to INITIAL_MOVIES
    return moviesList;
  } catch (error) {
    console.error('Error fetching movies from Firestore:', error);
    return INITIAL_MOVIES;
  }
}

/**
 * Fetches episodes for a specific movie/series ID from Firestore.
 */
export async function getEpisodesFromFirestore(movieId: string): Promise<Episode[]> {
  if (!movieId) return [];
  try {
    const q = query(collection(db, 'episodes'), where('movieId', '==', movieId));
    const querySnapshot = await getDocs(q);
    const episodesList: Episode[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Remove movieId from data when returning
      const { movieId: _, ...episode } = data;
      episodesList.push(episode as Episode);
    });
    return episodesList.sort((a, b) => a.episodeNumber - b.episodeNumber);
  } catch (error) {
    console.error(`Error fetching episodes for series ${movieId}:`, error);
    return MOCK_EPISODES[movieId] || [];
  }
}

/**
 * Fetches the subscription plans from Firestore.
 */
export async function getPlansFromFirestore(): Promise<SubscribePlan[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'plans'));
    const plansList: SubscribePlan[] = [];
    querySnapshot.forEach((docSnap) => {
      plansList.push({ id: docSnap.id, ...docSnap.data() } as SubscribePlan);
    });
    return plansList.length > 0 ? plansList : DEFAULT_PLANS;
  } catch (error) {
    console.error('Error fetching subscription plans from Firestore:', error);
    return DEFAULT_PLANS;
  }
}

/**
 * Adds a new subscription plan to Firestore.
 */
export async function addSubscribePlanToFirestore(plan: Omit<SubscribePlan, 'id'> & { id?: string }): Promise<void> {
  try {
    const planId = plan.id || `plan_${Date.now()}`;
    await setDoc(doc(db, 'plans', planId), {
      name: plan.name,
      period: plan.period,
      price: plan.price,
      benefits: plan.benefits,
      closedBenefits: plan.closedBenefits || [],
      expireDaysCount: plan.expireDaysCount || 30,
      color: plan.color || 'border-white/10 bg-white/5',
      tag: plan.tag || 'Standard VIP',
      popular: plan.popular || false
    });
  } catch (error) {
    console.error('Error adding plan to Firestore:', error);
    throw error;
  }
}

/**
 * Deletes a subscription plan from Firestore.
 */
export async function deleteSubscribePlanFromFirestore(planId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'plans', planId));
  } catch (error) {
    console.error('Error deleting plan from Firestore:', error);
    throw error;
  }
}

/**
 * Adds a Redeem Code to Firestore.
 */
export async function addRedeemCodeToFirestore(code: RedeemCode): Promise<void> {
  try {
    await setDoc(doc(db, 'redeem_codes', code.id), cleanObject(code));
  } catch (error) {
    console.error('Error adding redeem code:', error);
    throw error;
  }
}

/**
 * Fetches all Redeem Codes from Firestore.
 */
export async function getRedeemCodesFromFirestore(): Promise<RedeemCode[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'redeem_codes'));
    const list: RedeemCode[] = [];
    querySnapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as RedeemCode);
    });
    return list;
  } catch (error) {
    console.error('Error getting redeem codes:', error);
    return [];
  }
}

/**
 * Deletes a Redeem Code from Firestore.
 */
export async function deleteRedeemCodeFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'redeem_codes', id));
  } catch (error) {
    console.error('Error deleting redeem code:', error);
    throw error;
  }
}

/**
 * Redeems a code for a user.
 */
export async function redeemCodeInFirestore(
  codeString: string, 
  userId: string, 
  userEmail: string
): Promise<{ success: boolean; message: string; code?: RedeemCode }> {
  try {
    const codesRef = collection(db, 'redeem_codes');
    const q = query(codesRef, where('code', '==', codeString.trim()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { success: false, message: 'Invalid or expired redeem code' };
    }
    
    const docSnap = snapshot.docs[0];
    const code = docSnap.data() as RedeemCode;
    
    // Support unlimited use: Check if this specific user has already redeemed this code
    const userRedeemRef = doc(db, 'user_redeemed_codes', `${userId}_${code.id}`);
    const userRedeemSnap = await getDoc(userRedeemRef);
    if (userRedeemSnap.exists()) {
      return { success: false, message: 'You have already redeemed this code' };
    }
    
    // Mark code as redeemed for this user (logs latest redeemer, but keeps status as active for other users)
    const updatedCode: RedeemCode = {
      ...code,
      status: 'active', // Keep active so others can redeem!
      usedBy: userId,
      usedByEmail: userEmail,
      usedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'redeem_codes', code.id), cleanObject(updatedCode));
    
    // Save to user_redeemed_codes to prevent this specific user from double-redeeming
    await setDoc(userRedeemRef, {
      userId,
      userEmail,
      codeId: code.id,
      codeValue: code.code,
      redeemedAt: new Date().toISOString()
    });
    
    // Apply effect
    if (code.type === 'premium') {
      const days = code.premiumDays || 30;
      await updateUserPremiumStatusInFirestore(userId, true, days);
      return { success: true, message: `Successfully redeemed! Premium extended by ${days} days.`, code: updatedCode };
    } else if (code.type === 'movie' || code.type === 'series') {
      const unlockRef = doc(db, 'user_unlocked_media', `${userId}_${code.targetId}`);
      await setDoc(unlockRef, {
        userId,
        userEmail,
        mediaId: code.targetId,
        mediaTitle: code.targetTitle || 'Cinematic Entity',
        type: code.type,
        redeemedAt: new Date().toISOString()
      });
      return { success: true, message: `Successfully redeemed! "${code.targetTitle}" is now unlocked for you.`, code: updatedCode };
    }
    
    return { success: true, message: 'Redeemed successfully!', code: updatedCode };
  } catch (error) {
    console.error('Error redeeming code:', error);
    return { success: false, message: 'Redemption failed due to system error' };
  }
}

/**
 * Checks if a specific media item is unlocked for a user.
 */
export async function isMediaUnlockedForUser(userId: string, mediaId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'user_unlocked_media', `${userId}_${mediaId}`);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch (error) {
    console.error('Error checking unlock status:', error);
    return false;
  }
}

/**
 * Fetches the list of genres/categories from Firestore.
 */
export async function getGenresFromFirestore(): Promise<string[]> {
  try {
    const genresRef = doc(db, 'config', 'genres');
    const genresDoc = await getDoc(genresRef);
    if (genresDoc.exists()) {
      return genresDoc.data().list as string[];
    }
    return GENRES;
  } catch (error) {
    console.error('Error fetching genres config from Firestore:', error);
    return GENRES;
  }
}

/**
 * Saves the list of genres/categories to Firestore.
 */
export async function saveGenresToFirestore(genresList: string[]): Promise<void> {
  try {
    const genresRef = doc(db, 'config', 'genres');
    await setDoc(genresRef, { list: genresList });
  } catch (error) {
    console.error('Error saving genres config to Firestore:', error);
    throw error;
  }
}

/**
 * Synchronizes user profile with Firestore and determines Admin roles:
 * - If first user in collection -> Admin.
 * - If email is admin@gmali.com -> Admin.
 * - Otherwise -> standard user.
 */
export async function syncUserProfile(
  uid: string, 
  name: string, 
  email: string, 
  avatarUrl: string
): Promise<UserProfile> {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    const lowerEmail = email.toLowerCase();
    const cachedAdminEmail = (localStorage.getItem('ep_admin_email') || 'admin@gmail.com').toLowerCase();
    const isEmailAdmin = lowerEmail === cachedAdminEmail || lowerEmail === 'admin@gmali.com' || lowerEmail === 'admin@gmail.com';

    if (userDoc.exists()) {
      const existingData = userDoc.data();
      let updatedAdmin = existingData.isAdmin;
      if (isEmailAdmin) {
        updatedAdmin = true;
      }

      const updatedProfile: UserProfile = {
        id: uid,
        name: existingData.name || name,
        email: existingData.email || email,
        avatarUrl: existingData.avatarUrl || avatarUrl,
        isPremium: existingData.isPremium !== undefined ? existingData.isPremium : false,
        isAdmin: !!updatedAdmin,
        premiumExpiry: existingData.premiumExpiry,
      };

      if (updatedAdmin !== existingData.isAdmin) {
        await setDoc(userRef, { isAdmin: updatedAdmin }, { merge: true });
      }

      return updatedProfile;
    } else {
      // Check if this is the first user signed up in Firestore
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const isFirst = usersSnapshot.empty;
      const isAdmin = isFirst || isEmailAdmin;

      const newProfile: UserProfile = {
        id: uid,
        name: name,
        email: email,
        avatarUrl: avatarUrl,
        isPremium: false, // New users are never premium automatically on Sign Up
        isAdmin: isAdmin,
      };

      await setDoc(userRef, newProfile);
      return newProfile;
    }
  } catch (err) {
    console.error("Error syncing user profile:", err);
    // Fallback profile if Firestore is offline
    const lowerEmail = email.toLowerCase();
    const cachedAdminEmail = (localStorage.getItem('ep_admin_email') || 'admin@gmail.com').toLowerCase();
    const isEmailAdmin = lowerEmail === cachedAdminEmail || lowerEmail === 'admin@gmali.com' || lowerEmail === 'admin@gmail.com';
    return {
      id: uid,
      name,
      email,
      avatarUrl,
      isPremium: isEmailAdmin,
      isAdmin: isEmailAdmin,
    };
  }
}

/**
 * Persists a new movie to Firestore.
 */
export async function addMovieToFirestore(movie: Movie): Promise<void> {
  if (!movie || !movie.id) {
    console.error("Error adding movie to Firestore: invalid movie or missing ID");
    return;
  }
  try {
    await setDoc(doc(db, 'movies', movie.id), cleanObject(movie));
  } catch (error) {
    console.error("Error adding movie to Firestore:", error);
  }
}

/**
 * Updates an existing movie in Firestore.
 */
export async function updateMovieInFirestore(movie: Movie): Promise<void> {
  if (!movie || !movie.id) {
    console.error("Error updating movie in Firestore: invalid movie or missing ID");
    return;
  }
  try {
    await setDoc(doc(db, 'movies', movie.id), cleanObject(movie), { merge: true });
  } catch (error) {
    console.error("Error updating movie in Firestore:", error);
  }
}

/**
 * Fetches Live TV Traffic data from Firestore.
 */
export async function getLiveTrafficFromFirestore(): Promise<{ time: string; total: number; uhd: number; hd: number }[]> {
  try {
    const trafficRef = doc(db, 'config', 'liveTraffic');
    const trafficDoc = await getDoc(trafficRef);
    if (trafficDoc.exists()) {
      return trafficDoc.data().data || [];
    } else {
      console.log('Proactively seeding Live TV Traffic config to Firestore...');
      const baseUsers = [120, 145, 160, 130, 95, 70, 50, 45, 65, 90, 110, 135, 150, 180, 220, 255, 310, 395, 450, 480, 410, 350, 280, 190];
      const data = [];
      const currentHour = new Date().getHours();
      for (let i = 24; i > 0; i--) {
        const hour = (24 + currentHour - i) % 24;
        const formattedHour = `${hour.toString().padStart(2, "0")}:00`;
        const val = baseUsers[(24 - i) % 24];
        const randomNoise = Math.floor(Math.sin(i) * 15 + Math.cos(i * 2) * 5);
        const concurrentUsers = Math.max(10, val + randomNoise);
        const uhdViewers = Math.floor(concurrentUsers * 0.45);
        const hdViewers = concurrentUsers - uhdViewers;
        data.push({
          time: formattedHour,
          total: concurrentUsers,
          uhd: uhdViewers,
          hd: hdViewers,
        });
      }
      await setDoc(trafficRef, { data });
      return data;
    }
  } catch (error) {
    console.error("Error fetching live traffic from Firestore:", error);
  }
  return [];
}

/**
 * Saves or updates Live TV Traffic data to Firestore.
 */
export async function saveLiveTrafficToFirestore(data: { time: string; total: number; uhd: number; hd: number }[]): Promise<void> {
  try {
    const trafficRef = doc(db, 'config', 'liveTraffic');
    await setDoc(trafficRef, { data: cleanObject(data) });
  } catch (error) {
    console.error("Error saving live traffic to Firestore:", error);
    throw error;
  }
}

/**
 * Unique view tracking per user per movie/series.
 * A user gets exactly 1 view credited for any movie/series they play.
 * Subsequent plays by the same user do NOT increment viewsCount.
 */
export async function trackMediaViewInFirestore(userId: string, movie: Movie): Promise<void> {
  if (!userId || !movie || !movie.id) return;
  try {
    const viewId = `${userId}_${movie.id}`;
    const viewRef = doc(db, 'views', viewId);
    const viewDoc = await getDoc(viewRef);
    if (!viewDoc.exists()) {
      // Create unique view log
      await setDoc(viewRef, {
        userId,
        movieId: movie.id,
        title: movie.title,
        type: movie.type || 'movie',
        timestamp: new Date().toISOString(),
      });
      // Increment views count on the movie doc in Firestore
      const movieRef = doc(db, 'movies', movie.id);
      const movieDoc = await getDoc(movieRef);
      if (movieDoc.exists()) {
        const movieData = movieDoc.data() as Movie;
        const currentViews = Number((movieData as any).viewsCount || (movieData as any).views || 0);
        await setDoc(movieRef, { viewsCount: currentViews + 1 }, { merge: true });
      }
    }
  } catch (error) {
    console.error("Error tracking unique media view in Firestore:", error);
  }
}

/**
 * Tracks unique watchlist additions in Firestore and increments/decrements movie count.
 */
export async function trackWatchlistInFirestore(userId: string, movie: Movie, isAdded: boolean): Promise<void> {
  if (!userId || !movie || !movie.id) return;
  try {
    const wlId = `${userId}_${movie.id}`;
    const wlRef = doc(db, 'watchlists', wlId);
    if (isAdded) {
      const wlDoc = await getDoc(wlRef);
      if (!wlDoc.exists()) {
        await setDoc(wlRef, {
          userId,
          movieId: movie.id,
          title: movie.title,
          type: movie.type || 'movie',
          timestamp: new Date().toISOString(),
        });
        const movieRef = doc(db, 'movies', movie.id);
        const movieDoc = await getDoc(movieRef);
        if (movieDoc.exists()) {
          const movieData = movieDoc.data() as Movie;
          const currentWatchlists = Number((movieData as any).watchlistAdditions || 0);
          await setDoc(movieRef, { watchlistAdditions: currentWatchlists + 1 }, { merge: true });
        }
      }
    } else {
      const wlDoc = await getDoc(wlRef);
      if (wlDoc.exists()) {
        await deleteDoc(wlRef);
        const movieRef = doc(db, 'movies', movie.id);
        const movieDoc = await getDoc(movieRef);
        if (movieDoc.exists()) {
          const movieData = movieDoc.data() as Movie;
          const currentWatchlists = Number((movieData as any).watchlistAdditions || 0);
          await setDoc(movieRef, { watchlistAdditions: Math.max(0, currentWatchlists - 1) }, { merge: true });
        }
      }
    }
  } catch (error) {
    console.error("Error tracking watchlist addition in Firestore:", error);
  }
}

/**
 * Deletes a movie from Firestore.
 */
export async function deleteMovieFromFirestore(id: string): Promise<void> {
  if (!id) {
    console.error("Error deleting movie from Firestore: ID is undefined or empty");
    return;
  }
  try {
    await deleteDoc(doc(db, 'movies', id));
  } catch (error) {
    console.error("Error deleting movie from Firestore:", error);
  }
}

/**
 * Clears all movies from Firestore database.
 */
export async function clearAllMoviesFromFirestore(): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, 'movies'));
    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    console.log("Successfully cleared all movies from Firestore catalog!");
  } catch (error) {
    console.error("Error clearing movies from Firestore:", error);
  }
}

/**
 * Clears all items of a specific type (movie or series) from Firestore database.
 */
export async function clearAllMoviesByTypeFromFirestore(type: 'movie' | 'series'): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, 'movies'));
    const batch = writeBatch(db);
    let count = 0;
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.type === type) {
        batch.delete(docSnap.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
    console.log(`Successfully cleared all ${type} from Firestore catalog!`);
  } catch (error) {
    console.error(`Error clearing ${type} from Firestore:`, error);
  }
}

/**
 * Fetches Movie Categories list from Firestore
 */
export async function getMovieCategoriesFromFirestore(): Promise<string[]> {
  try {
    const ref = doc(db, 'config', 'movieCategories');
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      return docSnap.data().list as string[];
    }
    return ['All'];
  } catch (error) {
    console.error("Error loading movie categories:", error);
    return ['All'];
  }
}

/**
 * Saves Movie Categories list to Firestore
 */
export async function saveMovieCategoriesToFirestore(list: string[]): Promise<void> {
  try {
    const ref = doc(db, 'config', 'movieCategories');
    await setDoc(ref, { list });
  } catch (error) {
    console.error("Error saving movie categories to Firestore:", error);
  }
}

/**
 * Fetches Series Categories list from Firestore
 */
export async function getSeriesCategoriesFromFirestore(): Promise<string[]> {
  try {
    const ref = doc(db, 'config', 'seriesCategories');
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      return docSnap.data().list as string[];
    }
    return ['All'];
  } catch (error) {
    console.error("Error loading series categories:", error);
    return ['All'];
  }
}

/**
 * Saves Series Categories list to Firestore
 */
export async function saveSeriesCategoriesToFirestore(list: string[]): Promise<void> {
  try {
    const ref = doc(db, 'config', 'seriesCategories');
    await setDoc(ref, { list });
  } catch (error) {
    console.error("Error saving series categories to Firestore:", error);
  }
}

/**
 * Fetches Movie and Series requests from Firestore
 */
export async function getMovieRequestsFromFirestore(): Promise<MovieRequest[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'movieRequests'));
    const requestsList: MovieRequest[] = [];
    querySnapshot.forEach((docSnap) => {
      requestsList.push({ id: docSnap.id, ...docSnap.data() } as MovieRequest);
    });
    // Sort by newest first
    return requestsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching movie requests from Firestore:", error);
    return [];
  }
}

/**
 * Adds a new Movie/Series request to Firestore
 */
export async function addMovieRequestToFirestore(request: Omit<MovieRequest, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'movieRequests'), cleanObject(request));
    return docRef.id;
  } catch (error) {
    console.error("Error adding movie request to Firestore:", error);
    throw error;
  }
}

/**
 * Updates status of a movie request in Firestore
 */
export async function updateMovieRequestStatusInFirestore(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
  try {
    const ref = doc(db, 'movieRequests', id);
    await setDoc(ref, { status }, { merge: true });
  } catch (error) {
    console.error("Error updating movie request status in Firestore:", error);
  }
}

/**
 * Deletes a movie request from Firestore
 */
export async function deleteMovieRequestFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'movieRequests', id));
  } catch (error) {
    console.error("Error deleting movie request from Firestore:", error);
  }
}

/**
 * Updates a user's Premium Status in Firestore
 */
export async function updateUserPremiumStatusInFirestore(uid: string, isPremium: boolean, expireDays?: number, customExpiryTimestamp?: number): Promise<void> {
  if (!uid) return;
  try {
    const userRef = doc(db, 'users', uid);
    let premiumExpiry = customExpiryTimestamp;
    
    if (!premiumExpiry && isPremium) {
      // Fetch current document to see if user already has an active premiumExpiry
      const docSnap = await getDoc(userRef);
      let existingExpiryRemaining = 0;
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.isPremium && data.premiumExpiry && data.premiumExpiry > Date.now()) {
          existingExpiryRemaining = data.premiumExpiry - Date.now();
        }
      }
      
      const newDurationMs = (expireDays || 30) * 24 * 60 * 60 * 1000;
      // Double the new subscription duration and add the existing remaining time
      premiumExpiry = Date.now() + existingExpiryRemaining + (newDurationMs * 2);
    }
    
    await setDoc(userRef, { isPremium, premiumExpiry: premiumExpiry || null }, { merge: true });
    console.log(`User ${uid} premium status updated to ${isPremium} with expiry ${premiumExpiry} in Firestore.`);
  } catch (error) {
    console.error("Error updating user premium status in Firestore:", error);
  }
}

/**
 * Updates user auto-renew status in Firestore
 */
export async function updateUserAutoRenewInFirestore(uid: string, autoRenew: boolean): Promise<void> {
  if (!uid) return;
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { autoRenew }, { merge: true });
    console.log(`User ${uid} autoRenew status updated to ${autoRenew} in Firestore.`);
  } catch (error) {
    console.error("Error updating user autoRenew status in Firestore:", error);
    throw error;
  }
}

/**
 * Fetches user profile from Firestore by UID
 */
export async function getUserProfileFromFirestore(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return { id: uid, ...userDoc.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile from Firestore:", error);
    return null;
  }
}

/**
 * Fetches Subscribe Requests from Firestore
 */
export async function getSubscribeRequestsFromFirestore(): Promise<SubscribeRequest[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'subscribeRequests'));
    const requestsList: SubscribeRequest[] = [];
    querySnapshot.forEach((docSnap) => {
      requestsList.push({ id: docSnap.id, ...docSnap.data() } as SubscribeRequest);
    });
    // Sort by newest first
    return requestsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching subscribe requests from Firestore:", error);
    return [];
  }
}

/**
 * Adds a new Subscribe Request to Firestore
 */
export async function addSubscribeRequestToFirestore(request: Omit<SubscribeRequest, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'subscribeRequests'), cleanObject(request));
    return docRef.id;
  } catch (error) {
    console.error("Error adding subscribe request to Firestore:", error);
    throw error;
  }
}

/**
 * Updates status of a subscribe request in Firestore.
 * If status is approved, we also upgrade the corresponding user to Premium!
 */
export async function updateSubscribeRequestStatusInFirestore(id: string, userId: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
  try {
    const ref = doc(db, 'subscribeRequests', id);
    await setDoc(ref, { status }, { merge: true });
    
    if (status === 'approved' && userId) {
      await updateUserPremiumStatusInFirestore(userId, true);
    }
  } catch (error) {
    console.error("Error updating subscribe request status in Firestore:", error);
  }
}

/**
 * Deletes a subscribe request from Firestore
 */
export async function deleteSubscribeRequestFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'subscribeRequests', id));
  } catch (error) {
    console.error("Error deleting subscribe request from Firestore:", error);
  }
}

/**
 * Fetches all users from Firestore
 */
export async function getAllUsersFromFirestore(): Promise<UserProfile[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const userList: UserProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      userList.push({ id: docSnap.id, ...docSnap.data() } as UserProfile);
    });
    return userList;
  } catch (error) {
    console.error("Error fetching all users from Firestore:", error);
    return [];
  }
}

/**
 * Deletes a user profile from Firestore
 */
export async function deleteUserFromFirestore(uid: string): Promise<void> {
  if (!uid) return;
  try {
    await deleteDoc(doc(db, 'users', uid));
    console.log(`User ${uid} deleted successfully from Firestore.`);
  } catch (error) {
    console.error("Error deleting user from Firestore:", error);
  }
}

/**
 * Bans a user in Firestore
 */
export async function banUserInFirestore(uid: string): Promise<void> {
  if (!uid) return;
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { isBanned: true }, { merge: true });
    console.log(`User ${uid} banned successfully in Firestore.`);
  } catch (error) {
    console.error("Error banning user in Firestore:", error);
  }
}

/**
 * Unbans a user in Firestore
 */
export async function unbanUserInFirestore(uid: string): Promise<void> {
  if (!uid) return;
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { isBanned: false }, { merge: true });
    console.log(`User ${uid} unbanned successfully in Firestore.`);
  } catch (error) {
    console.error("Error unbanning user in Firestore:", error);
  }
}

/**
 * Fetches all broadcasted notifications from Firestore.
 */
export async function getNotificationsFromFirestore(): Promise<AppNotification[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'notifications'));
    const notificationsList: AppNotification[] = [];
    querySnapshot.forEach((docSnap) => {
      notificationsList.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
    });
    // Sort notifications by time descending
    return notificationsList.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  } catch (error) {
    console.error("Error fetching notifications from Firestore:", error);
    return [];
  }
}

/**
 * Subscribes to real-time updates of broadcasted notifications in Firestore.
 */
export function subscribeToNotifications(callback: (notifications: AppNotification[]) => void): () => void {
  const collRef = collection(db, 'notifications');
  return onSnapshot(collRef, (snapshot) => {
    const list: AppNotification[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as AppNotification);
    });
    // Sort notifications by time descending
    list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    callback(list);
  }, (error) => {
    console.error("Error listening to notifications:", error);
  });
}

/**
 * Adds/broadcasts a new notification to Firestore.
 */
export async function addNotificationToFirestore(
  title: string,
  body: string,
  movieId?: string,
  seasonNumber?: number,
  episodeNumber?: number
): Promise<AppNotification> {
  const id = `notif_${Date.now()}`;
  const newNotif: AppNotification = {
    id,
    title,
    body,
    time: new Date().toISOString(),
    isRead: false,
    ...(movieId ? { movieId } : {}),
    ...(seasonNumber !== undefined ? { seasonNumber } : {}),
    ...(episodeNumber !== undefined ? { episodeNumber } : {}),
  };
  await setDoc(doc(db, 'notifications', id), cleanObject(newNotif));
  return newNotif;
}

/**
 * Deletes a notification from Firestore.
 */
export async function deleteNotificationFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (error) {
    console.error("Error deleting notification from Firestore:", error);
  }
}

/**
 * Fetches user redeemed codes log from Firestore.
 */
export async function getUserRedeemedCodesFromFirestore(userId: string): Promise<any[]> {
  try {
    const q = query(collection(db, 'user_redeemed_codes'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const list: any[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list.  sort((a: any, b: any) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime());
  } catch (error) {
    console.error("Error fetching user redeemed codes:", error);
    return [];
  }
}

/**
 * Fetches user subscription plan requests from Firestore.
 */
export async function getUserSubscribeRequestsFromFirestore(userId: string): Promise<SubscribeRequest[]> {
  try {
    const q = query(collection(db, 'subscribeRequests'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const list: SubscribeRequest[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as SubscribeRequest);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching user subscribe requests:", error);
    return [];
  }
}

export interface SystemParams {
  maintenanceMode: boolean;
  globalNotice: string;
  serverSpeedLimit: number;
  minAppVersion: string;
  premiumLock?: boolean;
  liveTvPremiumLock?: boolean;
  trendingSortOrder?: 'popularity' | 'releaseDate';
  updatedAt?: string;
}

export interface PaymentSettings {
  paymentType: 'request' | 'auto';
  upiId: string;
  qrCodeUrl: string;
  updatedAt?: string;
}

/**
 * Fetches payment settings from Firestore
 */
export async function getPaymentSettingsFromFirestore(): Promise<PaymentSettings> {
  try {
    const ref = doc(db, 'config', 'paymentSettings');
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      return docSnap.data() as PaymentSettings;
    }
  } catch (error) {
    console.error("Error loading payment settings:", error);
  }
  return {
    paymentType: 'request',
    upiId: 'eliteplex@ybl',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=eliteplex@ybl%26pn=Elite%20Plex%26cu=INR'
  };
}

/**
 * Saves payment settings to Firestore
 */
export async function savePaymentSettingsToFirestore(settings: PaymentSettings): Promise<void> {
  try {
    const ref = doc(db, 'config', 'paymentSettings');
    await setDoc(ref, {
      ...settings,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error saving payment settings to Firestore:", error);
  }
}

/**
 * Fetches system params configuration from Firestore
 */
export async function getSystemParamsFromFirestore(): Promise<SystemParams> {
  try {
    const ref = doc(db, 'config', 'systemParams');
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      return docSnap.data() as SystemParams;
    }
  } catch (error) {
    console.error("Error loading system params:", error);
  }
  // Default values
  return {
    maintenanceMode: false,
    globalNotice: "WELCOME TO ELITE PLEX: THE CINEMATIC EXTRAORDINAIRE ARCHIVE.",
    serverSpeedLimit: 500,
    minAppVersion: "1.4.0",
    premiumLock: false,
    liveTvPremiumLock: false
  };
}

/**
 * Saves system params configuration to Firestore
 */
export async function saveSystemParamsToFirestore(params: SystemParams): Promise<void> {
  try {
    const ref = doc(db, 'config', 'systemParams');
    await setDoc(ref, {
      ...params,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error saving system params to Firestore:", error);
  }
}

export interface AdminCredentials {
  adminEmail?: string;
  adminPassword?: string;
  appSecurityPin?: string; // 4-digit security PIN for unlocking profiles or admin panel
  tmdbApiKey?: string;     // TMDB v3 API Key for search lookup
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseDatabaseURL?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
  firebaseMeasurementId?: string;
  updatedAt?: string;
}

/**
 * Fetches admin credentials from Firestore
 */
export async function getAdminCredentials(): Promise<AdminCredentials> {
  try {
    const ref = doc(db, 'config', 'adminCredentials');
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      const data = docSnap.data() as AdminCredentials;
      // also cache in localStorage
      if (data.adminEmail) localStorage.setItem('ep_admin_email', data.adminEmail);
      if (data.adminPassword) localStorage.setItem('ep_admin_password', data.adminPassword);
      if (data.appSecurityPin !== undefined) localStorage.setItem('ep_security_pin', data.appSecurityPin);
      if (data.tmdbApiKey !== undefined) localStorage.setItem('ep_tmdb_api_key', data.tmdbApiKey);
      if (data.firebaseApiKey !== undefined) localStorage.setItem('ep_firebase_apiKey', data.firebaseApiKey);
      if (data.firebaseAuthDomain !== undefined) localStorage.setItem('ep_firebase_authDomain', data.firebaseAuthDomain);
      if (data.firebaseDatabaseURL !== undefined) localStorage.setItem('ep_firebase_databaseURL', data.firebaseDatabaseURL);
      if (data.firebaseProjectId !== undefined) localStorage.setItem('ep_firebase_projectId', data.firebaseProjectId);
      if (data.firebaseStorageBucket !== undefined) localStorage.setItem('ep_firebase_storageBucket', data.firebaseStorageBucket);
      if (data.firebaseMessagingSenderId !== undefined) localStorage.setItem('ep_firebase_messagingSenderId', data.firebaseMessagingSenderId);
      if (data.firebaseAppId !== undefined) localStorage.setItem('ep_firebase_appId', data.firebaseAppId);
      if (data.firebaseMeasurementId !== undefined) localStorage.setItem('ep_firebase_measurementId', data.firebaseMeasurementId);
      return data;
    }
  } catch (error) {
    console.error("Error loading admin credentials from Firestore:", error);
  }
  
  // Return values from localStorage cached previously or default values
  return {
    adminEmail: localStorage.getItem('ep_admin_email') || 'admin@gmail.com',
    adminPassword: localStorage.getItem('ep_admin_password') || 'AdminPro',
    appSecurityPin: localStorage.getItem('ep_security_pin') || '',
    tmdbApiKey: localStorage.getItem('ep_tmdb_api_key') || '',
    firebaseApiKey: localStorage.getItem('ep_firebase_apiKey') || '',
    firebaseAuthDomain: localStorage.getItem('ep_firebase_authDomain') || '',
    firebaseDatabaseURL: localStorage.getItem('ep_firebase_databaseURL') || '',
    firebaseProjectId: localStorage.getItem('ep_firebase_projectId') || '',
    firebaseStorageBucket: localStorage.getItem('ep_firebase_storageBucket') || '',
    firebaseMessagingSenderId: localStorage.getItem('ep_firebase_messagingSenderId') || '',
    firebaseAppId: localStorage.getItem('ep_firebase_appId') || '',
    firebaseMeasurementId: localStorage.getItem('ep_firebase_measurementId') || '',
  };
}

/**
 * Saves admin credentials to Firestore
 */
export async function saveAdminCredentials(creds: AdminCredentials): Promise<void> {
  try {
    const ref = doc(db, 'config', 'adminCredentials');
    await setDoc(ref, {
      ...creds,
      updatedAt: new Date().toISOString()
    });
    // Update localStorage cache as well
    if (creds.adminEmail) localStorage.setItem('ep_admin_email', creds.adminEmail);
    if (creds.adminPassword) localStorage.setItem('ep_admin_password', creds.adminPassword);
    if (creds.appSecurityPin !== undefined) localStorage.setItem('ep_security_pin', creds.appSecurityPin);
    if (creds.tmdbApiKey !== undefined) localStorage.setItem('ep_tmdb_api_key', creds.tmdbApiKey);
    if (creds.firebaseApiKey !== undefined) localStorage.setItem('ep_firebase_apiKey', creds.firebaseApiKey);
    if (creds.firebaseAuthDomain !== undefined) localStorage.setItem('ep_firebase_authDomain', creds.firebaseAuthDomain);
    if (creds.firebaseDatabaseURL !== undefined) localStorage.setItem('ep_firebase_databaseURL', creds.firebaseDatabaseURL);
    if (creds.firebaseProjectId !== undefined) localStorage.setItem('ep_firebase_projectId', creds.firebaseProjectId);
    if (creds.firebaseStorageBucket !== undefined) localStorage.setItem('ep_firebase_storageBucket', creds.firebaseStorageBucket);
    if (creds.firebaseMessagingSenderId !== undefined) localStorage.setItem('ep_firebase_messagingSenderId', creds.firebaseMessagingSenderId);
    if (creds.firebaseAppId !== undefined) localStorage.setItem('ep_firebase_appId', creds.firebaseAppId);
    if (creds.firebaseMeasurementId !== undefined) localStorage.setItem('ep_firebase_measurementId', creds.firebaseMeasurementId);
  } catch (error) {
    console.error("Error saving admin credentials to Firestore:", error);
    // Fallback: update localStorage anyway
    if (creds.adminEmail) localStorage.setItem('ep_admin_email', creds.adminEmail);
    if (creds.adminPassword) localStorage.setItem('ep_admin_password', creds.adminPassword);
    if (creds.appSecurityPin !== undefined) localStorage.setItem('ep_security_pin', creds.appSecurityPin);
    if (creds.tmdbApiKey !== undefined) localStorage.setItem('ep_tmdb_api_key', creds.tmdbApiKey);
    if (creds.firebaseApiKey !== undefined) localStorage.setItem('ep_firebase_apiKey', creds.firebaseApiKey);
    if (creds.firebaseAuthDomain !== undefined) localStorage.setItem('ep_firebase_authDomain', creds.firebaseAuthDomain);
    if (creds.firebaseDatabaseURL !== undefined) localStorage.setItem('ep_firebase_databaseURL', creds.firebaseDatabaseURL);
    if (creds.firebaseProjectId !== undefined) localStorage.setItem('ep_firebase_projectId', creds.firebaseProjectId);
    if (creds.firebaseStorageBucket !== undefined) localStorage.setItem('ep_firebase_storageBucket', creds.firebaseStorageBucket);
    if (creds.firebaseMessagingSenderId !== undefined) localStorage.setItem('ep_firebase_messagingSenderId', creds.firebaseMessagingSenderId);
    if (creds.firebaseAppId !== undefined) localStorage.setItem('ep_firebase_appId', creds.firebaseAppId);
    if (creds.firebaseMeasurementId !== undefined) localStorage.setItem('ep_firebase_measurementId', creds.firebaseMeasurementId);
  }
}

export async function getStreamingServers(): Promise<StreamingServer[]> {
  try {
    const sCol = collection(db, 'servers');
    const qSnap = await getDocs(sCol);
    let list: StreamingServer[] = [];
    qSnap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as StreamingServer);
    });
    
    if (list.length === 0) {
      list = await initializeDefaultServers();
    }
    
    return list.sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  } catch (error) {
    console.error("Error getting streaming servers:", error);
    return [];
  }
}

export async function saveStreamingServer(server: StreamingServer): Promise<void> {
  try {
    const sDoc = doc(db, 'servers', server.id);
    await setDoc(sDoc, cleanObject(server));
  } catch (error) {
    console.error("Error saving streaming server:", error);
  }
}

export async function deleteStreamingServer(id: string): Promise<void> {
  try {
    const sDoc = doc(db, 'servers', id);
    await deleteDoc(sDoc);
  } catch (error) {
    console.error("Error deleting streaming server:", error);
  }
}

async function initializeDefaultServers(): Promise<StreamingServer[]> {
  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'IN', name: 'India' },
    { code: 'SG', name: 'Singapore' },
    { code: 'JP', name: 'Japan' },
    { code: 'CA', name: 'Canada' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'AU', name: 'Australia' },
    { code: 'KR', name: 'South Korea' }
  ];
  
  const serverProviders = ['Delta Relay', 'Quantum Stream', 'Apex Engine', 'Titan Buffer', 'Vortex Cache'];
  const list: StreamingServer[] = [];
  
  for (let i = 1; i <= 50; i++) {
    const countryObj = countries[(i - 1) % countries.length];
    const provider = serverProviders[(i - 1) % serverProviders.length];
    const isPremium = i % 3 === 0;
    
    let baseLatency = 30;
    if (countryObj.code === 'US') baseLatency = 45;
    if (countryObj.code === 'GB') baseLatency = 95;
    if (countryObj.code === 'IN') baseLatency = 20;
    if (countryObj.code === 'SG') baseLatency = 60;
    if (countryObj.code === 'JP') baseLatency = 110;
    if (countryObj.code === 'AU') baseLatency = 160;
    
    const latencyRandom = Math.floor(Math.random() * 25) + baseLatency;
    const statusRandom = i === 12 ? 'offline' : (i === 28 ? 'maintenance' : 'online');
    
    const server: StreamingServer = {
      id: `srv-${i}`,
      name: `${provider} ${countryObj.code}-${Math.floor((i - 1) / countries.length) + 1}`,
      url: `https://srv-${i}.eliteplex.co/stream/cinematic`,
      country: countryObj.name,
      status: statusRandom,
      latency: latencyRandom,
      isPremium: isPremium,
      speed: isPremium ? '10 Gbps' : '1 Gbps',
      load: Math.floor(Math.random() * 60) + 15
    };
    
    list.push(server);
  }
  
  try {
    const batch = writeBatch(db);
    list.forEach((server) => {
      const sDoc = doc(db, 'servers', server.id);
      batch.set(sDoc, cleanObject(server));
    });
    await batch.commit();
    console.log("Initialized 50 default servers in Firestore successfully");
  } catch (error) {
    console.error("Error writing batch of default servers:", error);
  }
  
  return list;
}

export function subscribeToStreamingServers(callback: (servers: StreamingServer[]) => void): () => void {
  const sCol = collection(db, 'servers');
  return onSnapshot(sCol, (qSnap) => {
    let list: StreamingServer[] = [];
    qSnap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as StreamingServer);
    });
    
    const sorted = list.sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
    
    if (sorted.length === 0) {
      getStreamingServers().then(callback);
    } else {
      callback(sorted);
    }
  }, (error) => {
    console.error("Error listening to streaming servers:", error);
  });
}

export function subscribeToSystemParams(callback: (params: SystemParams) => void): () => void {
  const ref = doc(db, 'config', 'systemParams');
  return onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as SystemParams);
    } else {
      callback({
        maintenanceMode: false,
        globalNotice: "WELCOME TO ELITE PLEX: THE CINEMATIC EXTRAORDINAIRE ARCHIVE.",
        serverSpeedLimit: 500,
        minAppVersion: "1.4.0",
        premiumLock: false,
        liveTvPremiumLock: false
      });
    }
  }, (error) => {
    console.error("Error listening to system parameters:", error);
  });
}

/**
 * Fetches all custom domains from Firestore.
 */
export async function getCustomDomainsFromFirestore(): Promise<CustomDomain[]> {
  try {
    const qSnap = await getDocs(collection(db, 'custom_domains'));
    const list: CustomDomain[] = [];
    qSnap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as CustomDomain);
    });
    return list;
  } catch (error) {
    console.error("Error fetching custom domains from Firestore:", error);
    return [];
  }
}

/**
 * Saves/registers a custom domain mapping in Firestore.
 */
export async function saveCustomDomainToFirestore(domain: CustomDomain): Promise<void> {
  try {
    const dDoc = doc(db, 'custom_domains', domain.id);
    await setDoc(dDoc, cleanObject(domain));
  } catch (error) {
    console.error("Error saving custom domain to Firestore:", error);
    throw error;
  }
}

/**
 * Deletes/decommissions a custom domain from Firestore.
 */
export async function deleteCustomDomainFromFirestore(id: string): Promise<void> {
  try {
    const dDoc = doc(db, 'custom_domains', id);
    await deleteDoc(dDoc);
  } catch (error) {
    console.error("Error deleting custom domain from Firestore:", error);
    throw error;
  }
}

/**
 * Subscribes to real-time updates of support chats in Firestore.
 */
export function subscribeToSupportChats(callback: (chats: SupportChat[]) => void): () => void {
  const collRef = collection(db, 'support_chats');
  return onSnapshot(collRef, (snapshot) => {
    const list: SupportChat[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({ id: docSnap.id, ...data } as SupportChat);
    });
    // Sort by updated time descending
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    callback(list);
  }, (error) => {
    console.error("Error listening to support chats:", error);
  });
}

/**
 * Saves/registers a support chat session in Firestore.
 */
export async function saveSupportChatToFirestore(chat: SupportChat): Promise<void> {
  try {
    const cDoc = doc(db, 'support_chats', chat.id);
    await setDoc(cDoc, cleanObject(chat));
  } catch (error) {
    console.error("Error saving support chat to Firestore:", error);
    throw error;
  }
}

/**
 * Appends a message to a support chat and updates the updated timestamp.
 */
export async function addMessageToSupportChat(chatId: string, message: SupportMessage): Promise<void> {
  try {
    const cDoc = doc(db, 'support_chats', chatId);
    const snap = await getDoc(cDoc);
    if (snap.exists()) {
      const data = snap.data();
      const currentMessages = data.messages || [];
      const updatedMessages = [...currentMessages, message];
      await setDoc(cDoc, cleanObject({
        ...data,
        messages: updatedMessages,
        updatedAt: new Date().toISOString()
      }), { merge: true });
    }
  } catch (error) {
    console.error("Error adding message to support chat in Firestore:", error);
    throw error;
  }
}

/**
 * Deletes a support chat from Firestore.
 */
export async function deleteSupportChatFromFirestore(id: string): Promise<void> {
  try {
    const cDoc = doc(db, 'support_chats', id);
    await deleteDoc(cDoc);
  } catch (error) {
    console.error("Error deleting support chat from Firestore:", error);
    throw error;
  }
}

export interface SearchQueryHistoryItem {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface SearchQueryItem {
  id?: string;
  term: string;
  count: number;
  category: string;
  lastSearchedAt: string;
  history?: SearchQueryHistoryItem[];
}

/**
 * Generates a realistic chronological search count breakdown over the last N days.
 */
export function generatePastHistory(totalCount: number, daysCount: number = 60): SearchQueryHistoryItem[] {
  const history: SearchQueryHistoryItem[] = [];
  const baseAvg = Math.max(1, Math.floor(totalCount / daysCount));
  let remaining = totalCount;

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    let dayCount = 0;
    if (i === 0) {
      dayCount = remaining;
    } else {
      const dev = Math.floor(Math.random() * (baseAvg * 0.8)) - Math.floor(baseAvg * 0.4);
      dayCount = Math.max(1, baseAvg + dev);
      if (remaining - dayCount < 0) {
        dayCount = remaining;
      }
    }
    remaining -= dayCount;
    history.push({ date: dateStr, count: dayCount });
    if (remaining <= 0) {
      // fill remaining with zeroes if any days left
      while (i > 0) {
        i--;
        const nextD = new Date();
        nextD.setDate(nextD.getDate() - i);
        history.push({ date: nextD.toISOString().split('T')[0], count: 0 });
      }
      break;
    }
  }
  return history;
}

/**
 * Fetches the top searched terms from Firestore. If none exist, seeds default ones with 60 days history.
 */
export async function getSearchQueriesFromFirestore(): Promise<SearchQueryItem[]> {
  try {
    const collRef = collection(db, 'search_queries');
    const qSnap = await getDocs(collRef);
    let list: SearchQueryItem[] = [];
    qSnap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as SearchQueryItem);
    });

    // If no queries in Firestore or some existing queries are missing history, seed/upgrade them
    const needsMigration = list.length > 0 && list.some(item => !item.history || item.history.length === 0);

    if (list.length === 0 || needsMigration) {
      const initialQueries: { term: string; count: number; category: string }[] = [
        { term: "Stranger Things", count: 1420, category: "Series" },
        { term: "Avatar 2", count: 1250, category: "Movie" },
        { term: "From Season 3", count: 1120, category: "Series" },
        { term: "Live Cricket TV", count: 980, category: "Live TV" },
        { term: "Interstellar 4K", count: 850, category: "Movie" },
        { term: "Game of Thrones", count: 740, category: "Series" },
        { term: "Inception", count: 620, category: "Movie" },
        { term: "The Dark Knight", count: 580, category: "Movie" },
        { term: "Braveheart HD", count: 490, category: "Movie" },
        { term: "Hindi Dubbed Action", count: 430, category: "General" }
      ];

      const updatedList: SearchQueryItem[] = [];
      for (const item of initialQueries) {
        const safeId = item.term.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const history = generatePastHistory(item.count, 60);
        
        // Pick the date of the last active search from history or current time
        const lastSearchedAt = new Date().toISOString();

        const fullItem: SearchQueryItem = {
          term: item.term,
          count: item.count,
          category: item.category,
          lastSearchedAt,
          history
        };

        await setDoc(doc(db, 'search_queries', safeId), cleanObject(fullItem));
        updatedList.push({ id: safeId, ...fullItem });
      }
      list = updatedList;
    }

    // Sort by count descending
    return list.sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Error fetching search queries from Firestore:", error);
    // Return fallback list with generated histories
    const fallbacks = [
      { term: "Stranger Things", count: 1420, category: "Series" },
      { term: "Avatar 2", count: 1250, category: "Movie" },
      { term: "From Season 3", count: 1120, category: "Series" },
      { term: "Live Cricket TV", count: 980, category: "Live TV" },
      { term: "Interstellar 4K", count: 850, category: "Movie" },
      { term: "Game of Thrones", count: 740, category: "Series" },
      { term: "Inception", count: 620, category: "Movie" },
      { term: "The Dark Knight", count: 580, category: "Movie" },
      { term: "Braveheart HD", count: 490, category: "Movie" },
      { term: "Hindi Dubbed Action", count: 430, category: "General" }
    ];

    return fallbacks.map(item => ({
      ...item,
      lastSearchedAt: new Date().toISOString(),
      history: generatePastHistory(item.count, 60)
    }));
  }
}

/**
 * Increment or create a search query in Firestore
 */
export async function trackSearchQueryInFirestore(term: string, category: string = "General"): Promise<void> {
  try {
    const trimmed = term.trim();
    if (!trimmed) return;
    const safeId = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const qDoc = doc(db, 'search_queries', safeId);
    const snap = await getDoc(qDoc);
    const currentDateStr = new Date().toISOString().split('T')[0];

    if (snap.exists()) {
      const data = snap.data();
      const currentHistory: SearchQueryHistoryItem[] = data.history || [];
      const historyIndex = currentHistory.findIndex((h: any) => h.date === currentDateStr);
      if (historyIndex > -1) {
        currentHistory[historyIndex].count = (currentHistory[historyIndex].count || 0) + 1;
      } else {
        currentHistory.push({ date: currentDateStr, count: 1 });
      }

      await setDoc(qDoc, cleanObject({
        ...data,
        count: (data.count || 0) + 1,
        lastSearchedAt: new Date().toISOString(),
        history: currentHistory
      }), { merge: true });
    } else {
      await setDoc(qDoc, cleanObject({
        term: trimmed,
        count: 1,
        category,
        lastSearchedAt: new Date().toISOString(),
        history: [{ date: currentDateStr, count: 1 }]
      }));
    }
  } catch (error) {
    console.error("Error tracking search query in Firestore:", error);
  }
}



