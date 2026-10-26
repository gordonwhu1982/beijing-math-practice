# 本地开发（dev/）

| 脚本 | 作用 |
| --- | --- |
| `check.sh` | 一条命令跑完引擎测试 + `scripts/validate.py` + `verify_questions.py`。改完 `data/*.json` 必跑。加 `quick` 只跑前两项。 |
| `start-server.bat` | Windows 起本地静态服务（默认 8000，可传端口）。 |
| `push-github.sh` | 推送 main 到 GitHub。 |

## 约定

- 换行统一 LF（`.gitattributes`），不要在 Windows 上开 `core.autocrlf`，否则整文件 diff 会掩盖真实改动。
- 每个改动一次提交，提交信息写清「改了什么数据 / 为什么」。
- `data/questions.json` 有 4.3 MB，逐条改动请用文本级定点插入（保持 JSON 缩进风格），不要整库重新序列化，否则一次改动会把上万行标成修改。
- 页面新增外链会破坏离线能力：`scripts/` 里的体检与页面「无外网请求」检查都会看这一点。
