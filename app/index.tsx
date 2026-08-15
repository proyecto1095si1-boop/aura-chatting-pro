import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FF2D78" size="large" />
      </View>
    );
  }

  if (status === 'authenticated') {
    // Priority redirect for admin
    if (user?.role === 'admin' || user?.email?.toLowerCase() === 'admin@aura-app.com') {
      return <Redirect href="/(admin)" />;
    }
    return <Redirect href="/(tabs)" />;
  }

  if (status === 'onboarding') {
    return <Redirect href={'/onboarding/name' as any} />;
  }

  return <Redirect href={'/auth/welcome' as any} />;
}
