import React, { useState } from "react";
import { Platform } from "react-native";
import { BtnPrimary } from "./Buttons";
import { MarginItem } from "./MarginItem";
import { StyledModal } from "./StyledModal";
import { dateDisplay, dateTimeDisplay } from "@/dateDisplay";
import { CenterAligned } from "./CenterAligned";
import DateTimePicker, { useDefaultStyles } from "react-native-ui-datepicker";


export type StyledDatePickerProps = {
  date: Date | null;
  title: string;
  futureOnly?: boolean;
  pastOnly?: boolean;
  minDate?: Date;
  maxDate?: Date;
  setIsDirty?: (dirty: boolean) => void;
  setDate: (date: Date) => void;
};

export function StyledDatePicker({ date, setDate, title, setIsDirty, futureOnly, pastOnly, minDate, maxDate }: StyledDatePickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(date);


  const defaultStyles = useDefaultStyles();

  const now = new Date();
  const localYear = now.getFullYear();
  const localMonth = now.getMonth(); // 0-based
  const localDate = now.getDate();

  const utcMidnight = new Date(Date.UTC(localYear, localMonth, localDate, 0, 0, 0));

  maxDate = maxDate ?? (pastOnly === true ? utcMidnight : undefined);
  minDate = minDate ?? (futureOnly === true ? utcMidnight : undefined);

  return (
    <MarginItem>
      <BtnPrimary title={date ? dateDisplay(date) : title} onClick={() => {
        setTempDate(date);
        setShowDatePicker(true);
      }}></BtnPrimary>

      {showDatePicker &&
        <StyledModal isModalVisible={showDatePicker} setIsModalVisible={(visible) => {
          if (!visible) {
            setTempDate(date); // Reset temp date when closing without saving
          }
          setShowDatePicker(visible);
        }}>
          <CenterAligned>
            <DateTimePicker
              timePicker={false}
              locale="es"
              styles={{
                ...defaultStyles,
                button_next: { color: 'white', backgroundColor: 'white', padding: 10, borderRadius: 5 },
                button_prev: { color: 'white', backgroundColor: 'white', padding: 10, borderRadius: 5 },
                button_prev_image: { tintColor: 'black', fontSize: 16 },
                button_next_image: { tintColor: 'black', fontSize: 16 },


                month_selector: { backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 },
                year_selector: { backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 },

                month_selector_label: { color: 'black', fontSize: 16 },
                year_selector_label: { color: 'black', fontSize: 16 },

                month: { color: 'white' },
                year: { color: 'white' },

                day_label: { color: 'white' },

                month_label: { color: 'white' },
                year_label: { color: 'white' },
                today: { borderColor: 'blue', borderWidth: 2, color: 'white' },
                today_label: { color: 'white' },
                selected: { backgroundColor: 'white' },
                selected_label: { color: 'black' },
              }}
              timeZone="UTC"
              mode="single"
              minDate={minDate}
              maxDate={maxDate}
              date={tempDate ?? utcMidnight}
              onChange={({ date }) => {
                console.log(date as Date)
                setTempDate(date as Date);
              }}
            />
          </CenterAligned>

          <BtnPrimary title="Guardar" onClick={() => {
            if (setIsDirty) setIsDirty(true);

            if (tempDate) {
              setDate(tempDate);
            } else {
              setDate(new Date());
            }
            setShowDatePicker(false);
          }} />
        </StyledModal>
      }
    </MarginItem>
  );
}

export type StyledMultipleDatesPickerProps = {
  minDate?: Date;
  maxDate?: Date;
  title: string;
  futureOnly?: boolean;
  pastOnly?: boolean;
  dates: Date[] | null,
  setIsDirty?: (dirty: boolean) => void;
  setDates: (dates: Date[]) => void,
};

export function StyledMultipleDatesPicker({
  dates,
  title,
  setIsDirty,
  futureOnly,
  pastOnly,
  setDates,
  minDate,
  maxDate
}: StyledMultipleDatesPickerProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDates, setTempDates] = useState<Date[] | null>(dates);

  const now = new Date();
  const localYear = now.getFullYear();
  const localMonth = now.getMonth(); // 0-based
  const localDate = now.getDate();

  const utcMidnight = new Date(Date.UTC(localYear, localMonth, localDate, 0, 0, 0));

  maxDate = maxDate ?? (pastOnly === true ? utcMidnight : undefined);
  minDate = minDate ?? (futureOnly === true ? utcMidnight : undefined);

  const defaultStyles = useDefaultStyles();

  const getDisplayText = () => {
    if (!dates || dates.length === 0) return title;
    return `${dates?.length} fechas`;
  };

  return (
    <MarginItem>
      <BtnPrimary
        title={getDisplayText()}
        onClick={() => {
          setTempDates(dates);
          setShowDatePicker(true);
        }}
      />

      {showDatePicker && (
        <StyledModal
          isModalVisible={showDatePicker}
          setIsModalVisible={(visible) => {
            if (!visible) {
              setTempDates(dates);
            }
            setShowDatePicker(visible);
          }}
        >
          <CenterAligned>
            <DateTimePicker
              timePicker={false}
              locale="es"
              firstDayOfWeek={1}
              styles={{
                ...defaultStyles,
                button_next: { color: 'white', backgroundColor: 'white', padding: 10, borderRadius: 5 },
                button_prev: { color: 'white', backgroundColor: 'white', padding: 10, borderRadius: 5 },
                button_prev_image: { tintColor: 'black', fontSize: 16 },
                button_next_image: { tintColor: 'black', fontSize: 16 },
                month_selector: { backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 },
                year_selector: { backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 },
                month_selector_label: { color: 'black', fontSize: 16 },
                year_selector_label: { color: 'black', fontSize: 16 },
                month: { color: 'white' },
                year: { color: 'white' },
                day_label: { color: 'white' },
                month_label: { color: 'white' },
                year_label: { color: 'white' },
                today: { borderColor: 'blue', borderWidth: 2, color: 'white' },
                today_label: { color: 'white' },
                selected: { backgroundColor: 'white' },
                range_fill: { backgroundColor: 'lightgray', marginTop: '10%', marginBottom: '10%' },
                selected_label: { color: 'black' },
                range_start_label: { color: 'black' },
                range_end_label: { color: 'black' },
                range_middle_label: { color: 'black' },
              }}
              mode="multiple"
              timeZone="UTC"
              multiRangeMode
              max={20}
              dates={tempDates ?? []}
              minDate={minDate}
              maxDate={maxDate}
              onChange={({ dates }) => {
                setTempDates(dates as Date[]);
              }}
            />
          </CenterAligned>

          <BtnPrimary
            title="Guardar"
            onClick={() => {
              if (setIsDirty) setIsDirty(true);
              setDates(tempDates ?? []);
              setShowDatePicker(false);
            }}
          />
        </StyledModal>
      )}
    </MarginItem>
  );
}