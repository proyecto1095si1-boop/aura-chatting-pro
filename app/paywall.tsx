import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSubscription, SubscriptionPlan } from '@/lib/subscription-context';

interface Feature {
  label: string;
  included: boolean;
}

interface Plan {
  id: SubscriptionPlan;
  name: string;
  price: string;
  period: string;
  features: Feature[];
  badge?: string;
  gradient?: readonly [string, string];
}

export default function PaywallScreen() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('gold');
  const [loading, setLoading] = useState(false);
  const { upgrade, restorePurchases, plan: currentPlan } = useSubscription();

  const PLANS: Plan[] = [
    {
      id: 'plus',
      name: 'Starter / Plus',
      price: '$4.99',
      period: t('paywall.plans.gold.period'),
      gradient: ['#1E1E1E', '#3A3A3A'] as const,
      features: [
        { label: t('paywall.features.unlimited_likes_label'), included: true },
        { label: t('paywall.features.rewind_unlimited'), included: true },
        { label: t('paywall.features.profile_visibility_control'), included: true },
        { label: t('paywall.features.read_receipts'), included: true },
        { label: t('paywall.features.no_ads_swipes'), included: true },
        { label: t('paywall.features.world_mode'), included: false },
        { label: t('paywall.features.see_who_likes_no_ads'), included: false },
        { label: t('paywall.features.weekly_super_likes_5'), included: false },
      ],
    },
    {
      id: 'gold',
      name: 'Gold / VIP',
      price: '$9.99',
      period: t('paywall.plans.gold.period'),
      badge: t('paywall.plans.gold.badge'),
      gradient: ['#FFD700', '#FF8C00'] as const,
      features: [
        { label: t('paywall.features.all_starter'), included: true },
        { label: t('paywall.features.see_who_liked_no_ads'), included: true },
        { label: t('paywall.features.no_ads_swipes'), included: true },
        { label: t('paywall.features.curated_daily_picks'), included: true },
        { label: t('paywall.features.weekly_super_likes_5'), included: true },
        { label: t('paywall.features.monthly_free_boost'), included: true },
        { label: t('paywall.features.world_mode_gold'), included: true },
        { label: t('paywall.features.message_before_match'), included: false },
      ],
    },
    {
      id: 'elite',
      name: 'Elite / Platinum',
      price: '$14.99',
      period: t('paywall.plans.elite.period'),
      badge: t('paywall.maximum'),
      gradient: ['#FF2D78', '#FF6B35'] as const,
      features: [
        { label: t('paywall.features.all_gold'), included: true },
        { label: t('paywall.features.world_mode_gold'), included: true },
        { label: t('paywall.features.zero_ads'), included: true },
        { label: t('paywall.features.see_who_liked_instant'), included: true },
        { label: t('paywall.features.priority_likes'), included: true },
        { label: t('paywall.features.add_message_before_match'), included: true },
        { label: t('paywall.features.likes_history'), included: true },
        { label: t('paywall.features.vip_support'), included: true },
      ],
    },
  ];

  const handleSubscribe = async () => {
    if (selectedPlan === 'free') {
      router.back();
      return;
    }
    setLoading(true);
    
    try {
      if (Platform.OS !== 'web') {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      await upgrade(selectedPlan);
      // NOTE: We do NOT show success here. On mobile, the purchaseUpdatedListener 
      // in subscription-context handles granting the plan and showing the success 
      // notification ONLY after Google Play confirms the real payment.
      // On web (dev mode), upgrade() directly updates the profile.
      if (Platform.OS === 'web') router.back();
    } catch (e: any) {
      console.error('Purchase error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Decor */}
      <View style={styles.bgDecor}>
        <LinearGradient
          colors={['#FF2D78', 'transparent']}
          style={styles.bgCircle}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(800)} style={styles.header}>
          <LinearGradient
            colors={['#FF2D78', '#FF6B35'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerBadge}
          >
            <Text style={styles.headerBadgeText}>{t('paywall.premium_levels')}</Text>
          </LinearGradient>
          <Text style={styles.headerTitle}>{t('paywall.get_more_matches')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('paywall.level_up_desc')}
          </Text>
        </Animated.View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {PLANS.map((plan, index) => {
            const isSelected = selectedPlan === plan.id;
            const isCurrent = currentPlan === plan.id;
            
            return (
              <Animated.View 
                key={plan.id}
                entering={FadeInDown.delay(200 + index * 100).duration(800)}
              >
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                        const Haptics = require('expo-haptics');
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setSelectedPlan(plan.id);
                  }}
                  style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}
                >
                  <View style={[
                    styles.planCard, 
                    isSelected && styles.planCardSelected,
                  ]}>
                    {plan.badge && (
                      <View style={styles.planBadgeWrapper}>
                        <LinearGradient
                          colors={plan.gradient || (['#1E1E1E', '#1E1E1E'] as const)}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.planBadge}
                        >
                          <Text style={styles.planBadgeText}>{plan.badge}</Text>
                        </LinearGradient>
                      </View>
                    )}

                    <View style={styles.planHeader}>
                      <View>
                        <Text style={[
                          styles.planName, 
                          plan.id === 'gold' && styles.planNameGold, 
                          plan.id === 'elite' && styles.planNameElite
                        ]}>
                          {plan.name}
                        </Text>
                        {isCurrent && (
                          <View style={styles.currentPlanBadge}>
                            <Text style={styles.currentPlanLabel}>{t('paywall.currently_active')}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.planPriceArea}>
                        <Text style={styles.planPrice}>{plan.price}</Text>
                        <Text style={styles.planPeriod}>{plan.period}</Text>
                      </View>
                    </View>

                    <View style={styles.planFeatures}>
                      {plan.features.map((feature) => (
                        <View key={feature.label} style={styles.featureRow}>
                          <View style={styles.featureIconCircle}>
                            <Text style={styles.featureCheck}>
                              {feature.included ? '✓' : '×'}
                            </Text>
                          </View>
                          <Text style={[
                            styles.featureLabel, 
                            !feature.included && styles.featureLabelExcluded
                          ]}>
                            {feature.label}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {isSelected && (
                      <Animated.View entering={FadeIn} style={styles.selectedIndicator}>
                        <LinearGradient
                          colors={['#FF2D78', '#FF6B35'] as const}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.selectedDot}
                        />
                      </Animated.View>
                    )}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* CTA Area */}
        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.ctaArea}>
          <Pressable
            onPress={handleSubscribe}
            disabled={loading}
            style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <LinearGradient
              colors={['#FF2D78', '#FF6B35'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.ctaButton, loading && { opacity: 0.7 }]}
            >
              <Text style={styles.ctaText}>
                {loading 
                  ? t('paywall.processing_payment')
                  : t('paywall.upgrade_to', { name: PLANS.find(p => p.id === selectedPlan)?.name })}
              </Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.disclaimer}>
            {t('paywall.payment_disclaimer')}
          </Text>

          <View style={styles.legalLinks}>
            <Pressable onPress={() => router.push('/terms' as any)}>
              <Text style={styles.legalLinkText}>{t('paywall.terms_of_use')}</Text>
            </Pressable>
            <View style={styles.legalSeparator} />
            <Pressable onPress={() => {
              restorePurchases();
            }}>
              <Text style={styles.legalLinkText}>{t('paywall.restore_purchases')}</Text>
            </Pressable>
            <View style={styles.legalSeparator} />
            <Pressable onPress={() => router.push('/privacy' as any)}>
              <Text style={styles.legalLinkText}>{t('paywall.privacy')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Floating Close Button */}
      <Animated.View entering={FadeIn.delay(500)} style={styles.closeButtonContainer}>
        <Pressable 
          style={styles.closeButton} 
          onPress={() => router.back()}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Text style={styles.closeIcon}>×</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  bgDecor: {
    position: 'absolute',
    top: -150,
    left: -100,
    width: 300,
    height: 300,
    opacity: 0.15,
  },
  bgCircle: {
    flex: 1,
    borderRadius: 150,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 999,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },
  scroll: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
  },
  headerBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 32,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 44,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 22,
  },
  plansContainer: {
    gap: 12,
  },
  planCard: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#FF2D78',
    backgroundColor: '#1A0A12',
  },
  planBadgeWrapper: {
    position: 'absolute',
    top: -12,
    right: 20,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planNameGold: {
    color: '#FFD700',
  },
  planNameElite: {
    color: '#FF2D78',
  },
  currentPlanBadge: {
    marginTop: 4,
  },
  currentPlanLabel: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  planPriceArea: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  planPeriod: {
    fontSize: 12,
    color: '#8A8A8A',
  },
  planFeatures: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIconCircle: {
  },
  featureCheck: {
    fontSize: 14,
    fontWeight: '700',
    width: 18,
    textAlign: 'center',
    color: '#4CAF50'
  },
  featureLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  featureLabelExcluded: {
    color: '#4A4A4A',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  ctaArea: {
    gap: 12,
  },
  ctaButton: {
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  disclaimer: {
    color: '#8A8A8A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingBottom: 20,
  },
  legalLinkText: {
    color: '#8A8A8A',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    width: 1,
    height: 12,
    backgroundColor: '#2A2A2A',
  },
});
