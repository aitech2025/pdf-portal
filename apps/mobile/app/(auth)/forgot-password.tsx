import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../src/lib/apiClient';

type Step = 'email' | 'sent';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<Step>('email');

    const handleSend = async () => {
        if (!email.trim()) { Alert.alert('Error', 'Please enter your email address.'); return; }
        setLoading(true);
        try {
            await apiFetch('/api/auth/forgot-password', 'POST', { email: email.trim() });
            setStep('sent');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to send reset link.');
        } finally { setLoading(false); }
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-background"
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View className="flex-1 justify-center px-6">
                {/* Back button */}
                <TouchableOpacity
                    className="absolute top-14 left-6 w-10 h-10 rounded-xl bg-gray-100 items-center justify-center"
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={20} color="#374151" />
                </TouchableOpacity>

                {step === 'email' ? (
                    <>
                        <View className="items-center mb-8">
                            <View className="w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center mb-4">
                                <Ionicons name="lock-closed-outline" size={32} color="#4f46e5" />
                            </View>
                            <Text className="text-2xl font-bold text-foreground">Forgot Password</Text>
                            <Text className="text-muted mt-1 text-sm text-center">
                                Enter your email and we'll send a reset link.
                            </Text>
                        </View>

                        <View className="mb-4">
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
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            className={`rounded-xl py-4 items-center ${loading ? 'bg-primary/60' : 'bg-primary'}`}
                            onPress={handleSend}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <Text className="text-white font-semibold text-base">Send Reset Link</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity className="mt-4 items-center" onPress={() => router.back()}>
                            <Text className="text-sm text-muted">Back to Login</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View className="items-center">
                        <View className="w-20 h-20 rounded-2xl bg-emerald-100 items-center justify-center mb-6">
                            <Ionicons name="mail-outline" size={40} color="#059669" />
                        </View>
                        <Text className="text-2xl font-bold text-foreground">Check your email</Text>
                        <Text className="text-muted mt-3 text-sm text-center leading-relaxed">
                            We sent a password reset link to{'\n'}
                            <Text className="font-semibold text-foreground">{email}</Text>
                        </Text>
                        <Text className="text-xs text-muted mt-4 text-center">
                            Didn't receive it? Check your spam folder or try again.
                        </Text>

                        <TouchableOpacity
                            className="mt-6 border border-border rounded-xl py-3.5 px-8 items-center"
                            onPress={() => setStep('email')}
                        >
                            <Text className="text-sm font-semibold text-foreground">Try a different email</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="mt-3 items-center" onPress={() => router.replace('/(auth)/login')}>
                            <Text className="text-sm text-primary font-medium">Back to Login</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}
