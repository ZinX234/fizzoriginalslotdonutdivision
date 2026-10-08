// Fizz Coins wallet.
//
// This is the ONLY place balance logic lives. The implementations below are
// temporary mocks — swap the bodies for real casino-platform calls when the
// game is integrated. Everything else in the game talks to this module through
// getBalance / updateBalance / placeBet / awardWin / deductBet.

const state = {
  balance: 0, // Real Mode starts at 0 Fizz Coins.
};

const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener(state.balance));
}

function normalise(amount) {
  return Math.max(0, Math.round(Number(amount) * 100) / 100);
}

/** Current Fizz Coin balance. */
export function getBalance() {
  return state.balance;
}

/** Overwrite the balance. Never allows a negative balance. */
export function updateBalance(nextBalance) {
  state.balance = normalise(nextBalance);
  emit();
  return state.balance;
}

/** Reserve a bet: returns false when the balance can't cover it. */
export function placeBet(amount) {
  const bet = normalise(amount);
  if (bet <= 0 || state.balance < bet) return false;
  updateBalance(state.balance - bet);
  return true;
}

/** Alias used by the game loop. */
export function deductBet(amount) {
  return placeBet(amount);
}

/** Credit a win back into the wallet. */
export function awardWin(amount) {
  const win = normalise(amount);
  if (win > 0) updateBalance(state.balance + win);
  return state.balance;
}

/** Subscribe to balance changes (used by the UI). */
export function subscribeWallet(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const Wallet = {
  getBalance,
  updateBalance,
  placeBet,
  deductBet,
  awardWin,
  subscribeWallet,
};

export default Wallet;