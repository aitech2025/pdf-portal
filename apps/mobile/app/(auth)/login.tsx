import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginScreen() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password.');
            return;
        }
        setLoading(true);
        try {
            const user = await login(email.trim(), password);
            const platformRoles = ['platform_admin', 'admin', 'moderator', 'platform_viewer'];
            if (platformRoles.includes(user.role)) {
                router.replace('/(admin)');
            } else {
                router.replace('/(school)');
            }
        } catch (err: any) {
            Alert.alert('Login Failed', err.message || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-background"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View className="flex-1 justify-center px-6">
                {/* Logo */}
                <View className="items-center mb-10">
                    <View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center mb-4">
                        <Text className="text-white text-2xl font-bold">E</Text>
                    </View>
                    <Text className="text-3xl font-bold text-foreground">EduPortal</Text>
                    <Text className="text-muted mt-1 text-base">Sign in to your account</Text>
                </View>

                {/* Form */}
                <View className="space-y-4">
                    <View>
                        <Text className="text-sm font-medium text-foreground mb-1.5">Email Address</Text>
                        <TextInput
                            className="bg-card border border-border rounded-xl px-4 py-3.5 text-foreground text-base"
                            placeholder="you@example.com"
                            placeholderTextColor="#9ca3af"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View>
                        <Text className="text-sm font-medium text-foreground mb-1.5">Password</Text>
                        <View className="flex-row items-center bg-card border border-border rounded-xl px-4">
                            <TextInput
                                className="flex-1 py-3.5 text-foreground text-base"
                                placeholder="Enter password"
                                placeholderTextColor="#9ca3af"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPwd}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowPwd(!showPwd)} className="p-1">
                                <Text className="text-muted text-sm">{showPwd ? 'Hide' : 'Show'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        className={`mt-2 rounded-xl py-4 items-center ${loading ? 'bg-primary/60' : 'bg-primary'}`}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text className="text-white font-semibold text-base">Sign In</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
