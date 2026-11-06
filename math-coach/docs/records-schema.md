# 作答记录（JSONL）契约

M4a 同步桥的数据格式。**只做文件交换，不做服务端、不做账号**——孩子在家练、家长在自己电脑上合并，两周后再决定要不要上 M4b（云同步）。

## 存在哪里

- 浏览器 localStorage，键名 `mc.records.v1`，值是一个 JSON 数组。
- 导出时按「一行一条记录」写成 JSONL（UTF-8、LF），文件名 `math-coach-801-all-<stamp>.jsonl`。
- 换设备、换浏览器、清理缓存都会丢，所以「带走」按钮是唯一出口。导入把文件带回来。

## 一行长什么样

```json
{"schema_version":1,"uid":"EV-12.10_bas_03-m1k2n3","item":"12.10_bas_03","sec":"12.10","band":"basic","ts":1761560000000,"verdict":"wrong","final":"wrong","how":"spec-exact","hint":"L2","seconds":94,"stu":"5","ref":["5"],"reasons":["符号"],"volume":"801","chapter":12}
```

| 字段 | 必填 | 含义 | 备注 |
| --- | --- | --- | --- |
| schema_version | 是 | 记录格式版本，当前 1 | 版本升时旧行要能读 |
| uid | 建议 | 事件唯一号 `EV-<题号>-<36 进制时间戳>` | 同一题重做会生成新的 uid |
| item | **是** | 题目 uid | 与 `runtime/web/data/801/*.json` 的 items 对应 |
| sec | **是** | 节号，如 `12.10` | 章末综合卷用 `ch-end-12` |
| ts | **是** | 毫秒时间戳 | 合并时按它升序 |
| verdict | 是 | 判题器原始结论 | correct / wrong / manual / blank |
| final | 是 | 归档结论 | 学生可以改（`self` 动作），所以可能与 verdict 不同 |
| how | 是 | 判题走的通道 | 见下节，取值不固定 |
| hint | 否 | 用到的最高一级提示 | none / L1 / L2 / L3 / L4 |
| seconds | 否 | 这道题停留秒数 | 上限被前端截到合理范围 |
| stu | 否 | 学生原始输入 | **导出前提醒：可能含姓名或涂鸦** |
| ref | 否 | 参考答案里被对上的部分 | 用于回看「它对在哪」 |
| reasons | 否 | 错因标签 | 学生自己勾的，未勾为 [] |
| volume / chapter | 否 | 册号与章号 | 便于不打开题库也能分组 |

## how 的取值为什么不写死

`how` 是判题通道的留痕：`exact`（文本精确）、`bag`（多答案无序比较）、`spec-exact` / `spec-set` / `spec-interval` / `spec-judge`（结构化答案）、`spec-manual` / `manual`（判不了）。判题器每加一档就会出现新值，**归档层只原样保存，不做枚举校验**，否则每次扩展判题器都要迁数据。

要统计「自动判占多少」，用前缀判断（`^(exact|bag|spec-)` 且不等于 `spec-manual`），档案页就是这么算的。

## 合并规则（导入）

1. 逐行 `JSON.parse`，坏行只计数，不中断整份文件——家长手工整理过的文件常常末尾多一行。
2. 去重键：有 `uid` 用 `uid`；丢了 `uid` 的用 `item@sec@ts` 兜住。
3. 同一份文件导两次，第二次全部计入「重复」，记录总数不变（幂等）。
4. 合并后按 `ts` 升序写回 localStorage。
5. 缺 `item` 或 `ts` 的行判坏行——没有这两项无法定位「哪天做了哪道题」。

实现在 `runtime/web/js/store.js` 的 `parseJsonl` / `merge` / `rowKey`，由 `tools/web_smoke.js` 的 `store-merge` 断言守着（造两条探针记录 + 一行坏 JSON，导两次必须 `added1=2, added2=0, dup2=2`，跑完把探针记录摘掉）。

## 不做的事

- 不做账号与登录：孩子用的是一台没有账号的电脑。
- 不做服务端：M4b 之前没有可以信任的上传目标。
- 不在文件里写题库快照：JSONL 只存事件，题目本体随仓走版本管理，改动可 diff。

## 已知限制

- localStorage 有容量上限，写满后 `setItem` 会抛异常，现在被 `try/catch` 吞掉——**写满不会提示**，表现为记录不再增长。这是下一步要补的（写满检测 + 提示导出）。
- 没有跨设备时钟校准：`ts` 来自各自机器，两台机器时间差大会让排序显得乱，不影响去重。
