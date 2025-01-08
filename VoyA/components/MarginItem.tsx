import React, { ReactNode } from 'react';
import { View } from 'react-native';


export function MarginItem({ children }: { children: ReactNode }) {
  return (
    <View style={{ marginTop: 5, marginBottom: 5 }}>{children}</View>
  );
}
export function BiggerMarginItem({ children }: { children: ReactNode }) {
  return (
    <View style={{ marginTop: 15, marginBottom: 15 }}>{children}</View>
  );
}
