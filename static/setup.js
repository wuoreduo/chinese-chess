/**
 * 中国象棋 - 摆子模式逻辑
 */

// 摆子状态
let setupMode = false;
let selectedPoolPiece = null;  // 从棋子池选中的棋子 {color, type, name}
let selectedBoardPiece = null; // 从棋盘选中的棋子 {row, col, color, type}
let setupBoardState = [];      // 当前棋盘状态
let setupModeConfig = {
    ai_config: {'r': false, 'b': false},
    first_move: 'r'
};

// 棋子数据
const PIECE_DATA = {
    'r': [
        {type: 'k', name: '帅', count: 1},
        {type: 'a', name: '仕', count: 2},
        {type: 'b', name: '相', count: 2},
        {type: 'n', name: '马', count: 2},
        {type: 'r', name: '车', count: 2},
        {type: 'c', name: '炮', count: 2},
        {type: 'p', name: '兵', count: 5}
    ],
    'b': [
        {type: 'k', name: '将', count: 1},
        {type: 'a', name: '士', count: 2},
        {type: 'b', name: '象', count: 2},
        {type: 'n', name: '马', count: 2},
        {type: 'r', name: '车', count: 2},
        {type: 'c', name: '炮', count: 2},
        {type: 'p', name: '卒', count: 5}
    ]
};

// 位置验证规则（前端版本）
const POSITION_RULES = {
    'r': {
        'k': {min_row: 7, max_row: 9, min_col: 3, max_col: 5},
        'a': {fixed: [[7,3], [7,5], [8,4], [9,3], [9,5]]},
        'b': {fixed: [[5,2], [5,6], [7,0], [7,4], [7,8], [9,2], [9,6]]},
        'p': {home_cols: [0,2,4,6,8], home_row_min: 5},
        'n': {any: true},
        'r': {any: true},
        'c': {any: true}
    },
    'b': {
        'k': {min_row: 0, max_row: 2, min_col: 3, max_col: 5},
        'a': {fixed: [[0,3], [0,5], [1,4], [2,3], [2,5]]},
        'b': {fixed: [[0,2], [0,6], [2,0], [2,4], [2,8], [4,2], [4,6]]},
        'p': {home_cols: [0,2,4,6,8], home_row_max: 4},
        'n': {any: true},
        'r': {any: true},
        'c': {any: true}
    }
};

// 初始化摆子模式
function initSetupMode() {
    setupMode = true;
    selectedPoolPiece = null;
    selectedBoardPiece = null;
    setupBoardState = [];
    
    // 创建棋盘
    createSetupBoard();
    
    // 初始化棋子池
    initPiecePools();
    
    // 加载初始局面
    resetToInitial();
}

// 创建摆子棋盘
function createSetupBoard() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 450 500");
    
    const board = document.getElementById('setupBoard');
    board.innerHTML = '';
    board.appendChild(svg);
    
    const g = document.createElementNS(svgNS, "g");
    svg.appendChild(g);
    
    // 绘制棋盘线（与 game.js 相同）
    drawBoardLines(g, svgNS);
    
    // 绑定点击事件
    board.onclick = onSetupBoardClick;
}

// 绘制棋盘线
function drawBoardLines(group, svgNS) {
    const CELL_SIZE = 50;
    const BOARD_OFFSET_X = 25;
    const BOARD_OFFSET_Y = 25;
    
    // 竖线
    for (let i = 0; i <= 8; i++) {
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", BOARD_OFFSET_X + i * CELL_SIZE);
        line.setAttribute("y1", BOARD_OFFSET_Y);
        line.setAttribute("x2", BOARD_OFFSET_X + i * CELL_SIZE);
        line.setAttribute("y2", BOARD_OFFSET_Y + 9 * CELL_SIZE);
        line.setAttribute("stroke", "#5a3d2b");
        line.setAttribute("stroke-width", "1.5");
        group.appendChild(line);
    }
    
    // 横线
    for (let i = 0; i <= 9; i++) {
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", BOARD_OFFSET_X);
        line.setAttribute("y1", BOARD_OFFSET_Y + i * CELL_SIZE);
        line.setAttribute("x2", BOARD_OFFSET_X + 8 * CELL_SIZE);
        line.setAttribute("y2", BOARD_OFFSET_Y + i * CELL_SIZE);
        line.setAttribute("stroke", "#5a3d2b");
        line.setAttribute("stroke-width", "1.5");
        group.appendChild(line);
    }
    
    // 九宫斜线
    drawPalaceLines(group, svgNS, BOARD_OFFSET_X, BOARD_OFFSET_Y, CELL_SIZE);
    
    // 楚河汉界
    drawRiver(group, svgNS, BOARD_OFFSET_X, BOARD_OFFSET_Y, CELL_SIZE);
    
    // 炮位标记
    drawStarMarkers(group, svgNS, BOARD_OFFSET_X, BOARD_OFFSET_Y, CELL_SIZE);
}

function drawPalaceLines(group, svgNS, offsetX, offsetY, cellSize) {
    const palaceTop = document.createElementNS(svgNS, "line");
    palaceTop.setAttribute("x1", offsetX + 3 * cellSize);
    palaceTop.setAttribute("y1", offsetY);
    palaceTop.setAttribute("x2", offsetX + 5 * cellSize);
    palaceTop.setAttribute("y2", offsetY + 2 * cellSize);
    palaceTop.setAttribute("stroke", "#5a3d2b");
    palaceTop.setAttribute("stroke-width", "1.5");
    group.appendChild(palaceTop);
    
    const palaceBottom = document.createElementNS(svgNS, "line");
    palaceBottom.setAttribute("x1", offsetX + 5 * cellSize);
    palaceBottom.setAttribute("y1", offsetY);
    palaceBottom.setAttribute("x2", offsetX + 3 * cellSize);
    palaceBottom.setAttribute("y2", offsetY + 2 * cellSize);
    palaceBottom.setAttribute("stroke", "#5a3d2b");
    palaceBottom.setAttribute("stroke-width", "1.5");
    group.appendChild(palaceBottom);
    
    const palaceTop2 = document.createElementNS(svgNS, "line");
    palaceTop2.setAttribute("x1", offsetX + 3 * cellSize);
    palaceTop2.setAttribute("y1", offsetY + 7 * cellSize);
    palaceTop2.setAttribute("x2", offsetX + 5 * cellSize);
    palaceTop2.setAttribute("y2", offsetY + 9 * cellSize);
    palaceTop2.setAttribute("stroke", "#5a3d2b");
    palaceTop2.setAttribute("stroke-width", "1.5");
    group.appendChild(palaceTop2);
    
    const palaceBottom2 = document.createElementNS(svgNS, "line");
    palaceBottom2.setAttribute("x1", offsetX + 5 * cellSize);
    palaceBottom2.setAttribute("y1", offsetY + 7 * cellSize);
    palaceBottom2.setAttribute("x2", offsetX + 3 * cellSize);
    palaceBottom2.setAttribute("y2", offsetY + 9 * cellSize);
    palaceBottom2.setAttribute("stroke", "#5a3d2b");
    palaceBottom2.setAttribute("stroke-width", "1.5");
    group.appendChild(palaceBottom2);
}

function drawRiver(group, svgNS, offsetX, offsetY, cellSize) {
    const riverText = document.createElementNS(svgNS, "text");
    riverText.setAttribute("x", offsetX + 4 * cellSize);
    riverText.setAttribute("y", offsetY + 4.75 * cellSize);
    riverText.setAttribute("text-anchor", "middle");
    riverText.setAttribute("fill", "#5a3d2b");
    riverText.setAttribute("font-size", "22");
    riverText.setAttribute("font-family", "Microsoft YaHei, sans-serif");
    riverText.setAttribute("letter-spacing", "15");
    riverText.textContent = "楚 河        汉 界";
    group.appendChild(riverText);
}

function drawStarMarkers(group, svgNS, offsetX, offsetY, cellSize) {
    const starPositions = [
        [1, 2], [7, 2],
        [0, 3], [2, 3], [4, 3], [6, 3], [8, 3],
        [1, 7], [7, 7],
        [0, 6], [2, 6], [4, 6], [6, 6], [8, 6]
    ];
    
    starPositions.forEach(([col, row]) => {
        const x = offsetX + col * cellSize;
        const y = offsetY + row * cellSize;
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
            group.appendChild(line1);
            
            const line2 = document.createElementNS(svgNS, "line");
            line2.setAttribute("x1", cx - gap * dx);
            line2.setAttribute("y1", cy - gap * dy);
            line2.setAttribute("x2", cx - gap * dx);
            line2.setAttribute("y2", cy - size * dy);
            line2.setAttribute("stroke", "#5a3d2b");
            line2.setAttribute("stroke-width", "1.5");
            group.appendChild(line2);
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
}

// 初始化棋子池
function initPiecePools() {
    initPiecePool('r', 'redPiecePool');
    initPiecePool('b', 'blackPiecePool');
}

function initPiecePool(color, elementId) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    
    PIECE_DATA[color].forEach(piece => {
        const pieceEl = document.createElement('div');
        pieceEl.className = `piece-in-pool ${color === 'r' ? 'red' : 'black'}`;
        pieceEl.textContent = piece.name;
        pieceEl.dataset.color = color;
        pieceEl.dataset.type = piece.type;
        pieceEl.dataset.count = piece.count;
        pieceEl.onclick = (e) => onPoolPieceClick(e, color, piece.type, piece.name);
        container.appendChild(pieceEl);
    });
}

// 棋子池点击事件
function onPoolPieceClick(e, color, type, name) {
    // 清除棋盘选中
    clearBoardSelection();
    
    // 选中棋子池棋子
    document.querySelectorAll('.piece-in-pool').forEach(el => el.classList.remove('selected'));
    
    selectedPoolPiece = {color, type, name};
    e.target.classList.add('selected');
    
    // 高亮显示合法位置
    highlightValidPositions(type, color);
}

// 棋盘点击事件
function onSetupBoardClick(e) {
    const board = document.getElementById('setupBoard');
    const rect = board.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 计算点击的是哪个格子
    const CELL_SIZE = 50;
    const BOARD_OFFSET_X = 25;
    const BOARD_OFFSET_Y = 25;
    
    const col = Math.round((x - BOARD_OFFSET_X) / CELL_SIZE);
    const row = Math.round((y - BOARD_OFFSET_Y) / CELL_SIZE);
    
    if (row < 0 || row > 9 || col < 0 || col > 8) return;
    
    // 检查该位置是否有棋子
    const existingIndex = setupBoardState.findIndex(p => p.row === row && p.col === col);
    
    if (selectedPoolPiece) {
        // 放置棋子
        if (existingIndex >= 0) {
            // 已有棋子，替换
            setupBoardState[existingIndex] = {
                row, col,
                color: selectedPoolPiece.color,
                type: selectedPoolPiece.type
            };
        } else {
            // 新放置
            setupBoardState.push({
                row, col,
                color: selectedPoolPiece.color,
                type: selectedPoolPiece.type
            });
        }
        
        renderSetupBoard();
        clearPoolSelection();
    } else if (existingIndex >= 0) {
        // 选中棋盘上的棋子
        const piece = setupBoardState[existingIndex];
        selectBoardPiece(row, col, piece);
    }
}

// 选中棋盘上的棋子
function selectBoardPiece(row, col, piece) {
    clearBoardSelection();
    
    selectedBoardPiece = {row, col, ...piece};
    
    // 高亮显示
    const board = document.getElementById('setupBoard');
    const pieceEl = board.querySelector(`.setup-piece[data-row="${row}"][data-col="${col}"]`);
    if (pieceEl) {
        pieceEl.classList.add('selected');
    }
}

// 清除棋盘选中
function clearBoardSelection() {
    selectedBoardPiece = null;
    document.querySelectorAll('.setup-piece').forEach(el => el.classList.remove('selected'));
}

// 清除棋子池选中
function clearPoolSelection() {
    selectedPoolPiece = null;
    document.querySelectorAll('.piece-in-pool').forEach(el => el.classList.remove('selected'));
    clearValidMarkers();
}

// 高亮合法位置
function highlightValidPositions(pieceType, color) {
    clearValidMarkers();
    
    const rules = POSITION_RULES[color][pieceType];
    const board = document.getElementById('setupBoard');
    const CELL_SIZE = 50;
    const BOARD_OFFSET_X = 25;
    const BOARD_OFFSET_Y = 25;
    
    let validPositions = [];
    
    if (rules.any) {
        // 所有位置都合法
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                validPositions.push([r, c]);
            }
        }
    } else if (rules.fixed) {
        validPositions = rules.fixed;
    } else if (pieceType === 'k') {
        for (let r = rules.min_row; r <= rules.max_row; r++) {
            for (let c = rules.min_col; c <= rules.max_col; c++) {
                validPositions.push([r, c]);
            }
        }
    } else if (pieceType === 'p') {
        if (color === 'r') {
            for (let r = rules.home_row_min; r <= 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (r >= rules.home_row_min && (c in rules.home_cols || r < rules.home_row_min === false)) {
                        if (r >= rules.home_row_min && (c === 0 || c === 2 || c === 4 || c === 6 || c === 8 || r < 5)) {
                            validPositions.push([r, c]);
                        }
                    }
                }
            }
        } else {
            for (let r = 0; r <= rules.home_row_max; r++) {
                for (let c = 0; c < 9; c++) {
                    if (r <= rules.home_row_max && (c === 0 || c === 2 || c === 4 || c === 6 || c === 8 || r > 4)) {
                        validPositions.push([r, c]);
                    }
                }
            }
        }
    }
    
    // 绘制标记
    validPositions.forEach(([r, c]) => {
        // 检查该位置是否已有棋子
        const occupied = setupBoardState.some(p => p.row === r && p.col === c);
        if (occupied) return;
        
        const marker = document.createElement('div');
        marker.className = 'valid-marker';
        marker.style.left = (BOARD_OFFSET_X + c * CELL_SIZE - 10) + 'px';
        marker.style.top = (BOARD_OFFSET_Y + r * CELL_SIZE - 10) + 'px';
        board.appendChild(marker);
    });
}

// 清除合法位置标记
function clearValidMarkers() {
    document.querySelectorAll('.valid-marker').forEach(el => el.remove());
}

// 渲染摆子棋盘
function renderSetupBoard() {
    const board = document.getElementById('setupBoard');
    board.querySelectorAll('.setup-piece').forEach(el => el.remove());
    
    const CELL_SIZE = 50;
    const BOARD_OFFSET_X = 25;
    const BOARD_OFFSET_Y = 25;
    
    const PIECE_NAMES = {
        'r': {'k': '帅', 'a': '仕', 'b': '相', 'n': '马', 'r': '车', 'c': '炮', 'p': '兵'},
        'b': {'k': '将', 'a': '士', 'b': '象', 'n': '马', 'r': '车', 'c': '炮', 'p': '卒'}
    };
    
    setupBoardState.forEach(piece => {
        const pieceEl = document.createElement('div');
        pieceEl.className = `setup-piece ${piece.color === 'r' ? 'red' : 'black'}`;
        pieceEl.textContent = PIECE_NAMES[piece.color][piece.type];
        pieceEl.style.left = (BOARD_OFFSET_X + piece.col * CELL_SIZE) + 'px';
        pieceEl.style.top = (BOARD_OFFSET_Y + piece.row * CELL_SIZE) + 'px';
        pieceEl.dataset.row = piece.row;
        pieceEl.dataset.col = piece.col;
        board.appendChild(pieceEl);
    });
}

// 清空棋盘
function resetSetupBoard() {
    setupBoardState = [];
    clearBoardSelection();
    clearPoolSelection();
    renderSetupBoard();
}

// 重置到初始局面
function resetToInitial() {
    resetSetupBoard();
    
    // 标准开局棋子位置
    const initialPieces = [
        // 黑方
        {row: 0, col: 0, color: 'b', type: 'r'},
        {row: 0, col: 1, color: 'b', type: 'n'},
        {row: 0, col: 2, color: 'b', type: 'b'},
        {row: 0, col: 3, color: 'b', type: 'a'},
        {row: 0, col: 4, color: 'b', type: 'k'},
        {row: 0, col: 5, color: 'b', type: 'a'},
        {row: 0, col: 6, color: 'b', type: 'b'},
        {row: 0, col: 7, color: 'b', type: 'n'},
        {row: 0, col: 8, color: 'b', type: 'r'},
        {row: 2, col: 1, color: 'b', type: 'c'},
        {row: 2, col: 7, color: 'b', type: 'c'},
        {row: 3, col: 0, color: 'b', type: 'p'},
        {row: 3, col: 2, color: 'b', type: 'p'},
        {row: 3, col: 4, color: 'b', type: 'p'},
        {row: 3, col: 6, color: 'b', type: 'p'},
        {row: 3, col: 8, color: 'b', type: 'p'},
        
        // 红方
        {row: 9, col: 0, color: 'r', type: 'r'},
        {row: 9, col: 1, color: 'r', type: 'n'},
        {row: 9, col: 2, color: 'r', type: 'b'},
        {row: 9, col: 3, color: 'r', type: 'a'},
        {row: 9, col: 4, color: 'r', type: 'k'},
        {row: 9, col: 5, color: 'r', type: 'a'},
        {row: 9, col: 6, color: 'r', type: 'b'},
        {row: 9, col: 7, color: 'r', type: 'n'},
        {row: 9, col: 8, color: 'r', type: 'r'},
        {row: 7, col: 1, color: 'r', type: 'c'},
        {row: 7, col: 7, color: 'r', type: 'c'},
        {row: 6, col: 0, color: 'r', type: 'p'},
        {row: 6, col: 2, color: 'r', type: 'p'},
        {row: 6, col: 4, color: 'r', type: 'p'},
        {row: 6, col: 6, color: 'r', type: 'p'},
        {row: 6, col: 8, color: 'r', type: 'p'}
    ];
    
    setupBoardState = JSON.parse(JSON.stringify(initialPieces));
    renderSetupBoard();
}

// 显示配置弹窗
function showSetupConfig() {
    document.getElementById('setupConfigModal').style.display = 'flex';
}

function closeSetupConfig() {
    document.getElementById('setupConfigModal').style.display = 'none';
}

// 开始自定义游戏
async function startCustomGame() {
    const redAi = document.getElementById('redAiToggle').checked;
    const blackAi = document.getElementById('blackAiToggle').checked;
    const firstMove = document.getElementById('firstMoveSelect').value;
    
    const ai_config = {'r': redAi, 'b': blackAi};
    
    try {
        const response = await fetch('/api/games/custom', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                board: setupBoardState,
                ai_config: ai_config,
                first_move: firstMove
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 设置全局状态
            if (typeof window !== 'undefined') {
                window.currentGameId = data.game_id;
                window.gameType = 'custom';
                window.aiEnabled = ai_config;
            }
            
            // 切换到游戏界面
            document.getElementById('setupMenu').style.display = 'none';
            document.getElementById('gameView').style.display = 'flex';
            document.getElementById('aiToggleButtons').style.display = 'flex';
            
            // 初始化游戏
            if (typeof initGameFromCustom === 'function') {
                initGameFromCustom(data.game_id, ai_config, firstMove);
            }
            
            closeSetupConfig();
        } else {
            alert('创建游戏失败：' + (data.error || '未知错误'));
        }
    } catch (error) {
        console.error('创建游戏失败:', error);
        alert('创建游戏失败，请检查服务器是否启动');
    }
}

// 保存局面
function saveSetupDialog() {
    document.getElementById('setupListTitle').textContent = '保存局面';
    document.getElementById('setupNameInput').style.display = 'block';
    document.getElementById('setupListContainer').innerHTML = '';
    document.getElementById('setupListModal').style.display = 'flex';
    
    // 自动生成名称
    const now = new Date();
    const name = `局面_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    document.getElementById('setupName').value = name;
}

// 加载局面
async function loadSetupDialog() {
    document.getElementById('setupListTitle').textContent = '加载局面';
    document.getElementById('setupNameInput').style.display = 'none';
    document.getElementById('setupListModal').style.display = 'flex';
    
    try {
        const response = await fetch('/api/setups');
        const data = await response.json();
        
        const container = document.getElementById('setupListContainer');
        container.innerHTML = '';
        
        if (data.setups && data.setups.length > 0) {
            data.setups.forEach(setup => {
                const item = document.createElement('div');
                item.className = 'setup-list-item';
                item.textContent = setup.name;
                item.onclick = () => loadSetup(setup.name);
                container.appendChild(item);
            });
        } else {
            container.innerHTML = '<p class="no-setups">暂无保存的局面</p>';
        }
    } catch (error) {
        console.error('获取局面列表失败:', error);
    }
}

function closeSetupList() {
    document.getElementById('setupListModal').style.display = 'none';
}

// 确认保存
async function confirmSetupAction() {
    const title = document.getElementById('setupListTitle').textContent;
    
    if (title === '保存局面') {
        const name = document.getElementById('setupName').value;
        if (!name) {
            alert('请输入局面名称');
            return;
        }
        
        const redAi = document.getElementById('redAiToggle').checked;
        const blackAi = document.getElementById('blackAiToggle').checked;
        const firstMove = document.getElementById('firstMoveSelect').value;
        
        try {
            const response = await fetch('/api/setups', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: name,
                    board: setupBoardState,
                    ai_config: {'r': redAi, 'b': blackAi},
                    first_move: firstMove
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('局面已保存');
                closeSetupList();
            } else {
                alert('保存失败：' + (data.error || '未知错误'));
            }
        } catch (error) {
            console.error('保存局面失败:', error);
            alert('保存失败');
        }
    }
}

// 加载指定局面
async function loadSetup(name) {
    try {
        const response = await fetch(`/api/setups/${encodeURIComponent(name)}`);
        const data = await response.json();
        
        if (response.ok && data.setup) {
            setupBoardState = data.setup.board_data || [];
            renderSetupBoard();
            
            // 设置配置
            document.getElementById('redAiToggle').checked = data.setup.ai_config?.r || false;
            document.getElementById('blackAiToggle').checked = data.setup.ai_config?.b || false;
            document.getElementById('firstMoveSelect').value = data.setup.first_move || 'r';
            
            closeSetupList();
            alert('局面已加载');
        } else {
            alert('加载失败：' + (data.error || '未知错误'));
        }
    } catch (error) {
        console.error('加载局面失败:', error);
        alert('加载失败');
    }
}

// 显示摆子菜单
function showSetupMenu() {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('setupMenu').style.display = 'flex';
    initSetupMode();
}

// 验证位置（调用后端 API）
async function validatePosition(color, type, row, col) {
    try {
        const response = await fetch('/api/validate-position', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({color, type, row, col})
        });
        
        const data = await response.json();
        return data.valid;
    } catch (error) {
        console.error('验证失败:', error);
        return true;
    }
}
