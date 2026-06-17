import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator,
    Image, ScrollView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';

const BRAND = '#5b5ff1';

export default function LoginScreen() {
    const { login } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            setError('Please enter your email and password.');
            return;
        }
        setError('');
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
            setError(err.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#f9fafb' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="light-content" backgroundColor={BRAND} />

            {/* Brand header */}
            <View style={{
                backgroundColor: BRAND,
                paddingTop: insets.top + 28,
                paddingBottom: 36,
                paddingHorizontal: 24,
                alignItems: 'center',
            }}>
                <View style={{
                    backgroundColor: 'white',
                    borderRadius: 18,
                    paddingHorizontal: 22,
                    paddingVertical: 14,
                    shadowColor: '#000',
                    shadowOpacity: 0.15,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 8,
                }}>
                    <Image
                        source={require('../../assets/logo-mark.png')}
                        style={{ width: 168, height: 52, resizeMode: 'contain' }}
                    />
                </View>
                <Text style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 13,
                    marginTop: 18,
                    textAlign: 'center',
                    lineHeight: 19,
                    maxWidth: 280,
                }}>
                    A trusted pioneer in IIT Foundation &amp; JEE preparation
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
                        Welcome back
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 28 }}>
                        Sign in to your i-iCON Academy portal
                    </Text>

                    {error ? (
                        <View style={{
                            backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
                            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                            marginBottom: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                        }}>
                            <Ionicons name="alert-circle" size={16} color="#ef4444" style={{ marginTop: 1 }} />
                            <Text style={{ color: '#dc2626', fontSize: 13, flex: 1, lineHeight: 18 }}>{error}</Text>
                        </View>
                    ) : null}

                    {/* Email */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
                            Email or Mobile Number
                        </Text>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb',
                            borderRadius: 12, paddingHorizontal: 14,
                        }}>
                            <Ionicons name="mail-outline" size={18} color="#9ca3af" />
                            <TextInput
                                style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 15, color: '#111827' }}
                                placeholder="name@iiconacademy.in"
                                placeholderTextColor="#9ca3af"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 6 }}>
                            Password
                        </Text>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb',
                            borderRadius: 12, paddingHorizontal: 14,
                        }}>
                            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
                            <TextInput
                                style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 15, color: '#111827' }}
                                placeholder="••••••••"
                                placeholderTextColor="#9ca3af"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPwd}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ padding: 4 }}>
                                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Forgot password */}
                    <TouchableOpacity
                        style={{ alignSelf: 'flex-end', marginBottom: 24, paddingVertical: 4 }}
                        onPress={() => router.push('/(auth)/forgot-password')}
                    >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: BRAND }}>Forgot password?</Text>
                    </TouchableOpacity>

                    {/* Sign in button */}
                    <TouchableOpacity
                        style={{
                            backgroundColor: loading ? '#8b8ef5' : BRAND,
                            borderRadius: 14, paddingVertical: 16,
                            alignItems: 'center', shadowColor: BRAND,
                            shadowOpacity: 0.35, shadowRadius: 10,
                            shadowOffset: { width: 0, height: 4 }, elevation: 4,
                        }}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={{ textAlign: 'center', color: '#9ca3af', fontSize: 11, marginTop: 36 }}>
                        © {new Date().getFullYear()} i-iCON Academy. All rights reserved.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
