import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Modal, View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';

export type ModalProps = {
  children?: React.ReactNode;
  isModalVisible: boolean;
  includeButton?: boolean;
  setIsModalVisible: (isVisible: boolean) => void;
};

const { height } = Dimensions.get('window');

export function StyledModal({ children, isModalVisible, setIsModalVisible, includeButton = true }: ModalProps) {
  const topBarPercentage = 0.13;

  const styles = StyleSheet.create({
    modalContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgb(0, 0, 0)',
    },
    modalContent: {
      backgroundColor: 'black',
      padding: 20,
      marginTop: height * topBarPercentage,
      borderRadius: 10,
      width: '100%',
      height: '100%',
    },
    closeButton: {
      position: 'absolute',
      top: (height * topBarPercentage) / 2,
      left: 20,
      zIndex: 1,
    },
  });

  return (
    <Modal
      visible={isModalVisible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        {includeButton && (
          <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        )}

        <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: height * topBarPercentage }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );

}