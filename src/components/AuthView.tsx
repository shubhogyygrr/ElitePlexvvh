import * as React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { INITIAL_PROFILES } from '../data/mockData';
import { User, Mail, Lock, LogIn, ChevronRight, Sparkles, Globe, UserCheck, AlertTriangle, ShieldAlert, Copy, Check, ExternalLink, X } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { syncUserProfile } from '../lib/firestoreService';

interface AuthProps {
  onLoginSuccess: (profile: UserProfile) => void;
  key?: string;
}

export default function AuthView({ onLoginSuccess }: AuthProps) {
  const [viewState, setViewState] = useState<'profile' | 'login' | 'signup'>('profile');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<UserProfile[]>(INITIAL_PROFILES);

  React.useEffect(() => {
    try {
      const savedStr = localStorage.getItem('ep_device_saved_users');
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (Array.isArray(saved) && saved.length > 0) {
          const merged: UserProfile[] = [];
          const seenIds = new Set<string>();

          // Add unique profiles from local storage
          saved.forEach((u: any) => {
            if (u && u.id && !seenIds.has(u.id)) {
              merged.push(u);
              seenIds.add(u.id);
            }
          });

          // Add default profiles if they are not already present
          INITIAL_PROFILES.forEach(p => {
            if (p && p.id && !seenIds.has(p.id)) {
              merged.push(p);
              seenIds.add(p.id);
            }
          });

          setAvailableProfiles(merged);
        }
      }
    } catch (e) {
      console.error("Failed to parse saved device users in AuthView:", e);
    }
  }, []);

  // 1-second interval to update live countdown timer
  const [tick, setTick] = useState(0);
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getProfileCountdown = (profile: UserProfile) => {
    const storageKey = `ep_premium_expiry_${profile.id || profile.email || 'guest'}`;
    let expiry = profile.premiumExpiry;
    
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
      return 'EXPIRED';
    }

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Status & Error indicators
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleProfileSelect = (profile: UserProfile) => {
    setSelectedProfileId(profile.id);
    setTimeout(() => {
      onLoginSuccess(profile);
    }, 800); // Cinematic transition delay
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const lowerEmail = email.toLowerCase();
      const cachedAdminEmail = (localStorage.getItem('ep_admin_email') || 'admin@gmail.com').toLowerCase();
      const cachedAdminPassword = localStorage.getItem('ep_admin_password') || 'AdminPro';

      const isSpecialAdmin = 
        (lowerEmail === cachedAdminEmail || lowerEmail === 'admin@gmali.com' || lowerEmail === 'admin@gmail.com') && 
        (password === cachedAdminPassword || (lowerEmail === 'admin@gmail.com' && password === 'AdminPro'));

      if ((lowerEmail === cachedAdminEmail || lowerEmail === 'admin@gmali.com') && password !== cachedAdminPassword && password !== 'AdminPro') {
        throw new Error("Admin account must use the correct secure passcode.");
      }

      if (isSpecialAdmin) {
        let fbUser: any = null;
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          fbUser = userCredential.user;
        } catch (signInErr) {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            fbUser = userCredential.user;
          } catch (signUpErr) {
            console.warn("Firebase Auth bypass for Admin activated:", signUpErr);
          }
        }

        let profile: UserProfile;
        if (fbUser) {
          profile = await syncUserProfile(
            fbUser.uid,
            'System Admin',
            fbUser.email || email,
            fbUser.photoURL || INITIAL_PROFILES[0].avatarUrl
          );
        } else {
          profile = {
            id: 'special-admin-bypass-uid',
            name: 'System Admin',
            email: email,
            avatarUrl: INITIAL_PROFILES[0].avatarUrl,
            isPremium: true,
            isAdmin: true,
          };
        }
        onLoginSuccess(profile);
        return;
      }

      if (viewState === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        const profile = await syncUserProfile(
          fbUser.uid,
          fbUser.displayName || fbUser.email?.split('@')[0] || 'Premium Member',
          fbUser.email || email,
          fbUser.photoURL || INITIAL_PROFILES[0].avatarUrl
        );
        onLoginSuccess(profile);
      } else if (viewState === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        
        if (fullName) {
          try {
            await updateProfile(fbUser, { displayName: fullName });
          } catch (profileErr) {
            console.error("Could not set displayName during sign up:", profileErr);
          }
        }

        const profile = await syncUserProfile(
          fbUser.uid,
          fullName || fbUser.displayName || fbUser.email?.split('@')[0] || 'Elite Member',
          fbUser.email || email,
          fbUser.photoURL || INITIAL_PROFILES[0].avatarUrl
        );
        onLoginSuccess(profile);
      }
    } catch (err: any) {
      console.warn("Authentication Event Handled:", err);
      let errMsg = err.message || "An error occurred during authentication.";
      if (err.code === 'auth/invalid-credential') {
        errMsg = "Invalid email or secure passkey.";
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = "This email is already registered in the Elite circle.";
      } else if (err.code === 'auth/weak-password') {
        errMsg = "Secure passkey must be at least 6 characters.";
      } else if (err.code === 'auth/invalid-email') {
        errMsg = "Please enter a valid email address.";
      } else if (err.code === 'auth/user-not-found') {
        errMsg = "No registered user found with this email.";
      } else if (err.code === 'auth/wrong-password') {
        errMsg = "Incorrect password. Please try again.";
      } else if (err.code === 'auth/network-request-failed' || errMsg.includes('network-request-failed')) {
        errMsg = "Firebase Network Request Failed. This typically happens in sandboxed browser previews due to cross-origin restriction or server isolation. You can safely bypass this to continue using the app locally.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;
      const profile = await syncUserProfile(
        fbUser.uid,
        fbUser.displayName || 'Google Cinephile',
        fbUser.email || '',
        fbUser.photoURL || INITIAL_PROFILES[2].avatarUrl
      );
      onLoginSuccess(profile);
    } catch (err: any) {
      console.error("Google login failed:", err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setUnauthorizedDomain(window.location.hostname);
      } else if (err.code === 'auth/network-request-failed' || err.message?.includes('network-request-failed')) {
        setError("Firebase Network Request Failed. This typically happens in sandboxed browser previews due to cross-origin restriction or server isolation. You can safely bypass this to continue using the app locally.");
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || "Could not complete secure Google connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    onLoginSuccess(INITIAL_PROFILES[1]); // Guest Cinephile
  };

  return (
    <div id="auth-container" className="fixed inset-0 bg-black flex items-center justify-center overflow-y-auto px-6 py-12 z-40">
      {/* Background ambient gold/purple lighting spots */}
      <div className="absolute top-0 left-1/4 w-[300px] h-[300px] rounded-full purple-gradient-glow opacity-50" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full gold-radial-glow opacity-30" />

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          {viewState === 'profile' && (
            <motion.div
              key="profile-selector"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              {/* Header */}
              <div className="mb-10 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-black border border-gold-base/50 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                  <Sparkles className="w-5 h-5 text-gold-base" />
                </div>
                <h1 className="text-3xl font-serif font-medium tracking-wide mb-2 text-white">Who is Watching?</h1>
                <p className="text-xs text-white/50 tracking-widest font-tech">SELECT YOUR CINEMATIC EXPERIENCE</p>
              </div>

              {/* Profiles Grid */}
              <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto mb-10">
                {availableProfiles.map((profile, idx) => (
                  <motion.button
                    key={`auth-profile-${profile.id || idx}-${idx}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleProfileSelect(profile)}
                    className="flex flex-col items-center group relative cursor-pointer"
                  >
                    {/* Animated Avatar Frame */}
                    <div
                      className={`relative w-24 h-24 rounded-full p-[3px] transition-all duration-300 ${
                        selectedProfileId === profile.id
                          ? 'bg-gradient-to-tr from-gold-base via-white to-gold-dark ring-4 ring-gold-base/30'
                          : profile.isPremium
                          ? 'bg-gradient-to-tr from-gold-dark via-purple-accent to-gold-base group-hover:from-gold-base group-hover:to-gold-light'
                          : 'bg-white/10 group-hover:bg-white/30'
                      } mb-3 shadow-lg`}
                    >
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full rounded-full object-cover bg-luxury-gray-dark border border-black"
                      />

                      {/* Premium Gold Tag Indicator */}
                      {profile.isPremium && (
                        <div className="absolute -top-1 -right-1 gold-gradient-bg text-[7px] text-black px-1.5 py-0.5 rounded-full font-serif font-extrabold tracking-widest shadow-md">
                          VIP
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <span
                      className={`text-sm font-sans tracking-wide transition-colors ${
                        selectedProfileId === profile.id
                          ? 'text-gold-base font-medium'
                          : 'text-white/70 group-hover:text-white'
                      }`}
                    >
                      {profile.name}
                    </span>

                    {/* Premium Countdown displayed live on logged-out profile selection screen */}
                    {profile.isPremium && (
                      <span className="text-[9px] font-mono text-gold-base mt-1 bg-gold-base/5 px-2 py-0.5 rounded-full border border-gold-base/15 animate-pulse">
                        ⏳ {getProfileCountdown(profile)}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={() => setViewState('login')}
                  className="text-xs font-tech tracking-widest text-gold-base hover:text-gold-light transition-colors py-3.5 px-6 rounded-xxl border border-gold-base/20 hover:border-gold-base/50 bg-gold-base/5 hover:bg-gold-base/10"
                >
                  MANAGE ACCOUNTS
                </button>
                <button
                  onClick={handleGuestAccess}
                  className="text-xs font-tech tracking-widest text-white/50 hover:text-white transition-colors"
                >
                  ENTER AS GUEST
                </button>
              </div>
            </motion.div>
          )}

          {(viewState === 'login' || viewState === 'signup') && (
            <motion.div
              key="auth-form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="luxury-glass p-8 rounded-xxl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            >
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-serif tracking-wide text-white mb-2">
                  {viewState === 'login' ? 'Access Elite Plex' : 'Create Credentials'}
                </h2>
                <p className="text-xs text-white/40 tracking-widest uppercase font-tech">
                  {viewState === 'login' ? 'AUTHENTICATE ACCESS' : 'JOIN THE INNER CIRCLE'}
                </p>
              </div>

              {/* Error Alert Panel */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex flex-col gap-3 text-xs text-red-200 text-left"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                  {error.includes("network-request-failed") && (
                    <div className="flex flex-col gap-2 mt-1 pt-2.5 border-t border-red-500/10">
                      <p className="text-[10px] text-white/50 leading-relaxed">
                        Since Firebase endpoints appear blocked or restricted inside this container sandbox, you can instantly bypass authentication to proceed securely with local cache state:
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onLoginSuccess({
                              id: 'special-admin-bypass-uid',
                              name: 'System Admin',
                              email: email || 'admin@gmail.com',
                              avatarUrl: INITIAL_PROFILES[0].avatarUrl,
                              isPremium: true,
                              isAdmin: true,
                            });
                          }}
                          className="px-3 py-2 rounded-lg bg-gold-base text-black font-semibold hover:bg-gold-light transition-all cursor-pointer text-[10px]"
                        >
                          Bypass as Admin
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onLoginSuccess({
                              id: 'special-premium-bypass-uid',
                              name: 'Premium Member',
                              email: email || 'premium@gmail.com',
                              avatarUrl: INITIAL_PROFILES[2].avatarUrl,
                              isPremium: true,
                              isAdmin: false,
                            });
                          }}
                          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-all cursor-pointer text-[10px]"
                        >
                          Bypass as Premium
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
                {/* Full name input for sign up */}
                {viewState === 'signup' && (
                  <div className="flex flex-col gap-1.5 relative">
                    <label className="text-[10px] font-tech tracking-widest text-white/50 uppercase ml-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        type="text"
                        required
                        disabled={loading}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Christopher Nolan"
                        className="w-full bg-black/40 border border-white/10 rounded-xxl py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold-base focus:ring-1 focus:ring-gold-base/40 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}

                {/* Email input */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[10px] font-tech tracking-widest text-white/50 uppercase ml-1">Email Sanctuary</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="email"
                      required
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cinema@eliteplex.com"
                      className="w-full bg-black/40 border border-white/10 rounded-xxl py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold-base focus:ring-1 focus:ring-gold-base/40 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password input */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[10px] font-tech tracking-widest text-white/50 uppercase ml-1">Secure Passkey</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="password"
                      required
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-black/40 border border-white/10 rounded-xxl py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold-base focus:ring-1 focus:ring-gold-base/40 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Remember and Forget password options */}
                <div className="flex items-center justify-between text-xs my-1">
                  <label className="flex items-center gap-2 text-white/60 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={loading}
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-white/20 bg-black accent-gold-base"
                    />
                    Remember Sanctuary
                  </label>
                  <button type="button" className="text-gold-deep hover:text-gold-base transition-colors font-medium">
                    Forgot Passkey?
                  </button>
                </div>

                {/* Submit button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="gold-gradient-bg text-black font-semibold text-xs py-4 rounded-xxl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:brightness-110 cursor-pointer transition-all mt-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      VERIFYING SECURITY...
                    </span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      {viewState === 'login' ? 'ACCESS PLATFORM' : 'CREATE ACCOUNT'}
                    </>
                  )}
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-2 text-white/20">
                  <div className="h-[1px] bg-white/10 flex-1" />
                  <span className="text-[9px] font-tech tracking-widest">OR CONNECT VIA</span>
                  <div className="h-[1px] bg-white/10 flex-1" />
                </div>

                {/* Google sign-in */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="flex items-center justify-center gap-3 py-3.5 rounded-xxl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-semibold tracking-wide disabled:opacity-50 disabled:pointer-events-none"
                >
                  {/* Custom simplified Google SVG */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-.1.13-1.12 2.13l3.32 2.58c1.94-1.8 3.06-4.44 3.06-7.54z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.9l-3.32-2.58c-1.1.75-2.5 1.2-4.61 1.2-3.55 0-6.56-2.4-7.63-5.63l-3.4 2.63C3.18 21.02 7.2 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M4.37 14.09c-.27-.8-.42-1.66-.42-2.59s.15-1.79.42-2.59l-3.4-2.63C.34 7.55 0 9.7 0 12s.34 4.45.97 5.72l3.4-2.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.93 1.19 15.24 0 12 0 7.2 0 3.18 2.98.97 6.28l3.4 2.63c1.07-3.23 4.08-5.63 7.63-5.63z"
                    />
                  </svg>
                  Connect with Google Secure
                </button>
              </form>

              {/* Toggle Login/Sign Up */}
              <div className="mt-6 text-center text-xs">
                {viewState === 'login' ? (
                  <p className="text-white/60">
                    New to Elite Plex?{' '}
                    <button
                      onClick={() => setViewState('signup')}
                      disabled={loading}
                      className="text-gold-base font-semibold hover:underline disabled:opacity-50"
                    >
                      Join Inner Circle
                    </button>
                  </p>
                ) : (
                  <p className="text-white/60">
                    Already a member?{' '}
                    <button
                      onClick={() => setViewState('login')}
                      disabled={loading}
                      className="text-gold-base font-semibold hover:underline disabled:opacity-50"
                    >
                      Access sanctuary
                    </button>
                  </p>
                )}
              </div>

              {/* Back to Profile selection */}
              <button
                onClick={() => setViewState('profile')}
                disabled={loading}
                className="mt-6 w-full flex items-center justify-center gap-2 text-white/40 hover:text-white transition-colors text-xs disabled:opacity-50"
              >
                ← Back to Profile Selector
              </button>
            </motion.div>
          )}

          {/* Unauthorized Domain Guide Modal */}
          {unauthorizedDomain && (
            <motion.div
              key="domain-auth-guide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="luxury-glass max-w-lg w-full p-8 rounded-xxl border border-gold-base/30 shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setUnauthorizedDomain(null)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-12 h-12 rounded-full bg-gold-base/10 border border-gold-base/30 flex items-center justify-center text-gold-base shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-serif text-white font-medium tracking-wide">Domain Authorization Required</h3>
                    <p className="text-[10px] font-tech text-gold-base tracking-widest uppercase">Firebase Security Enforced</p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-4 text-xs text-white/70 text-left leading-relaxed mb-6">
                  <p>
                    Firebase Authentication requires the current web domain to be added to your Authorized Domains list. This prevents unauthorized applications from using your authentication project keys.
                  </p>
                  
                  <div className="bg-black/50 border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-tech text-white/40 uppercase tracking-wider">Current Domain to Authorize</span>
                      <div className="flex items-center justify-between gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        <code className="text-xs font-mono text-gold-light select-all truncate">{unauthorizedDomain}</code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(unauthorizedDomain);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="text-white/60 hover:text-white transition-colors flex items-center gap-1 text-[10px] font-tech uppercase cursor-pointer"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-400" />
                              <span className="text-green-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="font-semibold text-white">How to fix this in your Firebase Console:</p>
                    <ol className="list-decimal list-inside space-y-2 text-white/60 pl-1">
                      <li>
                        Go to your{' '}
                        <a 
                          href="https://console.firebase.google.com/project/elite-e2bc4/authentication/settings" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-gold-base hover:underline inline-flex items-center gap-0.5 font-medium"
                        >
                          Firebase Auth Settings <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Scroll down to the <strong className="text-white/80">Authorized domains</strong> section</li>
                      <li>Click the <strong className="text-white/80">Add domain</strong> button</li>
                      <li>Paste the copied domain, then click <strong className="text-white/80">Add</strong></li>
                    </ol>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3">
                  <a
                    href="https://console.firebase.google.com/project/elite-e2bc4/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 gold-gradient-bg text-black font-semibold text-xs py-3.5 rounded-xxl flex items-center justify-center gap-2 hover:brightness-110 shadow-lg cursor-pointer transition-all text-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                    OPEN FIREBASE SETTINGS
                  </a>
                  <button
                    onClick={() => setUnauthorizedDomain(null)}
                    className="px-6 py-3.5 rounded-xxl border border-white/10 hover:bg-white/5 text-xs font-semibold text-white/70 hover:text-white transition-all cursor-pointer"
                  >
                    DISMISS
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
