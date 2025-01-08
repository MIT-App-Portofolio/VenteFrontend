import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput, TextInputProps, TextProps, ActivityIndicator, Modal, ScrollView, Platform } from 'react-native';
import { EventLocation } from '@/api';

type ButtonProps = {
  title: string;
  onClick: () => void;
  disabled?: boolean;
};

export function FullScreenLoading() {
  return (
    <CenterAligned>
      <ActivityIndicator size="large" color="#0000ff" />
    </CenterAligned>
  )
}

export function CenterAligned({ children }) {
  const styles = StyleSheet.create({
    container: {
      flex: 1, // Take up the full screen
      justifyContent: 'center', // Center vertically
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

export function HorizontallyAligned({ children }) {
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

export function BtnPrimary({ title, onClick, disabled }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onClick} style={{
      backgroundColor: disabled ? 'gray' : 'white',
      padding: 10,
      borderRadius: 5,
    }} disabled={disabled}>
      <Text style={{ color: 'black', alignSelf: 'center', textTransform: 'uppercase' }}>{title}</Text>
    </TouchableOpacity>
  );
};

export function BtnSecondary({ title, onClick, disabled }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onClick} style={{
      backgroundColor: 'black',
      padding: 10,
      borderRadius: 5,
      borderColor: 'white',
      borderWidth: 2,
    }} disabled={disabled}>
      <Text style={{ color: 'white', alignSelf: 'center', textTransform: 'uppercase' }}>{title}</Text>
    </TouchableOpacity>
  );
};

export function ErrorText(props: TextProps) {
  return (
    <Text {...props} style={{ color: 'red' }}></Text>
  )
}

interface StyledTextInputProps extends TextInputProps {
  title?: string;
  value: string;
  setValue: (e: string) => void;
}

export function StyledTextInput({ title, placeholder, value, setValue, autoCapitalize, secureTextEntry }: StyledTextInputProps) {
  return (
    <View>
      <Text style={{ color: 'white', fontSize: 15, }}>{title as string}</Text>
      <TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor='white' autoCapitalize={autoCapitalize} secureTextEntry={secureTextEntry}
        style={{
          padding: 10,
          borderColor: 'white',
          color: 'white',
          fontSize: 15,
          borderWidth: 1,
          borderRadius: 4,
        }}
      ></TextInput>
    </View >
  )
}

export function StyledEmailInput({ value, setValue }: StyledTextInputProps) {
  return (
    <StyledTextInput title='Email' value={value} setValue={setValue} placeholder='user@example.com' autoCapitalize='none' autoCorrect={false} placeholderTextColor='gray'></StyledTextInput>
  )
}

export function StyledPasswordInput({ title, value, setValue }: StyledTextInputProps) {
  return (
    <StyledTextInput title={title} value={value} setValue={setValue} secureTextEntry autoCapitalize='none' autoCorrect={false}></StyledTextInput>
  )
}
export function MarginItem({ children }) {
  return (
    <View style={{ marginTop: 5, marginBottom: 5 }}>{children}</View>
  );
} export function BiggerMarginItem({ children }) {
  return (
    <View style={{ marginTop: 15, marginBottom: 15 }}>{children}</View>
  );
}

type GenderPickerProps<T extends FieldValues> = {
  gender: number;
  control: Control<T, any>;
  errorsGender: any;
}

// react-hook-form based picker with proper ios and android rendering
export function StyledGenderPicker<T extends FieldValues>({ gender, control, errorsGender }: GenderPickerProps<T>) {
  const ios = Platform.OS === 'ios';
  const [showPicker, setShowPicker] = useState(false);

  if (ios) {
    return (
      <MarginItem>
        <BtnPrimary title={gender == 0 ? "Hombre" : "Mujer"} onClick={() => setShowPicker(true)} />
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
                  selectedValue={value}
                  onValueChange={onChange}
                  itemStyle={{ color: 'white' }}
                  style={{ color: 'white', marginBottom: 20, backgroundColor: 'black' }}
                >
                  <Picker.Item label="Hombre" value={"0"} />
                  <Picker.Item label="Mujer" value={"1"} />
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

type StyledDatePickerProps = {
  date: Date | null;
  title: string;
  setDate: (date: Date) => void;
};

export function StyledDatePicker({ date, setDate, title }: StyledDatePickerProps) {
  const ios = Platform.OS === 'ios';
  const [showDatePicker, setShowDatePicker] = useState(false);

  if (ios) {
    return (
      <MarginItem>
        <BtnPrimary title={date ? date.toLocaleDateString("es") : title} onClick={() => setShowDatePicker(true)}></BtnPrimary>

        {showDatePicker &&
          <StyledModal isModalVisible={showDatePicker} setIsModalVisible={setShowDatePicker}>
            <DateTimePicker
              themeVariant='dark'
              style={{ width: 450 }}
              value={date ?? new Date()}
              onChange={(_, selectedDate) => {
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
              mode="date"
              display="spinner"
            />
          </StyledModal>
        }
      </MarginItem>
    );
  }

  return (
    <MarginItem>
      <BtnPrimary title={date ? date.toLocaleDateString("es") : title} onClick={() => setShowDatePicker(true)}></BtnPrimary>

      {showDatePicker && (
        <DateTimePicker
          value={date ?? new Date()}
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDate(selectedDate);
            }
          }}
          mode="date"
          display="default"
        />
      )}
    </MarginItem>
  );
}

type StyledDateTimePickerProps = {
  date: Date | null;
  title: string;
  setIsDirty: (dirty: boolean) => void;
  setDate: (date: Date) => void;
};

export function StyledDateTimePicker({ date, setDate, title, setIsDirty }: StyledDateTimePickerProps) {
  const ios = Platform.OS === 'ios';
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  if (ios) {
    return (
      <MarginItem>
        <BtnPrimary title={date ? date.toLocaleDateString("es") : title} onClick={() => setShowDatePicker(true)}></BtnPrimary>

        {showDatePicker &&
          <StyledModal isModalVisible={showDatePicker} setIsModalVisible={setShowDatePicker}>
            <DateTimePicker
              themeVariant='dark'
              minimumDate={new Date()}
              style={{ width: 450 }}
              value={date ?? new Date()}
              onChange={(_, selectedDate) => {
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
              mode="datetime"
              display="spinner"
            />
          </StyledModal>
        }
      </MarginItem>
    );
  }

  return (
    <MarginItem>
      <BtnPrimary title={date ? date.toLocaleDateString("es") : title} onClick={() => setShowDatePicker(true)}></BtnPrimary>

      {showDatePicker && (
        <DateTimePicker
          value={date ?? new Date()}
          minimumDate={new Date()}
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setIsDirty(true);
              setDate(selectedDate);
              setShowTimePicker(true);
            }
          }}
          mode="date"
          display="compact"
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={date ?? new Date()}
          minimumDate={new Date()}
          onChange={(_, selectedDate) => {
            setShowTimePicker(false);
            if (selectedDate) {
              setIsDirty(true);
              setDate(selectedDate);
            }
          }}
          mode="time"
          display="default"
        />
      )}
    </MarginItem>
  );
}

type StyledLocationPickerProps = {
  locations: EventLocation[];
  location: number | null;
  setLocation: (location: number) => void;
  setIsDirty: (dirty: boolean) => void;
};

export function StyledLocationPicker({ locations, location, setLocation, setIsDirty }: StyledLocationPickerProps) {
  const ios = Platform.OS === 'ios';
  const [showPicker, setShowPicker] = useState(false);

  if (ios) {
    return (
      <MarginItem>
        <BtnPrimary title={location ? locations.find(loc => loc.id == location)?.name! : 'Selecciona un lugar'} onClick={() => setShowPicker(true)}></BtnPrimary>

        {showPicker &&
          <StyledModal isModalVisible={showPicker} setIsModalVisible={setShowPicker}>
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

type ModalProps = {
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
