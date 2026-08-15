import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '@/lib/auth-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface StoryGroup {
  id: string; // userId or teamId
  name: string;
  avatar: string;
  isTeam: boolean;
  hasUnseen: boolean;
  items: StoryItem[];
}

export interface StoryItem {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  mediaUrl: string;
  createdAt: any;
  likes?: string[];
  views?: string[];
}

interface StoriesCarouselProps {
  stories: StoryGroup[];
  onPressStory: (group: StoryGroup) => void;
  onAddStory: () => void;
  user: UserProfile | null;
}

export const StoriesCarousel = React.memo(({ stories, onPressStory, onAddStory, user }: StoriesCarouselProps) => {
  const isMeTeam = user?.doubleDate?.status === 'linked';
  const myGroupId = isMeTeam ? [user!.uid, user?.doubleDate?.partnerId].sort().join('_') : user?.uid;
  
  const myStoryGroup = stories.find(s => s.id === myGroupId);
  const otherStories = stories.filter(s => s.id !== myGroupId);

  const renderItem = ({ item }: { item: StoryGroup }) => (
    <Pressable style={styles.storyItem} onPress={() => onPressStory(item)}>
      <View style={[styles.avatarContainer, item.hasUnseen && styles.unseenBorder]}>
        <LinearGradient
          colors={item.hasUnseen ? ['#FF2D78', '#FF6B35'] : ['transparent', 'transparent']}
          style={styles.gradientBorder}
        >
          <View style={styles.whiteInner}>
            <Image
              source={{ uri: item.avatar || 'https://via.placeholder.com/100' }}
              style={styles.avatar}
              contentFit="cover"
            />
          </View>
        </LinearGradient>
        {item.isTeam && (
          <View style={styles.teamBadge}>
            <Text style={{ fontSize: 8 }}>👥</Text>
          </View>
        )}
      </View>
      <Text style={styles.storyName} numberOfLines={1}>{item.name}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={otherStories}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Pressable 
            style={styles.storyItem} 
            onPress={() => myStoryGroup ? onPressStory(myStoryGroup) : onAddStory()}
          >
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={myStoryGroup?.hasUnseen ? ['#FF2D78', '#FF6B35'] : ['transparent', 'transparent']}
                style={styles.gradientBorder}
              >
                <View style={styles.whiteInner}>
                  <Image
                    source={{ uri: user?.photos?.[0] || 'https://via.placeholder.com/100' }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                  {!myStoryGroup && (
                    <View style={styles.addIconContainer}>
                      <Ionicons name="add" size={14} color="#FFF" />
                    </View>
                  )}
                </View>
              </LinearGradient>
            </View>
            <Text style={styles.storyName}>{user?.name || 'Mi historia'}</Text>
          </Pressable>
        }
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
});


const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    backgroundColor: '#0A0A0A',
  },
  listContent: {
    paddingHorizontal: 15,
    gap: 15,
  },
  storyItem: {
    alignItems: 'center',
    width: 75,
    marginRight: 10,
  },
  avatarContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gradientBorder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2.5,
  },
  whiteInner: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: '#0A0A0A',
    padding: 2,
  },
  avatar: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: '#1A1A1A',
  },
  unseenBorder: {
    // El gradiente ya maneja esto
  },
  myAvatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#333',
    position: 'relative',
    padding: 2,
  },
  addIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF2D78',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A0A0A',
  },
  storyName: {
    color: '#8A8A8A',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  teamBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
