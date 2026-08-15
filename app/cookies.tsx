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

export default function CookiesScreen() {
  const { t } = useTranslation();

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('cookies.header')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
          <Text style={styles.mainTitle}>{t('cookies.header')}</Text>
          <Text style={styles.intro}>
            {t('cookies.intro')}
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('cookies.card.title')}</Text>
            <Text style={styles.cardText}>
              {t('cookies.card.text')}
            </Text>
          </View>

          <Text style={styles.intro}>
            {t('cookies.intro2')}
          </Text>
          <Text style={[styles.intro, { fontStyle: 'italic', fontSize: 13 }]}>
            {t('cookies.note')}
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('cookies.q_what_are_cookies')}</Text>
            <Text style={styles.paragraph}>
              {t('cookies.what_are_cookies_text')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('cookies.q_different_types')}</Text>
            
            <Text style={styles.subSectionTitle}>{t('cookies.types.first_third.title')}</Text>
            <Text style={styles.paragraph}>
              {t('cookies.types.first_third.text')}
            </Text>

            <Text style={styles.subSectionTitle}>{t('cookies.types.session_persistent.title')}</Text>
            <Text style={styles.paragraph}>
              {t('cookies.types.session_persistent.text')}
            </Text>

            <Text style={styles.subSectionTitle}>{t('cookies.types.other_tech.title')}</Text>
            <Text style={styles.paragraph}>
              {t('cookies.types.other_tech.text')}
            </Text>
            <Text style={styles.paragraph}>
              {t('cookies.types.summary')}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('cookies.usage.title')}</Text>
            <Text style={styles.paragraph}>
              {t('cookies.usage.text')}
            </Text>
            <Text style={styles.paragraph}>
              {t('cookies.usage.list_intro')}
            </Text>
            
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}><Text style={styles.boldText}>• {t('cookies.usage.items.necessary.title')}</Text> {t('cookies.usage.items.necessary.text')}</Text>
              <Text style={styles.bulletItem}><Text style={styles.boldText}>• {t('cookies.usage.items.analytical.title')}</Text> {t('cookies.usage.items.analytical.text')}</Text>
              <Text style={styles.bulletItem}><Text style={styles.boldText}>• {t('cookies.usage.items.performance.title')}</Text> {t('cookies.usage.items.performance.text')}</Text>
              <Text style={styles.bulletItem}><Text style={styles.boldText}>• {t('cookies.usage.items.marketing.title')}</Text> {t('cookies.usage.items.marketing.text')}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('cookies.control.title')}</Text>
            <Text style={styles.paragraph}>{t('cookies.control.intro')}</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>{t('cookies.control.browser.title')}</Text> {t('cookies.control.browser.text')}</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>{t('cookies.control.app.title')}</Text> {t('cookies.control.app.text')}</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>{t('cookies.control.third_party.title')}</Text> {t('cookies.control.third_party.text')}</Text>
            </View>
          </View>

          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>{t('cookies.contact.title')}</Text>
            <Text style={styles.contactText}>
              {t('cookies.contact.text')}
            </Text>
            <Text style={styles.contactEmail}>support@aura-app.com</Text>
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
    marginBottom: 8,
  },
  intro: {
    fontSize: 15,
    color: '#8A8A8A',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#4FC3F7',
    marginVertical: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4FC3F7',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  section: {
    marginTop: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF2D78',
    marginTop: 8,
  },
  paragraph: {
    fontSize: 15,
    color: '#8A8A8A',
    lineHeight: 22,
  },
  bulletList: {
    marginLeft: 8,
    gap: 10,
  },
  bulletItem: {
    fontSize: 15,
    color: '#8A8A8A',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactCard: {
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 120, 0.3)',
  },
  contactTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  contactText: {
    color: '#8A8A8A',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  contactEmail: {
    color: '#FF2D78',
    fontSize: 16,
    fontWeight: '700',
  }
});
