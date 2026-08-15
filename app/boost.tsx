import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/lib/subscription-context';
import { Ionicons } from '@expo/vector-icons';
import { AuraAlert } from '@/components/aura-alert';

const { width } = Dimensions.get('window');

interface BoostOption {
  id: string;
  duration: number;
  label: string;
  price: number;
  cost: number;
  originalPrice: number;
  discount: number;
  features: string[];
  popular: boolean;
}

export default function BoostScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { totalBoostsAvailable, consumeBoost, buyConsumable, boostDuration } = useSubscription();
  
  const [selectedBoost, setSelectedBoost] = useState<string>('boost_2h');
  const [activating, setActivating] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'default' | 'danger' | 'success';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'default',
    onConfirm: () => {},
  });

  const BOOST_OPTIONS: BoostOption[] = [
    {
      id: 'boost_30m',
      duration: 30,
      label: t('boost.options.30m', '30 Minutes'),
      price: 0,
      cost: 1,
      originalPrice: 0,
      discount: 0,
      features: [
        t('boost.features.x10', '10x Visibility'),
        t('boost.features.priority', 'Priority in your area'),
        t('boost.features.quick', 'Ideal for a quick swipe')
      ],
      popular: false,
    },
    {
      id: 'boost_2h',
      duration: 120,
      label: t('boost.options.2h', '2 Hours'),
      price: 0,
      cost: 4,
      originalPrice: 0,
      discount: 0,
      features: [
        t('boost.features.x10', '10x Visibility'),
        t('boost.features.more_matches', 'More guaranteed matches'),
        t('boost.features.perfect_night', 'Perfect for the night')
      ],
      popular: true,
    },
    {
      id: 'boost_24h',
      duration: 1440,
      label: t('boost.options.24h', '24 Hours'),
      price: 0,
      cost: 10,
      originalPrice: 0,
      discount: 0,
      features: [
        t('boost.features.x10', '10x Visibility'),
        t('boost.features.max_exposure', 'Maximum total exposure'),
        t('boost.features.dominate', 'Dominate your city')
      ],
      popular: false,
    },
  ];

  const selectedOption = BOOST_OPTIONS.find(b => b.id === selectedBoost);
  const steps = [
    { title: t('boost.steps.1.title', 'Choose your time'), desc: t('boost.steps.1.desc', 'Select how long you want to be the #1 profile.') },
    { title: t('boost.steps.2.title', 'Multiply x10'), desc: t('boost.steps.2.desc', 'You will appear 10 times more than other users.') },
    { title: t('boost.steps.3.title', 'Get Matches'), desc: t('boost.steps.3.desc', 'Enjoy a rain of likes and instant matches.') }
  ];
  const faqItems = [
    { q: t('boost.faq_what'), a: t('boost.faq_what_answer') },
    { q: t('boost.faq_cost'), a: t('boost.faq_cost_answer') }
  ];

  const handleActivateBoost = async () => {
    if (!selectedOption) return;
    
    if (user?.boostUntil && new Date(user.boostUntil).getTime() > Date.now()) {
      setAlertConfig({
        visible: true,
        title: t('common.info', 'Info'),
        message: t('boost.already_active', 'You already have an active Boost.'),
        type: 'default',
        onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
      });
      return;
    }

    const hasEnough = totalBoostsAvailable >= selectedOption.cost;

    if (!hasEnough) {
      router.push('/store' as any);
      return;
    }

    setAlertConfig({
      visible: true,
      title: t('boost.confirm_title'),
      message: t('boost.confirm_message', { label: selectedOption.label, cost: selectedOption.cost }),
      type: 'default',
      onConfirm: async () => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
        await _executeActivation();
      }
    });
  };

  const _executeActivation = async () => {
    if (!selectedOption) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActivating(true);

    try {
      const success = await consumeBoost(selectedOption.duration, selectedOption.cost);

      if (success) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setAlertConfig({
          visible: true,
          title: t('common.success'),
          message: t('boost.success_message', { label: selectedOption.label }),
          type: 'success',
          onConfirm: () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            router.back();
          }
        });
      }
    } catch (e) {
      console.error("Error activating boost:", e);
    } finally {
      setActivating(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtnWrapper}>
            <Ionicons name="arrow-back" size={24} color="#FF2D78" />
          </Pressable>
          <Text style={styles.title}>{t('boost.activate')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Info banner */}
        <LinearGradient
          colors={['rgba(255, 45, 120, 0.1)', 'rgba(255, 107, 53, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.infoBanner}
        >
          <Text style={styles.infoBannerIcon}>🚀</Text>
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerTitle}>{t('boost.banner.title', 'You are the center of attention')}</Text>
            <Text style={styles.infoBannerSubtitle}>
              {t('boost.banner.subtitle', 'Activate a Boost to be the main profile in your area.')}
            </Text>
          </View>
          <View style={styles.inventoryBadge}>
             <Text style={styles.inventoryText}>{totalBoostsAvailable} x ⚡</Text>
          </View>
        </LinearGradient>

        {/* Boost options */}
        <View style={styles.optionsContainer}>
          {BOOST_OPTIONS.map(option => (
            <Pressable
              key={option.id}
              style={[
                styles.optionCard,
                selectedBoost === option.id && styles.optionCardSelected,
                option.popular && styles.optionCardPopular,
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedBoost(option.id);
              }}
            >
              {option.popular && (
                <LinearGradient
                  colors={['#FF2D78', '#FF6B35'] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.popularBadge}
                >
                  <Text style={styles.popularBadgeText}>{t('boost.popular', 'MOST POPULAR')}</Text>
                </LinearGradient>
              )}

              <View style={styles.optionHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionDuration}>{option.label}</Text>
                  <Text style={styles.costText}>{t('boost.cost_label', 'Cost:')} {option.cost}⚡</Text>
                </View>
                {selectedBoost === option.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#FF2D78" />
                )}
              </View>

              <View style={styles.optionFeatures}>
                {option.features.map((feature, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={16} color="#4CAF50" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('boost.how_it_works_title')}</Text>
          <View style={styles.stepsList}>
            {steps.map((step, i) => (
              <View key={i} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                   <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('boost.faq_title', 'Frequently Asked Questions')}</Text>
          {faqItems.map((faq, i) => (
            <View key={i} style={styles.faqItem}>
              <Text style={styles.faqQ}>{faq.q}</Text>
              <Text style={styles.faqA}>{faq.a}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA Button */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [pressed ? { transform: [{ scale: 0.98 }] } : {}]}
          onPress={handleActivateBoost}
          disabled={activating}
        >
          <LinearGradient
            colors={['#FF2D78', '#FF6B35'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.ctaButton, activating && { opacity: 0.7 }]}
          >
            <Text style={styles.ctaButtonText}>
              {activating 
                ? t('boost.cta.activating') 
                : (totalBoostsAvailable >= selectedOption!.cost)
                  ? t('boost.activate_for', { cost: selectedOption!.cost })
                  : t('boost.buy_more')}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
      <AuraAlert 
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
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
  },
  backButton: {
    color: '#FF2D78',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  backBtnWrapper: {
    padding: 8,
    marginLeft: -8,
  },
  costText: {
    fontSize: 14,
    color: '#FF2D78',
    fontWeight: '700',
    marginTop: 2,
  },

  infoBanner: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoBannerIcon: {
    fontSize: 28,
  },
  infoBannerText: {
    flex: 1,
    gap: 4,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoBannerSubtitle: {
    fontSize: 13,
    color: '#8A8A8A',
    lineHeight: 18,
  },
  inventoryBadge: {
    backgroundColor: '#161616',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  inventoryText: {
    color: '#FF2D78',
    fontWeight: 'bold',
    fontSize: 12,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#161616',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    padding: 16,
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: '#FF2D78',
    backgroundColor: '#1A0A12',
  },
  optionCardPopular: {
    borderColor: '#FF6B35',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  discountBadge: {
    position: 'absolute',
    top: -12,
    left: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionDuration: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceArea: {
    alignItems: 'flex-end',
    gap: 2,
  },
  originalPrice: {
    fontSize: 12,
    color: '#8A8A8A',
    textDecorationLine: 'line-through',
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF2D78',
  },
  optionFeatures: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureCheck: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '700',
  },
  featureText: {
    color: '#8A8A8A',
    fontSize: 13,
    lineHeight: 18,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF2D78',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 120, 0.3)',
  },
  stepNumberText: {
    color: '#FF2D78',
    fontSize: 14,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
    gap: 2,
  },

  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepDesc: {
    fontSize: 12,
    color: '#8A8A8A',
  },
  faqItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
    gap: 6,
  },
  faqQ: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  faqA: {
    fontSize: 13,
    color: '#8A8A8A',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
  ctaButton: {
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
