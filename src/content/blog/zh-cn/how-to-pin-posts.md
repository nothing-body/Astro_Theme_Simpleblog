---
title: '如何置顶文章'
description: '说明如何在这个 Astro 静态博客中使用 pinned 与 pinOrder 置顶一篇或多篇文章。'
pubDate: 2026-05-24
category: '网站'
tags: ['Astro', '置顶文章', '网站设置']
author: 'Tena'
pinned: true
pinOrder: 1
---

公开版 GitHub 仓库：[nothing-body/Astro_Theme_Simpleblog](https://github.com/nothing-body/Astro_Theme_Simpleblog)。

这篇文章本身就是一篇置顶文章示例。

在文章 frontmatter 加上 `pinned: true`，文章就会优先显示在首页、所有文章、分页、分类页与标签页的列表最前面。这个排序在静态构建时完成，不需要数据库、登录系统或前端写入功能，因此不会增加额外攻击面。

## 单篇文章置顶

```yaml
---
title: '文章标题'
pubDate: 2026-05-24
pinned: true
pinOrder: 1
---
```

`pinned: true` 代表这篇文章会被视为置顶文章。

`pinOrder` 用来控制多篇置顶文章之间的顺序，数字越小越靠前。

## 多篇文章置顶

如果有多篇文章都设置 `pinned: true`，可以用不同的 `pinOrder` 排序：

```yaml
pinned: true
pinOrder: 1
```

```yaml
pinned: true
pinOrder: 2
```

置顶文章会先依 `pinOrder` 排序；普通文章仍依发布日期由新到旧排序。

## 取消置顶

把 `pinned` 改成 `false`，或直接删除 `pinned` 与 `pinOrder` 即可。

```yaml
pinned: false
```

## 维护注意事项

`pinOrder` 建议使用简单整数，例如 `1`、`2`、`3`。不要把它当成日期、权重公式或复杂设置。

这个功能只读取文章 frontmatter，不执行文章内的任意代码，也不接收访客输入。新增或修改置顶文章后，重新执行构建并部署 `dist` 即可更新网站。
