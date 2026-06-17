import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { Redirect } from 'expo-router';

export default function SchoolLayout() {
    const { user, canWrite } = useAuth();
    const schoolRoles = ['school_admin', 'school_viewer', 'teacher', 'school'];
    if (!user || !schoolRoles.includes(user.role)) return <Redirect href="/(auth)/login" />;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#5b5ff1',
                tabBarInactiveTintColor: '#6b7280',
                tabBarStyle: { borderTopColor: '#e5e7eb' },
                headerShown: false,
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
            <Tabs.Screen name="portal" options={{ title: 'Library', tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} /> }} />
            <Tabs.Screen name="videos" options={{ title: 'Videos', tabBarIcon: ({ color, size }) => <Ionicons name="play-circle-outline" size={size} color={color} /> }} />
            <Tabs.Screen name="bookmarks" options={{ title: 'Bookmarks', tabBarIcon: ({ color, size }) => <Ionicons name="bookmark-outline" size={size} color={color} /> }} />
            <Tabs.Screen
                name="requests"
                options={{
                    href: canWrite ? undefined : null,
                    title: 'Requests',
                    tabBarIcon: ({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color} />
                }}
            />
            <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }} />
            {/* Hidden screens */}
            <Tabs.Screen name="analytics" options={{ href: null, title: 'Analytics' }} />
            <Tabs.Screen name="notifications" options={{ href: null, title: 'Notifications' }} />
            <Tabs.Screen name="settings" options={{ href: null, title: 'Settings' }} />
        </Tabs>
    );
}
