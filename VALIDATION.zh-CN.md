# 共享模块与发布验证

`src/i18n/locales.ts` 定义支持的语言，`ui.ts` 保存翻译文字，`utils.ts` 对应实际存在的翻译内容。`src/scripts/language-links.ts` 统一保留切换语言时的搜索词与离站目的地。`src/lib/routes.ts` 验证并组合路径。`scripts/check-output.ts` 在 Astro、Pagefind 与搜索清理完成后检查产物；普通构建也会自动执行。

产物检查会拒绝敏感文件名、符号链接、过深目录、超限上传与可执行的行内标记。回归测试刻意加入不安全产物，确认检查能够报错。界面测试比较三语言键名与插值参数，只有明确允许省略的编辑文字可留空。GitHub 工作流检查会拒绝将 secret 直接插入 shell 命令，以及在条件表达式直接使用 secrets。

例如更换正式站点：复制 `.env.production.example` 为 `.env.production`，设置 `PUBLIC_SITE_URL=https://your-blog.example` 与公开联系信息，再执行以下命令。凭证保存在相应的私有平台环境文件中。构建使用 `dist`；VPS 自定义 `--prebuilt` 包属于高级上传功能，该命令不会为它重新构建。

```sh
pnpm check
pnpm build
pnpm selfcheck
```

当前本机实际验证环境是 Windows。CI 矩阵也会在 Linux、macOS 构建并执行浏览器测试，必须看到远端成功结果才能视为完成那些平台的验证。浏览器测试模拟分析服务被拦截与低性能设备设置，不代表测试过每一种扩展、浏览器版本或实体老旧设备。Tailwind 4 仍需要兼容的现代浏览器引擎。部署 dry-run 只验证命令计划，不验证凭证、DNS、远端权限、TLS 或正式启用。发布后仍须查看各平台的实际 HTTP 响应头。零漏洞扫描结果具有时效性，不能保证未来没有新漏洞。

[Setup](SETUP.zh-CN.md) · [Deployment](DEPLOYMENT.zh-CN.md)
