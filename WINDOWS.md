# Windows 运行说明

## 为什么使用 `.pyw` 文件？

Windows 上有两种 Python 脚本扩展名：

| 扩展名 | 说明 |
|--------|------|
| `.py` | 运行时会显示黑色控制台窗口 |
| `.pyw` | 运行时**不显示**控制台窗口，适合 GUI 程序 |

## 文件说明

```
controller.py    # GUI 主程序（包含所有逻辑）
controller.pyw   # Windows 启动器（无控制台窗口）
```

## 为什么需要两个文件？

1. **`controller.py`** - 包含完整的 GUI 代码
   - Linux: `python3 controller.py` ✅
   - Windows: `python controller.py` ❌ 会显示控制台窗口

2. **`controller.pyw`** - Windows 专用启动器
   - 使用 `pythonw.exe` 运行
   - 不显示控制台窗口
   - 双击即可运行，体验更像原生应用

## Windows 使用方法

### 方法 1：双击运行（推荐）
```
双击 → controller.pyw
```
界面无控制台窗口，体验最佳。

### 方法 2：命令行运行
```cmd
python controller.py
```
会显示控制台窗口，但功能相同。

### 方法 3：使用管理脚本
```cmd
manage.bat start
```

## 关联 `.pyw` 文件

如果双击 `.pyw` 没有反应，可能是文件关联问题：

1. 右键 `controller.pyw` → 打开方式 → 选择 Python
2. 或者运行：
```cmd
assoc .pyw=Python.File
ftype Python.File="C:\Python39\pythonw.exe" "%1" %*
```

## 依赖

Windows 上 Python 已内置 tkinter，无需额外安装。

只需安装项目依赖：
```cmd
pip install -r requirements.txt
```
