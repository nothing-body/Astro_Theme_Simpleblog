---
title: 'PurgeCSS：工作方式与安全配置方法'
pubDate: 2026-05-25
description: 'PurgeCSS 实用指南：说明它如何判断未使用 CSS、适合哪些场景，以及如何配置 content 路径与 safelist 来避免样式损坏。'
category: '网站'
tags: ['PurgeCSS', 'CSS', '前端优化']
author: 'Tena'
---

PurgeCSS 是一个构建阶段使用的工具，用来移除它判断为“未使用”的 CSS 选择器。当网站加载很大的样式表，但实际只使用其中一小部分时，它可能有帮助。需要注意的是，PurgeCSS 并不像浏览器一样理解整个应用；它主要是把 CSS 选择器拿去和源码中出现的字符串匹配。

## PurgeCSS 怎么工作

PurgeCSS 会比较两类文件：

1. 包含选择器的 CSS 文件。
2. 可能包含 class 名称的内容文件，例如 HTML、JavaScript、Astro 组件、Markdown、MDX、模板或生成后的标记。

如果某个选择器没有出现在扫描结果中，PurgeCSS 就可能把它从最终 CSS 中移除。当选择器真的没用到时，这很有效；但如果选择器是动态生成，或只会在 Markdown 渲染后出现，就可能导致样式被误删。

## 什么情况适合使用

PurgeCSS 比较适合用在引入大型 CSS 框架或旧式样式表，但实际只使用少量样式的项目。CSS 体积变小后，下载与解析成本可能降低，对慢速网络或低端设备尤其明显。

如果你的 CSS 已经是按需生成、组件化拆分，或样式范围已经很小，PurgeCSS 的收益可能有限。加入前最好先测量 CSS 体积，确认 CSS 真的造成性能瓶颈。

## 基本配置

最基本的配置通常需要两件事：content 路径与 CSS 路径。content 路径必须覆盖所有可能出现 class 名称的文件。

```js
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}',
    './public/**/*.html',
  ],
  css: ['./dist/**/*.css'],
};
```

Astro 项目如果文章内容会通过 Markdown 或 MDX 生成 HTML，就要记得把 Markdown、MDX 一起纳入扫描。若内容来自 CMS 或构建前生成，则要扫描生成后的输出，或把必要选择器加入 safelist。

## 动态 class 名称

动态 class 名称是最常见的样式损坏来源。下面这种写法有风险：

```js
const color = 'red';
element.className = `text-${color}-500`;
```

PurgeCSS 可能只看到 `text-`、`red`、`-500`，却看不到完整的 `text-red-500`。更稳妥的写法是把完整 class 名称写出来：

```js
const colorClass = color === 'red' ? 'text-red-500' : 'text-blue-500';
element.className = colorClass;
```

## 为重要选择器配置 safelist

对于运行时才生成、第三方工具注入，或 Markdown 渲染后才会出现的选择器，应该使用 safelist 保留。safelist 要精确，否则会抵消 PurgeCSS 减少 CSS 体积的效果。

```js
export default {
  content: ['./src/**/*.{astro,js,ts,md,mdx}'],
  css: ['./dist/**/*.css'],
  safelist: [
    'is-active',
    'is-visible',
    /^language-/,
    /^token/,
  ],
};
```

## 部署前一定要测试

启用 PurgeCSS 后，应该测试真正的生产构建结果，而不是只看开发服务器。请确认文章页、导航状态、分页、代码块、弹窗、表单、深浅色模式，以及第三方嵌入内容。大型网站最好搭配视觉回归测试。

PurgeCSS 可以是有用的优化工具，但它需要测量、完整的 content 清单，以及持续维护 safelist。
