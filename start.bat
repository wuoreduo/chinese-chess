@echo off
chcp 65001 >nul
echo ================================
echo      中国象棋游戏启动器
echo ================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未找到 Python，请先安装 Python 3.x
    echo 下载地址：https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] 检查 Python 版本...
python --version

REM 安装依赖
echo.
echo [2/3] 检查并安装依赖...
if exist "requirements.txt" (
    pip install -r requirements.txt -q
    echo 依赖安装完成
) else (
    echo 错误：未找到 requirements.txt
    pause
    exit /b 1
)

REM 启动服务器
echo.
echo [3/3] 启动游戏服务器...
echo.
echo ================================
echo 游戏已启动！
echo 浏览器访问：http://localhost:5000
echo 按 Ctrl+C 停止服务器
echo ================================
echo.

python server.py
