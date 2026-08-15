import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Platform,
  Linking
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/screen-container';
import { Ionicons } from '@expo/vector-icons';

interface LicenseItem {
  name: string;
  vendor: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export default function LicensesScreen() {
  const { t } = useTranslation();

  const techStack: LicenseItem[] = [
    { name: 'React Native', vendor: 'Meta Platforms, Inc.', icon: 'logo-react', color: '#61DAFB' },
    { name: 'Expo Framework', vendor: '650 Industries, Inc.', icon: 'rocket-outline', color: '#FFFFFF' },
    { name: 'Firebase Services', vendor: 'Google LLC', icon: 'logo-firebase', color: '#FFCA28' },
    { name: 'Supabase DB', vendor: 'Supabase Inc.', icon: 'database-outline', color: '#3ECF8E' },
    { name: 'Native Animations', vendor: 'Software Mansion', icon: 'flash-outline', color: '#FF2D78' },
    { name: 'Vector Icons', vendor: 'Expo & Community', icon: 'star-outline', color: '#4FC3F7' },
  ];

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('legal.licenses.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          
          <Animated.View entering={FadeInUp.duration(800)} style={styles.heroSection}>
            <LinearGradient
              colors={['#1A1A1A', '#0A0A0A']}
              style={styles.heroCard}
            >
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#FF2D78', '#FF6B35']}
                  style={styles.logoGradient}
                >
                  <Text style={styles.logoText}>A</Text>
                </LinearGradient>
              </View>
              <Text style={styles.appName}>AURA</Text>
              <Text style={styles.version}>Version 1.2.7 (Fase Beta)</Text>
              <View style={styles.statusBadge}>
                 <Text style={styles.statusText}>SOFTWARE PRIVATIVO • CÓDIGO CERRADO</Text>
              </View>
              <View style={styles.divider} />
              <Text style={styles.copyrightText}>© 2026 Aura Dating App Inc.</Text>
              <Text style={styles.rightsText}>Todos los derechos reservados.</Text>
              <Text style={styles.devText}>Desarrollado con pasión por Red Pixel Games.</Text>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(800)}>
            <Text style={styles.sectionTitle}>CRÉDITOS Y TECNOLOGÍA</Text>
            <Text style={styles.sectionIntro}>
              Aunque el núcleo de Aura es propiedad privada, nuestra plataforma utiliza componentes de software de código abierto excelentes que nos permiten ofrecerte la mejor experiencia:
            </Text>

            <View style={styles.stackGrid}>
              {techStack.map((item, index) => (
                <View key={index} style={styles.stackItem}>
                  <View style={[styles.iconBox, { backgroundColor: `${item.color}15`, borderColor: `${item.color}30` }]}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemVendor}>{item.vendor}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.footerInfo}>
             <View style={styles.disclaimerBox}>
                <Ionicons name="information-circle-outline" size={20} color="#666" />
                <Text style={styles.disclaimerText}>
                   Aura se encuentra actualmente en fase de desarrollo activo (Beta). Algunas funciones pueden estar sujetas a cambios. Todas las marcas comerciales, logotipos y nombres de marcas mencionados son propiedad de sus respectivos dueños.
                </Text>
             </View>
             
             <Pressable 
              onPress={() => Linking.openURL('https://aurachating.vercel.app/licenses')}
              style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}
             >
                <Text style={styles.linkBtnText}>Ver licencias detalladas (Resumen legal)</Text>
                <Ionicons name="open-outline" size={14} color="#FF2D78" />
             </Pressable>
          </Animated.View>

        </View>
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
  heroSection: {
    marginBottom: 40,
  },
  heroCard: {
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  logoText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 4,
    marginBottom: 4,
  },
  version: {
    fontSize: 12,
    color: '#FF2D78',
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  statusText: {
    color: '#AAA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: '#333',
    marginBottom: 20,
  },
  copyrightText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  rightsText: {
    fontSize: 12,
    color: '#8A8A8A',
    marginBottom: 12,
  },
  devText: {
    fontSize: 13,
    color: '#FF2D78',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  sectionIntro: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 24,
  },
  stackGrid: {
    gap: 12,
  },
  stackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222',
    gap: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  itemVendor: {
    fontSize: 12,
    color: '#8A8A8A',
  },
  footerInfo: {
    marginTop: 40,
    alignItems: 'center',
    gap: 20,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    gap: 12,
    alignItems: 'flex-start',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  linkBtnText: {
    color: '#FF2D78',
    fontSize: 13,
    fontWeight: '600',
  }
});
