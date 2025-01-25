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

export function dateDisplay(date: Date): string {
  return date.toLocaleString("es");
}