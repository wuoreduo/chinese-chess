"""
数据库迁移脚本
用于升级到支持摆子功能的数据库结构

使用方法:
    python migrate_db.py
"""

import sqlite3
import os

# 获取数据库路径
db_path = os.path.join(os.path.dirname(__file__), 'chess.db')

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 检查 games 表结构
    cursor.execute("PRAGMA table_info(games)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"games 表当前列：{columns}")
    
    # 添加缺失的列
    if 'ai_config' not in columns:
        print("添加 ai_config 列...")
        cursor.execute('ALTER TABLE games ADD COLUMN ai_config TEXT')
        
    if 'is_custom' not in columns:
        print("添加 is_custom 列...")
        cursor.execute('ALTER TABLE games ADD COLUMN is_custom INTEGER DEFAULT 0')
    
    # 检查 custom_setups 表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='custom_setups'")
    if not cursor.fetchone():
        print("创建 custom_setups 表...")
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
    else:
        print("custom_setups 表已存在")
    
    conn.commit()
    conn.close()
    print("✓ 数据库迁移完成！")

if __name__ == '__main__':
    migrate()
