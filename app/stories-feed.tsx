import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { ScreenContainer } from '@/components/screen-container';
import { StoriesCarousel, StoryGroup } from '@/components/stories/stories-carousel';
import { StoryViewer } from '@/components/stories/story-viewer';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

export default function StoriesFeedScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<StoryGroup | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [matchedUserIds, setMatchedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch matches to filter stories
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'matches'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const ids = new Set<string>();
      snap.docs.forEach(doc => {
        const data = doc.data();
        const participants = data.participants as string[];
        participants.forEach(p => {
          if (p !== user.uid) ids.add(p);
        });
      });
      setMatchedUserIds(Array.from(ids));
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // 2. Fetch and filter stories
  useEffect(() => {
    if (!user?.uid) {
        setLoading(false);
        return;
    }

    const q = query(
      collection(db, 'stories'),
      where('active', '==', true),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const groupsMap: Record<string, StoryGroup> = {};
      
      snap.docs.forEach(d => {
        const data = d.data();
        const groupId = data.teamId || data.userId;
        
        const isMatch = matchedUserIds.includes(data.userId);
        const isMe = data.userId === user.uid;
        
        if (!isMe && !isMatch) return;

        if (!groupsMap[groupId]) {
          groupsMap[groupId] = {
            id: groupId,
            name: data.teamId ? 'Pareja' : data.userName,
            avatar: data.userPhoto,
            isTeam: !!data.teamId,
            hasUnseen: false, 
            items: []
          };
        }
        
        const isSeen = data.views?.includes(user?.uid);
        if (!isSeen) {
          groupsMap[groupId].hasUnseen = true;
        }

        groupsMap[groupId].items.push({
          id: d.id,
          userId: data.userId,
          userName: data.userName,
          userPhoto: data.userPhoto,
          mediaUrl: data.mediaUrl,
          createdAt: data.createdAt,
          likes: data.likes || [],
          views: data.views || []
        });
      });
      
      const groups = Object.values(groupsMap).sort((a, b) => {
        const latestA = Math.max(...a.items.map(i => i.createdAt?.toMillis?.() || 0));
        const latestB = Math.max(...b.items.map(i => i.createdAt?.toMillis?.() || 0));
        return latestB - latestA;
      });
      
      setStoryGroups(groups);
      setLoading(false);
    }, (error) => {
      console.error("Stories error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, matchedUserIds]);

  return (
    <ScreenContainer edges={['top', 'left', 'right']} containerClassName="bg-background">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FF2D78" />
        </Pressable>
        <Text style={styles.title}>{t('stories.title', 'Stories')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <LinearGradient
            colors={['rgba(255, 45, 120, 0.1)', 'rgba(255, 107, 53, 0.05)']}
            style={styles.infoGradient}
          >
            <Text style={styles.infoText}>
              {t('stories.empty_message', 'Here you will see 24h updates...')}
            </Text>
          </LinearGradient>
        </View>

        <StoriesCarousel 
          stories={storyGroups} 
          user={user} 
          onAddStory={() => router.push('/stories/create' as any)} 
          onPressStory={(group) => {
            setSelectedStoryGroup(group);
            setViewerVisible(true);
          }}
        />

        {storyGroups.length <= 1 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyTitle}>{t('stories.no_new', 'No new stories')}</Text>
            <Text style={styles.emptySub}>
              {t('stories.no_new_sub', 'When your matches upload stories, they will appear here.')}
            </Text>
          </View>
        )}
      </ScrollView>

      <StoryViewer 
        visible={viewerVisible} 
        group={selectedStoryGroup} 
        user={user}
        onClose={() => setViewerVisible(false)} 
      />
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
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  content: {
    paddingBottom: 40,
  },
  infoBox: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoGradient: {
    padding: 16,
  },
  infoText: {
    color: '#8A8A8A',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  }
});
