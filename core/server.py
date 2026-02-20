"""
中国象棋 Flask 后端 + WebSocket
"""

import os
import sys
import time
import threading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, BASE_DIR)

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS

try:
    from .game import ChineseChess
    from .ai import ChessAI
    from .database import Database
except ImportError:
    from game import ChineseChess
    from ai import ChessAI
    from database import Database

app = Flask(__name__, 
            static_folder=os.path.join(PROJECT_ROOT, 'static'), 
            template_folder=os.path.join(PROJECT_ROOT, 'templates'))
app.config['SECRET_KEY'] = 'chess-game-secret-key'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

db = Database(os.path.join(PROJECT_ROOT, 'chess.db'))

games = {}
ai_players = {}
ai_threads = {}
ai_paused = {}
repetition_count = {}  # 记录每局游戏的连续重复次数


def ai_move_task(game_id, ai_color):
    """AI 走棋任务"""
    time.sleep(0.5)
    
    if game_id not in games:
        return
    
    game = games[game_id]
    
    # 检查是否暂停
    if ai_paused.get(game_id, False):
        return
    
    # 获取 AI 实例 - 根据颜色选择正确的 key
    if ai_color == 'b' and f'{game_id}_black' in ai_players:
        ai = ai_players[f'{game_id}_black']
    else:
        ai = ai_players.get(game_id)
    
    if not ai or game.game_over:
        return
    
    if game.current_player != ai_color:
        return
    
    # 检测循环局面：检查当前局面是否在历史中多次出现
    current_fen = game.get_board_fen()
    rep_count = game.get_repetition_count(current_fen)
    
    # 更新连续重复计数
    if rep_count >= 2:
        repetition_count[game_id] = repetition_count.get(game_id, 0) + 1
    else:
        repetition_count[game_id] = 0
    
    # 如果连续重复超过 6 次（12 个回合），强制 AI 变招
    force_break = repetition_count.get(game_id, 0) >= 6
    
    # 检测长将/困毙：如果同一局面重复 4 次，判和（仅当双方都没有进攻棋子时）
    if rep_count >= 4:
        # 简化判断：如果双方都只剩下将/帅和士/仕，判和
        red_attack = sum(1 for r in range(10) for c in range(9) 
                        if game.board[r][c] and game.board[r][c][0] == 'r' 
                        and game.board[r][c][1] not in ('k', 'a'))
        black_attack = sum(1 for r in range(10) for c in range(9) 
                          if game.board[r][c] and game.board[r][c][0] == 'b' 
                          and game.board[r][c][1] not in ('k', 'a'))
        
        if red_attack == 0 and black_attack == 0:
            game.game_over = True
            game.winner = 'draw'
            db.save_game_state(game_id, game)
            socketio.emit('game_over', {
                'game_id': game_id,
                'winner': 'draw',
                'reason': '双方无进攻棋子，循环重复判和'
            })
            return
    
    best_move = ai.get_best_move(game, force_break=force_break)
    
    if best_move:
        fr, fc, tr, tc = best_move
        success, message = game.make_move(fr, fc, tr, tc)
        
        if success:
            db.save_game_state(game_id, game)
            db.record_move(game_id, len(game.move_history), {
                'from': (fr, fc),
                'to': (tr, tc),
                'piece': game.board[tr][tc],
                'captured': None
            })
            
            board = [[None for _ in range(9)] for _ in range(10)]
            for r in range(10):
                for c in range(9):
                    piece = game.board[r][c]
                    if piece:
                        board[r][c] = {'color': piece[0], 'type': piece[1]}
            
            socketio.emit('game_update', {
                'game_id': game_id,
                'board': board,
                'current_player': game.current_player,
                'game_over': game.game_over,
                'winner': game.winner,
                'last_move': {'from': (fr, fc), 'to': (tr, tc)}
            })
            
            # 游戏结束时发送 game_over 事件
            if game.game_over:
                socketio.emit('game_over', {
                    'game_id': game_id,
                    'winner': game.winner,
                    'reason': f'{"红方" if game.winner == "r" else "黑方"}获胜'
                })
                return
            
            # AI vs AI 模式下触发下一个 AI
            # 当前走棋的是 ai_color，走完后 current_player 变为对方
            # 所以下一个应该是 current_player 对应的 AI
            if f'{game_id}_black' in ai_players and not game.game_over:
                next_ai_color = game.current_player
                # 只有当前走棋的是红方时才触发黑方，当前是黑方时触发红方
                if ai_color == 'r':
                    threading.Thread(target=ai_move_task, args=(game_id, 'b'), daemon=True).start()
                else:
                    threading.Thread(target=ai_move_task, args=(game_id, 'r'), daemon=True).start()


@app.route('/api/games/<int:game_id>/pause', methods=['POST'])
def pause_game(game_id):
    """暂停 AI vs AI 游戏"""
    if game_id not in games:
        return jsonify({'error': '游戏不存在'}), 404
    
    game = games[game_id]
    game_data = db.load_game_state(game_id)
    if not game_data or game_data['game_type'] != 'aivai':
        return jsonify({'error': '仅 AI vs AI 支持暂停'}), 400
    
    ai_paused[game_id] = True
    return jsonify({'success': True, 'message': '游戏已暂停'})


@app.route('/api/games/<int:game_id>/resume', methods=['POST'])
def resume_game(game_id):
    """继续 AI vs AI 游戏"""
    if game_id not in games:
        return jsonify({'error': '游戏不存在'}), 404
    
    game = games[game_id]
    game_data = db.load_game_state(game_id)
    if not game_data or game_data['game_type'] != 'aivai':
        return jsonify({'error': '仅 AI vs AI 支持暂停'}), 400
    
    ai_paused[game_id] = False
    
    # 触发当前玩家的 AI
    if not game.game_over:
        next_ai_color = game.current_player
        ai_key = f'{game_id}_black' if next_ai_color == 'b' else game_id
        if ai_key in ai_players:
            threading.Thread(target=ai_move_task, args=(game_id, next_ai_color), daemon=True).start()
    
    return jsonify({'success': True, 'message': '游戏已继续'})


@app.route('/')
def index():
    """首页"""
    return render_template('index.html')


@app.route('/style.css')
def style_css():
    """CSS 文件"""
    return send_from_directory(app.static_folder, 'style.css')


@app.route('/game.js')
def game_js():
    """JS 文件"""
    return send_from_directory(app.static_folder, 'game.js')


@app.route('/sounds/<filename>')
def sounds(filename):
    """音效文件"""
    return send_from_directory(os.path.join(app.static_folder, 'sounds'), filename)


@app.route('/api/games', methods=['GET'])
def get_games():
    """获取所有游戏"""
    active_games = db.get_active_games()
    return jsonify({'games': active_games})


@app.route('/api/games', methods=['POST'])
def create_game():
    """创建新游戏"""
    data = request.json
    game_type = data.get('type', 'pvp')
    red_player = data.get('red', '红方')
    black_player = data.get('black', '黑方')
    first_move = data.get('first_move', 'r')  # AIvAI 模式先手方，默认红方
    
    game_id = db.create_game(game_type, red_player, black_player)
    
    game = ChineseChess()
    games[game_id] = game
    
    if game_type == 'pvai':
        ai_players[game_id] = ChessAI('b', depth=3)
    elif game_type == 'aivai':
        ai_players[game_id] = ChessAI('r', depth=3)
        ai_players[f'{game_id}_black'] = ChessAI('b', depth=3)
        # 根据先手方决定哪个 AI 先走
        if first_move == 'b':
            game.current_player = 'b'
            threading.Thread(target=ai_move_task, args=(game_id, 'b'), daemon=True).start()
        else:
            threading.Thread(target=ai_move_task, args=(game_id, 'r'), daemon=True).start()
    
    db.save_game_state(game_id, game)
    
    return jsonify({
        'game_id': game_id,
        'message': '游戏创建成功'
    })


@app.route('/api/games/<int:game_id>', methods=['GET'])
def get_game(game_id):
    """获取游戏详情"""
    game_data = db.load_game_state(game_id)
    if not game_data:
        return jsonify({'error': '游戏不存在'}), 404
    
    if game_id in games:
        game = games[game_id]
        board = [[None for _ in range(9)] for _ in range(10)]
        for r in range(10):
            for c in range(9):
                piece = game.board[r][c]
                if piece:
                    board[r][c] = {'color': piece[0], 'type': piece[1]}
        
        return jsonify({
            'game_id': game_id,
            'game_type': game_data['game_type'],
            'board': board,
            'current_player': game.current_player,
            'game_over': game.game_over,
            'winner': game.winner,
            'move_history': game_data['move_history']
        })
    
    return jsonify(game_data)


@app.route('/api/games/<int:game_id>/move', methods=['POST'])
def make_move(game_id):
    """执行走棋 (curl 接口)"""
    if game_id not in games:
        return jsonify({'error': '游戏不存在'}), 404
    
    data = request.json
    fr, fc = data.get('from')
    tr, tc = data.get('to')
    
    game = games[game_id]
    success, message = game.make_move(fr, fc, tr, tc)
    
    if success:
        db.save_game_state(game_id, game)
        db.record_move(game_id, len(game.move_history), {
            'from': (fr, fc),
            'to': (tr, tc),
            'piece': game.board[tr][tc],
            'captured': None
        })
        
        if game_id in ai_players and not game.game_over:
            ai = ai_players[game_id]
            ai_color = ai.color
            if game.current_player == ai_color:
                if game_id not in ai_threads or not ai_threads[game_id].is_alive():
                    thread = threading.Thread(target=ai_move_task, args=(game_id, ai_color), daemon=True)
                    ai_threads[game_id] = thread
                    thread.start()
        
        board = [[None for _ in range(9)] for _ in range(10)]
        for r in range(10):
            for c in range(9):
                piece = game.board[r][c]
                if piece:
                    board[r][c] = {'color': piece[0], 'type': piece[1]}
        
        socketio.emit('game_update', {
            'game_id': game_id,
            'board': board,
            'current_player': game.current_player,
            'game_over': game.game_over,
            'winner': game.winner,
            'last_move': {'from': (fr, fc), 'to': (tr, tc)}
        })
        
        return jsonify({
            'success': True,
            'message': message,
            'current_player': game.current_player,
            'game_over': game.game_over,
            'winner': game.winner
        })
    
    return jsonify({'success': False, 'message': message}), 400


@app.route('/api/games/<int:game_id>/undo', methods=['POST'])
def undo_move(game_id):
    """悔棋"""
    if game_id not in games:
        return jsonify({'error': '游戏不存在'}), 404
    
    game = games[game_id]
    success = game.undo_move()
    
    if success:
        db.save_game_state(game_id, game)
        return jsonify({'success': True, 'message': '悔棋成功'})
    
    return jsonify({'success': False, 'message': '无法悔棋'}), 400


@app.route('/api/games/<int:game_id>/resign', methods=['POST'])
def resign_game(game_id):
    """认输"""
    if game_id not in games:
        return jsonify({'error': '游戏不存在'}), 404
    
    game = games[game_id]
    if game.game_over:
        return jsonify({'error': '游戏已结束'}), 400
    
    current_player = game.current_player
    winner = 'b' if current_player == 'r' else 'r'
    resigner = current_player
    
    # 设置游戏结束
    game.game_over = True
    game.winner = winner
    db.save_game_state(game_id, game)
    
    # 广播游戏结束
    socketio.emit('game_over', {
        'game_id': game_id,
        'winner': winner,
        'resigner': resigner,
        'reason': f'{"红方" if resigner == "r" else "黑方"}认输'
    })
    
    return jsonify({
        'success': True,
        'winner': winner,
        'resigner': resigner,
        'message': f'{"红方" if resigner == "r" else "黑方"}认输，{"黑方" if resigner == "r" else "红方"}获胜'
    })


@app.route('/api/games/<int:game_id>', methods=['DELETE'])
def delete_game(game_id):
    """删除游戏"""
    if game_id in games:
        del games[game_id]
    if game_id in ai_players:
        del ai_players[game_id]
    
    db.delete_game(game_id)
    return jsonify({'success': True, 'message': '游戏已删除'})


@app.route('/api/games/<int:game_id>/fen', methods=['GET'])
def get_fen(game_id):
    """获取 FEN 字符串"""
    if game_id not in games:
        return jsonify({'error': '游戏不存在'}), 404
    
    game = games[game_id]
    fen = game.get_board_fen()
    
    return jsonify({'fen': fen, 'current_player': game.current_player})


@socketio.on('connect')
def handle_connect():
    """处理 WebSocket 连接"""
    print('客户端已连接')


@socketio.on('disconnect')
def handle_disconnect():
    """处理 WebSocket 断开"""
    print('客户端已断开')


@socketio.on('join_game')
def handle_join_game(data):
    """加入游戏房间"""
    game_id = data.get('game_id')
    print(f'客户端加入游戏 {game_id}')


if __name__ == '__main__':
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Static folder: {app.static_folder}")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
