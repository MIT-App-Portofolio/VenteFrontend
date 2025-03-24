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

export function dateTimeShortDisplay(date: Date): string {
  const dd: string = String(date.getDate()).padStart(2, '0');
  const mm: string = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const HH: string = String(date.getHours()).padStart(2, '0');
  const MM: string = String(date.getMinutes()).padStart(2, '0');

  return `${dd}/${mm} ${HH}:${MM}`;
}

export function dateDisplay(date: Date): string {
  return date.toLocaleString("es");
}