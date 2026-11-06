# -*- coding: utf-8 -*-
"""Read-only checks for one commit. Exit 0 only when every step passes.

These do not rewrite edges, the framework report, or the web slices.
The full rebuild stays in tools/check_all.sh.

这次动了前端（runtime/web/**、切片生成器、冒烟自己），就自动加跑一遍无头浏览器冒烟。
--web 强制跑，--no-web 显式跳过；两个都给会直接报错，不做二选一的猜测。
"""
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 改了这些路径，画面就可能变，提交前必须过一遍冒烟
FRONTEND_DIRS = ("runtime/web/", "runtime/shared/")
FRONTEND_FILES = (
    "tools/build_web.py",
    "tools/framework_gen.py",
    "tools/map_contract.js",
    "tools/web_smoke.js",
)

CHROME = os.environ.get("MC_CHROME") or "C:/Program Files/Google/Chrome/Application/chrome.exe"

# 动了这些路径，题库里就可能带进渲染不出来的公式写法。
# 空暂存或没命中就跳过：门要盯的是「这次新写进去的」，不是历史欠账。
MATH_DATA_DIRS = ("content/",)
MATH_FILES = (
    "runtime/web/js/core.js",
    "tools/math_text_check.js",
    "tools/fix_math_escapes.js",
    "tools/math_baseline.json",
)


def say(msg):
    """Print one line and flush it so hook output stays in order.

    @param msg: line without a trailing newline
    @return: None
    """
    print(msg, flush=True)


def run(name, args):
    """Run one check and return 1 when it fails.

    @param name: label printed before the command
    @param args: argv, with the program first
    @return: 0 or 1
    """
    say("\n=== %s ===" % name)
    result = subprocess.run(args, cwd=REPO)
    if result.returncode == 0:
        say("  [OK] %s" % name)
        return 0
    say("  [FAIL] %s" % name)
    return 1


def javascript_files():
    """Yield project JavaScript files that this repo owns.

    Vendor copies under assets/ are excluded.
    @return: list of absolute paths
    """
    found = []
    roots = [
        os.path.join(REPO, "runtime", "web", "js"),
        os.path.join(REPO, "runtime", "shared"),
        os.path.join(REPO, "tools"),
    ]
    for root in roots:
        for dirpath, _dirs, names in os.walk(root):
            for name in names:
                if name.endswith(".js"):
                    found.append(os.path.join(dirpath, name))
    return sorted(found)


def check_syntax():
    """Syntax-check every project JavaScript file.

    @return: 0 or 1
    """
    say("\n=== 前端语法 ===")
    failed = 0
    files = javascript_files()
    for path in files:
        result = subprocess.run(["node", "--check", path], cwd=REPO)
        if result.returncode != 0:
            failed += 1
            say("  [FAIL] " + os.path.relpath(path, REPO))
    if failed:
        say("  [FAIL] 前端语法 (%d)" % failed)
        return 1
    say("  [OK] 前端语法 (%d files)" % len(files))
    return 0


def check_inference_stays_deleted():
    """Refuse an active skill_dep_by_kp2 rule in the edge builder.

    Comments may still name the rejected rule. A live call may not.
    @return: 0 or 1
    """
    say("\n=== 已否决的方法反推 ===")
    path = os.path.join(REPO, "tools", "edges_build.py")
    live = []
    for lineno, line in enumerate(open(path, encoding="utf-8"), 1):
        stripped = line.strip()
        if stripped.startswith("#"):
            continue
        if "skill_dep_by_kp2" in line:
            live.append("%d: %s" % (lineno, stripped))
    if live:
        say("  [FAIL] skill_dep_by_kp2 is active again")
        for row in live:
            say("  " + row)
        return 1
    say("  [OK] 已否决的方法反推")
    return 0


def git_paths(flags):
    """List paths reported by one git command.

    @param flags: git subcommand and options, without the leading "git"
    @return: list of repo-relative POSIX paths, or None when git fails
    """
    args = ["git", "-c", "core.quotepath=false"] + flags
    result = subprocess.run(args, cwd=REPO, capture_output=True, text=True,
                            encoding="utf-8", errors="replace")
    if result.returncode != 0:
        return None
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def staged_paths():
    """Paths staged for this commit.

    @return: list of paths, or None when git cannot answer
    """
    return git_paths(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])


def is_frontend(path):
    """True when a path can change what the browser shows.

    @param path: repo-relative path as git prints it
    @return: True or False
    """
    p = path.replace("\\", "/")
    if p in FRONTEND_FILES:
        return True
    return any(p.startswith(prefix) for prefix in FRONTEND_DIRS)


def smoke_blockers():
    """Reasons the smoke run cannot produce a real verdict.

    @return: list of human-readable blockers, empty when ready
    """
    blockers = []
    if not os.path.isfile(CHROME):
        blockers.append("找不到 Chrome：%s（换机器就设 MC_CHROME）" % CHROME)
    data = os.path.join(REPO, "runtime", "web", "data")
    for name in ("graph.js", "catalog.js"):
        if not os.path.isfile(os.path.join(data, name)):
            blockers.append("前端切片缺 data/%s（先跑 python tools/build_web.py）" % name)
    return blockers


def unstaged_frontend():
    """Frontend paths changed in the working tree but not staged.

    @return: list of paths
    """
    changed = git_paths(["diff", "--name-only"]) or []
    return [p for p in changed if is_frontend(p)]


def is_math_path(path):
    """Tell whether one changed path can carry formula text.

    @param path: repo-relative path, either slash
    @return: True or False
    """
    p = path.replace("\\", "/")
    if any(p.startswith(d) for d in MATH_DATA_DIRS):
        return p.endswith(".jsonl") or p.endswith(".json")
    return p in MATH_FILES


def check_math_text():
    """Check the staged formula text against the frozen baseline.

    Only the staged area counts: what lands in the commit is the index, and the
    debt left in the working tree must not block this commit.
    @return: 0 or 1
    """
    staged = staged_paths()
    if staged is None:
        say("\n=== 公式文本 ===")
        say("  [SKIP] 读不到暂存区，不知道这次改了什么（手动跑用 node tools/math_text_check.js）")
        return 0
    if not staged:
        say("\n=== 公式文本 ===")
        say("  [SKIP] 暂存区是空的，没有可判断的改动（手动跑用 node tools/math_text_check.js）")
        return 0
    hit = [p for p in staged if is_math_path(p)]
    if not hit:
        say("\n=== 公式文本 ===")
        say("  [SKIP] 这次没动题库文本和公式工具（暂存 %d 个文件），跳过公式检查" % len(staged))
        return 0
    shown = "、".join(hit[:3]) + (" 等 %d 个" % len(hit) if len(hit) > 3 else "")
    say("\n=== 公式文本 ===")
    say("  跑的原因：动了 " + shown)
    result = subprocess.run(["node", "tools/math_text_check.js"], cwd=REPO)
    if result.returncode == 0:
        say("  [OK] 公式文本")
        return 0
    say("  [FAIL] 公式文本（新引入的公式问题，明细见 out/math-text.json）")
    return 1


def is_style_path(path):
    """Tell whether one changed path can move a colour or a token.

    runtime/web 下的 .css 定义变量，.js 里也有内联 style，两边都可能改到颜色。
    @param path: repo-relative path, either slash
    @return: True or False
    """
    p = path.replace("\\", "/")
    if not p.startswith("runtime/web/"):
        return False
    return p.endswith(".css") or p.endswith(".js")


def check_styles():
    """Check CSS tokens and colour contrast, or say why they were not run.

    两条都是秒级：变量有没有定义、token 之间够不够分得开。
    只盯 runtime/web 下的 .css / .js —— 改题库文本不会动颜色，没必要每次提交都算一遍。
    环境不就绪（找不到 app.css 或 node）算 FAIL 不算 SKIP：门缺了对象，就不是门。
    @return: number of failed checks
    """
    say("\n=== 样式变量与对比度 ===")
    staged = staged_paths()
    if staged is None:
        say("  [SKIP] 读不到暂存区，不知道这次改了什么（手动跑 node tools/css_token_check.js）")
        return 0
    if not staged:
        say("  [SKIP] 暂存区是空的，没有可判断的改动（手动跑 node tools/css_token_check.js）")
        return 0
    hit = [p for p in staged if is_style_path(p)]
    if not hit:
        say("  [SKIP] 这次没动 runtime/web 下的样式与脚本（暂存 %d 个文件）" % len(staged))
        return 0
    shown = "、".join(hit[:3]) + (" 等 %d 个" % len(hit) if len(hit) > 3 else "")
    say("  跑的原因：动了 " + shown)

    css = os.path.join(REPO, "runtime", "web", "app.css")
    if not os.path.isfile(css):
        say("  [FAIL] 找不到 runtime/web/app.css（样式门没有对象，等于这道门不存在）")
        return 1

    failed = 0
    for name, args in (
        ("CSS 变量", ["node", "tools/css_token_check.js"]),
        ("对比度", ["node", "tools/contrast_check.js"]),
    ):
        result = subprocess.run(args, cwd=REPO)
        if result.returncode == 0:
            say("  [OK] %s" % name)
        else:
            say("  [FAIL] %s（明细见上面几行；改 :root 里的 token，别在用到的地方单独加深）" % name)
            failed += 1
    return failed


def check_ux(force, skip):
    """视觉断言：能量出来的「看着不对」，量完给退出码。

    和冒烟的区别：冒烟判「该出现的文案在不在、公式渲染没渲染」，
    这一步判「字是不是太小、内部英文枚举有没有漏到界面、公式有没有被劈成两行、有没有横向溢出」。
    这几类都不报错，只会让人反复说「改了显示还是有问题」，所以单独一道门。
    环境不就绪（没有 Chrome）算 FAIL —— 跑不了等于这道门不存在。
    @return: number of failed checks
    """
    say("\n=== 视觉断言 ===")
    if skip:
        say("  [SKIP] --no-web：按你的要求跳过")
        return 0
    staged = staged_paths()
    if staged is None:
        say("  [SKIP] 读不到暂存区，不知道这次改了什么（手动跑 node tools/ux_asserts.js）")
        return 0
    if not staged:
        say("  [SKIP] 暂存区是空的，没有可判断的改动（手动跑 node tools/ux_asserts.js）")
        return 0
    hit = [p for p in staged if is_style_path(p)]
    if not hit and not force:
        say("  [SKIP] 这次没动前端（暂存 %d 个文件），跳过视觉断言" % len(staged))
        return 0
    if hit:
        shown = "、".join(hit[:3]) + (" 等 %d 个" % len(hit) if len(hit) > 3 else "")
        say("  跑的原因：动了 " + shown)
    if not os.path.isfile(os.path.join(REPO, "tools", "ux_asserts.js")):
        say("  [FAIL] 找不到 tools/ux_asserts.js（视觉门没有对象，等于这道门不存在）")
        return 1
    chrome = os.environ.get("MC_CHROME") or "C:/Program Files/Google/Chrome/Application/chrome.exe"
    if not os.path.isfile(chrome):
        say("  [FAIL] 找不到 Chrome：" + chrome + "（改 MC_CHROME 指路，或自己写 --no-web 担下来）")
        return 1
    result = subprocess.run(["node", "tools/ux_asserts.js"], cwd=REPO)
    if result.returncode == 0:
        say("  [OK] 视觉断言")
        return 0
    say("  [FAIL] 视觉断言（明细见上面几行；阈值在 tools/ux_asserts.js 顶部，改阈值要写进 docs/STATE.md）")
    return 1


def check_web_smoke(force, skip):
    """Run the headless smoke suite, or say why it was not run.

    @param force: user asked for it with --web
    @param skip: user opted out with --no-web
    @return: 0 or 1
    """
    say("\n=== 无头浏览器冒烟 ===")
    if skip:
        say("  [SKIP] --no-web：这次不跑冒烟，画面没有经过检查")
        return 0

    staged = staged_paths()
    if force:
        reason = "--web 指定必跑"
    elif staged is None:
        say("  [SKIP] 读不到暂存区，不知道这次改了什么（手动跑用 --web）")
        return 0
    elif not staged:
        say("  [SKIP] 暂存区是空的，没有可判断的改动（手动跑用 --web）")
        return 0
    else:
        hit = [p for p in staged if is_frontend(p)]
        if not hit:
            say("  [SKIP] 这次没动前端（暂存 %d 个文件），跳过冒烟" % len(staged))
            return 0
        shown = "、".join(hit[:3]) + (" 等 %d 个" % len(hit) if len(hit) > 3 else "")
        reason = "动了前端：" + shown

    say("  跑的原因：" + reason)
    blockers = smoke_blockers()
    if blockers:
        for item in blockers:
            say("  [FAIL] " + item)
        say("  [FAIL] 无头浏览器冒烟（环境没就绪，等于这道门不存在）")
        say("  修好环境重跑；确实要这次就提交，用 --no-web 显式跳过")
        return 1

    loose = unstaged_frontend()
    if loose:
        say("  注意：工作树里还有 %d 个前端文件没暂存，冒烟测的是工作树现在的样子" % len(loose))
    result = subprocess.run(["node", "tools/web_smoke.js"], cwd=REPO)
    if result.returncode == 0:
        say("  [OK] 无头浏览器冒烟")
        return 0
    say("  [FAIL] 无头浏览器冒烟（逐条明细见 out/shots/web-report.json）")
    return 1


def main():
    """Run the commit gate.

    @return: process exit code
    """
    os.chdir(REPO)
    args = sys.argv[1:]
    for arg in args:
        if arg not in ("--web", "--no-web"):
            say("用法: python tools/check_commit.py [--web|--no-web]")
            say("不认识的参数: " + arg)
            return 2
    force = "--web" in args
    skip = "--no-web" in args
    if force and skip:
        say("--web 和 --no-web 不能同时给，这次到底跑不跑得先定下来")
        return 2

    failed = 0
    failed += check_syntax()
    failed += run("导图契约", ["node", "tools/map_contract.js"])
    failed += run("判题回归", ["node", "tools/judge_spec_test.js"])
    failed += run("方法先后", ["python", "tools/skill_prereq_check.py"])
    failed += run("关系表闸门", ["python", "tools/relations_check.py"])
    failed += check_inference_stays_deleted()
    failed += check_math_text()
    failed += check_styles()
    failed += check_ux(force, skip)
    failed += check_web_smoke(force, skip)
    say("\n===== 失败步骤数: %d =====" % failed)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
