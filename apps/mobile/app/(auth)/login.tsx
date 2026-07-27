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

/* Design tokens mirrored from apps/web (index.css / tailwind.config.js) */
const BRAND = '#5b5ff1';            // --brand-500 / --primary
const BG = '#fbfcff';               // --background  hsl(220 33% 99%)
const FG = '#111827';               // --foreground
const MUTED_FG = '#6b7280';         // --muted-foreground
const BORDER = '#e5e7eb';           // --border
const CARD_BORDER = '#e8ebf0';      // border/60
const ICON = '#9ca3af';
const DESTRUCTIVE = '#e11d48';      // --destructive hsl(349 89% 60%)
const RADIUS_LG = 16;               // --radius-lg  1rem
const RADIUS_XL = 24;               // --radius-xl  1.5rem

// shadow-soft-xl approximation
const SOFT_XL = {
    shadowColor: '#111a2e',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
};

export default function LoginScreen() {
    const { login } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            setError('Please enter your email / mobile and password.');
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
            setError(err.message || 'Invalid credentials. Please check your email / mobile and password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: BG }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" backgroundColor={BG} />

            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    paddingHorizontal: 24,
                    paddingTop: insets.top + 24,
                    paddingBottom: insets.bottom + 32,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
                    {/* Brand */}
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                        <View style={[{
                            backgroundColor: 'white',
                            borderRadius: RADIUS_LG,
                            paddingHorizontal: 24,
                            paddingVertical: 16,
                            marginBottom: 20,
                        }, SOFT_XL]}>
                            <Image
                                source={require('../../assets/logo-mark.png')}
                                style={{ width: 190, height: 88, resizeMode: 'contain' }}
                            />
                        </View>
                        <Text style={{ fontSize: 14, color: MUTED_FG, textAlign: 'center' }}>
                            Sign in to your learning portal
                        </Text>
                    </View>

                    {/* Form card */}
                    <View style={[{
                        backgroundColor: 'white',
                        borderRadius: RADIUS_LG,
                        borderWidth: 1,
                        borderColor: CARD_BORDER,
                        padding: 24,
                    }, SOFT_XL]}>
                        {error ? (
                            <View style={{
                                backgroundColor: 'rgba(225,29,72,0.10)',
                                borderWidth: 1,
                                borderColor: 'rgba(225,29,72,0.20)',
                                borderRadius: 12,
                                paddingHorizontal: 14,
                                paddingVertical: 12,
                                marginBottom: 20,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                            }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: DESTRUCTIVE }} />
                                <Text style={{ color: DESTRUCTIVE, fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 }}>
                                    {error}
                                </Text>
                            </View>
                        ) : null}

                        {/* Email / Mobile */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={{ fontSize: 14, fontWeight: '500', color: FG, marginBottom: 8 }}>
                                Email or Mobile Number
                            </Text>
                            <View style={{
                                flexDirection: 'row', alignItems: 'center',
                                backgroundColor: 'rgba(251,252,255,0.6)',
                                borderWidth: 1, borderColor: BORDER,
                                borderRadius: 12, paddingHorizontal: 14, height: 48,
                            }}>
                                <Ionicons name="at-outline" size={18} color={ICON} />
                                <TextInput
                                    style={{ flex: 1, paddingHorizontal: 10, fontSize: 16, color: FG, height: '100%' }}
                                    placeholder="name@iiconacademy.in or 9876543210"
                                    placeholderTextColor={ICON}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="username"
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={{ marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ fontSize: 14, fontWeight: '500', color: FG }}>
                                    Password
                                </Text>
                                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)} hitSlop={8}>
                                    <Text style={{ fontSize: 14, fontWeight: '500', color: BRAND }}>Forgot password?</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{
                                flexDirection: 'row', alignItems: 'center',
                                backgroundColor: 'rgba(251,252,255,0.6)',
                                borderWidth: 1, borderColor: BORDER,
                                borderRadius: 12, paddingHorizontal: 14, height: 48,
                            }}>
                                <Ionicons name="lock-closed-outline" size={18} color={ICON} />
                                <TextInput
                                    style={{ flex: 1, paddingHorizontal: 10, fontSize: 16, color: FG, height: '100%' }}
                                    placeholder="••••••••"
                                    placeholderTextColor={ICON}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPwd}
                                    autoCapitalize="none"
                                    autoComplete="current-password"
                                />
                                <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={{ padding: 4 }} hitSlop={8}>
                                    <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={ICON} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Remember me */}
                        <TouchableOpacity
                            onPress={() => setRemember(!remember)}
                            activeOpacity={0.7}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4, marginBottom: 20 }}
                        >
                            <View style={{
                                width: 18, height: 18, borderRadius: 4,
                                borderWidth: 1.5,
                                borderColor: remember ? BRAND : MUTED_FG,
                                backgroundColor: remember ? BRAND : 'transparent',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                {remember && <Ionicons name="checkmark" size={13} color="white" />}
                            </View>
                            <Text style={{ fontSize: 14, color: MUTED_FG }}>Remember me for 30 days</Text>
                        </TouchableOpacity>

                        {/* Sign in */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: loading ? '#8b8ef5' : BRAND,
                                borderRadius: 12, height: 48,
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                                shadowColor: BRAND, shadowOpacity: 0.35, shadowRadius: 10,
                                shadowOffset: { width: 0, height: 4 }, elevation: 4,
                            }}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Sign in</Text>
                                    <Ionicons name="arrow-forward" size={20} color="white" />
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Verify email (screen not yet built on mobile) */}
                        <Text style={{ textAlign: 'center', fontSize: 14, color: MUTED_FG, marginTop: 20 }}>
                            Need to verify your account?{' '}
                            <Text style={{ color: BRAND, fontWeight: '500' }}>Verify email</Text>
                        </Text>
                    </View>

                    {/* Request access (signup screen not yet built on mobile) */}
                    <Text style={{ textAlign: 'center', fontSize: 14, color: MUTED_FG, marginTop: 24 }}>
                        Don&apos;t have an account?{' '}
                        <Text style={{ color: FG, fontWeight: '600', textDecorationLine: 'underline' }}>Request access</Text>
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
