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
  const [showPicker, setShowPicker] = useState(false);
  const [tempLocation, setTempLocation] = useState<number | null>(location);

  if (ios) {
    return (
      <MarginItem>
        <BtnPrimary
          title={tempLocation != null ? locations.find(loc => loc.id == tempLocation)?.name! : 'Selecciona un lugar'}
          onClick={() => {
            setTempLocation(location ?? (locations.length > 0 ? locations[0].id : null));
            setShowPicker(true);
          }}
        />

        {showPicker &&
          <StyledModal isModalVisible={showPicker} setIsModalVisible={(visible) => {
            if (!visible) {
              setTempLocation(location); // Reset temp location when closing without saving
            }
            setShowPicker(visible);
          }}>
            <Picker
              selectedValue={tempLocation?.toString() ?? null}
              onValueChange={(itemValue) => {
                setTempLocation(itemValue ? parseInt(itemValue) : null);
              }}
              itemStyle={{ color: 'white' }}
              style={{ color: 'white', marginBottom: 20, backgroundColor: 'black' }}
            >
              {locations.map(location => (
                <Picker.Item key={location.id} label={location.name} value={location.id.toString()} />
              ))}
            </Picker>

            <BtnPrimary title='Guardar' onClick={() => {
              if (tempLocation != null) {
                setLocation(tempLocation);
                setIsDirty(true);
              }
              setShowPicker(false);
            }} />
          </StyledModal>
        }
      </MarginItem>
    )
  }

  return (
    <MarginItem>
      {showPicker ?
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
        </Picker> :
        <BtnPrimary title='Selecciona un lugar' onClick={() => {
          // Android is different. No not-selected value unless hardcoded. which is pointless. clicking the choose loc button selects default location and allows usr to change.
          setLocation(0);
          setShowPicker(true);
        }}></BtnPrimary>
      }
    </MarginItem>
  );
}