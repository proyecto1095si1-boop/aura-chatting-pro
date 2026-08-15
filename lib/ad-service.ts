import { Platform } from 'react-native';


import mobileAds, { 
  InterstitialAd, 
  RewardedAd,
  RewardedInterstitialAd, 
  AdEventType, 
  RewardedAdEventType, 
  TestIds 
} from 'react-native-google-mobile-ads';


/**
 * Inicializa el SDK de anuncios. Debe llamarse al inicio de la app.
 */
export async function initializeAds() {
  if (Platform.OS === 'web') return;
  try {
    const adapterStatuses = await mobileAds().initialize();
    console.log('[AdService] SDK Initialized:', adapterStatuses);
  } catch (e) {
    console.error('[AdService] Failed to initialize ads:', e);
  }
}

export type AdResult = 'rewarded' | 'dismissed' | 'error' | 'loaded';

// AD UNIT IDS - Production IDs provided by user
const PROD_INTERSTITIAL_ID = 'ca-app-pub-5481947169256130/7536572214';
const PROD_REWARDED_ID = 'ca-app-pub-5481947169256130/4910408870';

// Usar TestIds en DEV, y IDs reales en Producción
export const INTERSTITIAL_ID = __DEV__ ? TestIds.INTERSTITIAL : PROD_INTERSTITIAL_ID;
export const REWARDED_ID = __DEV__ ? TestIds.REWARDED : PROD_REWARDED_ID;

/**
 * Muestra un anuncio Intersticial (cada 3-4 swipes).
 * Solo se llama desde el Swipe para usuarios Free.
 */
export async function showInterstitial(): Promise<void> {
  if (Platform.OS === 'web' || !InterstitialAd) {
    console.log('[AdService] Simulación Intersticial Web (Finalizado)');
    return;
  }

  return new Promise((resolve) => {
    try {
      const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
        interstitial.show();
      });

      const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        unsubscribeLoaded();
        unsubscribeClosed();
        resolve();
      });

      const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.error('[AdService] Interstitial Error:', error.code, error.message);
        if (error.code === 'admob/no-fill') {
          console.warn('[AdService] NO FILL: Google AdMob no devolvió anuncios. Asegúrate de que tu cuenta esté aprobada y que haya inventario disponible.');
        }
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
        resolve(); // Continuamos la app aunque falle el anuncio
      });

      interstitial.load();
    } catch (e) {
      console.error('[AdService] Error fatal en Intersticial:', e);
      resolve();
    }
  });
}

/**
 * Muestra un anuncio Bonificado Intersticial para ver matches (para usuarios Free).
 */
export async function showRewardedAd(): Promise<AdResult> {
  if (Platform.OS === 'web' || !mobileAds) {
    console.log('[AdService] Simulación Swipes Rewarded (Garantizado)');
    await new Promise(r => setTimeout(r, 1500));
    return 'rewarded';
  }

  return new Promise((resolve) => {
    try {
      // Usamos RewardedAd que es el formato estándar más compatible
      // para recompensas por desbloqueo de perfiles.
      const rewardedAd = RewardedAd.createForAdRequest(REWARDED_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      let earnedReward = false;
      let isShowing = false;

      const unsubscribeLoaded = rewardedAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AdService] Rewarded cargado, mostrando...');
        isShowing = true;
        rewardedAd.show();
      });

      const unsubscribeEarned = rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward: any) => {
          console.log('[AdService] Recompensa ganada:', reward);
          earnedReward = true;
        },
      );

      const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdService] Anuncio cerrado. Recompensa:', earnedReward);
        cleanup();
        resolve(earnedReward ? 'rewarded' : 'dismissed');
      });

      const unsubscribeError = rewardedAd.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.error('[AdService] ERROR DE ADMOB (Rewarded):', error.code, error.message);
        if (error.code === 'admob/no-fill') {
          console.warn('[AdService] NO FILL: Google AdMob no devolvió anuncios bonificados.');
        }
        if (!isShowing) {
          cleanup();
          resolve('error');
        }
      });

      const cleanup = () => {
        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
      };

      console.log('[AdService] Cargando anuncio Rewarded...');
      rewardedAd.load();
    } catch (e) {
      console.error('[AdService] Error fatal en Rewarded:', e);
      resolve('error');
    }
  });
}
