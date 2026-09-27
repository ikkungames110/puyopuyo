export type Attempt = { id: string; correct: boolean; at: string; seconds: number };
export type Progress = { attempts: Attempt[]; bestChain: number };
const key = 'puyolab-progress-v1';
export function readProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(key) || 'null');
    if (!p || !Array.isArray(p.attempts)) return { attempts: [], bestChain: 0 };
    return {
      attempts: p.attempts
        .filter(
          (a: Attempt) =>
            a &&
            typeof a.id === 'string' &&
            typeof a.correct === 'boolean' &&
            typeof a.at === 'string' &&
            Number.isFinite(a.seconds),
        )
        .slice(-2000),
      bestChain: Number.isFinite(p.bestChain) ? p.bestChain : 0,
    };
  } catch {
    return { attempts: [], bestChain: 0 };
  }
}
export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(key, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function streak(p: Progress) {
  const days = new Set(p.attempts.map((a) => localDay(new Date(a.at))));
  const date = new Date();
  let count = 0;
  if (!days.has(localDay(date))) date.setDate(date.getDate() - 1);
  while (days.has(localDay(date))) {
    count++;
    date.setDate(date.getDate() - 1);
  }
  return count;
}
