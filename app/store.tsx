import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useSubscription } from '@/lib/subscription-context';
import { useNotifications } from '@/lib/notification-context';

import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

interface StoreItem {
  id: string;
  amount: number;
  label: string;
  price: string;
  badge?: string;
  type: 'boost' | 'superlike' | 'readreceipt';
}

const STORE_INVENTORY: { category: string, icon: string, description: string, gradient: readonly [string, string], items: StoreItem[] }[] = [
  {
    category: 'Boosts',
    icon: '🚀',
    description: 'Multiplica tu visibilidad x10 durante 30 minutos.',
    gradient: ['#8A2BE2', '#4B0082'],
    items: [
      { id: 'boost_1', amount: 1, label: '1 Boost', price: '$2.50', type: 'boost' },
      { id: 'boost_5', amount: 5, label: '5 Boosts', price: '$9.99', badge: 'Ahorra 20%', type: 'boost' },
      { id: 'boost_10', amount: 10, label: '10 Boosts', price: '$14.99', badge: 'Mejor Valor', type: 'boost' },
    ]
  },
  {
    category: 'Super Likes',
    icon: '⭐',
    description: 'Destaca al instante. Tienes 3 veces más de probabilidad de hacer Match.',
    gradient: ['#FF2D78', '#FF6B35'],
    items: [
      { id: 'sl_5', amount: 5, label: '5 Super Likes', price: '$4.99', type: 'superlike' },
      { id: 'sl_25', amount: 25, label: '25 Super Likes', price: '$14.99', badge: 'Popular', type: 'superlike' },
      { id: 'sl_60', amount: 60, label: '60 Super Likes', price: '$29.99', badge: 'Ahorra 50%', type: 'superlike' },
    ]
  },
  {
    category: 'Confirmación de Lectura',
    icon: '👀',
    description: 'Averigua si ya han leído tus mensajes.',
    gradient: ['#FFD700', '#FF8C00'],
    items: [
      { id: 'rr_5', amount: 5, label: 'Pack de 5', price: '$0.99', type: 'readreceipt' },
      { id: 'rr_20', amount: 20, label: 'Pack de 20', price: '$2.99', badge: 'Mejor Valor', type: 'readreceipt' },
    ]
  }
];

export default function ConsumablesStore() {
  const { t } = useTranslation();
  const { buyConsumable, totalBoostsAvailable, totalSuperLikesAvailable, totalReadReceiptsAvailable } = useSubscription();
  const { showNotification } = useNotifications();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handlePurchase = async (item: StoreItem) => {
    if (Platform.OS !== 'web') {
      const Haptics = require('expo-haptics');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Go straight to Google Play / App Store payment sheet — no intermediate alert
    setProcessingId(item.id);
    try {
      await buyConsumable(item.type, item.amount, item.id);
      // NOTE: We do NOT show a success toast here. 
      // The purchaseUpdatedListener in subscription-context handles granting 
      // the items and showing the success notification ONLY after real payment.
    } catch (e: any) {
      console.error("[Store] Purchase Error:", e);
      showNotification({
        type: 'system',
        title: t('common.error'),
        message: t('store.purchase_error'),
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-[#0A0A0A]" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>{t('store.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Inventory Status Bar */}
      <View style={styles.inventoryBar}>
        <View style={styles.inventoryItem}>
          <Text style={styles.inventoryIcon}>🚀</Text>
          <Text style={styles.inventoryValue}>{totalBoostsAvailable}</Text>
        </View>
        <View style={styles.inventoryItem}>
          <Text style={styles.inventoryIcon}>⭐</Text>
          <Text style={styles.inventoryValue}>{totalSuperLikesAvailable}</Text>
        </View>
        <View style={styles.inventoryItem}>
          <Text style={styles.inventoryIcon}>👀</Text>
          <Text style={styles.inventoryValue}>{totalReadReceiptsAvailable}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {STORE_INVENTORY.map((category, catIndex) => (
          <Animated.View key={category.category} entering={FadeInDown.delay(catIndex * 150).duration(600)} style={styles.categorySection}>
            
            <LinearGradient
              colors={category.gradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.categoryHeader}
            >
              <Text style={styles.categoryTitle}>{category.icon} {category.category}</Text>
              <Text style={styles.categoryDesc}>{category.description}</Text>
            </LinearGradient>

            <View style={styles.itemsGrid}>
              {category.items.map((item) => {
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handlePurchase(item)}
                    disabled={processingId !== null}
                    style={({ pressed }) => [
                      styles.itemCard,
                      pressed && { transform: [{ scale: 0.96 }] },
                      processingId === item.id && { opacity: 0.7 }
                    ]}
                  >
                    {item.badge && (
                      <View style={styles.itemBadge}>
                        <Text style={styles.itemBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                    
                    <View style={styles.itemAmountContainer}>
                       <Text style={styles.itemAmount}>{item.amount}</Text>
                    </View>
                    
                    <Text style={styles.itemLabel}>{category.category === 'Confirmación de Lectura' ? 'Recibos' : category.category}</Text>
                    
                    <View style={styles.priceBtn}>
                      {processingId === item.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.priceBtnText}>{item.price}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ))}
        
        <Text style={styles.legal}>
          {t('store.legal')}
        </Text>
        <View style={{height: 40}} />
      </ScrollView>


    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0A0A0A',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inventoryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#161616',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  inventoryIcon: {
    fontSize: 16,
  },
  inventoryValue: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scroll: {
    padding: 20,
    gap: 32,
  },
  categorySection: {
    gap: 16,
  },
  categoryHeader: {
    padding: 16,
    borderRadius: 16,
    gap: 4,
  },
  categoryTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  categoryDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#161616',
    width: '31%',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 140,
    position: 'relative',
  },
  itemBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#FF2D78',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 2,
  },
  itemBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  itemAmountContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  itemLabel: {
    fontSize: 12,
    color: '#8A8A8A',
    textAlign: 'center',
    marginBottom: 12,
  },
  priceBtn: {
    backgroundColor: '#2A2A2A',
    width: '100%',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  priceBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  legal: {
    color: '#8A8A8A',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  }
});
