import { useEffect, useRef } from 'react';
import { useInterstitialAd } from 'react-native-google-mobile-ads';
import { INTERSTITIAL_ID } from '@/lib/ad-service';
import { useSubscription } from '@/lib/subscription-context';

export function useGlobalInterstitial() {
  const { plan } = useSubscription();
  const isFree = plan === 'free';

  const { isLoaded, isClosed, load, show, error } = useInterstitialAd(INTERSTITIAL_ID, {
    requestNonPersonalizedAdsOnly: true,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar el anuncio inicialmente si es usuario free
  useEffect(() => {
    if (isFree && !isLoaded) {
      load();
    }
  }, [isFree, isLoaded, load]);

  // Si hubo un error (ej. No Fill), lo registramos y podemos intentar recargar más tarde
  useEffect(() => {
    if (error) {
      console.warn('[GlobalInterstitial] Error cargando anuncio:', error.message);
    }
  }, [error]);

  // Recargar después de que se cierra
  useEffect(() => {
    if (isClosed && isFree) {
      load();
    }
  }, [isClosed, isFree, load]);

  useEffect(() => {
    // Si no es free, limpiamos temporizadores y no hacemos nada
    if (!isFree) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const startTimer = () => {
      // Tiempo aleatorio entre 5 y 8 minutos (en milisegundos)
      const minMs = 5 * 60 * 1000;
      const maxMs = 8 * 60 * 1000;
      const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

      console.log(`[GlobalInterstitial] Próximo anuncio en ${Math.round(delay / 60000)} minutos.`);

      timerRef.current = setTimeout(() => {
        if (isLoaded) {
          console.log('[GlobalInterstitial] Mostrando anuncio...');
          show();
        } else {
          console.log('[GlobalInterstitial] Anuncio no estaba cargado a tiempo, reintentando carga...');
          load();
        }
        // Reiniciar el ciclo
        startTimer();
      }, delay);
    };

    if (!timerRef.current) {
      startTimer();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isFree, isLoaded, show, load]);
}
