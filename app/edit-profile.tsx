import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform, Modal, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAuth } from '@/lib/auth-context';
import * as Haptics from 'expo-haptics';

import { useTranslation } from 'react-i18next';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [hasChildren, setHasChildren] = useState(user?.hasChildren ?? null);
  const [smokes, setSmokes] = useState(user?.smokes ?? null);
  const [drinks, setDrinks] = useState(user?.drinks ?? null);
  const [height, setHeight] = useState(user?.height?.toString() || '');
  const [religion, setReligion] = useState(user?.religion ?? '');
  const [goal, setGoal] = useState(user?.relationshipGoal ?? '');
  const [zodiac, setZodiac] = useState(user?.zodiac ?? '');
  const [personality, setPersonality] = useState(user?.personalityType ?? '');
  const [instagram, setInstagram] = useState(user?.socialLinks?.instagram || '');
  const [tiktok, setTiktok] = useState(user?.socialLinks?.tiktok || '');
  const [prompts, setPrompts] = useState<{id: string, answer: string}[]>(user?.prompts || []);
  const [hideZodiac, setHideZodiac] = useState(user?.privacy?.hideZodiac ?? false);
  const [hideHeight, setHideHeight] = useState(user?.privacy?.hideHeight ?? false);
  const [saving, setSaving] = useState(false);
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const allPromptKeys = Array.from({ length: 30 }, (_, i) => `q${i + 1}`);

  const handleSave = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    await updateProfile({
      name: name || user?.name || '',
      bio: bio || user?.bio || '',
      hasChildren,
      smokes,
      drinks,
      height: height ? parseInt(height) : null,
      religion,
      relationshipGoal: goal as any,
      zodiac,
      personalityType: personality,
      socialLinks: { instagram, tiktok },
      prompts,
      privacy: {
        ...user?.privacy,
        hideZodiac,
        hideHeight,
      }
    });
    setSaving(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const bioLength = bio.length;
  const bioMax = 500;
  const tips = t('edit_profile.tips', { returnObjects: true }) as string[];

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.cancelButton}>{t('edit_profile.cancel')}</Text>
          </Pressable>
          <Text style={styles.title}>{t('edit_profile.title')}</Text>
          <Pressable onPress={handleSave} disabled={saving}>
            <Text style={[styles.saveButton, saving && { opacity: 0.5 }]}>
              {saving ? t('edit_profile.saving') : t('edit_profile.save')}
            </Text>
          </Pressable>
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('edit_profile.name_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('edit_profile.name_placeholder')}
            placeholderTextColor="#8A8A8A"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
          <Text style={styles.charCount}>{name.length}/50</Text>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('edit_profile.bio_label')}</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder={t('edit_profile.bio_placeholder')}
            placeholderTextColor="#8A8A8A"
            value={bio}
            onChangeText={setBio}
            maxLength={bioMax}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, bioLength > bioMax * 0.9 && { color: '#FF2D78' }]}>
            {bioLength}/{bioMax}
          </Text>
        </View>

        {/* Bio Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>{t('edit_profile.tips_title')}</Text>
          <View style={styles.tipsList}>
            {tips.map((tip, i) => (
              <View key={i} style={styles.tipItem}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Interests Preview */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('edit_profile.interests_label')}</Text>
          <View style={styles.interestChips}>
            {(user?.interests || []).map(interest => (
              <View key={interest} style={styles.interestChip}>
                <Text style={styles.interestChipText}>{t(`common.interests.${interest}`)}</Text>
              </View>
            ))}
          </View>
          <Pressable style={styles.editInterestsBtn}>
            <Text style={styles.editInterestsBtnText}>{t('edit_profile.edit_interests')}</Text>
          </Pressable>
        </View>

        {/* Lifestyle Sections */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('common.lifestyle.relationship_goal.label')}</Text>
          <View style={styles.optionsGrid}>
            {['chat', 'friendship', 'informal', 'stable', 'life_partner', 'stable_flexible'].map(opt => (
              <Pressable
                key={opt}
                style={[styles.option, goal === opt && styles.optionActive]}
                onPress={() => setGoal(opt)}
              >
                <Text style={[styles.optionText, goal === opt && styles.optionTextActive]}>
                  {t(`common.lifestyle.relationship_goal.${opt}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('common.lifestyle.kids.label')}</Text>
          <View style={styles.optionsRow}>
            <Pressable style={[styles.option, hasChildren === false && styles.optionActive]} onPress={() => setHasChildren(false)}>
              <Text style={[styles.optionText, hasChildren === false && styles.optionTextActive]}>{t('common.lifestyle.kids.no')}</Text>
            </Pressable>
            <Pressable style={[styles.option, hasChildren === true && styles.optionActive]} onPress={() => setHasChildren(true)}>
              <Text style={[styles.optionText, hasChildren === true && styles.optionTextActive]}>{t('common.lifestyle.kids.yes')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('common.lifestyle.smoking.label')}</Text>
          <View style={styles.optionsRow}>
            {['no', 'social', 'yes'].map(opt => (
              <Pressable key={opt} style={[styles.option, smokes === opt && styles.optionActive]} onPress={() => setSmokes(opt as any)}>
                <Text style={[styles.optionText, smokes === opt && styles.optionTextActive]}>{t(`common.lifestyle.smoking.${opt}`)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('common.lifestyle.height.label', { defaultValue: 'Altura (cm)' })}</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
            placeholder="170"
            placeholderTextColor="#8A8A8A"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('common.lifestyle.religion.label')}</Text>
          <View style={styles.optionsGrid}>
            {['none', 'catholic', 'christian', 'jewish', 'muslim', 'buddhist', 'other'].map(opt => (
              <Pressable key={opt} style={[styles.option, religion === opt && styles.optionActive]} onPress={() => setReligion(opt)}>
                <Text style={[styles.optionText, religion === opt && styles.optionTextActive]}>{t(`common.lifestyle.religion.${opt}`)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* New Sections */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('common.lifestyle.zodiac.label')}</Text>
          <View style={styles.optionsGrid}>
            {['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'].map(opt => (
              <Pressable key={opt} style={[styles.option, zodiac === opt && styles.optionActive]} onPress={() => setZodiac(opt)}>
                <Text style={[styles.optionText, zodiac === opt && styles.optionTextActive]}>{t(`common.lifestyle.zodiac.${opt}`)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('common.lifestyle.personality.label')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('edit_profile.personality_placeholder', 'E.g.: INFJ')}
            placeholderTextColor="#8A8A8A"
            value={personality}
            onChangeText={setPersonality}
            maxLength={4}
            autoCapitalize="characters"
          />
        </View>

        {/* Social Links */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('edit_profile.social_label')}</Text>
          <View style={styles.socialInputRow}>
            <Text style={styles.socialPrefix}>Instagram @</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t('edit_profile.username_placeholder', 'username')}
              placeholderTextColor="#8A8A8A"
              value={instagram}
              onChangeText={setInstagram}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.socialInputRow}>
            <Text style={styles.socialPrefix}>TikTok @</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t('edit_profile.username_placeholder', 'username')}
              placeholderTextColor="#8A8A8A"
              value={tiktok}
              onChangeText={setTiktok}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Prompts Section */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('edit_profile.prompts_label')}</Text>
          {prompts.map((p, idx) => (
            <View key={idx} style={styles.promptItem}>
              <Text style={styles.promptQuestion}>{t(`prompts.${p.id}`)}</Text>
              <TextInput
                style={[styles.input, styles.promptInput]}
                placeholder={t('edit_profile.prompt_placeholder', 'Your answer...')}
                placeholderTextColor="#8A8A8A"
                value={p.answer}
                onChangeText={(text) => {
                  const newPrompts = [...prompts];
                  newPrompts[idx].answer = text;
                  setPrompts(newPrompts);
                }}
                multiline
              />
              <Pressable 
                onPress={() => setPrompts(prompts.filter((_, i) => i !== idx))}
                style={styles.removePromptBtn}
              >
                <Text style={styles.removePromptText}>{t('common.delete', 'Delete')}</Text>
              </Pressable>
            </View>
          ))}
          
          {prompts.length < 5 && (
            <Pressable 
              style={styles.addPromptBtn}
              onPress={() => setShowPromptPicker(true)}
            >
              <Text style={styles.addPromptBtnText}>{t('edit_profile.add_prompt_btn', '+ Add prompt')}</Text>
            </Pressable>
          )}
        </View>

        {/* Visibility / Privacy */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('edit_profile.privacy_label')}</Text>
          <View style={styles.privacyItem}>
            <Text style={styles.privacyLabel}>{t('common.lifestyle.zodiac.label')}</Text>
            <Pressable 
              style={[styles.privacyBtn, hideZodiac && styles.privacyBtnActive]} 
              onPress={() => setHideZodiac(!hideZodiac)}
            >
              <Text style={[styles.privacyBtnText, hideZodiac && styles.privacyBtnTextActive]}>
                {hideZodiac ? t('common.lifestyle.privacy.hide', 'Hidden') : t('common.lifestyle.privacy.show', 'Show on my profile')}
              </Text>
            </Pressable>
          </View>
          <View style={styles.privacyItem}>
            <Text style={styles.privacyLabel}>{t('common.lifestyle.height.label')}</Text>
            <Pressable 
              style={[styles.privacyBtn, hideHeight && styles.privacyBtnActive]} 
              onPress={() => setHideHeight(!hideHeight)}
            >
              <Text style={[styles.privacyBtnText, hideHeight && styles.privacyBtnTextActive]}>
                {hideHeight ? t('common.lifestyle.privacy.hide', 'Hidden') : t('common.lifestyle.privacy.show', 'Show on my profile')}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [pressed ? { transform: [{ scale: 0.97 }] } : {}]}
          onPress={handleSave}
          disabled={saving}
        >
          <LinearGradient
            colors={['#FF2D78', '#FF6B35'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveButtonGradient, saving && { opacity: 0.5 }]}
          >
            <Text style={styles.saveButtonText}>
              {saving ? t('edit_profile.saving_btn') : t('edit_profile.save_btn')}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Prompt Picker Modal */}
      <Modal
        visible={showPromptPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPromptPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('onboarding.prompts.picker_title', 'Choose a question')}</Text>
              <Pressable onPress={() => setShowPromptPicker(false)}>
                <Text style={styles.modalClose}>×</Text>
              </Pressable>
            </View>
            <FlatList
              data={allPromptKeys.filter(id => !prompts.some(p => p.id === id))}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.pickerItem}
                  onPress={() => {
                    setPrompts([...prompts, { id: item, answer: '' }]);
                    setShowPromptPicker(false);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.pickerItemText}>{t(`prompts.${item}`)}</Text>
                </Pressable>
              )}
              contentContainerStyle={{ padding: 20 }}
            />
          </View>
        </View>
      </Modal>
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
  cancelButton: {
    color: '#8A8A8A',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveButton: {
    color: '#FF2D78',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'System',
  },
  bioInput: {
    paddingVertical: 16,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#8A8A8A',
    textAlign: 'right',
  },
  tipsSection: {
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  tipBullet: {
    color: '#FF2D78',
    fontSize: 16,
    fontWeight: '600',
  },
  tipText: {
    flex: 1,
    color: '#8A8A8A',
    fontSize: 13,
    lineHeight: 18,
  },
  interestChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  interestChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  editInterestsBtn: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  editInterestsBtnText: {
    color: '#FF2D78',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
  saveButtonGradient: {
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionsGrid: {
    gap: 8,
  },
  option: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: '45%',
  },
  optionActive: {
    borderColor: '#FF2D78',
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
  },
  optionText: {
    color: '#8A8A8A',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  optionTextActive: {
    color: '#FF2D78',
    fontWeight: '700',
  },
  socialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  socialPrefix: {
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '600',
    width: 90,
  },
  promptItem: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  promptQuestion: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  promptInput: {
    borderWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
    minHeight: 60,
  },
  removePromptBtn: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  removePromptText: {
    color: '#FF2D78',
    fontSize: 12,
    fontWeight: '600',
  },
  addPromptBtn: {
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  addPromptBtnText: {
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '600',
  },
  privacyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  privacyLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  privacyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  privacyBtnActive: {
    borderColor: '#FF2D78',
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
  },
  privacyBtnText: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '600',
  },
  privacyBtnTextActive: {
    color: '#FF2D78',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  modalClose: {
    color: '#8A8A8A',
    fontSize: 32,
    fontWeight: '300',
  },
  pickerItem: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  pickerItemText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
