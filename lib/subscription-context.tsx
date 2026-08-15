import React, { createContext, useContext, ReactNode, useEffect, useState, useMemo, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { useAuth } from './auth-context';
import { db } from './firebase';
import { 
  doc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { useNotifications } from './notification-context';


import * as RNIAP from './iap-native';


export type SubscriptionPlan = 'free' | 'plus' | 'gold' | 'elite';

interface PlanLimits {
  dailyLikes: number; // -1 = unlimited
  superLikesWeekly: number; // weekly replenished amount
  unlimitedLikes: boolean;
  rewind: boolean;
  passport: boolean;
  profileControl: boolean;
  visibilityControl: boolean;
  seeWhoLikedYou: boolean;
  topPicks: boolean;
  hasFreeMonthlyBoost: boolean;
  priorityLikes: boolean;
  messageBeforeMatch: boolean;
  likesHistory: boolean;
  readReceipts: boolean;
  mundiMode: boolean;
  doubleDateEnabled: boolean;
}

const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    dailyLikes: 20,
    superLikesWeekly: 1,
    unlimitedLikes: false, rewind: false, passport: false, profileControl: false, visibilityControl: false,
    seeWhoLikedYou: false, topPicks: false, hasFreeMonthlyBoost: false,
    priorityLikes: false, messageBeforeMatch: false, likesHistory: false,
    readReceipts: false,
    mundiMode: false,
    doubleDateEnabled: true
  },
  plus: {
    dailyLikes: -1,
    superLikesWeekly: 1,
    unlimitedLikes: true, rewind: true, passport: false, profileControl: true, visibilityControl: true,
    seeWhoLikedYou: false, topPicks: false, hasFreeMonthlyBoost: false,
    priorityLikes: false, messageBeforeMatch: false, likesHistory: false,
    readReceipts: true,
    mundiMode: false,
    doubleDateEnabled: true
  },
  gold: {
    dailyLikes: -1,
    superLikesWeekly: 5,
    unlimitedLikes: true, rewind: true, passport: true, profileControl: true, visibilityControl: true,
    seeWhoLikedYou: true, topPicks: true, hasFreeMonthlyBoost: true,
    priorityLikes: false, messageBeforeMatch: false, likesHistory: false,
    readReceipts: true,
    mundiMode: true,
    doubleDateEnabled: true
  },
  elite: {
    dailyLikes: -1,
    superLikesWeekly: 5,
    unlimitedLikes: true, rewind: true, passport: true, profileControl: true, visibilityControl: true,
    seeWhoLikedYou: true, topPicks: true, hasFreeMonthlyBoost: true,
    priorityLikes: true, messageBeforeMatch: true, likesHistory: true,
    readReceipts: true,
    mundiMode: true,
    doubleDateEnabled: true
  },
};

interface SubscriptionContextType {
  plan: SubscriptionPlan;
  limits: PlanLimits;
  canLike: boolean;
  canSuperLike: boolean;
  likesRemaining: number;
  totalSuperLikesAvailable: number;
  totalBoostsAvailable: number;
  totalReadReceiptsAvailable: number;
  boostDuration: number;
  upgrade: (plan: SubscriptionPlan) => Promise<boolean>;
  consumeLike: () => Promise<boolean>;
  consumeSuperLike: () => Promise<boolean>;
  consumeBoost: (durationMins?: number, cost?: number) => Promise<boolean>;
  buyConsumable: (type: 'superlike' | 'boost' | 'readreceipt', amount: number, productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

// LIST OF GOOGLE PLAY PRODUCT IDS
const SUBSCRIPTION_SKUS = ['plus', 'gold', 'elite'];
const CONSUMABLE_SKUS = [
  'boost_1', 'boost_5', 'boost_10',
  'boost_30m', 'boost_2h', 'boost_24h',
  'sl_5', 'sl_25', 'sl_60',
  'rr_5', 'rr_20'
];

// Mapping for consumable rewards
const CONSUMABLE_DATA: Record<string, { type: 'superlike' | 'boost' | 'readreceipt', amount: number }> = {
  'boost_1': { type: 'boost', amount: 1 },
  'boost_5': { type: 'boost', amount: 5 },
  'boost_10': { type: 'boost', amount: 10 },
  'boost_30m': { type: 'boost', amount: 1 },
  'boost_2h': { type: 'boost', amount: 5 },
  'boost_24h': { type: 'boost', amount: 15 },
  'sl_5': { type: 'superlike', amount: 5 },
  'sl_25': { type: 'superlike', amount: 25 },
  'sl_60': { type: 'superlike', amount: 60 },
  'rr_5': { type: 'readreceipt', amount: 5 },
  'rr_20': { type: 'readreceipt', amount: 20 },
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useAuth();
  const { showNotification } = useNotifications();
  const userRef = React.useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [systemSettings, setSystemSettings] = useState({ freeLikesLimit: 20, boostDuration: 30 });
  const [iapConnection, setIapConnection] = useState(false);
  const [availableSubscriptions, setAvailableSubscriptions] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const processedTokens = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    let unsub: Unsubscribe | null = null;
    try {
      unsub = onSnapshot(doc(db, 'system_settings', 'core'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSystemSettings({
            freeLikesLimit: typeof data.freeLikesLimit === 'number' ? data.freeLikesLimit : 20,
            boostDuration: typeof data.boostDuration === 'number' ? data.boostDuration : 30
          });
        }
      });
    } catch (e) {
      console.error("[SubscriptionProvider] Settings listener error:", e);
    }
    return () => { if (unsub) unsub(); };
  }, []);

  // INITIALIZE IAP (react-native-iap v15 API)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let purchaseUpdateSub: any;
    let purchaseErrorSub: any;

    const initIAP = async () => {
      try {
        console.log('[IAP] Attempting to connect...');
        const result = await RNIAP.initConnection();
        console.log('[IAP] Connection result:', result);
        
        if (!result) {
          console.warn('[IAP] Connection returned false');
          return;
        }

        // PRE-LOAD PRODUCTS using v15 fetchProducts API
        try {
          // Fetch subscriptions
          const subsResult = await RNIAP.fetchProducts({ skus: SUBSCRIPTION_SKUS, type: 'subs' });
          const subs = subsResult ?? [];
          setAvailableSubscriptions(subs);
          console.log(`[IAP DEBUG] Loaded Subs:`, subs.map((s: any) => s.productId));

          // Fetch consumables (in-app products)
          const prodsResult = await RNIAP.fetchProducts({ skus: CONSUMABLE_SKUS, type: 'in-app' });
          const prods = prodsResult ?? [];
          setAvailableProducts(prods);
          console.log(`[IAP DEBUG] Loaded Prods:`, prods.map((p: any) => p.productId));
          
          if (subs.length === 0 && prods.length === 0) {
            console.warn('[IAP DEBUG] No products loaded from Google Play.');
            if (__DEV__) {
               Alert.alert('IAP Debug', 'Google Play no devolvió ningún SKU. Verifica que el dispositivo de prueba tenga una cuenta configurada como Tester y que la app coincida con el applicationId y firma de la Play Console.');
            }
          } else if (__DEV__) {
             console.log(`[IAP] Exitoso: ${subs.length} suscripciones y ${prods.length} consumibles obtenidos.`);
          }
        } catch (prodErr: any) {
          console.error('[IAP DEBUG] Error fetching products. Code:', prodErr.code, 'Message:', prodErr.message);
          if (__DEV__) {
             Alert.alert('IAP Fetch Error', `Código: ${prodErr.code}\nMensaje: ${prodErr.message}`);
          }
        }

        setIapConnection(true);
        
        // Listen for purchases
        purchaseUpdateSub = RNIAP.purchaseUpdatedListener(async (purchase: any) => {
          console.log('[IAP] Purchase Updated:', purchase.productId, 'State:', purchase.purchaseStateAndroid);
          
          try {
            // RULE: State Locking - Only grant if purchase is successful
            // Android: 1 = PURCHASED. iOS: transactionReceipt exists.
            const isSuccessful = Platform.OS === 'android' 
              ? purchase.purchaseStateAndroid === 1 
              : !!purchase.transactionReceipt;

            if (!isSuccessful) {
              console.log('[IAP] Purchase not yet successful (pending or failed).');
              return;
            }

            // PREVENT DUPLICATE PROCESSING
            const token = purchase.purchaseToken || purchase.transactionId;
            if (token && processedTokens.current.has(token)) {
              console.log('[IAP] Token already processed in this session:', token);
              // Still need to finish it to be safe
              await RNIAP.finishTransaction({ purchase, isConsumable: CONSUMABLE_SKUS.includes(purchase.productId) });
              return;
            }
            if (token) processedTokens.current.add(token);

            // --- GRANT ITEM ---
            
            // Handle Subscriptions
            if (SUBSCRIPTION_SKUS.includes(purchase.productId)) {
              await updateProfile({ subscription: purchase.productId as SubscriptionPlan });
              showNotification({
                type: 'success',
                title: '¡Plan Activado!',
                message: `Ahora eres miembro ${purchase.productId.toUpperCase()}`
              });
              console.log(`[IAP] Subscription granted: ${purchase.productId}`);
            }
            
            // Handle Consumables
            const consumable = CONSUMABLE_DATA[purchase.productId];
            if (consumable) {
              const { type, amount } = consumable;
              const currentUser = userRef.current;
              
              if (type === 'superlike') {
                await updateProfile({ purchasedSuperLikes: (currentUser?.purchasedSuperLikes ?? 0) + amount });
              } else if (type === 'boost') {
                await updateProfile({ purchasedBoosts: (currentUser?.purchasedBoosts ?? 0) + amount });
              } else if (type === 'readreceipt') {
                await updateProfile({ purchasedReadReceipts: (currentUser?.purchasedReadReceipts ?? 0) + amount });
              }

              showNotification({
                type: 'success',
                title: 'Compra Exitosa',
                message: `Se han añadido ${amount} ${type === 'boost' ? 'Boosts' : type === 'superlike' ? 'Super Likes' : 'Confirmaciones'}`
              });
              console.log(`[IAP] Consumable granted: ${amount} ${type}`);
            }

            // RULE: Immediate Consumption
            const isConsumable = CONSUMABLE_SKUS.includes(purchase.productId);
            await RNIAP.finishTransaction({ 
              purchase, 
              isConsumable 
            });
            console.log('[IAP] Transaction finished/consumed for:', purchase.productId);
            
          } catch (error: any) {
            console.error('[IAP] Error processing purchase:', error.message);
          }
        });

        purchaseErrorSub = RNIAP.purchaseErrorListener((error: any) => {
          console.warn('[IAP DEBUG] Purchase Error:', error);
          
          const errorCode = error.code;
          const errorMessage = error.message;
          const debugMessage = error.debugMessage || "Sin debug message";
          const responseCode = error.responseCode;
          
          console.log(`[IAP DEBUG DETAIL] Code: ${errorCode} | Msg: ${errorMessage} | Debug: ${debugMessage} | GoogleResCode: ${responseCode}`);

          if (errorCode !== 'E_USER_CANCELLED') {
             Alert.alert(
                'Error de Compra (Debug)', 
                `Código: ${errorCode}\nMensaje: ${errorMessage}\nGoogle Code: ${responseCode}\nDebug: ${debugMessage}`
             );
          }
        });

      } catch (err: any) {
        console.error('[IAP] Fatal Init error:', err.message);
        if (__DEV__) {
            Alert.alert('DEBUG: IAP Fail', err.message);
        }
      }
    };

    initIAP();
    return () => {
      if (purchaseUpdateSub) purchaseUpdateSub.remove();
      if (purchaseErrorSub) purchaseErrorSub.remove();
      if (Platform.OS !== 'web') {
        try {
          RNIAP.endConnection();
        } catch (e) {}
      }
    };
  }, []);

  const plan: SubscriptionPlan = (user?.subscription && PLAN_LIMITS[user.subscription as SubscriptionPlan]) 
    ? (user.subscription as SubscriptionPlan) 
    : 'free';
    
  const rawLimits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  
  const limits = useMemo(() => {
    if (plan === 'free') {
      return { ...rawLimits, dailyLikes: systemSettings.freeLikesLimit };
    }
    return rawLimits;
  }, [rawLimits, plan, systemSettings.freeLikesLimit]);

  const dailyLikesUsed = user?.dailyLikesUsed ?? 0;
  const superLikesWeeklyLimit = limits?.superLikesWeekly ?? 0;
  const weeklySuperLikesRemaining = Math.max(0, superLikesWeeklyLimit - (user?.superLikesUsed ?? 0));
  const purchasedSuperLikes = user?.purchasedSuperLikes ?? 0;
  const purchasedBoosts = user?.purchasedBoosts ?? 0;
  const purchasedReadReceipts = user?.purchasedReadReceipts ?? 0;

  const totalSuperLikesAvailable = weeklySuperLikesRemaining + purchasedSuperLikes;
  const totalBoostsAvailable = purchasedBoosts + (limits.hasFreeMonthlyBoost ? 1 : 0);
  const totalReadReceiptsAvailable = purchasedReadReceipts;

  const canLike = limits.unlimitedLikes || dailyLikesUsed < limits.dailyLikes;
  const canSuperLike = totalSuperLikesAvailable > 0;
  const likesRemaining = limits.unlimitedLikes ? -1 : Math.max(0, limits.dailyLikes - dailyLikesUsed);

  // UPGRADE (subscribe) — v15 uses requestPurchase with type: 'subs'
  const upgrade = useCallback(async (newPlan: SubscriptionPlan) => {
    if (Platform.OS === 'web') {
      await updateProfile({ subscription: newPlan });
      return true;
    }

    if (!iapConnection) {
        Alert.alert('Error', 'No hay conexión con la tienda de aplicaciones.');
        return;
    }

    try {
      // Find the offerToken from the pre-loaded subscriptions
      let offerToken = '';
      const sub = availableSubscriptions.find((s: any) => s.productId === newPlan);
      if (sub?.subscriptionOfferDetails?.length > 0) {
        offerToken = sub.subscriptionOfferDetails[0].offerToken;
      } else {
        console.warn(`[IAP] No offerToken found for ${newPlan}`);
      }

      // v15 API: requestPurchase with platform-specific request and type
      await RNIAP.requestPurchase({ 
        request: {
          google: {
            skus: [newPlan],
            subscriptionOffers: [{ sku: newPlan, offerToken }],
          },
        },
        type: 'subs',
      });
      return true;
    } catch (err: any) {
      console.error('[IAP] Request Subscription Error:', err);
      
      if (err.code === 'E_USER_CANCELLED' || err.code === 'USER_CANCELED') {
         console.log('[IAP] User canceled subscription modal.');
         return false;
      }

      Alert.alert(
        'Suscripción Fallida', 
        `No se pudo procesar la suscripción. Verifica tu conexión y forma de pago.`
      );
      return false;
    }
  }, [updateProfile, iapConnection, availableSubscriptions]);

  // RESTORE PURCHASES
  const restorePurchasesHandler = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const purchases = await RNIAP.getAvailablePurchases();
      let highestPlan: SubscriptionPlan = 'free';
      
      for (const p of purchases) {
        if (SUBSCRIPTION_SKUS.includes(p.productId)) {
          highestPlan = p.productId as SubscriptionPlan;
        }
      }
      
      if (highestPlan !== 'free') {
        await updateProfile({ subscription: highestPlan });
        showNotification({
          type: 'success',
          title: 'Compras Restauradas',
          message: 'Tu suscripción ha sido reactivada correctamente.'
        });
      } else {
        showNotification({
          type: 'system',
          title: 'Aviso',
          message: 'No se encontraron suscripciones activas.'
        });
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudieron restaurar las compras.');
    }
  }, [updateProfile]);

  // BUY CONSUMABLE — v15 uses requestPurchase with type: 'in-app'
  const buyConsumable = useCallback(async (type: 'superlike' | 'boost' | 'readreceipt', amount: number, productId: string) => {
    if (Platform.OS === 'web') {
      if (type === 'superlike') await updateProfile({ purchasedSuperLikes: (user?.purchasedSuperLikes ?? 0) + amount });
      else if (type === 'boost') await updateProfile({ purchasedBoosts: (user?.purchasedBoosts ?? 0) + amount });
      else if (type === 'readreceipt') await updateProfile({ purchasedReadReceipts: (user?.purchasedReadReceipts ?? 0) + amount });
      return true;
    }

    if (!iapConnection) {
        Alert.alert('Error', 'No hay conexión con la tienda.');
        throw new Error('IAP_NOT_CONNECTED');
    }

    try {
      // RULE: Trigger purchase only. State update is handled in the listener.
      console.log('[IAP] Requesting purchase for:', productId);
      await RNIAP.requestPurchase({ 
        request: {
          google: {
            skus: [productId],
          },
        },
        type: 'in-app',
      });
      return true;
    } catch (err: any) {
      console.error('[IAP] Purchase flow error:', err.code, err.message);
      
      // RULE: Handle Cancellation
      if (err.code === 'E_USER_CANCELLED' || err.code === 'USER_CANCELED') {
          console.log('[IAP] User cancelled the purchase modal.');
          return false; // Return false instead of undefined
      }
      
      if (err.code === 'E_ALREADY_OWNED') {
          Alert.alert('Compra Pendiente', 'Tienes una compra que aún no se ha procesado. Por favor, cierra y vuelve a abrir la aplicación para activarla automáticamente.');
      } else {
          Alert.alert('Error', 'No se pudo completar la transacción.');
      }
      
      return false;
    }
  }, [user, updateProfile, iapConnection]);

  const consumeLike = useCallback(async (): Promise<boolean> => {
    if (!canLike || !user) return false;
    if (!limits.unlimitedLikes) {
      await updateProfile({ dailyLikesUsed: (user.dailyLikesUsed ?? 0) + 1 });
    }
    return true;
  }, [canLike, user, limits.unlimitedLikes, updateProfile]);

  const consumeSuperLike = useCallback(async (): Promise<boolean> => {
    if (!canSuperLike || !user) return false;
    if (weeklySuperLikesRemaining > 0) {
      await updateProfile({ superLikesUsed: (user.superLikesUsed ?? 0) + 1 });
    } else {
      await updateProfile({ purchasedSuperLikes: Math.max(0, purchasedSuperLikes - 1) });
    }
    return true;
  }, [canSuperLike, user, weeklySuperLikesRemaining, purchasedSuperLikes, updateProfile]);

  const consumeBoost = useCallback(async (durationMins?: number, cost: number = 1): Promise<boolean> => {
    if (totalBoostsAvailable < cost || !user) return false;
    const boostDurationMs = (durationMins || systemSettings.boostDuration) * 60 * 1000;
    const boostUntil = new Date(Date.now() + boostDurationMs).toISOString();
    
    // Si el usuario tiene boosts comprados, descontar de ahí primero
    if (purchasedBoosts >= cost) {
      await updateProfile({ 
        purchasedBoosts: Math.max(0, purchasedBoosts - cost),
        boostUntil: boostUntil
      });
    } else {
      // Si no tiene suficientes comprados, usamos lo que haya (probablemente el gratuito)
      // En este sistema, permitimos usar el "gratuito" para cubrir parte del costo si es necesario
      // pero usualmente el gratuito solo vale 1.
      // Ajustamos:
      const newPurchased = Math.max(0, purchasedBoosts - cost);
      await updateProfile({ 
        purchasedBoosts: newPurchased,
        boostUntil: boostUntil
      });
    }
    return true;
  }, [totalBoostsAvailable, user, purchasedBoosts, updateProfile, systemSettings.boostDuration]);

  const contextValue = useMemo(() => ({
    plan, limits, canLike, canSuperLike, likesRemaining, 
    totalSuperLikesAvailable, totalBoostsAvailable, totalReadReceiptsAvailable,
    boostDuration: systemSettings.boostDuration,
    upgrade, restorePurchases: restorePurchasesHandler, consumeLike, consumeSuperLike, consumeBoost, buyConsumable
  }), [plan, limits, canLike, canSuperLike, likesRemaining, totalSuperLikesAvailable, totalBoostsAvailable, totalReadReceiptsAvailable, upgrade, restorePurchasesHandler, consumeLike, consumeSuperLike, consumeBoost, buyConsumable]);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}

export { PLAN_LIMITS };
