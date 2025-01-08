import React from 'react';
import { StyleSheet, SafeAreaView, View } from 'react-native';


import { ReactNode } from 'react';


export function HorizontallyAligned({ children }: { children: ReactNode }) {
  const styles = StyleSheet.create({
    container: {
      flex: 1, // Take up the full screen
      alignItems: 'center', // Center horizontally
      backgroundColor: 'black',
    },
    centeredView: {
      width: '100%', // Full width
      padding: 20, // Some padding around content
      alignItems: 'center', // Center children horizontally within this View
      justifyContent: 'center', // Center children vertically within this View
    },
    text: {
      fontSize: 20,
      color: 'black',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centeredView}>
        {children}
      </View>
    </SafeAreaView>
  );
}
