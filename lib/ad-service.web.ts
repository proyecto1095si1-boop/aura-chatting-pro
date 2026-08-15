export type AdResult = 'rewarded' | 'dismissed' | 'error';

export async function initializeAds() {
  console.log('[Ad] Web Mock: SDK Initialized');
}

export async function showInterstitial(): Promise<void> {
  console.log('[Ad] Web Mock: Intersticial mostrado y finalizado');
  return new Promise(resolve => setTimeout(resolve, 500));
}

export async function showRewardedAd(): Promise<AdResult> {
  console.log('[Ad] Web Mock: Recompensa otorgada automáticamente');
  await new Promise(resolve => setTimeout(resolve, 1000));
  return 'rewarded';
}
