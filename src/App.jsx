import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import "./App.css";

const MAZE_SIZE = 21;

// generate maze simple (DFS)
function generateMaze(size) {
  const maze = Array.from({ length: size }, () =>
    Array(size).fill(1)
  );

  function carve(x, y) {
    const dirs = [
      [0, 2],
      [0, -2],
      [2, 0],
      [-2, 0],
    ].sort(() => Math.random() - 0.5);

    dirs.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;

      if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1) {
        if (maze[ny][nx] === 1) {
          maze[ny - dy / 2][nx - dx / 2] = 0;
          maze[ny][nx] = 0;
          carve(nx, ny);
        }
      }
    });
  }

  maze[1][1] = 0;
  carve(1, 1);

  return maze;
}

export default function App() {
  const [maze, setMaze] = useState([]);
  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [goal] = useState({ x: MAZE_SIZE - 2, y: MAZE_SIZE - 2 });
  const [message, setMessage] = useState("");

  useEffect(() => {
    resetGame();
  }, []);

  function resetGame() {
    const newMaze = generateMaze(MAZE_SIZE);
    setMaze(newMaze);
    setPlayer({ x: 1, y: 1 });
    setMessage("");
  }

  function move(dx, dy) {
    const nx = player.x + dx;
    const ny = player.y + dy;

    if (maze[ny][nx] === 0) {
      setPlayer({ x: nx, y: ny });

      if (nx === goal.x && ny === goal.y) {
        triggerWin();
      }
    }
  }

  function triggerWin() {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.4 },
    });

    setMessage(`
  Happiest b'day, mchan!🎁💖 <br><br>
  sebelumnya maaf banget aku udah terlanjur namain projectnya 21thmchan
  padahal kamu baru 20 tahun (maaf banget) (sekali lagi maaf) 
  click <a href="https://www.circularbit.com/rewritetext/livetext/119136/0" target="_blank">this</a> for longer message. maaf juga kalo warnanya neon menyala
  <br><br>
  crafted with 💖, nad.
`);
///janlup url-nya diganti ya hehe
  }

  return (
    <div className="container">
      <h1 className="title">udah gede, ambil kado sendiri yak</h1>

      {message && (
        <div className="popup">
          <p dangerouslySetInnerHTML={{ __html: message }} />
          <button onClick={resetGame}>Main Lagi</button>
        </div>
      )}

      <div className="maze"> 
        {maze.map((row, y) =>
          row.map((cell, x) => {
            const isPlayer = player.x === x && player.y === y;
            const isGoal = goal.x === x && goal.y === y;

            return (
              <div
                key={`${x}-${y}`}
                className={
                  isPlayer
                    ? "cell player"
                    : isGoal
                    ? "cell goal"
                    : cell === 1
                    ? "cell wall"
                    : "cell path" 
                }
              />
            );
          })
        )}
      </div>

      <div className="controls">  
        <button onClick={() => move(0, -1)}>▲</button>
        <div className="middle">
          <button onClick={() => move(-1, 0)}>◀</button>
          <button onClick={() => move(1, 0)}>▶</button>
        </div>
        <button onClick={() => move(0, 1)}>▼</button>
      </div>

      <button className="newMazeBtn" onClick={resetGame}>
        New Maze
      </button>
    </div>
  );
}
