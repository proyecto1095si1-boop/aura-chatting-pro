import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Text, StyleSheet } from 'react-native';

const ADMIN_EMAIL = 'admin@aura-app.com';

function TabIcon({ focused, icon }: { focused: boolean; icon: string; }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, focused && styles.iconActive]}>{icon}</Text>
    </View>
  );
}

export default function AdminLayout() {
  const { user, status } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;

  if (status === 'loading') return null;

  // Strict Auth Guard
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#161616', borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
        headerTitleStyle: { color: '#ffffff', fontWeight: 'bold' },
        headerTintColor: '#8A2BE2',
        sceneStyle: { backgroundColor: '#0A0A0A' },
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: '#0A0A0A',
          borderTopColor: '#2A2A2A',
          borderTopWidth: 1,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#8A2BE2',
        tabBarInactiveTintColor: '#8A8A8A',
        tabBarLabelStyle: { fontSize: 10, marginTop: 4, fontWeight: '600' }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="📊" />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="👥" />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="⚠️" />,
        }}
      />
      <Tabs.Screen
        name="verifications"
        options={{
          title: 'Verificar',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🛡️" />,
        }}
      />
      <Tabs.Screen
        name="stories"
        options={{
          title: 'Historias',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🎬" />,
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          title: 'Ingresos',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="💰" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Sistema',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="⚙️" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
    opacity: 0.4,
  },
  iconActive: {
    opacity: 1,
  },
});
