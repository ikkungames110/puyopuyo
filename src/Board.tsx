import Puyo from './Puyo';
import { cells, landing, COLORS, type Board as BoardType, type Piece, type Cell } from './engine';
export default function Board({
  board,
  piece,
  highlight = [],
  target = [],
  onPaint,
  compact = false,
}: {
  board: BoardType;
  piece?: Piece | null;
  highlight?: Cell[];
  target?: Cell[];
  onPaint?: (x: number, y: number) => void;
  compact?: boolean;
}) {
  const active = piece ? cells(piece) : [];
  const ghost = piece ? landing(board, piece) : [];
  return (
    <div className={`board-wrap ${compact ? 'compact' : ''}`}>
      <div className="board-top-label">
        <span>FIELD</span>
        <span>6 × 12</span>
      </div>
      <div className="board" role="group" aria-label="ぷよぷよの盤面">
        {Array.from({ length: 12 }, (_, row) => {
          const y = 11 - row;
          return Array.from({ length: 6 }, (_, x) => {
            const a = active.find((c) => c.x === x && c.y === y);
            const g = ghost.find((c) => c.x === x && c.y === y);
            const t = target.find((c) => c.x === x && c.y === y);
            const color = a?.color || board[y][x] || g?.color || t?.color || 0;
            const isGhost = !a && !board[y][x] && !!(g || t);
            return (
              <button
                key={`${x}-${y}`}
                tabIndex={onPaint ? 0 : -1}
                className={`cell ${highlight.some((c) => c.x === x && c.y === y) ? 'clearing' : ''} ${t ? 'target-cell' : ''} ${a ? 'active-cell' : ''}`}
                aria-label={`${x + 1}列${y + 1}段 ${COLORS[color]}${isGhost ? ' 予定位置' : ''}`}
                onClick={() => onPaint?.(x, y)}
              >
                {color ? (
                  <Puyo color={color} ghost={isGhost} />
                ) : x === 2 && y === 11 ? (
                  <span className="death-mark">×</span>
                ) : null}
              </button>
            );
          });
        })}
      </div>
      <div className="column-labels">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      {board[12].some(Boolean) && (
        <div className="hidden-row">
          13段目:{' '}
          {board[12].map((c, i) => (
            <span key={i}>{c ? COLORS[c] : '·'}</span>
          ))}
        </div>
      )}
    </div>
  );
}
