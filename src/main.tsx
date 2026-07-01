import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely intercept and override native alert/confirm to prevent sandbox crashes
if (typeof window !== 'undefined') {
  // Initialize errors array
  (window as any).__app_errors = (window as any).__app_errors || [];

  try {
    const originalConsoleError = console.error;
    console.error = function (...args) {
      const argStr = args.map(arg => {
        if (!arg) return '';
        if (arg instanceof Error) return arg.stack || arg.message;
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg); } catch(e) { return String(arg); }
        }
        return String(arg);
      }).join(' ');

      // Save to global error array for the Admin Error Table
      const errorList = (window as any).__app_errors || [];
      const exists = errorList.some((e: any) => e.message === argStr);
      if (!exists && argStr.trim()) {
        let category = "System Error";
        if (argStr.toLowerCase().includes("recommendations") || argStr.toLowerCase().includes("gemini") || argStr.toLowerCase().includes("generative")) {
          category = "Gemini AI";
        } else if (argStr.toLowerCase().includes("firestore") || argStr.toLowerCase().includes("firebase")) {
          category = "Firestore DB";
        } else if (argStr.toLowerCase().includes("tmdb") || argStr.toLowerCase().includes("themoviedb")) {
          category = "TMDB API";
        } else if (argStr.toLowerCase().includes("indexeddb")) {
          category = "Local Cache";
        } else if (argStr.toLowerCase().includes("play") || argStr.toLowerCase().includes("video")) {
          category = "Video Player";
        }
        errorList.push({
          id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          message: argStr,
          category,
          severity: argStr.toLowerCase().includes("resource_exhausted") || argStr.toLowerCase().includes("429") || argStr.toLowerCase().includes("limit") ? "Warning" : "Critical",
          resolved: false
        });
        (window as any).__app_errors = errorList;
        window.dispatchEvent(new CustomEvent('app-error-updated'));
      }

      if (
        argStr.includes('offline') || 
        argStr.includes('Could not reach') || 
        argStr.includes('Cloud Firestore backend') ||
        argStr.includes('Backend didn\'t respond') ||
        argStr.includes('Failed to get document')
      ) {
        console.warn("[Firestore Offline/Timeout Intercepted]", ...args);
        return;
      }
      originalConsoleError.apply(console, args);
    };
  } catch (err) {
    console.warn("Could not override console.error:", err);
  }

  // Handle runtime errors
  window.addEventListener('error', (event) => {
    const errorList = (window as any).__app_errors || [];
    const message = event.error ? (event.error.stack || event.error.message) : event.message;
    if (message && message !== "ResizeObserver loop limit exceeded" && !errorList.some((e: any) => e.message === message)) {
      errorList.push({
        id: `err-runtime-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        message: message,
        category: 'Runtime Error',
        severity: 'Critical',
        resolved: false
      });
      (window as any).__app_errors = errorList;
      window.dispatchEvent(new CustomEvent('app-error-updated'));
    }
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const errorList = (window as any).__app_errors || [];
    const reason = event.reason;
    const message = reason instanceof Error ? (reason.stack || reason.message) : String(reason);
    if (message && !errorList.some((e: any) => e.message === message)) {
      errorList.push({
        id: `err-promise-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        message: message,
        category: 'Promise Rejection',
        severity: 'Critical',
        resolved: false
      });
      (window as any).__app_errors = errorList;
      window.dispatchEvent(new CustomEvent('app-error-updated'));
    }
  });

  try {
    const nativeAlert = window.alert;
    window.alert = function (message) {
      console.log("[Alert Override]:", message);
      try {
        if (nativeAlert) {
          nativeAlert.call(window, message);
        } else {
          throw new Error("native window.alert is not available");
        }
      } catch (e) {
        console.warn("Native alert failed or blocked in this iframe sandbox, routing to custom event:", e);
        // Dispatch custom event for safe custom notification rendering in App
        const event = new CustomEvent('elite-plex-alert', {
          detail: { message: String(message) }
        });
        window.dispatchEvent(event);
      }
    };
  } catch (err) {
    console.warn("Could not override window.alert due to sandbox restrictions:", err);
  }

  try {
    const nativeConfirm = window.confirm;
    window.confirm = function (message) {
      console.log("[Confirm Override]:", message);
      try {
        if (nativeConfirm) {
          return nativeConfirm.call(window, message);
        } else {
          throw new Error("native window.confirm is not available");
        }
      } catch (e) {
        console.warn("Native confirm failed or blocked in this iframe sandbox, defaulting to true:", e);
        return true;
      }
    };
  } catch (err) {
    console.warn("Could not override window.confirm due to sandbox restrictions:", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
