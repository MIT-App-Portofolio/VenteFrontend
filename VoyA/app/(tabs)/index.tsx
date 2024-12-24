import React, { useEffect, useState } from 'react';
import { Text, View, Image, StyleSheet, FlatList, Modal, TouchableOpacity } from 'react-native';
import { BtnPrimary, CenterAligned } from '@/components/ThemedComponents';
import { useApi } from '@/api';
import { useRouter } from 'expo-router';
import { Profile } from '@/api';

export default function HomeScreen() {
  const api = useApi();
  const router = useRouter();
  const [visitors, setVisitors] = useState<Profile[]>([]);
  const [visitorPfps, setVisitorPfps] = useState<{ [key: string]: string }>({});
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    fetchVisitors();
  }, [page]);

  const fetchVisitors = async () => {
    setLoading(true);
    const newVisitors = await api.queryVisitors(page);
    if (newVisitors) {
      setVisitors(prevVisitors => [...prevVisitors, ...newVisitors]);
      const pfps = await Promise.all(
        newVisitors.map(visitor => api.fetchPfp(visitor.userName))
      );
      const pfpMap = newVisitors.reduce((acc, visitor, index) => {
        acc[visitor.userName] = pfps[index];
        return acc;
      }, {} as { [key: string]: string });
      setVisitorPfps(prevPfps => ({ ...prevPfps, ...pfpMap }));
    }
    setLoading(false);
  };

  const handleProfileClick = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedProfile(null);
  };

  if (!api.userProfile?.eventStatus.active) {
    return (
      <CenterAligned>
        <Text style={{ color: 'white' }}>No estas registrado en ningun evento.</Text>
        <BtnPrimary title='Ir a calendario' onClick={() => router.push('/calendar')}></BtnPrimary>
      </CenterAligned>
    );
  }

  const renderVisitor = ({ item }: { item: Profile }) => (
    <TouchableOpacity key={item.userName} style={styles.card} onPress={() => handleProfileClick(item)}>
      <Image source={{ uri: visitorPfps[item.userName] }} style={styles.profilePicture} />
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.igHandle}>{item.igHandle}</Text>
    </TouchableOpacity>
  );

  return (
    <CenterAligned>
      <Text style={{ color: 'white', fontSize: 20 }}>Otras personas que van a {api.userProfile.eventStatus.location?.name}</Text>
      <FlatList
        data={visitors}
        renderItem={renderVisitor}
        keyExtractor={item => item.userName}
        onEndReached={() => setPage(prevPage => prevPage + 1)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? (<CenterAligned><Text style={{ color: 'white' }}>Loading...</Text></CenterAligned>) : null}
      />
      {selectedProfile && (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Image source={{ uri: visitorPfps[selectedProfile.userName] }} style={styles.modalProfilePicture} />
              <Text style={styles.modalName}>{selectedProfile.name}</Text>
              <Text style={styles.modalUsername}>{selectedProfile.userName}</Text>
              <Text style={styles.modalIgHandle}>{selectedProfile.igHandle}</Text>
              <Text style={styles.modalDescription}>{selectedProfile.description}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </CenterAligned >
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#333',
    padding: 10,
    margin: 10,
    borderRadius: 5,
    width: 400,
    alignItems: 'center',
  },
  profilePicture: {
    width: 300,
    height: 300,
  },
  name: {
    color: 'white',
    fontSize: 16,
    marginTop: 5,
  },
  igHandle: {
    color: 'gray',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalProfilePicture: {
    width: 300,
    height: 300,
  },
  modalName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalUsername: {
    fontSize: 18,
    color: 'gray',
  },
  modalIgHandle: {
    fontSize: 18,
    color: 'gray',
  },
  modalDescription: {
    fontSize: 16,
    marginVertical: 10,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
  },
});
