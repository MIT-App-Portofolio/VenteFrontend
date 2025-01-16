import { EventLocation } from '@/api';
import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { Platform } from 'react-native';
import { BtnPrimary } from './Buttons';
import { MarginItem } from './MarginItem';
import { StyledModal } from './StyledModal';

export type StyledLocationPickerProps = {
  locations: EventLocation[];
  location: number | null;
  setLocation: (location: number) => void;
  setIsDirty: (dirty: boolean) => void;
};

export function StyledLocationPicker({ locations, location, setLocation, setIsDirty }: StyledLocationPickerProps) {
  const ios = Platform.OS === 'ios';
  const [forceRender, setForceRender] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  console.log(location);

  if (ios) {
    return (
      <MarginItem>
        <BtnPrimary title={location != null ? locations.find(loc => loc.id == location)?.name! : 'Selecciona un lugar'} onClick={() => setShowPicker(true)}></BtnPrimary>

        {showPicker &&
          <StyledModal isModalVisible={showPicker} setIsModalVisible={(visible) => {
            // The user may have closed the moda without changing the default selected value
            // That should be considered as selecting the default value
            if (!visible && location == null) {
              setLocation(0);
              setForceRender(!forceRender);
              setIsDirty(true);
            }

            setShowPicker(visible);
          }}>
            <Picker
              selectedValue={location as string | null}
              onValueChange={(itemValue, _) => {
                setIsDirty(true);
                setLocation((itemValue as number | null)!);
              }}
              itemStyle={{ color: 'white' }}
              style={{ color: 'white', marginBottom: 20, backgroundColor: 'black' }}
            >
              {locations.map(location => (
                <Picker.Item key={location.id} label={location.name} value={location.id.toString()} />
              ))}
            </Picker>
          </StyledModal>
        }
      </MarginItem>
    )
  }

  return (
    <MarginItem>
      <Picker selectedValue={location}
        onValueChange={(itemValue, _) => {
          setIsDirty(true);
          setLocation(itemValue!);
        }}
        style={{ color: 'white', marginBottom: 20, backgroundColor: 'black' }}
      >
        {locations.map(location => (
          <Picker.Item key={location.id} label={location.name} value={location.id} />
        ))}
      </Picker>
    </MarginItem>
  );
}