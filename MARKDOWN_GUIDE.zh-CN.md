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
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

真实的公开网址与联系邮箱只放在 `.env`，不要提交 `.env`。

## 2. 重要文件

| 文件或目录 | 用途 |
| --- | --- |
| `src/content/blog/en/` | 英文文章 |
| `src/content/blog/zh-tw/` | 繁体中文文章 |
| `src/content/blog/zh-cn/` | 简体中文文章 |
| `src/content.config.ts` | frontmatter schema 与验证规则 |
| `src/lib/site.ts` | 网站名称、默认作者、描述与 URL helper |
| `src/i18n/ui.ts` | 三语言界面文字 |
| `src/components/BookmarkLinks.astro` | 默认书签分类与链接 |
| `public/_headers` | Cloudflare 安全与缓存响应头 |
| `vercel.json` | Vercel 安全与缓存响应头 |
| `deploy/nginx-security-headers.conf` | VPS 使用 Nginx 时的安全响应头 include 文件 |
| `public/_redirects` | 静态重定向 |
| `astro.config.ts` | Astro、Markdown、sitemap、SEO 与构建整合 |
| `.env.example` | 公开网站设置模板 |
| `.env.cloudflare.example` | Cloudflare 部署模板 |
| `.env.vps.example` | VPS 部署模板 |
| `.env.vercel.example` | Vercel 部署模板 |
| `.github/workflows/deploy.yml` | GitHub Actions 部署 |
| `.gitlab-ci.yml` | GitLab CI 部署 |
| `.woodpecker.yml` | Woodpecker/Codeberg 部署 |
| `scripts/analysis.ts` | 全项目自检 |

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

- 优先使用标准 Markdown 链接，不要随意加入 raw HTML。
- 外部 HTTP/HTTPS 链接会经过对应语言的离站提醒页。
- 不要把 script、API key、token、私人 hostname、内网 IP 或个人文件路径写进文章。
- 文章统一使用 `.md`，不支持可执行的 import、export、JSX 或嵌入式 script；需要共用排版功能时，应添加到经过审查的共用 layout 或 Markdown processor。
- 公开资源放在 `public/`；不要把私人照片或私人站图片目录复制到公开模板。

## 7. 网站定制设置

1. 在 `src/lib/site.ts` 修改公开网站名称、作者与默认描述。
2. 在 `src/i18n/ui.ts` 同步修改三语言欢迎文字。
3. 逐一检查三个语言的关于、联系、隐私与免责声明页面。
4. 修改 `src/components/BookmarkLinks.astro`，删除不想推荐的链接。
5. 真实网址与联系邮箱放进 `.env`，不要写进已提交的示例。
6. 公开教程中的 `example.com`、`203.0.113.10` 与 placeholder token 应保留为示例。

## 8. 自动部署脚本

先安全预览部署命令：

```bash
pnpm deploy:switch --mode=direct:cf --dry-run
pnpm deploy:switch --mode=direct:cf+vps+vercel --dry-run
```

交互式菜单：

```bash
pnpm deploy:menu
```

直接部署：

```bash
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

部署脚本会先执行项目的 `check` 与 `build` 命令，通过后才上传生成结果。Process/CI 注入的环境变量优先于本地 env 文件，防止过期的本地值静默覆盖 CI secret。

机密应设置在 Git 平台，不可写入 YAML：

- Cloudflare：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_PAGES_PROJECT_NAME`。
- VPS：`VPS_HOST`、`VPS_USER`、`VPS_PORT`、`VPS_TARGET_DIR`、SSH 私钥 secret。
- Vercel：`VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`。
- 共用公开设置：`PUBLIC_SITE_URL`、`PUBLIC_CONTACT_EMAIL`，以及可选的 `PUBLIC_GA4_ID`。

## 9. 发布前验证

```bash
pnpm check
pnpm lint
pnpm lint:css
pnpm selfcheck
```

完整自检会执行类型、lint、测试、干净生产构建、Astro dev 启动、部署 dry-run、安全扫描、内容来源核对、SEO、sitemap/hreflang、landmark 与敏感文件检查。

生产构建会先清除 `.astro` 与 `dist`，防止已删除或私人的文章残留在旧缓存中。

推送到公开仓库前，再搜索一次真实域名、邮箱、token、Account ID、私钥、验证文件、私人文章标题与图片文件名。
