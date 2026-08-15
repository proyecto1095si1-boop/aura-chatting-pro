import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  persistentSingleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Configuración unificada mediante Variables de Entorno ─────────────────────
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Platform.OS === 'web' 
    ? process.env.EXPO_PUBLIC_FIREBASE_APP_ID 
    : (process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ─── App Initialization (HMR-safe) ────────────────────────────────────────────
const initializeDefaultApp = () => {
  const apps = getApps();
  if (apps.length > 0) {
    const defaultApp = apps.find(a => a.name === '[DEFAULT]');
    if (defaultApp && defaultApp.options.projectId === firebaseConfig.projectId) {
      return defaultApp;
    }
  }
  return initializeApp(firebaseConfig);
};

const app = initializeDefaultApp();

// ─── Auth ──────────────────────────────────────────────────────────────────────
const auth = (() => {
  try {
    if (Platform.OS === 'web') {
      return getAuth(app);
    } else {
      const { getReactNativePersistence } = require('firebase/auth');
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  } catch (error: any) {
    if (error.code === 'auth/already-initialized') {
      return getAuth(app);
    }
    throw error;
  }
})();

// ─── Firestore ─────────────────────────────────────────────────────────────────
// Web: persistentSingleTabManager permite tener caché local entre recargas
//      (no pierde los datos al refrescar) Y sincroniza con el servidor en cada
//      lectura. Con las Firestore Rules correctas (allow read: if request.auth != null),
//      esto recupera TODOS los perfiles de todos los usuarios.
//
// Móvil: persistentMultipleTabManager para compatibilidad multi-instancia en Android/iOS.
// ─── Firestore ─────────────────────────────────────────────────────────────────
const db = (() => {
  if (Platform.OS === 'web') {
    // Para Web, usamos initializeFirestore con configuraciones de estabilidad.
    // experimentalAutoDetectLongPolling ayuda a evitar cierres por fallos de red/grpc.
    try {
      return initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
      } as any);
    } catch (e) {
      return getFirestore(app);
    }
  } else {
    // Para Móvil, intentamos inicializar con caché persistente
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch (e: any) {
      // Si ya está inicializado (error 'already-initialized'), recuperamos la instancia
      return getFirestore(app);
    }
  }
})();

const storage = getStorage(app);

export { app, auth, db, storage };

export const authStore: { confirmationResult: any; recaptchaVerifier: any } = {
  confirmationResult: null,
  recaptchaVerifier: null,
};
