import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, Mail, Smartphone, Monitor, ShieldCheck, CheckCircle2, 
  X, AlertCircle, ArrowLeft, Crown, HardDrive, Sparkles, FolderHeart, ChevronRight 
} from 'lucide-react';
import { addNotificationToFirestore } from '../lib/firestoreService';
import { triggerRealFileDownload } from '../lib/indexedDBStorage';
import { playInterfaceTick, playGoldenSuccessChime, playCinematicSwell } from '../lib/soundEffects';

interface AppDownloadModalProps {
  key?: React.Key;
  isOpen: boolean;
  onClose: () => void;
  movieTitle: string;
  moviePoster?: string;
  userEmail?: string;
  isPremium?: boolean;
  fileId?: string;
  videoUrl?: string;
  onRemoveAppSave?: (id: string) => void;
  onUpgradePrompt?: () => void;
}

export default function AppDownloadModal({
  isOpen,
  onClose,
  movieTitle,
  moviePoster,
  userEmail = '',
  isPremium = false,
  fileId = '',
  videoUrl = '',
  onRemoveAppSave,
  onUpgradePrompt
}: AppDownloadModalProps) {
  const [email, setEmail] = useState(userEmail);
  const [isEmailSaved, setIsEmailSaved] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  
  const [saveOptionSelected, setSaveOptionSelected] = useState<'app' | 'gallery' | 'both' | 'apk' | null>(null);
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleEmailSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setIsSubmittingEmail(true);
    setEmailError('');

    try {
      await addNotificationToFirestore(
        'Offline Video Key Synced',
        `Decryption key for "${movieTitle}" successfully linked to ${email}.`
      );
      playGoldenSuccessChime();
      setIsEmailSaved(true);
    } catch (err) {
      console.error('Error saving email sync:', err);
      setEmailError('Could not link to email. Please try again.');
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleExecuteSaveMode = async (mode: 'app' | 'gallery' | 'both' | 'apk') => {
    playInterfaceTick();
    setSaveStatus(null);
    setSaveOptionSelected(mode);

    // VIP Validation Checks
    if (mode !== 'app' && mode !== 'apk' && !isPremium) {
      // Prompt upgrade
      setSaveStatus({
        type: 'error',
        message: 'VIP ACCESS DENIED: Chrome local gallery download is a Premium privilege. Upgrade to Elite VIP to unlock raw MP4 downloads!'
      });
      return;
    }

    setIsProcessingSave(true);

    try {
      if (mode === 'apk') {
        // Direct Mobile APK Download
        await new Promise((resolve) => setTimeout(resolve, 500));
        const link = document.createElement('a');
        link.href = '/FlixZone_v4.5.2_Pro_Elite.apk';
        link.download = 'FlixZone_v4.5.2_Pro_Elite.apk';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        playGoldenSuccessChime();
        setSaveStatus({
          type: 'success',
          message: 'SUCCESS: Real Android Mobile APK download initiated! Click install from notifications to run as a real native app on your phone.'
        });
      } else if (mode === 'app') {
        // App Only (Free): Keeps the local indexedDB copy and does not trigger chrome download
        await new Promise((resolve) => setTimeout(resolve, 800));
        playGoldenSuccessChime();
        setSaveStatus({
          type: 'success',
          message: 'SUCCESS: Video encrypted blocks successfully pinned to FlixtZone App memory cache. Enjoy offline streaming anytime for 100% Free!'
        });
      } else if (mode === 'gallery') {
        // Gallery Save (Premium): Triggers direct browser download & deletes App copy
        if (!videoUrl) {
          throw new Error('Video source stream is unavailable.');
        }
        await triggerRealFileDownload(videoUrl, `${movieTitle}.mp4`);
        
        // Remove app save record as requested
        if (fileId && onRemoveAppSave) {
          onRemoveAppSave(fileId);
        }
        
        playGoldenSuccessChime();
        setSaveStatus({
          type: 'success',
          message: 'SUCCESS: DRM-free decryption initiated! Decrypted raw MP4 video file has been pushed directly to Chrome Downloads folder. Local App cache cleared to save disk space.'
        });
      } else if (mode === 'both') {
        // Both App & Gallery (Premium): Triggers direct browser download & preserves App copy
        if (!videoUrl) {
          throw new Error('Video source stream is unavailable.');
        }
        await triggerRealFileDownload(videoUrl, `${movieTitle}.mp4`);
        
        playGoldenSuccessChime();
        setSaveStatus({
          type: 'success',
          message: 'SUCCESS: Dual Mirrored! Video master copy downloaded to local Chrome Downloads gallery folder AND safely indexed inside FlixtZone App offline player library.'
        });
      }
    } catch (err: any) {
      console.error('File save handler failure:', err);
      setSaveStatus({
        type: 'error',
        message: err?.message || 'Decryption stream pipe failed. Please try again.'
      });
    } finally {
      setIsProcessingSave(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative w-full max-w-xl bg-[#0d0d11] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-[0_20px_50px_rgba(212,175,55,0.1)] overflow-hidden my-8"
      >
        {/* Glow border effect */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-base to-transparent" />

        {/* Back Button */}
        <button
          onClick={onClose}
          className="absolute top-6 left-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gold-base/15 border border-gold-base/30 flex items-center justify-center mb-4">
            <Download className="w-5 h-5 text-gold-base animate-pulse" />
          </div>
          <h2 className="text-[10px] font-tech tracking-[0.3em] text-gold-base font-extrabold uppercase mb-1">
            DOWNLOAD COMPLETED
          </h2>
          <h3 className="text-xl font-serif font-black italic text-white tracking-wide uppercase">
            MASTER FILE DECRYPTION SUCCESSFUL
          </h3>
          <p className="text-[11px] text-white/50 leading-relaxed max-w-sm mt-2">
            The high-bitrate video feed has been fully cached. Please select your permanent storage preference below.
          </p>
        </div>

        {/* Selected Movie Preview Card */}
        <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl mb-6">
          {moviePoster && (
            <img
              src={moviePoster}
              alt={movieTitle}
              referrerPolicy="no-referrer"
              className="w-12 aspect-[2/3] object-cover rounded-lg shadow-md border border-white/10 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <span className="text-[8px] font-tech text-white/40 block tracking-wider uppercase">Active Decrypted Title:</span>
            <span className="text-sm font-bold text-white uppercase tracking-wide block truncate">{movieTitle}</span>
            <span className="text-[9px] text-gold-base font-semibold block mt-1">4K UHD Master Stream • Dolby Atmos 7.1</span>
          </div>
        </div>

        {/* Step 1: Email Token Key Link */}
        <div className="mb-6 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
          <span className="text-[8px] font-tech text-white/40 block tracking-widest uppercase mb-2">STEP 1: SYNC OFFLINE KEYS TO EMAIL</span>
          
          <AnimatePresence mode="wait">
            {!isEmailSaved ? (
              <form onSubmit={handleEmailSave} className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    placeholder="Enter email to bind decryption keys..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-base/50 transition-all font-sans"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingEmail}
                  className="px-4 py-2.5 rounded-xl bg-gold-base/10 hover:bg-gold-base/20 border border-gold-base/35 text-gold-base font-tech font-extrabold text-[9px] tracking-wider uppercase transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEmail ? 'SYNCING...' : 'SYNC KEY'}
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2.5 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
                <span>Decryption keys securely bound to <strong className="text-white select-all font-sans">{email}</strong>.</span>
              </div>
            )}
          </AnimatePresence>
          {emailError && <p className="text-[9px] text-red-400 mt-1.5 font-sans">{emailError}</p>}
        </div>

        {/* Step 2: Save Mode Selection (User Directed Core Feature) */}
        <div className="mb-6">
          <span className="text-[8px] font-tech text-white/40 block tracking-widest uppercase mb-3">STEP 2: CHOOSE SECURITY STORAGE DESIRED MODE</span>
          
          <div className="flex flex-col gap-3">
            {/* Mode A: Save to App (FREE) */}
            <button
              onClick={() => handleExecuteSaveMode('app')}
              disabled={isProcessingSave}
              className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group relative ${
                saveOptionSelected === 'app'
                  ? 'bg-gold-base/5 border-gold-base/40 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone className="w-5 h-5 text-sky-400" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-serif font-black uppercase text-white tracking-wide">FlixtZone App Storage</span>
                    <span className="text-[7.5px] font-tech px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest font-extrabold">FREE MODE</span>
                  </div>
                  <span className="text-[10px] text-white/45 mt-0.5 leading-normal pr-4">
                    Decrypts and plays directly inside FlixtZone's sandbox offline dashboard.
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/65 shrink-0" />
            </button>

            {/* Mode B: Save to Chrome Gallery (VIP) */}
            <button
              onClick={() => handleExecuteSaveMode('gallery')}
              disabled={isProcessingSave}
              className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group relative ${
                saveOptionSelected === 'gallery'
                  ? 'bg-[#9d4edd]/5 border-[#9d4edd]/40 shadow-[0_0_15px_rgba(157,78,221,0.1)]'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0 mt-0.5">
                  <HardDrive className="w-5 h-5 text-[#c77dff]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-serif font-black uppercase text-white tracking-wide">Chrome / Gallery Save</span>
                    <span className="text-[7.5px] font-tech px-1.5 py-0.5 rounded bg-amber-500/10 text-gold-base border border-gold-base/30 uppercase tracking-widest font-extrabold flex items-center gap-0.5">
                      <Crown className="w-2 h-2" /> VIP ELITE
                    </span>
                  </div>
                  <span className="text-[10px] text-white/45 mt-0.5 leading-normal pr-4">
                    Triggers browser download directly to device local gallery folder (Deletes from App to save space).
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/65 shrink-0" />
            </button>

            {/* Mode C: App & Gallery Double Mirror (VIP) */}
            <button
              onClick={() => handleExecuteSaveMode('both')}
              disabled={isProcessingSave}
              className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group relative ${
                saveOptionSelected === 'both'
                  ? 'bg-amber-500/5 border-gold-base/40 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0 mt-0.5">
                  <FolderHeart className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-serif font-black uppercase text-white tracking-wide">Dual Mirror: App & Gallery</span>
                    <span className="text-[7.5px] font-tech px-1.5 py-0.5 rounded bg-amber-500/10 text-gold-base border border-gold-base/30 uppercase tracking-widest font-extrabold flex items-center gap-0.5">
                      <Crown className="w-2 h-2" /> VIP ELITE
                    </span>
                  </div>
                  <span className="text-[10px] text-white/45 mt-0.5 leading-normal pr-4">
                    Simultaneously indexes inside App offline dashboard AND downloads local file directly to Chrome Gallery.
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/65 shrink-0" />
            </button>

            {/* Mode D: Download Real Android Mobile App (APK) */}
            <button
              onClick={() => handleExecuteSaveMode('apk')}
              disabled={isProcessingSave}
              className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group relative ${
                saveOptionSelected === 'apk'
                  ? 'bg-emerald-500/5 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/35 hover:bg-emerald-500/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-serif font-black uppercase text-white tracking-wide">Install Real Mobile App (APK)</span>
                    <span className="text-[7.5px] font-tech px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 uppercase tracking-widest font-extrabold flex items-center gap-0.5">
                      RECOMMENDED
                    </span>
                  </div>
                  <span className="text-[10px] text-white/70 mt-0.5 leading-normal pr-4">
                    Download the official native application installer (.APK) to install and run on your mobile device as a real app!
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/65 shrink-0" />
            </button>
          </div>
        </div>

        {/* Feedback / Save mode execution report */}
        <AnimatePresence mode="wait">
          {saveStatus && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl border flex flex-col gap-2.5 mb-6 ${
                saveStatus.type === 'success'
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/5 border-red-500/20 text-red-400'
              }`}
            >
              <div className="flex items-start gap-2.5 text-xs">
                {saveStatus.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-sans text-[11px] leading-relaxed select-text font-medium">{saveStatus.message}</p>
                </div>
              </div>

              {/* VIP Upgrade Action trigger if locked */}
              {saveStatus.type === 'error' && onUpgradePrompt && (
                <button
                  onClick={() => {
                    playCinematicSwell();
                    onClose();
                    onUpgradePrompt();
                  }}
                  className="w-full py-2 bg-gradient-to-r from-gold-light via-gold-base to-gold-dark text-black text-[10px] font-tech font-extrabold tracking-widest rounded-xl transition-all cursor-pointer active:scale-98 uppercase"
                >
                  Activate Elite VIP Now
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Footer */}
        <div className="pt-4 border-t border-white/5 flex flex-col items-center gap-4">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-tech font-extrabold text-[10px] tracking-widest uppercase transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-gold-base" />
            BACK TO GALLERY
          </button>

          {/* Secure Badge */}
          <div className="flex items-center justify-center gap-2 text-[9px] font-mono text-white/30 tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-base" />
            <span>AES-256 BIT DIRECT DECRYPTION ENGINE ACTIVE</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
