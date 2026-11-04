/** Current location.hash without the '#', decoded. A malformed escape (e.g. '#%') must never throw. */
export const readHash = (): string => {
  const raw = location.hash.replace(/^#/, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};
