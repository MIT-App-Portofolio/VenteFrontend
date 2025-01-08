import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Modal, View, TouchableOpacity, ScrollView } from 'react-native';

export type ModalProps = {
  children?: React.ReactNode;
  isModalVisible: boolean;
  setIsModalVisible: (isVisible: boolean) => void;
};

export function StyledModal({ children, isModalVisible, setIsModalVisible }: ModalProps) {
  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalContent: {
      backgroundColor: 'black',
      padding: 20,
      marginTop: 80,
      borderRadius: 10,
      width: '100%',
      height: '100%',
    },
    closeButton: {
      position: 'absolute',
      top: 40,
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
        <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <ScrollView style={styles.modalContent}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );

}