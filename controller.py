#!/usr/bin/env python3
"""
中国象棋游戏启动器 - GUI 版本
支持系统托盘，图形化控制服务器启停
"""

import os
import sys
import subprocess
import signal
import time
import urllib.request
import json
import threading
from pathlib import Path

# 尝试导入 tkinter
try:
    import tkinter as tk
    from tkinter import ttk, messagebox
except ImportError:
    print("错误：需要安装 tkinter")
    print("Ubuntu/Debian: sudo apt-get install python3-tk")
    print("Windows: 已内置")
    sys.exit(1)


class ChessGameController:
    """中国象棋游戏控制器"""
    
    def __init__(self, base_dir=None):
        if base_dir is None:
            base_dir = Path(__file__).parent
        self.base_dir = Path(base_dir)
        self.pid_file = self.base_dir / '.server.pid'
        self.log_file = self.base_dir / '.server.log'
        self.server_script = self.base_dir / 'server.py'
        self.process = None
    
    def is_running(self):
        """检查服务器是否运行中"""
        if self.pid_file.exists():
            try:
                pid = int(self.pid_file.read_text().strip())
                os.kill(pid, 0)  # 检查进程是否存在
                return True
            except (ProcessLookupError, ValueError, PermissionError):
                self.pid_file.unlink(missing_ok=True)
        return False
    
    def get_pid(self):
        """获取进程 PID"""
        if self.pid_file.exists():
            try:
                return int(self.pid_file.read_text().strip())
            except ValueError:
                return None
        return None
    
    def get_all_pids(self):
        """获取主进程和子进程"""
        pids = []
        pid = self.get_pid()
        if pid:
            pids.append(pid)
            # 查找子进程
            try:
                import psutil
                parent = psutil.Process(pid)
                children = parent.children(recursive=True)
                pids.extend([c.pid for c in children])
            except (ImportError, psutil.NoSuchProcess):
                # 没有 psutil 时，尝试通过进程组获取
                try:
                    result = subprocess.run(
                        ['pgrep', '-P', str(pid)],
                        capture_output=True, text=True
                    )
                    if result.stdout.strip():
                        pids.extend(map(int, result.stdout.strip().split()))
                except Exception:
                    pass
        return pids
    
    def start(self):
        """启动服务器"""
        if self.is_running():
            return True, "服务器已在运行"
        
        try:
            # 启动进程
            log_f = open(self.log_file, 'w')
            self.process = subprocess.Popen(
                [sys.executable, str(self.server_script)],
                cwd=str(self.base_dir),
                stdout=log_f,
                stderr=log_f,
                start_new_session=True  # 创建新进程组
            )
            self.pid_file.write_text(str(self.process.pid))
            log_f.close()
            
            # 等待启动
            time.sleep(2)
            
            if self.is_running():
                return True, f"服务器已启动 (PID: {self.process.pid})"
            else:
                return False, "启动失败，请查看日志"
        except Exception as e:
            return False, str(e)
    
    def stop(self):
        """停止服务器"""
        if not self.is_running():
            self.pid_file.unlink(missing_ok=True)
            return True, "服务器未运行"
        
        pids = self.get_all_pids()
        
        # 温和终止
        for pid in pids:
            try:
                if sys.platform == 'win32':
                    subprocess.run(['taskkill', '/PID', str(pid), '/T'], 
                                 capture_output=True)
                else:
                    os.killpg(pid, signal.SIGTERM)
            except (ProcessLookupError, PermissionError, OSError):
                pass
        
        # 等待进程结束
        for _ in range(5):
            time.sleep(1)
            if not self.is_running():
                self.pid_file.unlink(missing_ok=True)
                return True, "服务器已停止"
        
        # 强制终止
        for pid in pids:
            try:
                if sys.platform == 'win32':
                    subprocess.run(['taskkill', '/PID', str(pid), '/F', '/T'],
                                 capture_output=True)
                else:
                    os.killpg(pid, signal.SIGKILL)
            except (ProcessLookupError, PermissionError, OSError):
                pass
        
        self.pid_file.unlink(missing_ok=True)
        return True, "服务器已强制停止"
    
    def restart(self):
        """重启服务器"""
        self.stop()
        time.sleep(1)
        return self.start()
    
    def get_status(self):
        """获取服务器状态"""
        if not self.is_running():
            return {'running': False}
        
        pid = self.get_pid()
        status = {
            'running': True,
            'pid': pid,
        }
        
        # 获取运行时间
        try:
            if sys.platform == 'win32':
                import psutil
                proc = psutil.Process(pid)
                status['uptime'] = time.time() - proc.create_time()
            else:
                result = subprocess.run(
                    ['ps', '-p', str(pid), '-o', 'etime='],
                    capture_output=True, text=True
                )
                if result.stdout.strip():
                    status['uptime_str'] = result.stdout.strip()
        except Exception:
            pass
        
        # 获取游戏数
        try:
            req = urllib.request.urlopen(
                'http://localhost:5000/api/games',
                timeout=2
            )
            data = json.loads(req.read().decode())
            status['games'] = len(data.get('games', []))
        except Exception:
            status['games'] = 0
        
        return status
    
    def get_logs(self, lines=50):
        """获取日志"""
        if not self.log_file.exists():
            return []
        
        try:
            with open(self.log_file, 'r', encoding='utf-8') as f:
                all_lines = f.readlines()
                return all_lines[-lines:]
        except Exception:
            return []


class ControllerGUI:
    """控制器图形界面"""
    
    def __init__(self):
        self.controller = ChessGameController()
        self.status_update_interval = 2000  # 2 秒更新一次状态
        
        # 创建主窗口
        self.root = tk.Tk()
        self.root.title("中国象棋游戏控制器")
        self.root.geometry("400x350")
        self.root.resizable(True, True)
        
        # 设置窗口图标（如果有的话）
        try:
            self.root.iconbitmap('icon.ico')
        except Exception:
            pass
        
        # 创建界面
        self._create_widgets()
        
        # 启动状态更新
        self._update_status()
        
        # 关闭窗口时清理
        self.root.protocol("WM_DELETE_WINDOW", self._on_closing)
    
    def _create_widgets(self):
        """创建界面组件"""
        # 主框架
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # 配置网格权重
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        
        # 标题
        title_label = ttk.Label(
            main_frame, 
            text="中国象棋游戏",
            font=('Microsoft YaHei', 16, 'bold')
        )
        title_label.grid(row=0, column=0, pady=(0, 20))
        
        # 状态显示
        status_frame = ttk.LabelFrame(main_frame, text="服务器状态", padding="10")
        status_frame.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        status_frame.columnconfigure(1, weight=1)
        
        ttk.Label(status_frame, text="状态:").grid(row=0, column=0, sticky=tk.W)
        self.status_label = ttk.Label(status_frame, text="检查中...", font=('Arial', 10, 'bold'))
        self.status_label.grid(row=0, column=1, sticky=tk.W, padx=(10, 0))
        
        ttk.Label(status_frame, text="PID:").grid(row=1, column=0, sticky=tk.W, pady=(5, 0))
        self.pid_label = ttk.Label(status_frame, text="-")
        self.pid_label.grid(row=1, column=1, sticky=tk.W, padx=(10, 0), pady=(5, 0))
        
        ttk.Label(status_frame, text="活跃游戏:").grid(row=2, column=0, sticky=tk.W, pady=(5, 0))
        self.games_label = ttk.Label(status_frame, text="-")
        self.games_label.grid(row=2, column=1, sticky=tk.W, padx=(10, 0), pady=(5, 0))
        
        ttk.Label(status_frame, text="运行时间:").grid(row=3, column=0, sticky=tk.W, pady=(5, 0))
        self.uptime_label = ttk.Label(status_frame, text="-")
        self.uptime_label.grid(row=3, column=1, sticky=tk.W, padx=(10, 0), pady=(5, 0))
        
        # 按钮框架
        btn_frame = ttk.Frame(main_frame)
        btn_frame.grid(row=2, column=0, pady=10)
        
        # 按钮样式
        btn_style = {'width': 10, 'padding': (10, 5)}
        
        self.start_btn = ttk.Button(
            btn_frame, 
            text="启动",
            command=self._on_start,
            **btn_style
        )
        self.start_btn.grid(row=0, column=0, padx=5)
        
        self.stop_btn = ttk.Button(
            btn_frame,
            text="停止",
            command=self._on_stop,
            **btn_style
        )
        self.stop_btn.grid(row=0, column=1, padx=5)
        
        self.restart_btn = ttk.Button(
            btn_frame,
            text="重启",
            command=self._on_restart,
            **btn_style
        )
        self.restart_btn.grid(row=0, column=2, padx=5)
        
        # 访问链接
        url_frame = ttk.Frame(main_frame)
        url_frame.grid(row=3, column=0, pady=(10, 0))
        
        ttk.Label(url_frame, text="访问地址:").pack(side=tk.LEFT)
        self.url_label = ttk.Label(
            url_frame, 
            text="http://localhost:5000",
            foreground='blue',
            cursor='hand2'
        )
        self.url_label.pack(side=tk.LEFT, padx=(5, 0))
        self.url_label.bind('<Button-1>', self._open_url)
        
        # 日志按钮
        log_btn = ttk.Button(
            main_frame,
            text="查看日志",
            command=self._view_logs
        )
        log_btn.grid(row=4, column=0, pady=(10, 0))
        
        # 日志文本框
        log_frame = ttk.LabelFrame(main_frame, text="最近日志", padding="5")
        log_frame.grid(row=5, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(10, 0))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        
        self.log_text = tk.Text(log_frame, height=8, width=50, wrap=tk.WORD)
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        scrollbar = ttk.Scrollbar(log_frame, orient=tk.VERTICAL, command=self.log_text.yview)
        scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))
        self.log_text['yscrollcommand'] = scrollbar.set
    
    def _update_status(self):
        """更新状态显示"""
        status = self.controller.get_status()
        
        if status.get('running'):
            self.status_label.config(text="运行中", foreground='green')
            self.pid_label.config(text=str(status.get('pid', '-')))
            self.games_label.config(text=str(status.get('games', '-')))
            
            uptime = status.get('uptime')
            if uptime:
                minutes = int(uptime // 60)
                seconds = int(uptime % 60)
                self.uptime_label.config(text=f"{minutes}分{seconds}秒")
            elif status.get('uptime_str'):
                self.uptime_label.config(text=status.get('uptime_str'))
            else:
                self.uptime_label.config(text="-")
            
            self.start_btn.config(state=tk.DISABLED)
            self.stop_btn.config(state=tk.NORMAL)
            self.restart_btn.config(state=tk.NORMAL)
        else:
            self.status_label.config(text="已停止", foreground='red')
            self.pid_label.config(text="-")
            self.games_label.config(text="-")
            self.uptime_label.config(text="-")
            
            self.start_btn.config(state=tk.NORMAL)
            self.stop_btn.config(state=tk.DISABLED)
            self.restart_btn.config(state=tk.DISABLED)
        
        # 更新日志
        self._update_logs()
        
        # 定时更新
        self.root.after(self.status_update_interval, self._update_status)
    
    def _update_logs(self):
        """更新日志显示"""
        logs = self.controller.get_logs(10)
        self.log_text.config(state=tk.NORMAL)
        self.log_text.delete(1.0, tk.END)
        for line in logs:
            self.log_text.insert(tk.END, line)
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)
    
    def _on_start(self):
        """启动按钮点击"""
        self.start_btn.config(state=tk.DISABLED)
        success, message = self.controller.start()
        
        if success:
            messagebox.showinfo("提示", message)
        else:
            messagebox.showerror("错误", message)
        
        self._update_status()
    
    def _on_stop(self):
        """停止按钮点击"""
        if not messagebox.askyesno("确认", "确定要停止服务器吗？"):
            return
        
        self.stop_btn.config(state=tk.DISABLED)
        success, message = self.controller.stop()
        
        if success:
            messagebox.showinfo("提示", message)
        else:
            messagebox.showerror("错误", message)
        
        self._update_status()
    
    def _on_restart(self):
        """重启按钮点击"""
        if not messagebox.askyesno("确认", "确定要重启服务器吗？"):
            return
        
        self.restart_btn.config(state=tk.DISABLED)
        success, message = self.controller.restart()
        
        if success:
            messagebox.showinfo("提示", message)
        else:
            messagebox.showerror("错误", message)
        
        self._update_status()
    
    def _view_logs(self):
        """查看日志"""
        log_window = tk.Toplevel(self.root)
        log_window.title("服务器日志")
        log_window.geometry("600x400")
        
        text = tk.Text(log_window, wrap=tk.WORD)
        text.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        logs = self.controller.get_logs(200)
        for line in logs:
            text.insert(tk.END, line)
        
        text.config(state=tk.DISABLED)
    
    def _open_url(self, event):
        """打开浏览器"""
        import webbrowser
        webbrowser.open('http://localhost:5000')
    
    def _on_closing(self):
        """关闭窗口"""
        if messagebox.askokcancel("退出", "确定要退出控制器吗？\n服务器将继续运行"):
            self.root.destroy()
    
    def run(self):
        """运行应用"""
        self.root.mainloop()


def main():
    """主函数"""
    app = ControllerGUI()
    app.run()


if __name__ == '__main__':
    main()
