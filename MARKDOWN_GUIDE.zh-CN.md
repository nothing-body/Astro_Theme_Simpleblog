# SimpleBlog 内容与配置指南

本指南完整说明 Markdown 文章、多语言路由、文章置顶、项目配置、隐私、自检与自动部署。

其他语言：[English](./MARKDOWN_GUIDE.en.md) | [繁體中文](./MARKDOWN_GUIDE.zh-TW.md)

## 1. 第一次配置

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Windows PowerShell 可以使用 `Copy-Item .env.example .env`。至少设置：

本项目主要且建议使用 pnpm，因为 `package.json` 已锁定 pnpm 版本，仓库也提交 `pnpm-lock.yaml`。只有在系统无法使用 pnpm 时才改用 npm。

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=我的博客
PUBLIC_SITE_AUTHOR=你的名称
PUBLIC_SITE_DESCRIPTION=我的网站笔记、教程与文章。
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

真实的公开网址与联系邮箱只放在 `.env`，不要提交 `.env`。

## 2. 重要文件

| 文件或目录                           | 用途                                       |
| ------------------------------------ | ------------------------------------------ |
| `src/content/blog/en/`               | 英文文章                                   |
| `src/content/blog/zh-tw/`            | 繁体中文文章                               |
| `src/content/blog/zh-cn/`            | 简体中文文章                               |
| `src/content/blog/_assets/`          | 由 Astro 处理的三语文章共用图片            |
| `src/content.config.ts`              | frontmatter schema 与验证规则              |
| `src/lib/site.ts`                    | 经过验证的网站配置与 URL helper            |
| `src/i18n/ui.ts`                     | 三语言界面文字                             |
| `src/components/BookmarkLinks.astro` | 默认书签分类与链接                         |
| `public/_headers`                    | Cloudflare 安全与缓存响应头                |
| `vercel.json`                        | Vercel 安全与缓存响应头                    |
| `deploy/nginx-security-headers.conf` | VPS 使用 Nginx 时的安全响应头 include 文件 |
| `public/_redirects`                  | 静态重定向                                 |
| `astro.config.ts`                    | Astro、Markdown、sitemap、SEO 与构建整合   |
| `.env.example`                       | 公开网站设置模板                           |
| `.env.cloudflare.example`            | Cloudflare 部署模板                        |
| `.env.vercel.example`                | Vercel 部署模板                            |
| `.env.netlify.example`               | Netlify 部署模板                           |
| `.env.supabase.example`              | Supabase Edge Functions 部署模板           |
| `.env.vps.example`                   | VPS 静态部署模板                           |
| `.env.vps-docker.example`            | VPS Docker 部署模板                        |
| `.github/workflows/deploy.yml`       | GitHub Actions 部署                        |
| `.gitlab-ci.yml`                     | GitLab CI 部署                             |
| `.woodpecker.yml`                    | Woodpecker/Codeberg 部署                   |
| `scripts/analysis.ts`                | 全项目自检                                 |

只能提交 `.example` 环境模板。不可提交真实 token、密钥、Account ID、SSH passphrase、私人文章、个人图片、`dist` 或 `.astro` 缓存。

## 3. 创建文章

翻译文章使用相同文件名：

```text
src/content/blog/en/my-first-post.md
src/content/blog/zh-tw/my-first-post.md
src/content/blog/zh-cn/my-first-post.md
```

生成路由：

```text
/posts/my-first-post/
/zh-tw/posts/my-first-post/
/zh-cn/posts/my-first-post/
```

如果翻译不存在，语言切换器不会生成不存在的文章网址。

## 4. Frontmatter 完整示例

```yaml
---
title: '文章标题'
description: '用于搜索结果与文章卡片的简短摘要。'
pubDate: 2026-07-14
updatedDate: 2026-07-15
category: '教程'
categoryPath: ['教程', 'Astro']
tags: ['Astro', '网站配置']
author: '你的名称'
pinned: false
pinOrder: 1
draft: false
ogImage: 'https://example.com/images/post-cover.png'
---
```

- `title`、`description`、`pubDate` 必填；描述长度必须为 12 到 300 个字符。
- `categoryPath` 支持一到五层非空分类。
- `tags` 必须是 YAML 数组。
- `pinned`、`draft` 是布尔值，不可写成带引号的字符串。
- `pinOrder` 必须是 1 到 9999 的整数。
- `ogImage` 必须使用 `/images/...` 路径或 HTTPS 网址；没有公开图片时直接省略。
- `draft: true` 会让文章不进入公开构建结果。

## 5. 如何置顶文章

```yaml
pinned: true
pinOrder: 1
```

置顶文章排在普通文章之前，`pinOrder` 越小越靠前。请使用不重复的简单整数。取消置顶时移除两个字段，或设置 `pinned: false`。

同一篇文章的三语言翻译应使用相同 `pinOrder`，避免不同语言排序不一致。

## 6. Markdown 安全

- 使用标准 Markdown 语法；raw HTML 会在内容检查与生产构建时被拒绝。
- 外部 HTTP/HTTPS 链接会保留直接目的地，并自动加入 `noopener noreferrer`。
- 不要把 script、API key、token、私人 hostname、内网 IP 或个人文件路径写进文章。
- 文章统一使用 `.md`，不支持可执行的 import、export、JSX 或嵌入式 script；需要共用排版功能时，应添加到经过审查的共用 layout 或 Markdown processor。
- 网站图标、验证文件及刻意不处理的公开资源放在 `public/`。文章图片应放在 `src/content/blog/_assets/`；不要把私人照片复制到公开模板。

### 文章图片

图片只需存放一份到 `src/content/blog/_assets/`，三语文章分别使用有意义且符合语言的替代文字引用：

```md
![安全设置页面已启用双重验证](../_assets/security-settings.png)
```

Astro 会生成优化后的响应式图片、`srcset`、`sizes`、原始宽高、延迟加载与异步解码。如果第一张图片位于文章源文件前 12 行，会被视为可能的 LCP 图片并优先加载；其余图片保持延迟加载。

文章图片只接受 AVIF、JPEG、PNG 和 WebP。建议每张小于 512 KiB；自检会拒绝超过 2 MiB、任意一边超过 6000 像素或总像素超过 1200 万的图片。远程图片、正文中的 `/images/...`、SVG、GIF、data URL、查询字符串及跳出 `_assets` 的路径都会被拒绝。`ogImage` 是独立的社交分享元数据，仍可按照前述规则使用 `/images/...` 或 HTTPS 地址。

### 文章搜索

正式构建会在 Astro 完成后运行 Pagefind，只索引 `src/layouts/BlogPostLayout.astro` 标记的文章标题和正文。三语搜索页 `/search/`、`/zh-tw/search/`、`/zh-cn/search/` 使用标题加权的 BM25 类型排名，并提供分类和标签筛选。索引只在构建后存在，因此请用 `pnpm build` 再运行 `pnpm preview` 测试，不能只启动开发服务器。

浏览器控制器位于 `src/scripts/search.ts`，会验证搜索结果为同源网址，并使用 DOM API 和 `textContent` 创建内容；不要改成未经处理的 `innerHTML`。Pagefind 需要 CSP 中精确的 `'wasm-unsafe-eval'` 和 `worker-src 'self' blob:`。`dist/pagefind/` 是每次构建都会重建的产物，不要手动修改。

Pagefind 目前没有 `zh-cn`、`zh-tw` 的 stemming 词干分析，所以构建时重复出现的 Note 是预期信息。中文搜索与分类／标签筛选仍会正常工作，只是不会按词根扩展查询。要隐藏信息型 Note，只在 `package.json` 的 Pagefind 命令中加入 `--quiet`：

```text
pagefind --site dist --glob "**/index.html" --quiet
```

`--quiet` 仍保留警告和错误；`--silent` 只保留错误，仅在确定要隐藏警告时使用。

## 7. 网站定制设置

1. 在 `.env` 设置 `PUBLIC_SITE_NAME`、`PUBLIC_SITE_AUTHOR` 与 `PUBLIC_SITE_DESCRIPTION`，不要把个人资料硬编码到 `src/lib/site.ts`。
2. 只有要修改三语言共用界面文字时，才编辑 `src/i18n/ui.ts`。
3. 逐一检查三个语言的关于、联系、隐私与免责声明页面。
4. 修改 `src/components/BookmarkLinks.astro`，删除不想推荐的链接。
5. 真实网址与联系邮箱放进 `.env`，不要写进已提交的示例。
6. 公开教程中的 `example.com`、`203.0.113.10` 与 placeholder token 应保留为示例。

## 8. 自动部署脚本

先安全预览部署命令：

```bash
pnpm deploy:switch --mode=direct:cf --dry-run
pnpm deploy:switch --mode=direct:cf+vps+vps-docker+vercel+netlify --dry-run
```

交互式菜单：

```bash
pnpm deploy:menu
```

直接部署：

```bash
pnpm deploy:cf:only
pnpm deploy:vercel:only
pnpm deploy:netlify:only
pnpm deploy:vps:only
pnpm deploy:vps-docker:only
pnpm deploy:supabase:only
pnpm deploy:all:static
```

部署脚本会先执行项目的 `check` 与 `build` 命令，通过后才上传生成结果。Process/CI 注入的环境变量优先于本地 env 文件，防止过期的本地值静默覆盖 CI secret。

机密应设置在 Git 平台，不可写入 YAML：

- Cloudflare：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_PAGES_PROJECT_NAME`。
- Vercel：`VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`。
- Netlify：`NETLIFY_AUTH_TOKEN`、`NETLIFY_SITE_ID`。
- VPS：`VPS_HOST`、`VPS_USER`、`VPS_PORT`、`VPS_TARGET_DIR`、SSH 私钥与经过核对的 known-hosts 数据。
- VPS Docker：上述 VPS 配置，以及 `VPS_DOCKER_APP_DIR`、项目名称、绑定地址与端口。
- Supabase：`SUPABASE_ACCESS_TOKEN`、`SUPABASE_PROJECT_REF`。此目标只部署 TypeScript Edge Functions，不会托管 Astro 静态网站。
- 共用公开设置：`PUBLIC_SITE_URL`、`PUBLIC_CONTACT_EMAIL`，以及可选的 `PUBLIC_GA4_ID`。

公开版没有内置私人的 OpenPhish Runtime。[OPENPHISH_GUIDE.zh-CN.md](./OPENPHISH_GUIDE.zh-CN.md) 会逐步说明如何单独搭建，并避免提交清单数据、存储空间 ID 或秘密。

## 9. 发布前验证

```bash
pnpm check
pnpm lint
pnpm lint:css
pnpm selfcheck
```

完整自检会执行类型、lint、测试、干净生产构建、输出检查、部署 dry-run、依赖安全扫描、内容来源核对、SEO、sitemap/hreflang、浏览器行为与敏感文件检查。

生产构建会先清除 `.astro` 与 `dist`，防止已删除或私人的文章残留在旧缓存中。

推送到公开仓库前，再搜索一次真实域名、邮箱、token、Account ID、私钥、验证文件、私人文章标题与图片文件名。
