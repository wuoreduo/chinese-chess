#!/usr/bin/env pythonw
"""
中国象棋游戏启动器 - Windows 无控制台窗口版本
双击运行，不显示控制台窗口
"""
import sys
import os
import importlib.util

# 获取项目目录
base_dir = os.path.dirname(os.path.abspath(__file__))
controller_path = os.path.join(base_dir, 'controller.py')

# 显式加载 controller.py 模块
spec = importlib.util.spec_from_file_location("controller_main", controller_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

# 运行 GUI
module.main()
