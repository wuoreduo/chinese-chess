"""
SQLite 数据库操作
"""

import sqlite3
import json
from datetime import datetime


class Database:
    """数据库管理类"""
    
    def __init__(self, db_path='chess.db'):
        self.db_path = db_path
        self.init_db()
    
    def get_connection(self):
        """获取数据库连接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_db(self):
        """初始化数据库表"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_type TEXT NOT NULL,
                red_player TEXT NOT NULL,
                black_player TEXT NOT NULL,
                board_state TEXT,
                current_player TEXT,
                winner TEXT,
                move_history TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1,
                ai_config TEXT,
                is_custom INTEGER DEFAULT 0
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS move_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                move_number INTEGER NOT NULL,
                from_row INTEGER NOT NULL,
                from_col INTEGER NOT NULL,
                to_row INTEGER NOT NULL,
                to_col INTEGER NOT NULL,
                piece TEXT NOT NULL,
                captured TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS custom_setups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                board_fen TEXT NOT NULL,
                board_data TEXT,
                ai_config TEXT DEFAULT '{"r": false, "b": false}',
                first_move TEXT DEFAULT 'r',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_game(self, game_type, red_player, black_player):
        """创建新游戏"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO games (game_type, red_player, black_player, current_player)
            VALUES (?, ?, ?, ?)
        ''', (game_type, red_player, black_player, 'r'))
        
        game_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return game_id
    
    def save_game_state(self, game_id, game):
        """保存游戏状态"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        board_state = json.dumps(game.board)
        move_history = json.dumps([
            {'from': m['from'], 'to': m['to'], 'piece': m['piece'], 'captured': m['captured']}
            for m in game.move_history
        ])
        
        cursor.execute('''
            UPDATE games 
            SET board_state = ?, current_player = ?, winner = ?, 
                move_history = ?, updated_at = ?
            WHERE id = ?
        ''', (board_state, game.current_player, game.winner, move_history, 
              datetime.now(), game_id))
        
        conn.commit()
        conn.close()
    
    def load_game_state(self, game_id):
        """加载游戏状态"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM games WHERE id = ?', (game_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        return {
            'id': row['id'],
            'game_type': row['game_type'],
            'red_player': row['red_player'],
            'black_player': row['black_player'],
            'board_state': json.loads(row['board_state']) if row['board_state'] else None,
            'current_player': row['current_player'],
            'winner': row['winner'],
            'move_history': json.loads(row['move_history']) if row['move_history'] else [],
            'created_at': row['created_at'],
            'is_active': row['is_active']
        }
    
    def record_move(self, game_id, move_number, move_data):
        """记录走棋"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO move_records 
            (game_id, move_number, from_row, from_col, to_row, to_col, piece, captured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (game_id, move_number, move_data['from'][0], move_data['from'][1],
              move_data['to'][0], move_data['to'][1], 
              json.dumps(move_data['piece']), 
              json.dumps(move_data['captured']) if move_data['captured'] else None))
        
        conn.commit()
        conn.close()
    
    def get_move_history(self, game_id):
        """获取走棋历史"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM move_records WHERE game_id = ? ORDER BY move_number
        ''', (game_id,))
        
        moves = []
        for row in cursor.fetchall():
            moves.append({
                'move_number': row['move_number'],
                'from': (row['from_row'], row['from_col']),
                'to': (row['to_row'], row['to_col']),
                'piece': json.loads(row['piece']),
                'captured': json.loads(row['captured']) if row['captured'] else None,
                'timestamp': row['timestamp']
            })
        
        conn.close()
        return moves
    
    def get_active_games(self):
        """获取所有活跃游戏"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, game_type, red_player, black_player, current_player, winner, created_at
            FROM games WHERE is_active = 1 ORDER BY updated_at DESC
        ''')
        
        games = []
        for row in cursor.fetchall():
            games.append({
                'id': row['id'],
                'game_type': row['game_type'],
                'red_player': row['red_player'],
                'black_player': row['black_player'],
                'current_player': row['current_player'],
                'winner': row['winner'],
                'created_at': row['created_at']
            })
        
        conn.close()
        return games
    
    def delete_game(self, game_id):
        """删除游戏"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM move_records WHERE game_id = ?', (game_id,))
        cursor.execute('DELETE FROM games WHERE id = ?', (game_id,))
        
        conn.commit()
        conn.close()
    
    def save_custom_setup(self, name, board_fen, board_data, ai_config=None, first_move='r'):
        """
        保存自定义局面
        :param name: 局面名称
        :param board_fen: FEN 字符串
        :param board_data: JSON 格式的棋盘数据
        :param ai_config: AI 配置 {"r": bool, "b": bool}
        :param first_move: 先手方 'r' 或 'b'
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        ai_config_str = json.dumps(ai_config if ai_config else {'r': False, 'b': False})
        
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO custom_setups 
                (name, board_fen, board_data, ai_config, first_move, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            ''', (name, board_fen, json.dumps(board_data), ai_config_str, first_move))
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()
    
    def load_custom_setup(self, name):
        """
        加载自定义局面
        :param name: 局面名称
        :return: dict or None
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM custom_setups WHERE name = ?', (name,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        return {
            'name': row['name'],
            'board_fen': row['board_fen'],
            'board_data': json.loads(row['board_data']) if row['board_data'] else None,
            'ai_config': json.loads(row['ai_config']) if row['ai_config'] else {'r': False, 'b': False},
            'first_move': row['first_move'],
            'created_at': row['created_at']
        }
    
    def list_custom_setups(self):
        """
        获取所有已保存的局面列表
        :return: list of dict
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT name, ai_config, first_move, created_at, updated_at
            FROM custom_setups ORDER BY updated_at DESC
        ''')
        
        setups = []
        for row in cursor.fetchall():
            setups.append({
                'name': row['name'],
                'ai_config': json.loads(row['ai_config']) if row['ai_config'] else {'r': False, 'b': False},
                'first_move': row['first_move'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at']
            })
        
        conn.close()
        return setups
    
    def delete_custom_setup(self, name):
        """
        删除自定义局面
        :param name: 局面名称
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM custom_setups WHERE name = ?', (name,))
        conn.commit()
        conn.close()
        
        return cursor.rowcount > 0
    
    def update_game_ai_config(self, game_id, ai_config):
        """
        更新游戏的 AI 配置
        :param game_id: 游戏 ID
        :param ai_config: {"r": bool, "b": bool}
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE games SET ai_config = ?, updated_at = datetime('now')
            WHERE id = ?
        ''', (json.dumps(ai_config), game_id))
        
        conn.commit()
        conn.close()
    
    def create_custom_game(self, game_type, red_player, black_player, ai_config, first_move):
        """
        创建自定义局面游戏
        :param game_type: 游戏类型
        :param red_player: 红方玩家名
        :param black_player: 黑方玩家名
        :param ai_config: {"r": bool, "b": bool}
        :param first_move: 先手方
        :return: game_id
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO games (game_type, red_player, black_player, current_player, ai_config, is_custom)
            VALUES (?, ?, ?, ?, ?, 1)
        ''', (game_type, red_player, black_player, first_move, json.dumps(ai_config)))
        
        game_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return game_id
