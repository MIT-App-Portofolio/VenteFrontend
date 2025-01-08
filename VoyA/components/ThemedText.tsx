import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { TextProps } from 'react-native/Libraries/Text/Text';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style, lightColor, darkColor, type = 'default', ...rest
}: ThemedTextProps) {
  const styles = StyleSheet.create({
    default: {
      fontSize: 16,
      lineHeight: 24,
    },
    defaultSemiBold: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      lineHeight: 32,
    },
    subtitle: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    link: {
      lineHeight: 30,
      fontSize: 16,
      textDecorationLine: 'underline',
      color: '#0a7ea4',
    },
  });

  return (
    <Text
      style={[
        { color: 'white', fontFamily: type === 'title' ? 'Inter_700Bold' : 'Inter_400Regular' },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest} />
  );
}

export function ErrorText(props: TextProps) {
  return (
    <Text {...props} style={{ color: 'red' }}></Text>
  );
}
