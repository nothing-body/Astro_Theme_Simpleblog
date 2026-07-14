---
title: '恭喜，SimpleBlog 已搭建成功'
description: '你的 Astro 多语言博客已经成功构建，接下来可以安全地完成网站配置、文章编写、自检与部署。'
pubDate: 2026-07-14
category: '教程'
categoryPath: ['教程', '开始使用']
tags: ['Astro', '网站配置']
author: 'SimpleBlog'
pinned: true
pinOrder: 1
---

恭喜你。如果你能在新网站看到这篇文章，说明 Astro 构建、内容集合、多语言路由与文章页面都已正常工作。

## 建议接着完成

1. 将 `.env.example` 复制为 `.env`，填写真实的公开网址与联系邮箱。
2. 将示例网站名称、作者、描述与书签替换为你愿意公开的信息。
3. 有翻译版本时，在 `src/content/blog/en/`、`zh-tw/`、`zh-cn/` 使用相同文件名创建文章。
4. 每次发布前运行 `pnpm selfcheck`。
5. 准备上线时使用 `pnpm deploy:menu`，或经过审查的 CI 工作流。

完整 frontmatter、文章置顶、多语言内容、配置文件与自动部署示例请阅读 `MARKDOWN_GUIDE.zh-CN.md`。公开 GitHub 仓库中不要放入真实 `.env`、API token、私钥、私人文章或个人图片。

模板已经准备完成，下一篇文章就交给你了。
