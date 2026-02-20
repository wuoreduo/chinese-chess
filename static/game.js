let currentGameId = null;
let selectedPiece = null;
let validMoves = [];
let socket = null;
let sounds = {};
let soundEnabled = true;

const CELL_SIZE = 50;
const BOARD_OFFSET_X = 25;
const BOARD_OFFSET_Y = 25;

const PIECE_NAMES = {
    'r': {'k': '帅', 'a': '仕', 'b': '相', 'n': '马', 'r': '车', 'c': '炮', 'p': '兵'},
    'b': {'k': '将', 'a': '士', 'b': '象', 'n': '马', 'r': '车', 'c': '炮', 'p': '卒'}
};

function initSounds() {
    sounds = {
        click: new Audio('/sounds/click.wav'),
        move: new Audio('/sounds/move.wav'),
        capture: new Audio('/sounds/capture.wav'),
        check: new Audio('/sounds/check.wav')
    };
    
    Object.values(sounds).forEach(audio => {
        audio.volume = 0.6;
    });
}

function playSound(name) {
    if (!soundEnabled || !sounds[name]) return;
    
    const sound = sounds[name].cloneNode();
    sound.volume = 0.6;
    sound.play().catch(() => {});
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundBtn');
    if (btn) {
        btn.textContent = soundEnabled ? '🔊 音效：开' : '🔇 音效：关';
    }
}

function createBoardSVG() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 450 500");
    
    const board = document.getElementById('board');
    board.innerHTML = '';
    board.appendChild(svg);
    
    const g = document.createElementNS(svgNS, "g");
    svg.appendChild(g);
    
    // 绘制竖线 - 全部贯通（包括楚河汉界）
    for (let i = 0; i <= 8; i++) {
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", BOARD_OFFSET_X + i * CELL_SIZE);
        line.setAttribute("y1", BOARD_OFFSET_Y);
        line.setAttribute("x2", BOARD_OFFSET_X + i * CELL_SIZE);
        line.setAttribute("y2", BOARD_OFFSET_Y + 9 * CELL_SIZE);
        line.setAttribute("stroke", "#5a3d2b");
        line.setAttribute("stroke-width", "1.5");
        g.appendChild(line);
    }
    
    // 绘制横线
    for (let i = 0; i <= 9; i++) {
        if (i === 0 || i === 9) {
            // 最上和最下的横线 - 贯通整个棋盘
            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", BOARD_OFFSET_X);
            line.setAttribute("y1", BOARD_OFFSET_Y + i * CELL_SIZE);
            line.setAttribute("x2", BOARD_OFFSET_X + 8 * CELL_SIZE);
            line.setAttribute("y2", BOARD_OFFSET_Y + i * CELL_SIZE);
            line.setAttribute("stroke", "#5a3d2b");
            line.setAttribute("stroke-width", "1.5");
            g.appendChild(line);
        } else if (i < 5) {
            // 上半区域横线（第 1-4 行）- 贯通
            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", BOARD_OFFSET_X);
            line.setAttribute("y1", BOARD_OFFSET_Y + i * CELL_SIZE);
            line.setAttribute("x2", BOARD_OFFSET_X + 8 * CELL_SIZE);
            line.setAttribute("y2", BOARD_OFFSET_Y + i * CELL_SIZE);
            line.setAttribute("stroke", "#5a3d2b");
            line.setAttribute("stroke-width", "1.5");
            g.appendChild(line);
        } else {
            // 下半区域横线（第 6-8 行）- 贯通
            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", BOARD_OFFSET_X);
            line.setAttribute("y1", BOARD_OFFSET_Y + i * CELL_SIZE);
            line.setAttribute("x2", BOARD_OFFSET_X + 8 * CELL_SIZE);
            line.setAttribute("y2", BOARD_OFFSET_Y + i * CELL_SIZE);
            line.setAttribute("stroke", "#5a3d2b");
            line.setAttribute("stroke-width", "1.5");
            g.appendChild(line);
        }
    }
    
    const palaceTop = document.createElementNS(svgNS, "line");
    palaceTop.setAttribute("x1", BOARD_OFFSET_X + 3 * CELL_SIZE);
    palaceTop.setAttribute("y1", BOARD_OFFSET_Y);
    palaceTop.setAttribute("x2", BOARD_OFFSET_X + 5 * CELL_SIZE);
    palaceTop.setAttribute("y2", BOARD_OFFSET_Y + 2 * CELL_SIZE);
    palaceTop.setAttribute("stroke", "#5a3d2b");
    palaceTop.setAttribute("stroke-width", "1.5");
    g.appendChild(palaceTop);
    
    const palaceBottom = document.createElementNS(svgNS, "line");
    palaceBottom.setAttribute("x1", BOARD_OFFSET_X + 5 * CELL_SIZE);
    palaceBottom.setAttribute("y1", BOARD_OFFSET_Y);
    palaceBottom.setAttribute("x2", BOARD_OFFSET_X + 3 * CELL_SIZE);
    palaceBottom.setAttribute("y2", BOARD_OFFSET_Y + 2 * CELL_SIZE);
    palaceBottom.setAttribute("stroke", "#5a3d2b");
    palaceBottom.setAttribute("stroke-width", "1.5");
    g.appendChild(palaceBottom);
    
    const palaceTop2 = document.createElementNS(svgNS, "line");
    palaceTop2.setAttribute("x1", BOARD_OFFSET_X + 3 * CELL_SIZE);
    palaceTop2.setAttribute("y1", BOARD_OFFSET_Y + 7 * CELL_SIZE);
    palaceTop2.setAttribute("x2", BOARD_OFFSET_X + 5 * CELL_SIZE);
    palaceTop2.setAttribute("y2", BOARD_OFFSET_Y + 9 * CELL_SIZE);
    palaceTop2.setAttribute("stroke", "#5a3d2b");
    palaceTop2.setAttribute("stroke-width", "1.5");
    g.appendChild(palaceTop2);
    
    const palaceBottom2 = document.createElementNS(svgNS, "line");
    palaceBottom2.setAttribute("x1", BOARD_OFFSET_X + 5 * CELL_SIZE);
    palaceBottom2.setAttribute("y1", BOARD_OFFSET_Y + 7 * CELL_SIZE);
    palaceBottom2.setAttribute("x2", BOARD_OFFSET_X + 3 * CELL_SIZE);
    palaceBottom2.setAttribute("y2", BOARD_OFFSET_Y + 9 * CELL_SIZE);
    palaceBottom2.setAttribute("stroke", "#5a3d2b");
    palaceBottom2.setAttribute("stroke-width", "1.5");
    g.appendChild(palaceBottom2);
    
    const riverText = document.createElementNS(svgNS, "text");
    riverText.setAttribute("x", BOARD_OFFSET_X + 4 * CELL_SIZE);
    riverText.setAttribute("y", BOARD_OFFSET_Y + 4.75 * CELL_SIZE);
    riverText.setAttribute("text-anchor", "middle");
    riverText.setAttribute("fill", "#5a3d2b");
    riverText.setAttribute("font-size", "22");
    riverText.setAttribute("font-family", "Microsoft YaHei, sans-serif");
    riverText.setAttribute("letter-spacing", "15");
    riverText.textContent = "楚 河        汉 界";
    g.appendChild(riverText);
    
    const starPositions = [
        [1, 2], [7, 2],
        [0, 3], [2, 3], [4, 3], [6, 3], [8, 3],
        [1, 7], [7, 7],
        [0, 6], [2, 6], [4, 6], [6, 6], [8, 6]
    ];
    
    starPositions.forEach(([col, row]) => {
        const x = BOARD_OFFSET_X + col * CELL_SIZE;
        const y = BOARD_OFFSET_Y + row * CELL_SIZE;
        const size = 8;
        const gap = 5;
        
        const makeCorner = (cx, cy, dx, dy) => {
            const line1 = document.createElementNS(svgNS, "line");
            line1.setAttribute("x1", cx - gap * dx);
            line1.setAttribute("y1", cy - gap * dy);
            line1.setAttribute("x2", cx - size * dx);
            line1.setAttribute("y2", cy - gap * dy);
            line1.setAttribute("stroke", "#5a3d2b");
            line1.setAttribute("stroke-width", "1.5");
            g.appendChild(line1);
            
            const line2 = document.createElementNS(svgNS, "line");
            line2.setAttribute("x1", cx - gap * dx);
            line2.setAttribute("y1", cy - gap * dy);
            line2.setAttribute("x2", cx - gap * dx);
            line2.setAttribute("y2", cy - size * dy);
            line2.setAttribute("stroke", "#5a3d2b");
            line2.setAttribute("stroke-width", "1.5");
            g.appendChild(line2);
        };
        
        if (col > 0) {
            makeCorner(x, y, 1, 1);
            makeCorner(x, y, 1, -1);
        }
        if (col < 8) {
            makeCorner(x, y, -1, 1);
            makeCorner(x, y, -1, -1);
        }
    });
    
    return svg;
}

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
            
            createBoardSVG();
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
            renderPieces(data.board);
            updateGameInfo(data);
        }
    } catch (error) {
        console.error('加载游戏失败:', error);
    }
}

function getPiecePosition(row, col) {
    return {
        x: BOARD_OFFSET_X + col * CELL_SIZE,
        y: BOARD_OFFSET_Y + row * CELL_SIZE
    };
}

function renderPieces(board) {
    const boardEl = document.getElementById('board');
    
    window.currentBoard = board;
    
    boardEl.querySelectorAll('.piece, .move-indicator, .last-move-from, .last-move-to').forEach(el => el.remove());
    
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = board[row][col];
            if (piece) {
                const pos = getPiecePosition(row, col);
                const pieceEl = document.createElement('div');
                pieceEl.className = `piece ${piece.color === 'r' ? 'red' : 'black'}`;
                pieceEl.textContent = PIECE_NAMES[piece.color][piece.type];
                pieceEl.style.left = pos.x + 'px';
                pieceEl.style.top = pos.y + 'px';
                pieceEl.dataset.row = row;
                pieceEl.dataset.col = col;
                pieceEl.onclick = (e) => {
                    e.stopPropagation();
                    onPieceClick(row, col, piece);
                };
                boardEl.appendChild(pieceEl);
            }
        }
    }
    
    if (selectedPiece) {
        highlightSelected();
        showValidMoves();
    }
}

function updateBoard(data) {
    renderPieces(data.board);
    
    if (data.last_move) {
        const boardEl = document.getElementById('board');
        
        const fromPos = getPiecePosition(data.last_move.from[0], data.last_move.from[1]);
        const fromEl = document.createElement('div');
        fromEl.className = 'last-move-from';
        fromEl.style.left = fromPos.x + 'px';
        fromEl.style.top = fromPos.y + 'px';
        boardEl.appendChild(fromEl);
        
        const toPos = getPiecePosition(data.last_move.to[0], data.last_move.to[1]);
        const toEl = document.createElement('div');
        toEl.className = 'last-move-to';
        toEl.style.left = toPos.x + 'px';
        toEl.style.top = toPos.y + 'px';
        boardEl.appendChild(toEl);
    }
}

function updateGameInfo(data) {
    const playerEl = document.getElementById('currentPlayer');
    const statusEl = document.getElementById('gameStatus');
    
    const wasInCheck = window.lastInCheck;
    window.lastInCheck = data.in_check;
    
    playerEl.textContent = `当前：${data.current_player === 'r' ? '红方' : '黑方'}`;
    playerEl.className = data.current_player === 'r' ? 'red' : 'black';
    
    if (data.game_over) {
        statusEl.textContent = data.winner === 'r' ? '红方获胜！' : '黑方获胜！';
    } else if (data.in_check && !wasInCheck) {
        statusEl.textContent = data.current_player === 'r' ? '红方被将军！' : '黑方被将军！';
        playSound('check');
    } else {
        statusEl.textContent = '';
    }
}

function onPieceClick(row, col, piece) {
    if (!currentGameId) return;
    
    const gameInfo = document.getElementById('currentPlayer');
    const currentPlayer = gameInfo.classList.contains('red') ? 'r' : 'b';
    
    // 如果当前没有选中棋子，且点击的是己方棋子
    if (!selectedPiece) {
        if (piece.color !== currentPlayer) {
            return; // 不能选对方的棋子
        }
        playSound('click');
        selectedPiece = [row, col];
        calculateValidMoves(row, col, piece);
        renderPiecesWithSelection();
        return;
    }
    
    // 如果已经选中了棋子
    const selectedRow = selectedPiece[0];
    const selectedCol = selectedPiece[1];
    const selectedPieceObj = window.currentBoard[selectedRow][selectedCol];
    
    // 如果点击的是同一个棋子，取消选中
    if (selectedRow === row && selectedCol === col) {
        clearSelection();
        return;
    }
    
    // 如果点击的是己方其他棋子，切换选中
    if (piece.color === currentPlayer) {
        playSound('click');
        selectedPiece = [row, col];
        calculateValidMoves(row, col, piece);
        renderPiecesWithSelection();
        return;
    }
    
    // 如果点击的是对方棋子，尝试吃子
    makeMove(row, col);
}

function calculateValidMoves(row, col, piece) {
    validMoves = [];
    
    // 兵的方向：红兵向上（-1），黑卒向下（+1）
    const pawnDir = piece.color === 'r' ? -1 : 1;
    
    const directions = {
        'r': [[0, 1], [0, -1], [1, 0], [-1, 0]],
        'n': [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
        'c': [[0, 1], [0, -1], [1, 0], [-1, 0]],
        'a': [[-1, -1], [-1, 1], [1, -1], [1, 1]],
        'k': [[0, 1], [0, -1], [1, 0], [-1, 0]],
        'p': [[pawnDir, 0]], // 兵/卒只能向前走
        'b': [[-2, -2], [-2, 2], [2, -2], [2, 2]]
    };
    
    const dirs = directions[piece.type] || [];
    
    for (const [dr, dc] of dirs) {
        if (piece.type === 'r' || piece.type === 'c') {
            // 车/炮：沿方向一直走
            let steps = 1;
            while (true) {
                const nr = row + dr * steps;
                const nc = col + dc * steps;
                
                if (!isValidPosition(nr, nc)) break;
                
                const target = getPieceAt(nr, nc);
                if (!target) {
                    if (piece.type === 'r') {
                        validMoves.push([nr, nc]);
                    } else {
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
        } else {
            // 其他棋子：只走一步
            let nr = row + dr;
            let nc = col + dc;
            
            // 马：检查马腿
            if (piece.type === 'n') {
                const legR = row + (Math.abs(dr) === 2 ? Math.sign(dr) : 0);
                const legC = col + (Math.abs(dc) === 2 ? Math.sign(dc) : 0);
                if (isBlocked(legR, legC)) continue;
            }
            
            // 象：检查象眼
            if (piece.type === 'b') {
                const eyeR = row + Math.sign(dr);
                const eyeC = col + Math.sign(dc);
                if (isBlocked(eyeR, eyeC)) continue;
            }
            
            if (isValidPosition(nr, nc) && canMoveOrCapture(row, col, nr, nc, piece)) {
                validMoves.push([nr, nc]);
            }
        }
    }
    
    // 兵/卒过河后可以横走
    if (piece.type === 'p') {
        // 红兵过河（row < 5）或黑卒过河（row > 4）可以横走
        if ((piece.color === 'r' && row < 5) || (piece.color === 'b' && row > 4)) {
            if (isValidPosition(row, col - 1)) validMoves.push([row, col - 1]);
            if (isValidPosition(row, col + 1)) validMoves.push([row, col + 1]);
        }
    }
    
    // 仕/士：限制在九宫格内
    if (piece.type === 'a') {
        validMoves = validMoves.filter(([r, c]) => c >= 3 && c <= 5);
        if (piece.color === 'r') {
            validMoves = validMoves.filter(([r, c]) => r >= 7);
        } else {
            validMoves = validMoves.filter(([r, c]) => r <= 2);
        }
    }
    
    // 相/象：限制在己方半场
    if (piece.type === 'b') {
        if (piece.color === 'r') {
            validMoves = validMoves.filter(([r, c]) => r >= 5);
        } else {
            validMoves = validMoves.filter(([r, c]) => r <= 4);
        }
    }
    
    // 将/帅：限制在九宫格内
    if (piece.type === 'k') {
        validMoves = validMoves.filter(([r, c]) => c >= 3 && c <= 5);
        if (piece.color === 'r') {
            validMoves = validMoves.filter(([r, c]) => r >= 7 && r <= 9);
        } else {
            validMoves = validMoves.filter(([r, c]) => r >= 0 && r <= 2);
        }
    }
}

function isValidPosition(row, col) {
    return row >= 0 && row < 10 && col >= 0 && col < 9;
}

function isBlocked(row, col) {
    if (!isValidPosition(row, col)) return false; // 棋盘外不算阻挡
    return getPieceAt(row, col) !== null;
}

function getPieceAt(row, col) {
    if (!currentGameId) return null;
    return window.currentBoard ? window.currentBoard[row][col] : null;
}

function canMoveOrCapture(fromRow, fromCol, toRow, toCol, piece) {
    const target = getPieceAt(toRow, toCol);
    if (!target) return true;
    return target.color !== piece.color;
}

function countObstacles(fromRow, fromCol, toRow, toCol) {
    let count = 0;
    if (fromRow === toRow) {
        const minCol = Math.min(fromCol, toCol);
        const maxCol = Math.max(fromCol, toCol);
        for (let c = minCol + 1; c < maxCol; c++) {
            if (getPieceAt(fromRow, c)) count++;
        }
    } else if (fromCol === toCol) {
        const minRow = Math.min(fromRow, toRow);
        const maxRow = Math.max(fromRow, toRow);
        for (let r = minRow + 1; r < maxRow; r++) {
            if (getPieceAt(r, fromCol)) count++;
        }
    }
    return count;
}

function highlightSelected() {
    if (!selectedPiece) return;
    
    const boardEl = document.getElementById('board');
    const pieceEl = boardEl.querySelector(`.piece[data-row="${selectedPiece[0]}"][data-col="${selectedPiece[1]}"]`);
    if (pieceEl) {
        pieceEl.classList.add('selected');
    }
}

function showValidMoves() {
    const boardEl = document.getElementById('board');
    
    validMoves.forEach(([row, col]) => {
        const pos = getPiecePosition(row, col);
        const indicator = document.createElement('div');
        indicator.className = 'move-indicator';
        indicator.style.left = pos.x + 'px';
        indicator.style.top = pos.y + 'px';
        indicator.dataset.row = row;
        indicator.dataset.col = col;
        indicator.onclick = () => makeMove(row, col);
        boardEl.appendChild(indicator);
    });
}

function renderPiecesWithSelection() {
    renderPieces(window.currentBoard || []);
}

function clearSelection() {
    selectedPiece = null;
    validMoves = [];
    renderPiecesWithSelection();
}

async function makeMove(toRow, toCol) {
    if (!selectedPiece || !currentGameId) return;
    
    const fromRow = selectedPiece[0];
    const fromCol = selectedPiece[1];
    const targetPiece = window.currentBoard ? window.currentBoard[toRow][toCol] : null;
    
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
            if (targetPiece) {
                playSound('capture');
            } else {
                playSound('move');
            }
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
    window.currentBoard = null;
    document.getElementById('gameInfo').style.display = 'none';
    document.getElementById('undoBtn').disabled = true;
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
    initSounds();
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
