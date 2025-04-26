export function dateTimeDisplay(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };

  date = new Date(date);

  const formattedDate = date.toLocaleDateString('es-ES', options);

  const formattedTime = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return `${formattedDate.charAt(0).toUpperCase()}${formattedDate.slice(1)} a las ${formattedTime}`;
}

export function dateOnlyDisplay(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };

  date = new Date(date);

  const formattedDate = date.toLocaleDateString('es-ES', options);

  return `${formattedDate.charAt(0).toUpperCase()}${formattedDate.slice(1)}`;
}

export function dateTimeShortDisplay(date: Date): string {
  date = new Date(date);

  const dd: string = String(date.getDate()).padStart(2, '0');
  const mm: string = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const HH: string = String(date.getHours()).padStart(2, '0');
  const MM: string = String(date.getMinutes()).padStart(2, '0');

  return `${dd}/${mm} ${HH}:${MM}`;
}

export function dateListDisplay(dates: Date[]): string {
  if (!dates || dates.length === 0) return '';

  // Sort dates chronologically
  dates.sort((a, b) => a.getTime() - b.getTime());

  const ranges: string[] = [];
  let rangeStart = dates[0];
  let rangeEnd = dates[0];

  for (let i = 1; i <= dates.length; i++) {
    const currentDate = dates[i];
    const prevDate = dates[i - 1];

    // Check if we're at the end or if dates are not consecutive
    if (i === dates.length ||
      currentDate.getTime() - prevDate.getTime() > 24 * 60 * 60 * 1000) {

      if (rangeStart === rangeEnd) {
        // Single date
        ranges.push(dateShortDisplay(rangeStart));
      } else {
        // Date range
        ranges.push(`${dateShortDisplay(rangeStart)}-${dateShortDisplay(rangeEnd)}`);
      }

      if (i < dates.length) {
        rangeStart = currentDate;
        rangeEnd = currentDate;
      }
    } else {
      rangeEnd = currentDate;
    }
  }

  return ranges.join(', ');
}

export function dateShortDisplay(date: Date): string {
  date = new Date(date);

  const dd: string = String(date.getDate()).padStart(2, '0');
  const mm: string = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based

  return `${dd}/${mm}`;
}

export function timeShortDisplay(date: Date): string {
  date = new Date(date);

  const HH: string = String(date.getHours()).padStart(2, '0');
  const MM: string = String(date.getMinutes()).padStart(2, '0');

  return `${HH}:${MM}`;
}

export function dateDisplay(date: Date): string {
  date = new Date(date);

  return date.toLocaleDateString("es");
}