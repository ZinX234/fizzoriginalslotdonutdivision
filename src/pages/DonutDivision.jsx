import React, { useEffect, useState } from 'react';
import '@/styles/game.css';
import IntroScreen from '@/components/game/IntroScreen';
import ModeSelect from '@/components/game/ModeSelect';
import GameScreen from '@/components/game/GameScreen';
import { CONFIG } from '@/config/gameConfig';

// Screen flow: intro briefing -> mode selection -> main game.
export default function DonutDivision() {
  const [screen, setScreen] = useState('intro');
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    document.title = CONFIG.name;
  }, []);

  if (screen === 'intro') {
    return <IntroScreen onContinue={() => setScreen('mode')} />;
  }

  if (screen === 'mode') {
    return (
      <ModeSelect
        onReal={() => {
          setDemo(false);
          setScreen('game');
        }}
        onDemo={() => {
          setDemo(true);
          setScreen('game');
        }}
        onBack={() => setScreen('intro')}
      />
    );
  }

  return <GameScreen key={demo ? 'demo' : 'real'} demo={demo} onExit={() => setScreen('mode')} />;
}