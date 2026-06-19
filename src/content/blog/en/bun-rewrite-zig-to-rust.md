---
title: 'Bun: How AI Rewrote Nearly a Million Lines of Zig Into Rust in Six Days'
pubDate: 2026-05-15
description: "Bun is one of the fastest JavaScript runtimes ever built. Then its team used Claude AI to rewrite almost a million lines of Zig into Rust in roughly six days. Here's what happened, what the tradeoffs are, and what the Zig community thinks about it."
category: 'Software'
tags: ['Bun', 'Zig', 'Rust', 'JavaScript']
---

On May 8, 2026, Bun's creator **Jarred Sumner** opened a pull request with a deceptively simple title: **"Rewrite Bun in Rust."** That PR contained **6,755 commits**, touched nearly one million lines of code, and was completed in approximately six days.

It ignited one of the most intense debates in the developer community in recent memory — about AI-assisted development, language selection, and the future of systems programming.

## What Is Bun?

[Bun](https://github.com/oven-sh/bun) is a high-performance JavaScript and TypeScript runtime built by Oven, designed to be a **drop-in replacement for Node.js**. It goes further than Node by integrating a package manager (`bun install`), bundler, and test runner into a single tool — a complete JavaScript toolchain in one binary.

**Core value proposition:**

- Significantly faster startup and runtime performance than Node.js
- Native TypeScript and JSX support with zero configuration
- Node.js API compatibility for near-seamless migration
- Unified package manager, test runner, and bundler

Bun uses **JavaScriptCore** (the engine powering Safari) rather than Node.js's V8 engine — a key source of its performance edge.

In late 2025, Bun was acquired by **Anthropic**, the company behind Claude AI. This acquisition set the stage for everything that followed.

## The PR: Nearly a Million Lines Rewritten in Six Days

### What Happened

[PR #30412](https://github.com/oven-sh/bun/pull/30412), opened by Jarred Sumner on May 8, 2026, was merged the same day. The corresponding commit is [`23427dbc`](https://github.com/oven-sh/bun/commit/23427dbc12fdcff30c23a96a3d6a66d62fdc091d).

Jarred's description was brief and direct:

> It passes Bun's pre-existing test suite on all platforms (and fixes several memory leaks and flaky tests), the binary size shrinks by 3 MB - 8 MB, the benchmarks are between neutral and faster — and most importantly, **we now have compiler-assisted tools for catching & preventing memory bugs, which have costed the team an enormous amount of development & debugging time over the years.**  
> The codebase is otherwise largely the same. The same architecture, the same data structures. Bun still uses few 3rd party libraries. No async Rust.

The branch was named `claude/phase-a-port` — making it explicit that **Anthropic's Claude AI agents** drove the migration.

### The Numbers

- Approximately **960,000 lines of Zig code** ported to Rust
- **6,755 commits** across thousands of files
- Completed in approximately **6 days**
- Binary size reduced by **3–8 MB**
- All existing tests across all platforms: **passing**

## The Benefits: Why Bun Made This Move

### 1. Compiler-Enforced Memory Safety

This is the **primary reason** Jarred cited in the PR description.

Zig is explicit and performant, but it lacks a borrow checker equivalent. Over the years, Bun's Zig codebase accumulated significant **memory leak** issues that were difficult to track down. These problems weren't just performance concerns — they became stability liabilities when Bun was used as the backend for Claude Code after the Anthropic acquisition.

Rust's type system catches the majority of memory errors **at compile time**, turning bugs that would previously only surface in production into compile failures.

### 2. A More Mature Ecosystem and Toolchain

Rust's ecosystem — `cargo`, `crates.io`, IDE tooling, documentation — is dramatically more mature than Zig's. Better tooling means faster development, lower onboarding costs, and an easier path to attracting open-source contributors.

### 3. Better Compatibility With AI-Assisted Development

After the Anthropic acquisition, the Bun team moved toward an **AI-agent-first development workflow**. AI models work more effectively with Rust code — there's significantly more training data, error messages are more descriptive, and the tooling provides better context. Zig's rapidly evolving, pre-1.0 nature works against AI-assisted code generation.

### 4. Performance Maintained or Improved

Benchmarks showed the Rust version performing between neutral and faster than the Zig original — while Jarred noted there was still optimization work remaining at merge time.

## The Costs: What Critics Got Right

### 1. Over 13,000 `unsafe` Blocks — The "Vibecoded Disaster" Criticism

The most prominent criticism of the rewrite centers on one number: the AI-generated Rust code reportedly contains more than **13,000 `unsafe` blocks**.

`unsafe` in Rust is a special keyword that tells the compiler "I'll take responsibility for this section — don't enforce your usual rules." In other words, it **bypasses Rust's core memory safety guarantees**. Misused `unsafe` can actually be more dangerous than equivalent C code, because readers may assume safety guarantees that don't exist.

13,000+ unsafe blocks, in an AI-generated migration, raises serious questions about how thoroughly any human reviewed this code.

### 2. The Human Review Problem

6,755 commits cannot be meaningfully reviewed by humans in a few days. This is the inherent tension in large-scale AI-driven migrations: the speed is extraordinary, but **human understanding and oversight of the resulting codebase is severely diluted**.

### 3. Breaking Faith With the Zig Ecosystem

Bun was one of the **most prominent flagship projects** in the Zig ecosystem. Its existence served as a compelling "production-grade proof" of Zig's viability. The rewrite sent an unmistakable signal to the broader community: even the most successful Zig project abandoned the language.

## The Zig Community's Beef: Beyond the Technical

### A Fundamental Philosophical Divide: AI Policy

The Zig project officially maintains a **strict no-AI policy**, prohibiting AI-generated issues, pull requests, and comments. This stance reflects the Zig community's commitment to craft, intentionality, and human accountability in software.

The Bun team's post-acquisition direction — AI agents as the primary development driver — was the precise opposite. The two engineering cultures were on a collision course.

### Prior Friction: The Forced Fork

Before this rewrite, the Zig team's refusal to accept Bun's performance-oriented patches (such as parallel code generation) had already forced the Bun team to **maintain their own fork of Zig**. This added maintenance overhead and created a gradual but real distancing between the two projects long before the Rust migration.

### Andrew Kelley's Position

Zig's creator Andrew Kelley has consistently maintained that Zig is pre-1.0 and that users should expect breaking changes. This "language integrity over user convenience" stance is arguably the right call for the long-term health of the language — but for commercial teams needing to ship fast and maintain stability, it represents a very real cost.

## What This Event Actually Means

Bun's rewrite is more than one company's technical decision. It's a snapshot of where software engineering stands in 2026:

1. **AI can now execute large-scale language migrations** — speed that no human team can match, though quality remains debated.
2. **Zig's ecosystem remains fragile** — losing Bun as its highest-profile production user is a significant blow to community momentum.
3. **Rust remains the dominant choice for systems programming** — mature tooling, AI-friendly ergonomics, and compiler-enforced safety continue to give it a decisive edge.

## The Verdict

There's no clean moral to this story. The AI-driven rewrite delivered real safety wins and passed the test suite — but left a codebase full of `unsafe` blocks that may take years to properly audit. And no one can guarantee that AI-generated code is free of subtle issues.

No perfect technical choices exist — only tradeoffs between speed, safety, ecosystem maturity, and engineering philosophy.
And once a commercial company acquires a project, technical direction is no longer purely an engineering decision. It becomes a business one.
