import { Feather, Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Modal, View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';

export type TopRightElement = {
  icon: string;
  onPress: () => void;
};

export type ModalProps = {
  children?: React.ReactNode;
  isModalVisible: boolean;
  includeButton?: boolean;
  noIncludeScrollView?: boolean;
  topRightElement?: TopRightElement;
  setIsModalVisible: (isVisible: boolean) => void;
  fixedBottomContent?: React.ReactNode;
};

const { height } = Dimensions.get('window');

export function StyledModal({ children, isModalVisible, setIsModalVisible, includeButton = true, topRightElement, noIncludeScrollView, fixedBottomContent }: ModalProps) {
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
    topRightButton: {
      position: 'absolute',
      top: (height * topBarPercentage) / 2,
      right: 20,
      zIndex: 1,
    },
    fixedBottom: {
      position: 'absolute',
      bottom: 100,
      left: 0,
      right: 0,
      padding: 20,
      backgroundColor: 'black',
      borderTopWidth: 1,
      borderTopColor: '#333',
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

        {topRightElement && (
          <TouchableOpacity onPress={topRightElement.onPress} style={styles.topRightButton}>
            <Feather name={topRightElement.icon as any} size={24} color="white" />
          </TouchableOpacity>
        )}

        {noIncludeScrollView === true ?
          <View style={styles.modalContent}>
            {children}
          </View> :
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: height * topBarPercentage + (fixedBottomContent ? 100 : 0) }}>
            {children}
          </ScrollView>
        }

        {fixedBottomContent && (
          <View style={styles.fixedBottom}>
            {fixedBottomContent}
          </View>
        )}
      </View>
    </Modal>
  );
}