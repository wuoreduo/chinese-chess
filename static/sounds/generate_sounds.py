#!/usr/bin/env python3
"""
生成中国象棋音效 - 木质敲击声
使用更柔和、温暖的音色
"""

import numpy as np
import wave
import struct
import os

SAMPLE_RATE = 44100
DURATION = 0.15  # 短促的声音

def generate_wood_sound(filename, base_freq=180, decay=0.08, noise_level=0.3):
    """
    生成木质敲击声
    - 基频更低，模拟木质共鸣
    - 添加柔和的噪声，模拟木头碰撞
    - 快速衰减
    """
    n_samples = int(SAMPLE_RATE * DURATION)
    t = np.linspace(0, DURATION, n_samples)
    
    # 基频（低沉的木质音）
    base = np.sin(2 * np.pi * base_freq * t)
    
    # 二次谐波（温暖感）
    harmonic2 = 0.5 * np.sin(2 * np.pi * base_freq * 2 * t)
    
    # 四次谐波（木质感）
    harmonic4 = 0.2 * np.sin(2 * np.pi * base_freq * 4 * t)
    
    # 高频噪声（敲击声）
    np.random.seed(42)
    noise = np.random.uniform(-1, 1, n_samples)
    
    # 低通滤波噪声
    noise = np.convolve(noise, np.ones(5)/5, mode='same')
    
    # 包络 - 快速衰减
    envelope = np.exp(-t * 30)
    
    # 混合
    sound = (0.6 * base + 0.25 * harmonic2 + 0.1 * harmonic4 + noise_level * noise) * envelope
    
    # 归一化
    sound = sound / np.max(np.abs(sound)) * 0.8
    
    write_wav(filename, sound)

def generate_move_sound(filename):
    """移动棋子声 - 较轻的木质摩擦声"""
    generate_wood_sound(filename, base_freq=200, decay=0.06, noise_level=0.2)

def generate_capture_sound(filename):
    """吃子声 - 更响亮的撞击声"""
    n_samples = int(SAMPLE_RATE * 0.2)
    t = np.linspace(0, 0.2, n_samples)
    
    # 基频
    base = np.sin(2 * np.pi * 150 * t)
    harmonic2 = 0.5 * np.sin(2 * np.pi * 150 * 2 * t)
    harmonic3 = 0.3 * np.sin(2 * np.pi * 150 * 3 * t)
    
    # 更强的噪声（撞击）
    np.random.seed(123)
    noise = np.random.uniform(-1, 1, n_samples)
    noise = np.convolve(noise, np.ones(3)/3, mode='same')
    
    # 包络
    envelope = np.exp(-t * 25)
    
    sound = (0.5 * base + 0.3 * harmonic2 + 0.2 * harmonic3 + 0.4 * noise) * envelope
    sound = sound / np.max(np.abs(sound)) * 0.9
    
    write_wav(filename, sound)

def generate_check_sound(filename):
    """将军声 - 更紧张的声音（稍高音调）"""
    n_samples = int(SAMPLE_RATE * 0.25)
    t = np.linspace(0, 0.25, n_samples)
    
    # 双音（紧张感）
    base1 = np.sin(2 * np.pi * 220 * t)
    base2 = np.sin(2 * np.pi * 277 * t)  # 大三度
    
    # 谐波
    harmonic2 = 0.4 * np.sin(2 * np.pi * 220 * 2 * t)
    
    # 噪声
    np.random.seed(456)
    noise = np.random.uniform(-1, 1, n_samples)
    noise = np.convolve(noise, np.ones(5)/5, mode='same')
    
    # 包络
    envelope = np.exp(-t * 20)
    
    sound = (0.4 * base1 + 0.3 * base2 + 0.25 * harmonic2 + 0.25 * noise) * envelope
    sound = sound / np.max(np.abs(sound)) * 0.85
    
    write_wav(filename, sound)

def generate_click_sound(filename):
    """点击棋子声 - 清脆但不尖锐"""
    generate_wood_sound(filename, base_freq=250, decay=0.05, noise_level=0.15)

def write_wav(filename, sound_data):
    """写入 WAV 文件"""
    n_samples = len(sound_data)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # 单声道
        wav_file.setsampwidth(2)  # 16 位
        wav_file.setframerate(SAMPLE_RATE)
        
        for sample in sound_data:
            # 转换为 16 位整数
            sample_int = int(sample * 32767)
            wav_file.writeframes(struct.pack('<h', sample_int))
    
    print(f"生成：{filename}")

if __name__ == '__main__':
    sounds_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("生成中国象棋音效（木质敲击声）...")
    generate_click_sound(os.path.join(sounds_dir, 'click.wav'))
    generate_move_sound(os.path.join(sounds_dir, 'move.wav'))
    generate_capture_sound(os.path.join(sounds_dir, 'capture.wav'))
    generate_check_sound(os.path.join(sounds_dir, 'check.wav'))
    print("完成！")
