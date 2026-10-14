import React from 'react';
import Reel from '@/components/game/Reel';
import { CONFIG } from '@/config/gameConfig';

// The 5x5 play area: white reels separated by thin grey lines.
export default function ReelGrid({ grid, spinning, stoppedReels, winCells, spinId }) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${CONFIG.reels}, minmax(0, 1fr))`,
    gridTemplateRows: 'minmax(0, 1fr)',
    '--dd-rows': CONFIG.rows,
  };

  return (
    <div
      className="grid h-full w-full grid-cols-5 grid-rows-1 gap-[2px] bg-[#C9C9C9]"
      style={gridStyle}
    >
      {grid.map((column, reel) => (
        <Reel
          key={reel}
          reel={reel}
          column={column}
          spinning={spinning && stoppedReels <= reel}
          winKeys={winCells}
          spinId={spinId}
        />
      ))}
    </div>
  );
}