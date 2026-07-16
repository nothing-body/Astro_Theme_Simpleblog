# 自检指南

自检是发布前的安全闸门，但不能取代人工 Code Review。它会整合源码扫描、框架诊断、测试、依赖漏洞数据、正式构建输出检查、部署计划验证和浏览器测试。

## 命令

```bash
pnpm selfcheck -- --explain
pnpm selfcheck -- --quick
pnpm analyze
```

- `--explain`：列出每组规则的目的和拦截内容；不修改文件，也不执行构建。
- `--quick`：检查源码、文章、图片、Astro／TypeScript、ESLint、Stylelint、Knip 和单元测试。
- `pnpm analyze`：除快速检查外，再执行 OSV、干净正式构建、产出检查、三语言所有部署模式 dry-run 和 Playwright。

`ERROR` 会让命令以失败状态结束并阻止可信发布；`WARNING` 会显示供人工确认，但不会让命令失败。

## 规则分类

| 代码                             | 保护范围               | 会拦截的例子                                                                |
| -------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `CHECK`                          | 自检流程               | 阶段崩溃、子命令失败、构建失败后无法执行产出／E2E                           |
| `JS`、`TS`、`CONFIG`             | TypeScript 和共用配置  | 未批准 JavaScript、隐藏类型错误、宽松设置、硬编码网站标识                   |
| `CSS`                            | CSP 和渲染性能         | 内联样式、应用到全部属性的 transition、负字距、模糊和亮度滤镜               |
| `SEC`、`SECRET`                  | XSS 和秘密泄露         | 动态执行、直接写入 HTML、危险协议、私钥、疑似 Token                         |
| `LINKCHECK`                      | 静态／API 离站模式     | 未声明的信誉检测代码、不安全 client／后端控制、公开凭据、外部链接绕过提示   |
| `PACKAGE`、`PARTYTOWN`、`SEARCH` | 依赖和集成             | 缺少包、override 不一致、Partytown／Pagefind 产物缺失                       |
| `GIT`、`HEADER`                  | 仓库隐私和 HTTP 响应头 | `.env`／密钥被跟踪、ignore 不完整、CSP 不安全、缺少 `nosniff`、平台设置漂移 |
| `DOC`                            | 操作文档               | 缺少部署模式／参数、严重程度说明，或三语言指南不完整                        |
| `CONTENT`、`I18N`                | Markdown 和三语言内容  | frontmatter 错误、MDX／raw HTML、危险命令、路由冲突、缺少翻译               |
| `IMAGE`                          | 图片解码和响应式输出   | symbolic link、不支持格式、过大文件／像素、缺少尺寸、绕过 Astro 优化        |
| `BUILD`、`ROUTE`                 | 正式产物和路由         | 缺少 `dist`、source map、损坏的站内链接、生成 `/page/1`、资源缺失           |
| `SEO`                            | 搜索 metadata          | canonical 错误／重复、hreflang 缺失、sitemap 坏链接、robots／社交图片缺失   |
| `CSP`                            | 严格 CSP 兼容性        | 可执行内联 script、内联 style、Partytown hash 缺失、危险协议                |
| `PERF`                           | 产出大小               | HTML、JavaScript、CSS 异常过大；此类通常是 warning                          |

## 完整自检不会做的事

- 部署验证只执行 `--dry-run`，不会上传或修改任何平台。
- OSV 只接收 npm 包名称和已安装版本，不会收到源码、环境文件、文章或秘密。
- 零错误不代表所有业务逻辑错误或未来的零日漏洞都不存在。
- 浏览器测试会使用已配置的 Chromium 兼容可执行文件，包括 ungoogled-chromium。

## 如何阅读错误

```text
[ERROR] HEADER002 public/_headers: CSP must not allow unsafe-inline.
```

1. `ERROR` 表示阻止可信发布。
2. `HEADER002` 是稳定规则代码。
3. `public/_headers` 是发现问题的文件。
4. 后方信息说明违反的安全边界。

请修复被报告的来源，不要直接关闭规则。开发中使用 `pnpm selfcheck -- --quick`，发布前再执行 `pnpm analyze`。

实现可选的信誉检测 API 时，请将 `link-reputation.audit.example.json` 复制为 `link-reputation.audit.json`，选择 `local-feed` 或 `remote-api`、填写供应商名称，并列出实际 TypeScript／Astro／披露文件。这会让 `LINKCHECK` 从静态提示保护切换到对应策略的 API 检查。如果后端位于另一个仓库，本项目无法读取它；此时出现警告是有意设计，必须另外在后端仓库完成安全检查。
