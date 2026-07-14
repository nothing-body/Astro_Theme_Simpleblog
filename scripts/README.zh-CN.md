# 脚本总览

此目录包含跨平台 Node.js 脚本，用于部署、项目分析、自检、测试与 Astro 升级。

## 部署脚本

- `deploy_menu.mjs`：交互式部署菜单。
- `deploy_switch.mjs`：命令行部署模式切换器，适合直接命令或 CI/CD。
- `deploy_i18n.mjs`：部署脚本共用语言字典，目前支持英文与繁体中文输出。
- `deploy_lib.mjs`：共用部署模式与命令生成逻辑。
- `deploy_runtime.mjs`：检测 Node.js、npm、pnpm 与跨平台 package runner。
- `deploy_safety.mjs`：部署前 `.gitignore` 与敏感文件检查。
- `uploaddist_cf.mjs`：构建并部署 `dist/` 到 Cloudflare Pages。
- `uploaddist_vps.mjs`：通过 SSH/rsync 上传 `dist/` 到 VPS。
- `uploaddist_vercel.mjs`：通过 Vercel CLI 构建或部署。
- `upgrade_astro.mjs`：升级 Astro 相关包，并执行 `check`、`lint` 与 `build`。

## 根目录配置文件

部署脚本读取：

```text
.env                 共用网站设置
.env.cloudflare      Cloudflare Pages 部署设置
.env.vps             VPS SSH/rsync 部署设置
.env.vercel          Vercel 部署设置
```

从已提交的示例文件复制：

```bash
cp .env.example .env
cp .env.cloudflare.example .env.cloudflare
cp .env.vps.example .env.vps
cp .env.vercel.example .env.vercel
```

真实文件必须被 Git 忽略。只提交 `.env.example` 与 `.env.*.example`。

## 部署所需数据

Cloudflare Pages：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PAGES_PROJECT_NAME`
- `PUBLIC_SITE_URL`
- `PUBLIC_CONTACT_EMAIL`

VPS：

- `VPS_HOST`、`VPS_PORT`、`VPS_USER`
- `VPS_TARGET_DIR`
- `VPS_SSH_KEY_PATH`
- 可选的 `VPS_SSH_PASSPHRASE`，优先使用 `ssh-agent`

Vercel：

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 使用方式

```bash
pnpm deploy:menu
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
pnpm deploy:switch -- --mode=direct:cf
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

部署脚本会先运行项目 `build`。真实部署前应先执行：

```bash
pnpm selfcheck -- --quick
pnpm analyze
```

自检会验证 9 个部署脚本的语法，并使用安全占位值运行隔离 dry-run，不会连接或上传到真实平台。

## 软件包管理器与语言

部署脚本支持 pnpm 与 npm。交互式菜单、`--lang` 或 `DEPLOY_LANG` 可切换英文与繁体中文控制台消息；这不会改变网站内容语言或部署目标。

```bash
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
pnpm deploy:switch --mode=direct:cf --lang=en --dry-run
```

## 构建输出

直接部署会先执行 package `build`，再部署 `dist/`。Cloudflare 与 VPS 可以使用 `--dist=<dir>` 指定其他输出目录。构建脚本会先清理旧 `.astro` 与 `dist`，防止旧文章缓存混入新输出。

## 安全升级 Astro

```bash
pnpm upgrade:astro -- --lang=zh-tw --dry-run
pnpm upgrade:astro -- --lang=zh-tw --dry-run --clean-install
```

升级助手从 `package.json` 检测 Astro 软件包，dirty 工作树默认停止，完成后执行现有 check、lint、build。`--clean-install` 不会删除 lockfile。

## 非部署脚本

- `analysis.mjs`：完整项目检查，覆盖代码、CSS、SEO、安全、隐私、内容来源、部署与文档。
- `clean-generated.mjs`：只清理项目根目录的 `.astro` 与 `dist`，防止旧内容缓存进入新构建。
- `run-e2e.mjs`：启动本地 preview 并运行 Playwright，输出放到系统临时目录。

## VPS 权限

VPS 上传使用 `.env.vps` 中的 `VPS_USER`。非 root 用户无法写入 `/var/www/...` 时，可上传到 `/home/<user>/site-dist`，再由服务器端部署流程同步到 web root。不要为了方便而开放过宽目录权限。

## Git Ignore 要求

`.gitignore` 应排除：

```text
.env*
!.env.example
!.env.*.example
.npmrc
.yarnrc
.pnpmrc
.ssh/
*.pem
*.key
id_rsa
id_ed25519
dist/
.astro/
node_modules/
.wrangler/
.vercel/
playwright-report/
test-results/
```

新增部署平台或环境文件名时，必须同时更新 `.gitignore`、对应 `.example` 文件、自检与本文档。
