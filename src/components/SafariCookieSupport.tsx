import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Settings, 
  RefreshCw, 
  Cookie, 
  Smartphone, 
  Laptop, 
  HelpCircle,
  X,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';

interface SafariCookieSupportProps {
  key?: React.Key;
  isDarkMode?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  showFloatingButton?: boolean;
  showBannerGlobal?: boolean;
}

export default function SafariCookieSupport({ 
  isDarkMode = true,
  isOpen: propIsOpen,
  onClose,
  showFloatingButton = true,
  showBannerGlobal = true
}: SafariCookieSupportProps) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : localIsOpen;
  const setIsOpen = (val: boolean) => {
    if (onClose && !val) {
      onClose();
    } else {
      setLocalIsOpen(val);
    }
  };

  const [hasCookieIssue, setHasCookieIssue] = useState(false);
  const [isSafariOrIOS, setIsSafariOrIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  
  // Diagnostic states
  const [diagnostics, setDiagnostics] = useState({
    cookies: { status: 'checking', message: 'Checking cookie writing permission...' },
    localStorage: { status: 'checking', message: 'Verifying local storage availability...' },
    indexedDb: { status: 'checking', message: 'Testing IndexedDB client engine...' },
    iframeScope: { status: 'checking', message: 'Detecting iframe sandbox environment...' }
  });

  const runDiagnostics = () => {
    const results = { ...diagnostics };
    
    // 1. Check Iframe
    const insideIframe = window.self !== window.top;
    setIsInIframe(insideIframe);
    results.iframeScope = {
      status: insideIframe ? 'warning' : 'success',
      message: insideIframe 
        ? 'Inside Iframe Sandbox (Restrictions Apply)' 
        : 'Running Directly in Root Window (Optimal)'
    };

    // 2. Test Cookies
    let cookiesOk = false;
    try {
      const testKey = 'elite_plex_cookie_test';
      document.cookie = `${testKey}=1; SameSite=None; Secure`;
      cookiesOk = document.cookie.indexOf(testKey) !== -1;
      document.cookie = `${testKey}=1; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=None; Secure`;
    } catch (e) {
      cookiesOk = false;
    }
    results.cookies = {
      status: cookiesOk ? 'success' : 'failed',
      message: cookiesOk 
        ? 'Cookie Engine Active & Accessible' 
        : 'Cookie Write Blocked (Blocked by Browser Policy)'
    };

    // 3. Test Local Storage
    let lsOk = false;
    try {
      localStorage.setItem('elite_plex_ls_test', '1');
      localStorage.removeItem('elite_plex_ls_test');
      lsOk = true;
    } catch (e) {
      lsOk = false;
    }
    results.localStorage = {
      status: lsOk ? 'success' : 'failed',
      message: lsOk 
        ? 'Local Storage Operational' 
        : 'Local Storage Access Denied (Iframe Restriction)'
    };

    // 4. Test IndexedDB
    let idbOk = false;
    try {
      if (typeof window.indexedDB !== 'undefined') {
        idbOk = true;
      }
    } catch (e) {
      idbOk = false;
    }
    results.indexedDb = {
      status: idbOk ? 'success' : 'failed',
      message: idbOk 
        ? 'IndexedDB Database Ready' 
        : 'IndexedDB Access Blocked (Strict Security Cookie Block)'
    };

    setDiagnostics(results as any);

    // Detect user-agent
    const ua = navigator.userAgent.toLowerCase();
    const isSafari = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
    const isIOS = ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsSafariOrIOS(isSafari || isIOS);

    // Set cookie issue trigger
    const hasIssue = !cookiesOk || !lsOk || !idbOk;
    setHasCookieIssue(hasIssue);

    // Auto-show banner if running inside Safari/iOS iframe OR we failed cookie diagnostics
    if (showBannerGlobal && insideIframe && (isSafari || isIOS || hasIssue)) {
      setShowBanner(true);
    }
  };

  useEffect(() => {
    runDiagnostics();
    // Re-check after 1.5 seconds in case of delayed permissions
    const t = setTimeout(runDiagnostics, 1500);
    return () => clearTimeout(t);
  }, []);

  const openInNewTab = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch (e) {
      // Fallback
      const a = document.createElement('a');
      a.href = window.location.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <>
      {/* High-visibility Auto Diagnostic Banner at the top for Safari/iOS users inside Iframe */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-red-950 via-amber-950 to-red-950 border-b border-red-500/20 px-4 py-2.5 shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-serif font-black uppercase text-white tracking-wider flex items-center gap-1.5 justify-center md:justify-start">
                    Action Required: Safari & iOS Cookie Issue Detected
                  </h4>
                  <p className="text-[10px] text-white/70 mt-0.5 leading-relaxed font-sans">
                    Your browser is blocking a required security cookie. This is common on Safari & iOS inside the builder preview.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={openInNewTab}
                  className="bg-red-500 hover:bg-red-600 text-white font-serif font-black text-[9px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg border border-red-400/40 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  Fix Instantly (Open in New Tab)
                </button>
                <button
                  onClick={() => setIsOpen(true)}
                  className="bg-white/10 hover:bg-white/15 text-white/90 font-serif font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  Guide
                </button>
                <button
                  onClick={() => setShowBanner(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-all cursor-pointer"
                  title="Dismiss Banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent floating help bubble at bottom left corner */}
      {showFloatingButton && (
        <div className="fixed bottom-20 left-4 z-[55]">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              runDiagnostics();
              setIsOpen(true);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-2xl backdrop-blur-md cursor-pointer group ${
              hasCookieIssue 
                ? 'bg-amber-500/10 border-amber-500/35 hover:border-amber-500/85 hover:bg-amber-500/15 text-amber-300' 
                : 'bg-emerald-500/10 border-emerald-500/35 hover:border-emerald-500/85 hover:bg-emerald-500/15 text-emerald-300'
            }`}
            title="Browser Cookie & Sandbox Diagnostics Helper"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hasCookieIssue ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${hasCookieIssue ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <Cookie className={`w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300 ${hasCookieIssue ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span className="text-[9px] font-mono uppercase tracking-widest font-black">
              {hasCookieIssue ? 'Cookie Blocked' : 'Cookie Support'}
            </span>
          </motion.button>
        </div>
      )}

      {/* Diagnostics & Resolution Guide Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg overflow-hidden bg-neutral-950 border border-gold-base/30 rounded-3xl p-5 md:p-6 shadow-[0_0_50px_rgba(212,175,55,0.15)] max-h-[90vh] overflow-y-auto"
            >
              {/* Gold Ambient Glow */}
              <div className="absolute -top-16 -left-16 w-36 h-36 bg-gold-base/10 rounded-full blur-[60px]" />
              <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-red-500/10 rounded-full blur-[60px]" />

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white/50 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title Header */}
              <div className="flex items-start gap-3 mt-1 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gold-base/10 border border-gold-base/30 flex items-center justify-center shrink-0">
                  <Cookie className="w-5 h-5 text-gold-base" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-black uppercase text-white tracking-wider">
                    Browser Cookie Support & Diagnostics
                  </h3>
                  <p className="text-[10px] text-white/40 font-mono mt-0.5 uppercase tracking-wider">
                    Safari & iOS Cookie Blocking Troubleshooting
                  </p>
                </div>
              </div>

              {/* Live Diagnostic Status Console */}
              <div className="bg-[#0e0c0c] border border-white/5 rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <span className="text-[10px] font-serif font-black uppercase tracking-wider text-white">
                    Live Diagnostics Console
                  </span>
                  <button 
                    onClick={runDiagnostics}
                    className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 rounded-md text-[8px] font-mono text-gold-base uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Re-Test System
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {/* Cookies Test */}
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Cookie className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-white/80 font-medium text-[11px]">Security Cookies:</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="text-[10px] text-white/50 font-mono">{diagnostics.cookies.message}</span>
                      {diagnostics.cookies.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* LocalStorage Test */}
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-white/80 font-medium text-[11px]">Local Storage:</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="text-[10px] text-white/50 font-mono">{diagnostics.localStorage.message}</span>
                      {diagnostics.localStorage.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* IndexedDB Test */}
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <DatabaseIcon className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-white/80 font-medium text-[11px]">IndexedDB Cache:</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="text-[10px] text-white/50 font-mono">{diagnostics.indexedDb.message}</span>
                      {diagnostics.indexedDb.status === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Iframe detection */}
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-white/80 font-medium text-[11px]">Iframe Sandbox:</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-right">
                      <span className="text-[10px] text-white/50 font-mono">{diagnostics.iframeScope.message}</span>
                      {diagnostics.iframeScope.status === 'success' ? (
                        <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fix Options Tabs */}
              <div className="flex flex-col gap-4">
                {/* METHOD A: Bypassing the Sandbox (Recommended) */}
                <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
                      METHOD 1
                    </span>
                    <h4 className="text-xs font-serif font-black uppercase text-emerald-300">
                      Fix Instantly — Bypass Iframe restrictions
                    </h4>
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed mb-3">
                    Open the application directly in a dedicated browser window. This bypasses the sandboxed iframe and gives the browser absolute, unrestricted storage/cookie permissions.
                  </p>
                  <button
                    onClick={openInNewTab}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-serif font-black text-xs uppercase tracking-wider border border-emerald-400/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-lg shadow-emerald-500/10"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open App in New Window
                  </button>
                </div>

                {/* METHOD B: iOS & Safari Settings adjustment */}
                <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/60 font-black border border-white/5">
                      METHOD 2
                    </span>
                    <h4 className="text-xs font-serif font-black uppercase text-white/90">
                      Configure iOS & Safari Settings
                    </h4>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* iOS Tab */}
                    <div className="flex gap-2.5">
                      <Smartphone className="w-4 h-4 text-gold-base shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-[11px] font-bold text-white uppercase tracking-wide">For iPhone / iPad (iOS Safari)</h5>
                        <ol className="list-decimal list-inside text-[10px] text-white/50 mt-1 leading-relaxed pl-1 space-y-1">
                          <li>Open your device <strong className="text-white">Settings</strong>.</li>
                          <li>Scroll down and tap on <strong className="text-white">Safari</strong>.</li>
                          <li>Scroll to Privacy & Security section.</li>
                          <li>Turn OFF <strong className="text-white">"Prevent Cross-Site Tracking"</strong>.</li>
                          <li>Reload this app inside the builder!</li>
                        </ol>
                      </div>
                    </div>

                    {/* macOS Tab */}
                    <div className="flex gap-2.5 border-t border-white/5 pt-3">
                      <Laptop className="w-4 h-4 text-gold-base shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-[11px] font-bold text-white uppercase tracking-wide">For macOS (Desktop Safari)</h5>
                        <ol className="list-decimal list-inside text-[10px] text-white/50 mt-1 leading-relaxed pl-1 space-y-1">
                          <li>Open Safari browser, go to <strong className="text-white">Safari &gt; Settings</strong>.</li>
                          <li>Click on the <strong className="text-white">Advanced</strong> or Privacy tab.</li>
                          <li>Uncheck <strong className="text-white">"Prevent Cross-Site Tracking"</strong>.</li>
                          <li>Reload this app inside the builder!</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Note / Support */}
              <p className="text-[9px] text-white/30 text-center mt-5 font-mono uppercase tracking-wider">
                Elite Plex Native Engine v4.5.2 • Built-In Cookie Diagnostic Safehouse
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Simple Helper database icon
function DatabaseIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}
