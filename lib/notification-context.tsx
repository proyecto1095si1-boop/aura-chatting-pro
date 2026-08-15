import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { sendBroadcastNotification } from './notifications-service';

type NotificationType = 'match' | 'message' | 'system' | 'success';

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  image?: string;
  data?: any;
}

interface NotificationContextType {
  unreadCount: number;
  lastNotification: AppNotification | null;
  showNotification: (notification: Omit<AppNotification, 'id'>) => void;
  clearNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState<AppNotification | null>(null);
  const initialLoadRef = useRef(true);
  const initialProfileLoadRef = useRef(true);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      setLastNotification(null);
      return;
    }

    // Listen to matches collection for unread messages and new matches
    const q = query(collection(db, 'matches'), where('participants', 'array-contains', user.uid));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let totalUnread = 0;
      let newestChange: any = null;

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        if (change.type === 'added' || change.type === 'modified') {
          // Check if this change should trigger a notification
          // 1. It must not be the initial load
          // 2. The trigger must not be from the current user
          // 3. User settings must allow it
          
          if (!initialLoadRef.current) {
            const isNewMatch = data.isNew && !data.lastMessage;
            const hasNewMessage = data.lastMessage && data.lastMessageTime && data.unreadCount > 0;
            
            if (isNewMatch && user.notifications?.matches) {
              newestChange = { type: 'match', data, id: change.doc.id };
            } else if (hasNewMessage && user.notifications?.messages && data.lastMessageSenderId !== user.uid) {
              // Only notify if the last sender was NOT the current user
              newestChange = { type: 'message', data, id: change.doc.id };
            }
          }

          if (data.unreadCount && data.lastMessageSenderId !== user.uid) {
             totalUnread += data.unreadCount;
          }
        }
      });

      setUnreadCount(totalUnread);

      if (newestChange) {
        // Fetch source profile for the notification
        const otherUserId = newestChange.data.participants.find((id: string) => id !== user.uid);
        if (otherUserId) {
          const profileSnap = await getDoc(doc(db, 'profiles', otherUserId));
          if (profileSnap.exists()) {
            const profile = profileSnap.data();
            setLastNotification({
              id: newestChange.id,
              type: newestChange.type as NotificationType,
              title: newestChange.type === 'match' ? '¡Nuevo Match! 🔥' : profile.name,
              message: newestChange.type === 'match' ? `Te has conectado con ${profile.name}` : newestChange.data.lastMessage,
              image: profile.photos?.[0],
              data: newestChange.data
            });
          }
        }
      }

      initialLoadRef.current = false;
    }, (err) => {
      console.error("[NotificationProvider] Matches listener error:", err);
    });

    // 2. Listen to profile for Rewards
    const profileDocRef = doc(db, 'profiles', user.uid);
    const unsubscribeProfile = onSnapshot(profileDocRef, async (snapshot) => {
      const profileData = snapshot.data();
      if (!profileData) return;

      // Check if the administrator triggered a "reward" flag
      if (!initialProfileLoadRef.current && profileData.subscriptionRewardAt) {
        // Trigger the reward toast
        setLastNotification({
          id: 'reward-system',
          type: 'system',
          title: '¡Felicidades!',
          message: t('settings.notifications.rewarded', '¡Fuiste recompensado! ✨'),
          image: 'https://aura-app.web.app/icon.png', // Official Aura icon
          data: { type: 'reward' }
        });

        // Optional: clear the reward-at flag locally in Firestore to avoid duplicate toasts
        // but it's safer to just handle it with the timestamp vs local ref if we want.
      }
      initialProfileLoadRef.current = false;
    }, (err) => {
      console.error("[NotificationProvider] Profile listener error:", err);
    });

    // 3. Listen to Global Broadcasts
    let lastBroadcastAt: string | null = null;
    const unsubBroadcast = onSnapshot(doc(db, 'system_settings', 'push_broadcast'), (snapshot) => {
      const data = snapshot.data();
      if (!data || !data.sentAt || !data.templateId) return;

      // Only trigger if this is a NEW broadcast (newer than when the app started)
      if (!lastBroadcastAt) {
        lastBroadcastAt = data.sentAt;
        return; // Skip the very first load to avoid showing old notifications
      }

      if (data.sentAt !== lastBroadcastAt) {
        lastBroadcastAt = data.sentAt;
        
        // Translate locally
        const title = t(`notifications.templates.${data.templateId}.title`, 'Notificación de Aura');
        const message = t(`notifications.templates.${data.templateId}.message`, 'Tenemos novedades para ti');
        
        setLastNotification({
          id: `broadcast-${data.sentAt}`,
          type: 'system',
          title,
          message,
          image: 'https://aura-app.web.app/icon.png',
          data: { type: 'broadcast', templateId: data.templateId }
        });

        // 🔔 The REAL push notification is sent by Firebase Cloud Functions.
        // We DO NOT call sendBroadcastNotification() here to avoid duplicate pushes.
      }
    });

    // 3b. Listen to 'broadcasts' collection (custom admin announcements)
    let lastBroadcastId: string | null = null;
    const broadcastsQuery = query(
      collection(db, 'broadcasts'),
      where('active', '==', true),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const unsubBroadcasts = onSnapshot(broadcastsQuery, (snapshot) => {
      if (snapshot.empty) return;

      const broadcastDoc = snapshot.docs[0];
      const broadcastData = broadcastDoc.data();

      // Skip the initial load to avoid re-notifying on app open
      if (!lastBroadcastId) {
        lastBroadcastId = broadcastDoc.id;
        return;
      }

      if (broadcastDoc.id !== lastBroadcastId) {
        lastBroadcastId = broadcastDoc.id;

        const typeEmoji = broadcastData.type === 'promo' ? '🎁' : broadcastData.type === 'alert' ? '⚠️' : '📢';

        // 🔔 Fire a REAL push notification with sound for users currently in the app
        sendBroadcastNotification(
          `${typeEmoji} ${broadcastData.title}`,
          broadcastData.message,
          { broadcastId: broadcastDoc.id, broadcastType: broadcastData.type }
        );
        
        // We DO NOT call setLastNotification() here to avoid duplicating the 
        // persistent in-app banner that already exists in the Discover tab.
      }
    }, (err) => {
      console.warn('[NotificationProvider] Broadcasts collection listener error:', err.message);
    });

    // 5. Listen to Super Likes for real-time toasts
    const swipesQuery = query(
      collection(db, 'swipes'),
      where('to', '==', user.uid),
      where('super', '==', true),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    let lastSuperSwipeId: string | null = null;
    const unsubSuperLikes = onSnapshot(swipesQuery, async (snapshot) => {
      if (snapshot.empty) return;
      const swipeDoc = snapshot.docs[0];
      if (lastSuperSwipeId === null) {
        lastSuperSwipeId = swipeDoc.id;
        return;
      }
      if (swipeDoc.id !== lastSuperSwipeId) {
        lastSuperSwipeId = swipeDoc.id;
        const swipeData = swipeDoc.data();
        const profileSnap = await getDoc(doc(db, 'profiles', swipeData.from));
        if (profileSnap.exists()) {
          const profile = profileSnap.data();
          setLastNotification({
            id: `superlike-${swipeDoc.id}`,
            type: 'success', // Use success type for premium look
            title: '¡SUPER LIKE! ⭐',
            message: `${profile.name} te ha dado un Super Like`,
            image: profile.photos?.[0],
            data: { type: 'superlike', uid: swipeData.from }
          });
        }
      }
    });

    // 4. Handle Notification Clicks (Background to Foreground)
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      if (data?.matchId) {
        router.push(`/chat/${data.matchId}` as any);
      } else if (data?.type === 'match') {
        router.push('/(tabs)/matches' as any);
      } else if (data?.type === 'reward' || data?.type === 'broadcast') {
        router.push('/(tabs)/profile' as any);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeProfile();
      unsubBroadcast();
      unsubBroadcasts();
      unsubSuperLikes();
      subscription.remove();
    };
  }, [user?.uid, user?.notifications?.matches, user?.notifications?.messages, t]);

  const clearNotification = () => setLastNotification(null);

  const showNotification = (notification: Omit<AppNotification, 'id'>) => {
    setLastNotification({
      ...notification,
      id: `manual-${Date.now()}`
    });
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, lastNotification, showNotification, clearNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
