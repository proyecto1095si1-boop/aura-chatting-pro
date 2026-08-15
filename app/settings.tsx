import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Switch, 
  Alert, 
  Platform,
  Share,
  Linking,
  Modal,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth, UserProfile } from '@/lib/auth-context';
import { useSubscription } from '@/lib/subscription-context';
import { ScreenContainer } from '@/components/screen-container';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingSection = ({ title, children }: SettingSectionProps) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

interface SettingItemProps {
  icon: string;
  label: string;
  value?: string;
  description?: string;
  onPress?: () => void;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (val: boolean) => void;
  isLast?: boolean;
  isPremium?: boolean;
  destructive?: boolean;
}

const SettingItem = ({ 
  icon, 
  label, 
  value, 
  description,
  onPress, 
  showSwitch, 
  switchValue, 
  onSwitchChange, 
  isLast,
  isPremium,
  destructive
}: SettingItemProps) => (
  <Pressable 
    style={({ pressed }) => [
      styles.item, 
      pressed && onPress && { backgroundColor: 'rgba(255,255,255,0.05)' },
      isLast && { borderBottomWidth: 0 }
    ]}
    onPress={onPress}
    disabled={showSwitch}
  >
    <View style={styles.itemLeft}>
      <Text style={styles.itemIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={[styles.itemLabel, destructive && { color: '#FF2D78' }]}>{label}</Text>
          {isPremium && (
            <LinearGradient
              colors={['#FFD700', '#FFA000']}
              style={styles.premiumBadge}
            >
              <Text style={styles.premiumText}>GOLD</Text>
            </LinearGradient>
          )}
        </View>
        {(value || description) && (
          <View style={{ marginTop: 2 }}>
            {value && <Text style={styles.itemValue}>{value}</Text>}
            {description && <Text style={styles.itemDescription}>{description}</Text>}
          </View>
        )}
      </View>
    </View>
    {showSwitch ? (
      <Switch
        value={switchValue}
        onValueChange={onSwitchChange}
        trackColor={{ false: '#2A2A2A', true: '#FF2D78' }}
        thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : switchValue ? '#FFFFFF' : '#8A8A8A'}
      />
    ) : (
      !destructive && <Text style={styles.chevron}>›</Text>
    )}
  </Pressable>
);

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, updateProfile, logout } = useAuth();
  const { limits, plan } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(user?.recommendationsMode || 'balanced');
  const [visibility, setVisibility] = useState(user?.visibilityMode || 'standard');
  const [notifMatches, setNotifMatches] = useState(user?.notifications?.matches ?? true);
  const [notifMessages, setNotifMessages] = useState(user?.notifications?.messages ?? true);
  const [notifUpdates, setNotifUpdates] = useState(user?.notifications?.appUpdates ?? true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPremiumUser = user?.subscription !== 'free';

  const languages = [
    { code: 'en', label: 'English 🇺🇸', available: true },
    { code: 'es', label: 'Español 🇪🇸', available: true },
    { code: 'pt', label: 'Português 🇧🇷', available: false },
    { code: 'de', label: 'Deutsch 🇩🇪', available: false },
    { code: 'it', label: 'Italiano 🇮🇹', available: false },
  ];

  const changeLanguage = async (lng: string) => {
    try {
      await i18n.changeLanguage(lng);
      await AsyncStorage.setItem('user_language', lng);
      
      // Sincronizar con el perfil en Firestore para notificaciones push en el idioma correcto
      await updateProfile({ 
        // @ts-ignore - agregando campo dinámico para el backend
        language: lng 
      });

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("[Settings] Error changing language:", e);
    }
  };

  const showLanguagePicker = () => {
    setLangModalVisible(true);
  };

  const updateNotif = async (key: keyof NonNullable<UserProfile['notifications']>, val: boolean) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextMatches = key === 'matches' ? val : notifMatches;
    const nextMessages = key === 'messages' ? val : notifMessages;
    const nextUpdates = key === 'appUpdates' ? val : notifUpdates;

    // Local state updates
    if (key === 'matches') setNotifMatches(val);
    if (key === 'messages') setNotifMessages(val);
    if (key === 'appUpdates') setNotifUpdates(val);

    await updateProfile({
      notifications: {
        ...user?.notifications,
        matches: nextMatches,
        messages: nextMessages,
        appUpdates: nextUpdates,
      } as any
    });
  };

  const handleVisibilityChange = async () => {
    if (!limits.visibilityControl) {
      router.push('/paywall' as any);
      return;
    }
    const newVal = visibility === 'standard' ? 'incognito' : 'standard';
    setVisibility(newVal);
    await updateProfile({ 
      visibilityMode: newVal,
      isHidden: newVal === 'incognito' 
    });
  };

  const handleRecsChange = async () => {
    if (!limits.visibilityControl) { // Both Recs and Incognito are under visibilityControl now as per user request for GOLD
      router.push('/paywall' as any);
      return;
    }
    const newVal = recommendations === 'balanced' ? 'recent' : 'balanced';
    setRecommendations(newVal);
    await updateProfile({ recommendationsMode: newVal });
  };

  const handleShareApp = async () => {
    try {
      const shareMessage = user?.name 
        ? t('settings.share_message', { uid: user.uid })
        : t('settings.share_app_message');
        
      await Share.share({
        message: shareMessage,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const now = new Date().toISOString();
      // 1. Report to Admin
      await addDoc(collection(db, 'reports'), {
        type: 'account_deletion',
        reporterId: user.uid,
        reporterName: user.name,
        targetId: user.uid,
        reason: 'Solicitud de eliminación de cuenta (Grace period 7 días)',
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 2. Mark for deletion and hide
      await updateProfile({
        deletionRequestedAt: now,
        isHidden: true
      });

      // 3. Close modal and logout
      setDeleteModalVisible(false);
      setTimeout(() => {
        logout();
        router.replace('/auth/welcome' as any);
      }, 500);
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('settings.delete_error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInUp.duration(600)}>
          {/* Notifications */}
          <SettingSection title={t('settings.sections.notifications')}>
            <SettingItem 
              icon="🔥" 
              label={t('settings.items.matches')} 
              showSwitch 
              switchValue={user?.notifications?.matches ?? true}
              onSwitchChange={(v) => updateNotif('matches', v)}
            />
            <SettingItem 
              icon="💬" 
              label={t('settings.items.messages')} 
              showSwitch 
              switchValue={user?.notifications?.messages ?? true}
              onSwitchChange={(v) => updateNotif('messages', v)}
            />
            <SettingItem 
              icon="✨" 
              label={t('settings.items.app_activity')} 
              showSwitch 
              switchValue={user?.notifications?.appUpdates ?? true}
              onSwitchChange={(v) => updateNotif('appUpdates', v)}
              isLast
            />
          </SettingSection>

          {/* Preferences */}
          <SettingSection title={t('settings.sections.preferences', 'Preferencias')}>
            <SettingItem 
              icon="🌐" 
              label={t('settings.items.language', 'Idioma')} 
              value={i18n.language === 'en' ? 'English' : 
                     i18n.language === 'es' ? 'Español' : 
                     i18n.language === 'pt' ? 'Português' : 
                     i18n.language === 'de' ? 'Deutsch' : 
                     i18n.language === 'it' ? 'Italiano' : i18n.language}
              onPress={showLanguagePicker}
              isLast
            />
          </SettingSection>

          {/* Discover Controls */}
          <SettingSection title={t('settings.sections.navigation')}>
            <SettingItem 
              icon="⚖️" 
              label={t('settings.items.view_profiles')} 
              value={recommendations === 'balanced' ? t('settings.values.balanced') : t('settings.values.recent')}
              description={recommendations === 'balanced' 
                ? t('settings.descriptions.balanced') 
                : t('settings.descriptions.recent')}
              onPress={handleRecsChange}
              isPremium={!limits.visibilityControl}
            />
            <SettingItem 
              icon="👻" 
              label={t('settings.items.incognito')} 
              value={visibility === 'standard' ? t('settings.values.incognito_off') : t('settings.values.incognito_on')}
              description={visibility === 'standard'
                ? t('settings.descriptions.incognito_off')
                : t('settings.descriptions.incognito_on')}
              onPress={handleVisibilityChange}
              isPremium={!limits.visibilityControl}
              isLast
            />
          </SettingSection>

          {/* Contact */}
          <SettingSection title={t('settings.sections.support')}>
            <SettingItem icon="🙋‍♂️" label={t('settings.items.help')} onPress={() => router.push('/help' as any)} />
            <SettingItem icon="🚫" label={t('settings.items.report')} onPress={() => router.push('/report-problem' as any)} isLast />
          </SettingSection>

          {/* Security & Verification */}
          <SettingSection title={t('settings.sections.security')}>
            <SettingItem 
              icon="🛡️" 
              label={t('settings.items.verify')} 
              description={
                user?.verificationStatus === 'verified' ? t('settings.items.verification_verified') :
                user?.verificationStatus === 'pending' ? t('settings.items.verification_pending') :
                t('settings.items.verification_desc')
              }
              onPress={() => user?.verificationStatus !== 'verified' && router.push('/verify' as any)} 
              isLast={false} 
            />
            <SettingItem icon="📜" label={t('settings.items.rules')} onPress={() => router.push('/community-rules' as any)} />
            <SettingItem icon="🛡️" label={t('settings.items.safety')} onPress={() => router.push('/safety-center' as any)} isLast />
          </SettingSection>

          {/* Legal */}
          <SettingSection title={t('settings.sections.legal')}>
            <SettingItem icon="🌍" label={t('settings.items.website')} onPress={() => Linking.openURL('https://aurachating.vercel.app')} />
            <SettingItem icon="🍪" label={t('settings.items.cookies')} onPress={() => router.push('/cookies' as any)} />
            <SettingItem icon="🔒" label={t('settings.items.privacy')} onPress={() => router.push('/privacy' as any)} />
            <SettingItem icon="⚖️" label={t('settings.items.terms')} onPress={() => router.push('/terms' as any)} />
            <SettingItem icon="👥" label={t('settings.items.community')} onPress={() => router.push('/community-rules' as any)} />
            <SettingItem icon="📄" label={t('settings.items.licenses')} onPress={() => router.push('/licenses' as any)} isLast />
          </SettingSection>

          {/* Admin Panel */}
          {user?.email?.toLowerCase() === 'admin@aura-app.com' && (
            <SettingSection title={t('common.admin', 'Administración')}>
              <SettingItem 
                icon="🛡️" 
                label="Admin Dashboard" 
                description="Acceso exclusivo para administradores"
                onPress={() => router.push('/(admin)')}
                isLast
              />
            </SettingSection>
          )}

          {/* Actions */}
          <SettingSection title={t('settings.sections.account')}>
            <SettingItem 
              icon="🚪" 
              label={t('settings.items.logout')} 
              onPress={async () => {
                await logout();
                router.replace('/');
              }} 
            />
            <SettingItem 
              icon="🗑️" 
              label={t('settings.items.delete')} 
              destructive 
              onPress={() => setDeleteModalVisible(true)}
              isLast 
            />
          </SettingSection>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('settings.footer_version')}</Text>
            <Text style={styles.footerSub}>{t('settings.footer_tagline')}</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Language Picker Modal */}
      <LanguagePickerModal 
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
        onSelect={(code: string) => {
          changeLanguage(code);
          setLangModalVisible(false);
        }}
        currentCode={i18n.language}
        languages={languages}
      />

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown} style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.warningIconCircle}>
                <Text style={{ fontSize: 32 }}>🗑️</Text>
              </View>
              <Text style={styles.modalTitle}>{t('settings.delete_title')}</Text>
              <Text style={styles.modalDescription}>
                {t('settings.delete_message')}
              </Text>

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => !isDeleting && setDeleteModalVisible(false)}
                >
                  <Text style={styles.modalBtnTextCancel}>{t('common.cancel')}</Text>
                </Pressable>
                
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnDelete]}
                  onPress={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.modalBtnTextDelete}>{t('settings.confirm_delete')}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function LanguagePickerModal({ visible, onClose, onSelect, currentCode, languages }: any) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.langModalOverlay}>
        <Animated.View entering={FadeInDown} style={styles.langModalContainer}>
          <View style={styles.langHeader}>
            <Text style={styles.langTitle}>{t('profile.language')}</Text>
            <Text style={styles.langSubtitle}>Selecciona tu idioma preferido</Text>
          </View>
          
          <ScrollView style={styles.langList}>
            {languages.map((l: any) => (
              <Pressable 
                key={l.code}
                style={[styles.langOption, currentCode === l.code && styles.langOptionActive]}
                onPress={() => l.available && onSelect(l.code)}
                disabled={!l.available}
              >
                <Text style={styles.langFlag}>{l.label.split(' ').pop()}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.langLabel, 
                    currentCode === l.code && styles.langLabelActive,
                    !l.available && { opacity: 0.4 }
                  ]}>
                    {l.label.split(' ')[0]}
                  </Text>
                  {!l.available && (
                    <Text style={{ fontSize: 11, color: '#FF2D78', marginTop: 2, fontWeight: '600' }}>Próximamente</Text>
                  )}
                </View>
                {currentCode === l.code && <Text style={styles.langCheck}>✓</Text>}
              </Pressable>
            ))}
          </ScrollView>

          <Pressable style={styles.langCloseBtn} onPress={onClose}>
            <Text style={styles.langCloseText}>{t('common.cancel')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
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
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8A8A',
    marginLeft: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionContent: {
    backgroundColor: '#161616',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  itemIcon: {
    fontSize: 20,
  },
  itemLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  itemValue: {
    fontSize: 13,
    color: '#8A8A8A',
    marginTop: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: '#6A6A6A',
    marginTop: 1,
    lineHeight: 16,
  },
  chevron: {
    color: '#4A4A4A',
    fontSize: 24,
    fontWeight: '300',
  },
  premiumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 4,
    opacity: 0.5,
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  footerSub: {
    color: '#8A8A8A',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#161616',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  modalContent: {
    padding: 32,
    alignItems: 'center',
  },
  warningIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 16,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#2A2A2A',
  },
  modalBtnDelete: {
    backgroundColor: '#FF2D78',
  },
  modalBtnTextCancel: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  modalBtnTextDelete: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  // Language Picker Styles
  langModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  langModalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1A1A1A',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  langHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  langTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  langSubtitle: {
    fontSize: 14,
    color: '#8A8A8A',
  },
  langList: {
    padding: 12,
    maxHeight: 400,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 4,
    gap: 16,
  },
  langOptionActive: {
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
  },
  langFlag: {
    fontSize: 24,
  },
  langLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  langLabelActive: {
    color: '#FF2D78',
  },
  langCheck: {
    fontSize: 18,
    color: '#FF2D78',
  },
  langCloseBtn: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  langCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
