import { useState } from "react";
import { motion } from "framer-motion";
import "./App.css";

// LABYRINTH MAP (1 = wall, 0 = path)
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,1,0,1],
  [1,0,1,0,1,0,0,0,1,0,0,1],
  [1,0,1,0,0,0,1,0,0,0,1,1],
  [1,0,1,1,1,0,1,1,1,0,0,1],
  [1,0,0,0,1,0,0,0,1,0,1,1],
  [1,1,1,0,1,1,1,0,1,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,1,0,1,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,0,1,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1]
];

const TILE = 32;

export default function App() {
  const [pos, setPos] = useState({ x: 1, y: 1 });

  const canMove = (nx, ny) => {
    return MAP[ny] && MAP[ny][nx] === 0;
  };

  const move = (dx, dy) => {
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (canMove(nx, ny)) setPos({ x: nx, y: ny });
  };

  return (
    <div className="game-container">
      <h1 className="title">Pixel Labyrinth</h1>

      <div className="maze" style={{ width: MAP[0].length * TILE }}>
        {MAP.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className={cell === 1 ? "wall" : "floor"}
              style={{ width: TILE, height: TILE }}
            />
          ))
        )}

        <motion.div
          className="player"
          animate={{ left: pos.x * TILE, top: pos.y * TILE }}
          transition={{ type: "spring", stiffness: 200 }}
        />
      </div>

      <div className="controls">
        <button onClick={() => move(0, -1)}>⬆️</button>
        <div className="mid">
          <button onClick={() => move(-1, 0)}>⬅️</button>
          <button onClick={() => move(1, 0)}>➡️</button>
        </div>
        <button onClick={() => move(0, 1)}>⬇️</button>
      </div>
    </div>
  );
}
