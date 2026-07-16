# 可选的 OpenPhish 离站网址检测

此公开模板只内置不调用 API 的离站提示，**没有内置**查询 API、Cloudflare KV 绑定、同步 Worker 或 OpenPhish 数据。本指南只说明一项可选且必须独立部署的信誉检测功能；实施时需自行准备后端、存储、前端集成、安全审查，以及使用清单所需的授权。

实施前请先阅读 [OpenPhish Feed 说明](https://openphish.com/phishing_feeds.html)和 [OpenPhish 使用条款](https://openphish.com/terms.html)。Community Feed 内容有限，目前每 12 小时更新一次，也可能误判或漏判；条款对用途、披露和再分发有所限制。商业用途或公共服务可能需要事先取得许可或改用其他授权。

## 推荐架构

```text
浏览器
  -> 自有 POST /api/example-reputation-check
  -> 规范化网址
  -> SHA-256 完全匹配查询
  -> 私有存储

受保护的调度器
  -> 下载官方 Community Feed
  -> 验证并规范化每条数据
  -> 哈希后发布新快照
  -> 最后发布 metadata
```

清单和存储都必须保持私有。浏览器只查询自己的 API，不应把目标网址直接发送给 OpenPhish。

所有平台共用同一份 API 契约：

```json
{ "url": "https://example.com/path" }
```

```json
{
  "status": "no-known-threats",
  "checkedAt": "2026-01-01T00:00:00.000Z",
  "threatTypes": []
}
```

完全匹配时返回 `potentially-unsafe` 和 `["PHISHING"]`。无效请求、数据过期、存储失败、超时或非预期响应都应返回非 2xx 状态，并让“继续前往”保持禁用。

## 共用安全规则

同步与查询核心使用 TypeScript，平台适配层只负责读取环境变量和转交请求。

- 只接受 `https:` 和 `http:`。拒绝账号密码、格式错误的主机名、fragment、localhost、私有 IP、link-local 和其他非公开目标。
- 同步与查询必须共用同一个网址规范化函数。
- 使用 SHA-256 哈希规范化后的网址。不可通过 API、静态资源、仓库、构建产物或日志公开原始清单。
- 以哈希前两个十六进制字符建立固定分桶，避免每个网址占用一条存储记录。
- 先完整写入新的 A/B 快照，最后更新 metadata。每个 bucket 都要写入快照标识符；如果 bucket 外观合法但标识符与 metadata 不符，查询必须拒绝并只使用通过验证且仍然新鲜的 previous snapshot。
- Metadata 至少保存 `lastCheckedAt`、`updatedAt`、条目数、active／previous slot、active／previous 快照标识符和 schema version。
- 发布前限制清单大小、行数、下载时间、内容类型、最低有效条目数和单个网址长度。
- 公共查询端点只允许 `POST` 和 `OPTIONS`，并限制 request body，例如最多 4096 bytes。
- CORS 只允许精确 HTTPS origin。不可反射任意 origin，也不可同时使用 credentials 和 `*`。
- 前端 debounce／冷却只能减少误触连点；API 仍需要平台原生 rate limit 或 WAF 规则。
- 日志只记录通用错误代码，不记录完整目标网址、清单内容、Bearer token 或上游 response body。

官方 Community Feed 目前位于：

```text
https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt
```

下载时明确限制重定向：

```ts
const response = await fetch(FEED_URL, {
  headers: { Accept: 'text/plain' },
  redirect: 'manual',
});

if (response.status >= 300 && response.status < 400) {
  throw new Error('不允许 Feed 重定向。');
}
if (!response.ok) {
  throw new Error(`Feed 请求失败：${response.status}`);
}
```

Cloudflare Workers 使用 `redirect: "manual"` 兼容性较高。不可使用 `redirect: "follow"`，否则下载可能被导向未经审查的主机。部分 Cloudflare 实际环境即使类型允许，也会拒绝 `redirect: "error"`；因此应使用 `manual` 并自行拒绝所有 3xx。

## 每 36 小时实际同步

OpenPhish 目前每 12 小时更新 Community Feed，但你的服务不必每次都下载。跨平台一致的 36 小时调度应这样设计：

1. 每小时执行一次极轻量调度。
2. 从私有 metadata 读取 `lastCheckedAt`。
3. 距离上次实际检查满 36 小时才下载。
4. 保留经过验证的手动同步端点，供首次初始化或故障恢复时强制执行。
5. 查询数据的新鲜度上限应高于调度间隔，例如 48 小时，避免一般调度延迟立即关闭服务。

标准五字段 cron 无法精确表达持续循环的 36 小时；每小时唤醒后由 TypeScript 判断是否到期，才能在所有平台共用相同逻辑：

```cron
0 * * * *
```

## 各平台的存储替代方案

Cloudflare KV 不是唯一选择。真正需要保持稳定的是负责 `get`、`put` 和发布 metadata 的小型存储接口，而不是把某一家平台的 SDK 写进同步或查询核心。

| 部署位置                       | 建议存储                   | 函数如何连接                                                                            |
| ------------------------------ | -------------------------- | --------------------------------------------------------------------------------------- |
| Cloudflare                     | Workers KV                 | 在 Worker 与 Pages 项目分别绑定同一个 namespace，通过 `env.KV` 或 `context.env.KV` 使用 |
| Netlify                        | Netlify Blobs              | 在 Function 内调用 `getStore()`；Netlify runtime 自动提供当前 Project ID 与访问令牌     |
| Vercel                         | Marketplace Redis／Upstash | 在 Marketplace 将数据库连接到项目；Vercel 自动加入供应商连接环境变量                    |
| Supabase                       | Postgres                   | Edge Function 使用服务端项目 secrets，RLS 阻止浏览器直接读取                            |
| 单机 VPS                       | SQLite                     | API 与同步程序共用一个位于 Web root 之外的数据库文件                                    |
| 多副本 VPS／Docker             | Redis 或 Postgres          | 数据库仅开放给 localhost 或容器私有网络，连接信息通过未提交的 secret 传入               |
| GitHub／GitLab／Codeberg Pages | 没有私有动态存储           | 静态前端必须调用部署在上述任一平台的 HTTPS API                                          |

共用 TypeScript 核心应只依赖自定义 `OpenPhishStore` 接口，每个平台只实现一层很薄的 adapter。前端只读取 `PUBLIC_REPUTATION_ENDPOINT`，因此迁移时通常只需替换 endpoint 与 CSP 精确 origin，不必修改离站页面逻辑。

## 将后端迁离 Cloudflare

Cloudflare binding 应该只是一层平台 adapter，而不是应用核心。迁移时只替换平台入口与存储实现，网址规范化、哈希、快照验证、新鲜度判断、API 响应格式和失败即阻止行为都必须保持一致。

| 原 Cloudflare 组件     | 可移植替代方案                                                              |
| ---------------------- | --------------------------------------------------------------------------- |
| Workers KV             | Netlify Blobs、托管 Redis、Postgres 或私有 SQLite                           |
| Cron Trigger           | 平台调度器、CI 调度或受保护的 VPS cron                                      |
| Worker／Pages Function | Netlify Function、Vercel Function、Supabase Edge Function 或私有 HTTPS 服务 |
| Worker secret          | 目标平台的 server-side secret manager                                       |
| Cloudflare rate limit  | 平台原生限流、反向代理限流或可信 API gateway                                |

按照以下顺序迁移：

1. 只新增新的 `OpenPhishStore` adapter 与平台入口，不得另外复制或改写规范化和查询规则。
2. 建立不公开的目标存储空间，并导入新生成的快照。原始 Feed 不得通过公开仓库、浏览器存储、部署 log 或公开产物搬运。
3. 直接在目标平台的 server-side secret manager 新增秘密。文档只能使用 `YOUR_SYNC_SECRET` 等占位符，不得填入真实 token、账号 ID、namespace ID、项目 ID、数据库网址或 service-role key。
4. 先使用无关的示例网址部署新 API，例如 `https://reputation-api.example.net/api/example-reputation-check`，并设置精确的前端 origin allowlist 与 CSP `connect-src` origin。
5. 切换前测试正常请求、格式错误网址、私有网络目的地、过期 metadata、存储服务中断、限流和同步回滚。
6. 前端只替换 `PUBLIC_REPUTATION_ENDPOINT` 与 CSP 精确 origin，然后重新构建和部署静态网站。
7. 观察新服务时不得记录目的网址或凭据。确认新快照与调度持续正常后，撤销旧秘密、移除旧 binding，再删除旧端点。

迁移期间不得让两个独立同步器同时写入同一份 active metadata。新服务应使用独立存储空间，或采用单一写入者交接，否则可能混合不同快照的 metadata 与 bucket。旧端点只保留短暂的回滚时间，也不得为了方便迁移而放宽 CORS 或 CSP。

## Cloudflare Workers 与 Pages

建立一个同步 Worker，以及一个 Pages Function 或另一个 Worker 作为查询 API。两者必须绑定同一个 KV namespace，代码使用的 binding 名称例如 `KV`。Dashboard 中 namespace 的显示名称不必与 binding 名称相同。

通用 Worker 配置：

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "YOUR_SYNC_WORKER",
  "main": "src/index.ts",
  "compatibility_date": "YYYY-MM-DD",
  "triggers": {
    "crons": ["0 * * * *"]
  },
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "YOUR_KV_NAMESPACE_ID",
      "preview_id": "YOUR_PREVIEW_KV_NAMESPACE_ID"
    }
  ]
}
```

Worker 通过 `env.KV` 使用绑定；Pages Function 则通过 `context.env.KV` 使用。创建 namespace 不代表已经绑定，Worker 与 Pages 项目都必须分别连接同一个 namespace。

手动同步 token 应保存为 Worker secret：

```bash
pnpm exec wrangler secret put SYNC_TOKEN --config path/to/wrangler.jsonc
```

Bearer token 应尽量采用固定时间比较。手动端点只接受 `POST`、返回通用错误，而且不可泄露 token 前缀是否正确。

正式部署时请自行选择私有路径，不要直接照抄示例 `/api/example-reputation-check`，再在 Cloudflare 针对实际精确路径创建 Rate Limiting Rule。可以先设置每个来源 IP 每分钟 30 次，超出后 Managed Challenge 或临时阻止，再根据 Security Analytics 调整。套餐支持 Method 条件时只统计 `POST`；如果不支持，则使用精确路径并为跨来源 `OPTIONS` 预检保留足够额度。不得把规则应用到整个网站，也不得把路径保密、前端 debounce 或 CORS 当作机器人防护。

## Netlify

需要三个部分：

- Scheduled Function：每小时执行到期检查。
- 独立 HTTP Function：处理自定义私有查询路径，例如 `/api/example-reputation-check`。
- Netlify Blobs 或外部数据库：保存私有哈希分桶和 metadata。

Netlify 的 Scheduled Function 在 production 不能直接通过网址调用，因此首次初始化和故障恢复要另外建立经过验证的 HTTP Function。若使用 Netlify Blobs，metadata 发布顺序需要较强一致性时可这样创建 store：

```ts
import { getStore } from '@netlify/blobs';

const store = getStore({
  name: 'openphish',
  consistency: 'strong',
});
```

在 `netlify.toml` 设置每小时调度；是否满 36 小时的判断仍放在共用 TypeScript，不要分散到平台配置。

连接步骤：

1. 安装 `@netlify/blobs`，把同步与查询 Function 放入 `netlify/functions/`。
2. 两个 Function 使用同一个 store 名称，例如 `openphish`。
3. Function 在 Netlify 上运行时，`getStore()` 会自动取得当前项目的 Project ID 与访问令牌，不需要把它们写进公开环境变量。
4. 对 metadata 与刚发布的 bucket 使用 `consistency: "strong"`。Netlify Blobs 没有内建事务或并发锁，仍需使用 snapshot 标识与 metadata 最后发布。
5. Scheduled Function 只能由调度或 Dashboard 的 **Run now** 执行；另建一个受 `SYNC_TOKEN` 保护的 HTTP Function 用于首次初始化。

## Vercel

建议配置：

- `/api/openphish-sync`：由 Vercel Cron 调用并受保护的 Function。
- 自定义私有查询路径：公开但有 rate limit 的查询 Function。
- Marketplace Redis、Upstash 或其他持久数据库。

旧的 Vercel KV 已不再是可移植的默认选择。使用小型 storage interface 隔离数据库操作，日后更换 Redis 或数据库时，不必重写规范化、哈希和 API 响应逻辑。

每小时 cron 示例：

```json
{
  "crons": [
    {
      "path": "/api/openphish-sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

使用 `CRON_SECRET` 保护路由，并注意 Vercel Cron 只会在 production deployment 执行。

连接步骤：

1. 在 Vercel 项目的 **Storage／Marketplace** 安装 Redis 或 Upstash，并选择要连接的项目。
2. 平台会将供应商连接信息加入项目环境变量；不得自行把连接字符串提交到 Git。
3. 新增或修改资源后必须重新部署。本机测试使用 `vercel env pull`，并确保生成的本机环境文件已被 `.gitignore` 排除。
4. 建立 Redis adapter，将每个 bucket 与 metadata 存为独立 key；使用 pipeline／受限批次写入新 snapshot，最后单独发布 metadata。
5. 如果 Marketplace 资源支持 Allowed Environments，将正式数据库限制为 Production，Preview 使用另一个空白测试资源。

## Supabase Edge Functions

分别部署同步与查询两个 Edge Function。分桶与 metadata 存在 Postgres，并使用 RLS 禁止匿名用户直接读取。

使用 `pg_cron` 与 `pg_net` 定时调用同步 Function。Service-role key 和同步 secret 应放在 Supabase Vault 或平台 secrets，不可写入提交到仓库的 SQL。查询 Function 只执行最小权限的数据库操作，不应把数据表直接暴露在公共 REST API。

连接步骤：

1. 在同一个 Supabase project 建立私有 bucket 表与 metadata 表，主键分别使用 snapshot／bucket key 和固定 metadata key。
2. 启用 RLS，并且不要为 `anon`、`authenticated` 创建可直接读取 Feed 数据的 policy。
3. 建立同步与查询两个 TypeScript Edge Function。只有服务端函数可以使用 service-role，绝不可放入 `PUBLIC_*` 变量或浏览器。
4. 在 Dashboard 的 **Integrations > Cron** 创建每小时任务，或使用 `pg_cron` 加 `pg_net` 调用同步 Function；验证数据保存在 Vault。
5. 同步应在事务内写完新 snapshot，最后更新 metadata。查询只允许执行固定的 exact-match SQL 或受限 RPC。

## VPS 与 VPS Docker

单机部署最简单的替代方案是 SQLite：将数据库放在例如 `/var/lib/simpleblog/openphish.db`，文件所有者设置为运行 API 的专用账号，权限设置为 `600`，并确认 Nginx、静态网站目录和备份下载路径都无法读取。同步程序与查询 API 必须在同一台主机，更新使用事务，不要让多个容器同时写入同一个 SQLite 文件。

需要多副本、容器滚动更新或高并发时，改用 Redis 或 Postgres：

1. 在 Docker Compose 创建 private network，不要把数据库端口发布到 `0.0.0.0`。
2. API、同步服务与数据库通过 service name 互连，例如 `redis://redis:6379` 或内部 Postgres hostname。
3. 密码与连接字符串只放在 VPS 上未提交的环境文件、Docker secret 或 systemd credential。
4. 使用 systemd timer、cron 或调度容器每小时运行到期检查，并在同步前取得单一执行锁。
5. 对外只公开反向代理后的自定义查询路径；同步端点限制为 localhost、私有网络或强验证。

## GitHub Pages、GitLab Pages、Codeberg Pages

这些服务只发布静态文件，不能安全运行查询 API，也不能保存可变的私有清单数据。

它们的 CI 调度只能用来调用部署在 Cloudflare、Netlify、Vercel、Supabase 或其他后端的认证同步端点。GitHub Actions、GitLab pipeline schedules 和 Woodpecker 都能触发，但 Bearer token 必须保存在加密的 CI secrets 中。

不要把原始 Feed、哈希分桶、secret 或部署专用 ID 提交到 Pages 仓库。这不仅增加攻击面，也可能违反 OpenPhish 使用条款。

## 前端集成

公开模板刻意不提供私有实现。确认后端正常后，再自行添加支持多语言的离站页和 TypeScript client。

如果查询 API 位于另一个 origin，只能把该精确 HTTPS origin 加入 `public/_headers`、`vercel.json` 和 `deploy/nginx-security-headers.conf` 的 `connect-src`。不得使用过宽的 `connect-src https:`。

### 启用 API 模式自检

默认自检验证的是不调用 API 的静态提示，但不会永久禁止 `fetch`、KV、Functions 或 Workers。只要检测到实现迹象，自检就会要求一份不含秘密的审计清单，再切换到 API 模式：

Windows PowerShell：

```powershell
Copy-Item link-reputation.audit.example.json link-reputation.audit.json
```

macOS 或 Linux：

```bash
cp link-reputation.audit.example.json link-reputation.audit.json
```

只修改文件路径与 `backendLocation`，不得在此文件填入 endpoint、Token、存储空间 ID、账号 ID、项目 ID 或数据库凭据。此清单应提交到 Git，CI 才能知道哪些文件属于这项功能。

- OpenPhish、URLhaus 或其他下载到私有存储空间的清单使用 `local-feed`，必须列出 `sync` 与 `storage`，`upstream` 保持为空数组。
- Google Safe Browsing、Google Web Risk、VirusTotal 或其他 server-to-server 信誉服务使用 `remote-api`，必须列出 `upstream`；没有私有缓存时，`sync` 与 `storage` 可以保持为空数组。
- `provider` 填写公开服务名称，所有向用户说明数据流的页面列入 `disclosure`。自检会确认文档提到了该供应商，但实际数据披露是否准确仍需人工确认。
- client、API、同步器、共用核心和存储 adapter 都在同一个仓库时，使用 `same-repository`，每个分组都必须列出实际 TypeScript／Astro 文件。
- 此仓库只有浏览器 client、后端位于另一个仓库时，使用 `external-service`，并将 `api`、`core`、`sync`、`storage`、`upstream` 保持为空数组。自检会验证 client／披露内容，同时警告远程后端仍需在自己的仓库执行安全检查。

API 模式下，`LINKCHECK020` 至 `LINKCHECK029` 会扫描所列文件，确认 endpoint 来自环境设置、POST JSON、有限超时、响应状态与类型验证、精确 CORS、body 上限、SSRF 防御、凭据未公开及供应商披露。`local-feed` 另外检查哈希、快照新鲜度、拒绝重定向、下载上限和存储 adapter；`remote-api` 则检查固定上游 allowlist 及供应商响应处理。这些静态规则可以拦截缺少防线的实现，但无法证明远程平台配置正确，因此仍需完成下方的实际验证清单。

### 改用 Google Safe Browsing

Google Safe Browsing v5 支持直接 URL 查询和哈希清单流程。API key 必须只放在服务器端，浏览器只能调用自己的信誉检测 API。直接 URL 查询会把待查网址发送给 Google，因此离站页不得继续声称网址只保留在本站。Safe Browsing API 原则上用于非商业用途；营利网站应评估 Google Web Risk 及适用条款。

Manifest 差异示例：

```json
{
  "version": 2,
  "mode": "api",
  "strategy": "remote-api",
  "provider": "Google Safe Browsing",
  "backendLocation": "same-repository",
  "files": {
    "client": ["src/components/LeavingNotice.astro", "src/scripts/reputation-client.ts"],
    "api": ["functions/api/example-reputation-check.ts"],
    "core": ["src/server/reputation-core.ts"],
    "sync": [],
    "storage": [],
    "upstream": ["src/server/google-safe-browsing.ts"],
    "disclosure": ["src/components/LeavingNotice.astro", "PRIVACY.md"]
  }
}
```

服务器端 allowlist 必须使用精确 origin `https://safebrowsing.googleapis.com`。API key 不得放入 `PUBLIC_*`、浏览器代码、由浏览器生成的 query string 或已提交的 `.env`。实施前请阅读 [Safe Browsing 说明](https://developers.google.com/safe-browsing)、[v5 URL Search 文档](https://developers.google.com/safe-browsing/reference/rest/v5/urls/search)和[使用条款](https://developers.google.com/safe-browsing/terms)。

前端应做到：

- 将目标网址放在 `#to=...` fragment，避免出现在一般服务器 request log 中。
- 切换语言时保留 fragment。
- 只在 `sessionStorage` 短暂保存同一目标的结果，让语言切换后可以直接显示翻译，无需再次查询。
- 无法使用、格式错误或超时时都不可生成可访问链接。
- 使用 `textContent` 显示目标网址，不可通过 `innerHTML` 插入。
- 明确说明“清单中没有匹配项”不代表网站绝对安全。

## 验证清单

1. 执行 TypeScript 诊断、lint、单元测试、安全检查和 production build。
2. 测试错误 JSON、过大 body、不支持的 method、错误 origin、本机 IP、账号密码、Unicode hostname 和不存在的路径。
3. 确认 metadata 缺失、格式错误或过期时会保持阻止状态。
4. 确认 Feed 重定向、体积过大、有效数据比例过低或存储失败时，不会发布新 metadata。
5. 确认浏览器资源和日志中都没有原始 Feed 或完整目标网址。
6. 确认 API 已设置 rate limit 和精确 CORS origin。
7. 确认三种语言路由都能保留目标网址，并在不重复查询 API 的情况下翻译现有结果。
8. 公开或商业使用前，再次确认 OpenPhish 条款和所需授权。
