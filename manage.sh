#!/bin/bash

# 中国象棋游戏管理脚本
# 用法：./manage.sh [start|stop|restart|status]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.server.pid"
LOG_FILE="$SCRIPT_DIR/.server.log"
SERVER_SCRIPT="$SCRIPT_DIR/server.py"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 检查进程是否存在
is_running() {
    if [ -f "$PID_FILE" ]; then
        pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# 获取进程 PID（包括子进程）
get_all_pids() {
    if [ -f "$PID_FILE" ]; then
        main_pid=$(cat "$PID_FILE")
        # 获取主进程和所有子进程
        all_pids="$main_pid"
        child_pids=$(pgrep -P "$main_pid" 2>/dev/null)
        if [ -n "$child_pids" ]; then
            all_pids="$all_pids $child_pids"
        fi
        echo "$all_pids"
    fi
}

# 启动服务器
start_server() {
    if is_running; then
        pid=$(cat "$PID_FILE")
        print_warning "服务器已在运行 (PID: $pid)"
        print_status "访问地址：http://localhost:5000"
        return 0
    fi

    cd "$SCRIPT_DIR"

    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        print_error "未找到 Python3"
        exit 1
    fi

    # 检查依赖
    if [ -f "requirements.txt" ]; then
        print_status "检查依赖..."
        pip3 install -r requirements.txt -q 2>/dev/null
    fi

    # 启动服务
    print_status "启动服务器..."
    nohup python3 "$SERVER_SCRIPT" > "$LOG_FILE" 2>&1 &
    pid=$!
    echo "$pid" > "$PID_FILE"

    # 等待启动
    sleep 2

    if is_running; then
        print_status "服务器已启动 (PID: $pid)"
        print_status "访问地址：http://localhost:5000"
        print_status "日志文件：$LOG_FILE"
    else
        print_error "启动失败，查看日志：$LOG_FILE"
        exit 1
    fi
}

# 停止服务器
stop_server() {
    if ! is_running; then
        print_warning "服务器未运行"
        rm -f "$PID_FILE" 2>/dev/null
        return 0
    fi

    pids=$(get_all_pids)
    print_status "停止服务器 (PIDs: $pids)..."

    # 温和终止
    for pid in $pids; do
        kill "$pid" 2>/dev/null
    done

    # 等待进程结束
    for i in {1..5}; do
        if ! is_running; then
            break
        fi
        sleep 1
    done

    # 强制终止残留进程
    if is_running; then
        print_warning "强制终止进程..."
        for pid in $pids; do
            kill -9 "$pid" 2>/dev/null
        done
    fi

    rm -f "$PID_FILE" 2>/dev/null
    print_status "服务器已停止"
}

# 重启服务器
restart_server() {
    stop_server
    sleep 1
    start_server
}

# 查看状态
status_server() {
    if is_running; then
        pid=$(cat "$PID_FILE")
        uptime=$(ps -p "$pid" -o etime= 2>/dev/null | xargs)
        print_status "服务器运行中"
        echo "  PID: $pid"
        echo "  运行时间：$uptime"
        echo "  访问地址：http://localhost:5000"
        
        # 显示活跃游戏数
        if command -v curl &> /dev/null; then
            games=$(curl -s http://localhost:5000/api/games 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('games', [])))" 2>/dev/null)
            if [ -n "$games" ]; then
                echo "  活跃游戏：$games"
            fi
        fi
    else
        print_warning "服务器未运行"
    fi
}

# 查看日志
view_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -50 "$LOG_FILE"
    else
        print_warning "日志文件不存在"
    fi
}

# 主函数
case "${1:-status}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        status_server
        ;;
    logs)
        view_logs
        ;;
    *)
        echo "用法：$0 {start|stop|restart|status|logs}"
        echo ""
        echo "命令:"
        echo "  start   - 启动服务器"
        echo "  stop    - 停止服务器"
        echo "  restart - 重启服务器"
        echo "  status  - 查看状态"
        echo "  logs    - 查看日志"
        exit 1
        ;;
esac
