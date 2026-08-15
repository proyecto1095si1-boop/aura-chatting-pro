import { db } from './firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from './auth-context';

// In-memory cache for profiles
const profileCache: Record<string, UserProfile> = {};

/**
 * Fetches a single profile by UID, using cache if available.
 */
export async function getProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  if (profileCache[uid]) return profileCache[uid];

  try {
    const snap = await getDoc(doc(db, 'profiles', uid));
    if (snap.exists()) {
      const profile = { uid, ...snap.data() } as UserProfile;
      profileCache[uid] = profile;
      return profile;
    }
  } catch (e) {
    console.error(`[ProfileService] Error fetching profile ${uid}:`, e);
  }
  return null;
}

/**
 * Fetches multiple profiles by UIDs in batch, using cache for those already fetched.
 * Uses Firestore 'in' query for missing ones.
 */
export async function getProfiles(uids: string[]): Promise<Record<string, UserProfile>> {
  const results: Record<string, UserProfile> = {};
  const missingUids: string[] = [];

  uids.forEach(uid => {
    if (profileCache[uid]) {
      results[uid] = profileCache[uid];
    } else if (uid) {
      missingUids.push(uid);
    }
  });

  if (missingUids.length === 0) return results;

  // Firestore 'in' query has a limit of 10 or 30 depending on version, 
  // but we'll chunk it if needed. For now 30 is usually enough for chat/matches.
  const chunks: string[][] = [];
  for (let i = 0; i < missingUids.length; i += 30) {
    chunks.push(missingUids.slice(i, i + 30));
  }

  try {
    const promises = chunks.map(async (chunk) => {
      const q = query(collection(db, 'profiles'), where('uid', 'in', chunk));
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        const profile = { uid: d.id, ...d.data() } as UserProfile;
        profileCache[d.id] = profile;
        results[d.id] = profile;
      });
    });

    await Promise.all(promises);
  } catch (e) {
    console.error('[ProfileService] Error fetching batch profiles:', e);
    // Fallback to individual fetches if 'in' query fails (e.g. too many IDs or other issues)
    for (const uid of missingUids) {
      if (!results[uid]) {
        const p = await getProfile(uid);
        if (p) results[uid] = p;
      }
    }
  }

  return results;
}

/**
 * Clears the profile cache.
 */
export function clearProfileCache() {
  Object.keys(profileCache).forEach(key => delete profileCache[key]);
}

/**
 * Manually updates the cache for a profile.
 */
export function updateProfileCache(uid: string, data: Partial<UserProfile>) {
  if (profileCache[uid]) {
    profileCache[uid] = { ...profileCache[uid], ...data };
  }
}
