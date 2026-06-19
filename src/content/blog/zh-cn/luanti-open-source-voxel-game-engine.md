---
title: 'Luanti 介绍：开源体素游戏创作平台'
pubDate: 2026-06-18
description: '整理 Luanti 官方网站与文件中可确认的信息，介绍这个 formerly Minetest 的开源体素游戏引擎、特色、下载方式与使用前注意事项。'
category: '软件'
tags: ['Luanti', 'Minetest', 'Open Source', 'Game Engine', 'Voxel']
---

> 查询日期：2026-06-18。本文只整理 Luanti 官方网站、官方文档、官方 GitHub 与官方博客可确认的信息；版本与下载方式可能会变动，请以下载页为准。

[Luanti](https://www.luanti.org/en/) 是一个开源的体素游戏创作平台，原名 Minetest。官方首页把它描述为可以游玩多种游戏、单人或多人同乐、修改游戏，甚至自行制作游戏的平台。它不是单一游戏，而是可承载不同游戏、mods 与材质包的引擎与内容生态。

## 目前版本与支持平台

Luanti 官方首页在查询时显示的最新消息是 **5.16.1 released**，日期为 **2026-05-10**。下载页也列出 Windows 与 macOS 的 5.16.1 下载项目。

官方首页列出支持平台：

- Windows
- macOS
- GNU/Linux
- BSDs
- Android

下载页补充，Windows 官方支持 Windows 8、8.1、10、11；Android 建议使用 Android 6 或更新版本；macOS 建议使用 12.3 或更新版本。

## Luanti 和 Minetest 的关系

Luanti 的前身是 Minetest。官方博客在 2024-10-13 发布改名文章，说明 Minetest 已从早期的 Minecraft 类型实验，逐步演变成一个游戏平台。新名称 Luanti 来自 Lua 与芬兰语 `luonti`，后者意思是 creation / 创作。

官方也提醒，旧名称仍可能出现在某些地方，例如 Minetest Game 这个保留历史脉络的内容；对开发者而言，Lua API 的 `minetest` 命名空间仍会作为兼容 alias 保留，官方建议使用 `core` 命名空间。

## 主要特色

### 多种游戏与内容

Luanti 启动后可以安装不同游戏。官方 Getting Started 文档说明，第一次打开 Luanti 时会要求安装一个 game，按钮会导向内容浏览器；你也可以在浏览器中查看 [ContentDB](https://content.luanti.org/) 上的游戏。

Luanti 不是“只有一个玩法”的游戏。官方文档说明，多数游戏偏向建造、挖掘与创造力导向的 sandbox 玩法，但不是所有游戏都一定如此。

### Mods 与材质包

Luanti 的 mods 是内容生态的核心。官方文档说明，mods 可以改变游戏玩法，甚至 game 本身也是由 mods 组成。若加入多人服务器，服务器端 mods 会自动提供给 client，不需要玩家另外手动安装。

官方首页也写到 ContentDB 上有超过 3000 个开源 mods，可供使用、改作或学习。

### 超大地图

官方首页列出 Luanti 地图大小为 **62,000 x 62,000 x 62,000 blocks**，玩家可以向下挖 31,000 blocks 或向上建造 31,000 blocks。

### 多人游戏

Luanti 支持单人、本机与在线多人。官方 Getting Started 文档说明，可以在 Join game 分页加入多人服务器；若服务器不在列表中，也可以手动输入地址与 port。

### 开发与开源

Luanti 的官方 GitHub README 说明它是 free open-source voxel game engine，使用 C++ 处理核心与性能相关部分，并以 Lua 进行可扩展的游戏与 mod 开发。官方 GitHub 页面也列出项目主要语言包含 C++ 与 Lua。

## 如何下载

官方下载页提供：

- Windows installer 与 portable 版本
- Android 版本，可通过 Google Play、F-Droid 或 APK
- Linux Flatpak、Snap、PPA、各发行版包或源码编译
- macOS signed app、Homebrew 与 MacPorts
- FreeBSD、OpenBSD、NetBSD 包或 ports/pkgsrc
- GitHub 上的 stable / development source code

下载页特别提醒，Android 用户不建议使用 Play Store 上常见的非官方 builds，因为它们可能包含过多广告、spyware，或以 proprietary terms 发布。

## 使用前注意事项

1. Luanti 是平台 / 引擎，不是只有一个官方游戏；第一次启动时需要选择或安装 game。
2. 如果你是从 Minetest 时代回来的老用户，部分路径、配置文件与旧文档仍可能看到 `minetest` 名称，这不一定代表信息错误。
3. 多人服务器通常会自动传送需要的服务器端 mods，但每个服务器规则、账号、内容与管理方式都不同。
4. Android 版应优先使用官方下载页列出的 Google Play、F-Droid 或官方 APK 来源。
5. Linux 发行版仓库中的包可能落后；官方下载页建议太旧时可考虑 Flatpak 或自行编译。
6. 自己架服务器时要注意备份、port、服务器规则、mods 兼容性与资源使用量。

## 适合谁

Luanti 适合想玩开源体素游戏、喜欢 mods、想自己架服务器，或想用 Lua 做游戏内容的人。玩家可以把它当成多游戏平台；创作者则可以把它当成一个不用自己处理体素渲染与网络底层的开源引擎。

如果你期待的是“安装后立刻进入单一官方大型游戏”，Luanti 的使用方式可能和你想象不同。它更像是一个入口：先安装引擎，再选 game、mods、材质包或服务器。

## 官方来源

- [Luanti 官方首页](https://www.luanti.org/en/)
- [Luanti Downloads](https://www.luanti.org/en/downloads/)
- [Luanti Getting Started](https://docs.luanti.org/for-players/getting-started/)
- [Luanti GitHub](https://github.com/luanti-org/luanti)
- [Introducing Our New Name](https://blog.luanti.org/2024/10/13/Introducing-Our-New-Name/)
- [ContentDB](https://content.luanti.org/)
