import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  Pressable,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  interpolate, 
  Extrapolation,
  runOnJS 
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Team } from '@/lib/mock-data';
import { getSafeSource } from '@/lib/image-utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.92;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;

interface DoubleProfileCardProps {
  team: Team;
  isTop: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  onOpenDetail: (team: Team) => void;
}

const DoubleProfileCard = React.memo(({ 
  team, 
  isTop, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp,
  onOpenDetail
}: DoubleProfileCardProps) => {
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [overlayType, setOverlayType] = useState<'like' | 'dislike' | 'superlike' | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .minDistance(10)
    .runOnJS(true)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      if (event.translationY < -80) {
        setOverlayType('superlike');
        setOverlayOpacity(Math.min(1, Math.abs(event.translationY) / 150));
      } else if (event.translationX > 40) {
        setOverlayType('like');
        setOverlayOpacity(Math.min(1, event.translationX / SWIPE_THRESHOLD));
      } else if (event.translationX < -40) {
        setOverlayType('dislike');
        setOverlayOpacity(Math.min(1, Math.abs(event.translationX) / SWIPE_THRESHOLD));
      } else {
        setOverlayType(null);
        setOverlayOpacity(0);
      }
    })
    .onEnd((event) => {
      if (event.translationY < -120 && Math.abs(event.translationX) < 80) {
        translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 300 }, () => {
          runOnJS(onSwipeUp)();
        });
      } else if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(onSwipeRight)();
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(onSwipeLeft)();
        });
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        runOnJS(setOverlayType)(null);
        runOnJS(setOverlayOpacity)(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (!isTop) return { transform: [{ scale: 0.95 }, { translateY: 10 }], opacity: 0.8 };
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-10, 0, 10],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const InfoContainer = Platform.OS === 'ios' ? BlurView : View;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* Diagonal Split Photos */}
        <View style={styles.diagonalSplit}>
           <View style={styles.user1Container}>
              <Image 
                source={getSafeSource(team.user1.photos[0])} 
                style={styles.fullPhoto} 
                contentFit="cover" 
              />
           </View>
           <View style={styles.diagonalClipper}>
              <Image 
                source={getSafeSource(team.user2.photos[0])} 
                style={styles.fullPhoto} 
                contentFit="cover" 
              />
           </View>
        </View>

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.95)']}
          style={styles.cardGradient}
        />

        {/* Swipe Overlays */}
        {isTop && overlayType && (
          <View style={[styles.overlay, { opacity: overlayOpacity }]}>
            <View style={[
              styles.overlayBadge, 
              overlayType === 'like' && styles.likeBadge,
              overlayType === 'dislike' && styles.dislikeBadge,
              overlayType === 'superlike' && styles.superBadge,
            ]}>
              <Text style={styles.overlayText}>{overlayType.toUpperCase()}</Text>
            </View>
          </View>
        )}

        {/* Team Info */}
        {isTop && (
          <Pressable 
            style={styles.cardInfo} 
            onPress={() => onOpenDetail(team)}
          >
            <InfoContainer 
              intensity={80} 
              tint="dark" 
              style={[styles.glassInfo, Platform.OS !== 'ios' && { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            >
              <View style={styles.nameRow}>
                <Text style={styles.teamNames}>
                  {team.user1.name} & {team.user2.name}
                </Text>
                <View style={styles.doubleBadge}>
                  <Text style={styles.doubleBadgeText}>👥</Text>
                </View>
              </View>
              
              <Text style={styles.teamAges}>
                {team.user1.age} y {team.user2.age} años
              </Text>

              <View style={styles.distanceRow}>
                <Text style={styles.distanceText}>
                  {team.isInternational ? '🌍 MUNDI' : `📍 ${team.distance} ${team.distanceUnit || 'km'}`}
                </Text>
              </View>

              <View style={styles.interestsRow}>
                 {Array.from(new Set([...team.user1.interests, ...team.user2.interests])).slice(0, 4).map(interest => (
                   <View key={interest} style={styles.interestChip}>
                      <Text style={styles.interestText}>{t(`common.interests.${interest}`)}</Text>
                   </View>
                 ))}
              </View>
            </InfoContainer>
          </Pressable>
        )}
      </Animated.View>
    </GestureDetector>
  );
});

export default DoubleProfileCard;


const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: '#1E1E1E',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    position: 'absolute',
  },
  cardBehind: {
    transform: [{ scale: 0.95 }, { translateY: 10 }],
    opacity: 0.8,
  },
  diagonalSplit: {
    flex: 1,
    position: 'relative',
  },
  user1Container: {
    ...StyleSheet.absoluteFillObject,
  },
  diagonalClipper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    // We simulate diagonal split with a transform or mask if possible, 
    // but for simple React Native we can use a View with specific width/height and overflow
    // or just use two images side by side if diagonal is too hard without SVG.
    // Let's use a diagonal clip simulation:
    left: '50%',
    width: '100%',
    height: '150%',
    top: '-25%',
    transform: [{ rotate: '15deg' }],
    overflow: 'hidden',
  },
  fullPhoto: {
    width: '100%',
    height: '100%',
    // If inside clipper, we need to counter-rotate the image
  },
  // Re-adjusting for a simpler but elegant look if diagonal is too messy:
  // Let's use top/bottom split for better stability
  splitPhoto: {
    flex: 1,
    width: '100%',
  },
  diagonalDivider: {
    height: 2,
    backgroundColor: '#FFF',
    width: '120%',
    transform: [{ rotate: '-15deg' }],
    position: 'absolute',
    top: '50%',
    left: '-10%',
    zIndex: 5,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  glassInfo: {
    padding: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  teamNames: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  teamAges: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  doubleBadge: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    padding: 4,
    borderRadius: 8,
  },
  doubleBadgeText: {
    fontSize: 16,
  },
  distanceRow: {
    marginBottom: 12,
  },
  distanceText: {
    color: '#FF2D78',
    fontSize: 12,
    fontWeight: '700',
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  interestText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayBadge: {
    borderWidth: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    transform: [{ rotate: '-15deg' }],
  },
  overlayText: {
    fontSize: 40,
    fontWeight: '900',
  },
  likeBadge: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  dislikeBadge: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  superBadge: {
    borderColor: '#2196F3',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  }
});
