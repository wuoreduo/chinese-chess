# 中国象棋

<div align="center">

🏮 基于 Web 的中国象棋游戏，支持多种游戏模式 🏮

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [游戏模式](#-游戏模式) • [API 文档](#-api-文档) • [更新日志](#-更新日志)

</div>

---

## 🎮 功能特性

- **三种游戏模式**: 人人对战、人机对战、机机对战
- **中国风界面**: 宣纸纹理背景，古朴典雅
- **完整游戏规则**: 将所有象棋规则，包括憋马脚、塞象眼、炮翻山等
- **AI 对弈**: 基于 Minimax 算法 + Alpha-Beta 剪枝
- **音效系统**: 点击、走棋、吃子、将军音效
- **WebSocket 实时同步**: 支持双人在线对战
- **RESTful API**: 完整的 curl 接口支持
- **跨平台**: 支持 Windows、Linux、macOS

---

## 🚀 快速开始

### 方式一：GUI 控制器（推荐 ⭐）

图形界面，直观控制服务器，实时显示状态

**Linux/macOS:**
```bash
python3 tools/controller.py
```

**Windows:**
```
双击 tools/controller.pyw（无控制台窗口）
或运行：python tools/controller.py
```

**功能:**
- 🟢 一键启动/停止/重启
- 📊 实时显示状态（PID、运行时间、活跃游戏数）
- 📋 查看日志
- 🔗 点击链接打开浏览器

### 方式二：命令行管理脚本

**Linux/macOS:**
```bash
./scripts/manage.sh start    # 启动
./scripts/manage.sh stop     # 停止
./scripts/manage.sh restart  # 重启
./scripts/manage.sh status   # 状态
./scripts/manage.sh logs     # 日志
```

**Windows:**
```cmd
scripts\manage.bat start
scripts\manage.bat stop
scripts\manage.bat restart
scripts\manage.bat status
scripts\manage.bat logs
```

### 方式三：直接启动

```bash
python3 core/server.py
```

访问 http://localhost:5000

---

## 🎯 游戏模式

| 模式 | 图标 | 说明 |
|------|------|------|
| **人人对战** | 👤 | 两名玩家在同一设备轮流下棋 |
| **人机对战** | 🤖 | 玩家 vs AI（红方玩家，黑方 AI） |
| **机机对战** | ⚙️ | AI vs AI 自动对弈（可暂停/继续） |

---

## 🎨 界面预览

### 主菜单界面
```
┌─────────────────────────────────┐
│                                 │
│      🏮 中国象棋 🏮              │
│                                 │
│    ┌──────────────────┐         │
│    │   👤 人人对战     │         │
│    │   PvP Mode       │         │
│    └──────────────────┘         │
│                                 │
│    ┌──────────────────┐         │
│    │   🤖 人机对战     │         │
│    │   PvAI Mode      │         │
│    └──────────────────┘         │
│                                 │
│    ┌──────────────────┐         │
│    │   ⚙️ 机机对战     │         │
│    │   AIvAI Mode     │         │
│    └──────────────────┘         │
│                                 │
│       楚河 ⋅ 汉界               │
└─────────────────────────────────┘
```

### 游戏界面
```
┌─────────────────────────────────────────┐
│  ←返回  │   当前：红方走棋   │ 🔊 音效  │
├─────────────────────────────────────────┤
│                                         │
│           ⠀⠀⠀⠀⠀  楚 河 汉 界           │
│              ┌─────────────┐            │
│              │             │            │
│              │    棋 盘    │            │
│              │             │            │
│              └─────────────┘            │
│                                         │
├─────────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│  │悔棋│ │求和│ │认输│ │暂停│ │重开│   │
│  └────┘ └────┘ └────┘ └────┘ └────┘   │
└─────────────────────────────────────────┘
```

---

## 🎲 游戏功能

### 对弈操作

| 功能 | 说明 | 可用模式 |
|------|------|----------|
| ♟️ 悔棋 | 撤销上一步棋 | PvP, PvAI |
| 🤝 求和 | 提议和棋 | PvP, PvAI |
| 🏳️ 认输 | 主动认输 | PvP, PvAI |
| ⏸️ 暂停 | 暂停 AI 对弈 | AIvAI |
| 🔄 重开 | 重新开始当前模式 | 全部 |

### 求和规则

- **PvP 模式**: 一方提议，另一方确认接受则和棋
- **PvAI 模式**: AI 根据局势自动决定（劣势时接受，优势时拒绝）
- **AIvAI 模式**: 不支持手动求和

---

## 📡 API 文档

### 游戏管理

```bash
# 创建游戏
curl -X POST http://localhost:5000/api/games \
  -H "Content-Type: application/json" \
  -d '{"type": "pvai"}'

# 获取游戏列表
curl http://localhost:5000/api/games

# 获取游戏详情
curl http://localhost:5000/api/games/1

# 删除游戏
curl -X DELETE http://localhost:5000/api/games/1
```

### 走棋操作

```bash
# 走棋
curl -X POST http://localhost:5000/api/games/1/move \
  -H "Content-Type: application/json" \
  -d '{"from": [6, 4], "to": [5, 4]}'

# 悔棋
curl -X POST http://localhost:5000/api/games/1/undo
```

### 和棋与认输

```bash
# 提议和棋
curl -X POST http://localhost:5000/api/games/1/draw

# 接受和棋
curl -X POST http://localhost:5000/api/games/1/draw/accept

# 拒绝和棋
curl -X POST http://localhost:5000/api/games/1/draw/reject

# 认输
curl -X POST http://localhost:5000/api/games/1/resign
```

### 其他功能

```bash
# 获取 FEN 字符串
curl http://localhost:5000/api/games/1/fen

# AIvAI 暂停
curl -X POST http://localhost:5000/api/games/1/pause

# AIvAI 继续
curl -X POST http://localhost:5000/api/games/1/resume
```

---

## 📁 项目结构

```
中国象棋/
├── core/                  # 核心代码
│   ├── server.py         # Flask 后端 + WebSocket + REST API
│   ├── game.py           # 象棋规则引擎
│   ├── ai.py             # Minimax AI + Alpha-Beta 剪枝
│   └── database.py       # SQLite 数据库
├── static/               # 前端资源
│   ├── style.css         # 中国风样式表
│   ├── game.js           # 前端交互逻辑
│   └── sounds/           # 音效文件
│       ├── click.wav     # 点击音效
│       ├── move.wav      # 走棋音效
│       ├── capture.wav   # 吃子音效
│       └── check.wav     # 将军音效
├── templates/            # HTML 模板
│   └── index.html        # 主页面（双界面结构）
├── scripts/              # 管理脚本
│   ├── manage.sh         # Linux CLI 管理
│   ├── manage.bat        # Windows CLI 管理
│   ├── start.sh          # Linux 快速启动
│   └── start.bat         # Windows 快速启动
├── tools/                # 辅助工具
│   ├── controller.py     # GUI 控制器 (Linux)
│   └── controller.pyw    # GUI 控制器 (Windows)
├── docs/                 # 文档和截图
│   ├── README.md
│   ├── WINDOWS.md
│   └── *.png             # 界面截图
├── requirements.txt      # Python 依赖
├── AGENTS.md             # 开发代理指南 (新增)
└── chess.db              # SQLite 数据库 (运行时生成)
```

---

## 🪟 Windows 原生运行

无需 Docker 或 WSL，可直接在原生 Windows 运行：

1. 安装 [Python 3.8+](https://www.python.org/downloads/)
2. 复制整个项目到 Windows
3. 安装依赖：`pip install -r requirements.txt`
4. 双击 `tools/controller.pyw`
5. 点击"启动"按钮
6. 浏览器访问 http://localhost:5000

---

## 📦 依赖安装

```bash
pip install -r requirements.txt
```

**依赖列表:**
- Flask >= 2.0.0 (Web 框架)
- Flask-SocketIO >= 5.0.0 (WebSocket)
- Flask-CORS >= 3.0.0 (跨域支持)
- python-socketio >= 5.0.0 (Socket.IO)
- psutil >= 5.8.0 (进程管理)
- Werkzeug >= 2.0.0 (WSGI 工具)

---

## 🎯 游戏规则实现

### 棋子走法

| 棋子 | 走法规则 |
|------|----------|
| 帅/将 | 九宫格内，每次一步，横或竖 |
| 仕/士 | 九宫格内，每次一步，斜走 |
| 相/象 | 己方半场，走"田"字，塞象眼 |
| 马 | 走"日"字，憋马脚 |
| 车 | 直线任意距离，不隔子 |
| 炮 | 直线移动，吃子需翻山 |
| 兵/卒 | 过河前只能前进，过河后可横走 |

### 特殊规则

- **将帅对面**: 不允许将帅直接对面
- **困毙**: 无棋可走判负
- **长将**: 禁止长将（待实现）

---

## 🛠️ 技术栈

- **后端**: Python 3 + Flask + Flask-SocketIO
- **前端**: HTML5 + CSS3 + JavaScript (原生)
- **AI**: Minimax + Alpha-Beta 剪枝
- **数据库**: SQLite
- **通信**: WebSocket + REST API

---

## 📝 更新日志

### v2.1 (最新)
- 🐛 修复认输显示：红方认输时正确显示"黑方获胜"
- 🐛 修复机机对战：AI 获胜时正确显示游戏结束弹窗
- 🐛 修复循环走棋卡死问题：
  - 新增连续重复计数器，跟踪每局游戏的连续重复次数
  - 连续重复 6 次 (12 回合) 时强制 AI 变招
  - 只有双方无进攻棋子且局面重复 4 次时才判和
- 📄 新增 AGENTS.md 开发指南文档

### v2.0
- 🎨 重构前端界面，新增中国风主菜单
- 🏠 双界面结构：主菜单 + 游戏界面
- 🤝 新增求和功能（PvP 弹窗确认，PvAI 自动决策）
- 🏳️ 新增认输功能
- ⏸️ AIvAI 模式支持暂停/继续
- 🔊 音效系统优化
- 📱 响应式设计，支持移动端

### v1.0
- 基础游戏功能
- 三种游戏模式
- AI 对弈
- REST API
- WebSocket 实时同步

---

## 📄 许可证

MIT License

---

<div align="center">

**🎮 享受游戏！Have fun! 🎮**

</div>
