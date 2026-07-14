# SimpleBlog

使用 Astro 构建的多语言静态博客模板，支持 Markdown/MDX 文章、SEO metadata、外部链接提示页、部署辅助脚本与完整项目自检。

<p align="center">
  <a href="https://blog.gkbb.de/">Live Demo</a>
  &middot;
  <a href="./README.md">English README</a>
  &middot;
  <a href="./README.zh-TW.md">繁体中文 README</a>
</p>

## 目录结构

英文是默认语言，路径为 `/`。繁体中文使用 `/zh-tw/`，简体中文使用 `/zh-cn/`。

```text
src/content/blog/en/       英文文章
src/content/blog/zh-tw/    繁体中文文章
src/content/blog/zh-cn/    简体中文文章
src/pages/                 英文与共用路由
src/pages/zh-tw/           繁体中文路由
src/pages/zh-cn/           简体中文路由
src/components/            共用 Astro 组件
src/i18n/                  界面翻译与语言路由
scripts/                   分析、测试与部署脚本
tests/                     单元与端到端测试
```

## 教学文件

- Markdown：[英文](./MARKDOWN_GUIDE.en.md) · [繁体中文](./MARKDOWN_GUIDE.zh-TW.md) · [简体中文](./MARKDOWN_GUIDE.zh-CN.md)
- 书签：[英文](./BOOKMARKS_GUIDE.en.md) · [繁体中文](./BOOKMARKS_GUIDE.zh-TW.md) · [简体中文](./BOOKMARKS_GUIDE.zh-CN.md)
- 部署：[英文](./DEPLOYMENT.en.md) · [繁体中文](./DEPLOYMENT.zh-TW.md) · [简体中文](./DEPLOYMENT.zh-CN.md)
- 脚本：[英文](./scripts/README.en.md) · [繁体中文](./scripts/README.zh-TW.md) · [简体中文](./scripts/README.zh-CN.md)

## 内容写作与置顶

三语文章应使用相同文件名 slug。Frontmatter 示例：

```yaml
title: 文章标题
description: 用于搜索引擎与文章卡片的摘要
pubDate: 2026-01-01
updatedDate: 2026-07-14
categoryPath:
  - 网站
  - Astro
tags:
  - Astro
pinned: true
pinOrder: 1
draft: false
```

`pinned: true` 表示置顶；较小的 `pinOrder` 排在前面。未完成文章设置 `draft: true`。

## 环境与隐私

从 `.env.example`、`.env.cloudflare.example`、`.env.vercel.example`、`.env.vps.example` 创建本地配置。不要提交真实 `.env`、API token、私钥、账户 ID、站点验证文件、Analytics ID、私人文章或非公开图片。

公开模板保留 `https://example.com`、`contact@example.com` 等示例值。实际部署时在本地 `.env` 或托管平台 secret 中设置真实值。

构建前至少设置：

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

实际搭建时替换前两个值；不使用 GA4 时保持空值。

## 常用命令

```bash
pnpm install
pnpm dev
pnpm build
pnpm selfcheck -- --quick
pnpm analyze
```

部署命令：

```bash
pnpm deploy:menu
pnpm deploy:switch -- --mode=direct:cf
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
```

公开发布前执行完整分析，并检查 Git 状态中没有真实域名、token、私钥、验证文件、私人文章或图片。
