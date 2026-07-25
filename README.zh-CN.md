# Astro Theme SimpleBlog

一套 Astro 三语言静态博客模板，支持 Markdown、Pagefind 搜索、Partytown、SEO、安全响应头，以及跨 Windows、macOS、Linux 的 TypeScript 部署工具。

<p align="center">
  <a href="https://blog.gkbb.de/">Live Demo</a>
  &middot;
  <a href="./README.md">English</a>
  &middot;
  <a href="./README.zh-TW.md">繁體中文</a>
</p>

## 快速开始

需要 Node.js 22.12 以上。项目提交了 `pnpm-lock.yaml`，因此建议使用 pnpm。

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Windows PowerShell 可运行 `Copy-Item .env.example .env`。没有 pnpm 时，脚本会自动使用 npm：

```bash
npm install
npm run dev
npm run check
npm run build
```

## 语言与路由

- 英文默认路由：`/`
- 繁体中文：`/zh-tw/`
- 简体中文：`/zh-cn/`
- 第一页文章列表固定使用 `/posts/`，第二页起使用 `/page/2`。
- 不保留重复的 `/page/1` 或旧 `/en` 路由。

翻译文章应使用相同文件名：

```text
src/content/blog/en/getting-started.md
src/content/blog/zh-tw/getting-started.md
src/content/blog/zh-cn/getting-started.md
```

## 技术栈

- Astro 静态输出、Vite 与 strict TypeScript
- 通过 `@tailwindcss/vite` 使用 Tailwind CSS v4，并搭配 Astro scoped CSS 与共用 CSS
- Astro Sitemap 与自定义三语言 alternate 输出
- Pagefind 静态全文搜索与三语言筛选
- Partytown 将用户同意后的 GA4 移出主线程
- Astro Markdown／Remark、GFM、自定义指令、Prism 与 raw HTML 禁止策略
- Sharp 与 Astro assets 处理有边界的响应式文章图片
- Jest、Playwright、Astro Check、ESLint、Stylelint、Knip、OSV 与 Lighthouse
- Cloudflare、Vercel、Netlify、VPS、VPS Docker、Supabase Edge Functions 的 TypeScript 部署工具

## 当前架构

```text
src/content/blog/          Markdown 文章与共用文章图片
src/pages/                 英文及共用 Astro 路由
src/pages/zh-tw/           繁体中文路由
src/pages/zh-cn/           简体中文路由
src/components/            共用 Astro 组件
src/layouts/               文档与文章 Layout
src/i18n/                  三语言界面与跨语言路由
src/integrations/          sitemap 与 hreflang 输出后处理
src/lib/                   URL、文章、分类与网站 helper
src/markdown/              Markdown 安全与图片处理
src/scripts/               浏览器端 TypeScript
scripts/                   自检与部署工具
deploy/                    Nginx 与 VPS Docker 配置
public/                    静态资源与跨平台安全响应头
tests/                     浏览器测试
```

主要组件：

- `BaseLayout.astro`：HTML 外壳、SEO、导航、隐私设置与共用脚本。
- `PostsPage.astro`：三语言文章列表与分页共用唯一渲染实现。
- `BlogPostLayout.astro`：文章 metadata、JSON-LD、面包屑、Pagefind、分类和标签。
- `SearchPage.astro`：三语言搜索界面；`src/scripts/search.ts` 使用安全 DOM API 创建结果。
- `HeadMeta.astro`：canonical、hreflang、Open Graph、Twitter 与 GA4 设置。
- `ExternalLink.astro` 与 `LeavingNotice.astro`：把外部目标保存在 URL fragment，显示不调用 API 的三语言提示。
- `src/markdown/processor.ts`：禁止 raw HTML、保护外部链接并执行文章图片策略。
- `src/integrations/localized-output.ts`：在输出后验证并补充三语言 sitemap alternates。
- `scripts/checks/`：检查源代码、文章、图片、秘密、安全响应头、SEO、正式产物、文档与可选信誉集成。

默认数据流：

```text
Markdown -> 安全 Markdown／图片流程 -> Astro 静态路由 -> Pagefind 索引
外部链接 -> 三语言静态离站提示 -> 用户确认后访问
部署菜单 -> 验证 TypeScript 目标 -> 上传 dist 产物
```

## 主要功能

- 英文、繁中、简中 Markdown 文章、分类、标签、置顶、草稿与分页
- Pagefind 全文搜索、分类和标签筛选
- Astro 响应式图片、尺寸、`srcset`、延迟加载与文件大小限制
- canonical、hreflang、sitemap、robots.txt、JSON-LD 和社交预览
- 经用户同意后使用 Partytown 将 GA4 移出主线程
- 不使用 `unsafe-inline` 的 CSP、防 MIME sniffing、防 iframe 嵌入
- reduced-motion、低 CPU／RAM、Save-Data 与慢速网络模式
- Windows、macOS、Linux 共用 TypeScript 部署脚本
- 双模式离站自检：默认静态提示，明确声明后可检查 `local-feed` 或 `remote-api` 信誉集成

Pagefind 目前不支持 `zh-tw`、`zh-cn` 词干分析。构建 Note 不是错误，中文搜索仍可使用；只想隐藏信息提示时，可在 Pagefind 命令加入 `--quiet`。

## 配置

范例：

```text
.env.example
.env.cloudflare.example
.env.vercel.example
.env.netlify.example
.env.supabase.example
.env.vps.example
.env.vps-docker.example
```

共用公开配置：

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=Astro Simple Blog
PUBLIC_SITE_AUTHOR=Site Author
PUBLIC_SITE_DESCRIPTION=A multilingual Astro blog for notes, guides, and articles.
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

不得提交真实 `.env*`、Token、账户／项目 ID、SSH 私钥、密码、私人文章或图片；`.gitignore` 已默认排除。

## 部署

```bash
pnpm deploy:cf:only
pnpm deploy:vercel:only
pnpm deploy:netlify:only
pnpm deploy:vps:only
pnpm deploy:vps-docker:only
pnpm deploy:supabase:only
```

Cloudflare Pages、Vercel、Netlify、VPS 和 VPS Docker 部署静态网站。Supabase 命令只部署 `supabase/functions/<名称>/index.ts` 的 Edge Functions，Supabase Edge Functions 不是静态网站主机。

`pnpm deploy:menu` 提供英文、繁体中文、简体中文界面；项目还包含 GitHub Actions、GitLab CI 和 Codeberg/Woodpecker 示例。完整步骤请阅读 [DEPLOYMENT.zh-CN.md](./DEPLOYMENT.zh-CN.md)。

## 可选网址信誉检测

`OPENPHISH_GUIDE.*.md` 提供独立搭建教程，可以使用 Cloudflare、Netlify、Vercel、Supabase 或其他后端。自检支持：

- `local-feed`：OpenPhish、URLhaus 或其他同步到私有存储空间的清单
- `remote-api`：Google Safe Browsing、Google Web Risk、VirusTotal 或其他固定 server-to-server 供应商

完成实现后才把 `link-reputation.audit.example.json` 复制为 `link-reputation.audit.json`，选择策略、填写供应商名称并列出实际 client／后端／披露文件。Manifest 只能保存路径与架构信息，不得包含 endpoint、API key、Token、账户／项目／存储 ID 或数据库凭据。

使用前必须确认供应商授权与数据流。Google Safe Browsing 直接 URL 查询会把待查网址发送给 Google，因此面向用户的说明不得声称网址只保留在本站。

## 教程

- [部署](./DEPLOYMENT.zh-CN.md)
- [Markdown 与配置](./MARKDOWN_GUIDE.zh-CN.md)
- [书签](./BOOKMARKS_GUIDE.zh-CN.md)
- [可选网址信誉检测](./OPENPHISH_GUIDE.zh-CN.md)
- [脚本](./scripts/README.zh-CN.md)
- [自检规则](./SELF_CHECK_GUIDE.zh-CN.md)

## 验证

```bash
pnpm check
pnpm audit:security
pnpm build
pnpm test:e2e
pnpm selfcheck -- --quick
pnpm analyze
```

`pnpm analyze` 会完整检查构建输出、SEO、CSP、路由、文章、依赖、部署计划和浏览器行为。
