import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    if (!user) return <Redirect href="/(auth)/login" />;

    const platformRoles = ['platform_admin', 'admin', 'moderator', 'platform_viewer'];
    if (platformRoles.includes(user.role)) return <Redirect href="/(admin)" />;

    return <Redirect href="/(school)" />;
}
