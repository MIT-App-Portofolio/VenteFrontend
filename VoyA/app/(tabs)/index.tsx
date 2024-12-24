import { Text } from 'react-native';

import { BtnPrimary, CenterAligned } from '@/components/ThemedComponents';
import { useApi } from '@/api';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const api = useApi();
  const router = useRouter();

  if (!api.user_profile?.eventStatus.active) {
    return (
      <CenterAligned>
        <Text style={{ color: 'white' }}>No estas registrado en ningun evento.</Text>
        <BtnPrimary title='Ir a calendario' onClick={() => router.push('/calendar')}></BtnPrimary>
      </CenterAligned >
    )
  }

  return (
    <CenterAligned>
      <Text style={{ color: 'white' }}>VoyA</Text>
    </CenterAligned>
  );
}
