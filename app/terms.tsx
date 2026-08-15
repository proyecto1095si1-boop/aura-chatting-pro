import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable 
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { useTranslation } from 'react-i18next';

export default function TermsScreen() {
  const { t } = useTranslation();

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('terms.header')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
          <Text style={styles.mainTitle}>{t('terms.main_title')}</Text>
          <Text style={styles.metaText}>{t('terms.meta_effective')}</Text>

          <Text style={styles.introText}>
            {t('terms.intro')}
          </Text>

          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              {t('terms.warning')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.sections.s1')}</Text>
            <Text style={styles.paragraph}>{t('terms.sections.s1_p1')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.sections.s2')}</Text>
            <Text style={styles.paragraph}>{t('terms.sections.s2_p1')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.sections.s3')}</Text>
            <Text style={styles.paragraph}>{t('terms.sections.s3_p1')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.sections.s4')}</Text>
            <Text style={styles.paragraph}>{t('terms.sections.s4_p1')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.sections.s5')}</Text>
            <Text style={styles.paragraphBold}>{t('terms.sections.s5_p1')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.sections.s8')}</Text>
            <Text style={styles.paragraph}>{t('terms.sections.s8_p1')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.sections.s9')}</Text>
            <Text style={styles.paragraph}>{t('terms.sections.s9_p1')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.sections.s14')}</Text>
            <Text style={styles.paragraphBold}>{t('terms.sections.s14_p1')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('terms.sections.s18')}</Text>
            <Text style={styles.paragraph}>{t('terms.sections.s18_p1')}</Text>
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
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#FF2D78',
    marginBottom: 4,
    fontWeight: '600',
  },
  introText: {
    fontSize: 15,
    color: '#8A8A8A',
    lineHeight: 22,
    marginTop: 16,
    marginBottom: 20,
  },
  warningCard: {
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF2D78',
    marginBottom: 16,
  },
  warningText: {
    color: '#FF2D78',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4FC3F7',
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    color: '#8A8A8A',
    lineHeight: 22,
    marginBottom: 12,
  },
  paragraphBold: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 14,
    color: '#8A8A8A',
    lineHeight: 20,
    marginLeft: 8,
    marginBottom: 8,
  }
});
