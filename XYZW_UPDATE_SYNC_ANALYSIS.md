# 咸鱼之王 WebSocket 网页助手项目分析与同步更新方案
1fd9a5b420ddf3458e2f5e38701387e9 这串就是你的微信账号 hash。
APPID wx0840558555a454ed
## 结论

本项目不是直接保存 `.har`、`.pcap`、`.pcapng` 这类原始抓包文件再运行解析，而是已经把抓包、客户端打包代码、逆向分析结果沉淀成了可执行的网页端实现。

当前可作为后续同步更新依据的文件主要有：

- `src/utils/bonProtocol.js`：BON 编解码和 `x/lx/xtm` 加解密实现，注释明确写了“基于提供的真实 BON 源码重新实现”。
- `src/utils/xyzwWebSocket.js`：网页端 WebSocket 客户端、命令注册表、响应匹配、错误码映射。
- `src/utils/readable-xyzw-ws.js`：较可读的 WebSocket 参考实现。
- `source/1.js`、`source/3.js`、`source/4.js`：压缩/混淆后的参考代码快照，包含命令模板、任务流程、协议加解密、连接逻辑等。
- `src/xyzw/index.js`、`src/xyzw/game-defines.js`：咸鱼之王 Cocos 打包产物和游戏定义，能用于核对 `CODE_VERSION`、`BATTLE_VERSION`、服务器地址、开关、客户端连接流程。

没有发现项目内保留原始抓包包体文件；同步新功能时应按“新客户端代码/抓包样本 -> 抽取命令和参数 -> 更新命令注册与响应映射 -> 更新事件/任务/UI -> 验证”的流程处理。

## 当前架构

核心链路如下：

```text
bin/url/manual token
  -> transformToken/authuser 或 Base64 解析
  -> tokenStore 管理本地 token
  -> 构造 wss://xxz-xyzw.hortorgames.com/agent?p=...&e=x&lang=chinese
  -> XyzwWebSocketClient
  -> BON encode + x 加密发送
  -> 自动解密、BON decode、ProtoMsg 包装
  -> responseToCommandMap 匹配 Promise
  -> stores/events 插件更新 gameData
  -> 页面组件/批量任务读取状态并继续发送命令
```

关键模块分工：

- `src/stores/tokenStore.ts`：token 生命周期、自动刷新、WebSocket 连接、跨标签页协调、消息派发、`battleVersion` 注入。
- `src/utils/xyzwWebSocket.js`：命令注册、发送队列、心跳、Promise 响应匹配、错误码映射。
- `src/utils/bonProtocol.js`：BON 类型系统、加密解密、`ProtoMsg`。
- `src/stores/events/*.ts`：把响应事件转换为 `gameData` 状态更新，例如角色、军团、塔、聊天、学习问答。
- `src/utils/batch/*.js`：批量任务编排，依赖命令注册和响应结构稳定。
- `src/components/cards/*.vue` 和 `src/views/GameFeatures.vue`：具体功能 UI。

## 已有逆向/参考材料

### `source/` 目录

`source/1.js`、`source/3.js`、`source/4.js` 很像从网页辅助或游戏相关打包产物中截取的压缩代码。它们不作为运行入口直接被应用引用，但适合做命令和流程同步参考。

抽取结果显示：

- `source/1.js` 包含 28 个日常任务相关命令，例如 `system_mysharecallback`、`friend_batch`、`hero_recruit`、`arena_startarea`、`fight_startareaarena`。
- `source/3.js` 包含瓶子机器人、挂机、军团、学习、爬塔等局部 UI/逻辑片段。
- `source/4.js` 包含约 90 个命令、BON/加密逻辑、WebSocket 连接流程、旧版本 `CODE_VERSION = "1.56.1"` 和 `BATTLE_VERSION = "14358a8fd1"`。

这些文件的价值：

- 找命令名、默认 body 参数、响应名。
- 对照新功能在客户端里的调用顺序。
- 对照加解密、心跳、ack/seq、`resp` 字段匹配逻辑。
- 对照活动/塔/军团/赛季类功能的数据结构。

局限：

- 文件版本不一致，`source/4.js` 比 `src/xyzw/index.js` 老。
- 混淆代码不能直接照搬，需要用实际抓包或新客户端验证 body 字段。
- 只靠命令字符串不能保证请求参数和响应结构仍然正确。

### `src/xyzw/` 目录

`src/xyzw/index.js` 是 Cocos 打包产物，末尾有：

- `CODE_VERSION = "1.90.3"`
- `BATTLE_VERSION = "7f91491b47"`

`src/xyzw/game-defines.js` 记录当前静态游戏定义：

- `SERVER = "https://xxz-xyzw.hortorgames.com"`
- `CDN = "https://xxz-xyzw-res.hortorgames.com"`
- `GAME_VERSION = "2.3.9-wx"`
- `CODE_VERSION = "2.3.9"`
- `BATTLE_OSS_URL = "https://xxz-xyzw-service-battle.hortorgames.com"`

这些文件适合用来核对游戏版本、服务器地址、资源地址、开关名、manifest 逻辑和 battleVersion 获取路径。

## 命令覆盖差异

当前 `src/utils/xyzwWebSocket.js` 注册了约 151 个命令，比 `source/4.js` 中可抽取的旧命令更多，说明项目已经在旧参考基础上扩展过车辆、功法、珍宝阁、怪异塔、换皮塔等功能。

从旧参考源里能看到但当前主注册表未注册的命令包括：

```text
activity_buystoregoods
bosstower_boom
bosstower_claimreward
equipment_getquenchlog
hero_simulation
league_thumbuplegiondetail
legion_applyjoin
legion_changejob
legion_create
legion_dissolve
legion_getinfor
legion_recommend
nightmare_buycharm
sky_getgdrolesky
skyhorse_getbattlerecord
skyhorse_getlegioninfo
skyhorse_getlegionrank
skyhorse_getrolerank
war_enterbattlefield
```

这些不一定都是缺陷，有些可能是旧功能、未开放功能、盐场独立 WebSocket 或项目暂不需要的功能。但如果后续要补“飞马/天空/军团管理/宝库奖励/淬炼日志”等能力，应优先从这批命令开始验证。

## 后续同步更新流程

### 1. 获取新版本参考材料

每次咸鱼之王更新后，建议保存三类材料：

- 新版小游戏/网页游戏打包 JS，放到 `source/YYYYMMDD/` 或 `src/xyzw-snapshots/YYYYMMDD/`，不要覆盖旧文件。
- 浏览器 DevTools Network 的 WebSocket 帧导出或简化后的请求/响应样本，建议保存为脱敏 JSON，而不是只留截图。
- 角色信息、活动信息、战斗开始、领奖等关键响应的 decoded body 样本。

建议新增目录结构：

```text
protocol-snapshots/
  2026-05-03/
    game-defines.js
    index.js
    commands.json
    frames.redacted.json
    notes.md
```

敏感字段如 token、roleId、昵称、头像、服务器、session 信息需要脱敏。

### 2. 抽取命令和默认参数

从新版参考 JS 中抽取：

- `cmd: "xxx"` 字符串。
- `body: bon.encode({ ... })` 的默认字段。
- `respKey` 或响应命令名。
- 发送顺序，例如先 `getinfo` 再 `start/fight/claim`。
- 是否需要 `battleVersion`、`randomSeed`、安全密码、阵容切换。

然后更新：

- `src/utils/xyzwWebSocket.js` 的 `registerDefaultCommands()`。
- `_handlePromiseResponse()` 里的 `responseToCommandMap`。
- 必要时补 `errorCodeMap`。
- 如果是独立 WebSocket，例如盐场/军团战，检查 `src/utils/xyzwLegionWarWebSocket.js`。

### 3. 对齐版本与初始化

重点检查这些字段是否变化：

- `role_getroleinfo` 的 `clientVersion`。
- WebSocket URL 和参数：当前是 `wss://xxz-xyzw.hortorgames.com/agent?p=...&e=x&lang=chinese`。
- 加密参数 `e=x` 是否变化，是否出现 `lx` 或 `xtm`。
- `fight_startlevel` 返回的 `battleData.version` 是否仍然是战斗命令需要的版本来源。
- `system_custom randomSeed` 是否仍然需要，生成算法是否仍然有效。

当前项目在批量连接和功能页初始化时会调用：

```text
role_getroleinfo
fight_startlevel
```

并把 `fight_startlevel` 的 `battleData.version` 写入 `tokenStore.gameData.battleVersion`，之后对战斗命令自动注入。新版本如果战斗协议变化，优先检查这里。

### 4. 更新事件和状态层

新增或变更响应时，不能只注册命令，还要确认 UI 需要的数据进入状态层：

- 角色基础数据：`src/stores/events/role.ts`
- 队伍/阵容：`src/stores/events/team.ts`
- 塔/宝库/怪异塔：`src/stores/events/tower.ts`
- 军团：`src/stores/events/legion.ts`
- 活动：`src/stores/events/activity.ts`
- 学习问答：`src/stores/events/study.ts`

如果响应名没有注册事件，`stores/events/index.ts` 会走 `$any` 并打印“收到未处理事件”。这是同步新功能时的重要观察点。

### 5. 更新任务和 UI

新增功能通常要落到三层：

- 命令层：注册 cmd、响应映射、默认 body。
- 编排层：在 `src/utils/batch/` 或 `dailyTaskRunner.js` 里写发送顺序、重试、延时和失败处理。
- 展示层：在 `src/components/cards/` 或对应 `views/` 中显示状态、按钮和日志。

不要在组件里散落硬编码命令流程。较复杂的新功能建议先沉到 `src/utils/batch/tasksXxx.js` 或专门 util，再由组件调用。

## 优化建议

### 1. 建立命令清单生成脚本

当前命令分散在 `xyzwWebSocket.js`、`gameCommands.js`、`readable-xyzw-ws.js`、`source/*.js` 和多个 batch 文件里。建议新增脚本生成命令对比报告：

```text
scripts/extract-xyzw-commands.mjs
protocol-snapshots/latest/commands.json
```

输出内容：

- 当前注册命令。
- 新参考源命令。
- 未注册命令。
- 已注册但未在新参考源出现的命令。
- 响应映射缺失项。

这样每次更新可以先跑报告，避免靠人工搜索遗漏。

### 2. 将命令注册表数据化

`registerDefaultCommands()` 现在是长链式注册，维护成本高。建议逐步拆为：

```text
src/protocol/commands/core.js
src/protocol/commands/tower.js
src/protocol/commands/legion.js
src/protocol/commands/activity.js
src/protocol/responseMap.js
src/protocol/errorCodes.js
```

收益：

- 新功能只改对应模块。
- 响应映射和注册命令可以做一致性检查。
- 测试和 diff 更清晰。

### 3. 保存脱敏 decoded frames

目前缺少可回放的抓包样本。建议把关键命令的解密后 body 保存为 JSON：

```json
{
  "cmd": "new_feature_getinfo",
  "requestBody": {},
  "responseCmd": "new_feature_getinforesp",
  "responseBody": {}
}
```

这样可以为 BON 解码、响应字段、UI 数据适配建立回归样本。

### 4. 增加协议级测试

建议新增几类低成本测试：

- BON encode/decode roundtrip。
- `x/lx/xtm` 加解密 roundtrip。
- 命令注册表中所有命令都能 build。
- `responseToCommandMap` 中所有原始命令都已注册。
- 常见 decoded response 能被事件插件正确写入 `gameData`。

### 5. 统一 battleVersion 初始化

当前 `GameFeatures.vue`、`BatchDailyTasks.vue`、`src/utils/batch/connectionManager.js` 都有初始化 `role_getroleinfo + fight_startlevel` 的逻辑。建议收敛到 `tokenStore.initializeGameSession(tokenId)`，统一处理：

- 获取角色信息。
- 获取并写入 battleVersion。
- 同步 randomSeed。
- 失败重试和日志。

这样协议更新时只改一处。

### 6. 优化未知响应观测

建议把 `$any` 未处理事件增加开发模式收集功能，保存最近 N 条未处理响应的：

- cmd
- code/error/hint
- decoded body 字段摘要
- 原始请求命令

这对新功能更新非常有用，也能快速发现响应名变化。

## 推荐落地优先级

1. 新增 `protocol-snapshots/` 规范，保存新版客户端代码和脱敏 decoded frames。
2. 新增命令抽取/对比脚本，先把人工同步变成可重复报告。
3. 把 `xyzwWebSocket.js` 的命令注册和响应映射拆成独立配置模块。
4. 统一游戏会话初始化，避免 battleVersion 和 randomSeed 多处维护。
5. 为 BON、加密、命令注册、响应映射补基础测试。
6. 按业务优先级验证当前未注册但参考源存在的命令，例如 `skyhorse_*`、`equipment_getquenchlog`、`bosstower_claimreward`。

## 同步新功能检查清单

每次咸鱼之王更新或补新功能时，按下面顺序检查：

- 是否有新的 `CODE_VERSION`、`GAME_VERSION`、`BATTLE_VERSION`。
- `SERVER`、`CDN`、`BATTLE_OSS_URL` 是否变化。
- WebSocket 地址和 query 参数是否变化。
- `role_getroleinfo` 默认 body 是否变化。
- 加密方式是否仍为 `e=x`。
- 新功能涉及哪些 `getinfo/start/fight/claim/buy` 命令。
- 每个新命令的默认 body 字段是什么。
- 响应命令名是否能被 Promise 匹配。
- 响应 body 是否需要新增事件插件写入 `gameData`。
- 是否需要 battleVersion、randomSeed、阵容、密码、活动时间窗口。
- 批量任务是否需要限流、延时、重试和失败跳过策略。
- UI 是否只依赖状态层，不直接解析未封装的协议细节。

## `source_new/` 三个 wxapkg 实测处理结果

当前 `source_new/` 下有三个包：

```text
source_new/__APP__.wxapkg
source_new/_subpackages_TEST_REMOTE_MODULE_.wxapkg
source_new/_subpackages_game_.wxapkg
```

这三个包的文件头都是 `V1MMWX`：

```bash
find source_new -maxdepth 1 -type f -name '*.wxapkg' \
  -print -exec sh -c 'printf "%s " "$1"; xxd -p -l 6 "$1"' sh {} \;
```

输出中的 `56314d4d5758` 即 ASCII 的 `V1MMWX`。这说明它们不是普通明文 wxapkg，直接用常规 unpack 工具会报类似 `firstMark` 的错误，需要先按小游戏 appId 解密。

本项目已有 appId：

```text
src/xyzw/game-defines.js -> wx0840558555a454ed
```

### 1. 解密 V1MMWX

已使用 `wxapkg_v1mmwx_decrypt` 解密：

```bash
rm -rf /tmp/wxapkg_v1mmwx_decrypt
git clone --depth 1 https://github.com/xiongnemo/wxapkg_v1mmwx_decrypt.git /tmp/wxapkg_v1mmwx_decrypt
python3 -m venv /tmp/wxapkg_v1mmwx_decrypt/.venv
/tmp/wxapkg_v1mmwx_decrypt/.venv/bin/pip install -q -r /tmp/wxapkg_v1mmwx_decrypt/requirements.txt

rm -rf source_new_decrypted
mkdir -p source_new_decrypted

for f in source_new/*.wxapkg; do
  base=$(basename "$f" .wxapkg)
  /tmp/wxapkg_v1mmwx_decrypt/.venv/bin/python /tmp/wxapkg_v1mmwx_decrypt/main.py \
    --in_filename="$f" \
    --out_filename="source_new_decrypted/${base}.decrypted.wxapkg" \
    --wxid=wx0840558555a454ed
done
```

解密后的文件头变成普通 wxapkg 格式：

```text
source_new_decrypted/__APP__.decrypted.wxapkg                         be0000000000000c
source_new_decrypted/_subpackages_TEST_REMOTE_MODULE_.decrypted.wxapkg be00000000000003
source_new_decrypted/_subpackages_game_.decrypted.wxapkg               be00000000000004
```

### 2. 解包

普通解包命令：

```bash
rm -rf source_new_unpacked
mkdir -p source_new_unpacked

for f in source_new_decrypted/*.wxapkg; do
  base=$(basename "$f" .decrypted.wxapkg)
  npx --yes unpack-wxapkg "$f" "source_new_unpacked/$base"
done
```

实测结果：

- `__APP__.decrypted.wxapkg` 解包成功。
- `_subpackages_TEST_REMOTE_MODULE_.decrypted.wxapkg` 解包成功。
- `_subpackages_game_.decrypted.wxapkg` 普通解包在最后一个异常文件表项处失败，但前 12 个有效资源项可恢复。

`_subpackages_game_` 的恢复脚本：

```bash
node --input-type=module <<'NODE'
import fs from 'fs';
import path from 'path';

const src = 'source_new_decrypted/_subpackages_game_.decrypted.wxapkg';
const dest = 'source_new_unpacked/_subpackages_game_recovered';
const buf = fs.readFileSync(src);
let idx = 0;
const read = (n) => { const out = buf.subarray(idx, idx + n); idx += n; return out; };
const i32 = (b) => ((b[0] << 24) + (b[1] << 16) + (b[2] << 8) + b[3]) | 0;

const first = read(1)[0];
const fileInfo = i32(read(4));
const indexInfoLength = i32(read(4));
const bodyInfoLength = i32(read(4));
const last = read(1)[0];
const count = i32(read(4));
console.log({ first: first.toString(16), fileInfo, indexInfoLength, bodyInfoLength, last: last.toString(16), count, size: buf.length });

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

let ok = 0;
let skipped = 0;
for (let i = 0; i < count; i++) {
  const nameLen = i32(read(4));
  const name = Buffer.from(read(nameLen)).toString('latin1');
  const offset = i32(read(4));
  const size = i32(read(4));
  const valid = name && name !== '/' && offset >= 0 && size >= 0 && offset + size <= buf.length;
  console.log(`${i + 1}/${count}`, JSON.stringify(name), { nameLen, offset, size, valid });
  if (!valid) {
    skipped++;
    continue;
  }
  const outPath = path.join(dest, name.replace(/^\/+/, ''));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf.subarray(offset, offset + size));
  ok++;
}

console.log({ ok, skipped, dest });
NODE
```

恢复出的 `subpackages/game` 主要是配置、场景和少量资源，并不是这次查 WebSocket 命令的主入口。

### 3. 关键解包产物

当前最有价值的文件是：

```text
source_new_unpacked/__APP__/__APP__.decrypted/game.js
source_new_unpacked/_subpackages_TEST_REMOTE_MODULE_/_subpackages_TEST_REMOTE_MODULE_.decrypted/subpackages/TEST_REMOTE_MODULE/game.js
source_new_unpacked/_subpackages_game_recovered/subpackages/game/config.bd177.json
```

其中：

- `__APP__/game.js`：包含入口、平台、WebSocket 基础连接、服务器地址、版本号。
- `TEST_REMOTE_MODULE/game.js`：包含大量协议字符串、响应名、战斗和功能逻辑，是本次同步新命令的主要参考。
- `_subpackages_game_recovered`：主要是资源和 Cocos 配置，暂未看到主 WebSocket 协议逻辑。

从 `__APP__/game.js` 提取到的新版本信息：

```text
APPID = wx0840558555a454ed
SERVER = https://xxz-xyzw.hortorgames.com
BATTLE_OSS_URL = https://xxz-xyzw-service-battle.hortorgames.com
GAME_VERSION = 2.26.3-9d5216f8bc3b99d5-wx
CODE_VERSION = 2.26.3
BATTLE_VERSION = 7f91491b47
```

和当前项目静态定义对比：

```text
src/xyzw/game-defines.js:
GAME_VERSION = 2.3.9-wx
CODE_VERSION = 2.3.9

source_new:
GAME_VERSION = 2.26.3-9d5216f8bc3b99d5-wx
CODE_VERSION = 2.26.3
```

也就是说，项目里的静态版本定义已经明显落后。`BATTLE_VERSION` 仍然是 `7f91491b47`，但不能只靠这个判断战斗协议没变，因为实际战斗命令还可能依赖服务端返回的 `battleData.version`。

WebSocket 基础连接逻辑仍然是：

```text
SERVER http(s) -> ws(s)
+ /agent
connParam.roleToken = token
connParam.version = version
encoding 仍由 connect 参数传入
```

当前项目使用的连接形式：

```text
wss://xxz-xyzw.hortorgames.com/agent?p=...&e=x&lang=chinese
```

需要在真实连接时继续核对 `p/e/lang/version` 等参数是否被新版客户端或服务端强校验。

### 4. 已生成的命令对比文件

已从 `__APP__/game.js` 和 `TEST_REMOTE_MODULE/game.js` 抽取协议候选字符串，生成：

```text
source_new_commands.txt
source_new_responses.txt
source_new_current_command_diff.json
```

统计结果：

```text
source_new_commands.txt                  827 条命令候选
source_new_responses.txt                 541 条 xxxresp 响应候选
source_new_current_command_diff.json     和当前注册表的差异报告
```

差异报告显示：

```text
source_new 中命令候选：827
source_new 中响应候选：541
当前 xyzwWebSocket.js 注册命令：150
source_new 有但当前未注册：683
当前注册但 source_new 未直接看到：6
```

当前注册但这次字符串抽取未直接看到的 6 个命令：

```text
legacy_gift_getlist
legacy_gift_received
legacy_gift_send
legion_approveapply
legion_refuseapply
presetteam_setteam
```

这些不一定代表废弃，可能是抽取规则漏掉、动态拼接、旧兼容命令或当前项目自定义封装；删除前必须用实际 WebSocket 响应验证。

部分 `source_new` 有但当前未注册、值得优先关注的命令类别：

```text
activity_getactbingoinfo
activity_startactbingo
activity_getactegameinfo
activity_startactegame
activity_getactmineinfo
activity_startactmine
activity_getactmonopolyinfo
activity_startactmonopoly
activity_getrolecardtower
activity_startcardtowerbattle
activity_startcardtowerhelpbattle
activity_gettreasureinfo
activity_starttreasure
activity_roguebookread
activity_roguemove
activity_roguebuyshop
activity_roguerestart
bosstower_gethall
bosstower_getboom
bosstower_claimreward
bosstower_buyboom
bosstower_searchteam
bosstower_invite
car_getgrouprank
car_getrolerank
car_raid
equipment_getquenchlog
equipment_enchant
equipment_changequench
evotower_getshareinfo
evotower_gettowerlegionrank
fight_getlevelbattledata
fight_endlevel
fight_startarena
fight_startareaarena
friend_list
friend_applylist
```

这批只能说明新版客户端里存在对应命令字符串，不能直接说明默认 body 参数已经确定。真正补功能时还要继续定位发送处或抓取实际 WebSocket 帧。

### 5. 本次 source_new 后续同步建议

推荐按下面顺序继续：

1. 先更新静态版本定义或让项目从 `role_getroleinfo` / manifest 响应动态读取版本，避免硬编码 `2.21.2...`、`2.3.9` 一类旧值。
2. 针对要补的新功能，在 `source_new_commands.txt` 中找到命令名，再去 `TEST_REMOTE_MODULE/game.js` 中定位附近逻辑。
3. 同时用安卓 root 环境或微信开发者工具抓 WebSocket 帧，拿到真实 request body 和 response body。
4. 在 `src/utils/xyzwWebSocket.js` 中注册命令默认 body，并在 `responseToCommandMap` 中补响应映射。
5. 如果响应需要 UI 使用，补 `src/stores/events/*.ts` 的状态写入。
6. 最后在功能页或 batch task 中调用，不要直接把协议细节写进组件。

定位某个新命令的终端方式：

```bash
CMD=activity_getactbingoinfo
GAME_JS=source_new_unpacked/_subpackages_TEST_REMOTE_MODULE_/_subpackages_TEST_REMOTE_MODULE_.decrypted/subpackages/TEST_REMOTE_MODULE/game.js

node -e "
const fs=require('fs');
const s=fs.readFileSync(process.env.GAME_JS,'utf8');
const cmd=process.env.CMD;
let i=-1,n=0;
while((i=s.indexOf(cmd,i+1))>=0){
  console.log('\\n--- hit '+(++n)+' @ '+i+' ---');
  console.log(s.slice(Math.max(0,i-600), Math.min(s.length,i+900)));
}
" 
```

如果周围仍然是混淆索引，而看不到 body 字段，就需要抓包补齐。客户端字符串抽取负责回答“有哪些命令/响应”，抓包负责回答“这个命令实际怎么传参”。
