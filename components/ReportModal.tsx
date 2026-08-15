import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, Modal, 
  Pressable, TextInput, ScrollView, 
  KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName: string;
  reporterId: string;
}

const REPORT_REASONS = [
  'harassment',
  'spam',
  'fake_profile',
  'inappropriate_content',
  'underage',
  'other'
];

export function ReportModal({ visible, onClose, reportedUserId, reportedUserName, reporterId }: ReportModalProps) {
  const { t } = useTranslation();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert(t('common.error'), t('report.select_reason_error', 'Selecciona un motivo para continuar'));
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'reports'), {
        reportedUserId,
        reportedUserName,
        reporterId,
        reason: selectedReason,
        description: description.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        t('report.success_title', 'Reporte Enviado'),
        t('report.success_desc', 'Gracias por ayudarnos a mantener la comunidad segura. Revisaremos este perfil pronto.'),
        [{ text: 'OK', onPress: onClose }]
      );
      
      setSelectedReason(null);
      setDescription('');
    } catch (error) {
      console.error("Report error:", error);
      Alert.alert(t('common.error'), t('report.submit_error', 'No se pudo enviar el reporte en este momento.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalView}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('report.title', 'Reportar a')} {reportedUserName}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.form}>
            <Text style={styles.label}>{t('report.reason_label', '¿Cuál es el motivo?')}</Text>
            <View style={styles.reasonsGrid}>
              {REPORT_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  style={[
                    styles.reasonBtn,
                    selectedReason === reason && styles.reasonBtnActive
                  ]}
                >
                  <Text style={[
                    styles.reasonText,
                    selectedReason === reason && styles.reasonTextActive
                  ]}>
                    {t(`report.reasons.${reason}`, { defaultValue: reason.replace('_', ' ') })}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{t('report.description_label', 'Más detalles (opcional)')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('report.description_placeholder', 'Describe lo sucedido...')}
              placeholderTextColor="#8A8A8A"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            >
              <Text style={styles.submitBtnText}>
                {loading ? t('common.sending') : t('report.submit_btn', 'Enviar Reporte')}
              </Text>
            </Pressable>
            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#121212',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#161616',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: '#8A8A8A',
    fontSize: 14,
  },
  form: {
    padding: 24,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  reasonBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 32,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  reasonBtnActive: {
    backgroundColor: '#FF2D78',
    borderColor: '#FF2D78',
  },
  reasonText: {
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  reasonTextActive: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: '#FF2D78',
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
