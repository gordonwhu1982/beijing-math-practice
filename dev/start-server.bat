@echo off
rem 本地启动站点（默认 8000；参数可换端口：start-server.bat 8080）
cd /d "%~dp0.."
if "%1"=="" (set PORT=8000) else (set PORT=%1)
echo 首页       http://localhost:%PORT%/
echo 知识图谱   http://localhost:%PORT%/explore/
echo 诊断       http://localhost:%PORT%/diagnose/
echo 诊断演示   http://localhost:%PORT%/diagnose/?target=cnm_221^&demo=1
python -m http.server %PORT%
