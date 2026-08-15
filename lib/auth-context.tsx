import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromCache, onSnapshot, updateDoc } from 'firebase/firestore';

export type AuthStatus = 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated';

export interface UserProfile {
  uid: string,
  email?: string | null,
  name: string,
  birthDate: string,
  age: number,
  gender: string,
  lookingFor: string,
  location?: { latitude: number, longitude: number },
  geohash?: string,
  countryCode?: string,
  originCity?: string,
  travelLocation?: { latitude: number, longitude: number, city: string },
  travelGeohash?: string,
  pushToken?: string,
  photos: string[],
  interests: string[],
  bio: string,
  verified: boolean,
  subscription: 'free' | 'plus' | 'gold' | 'elite',
  dailyLikesUsed: number,
  dailyLikesResetAt: string,
  superLikesUsed: number,
  purchasedSuperLikes: number,
  purchasedBoosts: number,
  purchasedReadReceipts: number,
  hasChildren: boolean | null,
  smokes: 'yes' | 'no' | 'social' | null,
  drinks: 'frequently' | 'socially' | 'never' | null,
  height: number | null,
  languages: string[],
  religion: string | null,
  relationshipGoal: 'chat' | 'friendship' | 'informal' | 'stable' | 'life_partner' | 'stable_flexible' | null,
  distanceUnit: 'km' | 'mi',
  onboardingComplete: boolean,
  role: 'user' | 'admin',
  verificationStatus: 'none' | 'pending' | 'verified' | 'failed',
  verificationPhotoUrl?: string,
  banExpiresAt?: string | null,
  banReason?: string | null,
  banned?: boolean,
  isHidden?: boolean,
  onboardingStep?: number,
  zodiac?: string | null,
  personalityType?: string | null,
  socialLinks?: {
    instagram?: string,
    tiktok?: string,
    spotify?: string
  },
  prompts?: {
    id: string,
    answer: string
  }[],
  exercise?: 'often' | 'sometimes' | 'never' | null,
  education?: string | null,
  pets?: string[] | null,
  privacy?: {
    hideZodiac?: boolean,
    hideHeight?: boolean,
    hideReligion?: boolean,
    hideExercise?: boolean,
    hideEducation?: boolean
  },
  notifications?: {
    matches: boolean,
    messages: boolean,
    appUpdates: boolean
  },
  visibilityMode?: 'standard' | 'incognito',
  recommendationsMode?: 'balanced' | 'recent',
  deletionRequestedAt?: string | null,
  boostUntil?: string | null,
  doubleDate?: {
    partnerId: string | null,
    status: 'none' | 'pending_sent' | 'pending_received' | 'linked',
    modeActive: boolean,
    teamBio?: string,
    teamName?: string
  }
}

interface AuthContextType {
  status: AuthStatus;
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  login: (uid: string, email?: string | null) => Promise<UserProfile | null>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  isBanned: boolean;
  banInfo: { endsAt: string | null; reason: string | null } | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = '@aura_user_profile';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<{ endsAt: string | null; reason: string | null } | null>(null);
  const loginInProgressRef = React.useRef(false);
  const profileUnsubscribeRef = React.useRef<(() => void) | null>(null);
  const isRepairingRef = React.useRef(false);
  const userRef = React.useRef<UserProfile | null>(null);
  
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        if (loginInProgressRef.current) return;
        await loadProfile(fUser);
      } else {
        setUser(null);
        setIsBanned(false);
        setBanInfo(null);
        setStatus('unauthenticated');
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }
    };
  }, []);

  const loadProfile = async (fUser: FirebaseUser) => {
    if (profileUnsubscribeRef.current) {
      profileUnsubscribeRef.current();
      profileUnsubscribeRef.current = null;
    }

    const isAdmin = fUser.email?.toLowerCase() === 'admin@aura-app.com';
    const profileRef = doc(db, 'profiles', fUser.uid);

    try {
      const initialDoc = await getDoc(profileRef);
      if (!initialDoc.exists()) {
        await handleNewUser(fUser, isAdmin);
      }

      profileUnsubscribeRef.current = onSnapshot(profileRef, (docSnap) => {
        if (!docSnap.exists()) return;

        let parsed: UserProfile = docSnap.data() as UserProfile;
        
        // Ban logic
        const banned = !!parsed.banned;
        const banExpiryStr = parsed.banExpiresAt;
        const now = new Date();
        
        if (banned && banExpiryStr) {
          const expiry = new Date(banExpiryStr);
          if (now > expiry) {
             updateDoc(profileRef, { banned: false, banExpiresAt: null }).catch(console.error);
          } else {
            setIsBanned(true);
            setBanInfo({ endsAt: banExpiryStr, reason: parsed.banReason || 'Incumplimiento de normas' });
          }
        } else if (banned && !banExpiryStr) {
          setIsBanned(true);
          setBanInfo({ endsAt: null, reason: parsed.banReason || 'Incumplimiento de normas' });
        } else {
          setIsBanned(false);
          setBanInfo(null);
        }

        // Admin repair
        if (isAdmin && (parsed.role !== 'admin' || !parsed.verified)) {
          if (!isRepairingRef.current) {
            isRepairingRef.current = true;
            updateDoc(profileRef, { role: 'admin', verified: true })
              .then(() => { isRepairingRef.current = false; })
              .catch(() => { isRepairingRef.current = false; });
          }
        }
        
        setUser(parsed);
        setStatus(parsed.onboardingComplete ? 'authenticated' : 'onboarding');
      }, (error) => {
        console.warn("[AuthContext] Profile listener permission error:", error.message);
      });

    } catch (e: any) {
      console.error("[AuthContext] loadProfile error:", e);
      setStatus('unauthenticated');
    }
  };

  const handleNewUser = async (fUser: FirebaseUser, isAdmin: boolean) => {
    const profileRef = doc(db, 'profiles', fUser.uid);
    const baseProfile: Partial<UserProfile> = {
      uid: fUser.uid,
      email: fUser.email,
      name: fUser.displayName || '',
      birthDate: isAdmin ? '1990-01-01' : '',
      age: isAdmin ? 34 : 0,
      gender: isAdmin ? 'other' : '',
      lookingFor: 'everyone',
      photos: [],
      interests: [],
      bio: isAdmin ? 'System Administrator' : '',
      verified: isAdmin,
      subscription: isAdmin ? 'elite' : 'free',
      dailyLikesUsed: 0,
      dailyLikesResetAt: new Date().toISOString(),
      superLikesUsed: 0,
      purchasedSuperLikes: isAdmin ? 999 : 0,
      purchasedBoosts: isAdmin ? 999 : 0,
      purchasedReadReceipts: isAdmin ? 999 : 0,
      hasChildren: isAdmin ? false : null,
      smokes: isAdmin ? 'no' : null,
      drinks: isAdmin ? 'socially' : null,
      height: isAdmin ? 180 : null,
      languages: isAdmin ? ['en', 'es'] : [],
      religion: isAdmin ? 'none' : null,
      relationshipGoal: isAdmin ? 'life_partner' : null,
      distanceUnit: 'km',
      onboardingStep: isAdmin ? 7 : 0,
      onboardingComplete: isAdmin,
      role: isAdmin ? 'admin' : 'user',
      isHidden: isAdmin,
      verificationStatus: isAdmin ? 'verified' : 'none',
      banned: false
    };
    await setDoc(profileRef, baseProfile);
  };

  const login = useCallback(async (uid: string, email?: string | null): Promise<UserProfile | null> => {
    loginInProgressRef.current = true;
    const profileRef = doc(db, 'profiles', uid);
    try {
      let docSnap = await getDoc(profileRef);
      if (docSnap.exists()) {
        const existing = docSnap.data() as UserProfile;
        setUser(existing);
        setStatus(existing.onboardingComplete ? 'authenticated' : 'onboarding');
        loginInProgressRef.current = false;
        return existing;
      }
    } catch (e: any) {
      console.error("[AuthContext] Login check failed:", e);
    }
    loginInProgressRef.current = false;
    return null;
  }, []);

  const sanitizeData = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    const sanitized: any = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (val !== undefined) sanitized[key] = sanitizeData(val);
    });
    return sanitized;
  };

  const logout = useCallback(async () => {
    try {
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }
      await signOut(auth);
      setUser(null);
      setIsBanned(false);
      setBanInfo(null);
      setStatus('unauthenticated');
    } catch (error) {
      console.error("[AuthContext] Logout error:", error);
      // Forced fallback state reset
      setUser(null);
      setIsBanned(false);
      setBanInfo(null);
      setStatus('unauthenticated');
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!firebaseUser) return;
    const currentProfile = userRef.current || { uid: firebaseUser.uid } as UserProfile;
    const updated = { ...currentProfile, ...data };
    setUser(updated as UserProfile);
    try {
      const cleanData = sanitizeData({ ...data });
      await updateDoc(doc(db, 'profiles', firebaseUser.uid), cleanData);
    } catch (error: any) {
      console.error("[AuthContext] updateProfile error:", error.message);
    }
  }, [firebaseUser]);

  const completeOnboarding = useCallback(async () => {
    if (!firebaseUser || !userRef.current) return;
    const updated = { ...userRef.current, onboardingComplete: true };
    await updateDoc(doc(db, 'profiles', firebaseUser.uid), { onboardingComplete: true });
    setUser(updated);
    setStatus('authenticated');
  }, [firebaseUser]);

  const contextValue = useMemo(() => ({
    status, user, firebaseUser, login, logout, updateProfile, completeOnboarding, isBanned, banInfo
  }), [status, user, firebaseUser, login, logout, updateProfile, completeOnboarding, isBanned, banInfo]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
