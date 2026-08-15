import { Tabs, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/lib/notification-context';
import { useTranslation } from 'react-i18next';

function TabIcon({ focused, icon, label, badge }: { focused: boolean; icon: string; label: string; badge?: boolean }) {
  return (
    <View style={tabStyles.iconContainer}>
      {focused ? (
        <LinearGradient
          colors={['#FF2D78', '#FF6B35'] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tabStyles.activeIconBg}
        >
          <Text style={tabStyles.activeIcon}>{icon}</Text>
        </LinearGradient>
      ) : (
        <Text style={tabStyles.inactiveIcon}>{icon}</Text>
      )}
      {badge && (
        <View style={tabStyles.badge}>
          <View style={tabStyles.badgeDot} />
        </View>
      )}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  activeIconBg: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIcon: {
    fontSize: 20,
  },
  inactiveIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#0A0A0A',
    borderRadius: 7,
    padding: 2,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF2D78',
    borderWidth: 1.5,
    borderColor: '#0A0A0A',
    shadowColor: '#FF2D78',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});

export default function TabLayout() {
  const { status } = useAuth();
  const { unreadCount } = useNotifications();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;

  // Strict route protection
  if (status === 'onboarding') {
    return <Redirect href="/onboarding/name" />;
  }
  
  if (status === 'unauthenticated') {
    return <Redirect href="/auth/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: '#0A0A0A',
          borderTopColor: '#1E1E1E',
          borderTopWidth: 1,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#FF2D78',
        tabBarInactiveTintColor: '#8A8A8A',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.discover'),
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🔥" label={t('tabs.discover')} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: t('tabs.matches'),
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              icon="💬" 
              label={t('tabs.matches')} 
              badge={unreadCount > 0} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="👤" label={t('tabs.profile')} />,
        }}
      />
    </Tabs>
  );
}
