"""
中国象棋 AI - Minimax 算法 + 估值函数
"""

import random

try:
    from .game import ChineseChess
except ImportError:
    from game import ChineseChess


class ChessAI:
    """象棋 AI"""
    
    PIECE_VALUES = {
        'k': 10000,
        'r': 100,
        'n': 45,
        'c': 50,
        'a': 20,
        'b': 20,
        'p': 10
    }
    
    POSITION_BONUS = {
        'p': {
            0: 0, 1: 0, 2: 0, 3: 0, 4: 0,
            5: 10, 6: 20, 7: 30, 8: 30, 9: 30
        },
        'n': {
            0: 0, 1: 5, 2: 10, 3: 10, 4: 10,
            5: 10, 6: 10, 7: 10, 8: 5, 9: 0
        }
    }
    
    def __init__(self, color, depth=3):
        """
        初始化 AI
        :param color: AI 执棋颜色 'r' 或 'b'
        :param depth: 搜索深度
        """
        self.color = color
        self.depth = depth
        self.opponent = 'b' if color == 'r' else 'r'
    
    def evaluate(self, game):
        """
        评估棋盘局面
        :return: 评价值 (对 AI 有利为正)
        """
        score = 0
        
        for row in range(10):
            for col in range(9):
                piece = game.board[row][col]
                if piece:
                    piece_value = self.PIECE_VALUES.get(piece[1], 0)
                    
                    position_bonus = 0
                    if piece[1] in self.POSITION_BONUS:
                        position_map = self.POSITION_BONUS[piece[1]]
                        if piece[0] == self.color:
                            position_bonus = position_map.get(row, 0)
                        else:
                            position_bonus = position_map.get(9 - row, 0)
                    
                    if piece[0] == self.color:
                        score += piece_value + position_bonus
                    else:
                        score -= piece_value + position_bonus
        
        if game.winner == self.color:
            score += 10000
        elif game.winner == self.opponent:
            score -= 10000
        
        return score
    
    def minimax(self, game, depth, alpha, beta, is_maximizing):
        """
        Minimax 算法 + Alpha-Beta 剪枝
        """
        if depth == 0 or game.game_over:
            return self.evaluate(game)
        
        if is_maximizing:
            max_eval = float('-inf')
            for move in game.get_all_moves(self.color):
                fr, fc, tr, tc = move
                new_game = game.copy()
                new_game.make_move(fr, fc, tr, tc)
                eval_score = self.minimax(new_game, depth - 1, alpha, beta, False)
                max_eval = max(max_eval, eval_score)
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for move in game.get_all_moves(self.opponent):
                fr, fc, tr, tc = move
                new_game = game.copy()
                new_game.make_move(fr, fc, tr, tc)
                eval_score = self.minimax(new_game, depth - 1, alpha, beta, True)
                min_eval = min(min_eval, eval_score)
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            return min_eval
    
    def get_best_move(self, game, force_break=False):
        """
        获取最佳走法
        :param game: 当前游戏状态
        :param force_break: 是否强制打破循环
        :return: (from_row, from_col, to_row, to_col) 或 None
        """
        moves = game.get_all_moves(self.color)
        
        if not moves:
            return None
        
        if len(moves) == 1:
            return moves[0]
        
        # 检测是否处于循环局面
        current_fen = game.get_board_fen()
        in_repetition = game.is_repetition(current_fen)
        
        # 如果在循环中或强制变招，增加随机性并避免导致重复的走法
        if in_repetition or force_break:
            return self._get_anti_repetition_move(game, moves, force_break)
        
        best_move = None
        best_eval = float('-inf')
        alpha = float('-inf')
        beta = float('inf')
        
        random.shuffle(moves)
        
        for move in moves:
            fr, fc, tr, tc = move
            new_game = game.copy()
            new_game.make_move(fr, fc, tr, tc)
            eval_score = self.minimax(new_game, self.depth - 1, alpha, beta, False)
            
            if eval_score > best_eval:
                best_eval = eval_score
                best_move = move
                alpha = max(alpha, eval_score)
        
        return best_move if best_move else random.choice(moves)
    
    def _get_anti_repetition_move(self, game, moves, force_break=False):
        """
        获取打破循环的走法
        :param game: 当前游戏状态
        :param moves: 所有合法走法
        :param force_break: 是否强制打破循环
        :return: 最佳走法
        """
        # 过滤掉会导致重复局面的走法
        non_repeating_moves = []
        for move in moves:
            fr, fc, tr, tc = move
            new_game = game.copy()
            new_game.make_move(fr, fc, tr, tc)
            new_fen = new_game.get_board_fen()
            if not game.is_repetition(new_fen):
                non_repeating_moves.append(move)
        
        # 如果有不重复的走法，从中选择最佳的
        if non_repeating_moves:
            best_move = None
            best_eval = float('-inf')
            alpha = float('-inf')
            beta = float('inf')
            
            for move in non_repeating_moves:
                fr, fc, tr, tc = move
                new_game = game.copy()
                new_game.make_move(fr, fc, tr, tc)
                eval_score = self.minimax(new_game, self.depth - 1, alpha, beta, False)
                
                if eval_score > best_eval:
                    best_eval = eval_score
                    best_move = move
                    alpha = max(alpha, eval_score)
            
            return best_move if best_move else random.choice(non_repeating_moves)
        else:
            # 如果所有走法都会重复，force_break 时选择评估值变化最大的走法
            # 否则增加随机性选择
            if force_break and len(moves) > 1:
                # 选择能带来最大变化的走法（通过评估走棋后的局面差异）
                best_change_move = None
                max_change = float('-inf')
                
                for move in moves:
                    fr, fc, tr, tc = move
                    new_game = game.copy()
                    new_game.make_move(fr, fc, tr, tc)
                    # 使用评估值的绝对变化作为变化度量
                    change = abs(self.evaluate(new_game) - self.evaluate(game))
                    if change > max_change:
                        max_change = change
                        best_change_move = move
                
                if best_change_move:
                    return best_change_move
            
            random.shuffle(moves)
            return moves[0]
