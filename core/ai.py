"""
中国象棋 AI - Minimax 算法 + 估值函数
"""

import random
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
    
    def get_best_move(self, game):
        """
        获取最佳走法
        :return: (from_row, from_col, to_row, to_col) 或 None
        """
        moves = game.get_all_moves(self.color)
        
        if not moves:
            return None
        
        if len(moves) == 1:
            return moves[0]
        
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
    
    def should_accept_draw(self, game):
        """
        AI 评估是否应该接受和棋
        :return: True 接受，False 拒绝
        """
        # 评估当前局势
        score = self.evaluate(game)
        
        # 如果 AI 执红，分数为正表示优势，为负表示劣势
        # 如果 AI 执黑，分数为正表示优势，为负表示劣势
        
        # 劣势时（分数 < -500）接受和棋
        # 均势时（-500 <= score <= 500）接受和棋
        # 优势时（分数 > 500）拒绝和棋，继续争取胜利
        
        if score < -500:
            # 明显劣势，接受和棋
            return True
        elif score > 500:
            # 明显优势，拒绝和棋
            return False
        else:
            # 均势，有一定概率接受
            import random
            return random.random() < 0.7  # 70% 概率接受
