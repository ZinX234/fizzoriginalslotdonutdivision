// Casino-owned settings for Donut Division.
//
// Nothing is set by default. The host casino's own RTP system decides these
// numbers, so the game ships with them blank: a value left unset is simply
// never displayed or claimed by the game.
//
// To publish your casino's numbers, either fill them in below, or inject them
// at runtime by setting window.DonutDivisionSettings before the game mounts.
export const casinoSettings = {
  // Target return to player, shown as a percentage (e.g. 96).
  rtp: undefined,
  // Volatility indicator, e.g. { label: 'Medium-High', level: 4, max: 5 }.
  volatility: undefined,
};

const injected = typeof window !== 'undefined' ? window.DonutDivisionSettings : null;

// An explicit value here wins; otherwise whatever the casino injected at runtime.
export function casinoSetting(key) {
  if (casinoSettings[key] !== undefined) return casinoSettings[key];
  return injected ? injected[key] : undefined;
}

export default casinoSettings;