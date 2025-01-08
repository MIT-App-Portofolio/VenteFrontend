import React from 'react';
import { ActivityIndicator } from 'react-native';
import { CenterAligned } from './CenterAligned';


export function FullScreenLoading() {
  return (
    <CenterAligned>
      <ActivityIndicator size="large" color="#0000ff" />
    </CenterAligned>
  );
}
