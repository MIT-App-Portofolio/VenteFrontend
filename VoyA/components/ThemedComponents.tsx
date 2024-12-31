import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput, TextInputProps, TextProps, ActivityIndicator, Image } from 'react-native';

type ButtonProps = {
  title: string;
  onClick: () => void;
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

export function BtnPrimary({ title, onClick }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onClick} style={{
      backgroundColor: 'white',
      padding: 10,
      borderRadius: 5,
    }}>
      <Text style={{ color: 'black', alignSelf: 'center', textTransform: 'uppercase' }}>{title}</Text>
    </TouchableOpacity>
  );
};

export function BtnSecondary({ title, onClick }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onClick} style={{
      backgroundColor: 'black',
      padding: 10,
      borderRadius: 5,
      borderColor: 'white',
      borderWidth: 2,
    }}>
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

