let currentGameId = null;
let selectedPiece = null;
let validMoves = [];
let socket = null;

const PIECE_NAMES = {
    'r': {'k': '帅', 'a': '仕', 'b': '相', 'n': '马', 'r': '车', 'c': '炮', 'p': '兵'},
    'b': {'k': '将', 'a': '士', 'b': '象', 'n': '马', 'r': '车', 'c': '炮', 'p': '卒'}
};

function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('WebSocket 已连接');
    });
    
    socket.on('game_update', (data) => {
        if (data.game_id === currentGameId) {
            updateBoard(data);
            updateGameInfo(data);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('WebSocket 已断开');
    });
}

async function createGame() {
    const gameType = document.getElementById('gameType').value;
    
    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: gameType
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentGameId = data.game_id;
            document.getElementById('gameInfo').style.display = 'flex';
            document.getElementById('undoBtn').disabled = false;
            
            if (socket) {
                socket.emit('join_game', {game_id: currentGameId});
            }
            
            await loadGame(currentGameId);
        } else {
            alert('创建游戏失败：' + data.error);
        }
    } catch (error) {
        console.error('创建游戏失败:', error);
        alert('创建游戏失败，请检查服务器是否启动');
    }
}

async function loadGame(gameId) {
    try {
        const response = await fetch(`/api/games/${gameId}`);
        const data = await response.json();
        
        if (response.ok) {
            renderBoard(data.board);
            updateGameInfo(data);
        }
    } catch (error) {
        console.error('加载游戏失败:', error);
    }
}

function renderBoard(board) {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const piece = board[row][col];
            if (piece) {
                const pieceEl = document.createElement('div');
                pieceEl.className = `piece ${piece.color === 'r' ? 'red' : 'black'}`;
                pieceEl.textContent = PIECE_NAMES[piece.color][piece.type];
                pieceEl.dataset.row = row;
                pieceEl.dataset.col = col;
                pieceEl.onclick = (e) => {
                    e.stopPropagation();
                    onPieceClick(row, col, piece);
                };
                cell.appendChild(pieceEl);
            }
            
            if (selectedPiece) {
                if (validMoves.some(m => m[0] === row && m[1] === col)) {
                    cell.classList.add('highlight');
                }
            }
            
            cell.onclick = () => onCellClick(row, col);
            boardEl.appendChild(cell);
        }
    }
}

function updateBoard(data) {
    renderBoard(data.board);
    
    if (data.last_move) {
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            if ((row === data.last_move.from[0] && col === data.last_move.from[1]) ||
                (row === data.last_move.to[0] && col === data.last_move.to[1])) {
                cell.classList.add('last-move');
            }
        });
    }
}

function updateGameInfo(data) {
    const playerEl = document.getElementById('currentPlayer');
    const statusEl = document.getElementById('gameStatus');
    
    playerEl.textContent = `当前：${data.current_player === 'r' ? '红方' : '黑方'}`;
    playerEl.style.color = data.current_player === 'r' ? '#e74c3c' : '#000';
    
    if (data.game_over) {
        statusEl.textContent = data.winner === 'r' ? '红方获胜！' : '黑方获胜！';
    } else {
        statusEl.textContent = '';
    }
}

function onPieceClick(row, col, piece) {
    if (!currentGameId) return;
    
    const gameInfo = document.getElementById('currentPlayer');
    const isCurrentPlayer = (piece.color === 'r' && gameInfo.textContent.includes('红方')) ||
                           (piece.color === 'b' && gameInfo.textContent.includes('黑方'));
    
    if (!isCurrentPlayer) {
        if (selectedPiece) {
            makeMove(row, col);
            return;
        }
        return;
    }
    
    if (selectedPiece && selectedPiece[0] === row && selectedPiece[1] === col) {
        clearSelection();
        return;
    }
    
    selectedPiece = [row, col];
    calculateValidMoves(row, col, piece);
    renderWithSelection();
}

function onCellClick(row, col) {
    if (!currentGameId || !selectedPiece) return;
    
    if (validMoves.some(m => m[0] === row && m[1] === col)) {
        makeMove(row, col);
    } else {
        clearSelection();
    }
}

function calculateValidMoves(row, col, piece) {
    validMoves = [];
    
    const directions = {
        'r': [[0, 1], [0, -1], [1, 0], [-1, 0]],
        'n': [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
        'c': [[0, 1], [0, -1], [1, 0], [-1, 0]],
        'a': [[-1, -1], [-1, 1], [1, -1], [1, 1]],
        'k': [[0, 1], [0, -1], [1, 0], [-1, 0]],
        'p': [[-1, 0], [0, 1], [0, -1]],
        'b': [[-2, -2], [-2, 2], [2, -2], [2, 2]]
    };
    
    const dirs = directions[piece.type] || [];
    
    for (const [dr, dc] of dirs) {
        let nr = row + dr;
        let nc = col + dc;
        
        if (piece.type === 'n') {
            const legR = row + (dr / 2);
            const legC = col + (dc / 2);
            if (isBlocked(legR, legC)) continue;
        }
        
        if (piece.type === 'b') {
            const eyeR = row + (dr / 2);
            const eyeC = col + (dc / 2);
            if (isBlocked(eyeR, eyeC)) continue;
        }
        
        if (isValidPosition(nr, nc) && canMoveOrCapture(row, col, nr, nc, piece)) {
            validMoves.push([nr, nc]);
        }
        
        if (piece.type === 'r' || piece.type === 'c') {
            let steps = 1;
            while (true) {
                nr = row + dr * steps;
                nc = col + dc * steps;
                
                if (!isValidPosition(nr, nc)) break;
                
                const target = getPiece(nr, nc);
                if (!target) {
                    if (piece.type === 'r') {
                        validMoves.push([nr, nc]);
                    } else {
                        const boardEl = document.getElementById('board');
                        const count = countObstacles(row, col, nr, nc);
                        if (count === 0) {
                            validMoves.push([nr, nc]);
                        }
                    }
                } else {
                    if (piece.type === 'r') {
                        if (target.color !== piece.color) {
                            validMoves.push([nr, nc]);
                        }
                        break;
                    } else {
                        const count = countObstacles(row, col, nr, nc);
                        if (count === 1 && target.color !== piece.color) {
                            validMoves.push([nr, nc]);
                        }
                        break;
                    }
                }
                steps++;
            }
        }
    }
    
    if (piece.type === 'p') {
        if (piece.color === 'r' && row >= 5) {
            if (isValidPosition(row, col - 1)) validMoves.push([row, col - 1]);
            if (isValidPosition(row, col + 1)) validMoves.push([row, col + 1]);
        }
        if (piece.color === 'b' && row <= 4) {
            if (isValidPosition(row, col - 1)) validMoves.push([row, col - 1]);
            if (isValidPosition(row, col + 1)) validMoves.push([row, col + 1]);
        }
    }
    
    if (piece.type === 'a') {
        validMoves = validMoves.filter(([r, c]) => c >= 3 && c <= 5);
        if (piece.color === 'r') {
            validMoves = validMoves.filter(([r, c]) => r >= 7);
        } else {
            validMoves = validMoves.filter(([r, c]) => r <= 2);
        }
    }
    
    if (piece.type === 'b') {
        if (piece.color === 'r') {
            validMoves = validMoves.filter(([r, c]) => r >= 5);
        } else {
            validMoves = validMoves.filter(([r, c]) => r <= 4);
        }
    }
    
    if (piece.type === 'k') {
        validMoves = validMoves.filter(([r, c]) => c >= 3 && c <= 5);
        if (piece.color === 'r') {
            validMoves = validMoves.filter(([r, c]) => r >= 7);
        } else {
            validMoves = validMoves.filter(([r, c]) => r <= 2);
        }
    }
}

function isValidPosition(row, col) {
    return row >= 0 && row < 10 && col >= 0 && col < 9;
}

function isBlocked(row, col) {
    const boardEl = document.getElementById('board');
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    return cell && cell.querySelector('.piece');
}

function getPiece(row, col) {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        const pieceEl = cell.querySelector('.piece');
        if (pieceEl) {
            const color = pieceEl.classList.contains('red') ? 'r' : 'b';
            const text = pieceEl.textContent;
            const type = Object.keys(PIECE_NAMES['r']).find(k => 
                PIECE_NAMES['r'][k] === text || PIECE_NAMES['b'][k] === text
            );
            return {color, type};
        }
    }
    return null;
}

function canMoveOrCapture(fromRow, fromCol, toRow, toCol, piece) {
    const target = getPiece(toRow, toCol);
    if (!target) return true;
    return target.color !== piece.color;
}

function countObstacles(fromRow, fromCol, toRow, toCol) {
    let count = 0;
    if (fromRow === toRow) {
        const minCol = Math.min(fromCol, toCol);
        const maxCol = Math.max(fromCol, toCol);
        for (let c = minCol + 1; c < maxCol; c++) {
            if (getPiece(fromRow, c)) count++;
        }
    } else if (fromCol === toCol) {
        const minRow = Math.min(fromRow, toRow);
        const maxRow = Math.max(fromRow, toRow);
        for (let r = minRow + 1; r < maxRow; r++) {
            if (getPiece(r, fromCol)) count++;
        }
    }
    return count;
}

function renderWithSelection() {
    renderBoard(getCurrentBoard());
    
    if (selectedPiece) {
        const cell = document.querySelector(`.cell[data-row="${selectedPiece[0]}"][data-col="${selectedPiece[1]}"]`);
        if (cell) {
            const pieceEl = cell.querySelector('.piece');
            if (pieceEl) {
                pieceEl.classList.add('selected');
            }
        }
    }
    
    validMoves.forEach(([row, col]) => {
        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            cell.classList.add('highlight');
        }
    });
}

function getCurrentBoard() {
    const board = [];
    for (let row = 0; row < 10; row++) {
        board[row] = [];
        for (let col = 0; col < 9; col++) {
            const piece = getPiece(row, col);
            board[row][col] = piece;
        }
    }
    return board;
}

function clearSelection() {
    selectedPiece = null;
    validMoves = [];
    renderWithSelection();
}

async function makeMove(toRow, toCol) {
    if (!selectedPiece || !currentGameId) return;
    
    try {
        const response = await fetch(`/api/games/${currentGameId}/move`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: selectedPiece,
                to: [toRow, toCol]
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            clearSelection();
            await loadGame(currentGameId);
        } else {
            alert(data.message || '走棋失败');
        }
    } catch (error) {
        console.error('走棋失败:', error);
        alert('走棋失败，请检查网络连接');
    }
}

async function undoMove() {
    if (!currentGameId) return;
    
    try {
        const response = await fetch(`/api/games/${currentGameId}/undo`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            await loadGame(currentGameId);
        } else {
            alert(data.message || '悔棋失败');
        }
    } catch (error) {
        console.error('悔棋失败:', error);
    }
}

async function restartGame() {
    if (currentGameId) {
        await fetch(`/api/games/${currentGameId}`, {method: 'DELETE'});
    }
    currentGameId = null;
    selectedPiece = null;
    validMoves = [];
    document.getElementById('gameInfo').style.display = 'none';
    document.getElementById('undoBtn').disabled = true;
    document.getElementById('board').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
    initSocket();
    
    document.getElementById('gameType').addEventListener('change', (e) => {
        const undoBtn = document.getElementById('undoBtn');
        if (e.target.value === 'aivai') {
            undoBtn.disabled = true;
        } else {
            undoBtn.disabled = !currentGameId;
        }
    });
});
