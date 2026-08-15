import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import i18n from './i18n';

export type NotificationType = 'match' | 'message' | 'like' | 'superlike' | 'reminder' | 'broadcast';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function initializeNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permissions not granted');
      return null;
    }

    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF2D78',
      });

      // Canal específico para mensajes (alta prioridad)
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Mensajes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF2D78',
        sound: 'default',
      });

      // Canal para matches
      await Notifications.setNotificationChannelAsync('matches', {
        name: 'Matches',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#4CAF50',
        sound: 'default',
      });

      // Canal para anuncios globales (broadcasts)
      await Notifications.setNotificationChannelAsync('broadcasts', {
        name: 'Anuncios Globales',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#FF2D78',
        sound: 'default',
      });
    }

    if (Device.isDevice) {
      // IMPORTANTE: Pasar el projectId de EAS para que el token sea válido
      // en builds standalone (Google Play / TestFlight)
      const projectId = '0006d883-a7a4-4640-b189-55e879e2b00b';
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('[Notifications] Push token obtained:', token);
      return token;
    } else {
      console.log('[Notifications] Not a physical device, skipping token');
    }
    return null;
  } catch (error) {
    console.error('[Notifications] Failed to initialize:', error);
    return null;
  }
}


export async function sendLocalNotification(payload: NotificationPayload) {
  if (Platform.OS === 'web') return;

  try {
    const notificationContent: Notifications.NotificationContentInput = {
      title: payload.title,
      body: payload.body,
      sound: 'default',
      badge: 1,
      data: {
        type: payload.type,
        ...payload.data,
      },
    };

    // Add custom sound for different notification types
    if (payload.type === 'match') {
      notificationContent.subtitle = '¡Es un match!';
    } else if (payload.type === 'message') {
      notificationContent.subtitle = 'Nuevo mensaje';
    }

    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

/**
 * Sends a local push notification specifically for global broadcasts.
 * Works both in foreground (with sound + banner) and background.
 */
export async function sendBroadcastNotification(title: string, body: string, data?: Record<string, any>) {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        badge: 1,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          type: 'broadcast',
          ...data,
        },
        ...(Platform.OS === 'android' ? { channelId: 'broadcasts' } : {}),
      },
      trigger: null, // Send immediately
    });
    console.log('[Notifications] Broadcast push sent:', title);
  } catch (error) {
    console.error('[Notifications] Failed to send broadcast notification:', error);
  }
}

export async function scheduleNotification(
  payload: NotificationPayload,
  delaySeconds: number
) {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        sound: 'default',
        data: {
          type: payload.type,
          ...payload.data,
        },
      },
      trigger: {
        type: 'timeInterval',
        seconds: delaySeconds,
      } as any,
    });
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
}

export async function cancelAllNotifications() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Notification templates using i18n
export const notificationTemplates = {
  newMatch: (name: string): NotificationPayload => ({
    type: 'match',
    title: i18n.t('notifications.new_match.title'),
    body: i18n.t('notifications.new_match.body', { name }),
    data: { action: 'navigate_to_chat' },
  }),

  newMessage: (name: string, preview: string): NotificationPayload => ({
    type: 'message',
    title: i18n.t('notifications.new_message.title', { name }),
    body: preview,
    data: { action: 'navigate_to_chat', from: name },
  }),

  newLike: (name: string): NotificationPayload => ({
    type: 'like',
    title: i18n.t('notifications.new_like.title', { name }),
    body: i18n.t('notifications.new_like.body'),
    data: { action: 'navigate_to_likes' },
  }),

  newSuperLike: (name: string): NotificationPayload => ({
    type: 'superlike',
    title: i18n.t('notifications.new_superlike.title', { name }),
    body: i18n.t('notifications.new_superlike.body'),
    data: { action: 'navigate_to_profile', uid: name },
  }),

  dailyReminder: (): NotificationPayload => ({
    type: 'reminder',
    title: i18n.t('notifications.daily_reminder.title'),
    body: i18n.t('notifications.daily_reminder.body'),
    data: { action: 'navigate_to_discover' },
  }),

  likeExpired: (): NotificationPayload => ({
    type: 'reminder',
    title: i18n.t('notifications.like_expired.title'),
    body: i18n.t('notifications.like_expired.body'),
    data: { action: 'navigate_to_paywall' },
  }),
};
