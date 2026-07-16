# 部署教程

本教程面向零基础用户。先完成共用配置，再只阅读你准备使用的平台。

## 1. 必要工具

- Node.js 22.12 以上
- Git
- 推荐 pnpm；没有 pnpm 时可用 npm
- 部署 VPS 需要 OpenSSH Client
- VPS Docker 需要服务器已安装 Docker Engine 与 Docker Compose

```bash
node --version
git --version
pnpm --version
```

没有 pnpm：

```bash
corepack enable
corepack prepare pnpm@10.33.4 --activate
```

## 2. 安装与创建本地配置

```bash
pnpm install
cp .env.example .env
```

Windows PowerShell：

```powershell
pnpm install
Copy-Item .env.example .env
```

编辑 `.env`：

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=我的博客
PUBLIC_SITE_AUTHOR=作者名称
PUBLIC_SITE_DESCRIPTION=本站的公开说明。
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

- `PUBLIC_SITE_URL` 必须是干净的 HTTPS 地址，末尾不能有 `/`。
- `PUBLIC_CONTACT_EMAIL` 会公开显示。
- `PUBLIC_GA4_ID` 可选，格式如 `G-XXXXXXXXXX`。
- 真实 `.env*` 不得提交，只提交 `.example`。
- `example.com`、`203.0.113.10` 都是示例，不要把私人值提交到公开版。

验证：

```bash
pnpm check
pnpm build
pnpm selfcheck -- --quick
```

## 3. 域名、SEO、Search Console 与 GA4

正式构建前，先把最终域名写入 `PUBLIC_SITE_URL`。canonical、hreflang、sitemap、robots.txt、Open Graph 和 JSON-LD 都会使用它。

网站上线后：

1. 在 Google Search Console 新增域名或网址前缀资源。
2. 提交 `https://example.com/sitemap-index.xml`。
3. 使用网址检查测试首页和一篇文章。
4. 只有在索引失败已修复或重要页面更新时才需要重新请求建立索引，无需逐页提交全部网址。

HTML 验证文件放入 `public/`，构建部署后确认能从网站根目录打开。发布公开模板前要确认验证文件不属于私人站点。

GA4：

1. 创建 GA4 Web Data Stream。
2. 复制 `G-` 开头的 Measurement ID。
3. 写入本地 `.env` 或托管平台 Build Variables。
4. 访客同意分析 Cookie 后才会通过 Partytown 加载。

Cloudflare Web Analytics 与 GA4 可以同时启用。Pages 已自动启用 Web Analytics 时，不要手动加入第二份 Beacon。

## 4. 安全响应头

- Cloudflare Pages：`public/_headers`
- Vercel：`vercel.json`
- Nginx／VPS：`deploy/nginx-security-headers.conf`

三份 CSP 基线必须一致，包含 `X-Content-Type-Options: nosniff`、防 iframe、防 MIME sniffing、Referrer Policy、Permissions Policy 和 HSTS。不得加入 `unsafe-inline`。

HSTS 默认不含 `includeSubDomains`、`preload`，只有确认所有子域名永久支持 HTTPS 后才能启用。

## 5. Cloudflare Pages

```bash
cp .env.cloudflare.example .env.cloudflare
```

```env
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_PAGES_PROJECT_NAME=my-blog
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=我的博客
PUBLIC_SITE_AUTHOR=作者名称
PUBLIC_SITE_DESCRIPTION=本站说明
PUBLIC_CONTACT_EMAIL=contact@example.com
```

获取方式：

1. 打开 Cloudflare Dashboard。
2. 从账户总览／侧栏复制 Account ID。
3. My Profile > API Tokens > Create Token。
4. 只授予目标账户所需的 Cloudflare Pages Edit 权限。
5. 填写已有 Pages 项目名称；不存在时脚本可以创建。

```bash
pnpm deploy:cf:only
```

自定义域名在 Workers & Pages > 项目 > Custom domains 添加，按界面配置 DNS，然后把相同 HTTPS 地址写入 `PUBLIC_SITE_URL` 重新构建。

## 6. Vercel

```bash
cp .env.vercel.example .env.vercel
```

```env
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
VERCEL_PROJECT_NAME=astro-theme-simpleblog
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

1. 创建或导入 Vercel Project。
2. Account Settings > Tokens 创建最小用途 Token。
3. Project Settings > General 复制 Project ID。
4. Team 项目把 Team ID 写入 `VERCEL_ORG_ID`；个人项目在 Token 能解析项目时可留空。

```bash
pnpm deploy:vercel:only
```

部署器使用 Vercel REST API，不依赖 Vercel CLI，只上传静态构建文件和精简后的 `vercel.json`。

## 7. Netlify

```bash
cp .env.netlify.example .env.netlify
```

```env
NETLIFY_AUTH_TOKEN=
NETLIFY_SITE_ID=
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

1. 创建 Netlify Site。
2. User settings > Applications > Personal access tokens 创建 Token。
3. Project configuration > General 复制 Project ID／Site ID。

```bash
pnpm deploy:netlify:only
```

预览部署：

```bash
pnpm deploy:switch -- --mode=direct:netlify --netlify-preview --yes
```

部署器会通过有界流创建 ZIP，再使用 Netlify API 上传。

## 8. VPS 静态部署

创建 SSH key：

```bash
ssh-keygen -t ed25519 -a 64 -f ~/.ssh/id_ed25519
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@example.com
ssh-keyscan -H example.com >> ~/.ssh/known_hosts
```

信任 host key 前，请从 VPS 服务商控制台核对指纹。

`.env.vps`：

```env
VPS_HOST=203.0.113.10
VPS_USER=deploy
VPS_PORT=22
VPS_SSH_KEY_PATH=~/.ssh/id_ed25519
VPS_KNOWN_HOSTS_FILE=~/.ssh/known_hosts
VPS_TARGET_DIR=/var/www/example.com
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

部署用户必须能写入 `VPS_TARGET_DIR`，不建议无必要使用 root。Nginx HTTPS `server` 块应 include `deploy/nginx-security-headers.conf`。

```bash
pnpm deploy:vps:only
```

有 rsync 时使用 rsync，否则使用 OpenSSH scp；两种方式都会先上传到暂存目录，再原子切换并保留失败恢复。

## 9. VPS Docker

`.env.vps-docker`：

```env
VPS_HOST=203.0.113.10
VPS_USER=deploy
VPS_PORT=22
VPS_SSH_KEY_PATH=~/.ssh/id_ed25519
VPS_KNOWN_HOSTS_FILE=~/.ssh/known_hosts
VPS_DOCKER_APP_DIR=/opt/astro-simpleblog
VPS_DOCKER_PROJECT_NAME=astro-simpleblog
VPS_DOCKER_BIND_ADDRESS=127.0.0.1
VPS_DOCKER_HTTP_PORT=8080
VPS_DOCKER_ALLOW_PUBLIC_BIND=0
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

```bash
pnpm deploy:vps-docker:only
```

容器使用非 root Nginx、只读文件系统、移除 capabilities、`no-new-privileges`，默认只绑定 `127.0.0.1:8080`。请在前方配置 HTTPS 反向代理。只有完成防火墙设置后才能改为 `0.0.0.0` 并设置 `VPS_DOCKER_ALLOW_PUBLIC_BIND=1`。

## 10. Supabase Edge Functions

Supabase Edge Functions 不能托管本 Astro 静态网站；此目标只部署 TypeScript 后端函数。

创建：

```text
supabase/functions/hello/index.ts
```

```ts
Deno.serve(() => Response.json({ status: 'ok' }));
```

`.env.supabase`：

```env
SUPABASE_ACCESS_TOKEN=
SUPABASE_PROJECT_REF=
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

Token 在 Supabase Account Settings > Access Tokens 创建；Project Ref 位于 Dashboard URL 的 `/project/<project-ref>`。

```bash
pnpm deploy:supabase:only
pnpm deploy:switch -- --mode=direct:supabase --supabase-function=hello --yes
```

Service Role Key 和函数秘密必须放在 Supabase Secrets／Vault，不得使用 `PUBLIC_` 或提交到 Git。

## 11. GitHub、GitLab、Codeberg

- GitHub Actions：`.github/workflows/deploy.yml`
- GitLab CI：`.gitlab-ci.yml`
- Codeberg／Woodpecker：`.woodpecker.yml`
- 三操作系统验证：`.github/workflows/cross-platform.yml`

所有 Token、ID、SSH 私钥都放在平台加密 Secrets／Variables，不得直接写入 YAML。

```bash
pnpm deploy:switch -- --mode=github:cf --git-remote=origin --git-branch=main --dry-run
pnpm deploy:switch -- --mode=gitlab:netlify --dry-run
pnpm deploy:switch -- --mode=codeberg:vps-docker --dry-run
```

确认计划后再移除 `--dry-run`。

## 12. 菜单、快捷命令与多合一部署

项目提供三种部署方式。

### 交互菜单

```bash
pnpm deploy:menu
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
pnpm deploy:menu -- --lang=zh-cn
```

菜单会依次要求选择语言、部署模式、可选参数和最终确认，并在执行前显示完整命令。第一次配置平台时，请先加入 **dry run** 查看计划。

### 单平台快捷命令

| 命令                          | 部署目标                   |
| ----------------------------- | -------------------------- |
| `pnpm deploy:cf:only`         | Cloudflare Pages           |
| `pnpm deploy:vercel:only`     | Vercel 正式环境            |
| `pnpm deploy:netlify:only`    | Netlify 正式环境           |
| `pnpm deploy:vps:only`        | VPS 静态目录               |
| `pnpm deploy:vps-docker:only` | VPS Docker                 |
| `pnpm deploy:supabase:only`   | 仅 Supabase Edge Functions |

单平台快捷命令会在环境和项目检查后直接开始，不会显示 `deploy:switch` 的再次确认提示。

### 多合一快捷命令

| 命令                                  | 实际部署目标                                     |
| ------------------------------------- | ------------------------------------------------ |
| `pnpm deploy:all`                     | Cloudflare + VPS + Vercel                        |
| `pnpm deploy:all:static`              | Cloudflare + VPS + VPS Docker + Vercel + Netlify |
| `pnpm deploy:all:including-functions` | 上述全部静态目标 + Supabase Edge Functions       |

`deploy:all:including-functions` 需要至少一个有效的 `supabase/functions/<名称>/index.ts`。

## 13. `deploy:switch` 命令与参数

基本格式：

```bash
pnpm deploy:switch -- --mode=<平台>:<目标+目标> [参数]
```

使用 `direct` 从当前电脑直接部署：

```bash
pnpm deploy:switch -- --mode=direct:cf+netlify --dry-run
pnpm deploy:switch -- --mode=direct:cf+netlify --yes
```

使用 `github`、`gitlab` 或 `codeberg` 时只会推送源码到已有 Git remote，再由对应 CI 配置执行部署，不会直接上传网站：

```bash
pnpm deploy:switch -- --mode=github:cf+vercel --git-remote=origin --git-branch=main
```

支持参数：

| 参数                         | 功能                                                      |
| ---------------------------- | --------------------------------------------------------- |
| `--dry-run`                  | 只显示计划，不构建、不验证凭据、不 push、不上传。         |
| `--yes`／`-y`                | 只跳过 `deploy:switch` 的人工确认；正常项目检查仍会执行。 |
| `--skip-clean`               | 重新构建前不删除已有输出目录；不代表跳过 build。          |
| `--dist=<dir>`               | Cloudflare、Netlify 或静态 VPS 使用安全的项目内输出目录。 |
| `--cf-project=<name>`        | 覆盖 Cloudflare Pages 项目名称。                          |
| `--cf-branch=<branch>`       | 覆盖 Cloudflare Pages 部署分支。                          |
| `--cf-env=<file>`            | 使用另一个根目录 Cloudflare `.env*`。                     |
| `--vps-env=<file>`           | 使用另一个根目录静态 VPS `.env*`。                        |
| `--vps-docker-env=<file>`    | 使用另一个根目录 VPS Docker `.env*`。                     |
| `--vercel-env=<file>`        | 使用另一个根目录 Vercel `.env*`。                         |
| `--vercel-preview`           | 创建 Vercel Preview，而不是正式部署。                     |
| `--netlify-env=<file>`       | 使用另一个根目录 Netlify `.env*`。                        |
| `--netlify-preview`          | 创建 Netlify Draft／Preview 部署。                        |
| `--supabase-env=<file>`      | 使用另一个根目录 Supabase `.env*`。                       |
| `--supabase-function=<name>` | 只部署一个已存在的 TypeScript Edge Function。             |
| `--git-remote=<name>`        | 选择已配置的 Git remote 名称。                            |
| `--git-branch=<name>`        | 选择通过安全验证的推送分支。                              |
| `--git-set-upstream`         | 加入 `git push --set-upstream`。                          |
| `--git-follow-tags`          | 加入 `git push --follow-tags`。                           |
| `--lang=<language>`          | 指定控制台语言：`en`、`zh-tw` 或 `zh-cn`。                |

环境文件覆盖只接受项目根目录的普通 `.env` 或 `.env.*` 文件；路径穿越和 symbolic link 会被拒绝。

npm 传递参数时必须保留 `--`：

```bash
npm run deploy:switch -- --mode=direct:cf --dry-run
```

正常直接部署会先检查 `.gitignore`，由 switch 执行一次 `pnpm check`，再由每个选定部署器分别构建并上传经过审查的输出。正式发布前请执行 `pnpm analyze`，才能同时完成 OSV、正式产出、所有模式 dry-run 和 E2E 验证。

## 14. 可选 OpenPhish 离站检测

公开版有意不包含私人 OpenPhish Runtime。请按照 [OPENPHISH_GUIDE.zh-CN.md](./OPENPHISH_GUIDE.zh-CN.md) 独立搭建。

- 先确认授权和允许用途。
- Feed、哈希 bucket、存储 ID、同步 Token、后端秘密不得公开。
- 前端 debounce 不是安全边界，仍需配置 WAF／平台限流。
- URL 必须在服务器端规范化，请求与响应需要大小限制，错误时 fail closed。
- Cloudflare KV 是最终一致性，必须使用正确 binding 名称和 metadata-last A/B 快照。

## 15. 发布前验证

```bash
pnpm check
pnpm audit:security
pnpm build
pnpm test:e2e
pnpm analyze
git status --short
git ls-files
```

确认没有跟踪真实 `.env`、Token、私钥、私人文章／图片、`dist`、`.wrangler`、`.vercel`、`.netlify` 或 `.supabase` 状态。
