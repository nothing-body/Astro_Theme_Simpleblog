---
title: 'Luanti: An Open Source Voxel Game Creation Platform'
pubDate: 2026-06-18
description: 'A factual introduction to Luanti, formerly Minetest, based on the official website, documentation, GitHub repository, and rename announcement.'
category: 'Software'
tags: ['Luanti', 'Minetest', 'Open Source', 'Game Engine', 'Voxel']
---

> Checked on 2026-06-18. This article only summarizes information confirmed from Luanti's official website, documentation, GitHub repository, and official blog. Versions and download options may change; always check the downloads page first.

[Luanti](https://www.luanti.org/en/) is an open source voxel game creation platform, formerly known as Minetest. The official homepage describes it as a platform where you can play many games alone or together, mod games, or make your own. In other words, Luanti is not just one game; it is an engine and content ecosystem for games, mods, and texture packs.

## Current Version and Supported Platforms

The Luanti homepage showed **5.16.1 released** as the latest news when checked, dated **2026-05-10**. The downloads page also listed 5.16.1 builds for Windows and macOS.

The homepage lists these supported platforms:

- Windows
- macOS
- GNU/Linux
- BSDs
- Android

The downloads page adds more detail: Windows 8, 8.1, 10, and 11 are officially supported; Android 6 or later is recommended; macOS 12.3 or later is recommended.

## Luanti and Minetest

Luanti was formerly Minetest. The official rename announcement, published on 2024-10-13, explains that Minetest evolved from an early Minecraft-inspired experiment into a game platform. The name Luanti combines Lua with the Finnish word `luonti`, meaning creation.

The old name may still appear in some places, such as Minetest Game, which remains part of the project's history. For developers, the `minetest` Lua namespace remains as a compatibility alias, while the official namespace to use is `core`.

## Main Features

### Multiple Games and Content

Luanti asks new users to install a game when first launched. The official Getting Started guide says the button opens the content browser, and games can also be browsed through [ContentDB](https://content.luanti.org/).

Luanti is not limited to one gameplay style. The documentation says most games focus on sandbox gameplay such as building, mining, and creativity, but not all games have to follow that pattern.

### Mods and Texture Packs

Mods are central to Luanti. The official documentation says mods can change gameplay, and games themselves consist of mods. When joining multiplayer servers, server-side mods are handled automatically, so players do not need to install them manually.

The homepage also says ContentDB has over 3000 open source mods ready to use, adapt, or learn from.

### Enormous Maps

The homepage lists map dimensions of **62,000 x 62,000 x 62,000 blocks**, with players able to mine 31,000 blocks down or build 31,000 blocks up.

### Multiplayer

Luanti supports singleplayer, local multiplayer, and online servers. The Getting Started guide says online servers can be joined from the Join game tab, or by manually entering an address and port if the server is not listed.

### Development and Open Source

The official GitHub README describes Luanti as a free open source voxel game engine with easy modding and game creation. The Get Involved page explains that the engine uses C++ for housekeeping and performance-critical parts, while Lua is used for extensible content such as games and mods.

## How to Download

The official downloads page provides:

- Windows installer and portable builds
- Android through Google Play, F-Droid, or APK downloads
- Linux through Flatpak, Snap, PPA, distribution packages, or source builds
- macOS signed apps, Homebrew, and MacPorts
- FreeBSD, OpenBSD, and NetBSD package or ports/pkgsrc options
- Stable and development source code on GitHub

The downloads page specifically warns Android users not to use unofficial builds commonly found on the Play Store, because they may include excessive advertising, spyware, or proprietary distribution terms.

## Notes Before Using It

1. Luanti is a platform / engine, not a single bundled official game. New users need to choose or install a game first.
2. If you are returning from the Minetest era, some paths, settings, or older references may still use the `minetest` name.
3. Multiplayer servers usually send the required server-side mods automatically, but each server has its own rules, accounts, content, and moderation.
4. Android users should prefer the sources linked from the official downloads page.
5. Linux distribution packages may lag behind; the downloads page suggests Flatpak or building from source when packages are too old.
6. If you host a server, plan backups, ports, rules, mod compatibility, and resource usage.

## Who It Fits

Luanti fits players who want open source voxel games, modding, self-hosted servers, or a Lua-friendly platform for building game content. Players can treat it as a multi-game launcher; creators can treat it as an engine that handles voxel rendering and networking while letting them focus on gameplay.

If you expect one official flagship game immediately after installation, Luanti may feel different. It is more like an entry point: install the engine, then pick games, mods, texture packs, or servers.

## Official Sources

- [Luanti Home](https://www.luanti.org/en/)
- [Luanti Downloads](https://www.luanti.org/en/downloads/)
- [Luanti Getting Started](https://docs.luanti.org/for-players/getting-started/)
- [Luanti GitHub](https://github.com/luanti-org/luanti)
- [Introducing Our New Name](https://blog.luanti.org/2024/10/13/Introducing-Our-New-Name/)
- [ContentDB](https://content.luanti.org/)
