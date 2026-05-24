---
title: 开始使用这个 Astro 博客
description: 这是一篇安全的示例文章，让公开版项目下载后可以立即 build、预览与部署。
pubDate: 2026-01-01
updatedDate: 2026-01-01
category: 指南
tags:
  - Astro
  - 模板
  - 部署
author: Astro Blog Template
draft: false
---

欢迎使用这个 Astro 博客模板。

公开版保留一篇正式示例文章，让首页、所有文章、分类、标签、sitemap 与部署脚本在刚下载时就能正常运行。

## 建议先修改的地方

1. 在环境文件设置 `PUBLIC_SITE_URL`。
2. 将这篇文章替换成你自己的内容。
3. 检查 `src/i18n/ui.ts` 的网站文字。
4. 正式部署前检查 `public/_headers`。

## 部署

可以使用双语部署菜单：

```bash
pnpm deploy:menu
npm run deploy:menu
```

直接部署脚本会先 build 网站，再上传生成后的输出目录。
