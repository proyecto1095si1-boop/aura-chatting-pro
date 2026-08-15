import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  TextInput,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  FadeIn, 
  Layout, 
  useAnimatedStyle, 
  withTiming 
} from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { useTranslation } from 'react-i18next';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQItem = ({ faq, isExpanded, onToggle }: { faq: FAQ, isExpanded: boolean, onToggle: () => void }) => {
  return (
    <Pressable 
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      style={[styles.faqCard, isExpanded && styles.faqCardExpanded]}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, isExpanded && styles.faqQuestionActive]}>{faq.question}</Text>
        <Text style={styles.faqIcon}>{isExpanded ? '−' : '+'}</Text>
      </View>
      {isExpanded && (
        <Animated.View 
          entering={FadeIn.duration(300)} 
          layout={Layout.springify()}
          style={styles.faqAnswerContainer}
        >
          <Text style={styles.faqAnswer}>{faq.answer}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
};

export default function HelpScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const FAQS: FAQ[] = [
    { id: '1', category: t('help.categories.subscriptions'), question: t('help.faqs.cancel.q'), answer: t('help.faqs.cancel.a') },
    { id: '2', category: t('help.categories.subscriptions'), question: t('help.faqs.gold_benefits.q'), answer: t('help.faqs.gold_benefits.a') },
    { id: '3', category: t('help.categories.subscriptions'), question: t('help.faqs.grace_period.q'), answer: t('help.faqs.grace_period.a') },
    { id: '10', category: t('help.categories.account'), question: t('help.faqs.change_age.q'), answer: t('help.faqs.change_age.a') },
    { id: '20', category: t('help.categories.safety'), question: t('help.faqs.report_harassment.q'), answer: t('help.faqs.report_harassment.a') },
    { id: '21', category: t('help.categories.safety'), question: t('help.faqs.block_user.q'), answer: t('help.faqs.block_user.a') },
    { id: '30', category: t('help.categories.matches'), question: t('help.faqs.missing_match.q'), answer: t('help.faqs.missing_match.a') },
    { id: '31', category: t('help.categories.matches'), question: t('help.faqs.no_notifs.q'), answer: t('help.faqs.no_notifs.a') },
  ];

  const filteredFaqs = FAQS.filter(f => 
    f.question.toLowerCase().includes(search.toLowerCase()) || 
    f.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(FAQS.map(f => f.category))];

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('help.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('help.search_placeholder')}
          placeholderTextColor="#8A8A8A"
          value={search}
          onChangeText={setSearch}
        />
        <Text style={styles.searchIcon}>🔍</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scroll}
      >
        <Animated.View entering={FadeInDown.duration(600)}>
          {categories.map(category => {
            const categoryFaqs = filteredFaqs.filter(f => f.category === category);
            if (categoryFaqs.length === 0) return null;

            return (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {categoryFaqs.map(faq => (
                  <FAQItem 
                    key={faq.id} 
                    faq={faq} 
                    isExpanded={expandedId === faq.id}
                    onToggle={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  />
                ))}
              </View>
            );
          })}

          {filteredFaqs.length === 0 && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsTitle}>{t('help.no_results')}</Text>
              <Text style={styles.noResultsSub}>{t('help.no_results_sub')}</Text>
            </View>
          )}

          <View style={styles.contactFooter}>
            <Text style={styles.contactTitle}>{t('help.contact_title')}</Text>
            <Pressable 
              style={styles.contactBtn}
              onPress={() => router.push('/report-problem' as any)}
            >
              <Text style={styles.contactBtnText}>{t('help.contact_btn')}</Text>
            </Pressable>
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#161616',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchIcon: {
    position: 'absolute',
    left: 32,
    top: 22,
    fontSize: 16,
  },
  scroll: {
    paddingBottom: 40,
  },
  categorySection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  categoryTitle: {
    color: '#8A8A8A',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  faqCard: {
    backgroundColor: '#161616',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  faqCardExpanded: {
    borderColor: '#FF2D78',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  faqQuestion: {
    color: '#E0E0E0',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  faqQuestionActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  faqIcon: {
    color: '#8A8A8A',
    fontSize: 18,
    marginLeft: 12,
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  faqAnswer: {
    color: '#8A8A8A',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  noResults: {
    marginTop: 60,
    alignItems: 'center',
  },
  noResultsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  noResultsSub: {
    color: '#8A8A8A',
    fontSize: 14,
    marginTop: 8,
  },
  contactFooter: {
    marginTop: 40,
    padding: 30,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    gap: 16,
  },
  contactTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contactBtn: {
    backgroundColor: '#FF2D78',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 30,
  },
  contactBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
