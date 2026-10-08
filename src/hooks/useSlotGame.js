import { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIG } from '@/config/gameConfig';
import * as Wallet from '@/game/wallet';
import * as engine from '@/game/engine';
import { buildClueCards, getBonusChoice, gooeyWildCount, surveillanceMultiplier, surveillanceWildCount } from '@/game/bonus';
import { sound } from '@/game/sound';
import { formatCoins } from '@/game/format';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function tierFor(amount, bet) {
  const multiple = amount / Math.max(bet, 0.01);
  if (multiple >= 250) return 'MEGA WIN';
  if (multiple >= 50) return 'BIG WIN';
  if (multiple >= 15) return 'NICE WIN';
  return null;
}

/** Game loop state machine for Donut Division. */
export default function useSlotGame({ demo }) {
  const [bet, setBet] = useState(CONFIG.bets.default);
  const [grid, setGrid] = useState(() => engine.emptyGrid());
  const [spinId, setSpinId] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [stoppedReels, setStoppedReels] = useState(CONFIG.reels);
  const [balance, setBalance] = useState(Wallet.getBalance());
  const [winCells, setWinCells] = useState([]);
  const [winLines, setWinLines] = useState([]);
  const [winAmount, setWinAmount] = useState(0);
  const [displayWin, setDisplayWin] = useState(0);
  const [banner, setBanner] = useState(null);
  const [gooey, setGooey] = useState(null);
  const [bonusChoice, setBonusChoice] = useState(false);
  const [freeSpins, setFreeSpins] = useState(null);
  const [pickBonus, setPickBonus] = useState(null);
  const [maxWin, setMaxWin] = useState(null);
  const [autoplayLeft, setAutoplayLeft] = useState(0);
  const [quickSpin, setQuickSpin] = useState(false);
  const [soundOn, setSoundOn] = useState(CONFIG.sound.enabledByDefault);
  const [message, setMessage] = useState('');

  const busy = useRef(false);
  const stickyRef = useRef([]);
  const pickRef = useRef(null);
  const betRef = useRef(bet);
  const demoRef = useRef(demo);
  const quickRef = useRef(quickSpin);

  useEffect(() => { betRef.current = bet; }, [bet]);
  useEffect(() => { demoRef.current = demo; }, [demo]);
  useEffect(() => { quickRef.current = quickSpin; }, [quickSpin]);
  useEffect(() => Wallet.subscribeWallet(setBalance), []);
  useEffect(() => { sound.setEnabled(soundOn); }, [soundOn]);

  const speed = useCallback((ms) => (quickRef.current ? ms * CONFIG.animation.quickFactor : ms), []);

  const countUp = useCallback((target) => {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const step = (now) => {
      const progress = Math.min(1, (now - start) / CONFIG.animation.winCountMs);
      setDisplayWin(target * (1 - (1 - progress) ** 3));
      if (progress < 1) requestAnimationFrame(step);
      else setDisplayWin(target);
    };
    requestAnimationFrame(step);
  }, []);

  /** One spin: spins the reels, reveals the result and scores it. */
  const conductSpin = useCallback(async ({ mode = null } = {}) => {
    const currentBet = betRef.current;
    setWinCells([]);
    setWinLines([]);
    setBanner(null);
    setWinAmount(0);
    setDisplayWin(0);
    setSpinning(true);
    setStoppedReels(0);
    setSpinId(Date.now() + Math.random());
    sound.spin();

    const sticky = mode === 'sticky' ? stickyRef.current : [];
    let nextGrid = engine.generateGrid(sticky);
    let multiplier = 1;
    if (mode === 'surveillance') {
      nextGrid = engine.dropWilds(nextGrid, surveillanceWildCount());
      multiplier = surveillanceMultiplier();
      setFreeSpins((current) => (current ? { ...current, multiplier } : current));
    }
    setGrid(nextGrid);

    await sleep(speed(CONFIG.animation.reelStopDelay));
    for (let reel = 0; reel < CONFIG.reels; reel += 1) {
      setStoppedReels(reel + 1);
      sound.reelStop();
      await sleep(speed(CONFIG.animation.reelStagger));
    }
    await sleep(speed(CONFIG.animation.postStop));
    setSpinning(false);

    const evaluation = engine.evaluateGrid(nextGrid, currentBet);
    const total = evaluation.total * multiplier;
    if (total > 0) {
      setWinCells(evaluation.winCells);
      setWinLines(evaluation.lineIndexes);
      setWinAmount(total);
      countUp(total);
      sound.win(total / Math.max(currentBet, 0.01));
      if (!demoRef.current) Wallet.awardWin(total);
      await sleep(speed(CONFIG.animation.featurePause));
    }

    if (mode === 'sticky') {
      const merged = [...stickyRef.current];
      nextGrid.forEach((column, reel) => column.forEach((symbol, row) => {
        if (symbol === 'WILD' && !merged.some((spot) => spot.reel === reel && spot.row === row)) {
          merged.push({ reel, row });
        }
      }));
      const cap = getBonusChoice('sticky').stickyCap ?? merged.length;
      const capped = merged.slice(0, cap);
      stickyRef.current = capped;
      setFreeSpins((current) => (current ? { ...current, sticky: capped } : current));
    }

    return { grid: nextGrid, evaluation, total, multiplier };
  }, [countUp, speed]);

  const runMaxWin = useCallback(async () => {
    sound.maxWin();
    const stages = ['board', 'files', 'clues', 'links'];
    for (let index = 0; index < stages.length; index += 1) {
      setMaxWin({ stage: stages[index] });
      await sleep(speed(1000));
    }
    const amount = betRef.current * CONFIG.features.maxWin.multiplier;
    setMaxWin({ stage: 'solved', amount });
    setWinAmount(amount);
    countUp(amount);
    if (!demoRef.current) Wallet.awardWin(amount);
    await sleep(speed(4600));
    setMaxWin(null);
  }, [countUp, speed]);

  const runGooey = useCallback(async (currentGrid) => {
    sound.feature();
    setBanner({ tier: 'FEATURE', title: 'GOOEY IS GOOD', subtitle: 'The goo gun is spraying wilds across the reels' });
    setGooey({ stage: 'launch', spots: [] });
    await sleep(speed(900));

    const nextGrid = engine.dropWilds(currentGrid, gooeyWildCount());
    const spots = [];
    nextGrid.forEach((column, reel) => column.forEach((symbol, row) => {
      if (symbol === 'WILD' && currentGrid[reel][row] !== 'WILD') spots.push(`${reel}-${row}`);
    }));
    setGrid(nextGrid);
    setGooey({ stage: 'splatter', spots });
    await sleep(speed(1500));

    const evaluation = engine.evaluateGrid(nextGrid, betRef.current);
    if (evaluation.total > 0) {
      setWinCells(evaluation.winCells);
      setWinLines(evaluation.lineIndexes);
      setWinAmount(evaluation.total);
      countUp(evaluation.total);
      sound.win(evaluation.total / Math.max(betRef.current, 0.01));
      if (!demoRef.current) Wallet.awardWin(evaluation.total);
      setBanner({
        tier: tierFor(evaluation.total, betRef.current) || 'FEATURE WIN',
        title: `${formatCoins(evaluation.total)} ${CONFIG.currency}`,
        subtitle: 'Gooey wilds paid out',
      });
      await sleep(speed(1300));
    }
    setGooey(null);
    busy.current = false;
  }, [countUp, speed]);

  const doSpin = useCallback(async () => {
    if (busy.current) return;
    if (!demoRef.current && Wallet.getBalance() < betRef.current) {
      setMessage('You need Fizz Coins to place a bet.');
      setAutoplayLeft(0);
      return;
    }
    busy.current = true;
    setMessage('');
    if (!demoRef.current) Wallet.deductBet(betRef.current);

    const result = await conductSpin({});
    if (result.evaluation.scatterCount >= CONFIG.features.bonus.minScatters) {
      sound.feature();
      setBanner({ tier: 'BONUS', title: 'BONUS CHOICE', subtitle: 'Case files unlocked — choose your investigation' });
      setBonusChoice(true);
      busy.current = false;
      return;
    }

    const roll = engine.rollRandomFeature();
    if (roll === 'maxWin') {
      await runMaxWin();
      busy.current = false;
      return;
    }
    if (roll === 'gooey') {
      await runGooey(result.grid);
      return;
    }
    busy.current = false;
  }, [conductSpin, runGooey, runMaxWin]);

  const startPickBonus = useCallback(() => {
    const cards = buildClueCards();
    const state = { cards, picks: 0, total: 0 };
    pickRef.current = state;
    setPickBonus(state);
    setBanner({ tier: 'BONUS', title: getBonusChoice('pick').title, subtitle: 'Tap 3 clue cards to reveal prizes' });
    sound.feature();
  }, []);

  const pickCard = useCallback((cardId) => {
    const current = pickRef.current;
    if (!current) return;
    const card = current.cards.find((entry) => entry.id === cardId);
    if (!card || card.revealed || current.picks >= getBonusChoice('pick').picks) return;

    const cards = current.cards.map((entry) => (entry.id === cardId ? { ...entry, revealed: true } : entry));
    const total = current.total + card.value * betRef.current;
    const next = { ...current, cards, picks: current.picks + 1, total };
    pickRef.current = next;
    setPickBonus(next);
    sound.collect();

    const { picks } = getBonusChoice('pick');
    if (next.picks >= picks) {
      setTimeout(() => {
        setWinAmount(total);
        countUp(total);
        if (!demoRef.current) Wallet.awardWin(total);
        setPickBonus(null);
        pickRef.current = null;
        setBanner({
          tier: 'FEATURE COMPLETE',
          title: `${formatCoins(total)} ${CONFIG.currency}`,
          subtitle: 'Case files collected',
        });
        sound.bigWin();
        busy.current = false;
      }, 1100);
    }
  }, [countUp]);

  const runFreeSpins = useCallback(async (bonusId) => {
    const choice = getBonusChoice(bonusId);
    stickyRef.current = [];
    setFreeSpins({
      id: bonusId,
      title: choice.title,
      remaining: choice.spins,
      total: choice.spins,
      multiplier: 1,
      totalWin: 0,
      sticky: [],
    });
    let totalWin = 0;
    for (let index = 0; index < choice.spins; index += 1) {
      setFreeSpins((current) => (current ? { ...current, remaining: choice.spins - index } : current));
      const result = await conductSpin({ mode: bonusId });
      totalWin += result.total;
      setFreeSpins((current) => (current ? { ...current, totalWin } : current));
      await sleep(speed(500));
    }
    setFreeSpins(null);
    stickyRef.current = [];
    setBanner({
      tier: 'FEATURE COMPLETE',
      title: `${formatCoins(totalWin)} ${CONFIG.currency}`,
      subtitle: 'Free spins complete',
    });
    sound.bigWin();
    busy.current = false;
  }, [conductSpin, speed]);

  const selectBonus = useCallback(async (bonusId) => {
    setBonusChoice(false);
    sound.click();
    busy.current = true;
    if (bonusId === 'pick') {
      startPickBonus();
      return;
    }
    await runFreeSpins(bonusId);
  }, [runFreeSpins, startPickBonus]);

  const changeBet = useCallback((direction) => {
    setBet((current) => {
      const options = CONFIG.bets.options;
      const index = options.indexOf(current);
      const next = Math.min(Math.max(index + direction, 0), options.length - 1);
      return options[next];
    });
    sound.click();
  }, []);

  const toggleAutoplay = useCallback(() => {
    setAutoplayLeft((current) => (current > 0 ? 0 : 25));
    sound.click();
  }, []);

  const toggleQuickSpin = useCallback(() => {
    setQuickSpin((current) => !current);
    sound.click();
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((current) => !current);
  }, []);

  const gameActive = !spinning && !bonusChoice && !pickBonus && !freeSpins && !maxWin;
  const canAfford = demo || balance >= bet;
  // When the balance is too low the spin button stays clickable so it can
  // explain why betting is blocked; no bet is ever placed.
  const canSpin = gameActive && !gooey;

  useEffect(() => {
    if (autoplayLeft <= 0) return undefined;
    if (!gameActive || busy.current) return undefined;
    if (!canAfford) {
      setAutoplayLeft(0);
      return undefined;
    }
    const timer = setTimeout(async () => {
      await doSpin();
      setAutoplayLeft((current) => Math.max(0, current - 1));
    }, 700);
    return () => clearTimeout(timer);
  }, [autoplayLeft, gameActive, canAfford, doSpin]);

  return {
    bet,
    changeBet,
    balance,
    grid,
    spinId,
    spinning,
    stoppedReels,
    winCells,
    winLines,
    winAmount,
    displayWin,
    banner,
    setBanner,
    gooey,
    bonusChoice,
    selectBonus,
    freeSpins,
    pickBonus,
    pickCard,
    maxWin,
    autoplayLeft,
    toggleAutoplay,
    quickSpin,
    toggleQuickSpin,
    soundOn,
    toggleSound,
    message,
    canSpin,
    canAfford,
    spin: doSpin,
    demo,
  };
}