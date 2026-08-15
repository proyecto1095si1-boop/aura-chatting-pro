import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable 
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { LinearGradient } from 'expo-linear-gradient';

import { useTranslation } from 'react-i18next';

export default function CommunityRulesScreen() {
  const { t } = useTranslation();

  return (
    <ScreenContainer containerClassName="bg-background" edges = {['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('community_rules.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
          <Text style={styles.mainTitle}>{t('community_rules.subtitle')}</Text>
          <Text style={styles.introText}>
            {t('community_rules.intro')}
          </Text>

          {/* Card 1 */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>✨</Text>
              <Text style={styles.cardTitle}>{t('community_rules.authentic.title')}</Text>
            </View>
            <Text style={styles.cardText}>
              {t('community_rules.authentic.text')}
            </Text>
          </Animated.View>

          {/* Card 2 */}
          <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🤝</Text>
              <Text style={styles.cardTitle}>{t('community_rules.respect.title')}</Text>
            </View>
            <Text style={styles.cardText}>
              {t('community_rules.respect.text')}
            </Text>
          </Animated.View>

          {/* Card 3 - High Warning */}
          <Animated.View entering={FadeInUp.delay(400).duration(500)} style={[styles.card, styles.warningCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🔞</Text>
              <Text style={[styles.cardTitle, { color: '#FF2D78' }]}>{t('community_rules.content.title')}</Text>
            </View>
            <Text style={styles.cardText}>
              {t('community_rules.content.text')}
            </Text>
            <Text style={styles.consequences}>
              {t('community_rules.content.important')}
            </Text>
          </Animated.View>

          {/* Card 4 */}
          <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🛡️</Text>
              <Text style={styles.cardTitle}>{t('community_rules.data_protection.title')}</Text>
            </View>
            <Text style={styles.cardText}>
              {t('community_rules.data_protection.text')}
            </Text>
          </Animated.View>

          {/* Card 5 */}
          <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🚫</Text>
              <Text style={styles.cardTitle}>{t('community_rules.spam.title')}</Text>
            </View>
            <Text style={styles.cardText}>
              {t('community_rules.spam.text')}
            </Text>
          </Animated.View>

          <View style={styles.reportSection}>
            <LinearGradient
              colors={['#FF2D78', '#FF6B35']}
              style={styles.reportBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.reportTitle}>{t('community_rules.report.title')}</Text>
              <Text style={styles.reportText}>
                {t('community_rules.report.text')}
              </Text>
            </LinearGradient>
          </View>
        </Animated.View>
      </ScrollView>
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
    paddingBottom: 60,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  introText: {
    fontSize: 15,
    color: '#8A8A8A',
    lineHeight: 22,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  warningCard: {
    borderColor: 'rgba(255, 45, 120, 0.4)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  cardIcon: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardText: {
    fontSize: 14,
    color: '#8A8A8A',
    lineHeight: 20,
  },
  consequences: {
    fontSize: 13,
    color: '#FF2D78',
    fontWeight: '700',
    marginTop: 10,
    lineHeight: 18,
  },
  reportSection: {
    marginTop: 20,
  },
  reportBanner: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  reportTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  reportText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 20,
  }
});
