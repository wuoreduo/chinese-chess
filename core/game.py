"""
中国象棋游戏规则逻辑
"""

class ChineseChess:
    """中国象棋游戏类"""
    
    RED = 'r'
    BLACK = 'b'
    
    PIECE_NAMES = {
        'r': {'k': '帅', 'a': '仕', 'b': '相', 'n': '马', 'r': '车', 'c': '炮', 'p': '兵'},
        'b': {'k': '将', 'a': '士', 'b': '象', 'n': '马', 'r': '车', 'c': '炮', 'p': '卒'}
    }
    
    def __init__(self, max_history=6):
        self.board = self.init_board()
        self.current_player = self.RED
        self.game_over = False
        self.winner = None
        self.move_history = []
        self.position_history = []
        self.max_history = max_history
    
    def init_board(self):
        """初始化棋盘"""
        board = [[None for _ in range(9)] for _ in range(10)]
        
        # 黑方棋子 (上方)
        board[0][0] = ('b', 'r')  # 车
        board[0][1] = ('b', 'n')  # 马
        board[0][2] = ('b', 'b')  # 象
        board[0][3] = ('b', 'a')  # 士
        board[0][4] = ('b', 'k')  # 将
        board[0][5] = ('b', 'a')  # 士
        board[0][6] = ('b', 'b')  # 象
        board[0][7] = ('b', 'n')  # 马
        board[0][8] = ('b', 'r')  # 车
        board[2][1] = ('b', 'c')  # 炮
        board[2][7] = ('b', 'c')  # 炮
        for i in [0, 2, 4, 6, 8]:
            board[3][i] = ('b', 'p')  # 卒
        
        # 红方棋子 (下方)
        board[9][0] = ('r', 'r')  # 车
        board[9][1] = ('r', 'n')  # 马
        board[9][2] = ('r', 'b')  # 相
        board[9][3] = ('r', 'a')  # 仕
        board[9][4] = ('r', 'k')  # 帅
        board[9][5] = ('r', 'a')  # 仕
        board[9][6] = ('r', 'b')  # 相
        board[9][7] = ('r', 'n')  # 马
        board[9][8] = ('r', 'r')  # 车
        board[7][1] = ('r', 'c')  # 炮
        board[7][7] = ('r', 'c')  # 炮
        for i in [0, 2, 4, 6, 8]:
            board[6][i] = ('r', 'p')  # 兵
        
        return board
    
    def get_piece(self, row, col):
        """获取棋子"""
        if 0 <= row < 10 and 0 <= col < 9:
            return self.board[row][col]
        return None
    
    def is_valid_move(self, from_row, from_col, to_row, to_col):
        """判断走法是否合法"""
        if not (0 <= from_row < 10 and 0 <= from_col < 9 and 
                0 <= to_row < 10 and 0 <= to_col < 9):
            return False
        
        piece = self.board[from_row][from_col]
        if not piece:
            return False
        
        target = self.board[to_row][to_col]
        if target and target[0] == piece[0]:
            return False
        
        piece_type = piece[1]
        
        if piece_type == 'k':
            return self._validate_king(piece, from_row, from_col, to_row, to_col)
        elif piece_type == 'a':
            return self._validate_advisor(piece, from_row, from_col, to_row, to_col)
        elif piece_type == 'b':
            return self._validate_elephant(piece, from_row, from_col, to_row, to_col)
        elif piece_type == 'n':
            return self._validate_horse(piece, from_row, from_col, to_row, to_col)
        elif piece_type == 'r':
            return self._validate_chariot(piece, from_row, from_col, to_row, to_col)
        elif piece_type == 'c':
            return self._validate_cannon(piece, from_row, from_col, to_row, to_col)
        elif piece_type == 'p':
            return self._validate_soldier(piece, from_row, from_col, to_row, to_col)
        
        return False
    
    def _validate_king(self, piece, fr, fc, tr, tc):
        """验证将/帅"""
        if tc < 3 or tc > 5:
            return False
        if piece[0] == self.BLACK and (tr < 0 or tr > 2):
            return False
        if piece[0] == self.RED and (tr < 7 or tr > 9):
            return False
        
        dr, dc = abs(tr - fr), abs(tc - fc)
        if (dr == 1 and dc == 0) or (dr == 0 and dc == 1):
            return True
        
        # 飞将
        if fc == tc and self.board[tr][tc] and self.board[tr][tc][1] == 'k':
            for r in range(min(fr, tr) + 1, max(fr, tr)):
                if self.board[r][fc]:
                    return False
            return True
        return False
    
    def _validate_advisor(self, piece, fr, fc, tr, tc):
        """验证士/仕"""
        if tc < 3 or tc > 5:
            return False
        if piece[0] == self.BLACK and (tr < 0 or tr > 2):
            return False
        if piece[0] == self.RED and (tr < 7 or tr > 9):
            return False
        
        dr, dc = abs(tr - fr), abs(tc - fc)
        return dr == 1 and dc == 1
    
    def _validate_elephant(self, piece, fr, fc, tr, tc):
        """验证象/相"""
        if piece[0] == self.BLACK and (tr < 0 or tr > 4):
            return False
        if piece[0] == self.RED and (tr < 5 or tr > 9):
            return False
        
        dr, dc = abs(tr - fr), abs(tc - fc)
        if dr == 2 and dc == 2:
            eye_row, eye_col = (fr + tr) // 2, (fc + tc) // 2
            return self.board[eye_row][eye_col] is None
        return False
    
    def _validate_horse(self, piece, fr, fc, tr, tc):
        """验证马"""
        dr, dc = abs(tr - fr), abs(tc - fc)
        if dr == 2 and dc == 1:
            leg_row, leg_col = fr + (1 if tr > fr else -1), fc
            return self.board[leg_row][leg_col] is None
        if dr == 1 and dc == 2:
            leg_row, leg_col = fr, fc + (1 if tc > fc else -1)
            return self.board[leg_row][leg_col] is None
        return False
    
    def _validate_chariot(self, piece, fr, fc, tr, tc):
        """验证车"""
        if fr != tr and fc != tc:
            return False
        
        if fr == tr:
            step = 1 if tc > fc else -1
            for c in range(fc + step, tc, step):
                if self.board[fr][c]:
                    return False
        else:
            step = 1 if tr > fr else -1
            for r in range(fr + step, tr, step):
                if self.board[r][fc]:
                    return False
        return True
    
    def _validate_cannon(self, piece, fr, fc, tr, tc):
        """验证炮"""
        if fr != tr and fc != tc:
            return False
        
        count = 0
        if fr == tr:
            step = 1 if tc > fc else -1
            for c in range(fc + step, tc, step):
                if self.board[fr][c]:
                    count += 1
        else:
            step = 1 if tr > fr else -1
            for r in range(fr + step, tr, step):
                if self.board[r][fc]:
                    count += 1
        
        target = self.board[tr][tc]
        if target is None:
            return count == 0
        else:
            return count == 1
    
    def _validate_soldier(self, piece, fr, fc, tr, tc):
        """验证兵/卒"""
        dr, dc = abs(tr - fr), abs(tc - fc)
        
        if piece[0] == self.BLACK:
            if tr < fr:
                return False
            if fr <= 4:
                return dr == 1 and dc == 0
            else:
                return (dr == 1 and dc == 0) or (dr == 0 and dc == 1)
        else:
            if tr > fr:
                return False
            if fr >= 5:
                return dr == 1 and dc == 0
            else:
                return (dr == 1 and dc == 0) or (dr == 0 and dc == 1)
    
    def make_move(self, from_row, from_col, to_row, to_col):
        """执行走棋"""
        if self.game_over:
            return False, "游戏已结束"
        
        if not self.is_valid_move(from_row, from_col, to_row, to_col):
            return False, "非法走法"
        
        piece = self.board[from_row][from_col]
        captured = self.board[to_row][to_col]
        
        self.board[to_row][to_col] = piece
        self.board[from_row][from_col] = None
        
        move = {
            'from': (from_row, from_col),
            'to': (to_row, to_col),
            'piece': piece,
            'captured': captured
        }
        self.move_history.append(move)
        
        current_fen = self.get_board_fen()
        self.position_history.append(current_fen)
        if len(self.position_history) > self.max_history:
            self.position_history.pop(0)
        
        if captured and captured[1] == 'k':
            self.game_over = True
            self.winner = piece[0]
        
        self.current_player = self.BLACK if self.current_player == self.RED else self.RED
        
        return True, "走棋成功"
    
    def undo_move(self):
        """悔棋"""
        if not self.move_history:
            return False
        
        move = self.move_history.pop()
        fr, fc = move['from']
        tr, tc = move['to']
        
        self.board[fr][fc] = move['piece']
        self.board[tr][tc] = move['captured']
        
        self.current_player = move['piece'][0]
        
        if self.winner:
            self.game_over = False
            self.winner = None
        
        if self.position_history:
            self.position_history.pop()
        
        return True
    
    def get_all_moves(self, color):
        """获取某一方所有合法走法"""
        moves = []
        for fr in range(10):
            for fc in range(9):
                piece = self.board[fr][fc]
                if piece and piece[0] == color:
                    for tr in range(10):
                        for tc in range(9):
                            if self.is_valid_move(fr, fc, tr, tc):
                                moves.append((fr, fc, tr, tc))
        return moves
    
    def is_check(self, color):
        """判断某一方是否被将军"""
        king_pos = None
        for r in range(10):
            for c in range(9):
                piece = self.board[r][c]
                if piece and piece[0] == color and piece[1] == 'k':
                    king_pos = (r, c)
                    break
            if king_pos:
                break
        
        if not king_pos:
            return True
        
        opponent = self.BLACK if color == self.RED else self.RED
        for fr in range(10):
            for fc in range(9):
                piece = self.board[fr][fc]
                if piece and piece[0] == opponent:
                    if self.is_valid_move(fr, fc, king_pos[0], king_pos[1]):
                        return True
        return False
    
    def get_board_fen(self):
        """获取棋盘 FEN 表示"""
        fen_rows = []
        for row in self.board:
            fen_row = ''
            empty = 0
            for cell in row:
                if cell is None:
                    empty += 1
                else:
                    if empty > 0:
                        fen_row += str(empty)
                        empty = 0
                    color, piece = cell
                    piece_char = piece.upper() if color == self.RED else piece
                    fen_row += piece_char
            if empty > 0:
                fen_row += str(empty)
            fen_rows.append(fen_row)
        
        return '/'.join(fen_rows)
    
    def copy(self):
        """复制游戏状态"""
        new_game = ChineseChess()
        new_game.board = [row[:] for row in self.board]
        new_game.current_player = self.current_player
        new_game.game_over = self.game_over
        new_game.winner = self.winner
        new_game.move_history = self.move_history[:]
        new_game.position_history = self.position_history[:]
        new_game.max_history = self.max_history
        return new_game
    
    def is_repetition(self, fen):
        """检测局面重复"""
        return self.position_history.count(fen) >= 2
    
    def get_repetition_count(self, fen):
        """获取局面重复次数"""
        return self.position_history.count(fen)
