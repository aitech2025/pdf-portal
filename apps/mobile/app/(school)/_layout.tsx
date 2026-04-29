import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Redirect } from 'expo-router';

export default function SchoolLayout() {
    const { user } = useAuth();
    const schoolRoles = ['school_admin', 'school_viewer', 'teacher', 'school'];
    if (!user || !schoolRoles.includes(user.role)) return <Redirect href="/(auth)/login" />;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#4f46e5',
                tabBarInactiveTintColor: '#6b7280',
                tabBarStyle: { borderTopColor: '#e5e7eb' },
                headerShown: false,
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
                name="portal"
                options={{
                    title: 'Library',
                    tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="requests"
                options={{
                    title: 'Requests',
                    tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
                }}
            />
            {/* Hidden screens */}
            <Tabs.Screen name="notifications" options={{ href: null, title: 'Notifications' }} />
        </Tabs>
    );
}
