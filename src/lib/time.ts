const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;

const pad = (value: number) => String(value).padStart(2, '0');

/** `m:ss`, or `h:mm:ss` from one hour on */
export const formatTime = (seconds: number | undefined): string => {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '0:00';

  const total = Math.floor(seconds);
  const hours = Math.floor(total / SECONDS_PER_HOUR);
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const rest = total % SECONDS_PER_MINUTE;

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${minutes}:${pad(rest)}`;
};

/** Total length of a playlist: `48 min`, `1 h 12 min` */
export const formatTotal = (seconds: number): string => {
  const minutes = Math.round(Math.max(0, seconds) / SECONDS_PER_MINUTE);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
};
