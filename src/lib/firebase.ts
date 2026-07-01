import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCp8wjECHwVqFv1nTf8efxaA92_7ulumAQ",
  authDomain: "elite-e2bc4.firebaseapp.com",
  databaseURL: "https://elite-e2bc4-default-rtdb.firebaseio.com",
  projectId: "elite-e2bc4",
  storageBucket: "elite-e2bc4.firebasestorage.app",
  messagingSenderId: "181452542182",
  appId: "1:181452542182:web:4103deffd7573ddd812b27",
  measurementId: "G-TCESMZV5YF"
};

const getFirebaseConfig = () => {
  try {
    const customApiKey = localStorage.getItem('ep_firebase_apiKey');
    const customAuthDomain = localStorage.getItem('ep_firebase_authDomain');
    const customDatabaseURL = localStorage.getItem('ep_firebase_databaseURL');
    const customProjectId = localStorage.getItem('ep_firebase_projectId');
    const customStorageBucket = localStorage.getItem('ep_firebase_storageBucket');
    const customMessagingSenderId = localStorage.getItem('ep_firebase_messagingSenderId');
    const customAppId = localStorage.getItem('ep_firebase_appId');
    const customMeasurementId = localStorage.getItem('ep_firebase_measurementId');

    if (customApiKey && customProjectId) {
      return {
        apiKey: customApiKey,
        authDomain: customAuthDomain || `${customProjectId}.firebaseapp.com`,
        databaseURL: customDatabaseURL || `https://${customProjectId}-default-rtdb.firebaseio.com`,
        projectId: customProjectId,
        storageBucket: customStorageBucket || `${customProjectId}.firebasestorage.app`,
        messagingSenderId: customMessagingSenderId || "",
        appId: customAppId || "",
        measurementId: customMeasurementId || ""
      };
    }
  } catch (e) {
    console.warn("Error parsing custom firebase config:", e);
  }
  return DEFAULT_FIREBASE_CONFIG;
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase App
const isAppAlreadyInitialized = getApps().length > 0;
const app = isAppAlreadyInitialized ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Firestore safely, avoiding double-initialization issues
let firestoreDb;
if (isAppAlreadyInitialized) {
  try {
    firestoreDb = getFirestore(app);
  } catch (err) {
    console.warn("getFirestore failed on already-initialized app:", err);
  }
}

// Safe storage check to prevent asynchronous IndexedDB/cache errors in sandboxed iframe previews
const isStorageSafe = (() => {
  try {
    if (typeof window === 'undefined') return false;
    if (window.self !== window.top) return false; // Sandbox iframe check
    if (!window.indexedDB) return false;
    // Test if accessing/opening is allowed
    localStorage.getItem('test');
    return true;
  } catch (e) {
    return false;
  }
})();

if (!firestoreDb) {
  try {
    if (isStorageSafe) {
      firestoreDb = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      });
    } else {
      console.log("Sandboxed environment or restricted storage detected, using memoryLocalCache");
      firestoreDb = initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      });
    }
  } catch (error) {
    console.warn("Firestore persistent local cache initialization failed, falling back to standard getFirestore:", error);
    try {
      firestoreDb = initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      });
    } catch (innerError) {
      console.warn("Firestore initializeFirestore failed, falling back to standard getFirestore:", innerError);
      firestoreDb = getFirestore(app);
    }
  }
}

export const db = firestoreDb;
export const rtdb = getDatabase(app);

export default app;
