export function toHHMMSS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function progressToTime(progress: number, duration: number): number {
  return (progress / 100) * duration;
}

export function timeToProgress(elapsed: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min((elapsed / duration) * 100, 100);
}
