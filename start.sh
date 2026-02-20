#!/bin/bash

# 中国象棋游戏一键启动脚本

echo "================================"
echo "     中国象棋游戏启动器"
echo "================================"
echo ""

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "错误：未找到 Python3，请先安装 Python3"
    exit 1
fi

echo "[1/3] 检查 Python 版本..."
python3 --version

# 检查依赖是否已安装
echo ""
echo "[2/3] 检查并安装依赖..."
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt -q
    echo "依赖安装完成"
else
    echo "错误：未找到 requirements.txt"
    exit 1
fi

# 启动服务器
echo ""
echo "[3/3] 启动游戏服务器..."
echo ""
echo "================================"
echo "游戏已启动！"
echo "浏览器访问：http://localhost:5000"
echo "按 Ctrl+C 停止服务器"
echo "================================"
echo ""

python3 server.py
