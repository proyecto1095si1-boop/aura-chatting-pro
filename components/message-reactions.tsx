import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';

interface MessageReactionsProps {
  reactions: Record<string, string[]>; // emoji: [userId1, userId2...]
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
  isMe: boolean;
}

export function MessageReactions({ reactions, currentUserId, onToggleReaction, isMe }: MessageReactionsProps) {
  const formattedReactions = useMemo(() => {
    return Object.entries(reactions)
      .filter(([_, userIds]) => userIds.length > 0)
      .map(([emoji, userIds]) => ({
        emoji,
        count: userIds.length,
        hasReacted: userIds.includes(currentUserId),
        userIds,
      }));
  }, [reactions, currentUserId]);

  if (formattedReactions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, isMe ? styles.containerMe : styles.containerOther]}>
      <View style={styles.reactionsRow}>
        {formattedReactions.map((reaction) => (
          <Animated.View 
            key={reaction.emoji} 
            entering={ZoomIn.duration(300)}
            exiting={ZoomOut.duration(200)}
          >
            <Pressable
              style={[
                styles.reactionBadge,
                reaction.hasReacted && styles.reactionBadgeActive
              ]}
              onPress={() => onToggleReaction(reaction.emoji)}
            >
              <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
              {reaction.count > 1 && (
                <Text style={[styles.reactionCount, reaction.hasReacted && styles.reactionCountActive]}>
                  {reaction.count}
                </Text>
              )}
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    minHeight: 24,
  },
  containerMe: {
    alignItems: 'flex-end',
  },
  containerOther: {
    alignItems: 'flex-start',
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 4,
  },
  reactionBadgeActive: {
    backgroundColor: 'rgba(255, 45, 120, 0.15)',
    borderColor: '#FF2D78',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: 'bold',
  },
  reactionCountActive: {
    color: '#FF2D78',
  },
});
