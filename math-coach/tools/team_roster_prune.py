# -*- coding: utf-8 -*-
"""把会话名册里那几个「接了活不交作业」的旧成员摘掉。

名册只存在于会话文件里（~/.dsh/storages/session_projcache/sessions/<id>.json 的
record.rows.agentTeam.val.members），DSH 这一版没有删除成员的接口：list_agents /
spawn_teammate / interrupt_agent 只能看、只能加、只能打断，agent_teams_remove_member
只作用于 AgentTeams 团队里的成员。所以只能在 DSH 关掉之后改文件。

    python tools/team_roster_prune.py                 # 只打印计划
    python tools/team_roster_prune.py --apply         # 真改（先写 .bak）
    python tools/team_roster_prune.py --apply --drop kg-v1
    python tools/team_roster_prune.py --list          # 每个成员现在用的是哪个模型
    python tools/team_roster_prune.py --set-model transsion/deepseek-v4.1-flash-1017/high --all-kept
                                                      # 把成员的模型改回「跟主 agent 一样」
"""
import argparse
import glob
import io
import json
import os
import re
import socket
import subprocess
import sys
import time

HOME = os.path.expanduser("~")
SESS = os.environ.get("MC_SESS") or os.path.join(HOME, ".dsh", "storages", "session_projcache", "sessions")

# 默认要摘掉的：三个 agency-* 老成员（2026-11-03 实测：ping 得回，接大活不交产出）
DEFAULT_DROP = [
    "agency-product-manager-c6c8f0389d",
    "agency-design-ux-researcher-6f953a439f",
    "agency-engineering-software-architect-6eca1ea825",
]


def _tasklist():
    """当前在跑的进程里，名字像 DSH 的那些（名字里带 deepseek / dsh）。"""
    try:
        out = subprocess.run(["tasklist", "/FO", "CSV", "/NH"], capture_output=True,
                             text=True, errors="replace").stdout
    except Exception:
        return []
    res = []
    for line in out.splitlines():
        parts = [x.strip().strip('"') for x in line.split('","')]
        if len(parts) >= 2 and re.search(r"deepseek|\bdsh\b", parts[0], re.I):
            res.append((parts[0], parts[1]))
    return res


def dsh_alive():
    """DSH 还开着的全部证据。返回空列表才算「真的关了」。

    2026-11-03 踩过的坑：只探 62163-62172 这几个端口不够。DSH 重启后端口会换
    （实测换到 63490），于是「已经退出」被误判成真，改完的文件立刻被活着的进程按
    内存里的 8 个成员覆盖回去，界面上看起来就是「改了没用」。所以改成按进程名找。
    """
    ev = []
    for name, pid in _tasklist():
        ev.append("进程 %s（PID %s）" % (name, pid))
    return ev


def wait_stable(path, seconds=6.0):
    """写完再盯一会儿：有进程在跑，就会把这个文件重新写一遍。

    返回 True 表示这段时间没人动它（改动能留下），False 表示被覆盖了。
    """
    st = os.stat(path)
    sig = (st.st_mtime, st.st_size)
    t0 = time.time()
    while time.time() - t0 < seconds:
        time.sleep(0.4)
        st = os.stat(path)
        if (st.st_mtime, st.st_size) != sig:
            return False
    return True


def biggest_session():
    """挑成员最多的那个会话——那就是当前这条会话。"""
    best, best_n = None, -1
    for p in glob.glob(os.path.join(SESS, "*.json")):
        try:
            d = json.load(io.open(p, encoding="utf-8"))
            val = d["record"]["rows"]["agentTeam"]["val"]
            n = len(val.get("members") or [])
        except Exception:
            continue
        if n > best_n:
            best, best_n = p, n
    return best, best_n


def child_model(cid):
    """成员自己的会话文件里记着它这一路用的是哪个 provider/model/effort。
    名册（agentTeam.members）不存模型，模型在子会话的 modelSelection.lastUsed。"""
    p = os.path.join(SESS, cid + ".json")
    if not os.path.exists(p):
        return None, None
    d = json.load(io.open(p, encoding="utf-8"))
    rows = d["record"]["rows"]
    sel = (rows.get("modelSelection") or {}).get("val") or {}
    return p, sel.get("lastUsed")


def cmd_list(members):
    for m in members:
        p, used = child_model(m.get("id") or "")
        if used is None:
            print("  %-46s 会话文件缺失或没有 modelSelection" % m.get("name"))
            continue
        print("  %-46s %s/%s  effort=%s" % (m.get("name"), used.get("provider"),
                                            used.get("model"), used.get("reasoningEffort")))
    return 0


def cmd_set_model(members, target, names, apply_it):
    provider, model, effort = target.split("/")
    touched, missing = [], []
    for m in members:
        if names and m.get("name") not in names:
            continue
        p, used = child_model(m.get("id") or "")
        if p is None:
            missing.append(m.get("name"))
            continue
        if used and used.get("provider") == provider and used.get("model") == model \
                and used.get("reasoningEffort") == effort:
            continue
        touched.append((m.get("name"), p, used))
    if not touched:
        print("没有要改的：已经是 %s" % target)
        return 0
    for name, p, used in touched:
        print("  %-46s %s -> %s" % (name, json.dumps(used, ensure_ascii=False) if used else "无", target))
    if missing:
        print("  跳过（没有会话文件）: " + "、".join([str(x) for x in missing]))
    if not apply_it:
        print("只是预览。真改加 --apply。")
        return 0
    stamp = time.strftime("%Y%m%d_%H%M%S")
    for name, p, used in touched:
        d = json.load(io.open(p, encoding="utf-8"))
        rows = d["record"]["rows"]
        sel = rows.setdefault("modelSelection", {"ver": 1, "seq": 0, "val": {}})
        val = sel.setdefault("val", {})
        val["lastUsed"] = {"provider": provider, "model": model, "reasoningEffort": effort}
        val["pending"] = None
        sel["ver"] = int(sel.get("ver") or 0) + 1
        io.open(p + ".bak-" + stamp, "wb").write(io.open(p, "rb").read())
        tmp = p + ".tmp"
        io.open(tmp, "w", encoding="utf-8", newline="").write(json.dumps(d, ensure_ascii=False))
        os.replace(tmp, p)
        print("  改好 " + str(name))
    print("备份后缀 .bak-" + stamp)
    return 0


def purge_child_sessions(ids, stamp):
    """把被摘掉成员自己的子会话文件挪走。

    名册条目的 id 就是子会话文件名（<childId>.json）。只删名册、留着子会话，DSH
    下次启动有可能按子会话把它们重新登记回来，所以真正要「删干净」得两边都动。
    只挪不删，放在 sessions/_removed_<时间戳>/ 里，随时能挪回来。
    """
    d = os.path.join(SESS, "_removed_" + stamp)
    moved = []
    for cid in sorted(ids):
        src = os.path.join(SESS, str(cid) + ".json")
        if os.path.exists(src):
            os.makedirs(d, exist_ok=True)
            os.replace(src, os.path.join(d, str(cid) + ".json"))
            moved.append(cid)
    return d, moved


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--session", default="")
    ap.add_argument("--drop", action="append", default=[])
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--list", action="store_true", help="列出每个成员现在用的模型")
    ap.add_argument("--set-model", default="", help="provider/model/effort，改成这个")
    ap.add_argument("--members", default="", help="逗号分隔的成员名；省略=留下的全部")
    ap.add_argument("--all-kept", action="store_true", help="改所有留下的成员")
    ap.add_argument("--force", action="store_true", help="绕过「DSH 还在跑」的拦阻，只在副本上验证用")
    ap.add_argument("--purge-sessions", action="store_true",
                    help="同时把被摘成员的子会话文件挪到 sessions/_removed_<时间戳>/（不删）")
    a = ap.parse_args()

    drop = a.drop or DEFAULT_DROP
    path = a.session or biggest_session()[0]
    if not path:
        print("找不到会话文件"); return 1
    d = json.load(io.open(path, encoding="utf-8"))
    rows = d["record"]["rows"]
    team = rows["agentTeam"]["val"]
    members = team.get("members") or []

    keep = [m for m in members if m.get("name") not in drop]
    gone = [m.get("name") for m in members if m.get("name") in drop]
    ids = set(m.get("id") for m in members if m.get("name") in drop)

    cat = rows.get("subagentCatalog", {}).get("val") or {}
    head = cat.get("head") or {}
    values = head.get("values") or []
    cat_gone = [v.get("label") for v in values if v.get("childId") in ids]

    if a.list:
        print("会话文件: " + path)
        return cmd_list(members)

    print("会话文件: " + path)
    print("现在 %d 个成员，要摘 %d 个，改完 %d 个" % (len(members), len(gone), len(keep)))
    for n in gone:
        print("  - 摘掉 " + str(n))
    if cat_gone:
        print("  同时从 catalog 摘掉 %d 条（%s）" % (len(cat_gone), "、".join([str(x) for x in cat_gone])))
    print("留下: " + "、".join([str(m.get("name")) for m in keep]))

    if a.set_model:
        names = set(x.strip() for x in a.members.split(",") if x.strip())
        if not names and not a.all_kept:
            print("--set-model 要配 --members 或 --all-kept"); return 1
        ev = dsh_alive()
        if ev and not a.force:
            print("")
            print("DSH 还开着，现在改文件等于白改：")
            for x in ev:
                print("  - " + x)
            print("请彻底退出 DSH（任务管理器里看不到上面那些进程），再执行本命令。")
            return 2
        return cmd_set_model(members, a.set_model, names if names else None, a.apply)

    ev = dsh_alive()
    if ev and not a.force:
        print("")
        print("DSH 还开着，现在改文件等于白改：")
        for x in ev:
            print("  - " + x)
        print("请彻底退出 DSH（任务管理器里看不到上面那些进程），再执行本命令。")
        return 2
    if not a.apply:
        print("")
        print("只是预览。要真改加 --apply（会先写 .bak 备份）。")
        return 0

    stamp = time.strftime("%Y%m%d_%H%M%S")
    bak = path + ".bak-" + stamp
    data = io.open(path, "rb").read()
    io.open(bak, "wb").write(data)

    team["members"] = keep
    if values:
        head["values"] = [v for v in values if v.get("childId") not in ids]
    tmp = path + ".tmp"
    io.open(tmp, "w", encoding="utf-8", newline="").write(json.dumps(d, ensure_ascii=False))
    os.replace(tmp, path)
    print("")
    print("改完了，备份在 " + bak)
    ok = wait_stable(path)
    back = json.load(io.open(path, encoding="utf-8"))["record"]["rows"]["agentTeam"]["val"].get("members") or []
    if not ok or len(back) != len(keep):
        print("")
        print("[没生效] 文件刚写完又被改回去了：现在里面是 %d 个成员（应该是 %d）。" % (len(back), len(keep)))
        print("         说明还有一个 DSH 进程活着、并且退出时又把它内存里的名册刷了一遍。")
        print("         常见原因：点了退出就马上跑脚本，进程其实还在收尾（实测能慢到 8 秒）。")
        print("         已经自动用备份恢复了原样，什么都没坏。请这样做：")
        print("           1) 彻底退出 DSH，等 15 秒")
        print("           2) 确认没有进程：python tools/team_roster_prune.py --list  会先报「DSH 还开着」")
        print("           3) 再跑一次 --apply")
        io.open(path, "wb").write(data)
        print("         （已从 " + os.path.basename(bak) + " 恢复）")
        return 3
    print("盯了 6 秒文件没被改：现在文件里是 %d 个成员。" % len(keep))
    if a.purge_sessions:
        d, moved = purge_child_sessions(ids, stamp)
        if moved:
            print("子会话挪到 " + d + "（%d 个：%s）" % (len(moved), "、".join(moved)))
        else:
            print("没有子会话文件需要挪。")
    print("现在重开 DSH，名册里就是 %d 个人。" % len(keep))
    return 0


if __name__ == "__main__":
    sys.exit(main())
