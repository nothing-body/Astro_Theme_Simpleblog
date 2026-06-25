---
title: 开始使用这个 Astro 博客
description: 依照当前新版架构整理的 Astro 多语言博客入门说明，涵盖内容目录、离站提示页、环境设置与部署检查。
pubDate: 2026-01-01
updatedDate: 2026-06-19
category: 指南
tags:
  - Astro
  - 模板
  - 部署
author: Astro Blog Template
draft: true
---

这是一个静态输出的 Astro 多语言博客模板，支持英文、繁体中文与简体中文路由。它可以作为个人博客、公开模板，或可直接部署的静态网站基础。

## 项目结构

- `src/content/blog/en/` 存放英文文章。
- `src/content/blog/zh-tw/` 存放繁体中文文章。
- `src/content/blog/zh-cn/` 存放简体中文文章。
- `src/pages/`、`src/pages/zh-tw/`、`src/pages/zh-cn/` 对应三个语言的页面路由。
- `src/components/` 存放共享 UI，例如导航栏、分页、文章卡片、侧边栏、Cookie 设置与离站提示页。
- `src/i18n/ui.ts` 存放三个语言共用的界面文字。

翻译文章时，建议三个语言使用相同 slug。例如 `getting-started.md` 会生成 `/posts/getting-started`、`/zh-tw/posts/getting-started`、`/zh-cn/posts/getting-started`。

## 撰写文章

每篇文章使用 frontmatter 设置基本信息：

```yaml
title: 文章标题
description: 给 SEO 与文章卡片使用的简短摘要
pubDate: 2026-01-01
updatedDate: 2026-06-19
category: 指南
tags:
  - Astro
draft: true
```

设置 `draft: true` 可以让文章不进入生成后的网站。若要置顶文章，可以加上 `pinned: true`，它会在首页、文章列表、分类页与标签页优先显示。

## 外部链接

Markdown 与 MDX 里的外部 `http`、`https` 链接会在 build 阶段改写到本站的离站提示页：

- 英文：`/leaving?to=...`
- 繁体中文：`/zh-tw/leaving?to=...`
- 简体中文：`/zh-cn/leaving?to=...`

离站提示页不会自动跳转，会先显示目标网址，让访客手动确认是否继续前往外部网站。

## 环境设置与隐私

`.env.example`、`.env.cloudflare.example`、`.env.vercel.example`、`.env.vps.example` 是示例文件。不要提交真实 `.env`、API token、私钥、供应商账号 ID 或站长验证文件。

如果要同步到公开模板，项目名称、域名、Analytics ID、联系邮箱与部署目标应保持通用，除非那些信息本来就要公开。

## Build 与部署

开发时常用命令：

```bash
pnpm install
pnpm dev
pnpm build
```

项目也提供 Cloudflare Pages、VPS 上传与 Vercel 的部署辅助：

```bash
pnpm deploy:menu
pnpm deploy:switch -- --mode=direct:cf
```

发布公开版前，建议先跑 `pnpm build`，检查生成后的页面，并扫描是否有真实域名、token、私钥或验证文件等不该公开的信息。
