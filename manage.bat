@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM 中国象棋游戏管理脚本
REM 用法：manage.bat [start^|stop^|restart^|status]

set "SCRIPT_DIR=%~dp0"
set "PID_FILE=%SCRIPT_DIR%.server.pid"
set "LOG_FILE=%SCRIPT_DIR%.server.log"
set "SERVER_SCRIPT=%SCRIPT_DIR%server.py"

goto :main

:is_running
if exist "%PID_FILE%" (
    set /p pid=<"%PID_FILE%"
    tasklist /FI "PID eq !pid!" 2>nul | findstr "!pid!" >nul 2>&1
    if !errorlevel! equ 0 (
        exit /b 0
    )
)
exit /b 1

:get_all_pids
if exist "%PID_FILE%" (
    set /p main_pid=<"%PID_FILE%"
    echo !main_pid!
    REM Windows 获取子进程较复杂，这里简化处理
    for /f "tokens=2" %%a in ('wmic process where "ParentProcessId=!main_pid!" get ProcessId 2^>nul') do (
        echo %%a
    )
)
exit /b 0

:start_server
call :is_running
if !errorlevel! equ 0 (
    set /p pid=<"%PID_FILE%"
    echo [WARN] 服务器已在运行 ^(PID: !pid!^)
    echo [INFO] 访问地址：http://localhost:5000
    exit /b 0
)

cd /d "%SCRIPT_DIR%"

REM 检查 Python
python --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] 未找到 Python
    exit /b 1
)

REM 检查依赖
if exist "requirements.txt" (
    echo [INFO] 检查依赖...
    pip install -r requirements.txt -q 2>nul
)

REM 启动服务
echo [INFO] 启动服务器...
start /B python "%SERVER_SCRIPT%" > "%LOG_FILE%" 2>&1
set pid=!ERRORLEVEL!

REM 等待启动
timeout /t 3 /nobreak >nul

call :is_running
if !errorlevel! equ 0 (
    echo !pid!> "%PID_FILE%"
    echo [INFO] 服务器已启动
    echo [INFO] 访问地址：http://localhost:5000
    echo [INFO] 日志文件：%LOG_FILE%
) else (
    echo [ERROR] 启动失败
    exit /b 1
)
exit /b 0

:stop_server
call :is_running
if !errorlevel! neq 0 (
    echo [WARN] 服务器未运行
    del "%PID_FILE%" 2>nul
    exit /b 0
)

set /p pid=<"%PID_FILE%"
echo [INFO] 停止服务器 ^(PID: !pid!^)...

REM 温和终止
taskkill /PID !pid! /T 2>nul

REM 等待
timeout /t 3 /nobreak >nul

REM 强制终止
taskkill /PID !pid! /F 2>nul

del "%PID_FILE%" 2>nul
echo [INFO] 服务器已停止
exit /b 0

:restart_server
call :stop_server
timeout /t 1 /nobreak >nul
call :start_server
exit /b 0

:status_server
call :is_running
if !errorlevel! equ 0 (
    set /p pid=<"%PID_FILE%"
    echo [INFO] 服务器运行中
    echo   PID: !pid!
    echo   访问地址：http://localhost:5000
) else (
    echo [WARN] 服务器未运行
)
exit /b 0

:view_logs
if exist "%LOG_FILE%" (
    type "%LOG_FILE%"
) else (
    echo [WARN] 日志文件不存在
)
exit /b 0

:main
if "%~1"=="" goto :status_server
if /i "%~1"=="start" goto :start_server
if /i "%~1"=="stop" goto :stop_server
if /i "%~1"=="restart" goto :restart_server
if /i "%~1"=="status" goto :status_server
if /i "%~1"=="logs" goto :view_logs

echo 用法：%~nx0 {start^|stop^|restart^|status^|logs}
echo.
echo 命令:
echo   start   - 启动服务器
echo   stop    - 停止服务器
echo   restart - 重启服务器
echo   status  - 查看状态
echo   logs    - 查看日志
exit /b 1
