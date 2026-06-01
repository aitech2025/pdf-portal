import { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usersApi, apiFetch } from '@shared/api/index.js';

type RecipientType = 'all' | 'school_admins' | 'teachers';
type NotifMethod = 'in_app' | 'email';

interface User { id: string; name: string; email: string; role: string; isActive: boolean; }

const RECIPIENT_OPTIONS: { value: RecipientType; label: string; icon: string; desc: string }[] = [
    { value: 'all', label: 'All Users', icon: 'people', desc: 'Send to every active user' },
    { value: 'school_admins', label: 'School Admins', icon: 'business', desc: 'Only school administrators' },
    { value: 'teachers', label: 'Teachers', icon: 'school', desc: 'Only teachers' },
];

const METHOD_OPTIONS: { value: NotifMethod; label: string; icon: string }[] = [
    { value: 'in_app', label: 'In-App', icon: 'phone-portrait-outline' },
    { value: 'email', label: 'Email', icon: 'mail-outline' },
];

function filterByRecipient(users: User[], type: RecipientType): User[] {
    const active = users.filter(u => u.isActive);
    if (type === 'all') return active;
    if (type === 'school_admins') return active.filter(u => u.role === 'school_admin' || u.role === 'admin');
    if (type === 'teachers') return active.filter(u => u.role === 'teacher');
    return active;
}

export default function BroadcastScreen() {
    const router = useRouter();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [recipientType, setRecipientType] = useState<RecipientType>('all');
    const [method, setMethod] = useState<NotifMethod>('in_app');
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [sending, setSending] = useState(false);
    const [sentCount, setSentCount] = useState<number | null>(null);

    useEffect(() => {
        usersApi.listUsers({ per_page: 500 })
            .then((res: any) => setUsers(res.items ?? []))
            .catch(console.error)
            .finally(() => setLoadingUsers(false));
    }, []);

    const recipients = filterByRecipient(users, recipientType);

    const handleSend = async () => {
        if (!subject.trim()) { Alert.alert('Validation', 'Subject is required.'); return; }
        if (!message.trim()) { Alert.alert('Validation', 'Message is required.'); return; }
        if (recipients.length === 0) { Alert.alert('No Recipients', 'No users match the selected recipient type.'); return; }

        Alert.alert(
            'Confirm Broadcast',
            `Send "${subject}" to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send', onPress: async () => {
                        setSending(true);
                        setSentCount(null);
                        let successCount = 0;
                        try {
                            // Send in batches to avoid overwhelming the server
                            const BATCH = 20;
                            for (let i = 0; i < recipients.length; i += BATCH) {
                                const batch = recipients.slice(i, i + BATCH);
                                await Promise.allSettled(
                                    batch.map(u =>
                                        apiFetch('/api/notifications', 'POST', {
                                            userId: u.id,
                                            subject: subject.trim(),
                                            message: message.trim(),
                                            type: method,
                                            read: false,
                                        }).then(() => { successCount++; })
                                    )
                                );
                            }
                            setSentCount(successCount);
                            Alert.alert('Broadcast Sent', `Successfully sent to ${successCount} of ${recipients.length} recipients.`);
                        } catch (err: any) {
                            Alert.alert('Error', err.message ?? 'Failed to send broadcast.');
                        } finally {
                            setSending(false);
                        }
                    }
                },
            ]
        );
    };

    const recipientCount = loadingUsers ? '...' : recipients.length;

    return (
        <View className="flex-1 bg-background">
            <View className="bg-white px-5 pt-14 pb-4 border-b border-border">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-gray-100 items-center justify-center">
                        <Ionicons name="arrow-back" size={20} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-bold text-foreground">Broadcast</Text>
                        <Text className="text-xs text-muted">Send notifications to users</Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                    {/* Compose */}
                    <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                        <Text className="text-sm font-semibold text-foreground mb-3">Compose Message</Text>

                        <View className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-1.5">Subject *</Text>
                            <TextInput
                                className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                placeholder="Notification subject..."
                                placeholderTextColor="#9ca3af"
                                value={subject}
                                onChangeText={setSubject}
                            />
                        </View>

                        <View className="mb-2">
                            <Text className="text-sm font-medium text-foreground mb-1.5">Message *</Text>
                            <TextInput
                                className="bg-gray-50 border border-border rounded-xl px-4 py-3 text-foreground text-sm"
                                placeholder="Write your message here..."
                                placeholderTextColor="#9ca3af"
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                numberOfLines={5}
                                textAlignVertical="top"
                                style={{ minHeight: 120 }}
                            />
                        </View>
                    </View>

                    {/* Recipient Type */}
                    <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                        <Text className="text-sm font-semibold text-foreground mb-3">Recipients</Text>
                        {RECIPIENT_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                className={`flex-row items-center gap-3 p-3 rounded-xl mb-2 border ${recipientType === opt.value ? 'border-primary bg-primary/5' : 'border-border bg-gray-50'}`}
                                onPress={() => setRecipientType(opt.value)}
                            >
                                <View className={`w-9 h-9 rounded-xl items-center justify-center ${recipientType === opt.value ? 'bg-primary/15' : 'bg-gray-200'}`}>
                                    <Ionicons name={opt.icon as any} size={18} color={recipientType === opt.value ? '#4f46e5' : '#6b7280'} />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-sm font-semibold ${recipientType === opt.value ? 'text-primary' : 'text-foreground'}`}>{opt.label}</Text>
                                    <Text className="text-xs text-muted">{opt.desc}</Text>
                                </View>
                                {recipientType === opt.value && <Ionicons name="checkmark-circle" size={20} color="#4f46e5" />}
                            </TouchableOpacity>
                        ))}
                        <View className="mt-1 flex-row items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2">
                            <Ionicons name="people-outline" size={16} color="#4f46e5" />
                            <Text className="text-xs text-primary font-medium">
                                {loadingUsers ? 'Loading recipients...' : `${recipientCount} recipient${recipientCount !== 1 ? 's' : ''} will receive this`}
                            </Text>
                        </View>
                    </View>

                    {/* Notification Method */}
                    <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                        <Text className="text-sm font-semibold text-foreground mb-3">Delivery Method</Text>
                        <View className="flex-row gap-3">
                            {METHOD_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border ${method === opt.value ? 'border-primary bg-primary/5' : 'border-border bg-gray-50'}`}
                                    onPress={() => setMethod(opt.value)}
                                >
                                    <Ionicons name={opt.icon as any} size={18} color={method === opt.value ? '#4f46e5' : '#6b7280'} />
                                    <Text className={`text-sm font-semibold ${method === opt.value ? 'text-primary' : 'text-foreground'}`}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Preview */}
                    {(subject.trim() || message.trim()) && (
                        <View className="bg-white mb-3 rounded-2xl p-4 border border-border">
                            <Text className="text-sm font-semibold text-foreground mb-3">Preview</Text>
                            <View className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
                                        <Ionicons name="notifications" size={14} color="white" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                                            {subject.trim() || 'Subject...'}
                                        </Text>
                                        <Text className="text-xs text-muted">EduPortal Admin • Just now</Text>
                                    </View>
                                </View>
                                <Text className="text-sm text-foreground leading-5" numberOfLines={4}>
                                    {message.trim() || 'Your message will appear here...'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Success Banner */}
                    {sentCount !== null && (
                        <View className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-3 flex-row items-center gap-3">
                            <Ionicons name="checkmark-circle" size={24} color="#059669" />
                            <Text className="text-sm font-semibold text-emerald-700">Sent to {sentCount} recipients successfully</Text>
                        </View>
                    )}

                    {/* Send Button */}
                    <TouchableOpacity
                        className={`rounded-2xl py-4 items-center flex-row justify-center gap-2 ${sending || !subject.trim() || !message.trim() ? 'bg-primary/50' : 'bg-primary'}`}
                        onPress={handleSend}
                        disabled={sending || !subject.trim() || !message.trim()}
                    >
                        {sending ? (
                            <>
                                <ActivityIndicator color="white" size="small" />
                                <Text className="text-white font-semibold text-base">Sending...</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="send" size={18} color="white" />
                                <Text className="text-white font-semibold text-base">Send Broadcast</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
