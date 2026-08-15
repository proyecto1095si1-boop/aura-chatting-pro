import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';

import { useTranslation } from 'react-i18next';

const SafetyCard = ({ icon, title, description, delay = 0 }: { icon: string, title: string, description: string, delay?: number }) => (
  <Animated.View entering={FadeInUp.delay(delay).duration(500)} style={styles.safetyCard}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <Text style={styles.cardDescription}>{description}</Text>
  </Animated.View>
);

export default function SafetyCenterScreen() {
  const { t } = useTranslation();

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('safety_center.header')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
          <LinearGradient
            colors={['#FF2D78', '#FF6B35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroTitle}>{t('safety_center.hero.title')}</Text>
            <Text style={styles.heroText}>
              {t('safety_center.hero.text')}
            </Text>
          </LinearGradient>

          <Text style={styles.sectionHeading}>{t('safety_center.sections.before.title')}</Text>
          
          <SafetyCard 
            icon="📱"
            title={t('safety_center.sections.before.chat.title')}
            description={t('safety_center.sections.before.chat.desc')}
            delay={100}
          />

          <SafetyCard 
            icon="🔍"
            title={t('safety_center.sections.before.verify.title')}
            description={t('safety_center.sections.before.verify.desc')}
            delay={200}
          />

          <Text style={styles.sectionHeading}>{t('safety_center.sections.during.title')}</Text>

          <SafetyCard 
            icon="📍"
            title={t('safety_center.sections.during.public.title')}
            description={t('safety_center.sections.during.public.desc')}
            delay={300}
          />

          <SafetyCard 
            icon="👭"
            title={t('safety_center.sections.during.circle.title')}
            description={t('safety_center.sections.during.circle.desc')}
            delay={400}
          />

          <SafetyCard 
            icon="🚗"
            title={t('safety_center.sections.during.transport.title')}
            description={t('safety_center.sections.during.transport.desc')}
            delay={500}
          />

          <Text style={styles.sectionHeading}>{t('safety_center.sections.fraud.title')}</Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>{t('safety_center.sections.fraud.golden_rule.title')}</Text>
            <Text style={styles.warningText}>
              {t('safety_center.sections.fraud.golden_rule.text')}
            </Text>
          </View>

          <Text style={styles.sectionHeading}>{t('safety_center.sections.tools.title')}</Text>

          <View style={styles.toolsGrid}>
            <View style={styles.toolItem}>
              <Text style={styles.toolIcon}>🚫</Text>
              <Text style={styles.toolName}>{t('safety_center.sections.tools.block.title')}</Text>
              <Text style={styles.toolDesc}>{t('safety_center.sections.tools.block.desc')}</Text>
            </View>
            <View style={styles.toolItem}>
              <Text style={styles.toolIcon}>🚩</Text>
              <Text style={styles.toolName}>{t('safety_center.sections.tools.report.title')}</Text>
              <Text style={styles.toolDesc}>{t('safety_center.sections.tools.report.desc')}</Text>
            </View>
          </View>

          <Pressable 
            style={styles.actionBtn}
            onPress={() => router.push('/report-problem' as any)}
          >
            <Text style={styles.actionBtnText}>{t('safety_center.report_btn')}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={[styles.bottomGradient, { pointerEvents: 'none' }]}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scroll: {
    paddingBottom: 40,
  },
  content: {
    padding: 20,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#FF2D78',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 10px 20px rgba(255, 45, 120, 0.3)'
      }
    }),
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    marginTop: 12,
  },
  safetyCard: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardDescription: {
    fontSize: 14,
    color: '#8A8A8A',
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FF2D78',
  },
  warningTitle: {
    color: '#FF2D78',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  toolsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  toolItem: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  toolIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  toolName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  toolDesc: {
    color: '#6A6A6A',
    fontSize: 11,
    textAlign: 'center',
  },
  actionBtn: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
});
