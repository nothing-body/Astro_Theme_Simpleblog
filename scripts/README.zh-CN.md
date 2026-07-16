# 脚本说明

所有操作脚本都使用 TypeScript，支持 Windows、macOS、Linux。优先使用 pnpm，找不到 pnpm 时自动使用 npm；外部命令以参数数组执行，不拼接危险 shell 字符串。

## 部署入口

- `deploy_menu.ts`：英文、繁中、简中交互菜单。
- `deploy_switch.ts`：非交互式部署目标与 Git 平台切换。
- `deploy_lib.ts`：验证模式、参数、remote 和 branch。
- `deploy_i18n.ts`：三语言控制台文本。
- `deploy_runtime.ts`：Node 与 pnpm/npm 检测，支持 Windows `.cmd`。
- `deploy_env.ts`：所有目标共用的严格 `.env*` 解析器。
- `deploy_safety.ts`：`.gitignore`、输出路径和敏感文件检查。

## 直接部署器

- `uploaddist_cf.ts`：通过 Wrangler 部署 Cloudflare Pages。
- `uploaddist_vercel.ts`：Vercel REST 流式上传，不依赖 Vercel CLI。
- `uploaddist_netlify.ts`：用有界流创建 ZIP 并调用 Netlify REST API。
- `uploaddist_vps.ts`：rsync／OpenSSH scp 暂存上传与原子切换。
- `uploaddist_vps_docker.ts`：部署非 root Nginx Compose Bundle。
- `uploaddist_supabase.ts`：部署 `supabase/functions/<名称>/index.ts`。

Supabase Edge Functions 是后端函数，不是静态网站主机。

## 环境文件

```text
.env
.env.cloudflare
.env.vercel
.env.netlify
.env.supabase
.env.vps
.env.vps-docker
```

请从同名 `.example` 复制。`--env` 只接受项目根目录 `.env`／`.env.*`，拒绝路径穿越和 symbolic link。

## 命令

```bash
pnpm deploy:menu
pnpm deploy:switch -- --mode=direct:cf --dry-run --yes
pnpm deploy:cf:only
pnpm deploy:vercel:only
pnpm deploy:netlify:only
pnpm deploy:vps:only
pnpm deploy:vps-docker:only
pnpm deploy:supabase:only
pnpm deploy:all
pnpm deploy:all:static
pnpm deploy:all:including-functions
```

- `deploy:all`：Cloudflare + VPS + Vercel。
- `deploy:all:static`：Cloudflare + VPS + VPS Docker + Vercel + Netlify。
- `deploy:all:including-functions`：全部静态目标 + Supabase Edge Functions。

`--dry-run` 只显示计划，不构建或上传；`--yes` 只跳过 switch 确认；`--skip-clean` 只保留输出目录后重新构建，不会跳过 build。所有模式与参数请参阅 [DEPLOYMENT.zh-CN.md](../DEPLOYMENT.zh-CN.md)。

```bash
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
pnpm deploy:menu -- --lang=zh-cn
```

npm 传参时保留 `--`：

```bash
npm run deploy:switch -- --mode=direct:cf --dry-run --yes
```

## 自检

- `analysis.ts`：源码、文章、图片、依赖、构建输出、部署 dry-run、E2E。
- `audit-security.ts`：把已安装包和版本发送到 OSV 查询已知漏洞。
- `checks/source.ts`：危险语法、TypeScript 策略、安全响应头、秘密和公开／私人边界。
- `checks/content.ts`：frontmatter、多语言文章、分类、路由、链接和 raw HTML。
- `checks/images.ts`：格式、尺寸、像素和文件大小。
- `checks/output.ts`：canonical、hreflang、sitemap、CSP、内联代码、图片和坏链接。
- `run-e2e.ts`：可以使用本机 ungoogled-chromium。

```bash
pnpm selfcheck -- --explain
pnpm selfcheck -- --quick
pnpm analyze
```

各规则分类、严重程度和错误示例请参阅 [SELF_CHECK_GUIDE.zh-CN.md](../SELF_CHECK_GUIDE.zh-CN.md)。

## 安全重点

- Vercel、Netlify API 响应有大小限制。
- Netlify ZIP 和 Vercel 文件采用流式处理，降低内存峰值。
- SSH key 必须是普通文件；Unix 权限不得允许 group／others 读取。
- 建议配置 `VPS_KNOWN_HOSTS_FILE`。
- VPS Docker 默认只绑定 loopback；公开绑定必须明确允许。
- 真实 env、平台状态、私钥、报告和构建输出均由 `.gitignore` 排除。
