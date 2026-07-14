# 部署前须知

本文说明如何准备、检查、升级与部署这个 Astro 博客项目。部署脚本会先执行项目的 `build` script，再上传生成的 `dist/`。

## 1. 基本要求

检查版本：

```bash
node --version
pnpm --version
npm --version
```

建议使用 Node.js 22.12.0 或更新版本。项目优先使用 pnpm，也支持 npm。

尚未安装 pnpm 时：

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## 2. 配置文件与隐私

项目根目录使用以下文件：

```text
.env.example                 可提交的公共设置示例
.env.cloudflare.example      可提交的 Cloudflare 示例
.env.vps.example             可提交的 VPS 示例
.env.vercel.example          可提交的 Vercel 示例
.env                         本地网站设置，不提交
.env.cloudflare              Cloudflare 部署设置，不提交
.env.vps                     VPS 部署设置，不提交
.env.vercel                  Vercel 部署设置，不提交
.gitignore                   排除凭据、构建输出、本地状态与报告
```

从示例复制本地文件：

```bash
cp .env.example .env
cp .env.cloudflare.example .env.cloudflare
cp .env.vps.example .env.vps
cp .env.vercel.example .env.vercel
```

只提交 `.example` 文件。不要提交真实 token、私钥、Account ID、SSH passphrase、provider project ID 或网站验证文件。

`.gitignore` 至少应覆盖：

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

## 3. 安装、检查与构建

pnpm：

```bash
pnpm install
pnpm check
pnpm lint
pnpm build
```

npm：

```bash
npm install
npm run check
npm run lint
npm run build
```

`build` 会先清理旧 `.astro` 与 `dist/`，再生成新的部署文件，防止旧内容缓存混入公开构建。

## 4. 网站 URL 与 SEO

在 `.env` 或部署环境设置正式网址：

```env
PUBLIC_SITE_URL=https://example.com
```

该值用于 sitemap、canonical URL、hreflang 与 structured data。公开模板保留 `https://example.com` 示例，实际搭建后再改为自己的域名。

联系邮箱使用：

```env
PUBLIC_CONTACT_EMAIL=contact@example.com
```

## 5. Google Search Console

若使用 HTML 文件验证，将 Search Console 提供的文件放入 `public/`：

```text
public/googlexxxxxxxxxxxxxxxx.html
```

部署后确认对应 URL 可以打开。公开模板不应提交站点所有者的真实验证文件；每位使用者应在自己的部署环境添加。

## 6. Google Analytics

GA4 设置：

```env
PUBLIC_GA4_ID=G-XXXXXXXXXX
```

只有 ID 格式正确且访客允许 analytics cookie 时才会加载。公开模板可留空。

## 7. Cloudflare Pages

创建 `.env.cloudflare`：

```bash
cp .env.cloudflare.example .env.cloudflare
```

典型内容：

```env
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_PAGES_PROJECT_NAME=your-pages-project-name
PUBLIC_SITE_URL=https://example.com
```

- API token：Cloudflare Dashboard > My Profile > API Tokens > Create Token
- 权限：目标账户的 Cloudflare Pages edit 权限
- Account ID：Cloudflare 账户页面右侧信息栏
- Pages project name：Cloudflare Pages 项目名称

部署：

```bash
pnpm deploy:cf:only
```

## 8. VPS

创建 `.env.vps`：

```bash
cp .env.vps.example .env.vps
```

典型内容：

```env
VPS_HOST=203.0.113.10
VPS_PORT=22
VPS_USER=deploy
VPS_TARGET_DIR=/var/www/example.com
VPS_SSH_KEY_PATH=~/.ssh/id_ed25519
VPS_SSH_PASSPHRASE=your_private_key_passphrase
```

- 优先使用 SSH key 与 `ssh-agent`。
- `VPS_TARGET_DIR` 必须是部署账户可写入的目录。
- passphrase 只能放在未提交的 `.env.vps` 或 CI secret。
- 不要把私钥复制进项目目录。

部署：

```bash
pnpm deploy:vps:only
```

## 9. Vercel

创建 `.env.vercel`：

```bash
cp .env.vercel.example .env.vercel
```

典型内容：

```env
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_or_user_id
VERCEL_PROJECT_ID=your_project_id
```

`VERCEL_TOKEN` 从 Vercel Account Settings > Tokens 获取；执行 `vercel link` 后，可从 `.vercel/project.json` 读取 Org ID 与 Project ID。`.vercel/` 默认不提交。

部署：

```bash
pnpm deploy:vercel:only
```

## 10. 部署命令与 dry-run

交互式菜单目前提供英文与繁体中文输出：

```bash
pnpm deploy:menu
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
```

直接部署：

```bash
pnpm deploy:switch -- --mode=direct:cf
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:cf:vps
pnpm deploy:cf:vercel
pnpm deploy:vps:vercel
pnpm deploy:all
```

部署前先执行隔离 dry-run 与完整检查。自检会以占位环境变量测试部署分支，不会实际上传：

```bash
pnpm selfcheck -- --quick
pnpm analyze
```

## 11. 自检范围

完整自检包括：

- Astro 类型检查、ESLint、Stylelint、单元测试与 E2E。
- 干净构建、来源文章与构建文章数量核对。
- 三语路由、hreflang、sitemap、canonical 与 robots.txt。
- CSP、安全标头、危险语法、原始 HTML、外部链接与隐私设置。
- `.gitignore`、可疑密钥格式、部署脚本语法与隔离 dry-run。
- 死组件、未使用的 library export、CSS 重复与 flex 布局冲突。

## 12. 书签与外部链接

书签组件位于：

```text
src/components/BookmarkLinks.astro
```

请参阅[简体中文书签指南](./BOOKMARKS_GUIDE.zh-CN.md)。Markdown 中指向外部 origin 的 HTTP/HTTPS 链接会在构建时改写为对应语言的离站提示页：

```text
/leaving
/zh-tw/leaving
/zh-cn/leaving
```

修改相关逻辑后，执行 `pnpm build` 并检查 `dist/` 中的链接。

## 13. GitHub、GitLab、Codeberg CI/CD

Git 提供商模式只推送源代码，构建与部署由 CI/CD 执行。项目已提供：

- GitHub：`.github/workflows/deploy.yml`
- GitLab：`.gitlab-ci.yml`
- Codeberg/Woodpecker：`.woodpecker.yml`

必须在所选平台设置 `PUBLIC_SITE_URL`、`PUBLIC_CONTACT_EMAIL`，以及部署目标需要的 Cloudflare、VPS、Vercel token、账户 ID 和 SSH key。不要把真实值直接写入 CI YAML。

## 14. 脚本职责

- `deploy_menu.mjs`：交互式部署菜单。
- `deploy_switch.mjs`：命令行部署模式切换器。
- `deploy_i18n.mjs`：英文与繁体中文控制台消息。
- `deploy_lib.mjs`：部署模式、组合与命令生成。
- `deploy_runtime.mjs`：Node.js、pnpm、npm 与跨平台 runner 检测。
- `deploy_safety.mjs`：部署前 `.gitignore` 与敏感文件检查。
- `uploaddist_cf.mjs`、`uploaddist_vps.mjs`、`uploaddist_vercel.mjs`：各平台部署。
- `upgrade_astro.mjs`：Astro 软件包安全升级。
- `analysis.mjs`、`run-e2e.mjs`：全局分析与浏览器测试。

## 15. 安全升级 Astro

先使用 dry-run：

```bash
pnpm upgrade:astro -- --lang=zh-tw --dry-run
pnpm upgrade:astro -- --lang=zh-tw --dry-run --clean-install
```

确认后再执行真实升级。脚本默认拒绝在 dirty Git 工作树升级；只有明确理解风险时才使用 `--allow-dirty`。`--clean-install` 只删除可重建的 `node_modules`、`.astro`、`dist`，不会删除 lockfile。升级后会执行现有 check、lint、build scripts。

## 16. 敏感文件

不要提交任何真实 `.env*`、`.dev.vars*`、`.npmrc`、`.pnpmrc`、`.ssh/`、私钥、证书、kubeconfig、service-account 或 credentials JSON。`.gitignore` 默认忽略所有 `.env*`，只允许 `.env.example` 与 `.env.*.example`。
