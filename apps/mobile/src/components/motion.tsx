/**
 * Lightweight motion + polish primitives for the mobile UI.
 * Uses the built-in React Native Animated API only (no reanimated/babel plugin needed).
 */
import React, { useEffect, useRef } from 'react';
import {
    Animated, Easing, Pressable, View, StyleProp, ViewStyle, PressableProps,
} from 'react-native';

const BRAND = '#5b5ff1';

/** Press-to-scale wrapper — subtle tactile feedback on any tappable card/button. */
export function PressableScale({
    children, style, onPress, disabled, scaleTo = 0.97, ...rest
}: Omit<PressableProps, 'children' | 'style'> & {
    children?: React.ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number;
}) {
    const scale = useRef(new Animated.Value(1)).current;
    const to = (v: number) =>
        Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
    return (
        <Pressable
            onPressIn={() => !disabled && to(scaleTo)}
            onPressOut={() => to(1)}
            onPress={onPress}
            disabled={disabled}
            {...rest}
        >
            <Animated.View style={[{ transform: [{ scale }] }, style]}>
                {children}
            </Animated.View>
        </Pressable>
    );
}

/** Fade + slide-up on mount — for cards/sections appearing on a screen. */
export function FadeInUp({
    children, delay = 0, distance = 12, style,
}: { children: React.ReactNode; delay?: number; distance?: number; style?: StyleProp<ViewStyle> }) {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(v, {
            toValue: 1, duration: 380, delay,
            easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true,
        }).start();
    }, [v, delay]);
    return (
        <Animated.View
            style={[
                {
                    opacity: v,
                    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
                },
                style,
            ]}
        >
            {children}
        </Animated.View>
    );
}

/** Shimmering skeleton placeholder — for loading states instead of a bare spinner. */
export function Skeleton({
    width, height = 16, radius = 8, style,
}: { width?: number | string; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
    const pulse = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [pulse]);
    return (
        <Animated.View
            style={[
                {
                    width: width as any, height, borderRadius: radius,
                    backgroundColor: '#e5e7eb',
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }),
                },
                style,
            ]}
        />
    );
}

/** A card-shaped skeleton block group, useful for list/grid loading states. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
    return (
        <View style={{
            backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#eef0f3',
            padding: 16, marginBottom: 12, gap: 10,
        }}>
            <Skeleton width={44} height={44} radius={14} />
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} width={i === lines - 1 ? '55%' : '85%'} height={12} />
            ))}
        </View>
    );
}

export const MOTION_BRAND = BRAND;
