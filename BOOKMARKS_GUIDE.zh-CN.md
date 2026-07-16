# 书签区块指南

首页书签区块维护在：

```text
src/components/BookmarkLinks.astro
```

书签属于网站内容，不是部署设置。不要把 API key、token、私人管理面板网址或私人服务器地址放进这个文件。

## 新增分组

先在 `groupLabels` 新增三语分组名称：

```ts
const groupLabels = {
  code: lang === 'en' ? 'Code' : lang === 'zh-cn' ? '代码' : '程式碼',
  shopping: lang === 'en' ? 'Shopping' : lang === 'zh-cn' ? '购物网站' : '購物網站',
};
```

再到 `bookmarkRows` 新增一行：

```ts
{
  group: groupLabels.shopping,
  items: [
    { label: 'Example Shop', href: 'https://example.com/' },
  ],
},
```

## 向现有分组添加链接

找到目标分组，在 `items` 中加入 `{ label, href }`：

```ts
{
  group: groupLabels.code,
  items: [
    { label: 'GitHub', href: 'https://github.com/' },
    { label: 'Gitea', href: 'https://gitea.com/' },
  ],
},
```

## 链接行为

书签链接会以外部链接方式打开：

```html
target="_blank" rel="noopener noreferrer"
```

公开模板会直接打开书签目的地。共用的 `ExternalLink.astro` 组件会拒绝不支持的协议和带有账号密码的 URL，并自动加入 `noopener noreferrer`。

## 安全注意事项

- 优先使用 `https://` 网址。
- 外部链接保留 `target="_blank"` 与 `rel="noopener noreferrer"`。
- 不要把访客输入、API 返回值或其他不可信数据直接放入 `href`。
- 公开模板不要加入私人控制台、私人 IP、内部 hostname、API token 或个人账户网址。
- 书签面板有固定滚动范围，较多分组或链接不会让首页无限变长。
- 编辑后执行 `pnpm check`、`pnpm lint`、`pnpm lint:css`、`pnpm build`、`pnpm selfcheck -- --quick`。
