import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { Feather } from '@expo/vector-icons';

type EventPlaceTypeBadgeProps = {
  type: string;
};

export function EventPlaceTypeBadge({ type }: EventPlaceTypeBadgeProps) {
  const getTypeConfig = () => {
    switch (type.toLowerCase()) {
      case 'bar':
        return {
          color: '#FF6B6B',
          icon: 'coffee',
          label: 'Bar'
        };
      case 'disco':
        return {
          color: '#4ECDC4',
          icon: 'music',
          label: 'Discoteca'
        };
      default:
        return {
          color: '#666666',
          icon: 'map-pin',
          label: type
        };
    }
  };

  const config = getTypeConfig();

  return (
    <View style={[styles.badge, { borderColor: config.color }]}>
      <Feather name={config.icon as any} size={14} color={config.color} />
      <ThemedText style={[styles.text, { color: config.color }]}>
        {config.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
    gap: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 