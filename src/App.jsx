import React, { useEffect, useRef, useState } from "react";

// Simple constants
const DEFAULT_SIZE = 15;
const CELL_PX = 22;

// tiny pixel sprite as dataURI
function makePlayerDataUri(color = "#FFD1DC") {
  const pixels = [
    "00011000",
    "00111100",
    "01111110",
    "11111111",
    "11111111",
    "01111110",
    "00111100",
    "00011000",
  ];
  const pixelSize = 4;
  const w = pixels[0].length * pixelSize;
  const h = pixels.length * pixelSize;
  let rects = "";
  for (let y = 0; y < pixels.length; y++) {
    for (let x = 0; x < pixels[y].length; x++) {
      if (pixels[y][x] === "1") {
        rects += `<rect x='${x * pixelSize}' y='${y * pixelSize}' width='${pixelSize}' height='${pixelSize}' fill='${color}' />`;
      }
    }
  }
  const svg = `<?xml version='1.0' encoding='UTF-8'?><svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${rects}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// generate maze: recursive backtracker
function generateMaze(size = DEFAULT_SIZE) {
  if (size % 2 === 0) size += 1;
  const w = size;
  const h = size;
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => 1));

  const stack = [];
  const startX = 1;
  const startY = 1;
  grid[startY][startX] = 0;
  stack.push([startX, startY]);

  const dirs = [
    [0, -2],
    [2, 0],
    [0, 2],
    [-2, 0],
  ];

  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors = [];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx > 0 && nx < w - 1 && ny > 0 && ny < h - 1) {
        if (grid[ny][nx] === 1) neighbors.push([nx, ny]);
      }
    }
    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];
      const wx = cx + (nx - cx) / 2;
      const wy = cy + (ny - cy) / 2;
      grid[wy][wx] = 0;
      grid[ny][nx] = 0;
      stack.push([nx, ny]);
    }
  }

  grid[1][1] = 2;
  grid[h - 2][w - 2] = 3;
  return grid;
}

export default function BirthdayMazeFixed() {
  const RECIPIENT = "Sayang";
  const SENDER = "Nis";

  const [map, setMap] = useState(() => generateMaze(DEFAULT_SIZE));
  const [playerGrid, setPlayerGrid] = useState({ x: 1, y: 1 });
  const [won, setWon] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [theme, setTheme] = useState("neon");

  const containerRef = useRef(null);
  const playerSpriteUri = useRef(makePlayerDataUri("#FFD1DC"));
  const sfxRef = useRef(null);

  // tiny SFX (same as before)
  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    function beep(freq = 440, time = 0.08, type = "square", gain = 0.12) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + time);
    }
    sfxRef.current = {
      move: () => beep(700, 0.05, "square", 0.06),
      bump: () => beep(200, 0.12, "sine", 0.12),
      win: () => {
        beep(880, 0.06, "sine", 0.12);
        setTimeout(() => beep(1100, 0.06, "sine", 0.12), 80);
        setTimeout(() => beep(1320, 0.12, "sine", 0.18), 180);
      },
      ctx,
    };

    function resume() {
      if (ctx && ctx.state === "suspended") ctx.resume();
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    }
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);

    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      try { ctx.close(); } catch {}
    };
  }, []);

  // helper: safe cell read
  const cellAt = (x, y) => {
    if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return 1;
    return map[y][x];
  };

  // MOVEMENT: use functional update to avoid stale state problems
  const moveBy = (dx, dy) => {
    if (won) return;
    setPlayerGrid((prev) => {
      const newX = prev.x + dx;
      const newY = prev.y + dy;
      const target = cellAt(newX, newY);
      if (target === 1) {
        if (soundOn && sfxRef.current) sfxRef.current.bump();
        return prev; // no move
      } else {
        if (soundOn && sfxRef.current) sfxRef.current.move();
        // check goal
        if (target === 3) {
          setWon(true);
          if (soundOn && sfxRef.current) sfxRef.current.win();
          setTimeout(() => setShowModal(true), 260);
        }
        return { x: newX, y: newY };
      }
    });
  };

  // keyboard: we attach a handler that calls moveBy (no stale closure issue)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowUp" || e.key === "w") { moveBy(0, -1); }
      if (e.key === "ArrowDown" || e.key === "s") { moveBy(0, 1); }
      if (e.key === "ArrowLeft" || e.key === "a") { moveBy(-1, 0); }
      if (e.key === "ArrowRight" || e.key === "d") { moveBy(1, 0); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [won, soundOn, map]); // deps ok — moveBy uses functional update

  // auto-center after move (watch playerGrid)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cellSize = CELL_PX + 2; // gap accounted approx
    const centerX = playerGrid.x * cellSize + cellSize / 2;
    const centerY = playerGrid.y * cellSize + cellSize / 2;
    container.scrollTo({
      left: Math.max(0, centerX - container.clientWidth / 2),
      top: Math.max(0, centerY - container.clientHeight / 2),
      behavior: "smooth",
    });
  }, [playerGrid]);

  // regen
  const regen = () => {
    const newMap = generateMaze(DEFAULT_SIZE);
    setMap(newMap);
    setPlayerGrid({ x: 1, y: 1 });
    setWon(false);
    setShowModal(false);
  };

  // themes
  const palettes = {
    neon: {
      wall: "#ff3d9e",
      bg: "#0f0014",
      path: "#0b0610",
      goal: "#00ffcc",
      playerColor: "#FFD1DC",
      accent: "#00ffcc",
    },
    pastel: {
      wall: "#f59dbb",
      bg: "#fff7fb",
      path: "#ffeeff",
      goal: "#bde0fe",
      playerColor: "#ffb3c1",
      accent: "#ffb3c1",
    },
    sakura: {
      wall: "#ff7fbf",
      bg: "#fff0f6",
      path: "#fff5fa",
      goal: "#ffd6e0",
      playerColor: "#ff9fcf",
      accent: "#ff7fbf",
    },
  };
  const p = palettes[theme] || palettes.neon;
  playerSpriteUri.current = makePlayerDataUri(p.playerColor);

  // styles
  const boardStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${map[0].length}, ${CELL_PX}px)`,
    gridAutoRows: `${CELL_PX}px`,
    gap: "2px",
    padding: "8px",
    background: p.path,
    borderRadius: 10,
  };
  const cellBase = { width: CELL_PX, height: CELL_PX, boxSizing: "border-box" };
  const wallStyle = {
    ...cellBase,
    backgroundImage: `repeating-linear-gradient(0deg, ${p.wall} 0 ${CELL_PX / 2}px, rgba(0,0,0,0) ${CELL_PX / 2}px ${CELL_PX}px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 ${CELL_PX / 4}px, rgba(0,0,0,0) ${CELL_PX / 4}px ${CELL_PX / 2}px)`,
    backgroundSize: `${CELL_PX}px ${CELL_PX}px`,
    border: `1px solid rgba(0,0,0,0.25)`,
    boxShadow: `inset 0 0 6px rgba(0,0,0,0.6)`,
    borderRadius: 3,
  };
  const goalStyle = {
    ...cellBase,
    background: p.goal,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#001010",
    boxShadow: "0 0 8px rgba(0,0,0,0.3)",
    borderRadius: 4,
  };
  const pathStyle = { ...cellBase, background: p.path };

  // small button style helpers (declared here so hoisting not needed)
  function dpadStyle() {
    return {
      width: 56,
      height: 44,
      borderRadius: 8,
      background: "#ffd966",
      border: "4px solid #c27c00",
      fontFamily: "'Press Start 2P', monospace",
      fontSize: 14,
      boxShadow: "4px 4px 0 rgba(0,0,0,0.25)",
      touchAction: "manipulation",
    };
  }
  function primaryBtnStyle(themePal) {
    return {
      background: themePal.accent,
      padding: "8px 10px",
      borderRadius: 8,
      fontFamily: "'Press Start 2P', monospace",
      border: "none",
      cursor: "pointer",
    };
  }
  function secondaryBtnStyle(themePal) {
    return {
      background: "#ff4db3",
      padding: "8px 10px",
      borderRadius: 8,
      fontFamily: "'Press Start 2P', monospace",
      border: "none",
      cursor: "pointer",
    };
  }

  return (
    <div style={{ minHeight: "100vh", background: p.bg, color: "#fff", padding: 12, fontFamily: "'Press Start 2P', monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .scanline{pointer-events:none;position:fixed;inset:0;z-index:1;background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 49%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.06) 51%, rgba(255,255,255,0) 100%);background-size:100% 4px;}`}</style>

      <div className="scanline" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ color: p.accent, fontSize: 16 }}>MISSION: FIND LOVE</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>PIXEL MAZE • {RECIPIENT}</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ padding: 6 }}>
            <option value="neon">Neon</option>
            <option value="pastel">Pastel</option>
            <option value="sakura">Sakura</option>
          </select>
          <button onClick={() => setSoundOn((s) => !s)} style={{ padding: "6px 8px" }}>
            {soundOn ? "Sound ON" : "Sound OFF"}
          </button>
          <button onClick={regen} style={{ padding: "6px 8px" }}>
            New Maze
          </button>
        </div>
      </div>

      <div ref={containerRef} style={{ width: "100%", maxWidth: 760, margin: "0 auto", overflow: "auto", borderRadius: 12, padding: 8, boxShadow: `0 0 30px ${p.accent}`, touchAction: "none" }}>
        <div style={boardStyle}>
          {map.map((row, y) =>
            row.map((cell, x) => {
              const key = `${x}-${y}`;
              // render player inside proper cell so its always clickable and aligned
              if (playerGrid.x === x && playerGrid.y === y) {
                return (
                  <div key={key} style={{ ...cellBase, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div id="player-el" style={{ width: CELL_PX - 2, height: CELL_PX - 2, backgroundImage: `url(${playerSpriteUri.current})`, backgroundSize: "cover", imageRendering: "pixelated" }} />
                  </div>
                );
              }

              if (cell === 1) return <div key={key} style={wallStyle} />;
              if (cell === 3) return <div key={key} style={goalStyle}><span style={{ fontSize: 10 }}>💌</span></div>;
              return <div key={key} style={pathStyle} />;
            })
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 12, gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          <button onPointerDown={() => moveBy(0, -1)} onTouchStart={() => moveBy(0, -1)} onClick={() => moveBy(0, -1)} style={dpadStyle()}>
            ▲
          </button>
          <div style={{ display: "flex", gap: 6 }}>
            <button onPointerDown={() => moveBy(-1, 0)} onTouchStart={() => moveBy(-1, 0)} onClick={() => moveBy(-1, 0)} style={dpadStyle()}>
              ◀
            </button>
            <button onPointerDown={() => moveBy(1, 0)} onTouchStart={() => moveBy(1, 0)} onClick={() => moveBy(1, 0)} style={dpadStyle()}>
              ▶
            </button>
          </div>
          <button onPointerDown={() => moveBy(0, 1)} onTouchStart={() => moveBy(0, 1)} onClick={() => moveBy(0, 1)} style={dpadStyle()}>
            ▼
          </button>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", zIndex: 2000 }}>
          <div style={{ width: 340, maxWidth: "92%", background: p.path, padding: 16, borderRadius: 10, border: `3px solid ${p.accent}`, boxShadow: `0 0 40px ${p.accent}`, color: "#fff" }}>
            <div style={{ fontSize: 14, color: "#ffd86b", marginBottom: 8 }}>MISSION COMPLETE!</div>
            <div style={{ background: "#00000080", padding: 8, borderRadius: 8, fontSize: 11, lineHeight: 1.4 }}>
              <p>To: {RECIPIENT}</p>
              <p style={{ marginTop: 8 }}>Happy birthday, Sayang! 🎉</p>
              <p style={{ marginTop: 8 }}>Walau jauh, aku tetap cari jalannya sampai ketemu kamu. Semoga hari ini penuh kejutan manis.</p>
              <p style={{ textAlign: "right", marginTop: 8 }}>— {SENDER}</p>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
              <button onClick={() => { window.location.href = `https://wa.me/62812345678`; }} style={primaryBtnStyle(p)}>Call Me</button>
              <button onClick={() => { setShowModal(false); setWon(false); setPlayerGrid({ x: 1, y: 1 }); }} style={secondaryBtnStyle(p)}>Replay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
