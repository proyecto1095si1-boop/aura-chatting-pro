import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { Image } from 'expo-image';
import { MOCK_PROFILES } from '@/lib/mock-data';
import { useTranslation } from 'react-i18next';

interface DiscoverMode {
  type: 'trending' | 'nearby' | 'new' | 'verified';
  label: string;
  icon: string;
}

const DISCOVER_MODES: DiscoverMode[] = [
  { type: 'trending', label: 'Trending', icon: '🔥' },
  { type: 'nearby', label: 'Cerca de ti', icon: '📍' },
  { type: 'new', label: 'Nuevos', icon: '⭐' },
  { type: 'verified', label: 'Verificados', icon: '✓' },
];

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const [selectedMode, setSelectedMode] = useState<DiscoverMode['type']>('trending');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProfiles = MOCK_PROFILES.filter(profile => {
    // Hidden profiles (and Admins) are filtered out globally
    if (profile.role === 'admin' || (profile as any).isHidden) return false;

    const matchesSearch = profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.interests.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()));
    
    switch (selectedMode) {
      case 'verified':
        return matchesSearch && profile.verified;
      case 'nearby':
        return matchesSearch && profile.distance < 10;
      case 'new':
        return matchesSearch;
      case 'trending':
      default:
        return matchesSearch;
    }
  });

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('discover.title', 'Discover')}</Text>
          <Pressable onPress={() => router.push('/filters' as any)}>
            <Text style={styles.filterIcon}>⚙️</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInput}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchField}
              placeholder={t('discover.search_placeholder', 'Search by name or interest...')}
              placeholderTextColor="#8A8A8A"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Discover modes */}
        <View style={styles.modesContainer}>
          {DISCOVER_MODES.map(mode => (
            <Pressable
              key={mode.type}
              style={[
                styles.modeButton,
                selectedMode === mode.type && styles.modeButtonActive,
              ]}
              onPress={() => setSelectedMode(mode.type)}
            >
              <Text style={styles.modeIcon}>{mode.icon}</Text>
              <Text
                style={[
                  styles.modeLabel,
                  selectedMode === mode.type && styles.modeLabelActive,
                ]}
              >
                {mode.type === 'trending' ? 'Trending' : 
                 mode.type === 'nearby' ? t('discover.filter_nearby', 'Nearby') : 
                 mode.type === 'new' ? t('discover.filter_new', 'New') : 
                 mode.type === 'verified' ? t('discover.filter_verified', 'Verified') : mode.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Results grid */}
        <View style={styles.gridContainer}>
          {filteredProfiles.length > 0 ? (
            filteredProfiles.map(profile => (
              <Pressable
                key={profile.uid}
                style={styles.profileCard}
                onPress={() => router.push(`/profile/${profile.uid}` as any)}
              >
                <Image
                  source={{ uri: profile.photos[0] }}
                  style={styles.profileImage}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.9)']}
                  style={styles.cardGradient}
                />
                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.profileName}>
                      {profile.name}, {profile.age}
                    </Text>
                    {profile.verified && (
                      <Text style={styles.verifiedIcon}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.distance}>📍 {profile.distance} km</Text>
                  <View style={styles.interestPreview}>
                    {profile.interests.slice(0, 2).map(interest => (
                      <Text key={interest} style={styles.interestTag}>
                        {interest}
                      </Text>
                    ))}
                    {profile.interests.length > 2 && (
                      <Text style={styles.interestMore}>+{profile.interests.length - 2}</Text>
                    )}
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔍</Text>
              <Text style={styles.emptyStateText}>{t('discover.empty_state_text', 'No profiles found')}</Text>
              <Text style={styles.emptyStateSubtext}>{t('discover.empty_state_subtext', 'Try different filters')}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  filterIcon: {
    fontSize: 24,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchField: {
    flex: 1,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  modesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modeButtonActive: {
    borderColor: '#FF2D78',
    backgroundColor: 'rgba(255, 45, 120, 0.1)',
  },
  modeIcon: {
    fontSize: 16,
  },
  modeLabel: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '600',
  },
  modeLabelActive: {
    color: '#FF2D78',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  profileCard: {
    width: '48%',
    aspectRatio: 0.8,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  profileImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedIcon: {
    color: '#4FC3F7',
    fontSize: 12,
  },
  distance: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  interestPreview: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: '#FFFFFF',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  interestMore: {
    color: '#8A8A8A',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateIcon: {
    fontSize: 48,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    color: '#8A8A8A',
    fontSize: 14,
  },
});
