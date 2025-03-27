import React, { useState } from "react";
import { Platform } from "react-native";
import { BtnPrimary } from "./Buttons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { MarginItem } from "./MarginItem";
import { StyledModal } from "./StyledModal";
import { dateDisplay, dateTimeDisplay } from "@/dateDisplay";
import { CenterAligned } from "./CenterAligned";


export type StyledDatePickerProps = {
  date: Date | null;
  title: string;
  futureOnly?: boolean;
  pastOnly?: boolean;
  setIsDirty?: (dirty: boolean) => void;
  setDate: (date: Date) => void;
};

export function StyledDatePicker({ date, setDate, title, setIsDirty, futureOnly, pastOnly }: StyledDatePickerProps) {
  const ios = Platform.OS === 'ios';
  const [showDatePicker, setShowDatePicker] = useState(false);

  if (ios) {
    return (
      <MarginItem>
        <BtnPrimary title={date ? dateDisplay(date) : title} onClick={() => setShowDatePicker(true)}></BtnPrimary>

        {showDatePicker &&
          <StyledModal isModalVisible={showDatePicker} setIsModalVisible={(visible) => {
            if (!visible && date != null && setIsDirty) {
              setIsDirty(true);
            }
            setShowDatePicker(visible);
          }}>
            <CenterAligned>
              <DateTimePicker
                themeVariant='dark'
                minimumDate={futureOnly === true ? new Date() : undefined}
                maximumDate={pastOnly === true ? new Date() : undefined}
                style={{ width: 450 }}
                value={date ?? new Date()}
                onChange={(_, selectedDate) => {
                  if (selectedDate) {
                    setDate(selectedDate);
                  }
                }}
                mode="date"
                display="inline"
              />
            </CenterAligned>
          </StyledModal>
        }
      </MarginItem>
    );
  }

  return (
    <MarginItem>
      <BtnPrimary title={date ? dateDisplay(date) : title} onClick={() => setShowDatePicker(true)}></BtnPrimary>

      {showDatePicker && (
        <DateTimePicker
          value={date ?? new Date()}
          minimumDate={futureOnly === true ? new Date() : undefined}
          maximumDate={pastOnly === true ? new Date() : undefined}
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
        <BtnPrimary title={date ? dateTimeDisplay(date) : title} onClick={() => setShowDatePicker(true)}></BtnPrimary>

        {showDatePicker &&
          <StyledModal isModalVisible={showDatePicker} setIsModalVisible={(visible) => {
            if (!visible && date == null) {
              setDate(new Date());
              setIsDirty(true);
            }
            setShowDatePicker(visible);
          }
          }>
            <DateTimePicker
              style={{ width: 450 }}
              value={date ?? new Date()}
              onChange={(_, selectedDate) => {
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
              mode="date"
              display="calendar"
            />
          </StyledModal>
        }
      </MarginItem>
    );
  }

  return (
    <MarginItem>
      <BtnPrimary title={date ? dateTimeDisplay(date) : title} onClick={() => setShowDatePicker(true)}></BtnPrimary>

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