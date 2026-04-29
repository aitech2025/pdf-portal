import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Redirect } from 'expo-router';

export default function AdminLayout() {
    const { user } = useAuth();
    const platformRoles = ['platform_admin', 'admin', 'moderator', 'platform_viewer'];
    if (!user || !platformRoles.includes(user.role)) return <Redirect href="/(auth)/login" />;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#4f46e5',
                tabBarInactiveTintColor: '#6b7280',
                tabBarStyle: { borderTopColor: '#e5e7eb' },
                headerStyle: { backgroundColor: '#ffffff' },
                headerTintColor: '#111827',
                headerTitleStyle: { fontWeight: '700' },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="schools"
                options={{
                    title: 'Schools',
                    tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: 'Users',
                    tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="pdfs"
                options={{
                    title: 'Content',
                    tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
