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

export default function PrivacyScreen() {
  const { t } = useTranslation();

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('privacy.header')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
          <Text style={styles.mainTitle}>{t('privacy.main_title')}</Text>
          <Text style={styles.metaText}>{t('privacy.meta_effective')}</Text>
          <Text style={styles.metaText}>{t('privacy.meta_last')}</Text>          <Text style={styles.introText}>
            {t('privacy.intro1')}
          </Text>

          <Text style={styles.introText}>
            {t('privacy.intro2')}
          </Text>

          {/* Section 1 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.sections.s1.title')}</Text>
            <Text style={styles.paragraph}>
              {t('privacy.sections.s1.intro')}
            </Text>
            
            <Text style={styles.subSectionTitle}>{t('privacy.sections.s1.sub1.title')}</Text>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Text key={`s1-sub1-${i}`} style={styles.paragraph}>
                <Text style={styles.boldText}>{t(`privacy.sections.s1.sub1.item${i}.bold`)}</Text> {t(`privacy.sections.s1.sub1.item${i}.text`)}
              </Text>
            ))}

            <Text style={styles.subSectionTitle}>{t('privacy.sections.s1.sub2.title')}</Text>
            {[1, 2, 3, 4].map((i) => (
              <Text key={`s1-sub2-${i}`} style={styles.paragraph}>
                <Text style={styles.boldText}>{t(`privacy.sections.s1.sub2.item${i}.bold`)}</Text> {t(`privacy.sections.s1.sub2.item${i}.text`)}
              </Text>
            ))}

            <Text style={styles.subSectionTitle}>{t('privacy.sections.s1.sub3.title')}</Text>
            {[1, 2, 3].map((i) => (
              <Text key={`s1-sub3-${i}`} style={styles.paragraph}>
                <Text style={styles.boldText}>{t(`privacy.sections.s1.sub3.item${i}.bold`)}</Text> {t(`privacy.sections.s1.sub3.item${i}.text`)}
              </Text>
            ))}
          </View>

          {/* Section 2 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.sections.s2.title')}</Text>
            <Text style={styles.paragraph}>
              {t('privacy.sections.s2.intro')}
            </Text>

            <Text style={styles.subSectionTitle}>{t('privacy.sections.s2.sub1.title')}</Text>
            {t('privacy.sections.s2.sub1.items', { returnObjects: true }).map((item: string, i: number) => (
              <Text key={`s2-sub1-${i}`} style={styles.paragraph}>• {item}</Text>
            ))}

            <Text style={styles.subSectionTitle}>{t('privacy.sections.s2.sub2.title')}</Text>
            {t('privacy.sections.s2.sub2.items', { returnObjects: true }).map((item: string, i: number) => (
              <Text key={`s2-sub2-${i}`} style={styles.paragraph}>• {item}</Text>
            ))}

            <Text style={styles.subSectionTitle}>{t('privacy.sections.s2.sub3.title')}</Text>
            {t('privacy.sections.s2.sub3.items', { returnObjects: true }).map((item: string, i: number) => (
              <Text key={`s2-sub3-${i}`} style={styles.paragraph}>• {item}</Text>
            ))}

            <Text style={styles.subSectionTitle}>{t('privacy.sections.s2.sub4.title')}</Text>
            {t('privacy.sections.s2.sub4.items', { returnObjects: true }).map((item: string, i: number) => (
              <Text key={`s2-sub4-${i}`} style={styles.paragraph}>• {item}</Text>
            ))}

            <Text style={styles.subSectionTitle}>{t('privacy.sections.s2.sub5.title')}</Text>
            {t('privacy.sections.s2.sub5.items', { returnObjects: true }).map((item: string, i: number) => (
              <Text key={`s2-sub5-${i}`} style={styles.paragraph}>• {item}</Text>
            ))}
          </View>

          {/* Section 3 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.sections.s3.title')}</Text>
            <Text style={styles.paragraph}>{t('privacy.sections.s3.p1')}</Text>

            {[1, 2, 3, 4, 5].map((i) => (
              <View key={`s3-sub${i}`}>
                <Text style={styles.subSectionTitle}>{t(`privacy.sections.s3.sub${i}.title`)}</Text>
                <Text style={styles.paragraph}>{t(`privacy.sections.s3.sub${i}.text`)}</Text>
              </View>
            ))}
          </View>

          {/* Section 4 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.sections.s4.title')}</Text>
            <Text style={styles.paragraph}>{t('privacy.sections.s4.p1')}</Text>
            <Text style={styles.paragraph}>{t('privacy.sections.s4.p2')}</Text>
          </View>

          {/* Section 5 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.sections.s5.title')}</Text>
            <Text style={styles.paragraph}>{t('privacy.sections.s5.intro')}</Text>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Text key={`s5-item-${i}`} style={styles.paragraph}>
                <Text style={styles.boldText}>{t(`privacy.sections.s5.item${i}.bold`)}</Text> {t(`privacy.sections.s5.item${i}.text`)}
              </Text>
            ))}
            <Text style={styles.paragraph}>{t('privacy.sections.s5.footer')}</Text>
          </View>

          {/* Section 6 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.sections.s6.title')}</Text>
            <Text style={styles.paragraph}>{t('privacy.sections.s6.intro')}</Text>
            {[1, 2, 3].map((i) => (
              <Text key={`s6-item-${i}`} style={styles.paragraph}>
                <Text style={styles.boldText}>{t(`privacy.sections.s6.item${i}.bold`)}</Text> {t(`privacy.sections.s6.item${i}.text`)}
              </Text>
            ))}
          </View>

          {/* Section 7 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.sections.s7.title')}</Text>
            <Text style={styles.paragraph}>{t('privacy.sections.s7.p1')}</Text>
            <Text style={styles.paragraph}>{t('privacy.sections.s7.p2')}</Text>
          </View>

          {/* Section 8 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.sections.s8.title')}</Text>
            <Text style={styles.paragraph}>{t('privacy.sections.s8.p1')}</Text>
          </View>

          {/* Section 9  */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privacy.sections.s9.title')}</Text>
            <Text style={styles.paragraph}>{t('privacy.sections.s9.p1')}</Text>
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
    marginBottom: 12,
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
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 8,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4FC3F7',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    color: '#8A8A8A',
    lineHeight: 22,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: '700',
    color: '#FFFFFF',
  }
});
