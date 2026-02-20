let currentGameId = null;
let selectedPiece = null;
let validMoves = [];
let socket = null;
let sounds = {};
let soundEnabled = true;
let gameType = null;
let aiPaused = false;
let aivaiFirstMove = 'r'; // AIvAI 模式先手方，默认红方
let aiEnabled = {'r': false, 'b': false};  // AI 开关状态（自定义模式）
let pendingAiToggle = null;  // 待执行的 AI 切换

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
        btn.textContent = soundEnabled ? '🔊 音效' : '🔇 静音';
    }
}

function selectMode(mode, firstMove = 'r') {
    gameType = mode;
    aivaiFirstMove = firstMove;
    createGame();
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('aivaiMenu').style.display = 'none';
    document.getElementById('gameView').style.display = 'flex';
}

function showAivaiMenu() {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('aivaiMenu').style.display = 'flex';
}

function showMainMenu() {
    document.getElementById('aivaiMenu').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'flex';
}

function backToMenu() {
    if (currentGameId) {
        fetch(`/api/games/${currentGameId}`, {method: 'DELETE'}).catch(() => {});
    }
    
    // 自定义模式：返回摆子界面
    if (gameType === 'custom') {
        currentGameId = null;
        selectedPiece = null;
        validMoves = [];
        window.currentBoard = null;
        window.gameOver = false;
        aiPaused = false;
        aiEnabled = {'r': false, 'b': false};
        
        document.getElementById('gameView').style.display = 'none';
        document.getElementById('aiToggleButtons').style.display = 'none';
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('setupMenu').style.display = 'flex';
        return;
    }
    
    // 普通模式：返回主菜单
    currentGameId = null;
    selectedPiece = null;
    validMoves = [];
    window.currentBoard = null;
    window.gameOver = false;
    aiPaused = false;
    
    document.getElementById('gameView').style.display = 'none';
    document.getElementById('aivaiMenu').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'flex';
    document.getElementById('gameOverModal').style.display = 'none';
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
    
    for (let i = 0; i <= 9; i++) {
        if (i === 0 || i === 9) {
            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", BOARD_OFFSET_X);
            line.setAttribute("y1", BOARD_OFFSET_Y + i * CELL_SIZE);
            line.setAttribute("x2", BOARD_OFFSET_X + 8 * CELL_SIZE);
            line.setAttribute("y2", BOARD_OFFSET_Y + i * CELL_SIZE);
            line.setAttribute("stroke", "#5a3d2b");
            line.setAttribute("stroke-width", "1.5");
            g.appendChild(line);
        } else if (i < 5) {
            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", BOARD_OFFSET_X);
            line.setAttribute("y1", BOARD_OFFSET_Y + i * CELL_SIZE);
            line.setAttribute("x2", BOARD_OFFSET_X + 8 * CELL_SIZE);
            line.setAttribute("y2", BOARD_OFFSET_Y + i * CELL_SIZE);
            line.setAttribute("stroke", "#5a3d2b");
            line.setAttribute("stroke-width", "1.5");
            g.appendChild(line);
        } else {
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
    
    socket.on('game_over', (data) => {
        if (data.game_id === currentGameId || data.winner) {
            showGameOver(data);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('WebSocket 已断开');
    });
}

async function createGame() {
    window.gameOver = false;
    
    try {
        const postData = { type: gameType };
        if (gameType === 'aivai') {
            postData.first_move = aivaiFirstMove;
        }
        
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentGameId = data.game_id;
            
            if (socket) {
                socket.emit('join_game', {game_id: currentGameId});
            }
            
            createBoardSVG();
            await loadGame(currentGameId);
            updateButtons();
            
            const pauseBtn = document.getElementById('pauseBtn');
            if (gameType === 'aivai') {
                pauseBtn.style.display = 'inline-block';
                pauseBtn.textContent = '⏸️ 暂停';
                aiPaused = false;
            } else {
                pauseBtn.style.display = 'none';
            }
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
    const oldBoard = window.currentBoard;
    renderPieces(data.board);
    
    if (data.last_move) {
        const boardEl = document.getElementById('board');
        const { from, to } = data.last_move;
        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;
        
        const isCapture = oldBoard && oldBoard[fromRow][fromCol] && 
                          oldBoard[toRow][toCol] === null;
        
        const fromPos = getPiecePosition(fromRow, fromCol);
        const fromEl = document.createElement('div');
        fromEl.className = 'last-move-from';
        fromEl.style.left = fromPos.x + 'px';
        fromEl.style.top = fromPos.y + 'px';
        boardEl.appendChild(fromEl);
        
        const toPos = getPiecePosition(toRow, toCol);
        const toEl = document.createElement('div');
        toEl.className = 'last-move-to';
        toEl.style.left = toPos.x + 'px';
        toEl.style.top = toPos.y + 'px';
        boardEl.appendChild(toEl);
        
        const pieceEl = boardEl.querySelector(`.piece[data-row="${toRow}"][data-col="${toCol}"]`);
        if (pieceEl) {
            pieceEl.style.left = fromPos.x + 'px';
            pieceEl.style.top = fromPos.y + 'px';
            pieceEl.classList.add('moving');
            
            setTimeout(() => {
                pieceEl.style.left = toPos.x + 'px';
                pieceEl.style.top = toPos.y + 'px';
            }, 50);
            
            setTimeout(() => {
                pieceEl.classList.remove('moving');
            }, 350);
        }
        
        if (isCapture) {
            playSound('capture');
        } else {
            playSound('move');
        }
    }
}

function updateGameInfo(data) {
    const statusEl = document.getElementById('gameStatus');
    
    const currentPlayerText = data.current_player === 'r' ? '红方' : '黑方';
    statusEl.textContent = `当前：${currentPlayerText}`;
    statusEl.className = 'status-text ' + (data.current_player === 'r' ? 'red' : 'black');
    
    window.gameOver = data.game_over;
    
    if (data.game_over) {
        showGameOver(data);
    }
}

function showGameOver(data) {
    if (window.gameOverShown) return;
    window.gameOverShown = true;
    
    const modal = document.getElementById('gameOverModal');
    const textEl = document.getElementById('gameOverText');
    
    if (data.winner === 'draw') {
        textEl.textContent = '🤝 和棋！双方握手言和';
    } else if (data.winner) {
        const winnerText = data.winner === 'r' ? '红方' : '黑方';
        // 检查是否是认输情况
        if (data.reason && data.reason.includes('认输')) {
            textEl.textContent = `🏆 ${winnerText}获胜！（${data.reason}）`;
        } else {
            const reason = data.reason || '获胜';
            textEl.textContent = `🏆 ${winnerText}${reason}！`;
        }
    } else {
        textEl.textContent = '游戏结束';
    }
    
    modal.style.display = 'flex';
}

function onPieceClick(row, col, piece) {
    if (!currentGameId) return;
    
    if (gameType === 'aivai') {
        return;
    }
    
    if (window.gameOver) {
        return;
    }
    
    const statusEl = document.getElementById('gameStatus');
    const currentPlayer = statusEl.classList.contains('red') ? 'r' : 'b';
    
    if (!selectedPiece) {
        if (piece.color !== currentPlayer) {
            return;
        }
        playSound('click');
        selectedPiece = [row, col];
        calculateValidMoves(row, col, piece);
        renderPiecesWithSelection();
        return;
    }
    
    const selectedRow = selectedPiece[0];
    const selectedCol = selectedPiece[1];
    
    if (selectedRow === row && selectedCol === col) {
        clearSelection();
        return;
    }
    
    if (piece.color === currentPlayer) {
        playSound('click');
        selectedPiece = [row, col];
        calculateValidMoves(row, col, piece);
        renderPiecesWithSelection();
        return;
    }
    
    makeMove(row, col);
}

function calculateValidMoves(row, col, piece) {
    validMoves = [];
    
    const pawnDir = piece.color === 'r' ? -1 : 1;
    
    const directions = {
        'r': [[0, 1], [0, -1], [1, 0], [-1, 0]],
        'n': [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
        'c': [[0, 1], [0, -1], [1, 0], [-1, 0]],
        'a': [[-1, -1], [-1, 1], [1, -1], [1, 1]],
        'k': [[0, 1], [0, -1], [1, 0], [-1, 0]],
        'p': [[pawnDir, 0]],
        'b': [[-2, -2], [-2, 2], [2, -2], [2, 2]]
    };
    
    const dirs = directions[piece.type] || [];
    
    for (const [dr, dc] of dirs) {
        if (piece.type === 'r' || piece.type === 'c') {
            let steps = 1;
            let obstacleCount = 0;
            while (true) {
                const nr = row + dr * steps;
                const nc = col + dc * steps;
                
                if (!isValidPosition(nr, nc)) break;
                
                const target = getPieceAt(nr, nc);
                if (!target) {
                    if (piece.type === 'r') {
                        validMoves.push([nr, nc]);
                    } else {
                        if (obstacleCount === 0) {
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
                        if (obstacleCount === 1 && target.color !== piece.color) {
                            validMoves.push([nr, nc]);
                        }
                        obstacleCount++;
                        if (obstacleCount > 1) {
                            break;
                        }
                    }
                }
                steps++;
            }
        } else {
            let nr = row + dr;
            let nc = col + dc;
            
            if (piece.type === 'n') {
                const legR = row + (Math.abs(dr) === 2 ? Math.sign(dr) : 0);
                const legC = col + (Math.abs(dc) === 2 ? Math.sign(dc) : 0);
                if (isBlocked(legR, legC)) continue;
            }
            
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
    
    if (piece.type === 'p') {
        if ((piece.color === 'r' && row < 5) || (piece.color === 'b' && row > 4)) {
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
    if (!isValidPosition(row, col)) return false;
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
    // 自定义模式：返回摆子界面
    if (gameType === 'custom') {
        // 删除当前游戏
        if (currentGameId) {
            await fetch(`/api/games/${currentGameId}`, {method: 'DELETE'}).catch(() => {});
        }
        
        // 返回摆子界面
        document.getElementById('gameView').style.display = 'none';
        document.getElementById('aiToggleButtons').style.display = 'none';
        document.getElementById('setupMenu').style.display = 'flex';
        document.getElementById('gameOverModal').style.display = 'none';
        
        // 重置状态
        currentGameId = null;
        gameType = null;
        aiEnabled = {'r': false, 'b': false};
        window.gameOverShown = false;
        return;
    }
    
    // 普通模式：重开当前游戏
    if (currentGameId) {
        await fetch(`/api/games/${currentGameId}`, {method: 'DELETE'}).catch(() => {});
    }
    
    document.getElementById('gameOverModal').style.display = 'none';
    window.gameOverShown = false;
    
    currentGameId = null;
    selectedPiece = null;
    validMoves = [];
    window.currentBoard = null;
    window.gameOver = false;
    aiPaused = false;
    
    createBoardSVG();
    createGame();
}

async function togglePause() {
    if (!currentGameId || gameType !== 'aivai') return;
    
    const endpoint = aiPaused ? '/resume' : '/pause';
    try {
        const response = await fetch(`/api/games/${currentGameId}${endpoint}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            aiPaused = !aiPaused;
            const btn = document.getElementById('pauseBtn');
            btn.textContent = aiPaused ? '▶️ 继续' : '⏸️ 暂停';
        } else {
            alert(data.error || '操作失败');
        }
    } catch (error) {
        console.error('暂停/继续失败:', error);
    }
}

async function resignGame() {
    if (!currentGameId) return;
    
    if (!confirm('确定要认输吗？')) return;
    
    try {
        const response = await fetch(`/api/games/${currentGameId}/resign`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            window.gameOverShown = false;
            const resignerText = data.resigner === 'r' ? '红方' : '黑方';
            showGameOver({winner: data.winner, reason: `${resignerText}认输`});
        } else {
            alert(data.error || '认输失败');
        }
    } catch (error) {
        console.error('认输失败:', error);
    }
}

function updateButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const resignBtn = document.getElementById('resignBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    
    if (gameType === 'aivai') {
        undoBtn.style.display = 'none';
        resignBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-block';
    } else {
        undoBtn.style.display = 'inline-block';
        resignBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'none';
    }
}

// ========== 自定义模式 AI 切换 ==========

function toggleAiFromGame(color) {
    if (!currentGameId) {
        console.error('没有当前游戏 ID');
        return;
    }
    
    const enabled = !aiEnabled[color];
    console.log(`切换 AI: ${color === 'r' ? '红方' : '黑方'} => ${enabled ? '开' : '关'}`);
    
    // 立即切换
    applyAiToggle(color, enabled);
}

async function applyAiToggle(color, enabled) {
    try {
        const response = await fetch(`/api/games/${currentGameId}/ai-toggle`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({color, enabled})
        });
        
        const data = await response.json();
        
        if (response.ok) {
            aiEnabled[color] = enabled;
            updateAiButton(color, enabled);
        } else {
            alert(data.error || '切换失败');
        }
    } catch (error) {
        console.error('切换 AI 失败:', error);
    }
}

function updateAiButton(color, enabled) {
    const btn = document.getElementById(color === 'r' ? 'redAiBtn' : 'blackAiBtn');
    if (btn) {
        btn.textContent = `🤖 ${color === 'r' ? '红方' : '黑方'}AI: ${enabled ? '开' : '关'}`;
        btn.classList.toggle('active', enabled);
    }
}

// 应用待处理的 AI 切换
function applyPendingAiToggle() {
    if (pendingAiToggle) {
        applyAiToggle(pendingAiToggle.color, pendingAiToggle.enabled);
        pendingAiToggle = null;
    }
}

// 自定义模式初始化游戏
function initGameFromCustom(gameId, aiConfig, firstMove) {
    currentGameId = gameId;
    aiEnabled = aiConfig;
    
    // 更新 AI 按钮显示
    updateAiButton('r', aiEnabled.r);
    updateAiButton('b', aiEnabled.b);
    
    // 重新创建棋盘
    createBoardSVG();
    
    // 加载游戏
    loadGame(gameId);
}

document.addEventListener('DOMContentLoaded', () => {
    initSounds();
    initSocket();
    window.gameOverShown = false;
});
