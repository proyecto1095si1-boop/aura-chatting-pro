import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Modal, FlatList, Platform } from 'react-native';
import { router } from 'expo-router';
import { OnboardingLayout } from '@/components/onboarding-layout';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

export default function OnboardingPrompts() {
  const { t } = useTranslation();
  const { updateProfile, user } = useAuth();
  const [prompts, setPrompts] = useState<{id: string, answer: string}[]>(user?.prompts || []);
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const allPromptKeys = Array.from({ length: 30 }, (_, i) => `q${i + 1}`);

  const handleNext = async () => {
    // We allow proceeding even if they didn't answer prompts (consistent with Bio being optional)
    setSaving(true);
    await updateProfile({ prompts });
    setSaving(false);
    router.push('/onboarding/bio' as any);
  };

  const addPrompt = (id: string) => {
    if (prompts.length < 5) {
      setPrompts([...prompts, { id, answer: '' }]);
      setShowPromptPicker(false);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removePrompt = (idx: number) => {
    setPrompts(prompts.filter((_, i) => i !== idx));
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const updateAnswer = (idx: number, text: string) => {
    const newPrompts = [...prompts];
    newPrompts[idx].answer = text;
    setPrompts(newPrompts);
  };

  return (
    <OnboardingLayout
      step={8}
      totalSteps={10}
      title={t('onboarding.prompts.title')}
      subtitle={t('onboarding.prompts.subtitle')}
      onNext={handleNext}
      nextDisabled={saving}
      scrollable
    >
      <View style={styles.container}>
        {prompts.map((p, idx) => (
          <View key={idx} style={styles.promptCard}>
            <View style={styles.promptHeader}>
              <Text style={styles.questionText}>{t(`prompts.${p.id}`)}</Text>
              <Pressable onPress={() => removePrompt(idx)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>×</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('edit_profile.bio_placeholder')}
              placeholderTextColor="#8A8A8A"
              value={p.answer}
              onChangeText={(text) => updateAnswer(idx, text)}
              multiline
              maxLength={200}
            />
            <Text style={styles.charCount}>{p.answer.length}/200</Text>
          </View>
        ))}

        {prompts.length < 5 && (
          <Pressable 
            style={styles.addButton} 
            onPress={() => setShowPromptPicker(true)}
          >
            <Text style={styles.addButtonText}>{t('onboarding.prompts.add_btn')}</Text>
          </Pressable>
        )}

        {prompts.length === 0 && (
          <Text style={styles.skipHint}>
            {t('onboarding.bio.skip_text')}
          </Text>
        )}
      </View>

      <Modal
        visible={showPromptPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPromptPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('onboarding.prompts.picker_title')}</Text>
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
                  onPress={() => addPrompt(item)}
                >
                  <Text style={styles.pickerItemText}>{t(`prompts.${item}`)}</Text>
                </Pressable>
              )}
              contentContainerStyle={{ padding: 20 }}
            />
          </View>
        </View>
      </Modal>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 20,
  },
  promptCard: {
    backgroundColor: '#161616',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    padding: 16,
    gap: 12,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 20,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 15,
    padding: 0,
    minHeight: 40,
  },
  charCount: {
    color: '#8A8A8A',
    fontSize: 11,
    textAlign: 'right',
  },
  addButton: {
    borderWidth: 2,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#8A8A8A',
    fontSize: 16,
    fontWeight: '600',
  },
  skipHint: {
    color: '#8A8A8A',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '75%',
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
