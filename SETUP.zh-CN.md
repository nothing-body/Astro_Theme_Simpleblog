# 从下载到自动部署：零基础操作指南

搭配[平台部署教程](DEPLOYMENT.zh-CN.md)、[文章示例](MARKDOWN_GUIDE.zh-CN.md)与[书签设置](BOOKMARKS_GUIDE.zh-CN.md)使用。以下域名、IP、ID 都是示例；不要把真实 token 写进公开文章。

## 1. 准备工具并在本地开站

安装 Node.js（受支持的 LTS，至少 22.12）、Git、pnpm。Windows 打开 PowerShell；macOS／Linux 打开终端。先进入下载的项目文件夹，确认里面有 `package.json`，再执行：

```sh
node --version
git --version
corepack enable
corepack prepare pnpm@10.33.4 --activate
pnpm install --frozen-lockfile
```

没有 Corepack 时参考 [pnpm 安装说明](https://pnpm.io/installation)。版本应符合 `package.json` 的 `packageManager`；不要靠删除锁文件解决安装错误。

Windows 执行 `Copy-Item .env.example .env`；macOS／Linux 执行 `cp .env.example .env`。用文本编辑器打开新建的 `.env`：

```dotenv
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=我的笔记
PUBLIC_SITE_AUTHOR=Alex
PUBLIC_SITE_DESCRIPTION=记录我的项目与阅读心得。
PUBLIC_CONTACT_EMAIL=hello@example.com
PUBLIC_GA4_ID=
```

执行 `pnpm dev`，打开终端打印的本地地址。修改文字、保存后刷新；按 Ctrl+C 停止。`PUBLIC_` 表示会公开，不能放部署密码或 token。联系邮箱也会公开显示。

## 2. 各种 .env 怎么分工

| 文件 | 放什么 | 谁会读取 |
| --- | --- | --- |
| `.env` | 共用公开站点设置 | Astro |
| `.env.production` | 正式构建的公开设置 | `pnpm build` 的 Astro |
| `.env.cloudflare` | Cloudflare 部署凭证 | Cloudflare 部署命令 |
| `.env.vercel` | Vercel 部署凭证 | Vercel 部署命令 |
| `.env.netlify` | Netlify 部署凭证 | Netlify 部署命令 |
| `.env.vps` | SSH 与静态网站目录 | VPS 部署命令 |
| `.env.vps-docker` | SSH 与 Docker 目录 | VPS Docker 部署命令 |
| `.env.supabase` | 函数部署凭证 | Supabase 部署命令 |

需要正式设置时，复制 `.env.example` 为 `.env.production` 再修改公开值；平台文件从各自的 `.example` 复制。它们不会互相替代：`pnpm dev` 不会自动读取 `.env.cloudflare`。已有进程／CI 环境变量优先于部署文件；Astro 正式模式设置优先于共用 `.env`，但仍低于进程变量。每个名称只写一次，不使用 shell 表达式或多行值。SSH 私钥放独立文件，不要塞进本地 `.env`。

提交前执行 `git status --short`、`git check-ignore .env .env.production .env.cloudflare`，确认真实设置被忽略。`.gitignore` 不会清除已经提交的秘密，也不能阻止 Astro 把 `public/` 内的秘密复制到网站。不要在 `public/`、`src/`、文章中放密钥。若已公开，先到供应商撤销并更换，再处理 Git 历史。

## 3. 获取平台凭证并部署

先选一个平台，复制对应示例文件、填好字段，再从项目文件夹执行命令。

| 平台 | 获取方式与字段 | 命令 |
| --- | --- | --- |
| Cloudflare | 个人资料 → API Tokens → Create Token，选择目标账号的 **Cloudflare Pages: Edit**。Token 填 `CLOUDFLARE_API_TOKEN`；控制台 Account ID 填 `CLOUDFLARE_ACCOUNT_ID`；Pages 项目完整名称填 `CLOUDFLARE_PAGES_PROJECT_NAME`。 | `pnpm deploy:cf:only` |
| Vercel | 账号设置创建 token，选择正确范围和期限。项目设置复制 Project ID，分别填 `VERCEL_TOKEN`、`VERCEL_PROJECT_ID`。团队项目另填团队 ID 至 `VERCEL_ORG_ID`，实际小写项目名填 `VERCEL_PROJECT_NAME`。 | `pnpm deploy:vercel:only` |
| Netlify | 用户设置 → Applications → Personal access tokens，填 `NETLIFY_AUTH_TOKEN`；项目设置的 Project ID 填 `NETLIFY_SITE_ID`。 | `pnpm deploy:netlify:only` |
| Supabase | 账号 Access Tokens 创建 token；可用细分权限时限定目标项目和 Edge Functions 读写。填 `SUPABASE_ACCESS_TOKEN`；控制台地址 `/project/<ref>` 的 ref 填 `SUPABASE_PROJECT_REF`。 | `pnpm deploy:supabase:only` |

Supabase 只部署 `supabase/functions/<名称>/index.ts`，不托管博客 HTML。部署 token 与 publishable、anon、service-role key 不同；静态模板不需要数据库密钥。先照平台教程的 hello 示例创建函数，保持 JWT 验证并使用 Supabase 已验证的测试界面。不要为了解决验证错误，把 service-role key 放进浏览器代码。

设置最小权限与期限，将只显示一次的 token 存入密码管理器，不截图。401 通常是缺少／过期 token；403 通常是账号或权限不符，先确认项目再重试。官方说明：[Cloudflare](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)、[Vercel](https://vercel.com/docs/rest-api)、[Netlify](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/)、[Supabase](https://supabase.com/docs/guides/functions/deploy)。

## 4. SSH、VPS 与 Docker

本地安装 OpenSSH Client，创建专用部署密钥并设置口令：

```sh
ssh-keygen -t ed25519 -a 64 -f ~/.ssh/blog_deploy
```

`.pub` 是公钥，没有 `.pub` 的文件是私钥。Windows 用 `Get-Content $HOME/.ssh/blog_deploy.pub` 显示公钥；macOS／Linux 用 `cat ~/.ssh/blog_deploy.pub`。通过供应商控制台创建非 root 的 `deploy` 账号，把公钥作为完整一行附加到该账号的 `~/.ssh/authorized_keys`；服务器上 `.ssh` 权限设 700、`authorized_keys` 设 600。不要覆盖其他已有公钥。

从供应商控制台获取服务器指纹，第一次执行 `ssh deploy@你的主机` 时比对，相符才接受。单用 `ssh-keyscan` 不算验证主机。`.env.vps` 设置 `VPS_KNOWN_HOSTS_FILE=~/.ssh/known_hosts`、`VPS_SSH_KEY_PATH=~/.ssh/blog_deploy`，再填主机、用户和端口。macOS／Linux 私钥权限设 600；优先用 ssh-agent 管理口令。

请管理员创建供 deploy 写入的专用父目录，例如 `/var/www/blog-sites`，然后设置 `VPS_TARGET_DIR=/var/www/blog-sites/example.com`。部署会创建暂存目录并替换目的地，因此需要**父目录**写权限，不只是目的地权限。不可填 `/`、`/etc`、主目录或含其他数据的目录。上线前配置 HTTPS、Nginx 和安全标头。部署工具可以在 Windows／macOS／Linux 执行；远端 VPS 示例以 Linux／OpenSSH 为前提。

Docker 使用 `.env.vps-docker`、专用 `VPS_DOCKER_APP_DIR`、Linux 容器和 Compose。默认只绑定 `127.0.0.1:8080`，前面连接 HTTPS 反向代理；在**服务器上**用 `curl -I http://127.0.0.1:8080` 测试。Docker 操作权限很高，只授予你管理的部署账号。替换已有安装前先备份。

## 5. 上传后自动更新网站

在 Git 平台创建空仓库，再在本地项目执行：

```sh
git status --short
git add .
git diff --cached --stat
git commit -m "Configure blog"
git remote add origin 你的仓库Clone地址
git push -u origin main
```

分支以 `git branch --show-current` 的实际结果为准。已有远端时先用 `git remote -v` 查看，不要重复添加。提交前检查暂存的文件名与内容，不要手动上传 `.env`、私钥、`dist` 或 `node_modules`。

**GitHub：**仓库 Settings → Environments 创建 `production` 并限制部署分支。Secrets and variables → Actions 放平台 token／ID；Variables 放 `PUBLIC_SITE_URL`、`PUBLIC_CONTACT_EMAIL`、`DEPLOY_MODE=direct:cf`（改为所选平台）。VPS 另外以 secret 放完整多行私钥 `VPS_SSH_PRIVATE_KEY`、已验证主机记录 `VPS_SSH_KNOWN_HOSTS`，并设置 VPS 字段。配置完成后推送 main／master，到 Actions → Deploy Website 查看结果。

**GitLab：**Settings → CI/CD → Variables 加入同名变量，保护正式分支与凭证，限定 production 环境。多行 SSH key 不一定能使用 masked，必须限制访问且不可输出。此流程接收密钥**内容**，不是 File 类型变量的文件路径。Runner 需要 Node、OpenSSH 与网络。推送后到 Build → Pipelines 查看 `.gitlab-ci.yml` 执行结果。

**Codeberg：**先取得可用的 Woodpecker 服务／自建 runner，启用仓库，再把 `.woodpecker.yml` 指定的名称加入 repository secrets，也加入 `DEPLOY_MODE` 和公开站点设置。仅创建 Codeberg 仓库不代表已有 CI 执行资格。推送后到 Woodpecker 查看构建，只允许正式分支部署。

GitLab／Codeberg 容器在 VPS 部署前需要 OpenSSH Client。同一目的地选择平台 Git 自动构建或这套直接上传流程中的一个，避免互相覆盖。之后修改 → 检查 → commit → push 即可。API 接受上传不代表已启用；到平台部署页确认 ready 状态，再打开正式域名。

## 6. 验证与故障排除

```sh
pnpm check
pnpm build
pnpm selfcheck
```

`--quick` 会跳过产物、网络漏洞审计与浏览器／部署验证，不是完整发布检查。完整检查需要网络和浏览器。ungoogled-chromium 使用实际可执行文件路径：PowerShell 设置 `$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='C:/path/chrome.exe'`；macOS／Linux 设置 `export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/chromium`，再执行 `pnpm test:e2e`。

测试 `/`、`/zh-tw/`、`/zh-cn/`、文章、搜索与不存在的路径；从文章和分类切换语言。翻译文章使用相同相对文件名，对应翻译的 tags 保持相同顺序；缺少翻译时不可生成假的 hreflang。检查 `/sitemap-index.xml`，并用浏览器 Network 面板查看 HTML、资源与 404 的 HTTPS、CSP、nosniff、防嵌入标头。Astro preview 不模拟平台 HTTP 标头。屏蔽分析服务后导航和搜索仍应可用。安全检查不能保证外部链接绝无钓鱼或恶意软件。

## 7. 后续升级

当前 Astro 7.3.3，完整版本见 `package.json` 和锁文件。TypeScript 暂留 6，因为 Astro checker 与 ts-jest 尚要求小于 7；不要直接升主版本。先备份或提交，再用 pnpm 更新并完整验证。安全 overrides 也可能过期，必须定期重新审计。
