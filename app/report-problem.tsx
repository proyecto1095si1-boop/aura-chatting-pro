import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  TextInput,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from '@/lib/auth-context';
import { ScreenContainer } from '@/components/screen-container';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { useTranslation } from 'react-i18next';

export default function ReportProblemScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const CATEGORIES = [
    t('report_problem.categories.profile'),
    t('report_problem.categories.match'),
    t('report_problem.categories.subscription'),
    t('report_problem.categories.safety'),
    t('report_problem.categories.bug'),
    t('report_problem.categories.other')
  ];

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert(t('common.error'), t('report_problem.error_empty'));
      return;
    }

    setLoading(true);
    
    // Safety timeout to prevent infinite loading if Firestore hangs
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        Alert.alert(t('common.error'), t('report_problem.error_timeout'));
      }
    }, 10000);

    try {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      console.log("[Support] Sending report from:", user?.name);

      await addDoc(collection(db, 'reports'), {
        type: 'user_problem',
        category,
        description,
        reporterId: user?.uid || 'anonymous',
        reporterName: user?.name || t('report_problem.anonymous'),
        status: 'pending',
        createdAt: serverTimestamp()
      });

      clearTimeout(timeout);
      setSuccess(true);
    } catch (error) {
      clearTimeout(timeout);
      console.error(error);
      Alert.alert(t('common.error'), t('report_problem.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <Animated.View entering={FadeInUp.duration(800)} style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <Text style={styles.successIcon}>✅</Text>
          </View>
          <Text style={styles.successTitle}>{t('report_problem.success_title')}</Text>
          <Text style={styles.successSub}>{t('report_problem.success_sub')}</Text>
          <Pressable 
            style={styles.backHomeBtn}
            onPress={() => router.replace('/(tabs)/profile' as any)}
          >
            <Text style={styles.backHomeText}>{t('report_problem.back_profile')}</Text>
          </Pressable>
        </Animated.View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('report_problem.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={styles.infoArea}>
            <Text style={styles.title}>{t('report_problem.info_title')}</Text>
            <Text style={styles.subtitle}>{t('report_problem.info_sub')}</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>{t('report_problem.label_category')}</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCategory(cat);
                  }}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive
                  ]}
                >
                  <Text style={[
                    styles.categoryText,
                    category === cat && styles.categoryTextActive
                  ]}>{cat}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>{t('report_problem.label_description')}</Text>
            <TextInput
              style={styles.textArea}
              placeholder={t('report_problem.placeholder')}
              placeholderTextColor="#4A4A4A"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <Pressable 
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={['#FF2D78', '#FF6B35'] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>{t('report_problem.submit')}</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.securitySeal}>
            <Text style={styles.securityIcon}>🛡️</Text>
            <Text style={styles.securityText}>{t('report_problem.security_text')}</Text>
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
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  infoArea: {
    marginTop: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#8A8A8A',
    fontSize: 15,
    lineHeight: 22,
  },
  formSection: {
    marginTop: 32,
  },
  label: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  categoryChipActive: {
    borderColor: '#FF2D78',
    backgroundColor: '#1A0A0E',
  },
  categoryText: {
    color: '#8A8A8A',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#FF2D78',
  },
  textArea: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    minHeight: 150,
  },
  submitBtn: {
    marginTop: 32,
  },
  gradientBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  securitySeal: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#101010',
    padding: 20,
    borderRadius: 16,
    opacity: 0.7,
  },
  securityIcon: {
    fontSize: 24,
  },
  securityText: {
    color: '#8A8A8A',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  successIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A2A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    fontSize: 40,
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  successSub: {
    color: '#8A8A8A',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  backHomeBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
  },
  backHomeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
