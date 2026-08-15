import React, { useState, useEffect, useCallback } from 'react';
import { useInterstitialAd, TestIds } from 'react-native-google-mobile-ads';

/**
 * MÓDULO 1: Intersticial por Swipes
 * Test ID: ca-app-pub-3940256099942544/1033173712
 */

const INTERSTITIAL_UNIT_ID = __DEV__ 
  ? TestIds.INTERSTITIAL 
  : 'ca-app-pub-3940256099942544/1033173712';

export const useSwipeInterstitial = (swipeThreshold = 4) => {
  const [swipeCount, setSwipeCount] = useState(0);
  
  const { isLoaded, isClosed, load, show } = useInterstitialAd(INTERSTITIAL_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });

  // Pre-carga inicial
  useEffect(() => {
    load();
  }, [load]);

  // Recargar cuando se cierra el anuncio
  useEffect(() => {
    if (isClosed) {
      load();
    }
  }, [isClosed, load]);

  const handleSwipe = useCallback(() => {
    setSwipeCount((prev) => {
      const newCount = prev + 1;
      
      if (newCount >= swipeThreshold) {
        if (isLoaded) {
          show();
        } else {
          console.warn('Ad not ready yet, skipping but resetting counter.');
        }
        return 0; // Reinicia el contador siempre al llegar al umbral
      }
      
      return newCount;
    });
  }, [isLoaded, show, swipeThreshold]);

  return { handleSwipe, swipeCount };
};
