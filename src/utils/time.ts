export const formatTime = (time: number | undefined) => {
  if (!time || Number.isNaN(time)) return '0:00';

  const hours = Math.floor(time / 3600);
  const remainingSeconds = time % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const remainingSecs = Math.floor(remainingSeconds % 60);

  const formattedParts = [];

  if (hours > 0) {
    formattedParts.push(hours);
  }

  formattedParts.push(hours && minutes < 10 ? `0${minutes}` : minutes);
  formattedParts.push(remainingSecs < 10 ? `0${remainingSecs}` : remainingSecs);

  return formattedParts.join(':');
};
