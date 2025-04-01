import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { FieldValues, Control, Controller, Path } from 'react-hook-form';
import { Platform, View } from 'react-native';
import { BtnPrimary } from './Buttons';
import { MarginItem } from './MarginItem';
import { ErrorText } from './ThemedText';
import { StyledModal } from './StyledModal';

export type GenderPickerProps<T extends FieldValues> = {
  gender: number;
  control: Control<T, any>;
  errorsGender: any;
};
// react-hook-form based picker with proper ios and android rendering
export function StyledGenderPicker<T extends FieldValues>({ gender, control, errorsGender }: GenderPickerProps<T>) {
  const ios = Platform.OS === 'ios';
  const [showPicker, setShowPicker] = useState(false);

  let genderText = "Hombre";
  if (gender == 1) {
    genderText = "Mujer";
  } else if (gender == 2) {
    genderText = "No especificado";
  }

  if (ios) {
    return (
      <MarginItem>
        <BtnPrimary title={genderText} onClick={() => setShowPicker(true)} />
        {errorsGender && <ErrorText>{errorsGender.message}</ErrorText>}
        {showPicker &&
          <StyledModal isModalVisible={showPicker} setIsModalVisible={setShowPicker}>
            <Controller
              control={control}
              rules={{
                required: true,
              }}
              render={({ field: { onChange, value } }) => (
                <Picker
                  selectedValue={value.toString()}
                  onValueChange={onChange}
                  itemStyle={{ color: 'white' }}
                  style={{ color: 'white', marginBottom: 20, backgroundColor: 'black' }}
                >
                  <Picker.Item label="Hombre" value={"0"} />
                  <Picker.Item label="Mujer" value={"1"} />
                  <Picker.Item label="No especificado" value={"2"} />
                </Picker>
              )}
              name={"gender" as Path<T>}
            />
          </StyledModal>
        }
      </MarginItem>
    )
  }

  return (
    <MarginItem>
      <Controller
        control={control}
        rules={{
          required: true,
        }}
        render={({ field: { onChange, value } }) => (
          <Picker
            selectedValue={value}
            onValueChange={onChange}
            itemStyle={{ color: 'white' }}
            style={{ color: 'white', marginBottom: 20, backgroundColor: 'black' }}
          >
            <Picker.Item label="Hombre" value={0} />
            <Picker.Item label="Mujer" value={1} />
            <Picker.Item label="No especificado" value={2} />
          </Picker>
        )}
        name={"gender" as Path<T>}
      />
      {errorsGender && <ErrorText>{errorsGender.message}</ErrorText>}
    </MarginItem>
  )
}

type GenderFilterProps = {
  gender: number | null;
  setGender: (gender: number | null) => void;
}

export function StyledGenderFilter({ gender, setGender }: GenderFilterProps) {
  const ios = Platform.OS === 'ios';
  const [showPicker, setShowPicker] = useState(false);


  if (ios) {
    let title = "";
    if (gender == null) title = "Qualquier";
    if (gender == 0) title = "Hombre";
    if (gender == 1) title = "Mujer";

    return (
      <View>
        <BtnPrimary title={title} onClick={() => setShowPicker(true)} />
        {showPicker &&
          <StyledModal isModalVisible={showPicker} setIsModalVisible={setShowPicker}>
            <Picker
              selectedValue={gender != null ? (gender + 1).toString() : "0"}
              onValueChange={(itemValue, _) => {
                if (itemValue == "0") {
                  setGender(null);
                }
                else {
                  setGender(itemValue == "1" ? 0 : 1);
                }
              }}
              itemStyle={{ color: 'white' }}
              style={{ color: 'white', marginBottom: 20, backgroundColor: 'black' }}
            >
              <Picker.Item label="Qualquier" value={"0"} />
              <Picker.Item label="Hombre" value={"1"} />
              <Picker.Item label="Mujer" value={"2"} />
            </Picker>
          </StyledModal>
        }
      </View>
    )
  }

  return (
    <Picker
      selectedValue={gender}
      onValueChange={setGender}
      style={{ color: 'white', marginBottom: 20, backgroundColor: 'black' }}
    >
      <Picker.Item label="Qualquier" value={null} />
      <Picker.Item label="Hombre" value={0} />
      <Picker.Item label="Mujer" value={1} />
    </Picker>
  )
}