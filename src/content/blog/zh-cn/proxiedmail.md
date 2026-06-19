---
title: 'Proxiedmail 电子邮件别名服务：保护隐私的临时与自建域名邮箱方案'
pubDate: 2026-03-16
category: '别名'
tags: ['电子邮件别名', '隐私', '闭源']
---

# Proxiedmail 介绍

[ProxiedMail](https://proxiedmail.com?r=MiInBYbsah) 是一款注重隐私保护的“电子邮件代理（Email Proxy）”与别名管理服务。
它的主要功能是通过生成代理邮箱（即别名），你可以将接收到的邮件自动转发到真实的个人或工作邮箱（如 Gmail、ProtonMail、Outlook 等），从而避免真实电子邮件地址外泄、减少垃圾邮件，并防范个人数据泄露的风险。

## 核心功能与特色

- **无限制的代理邮箱**： 用户可以无限制地创建以 @proxiedmail.com 等官方域名结尾的别名邮箱。

- **支持自定义域名**： 允许绑定你自己的专属域名（例如 contact@yourdomain.com），并利用这些自定义域名来收发与转发邮件。

- **双向通信（支持直接回信）**： 这是 [ProxiedMail](https://proxiedmail.com?r=MiInBYbsah) 与一般单向“一次性邮箱”最大的差异。当你从真实邮箱收到转发来的信件并点击“回复”时，邮件会先经过 ProxiedMail 路由，然后以“代理邮箱”的名义发送给对方；在服务正常路由与邮件标头没有额外泄漏的前提下，收件人通常不会直接看到你的真实电子邮件地址。

- **开发者友好（API 与 Webhook）**： 提供完整的 API 支持，允许开发者通过代码自动生成别名，或通过 Webhook 将收到的邮件内容直接传送到自己的应用程序中（官方开源提供了 Laravel / PHP 的接收包）。

- **长期有效且不长期存储邮件**： 生成的别名通常会持续有效（除非你手动删除、关闭转发，或服务方案规则变更）。ProxiedMail 的服务器设计为单纯的转发节点，不长期存储你的邮件内容，邮件会直接送达你的真实邮箱。

- **避免厂商锁定（No Vendor Lock-in）**： 你可以随时在后台将转发目标更改（例如从 Gmail 换成 ProtonMail），而不需要去所有已注册的网站一一修改会员邮箱。

## 为什么选择 ProxiedMail？

市面上已经有开源的 SimpleLogin、Addy.io ，闭源的有 Apple 的“隐藏邮件”，为什么还要关注这款服务？

因为 ProxiedMail 相对小众，注册网站时使用 ProxiedMail 提供的域名，不会像 SimpleLogin、Addy.io 域名那样早就被各大网站标记，从而避免因为使用公共别名服务的域名注册账号而被拒绝的情况。

此外，ProxiedMail 还主打 Webhook/API 的开发者友好特性。

## ProxiedMail 有什么方案?

[ProxiedMail](https://proxiedmail.com?r=MiInBYbsah) 提供 Free、Plus、Forever 方案。

### 1. 免费版 (Free - Personal)

对于一般个人用户来说，免费版已经提供了相当慷慨的防护基础；实际限制与价格仍以官方最新方案为准。

- **代理邮箱数量**： 最多 10 个代理邮箱（Proxy-emails）。
- **空闲限制**： 最多允许 3 个未使用的代理邮箱。
- **自定义域名**： 令人惊喜的是，免费版即支持绑定高达 50 个自定义域名。
- **真实邮箱绑定**： 仅限绑定 1 个真实邮箱接收转发。
- **回信功能**： 支持直接从代理邮箱回复邮件。
- **进阶功能**： 支持 Webhook、API 访问（每月最高 2,000 次请求）、支持通配符（Wildcard \*@proxy-email）。
- **安全性与客服**： 采用 3DES 加密，并保证在 24 小时内提供客服支持。

### 2. 高级订阅版 (Plus)

价格： `$20 USD` / 年（提供 14 天退款保证）  
适合需要管理大量邮箱、重视极致隐私或有小型团队协作需求的用户。

- **无限制解放**： 包含免费版所有功能，并升级为无限制的代理邮箱数量、无限制的自定义域名，且解除未使用邮箱的数量限制。
- **真实邮箱扩充**： 支持绑定高达 50 个真实邮箱（若有需求还可向官方申请增加），非常适合一对多转发的情景。
- **主动发信**： 不仅能回信，还支持“主动从代理邮箱发送全新邮件”（Sending outbound emails）。
- **安全性与隐私强化**： 加入多因素身份验证 (MFA)、额外的 AES 加密层、数据泄露通知，以及电子邮件追踪保护。
- **服务质量**： 拥有 99.9% 运行时间 SLA 保证与最快的客服支持。
- **进阶工具**： API/Webhook 请求上限提升至每月 10,000 次、支持删除代理邮箱、内置代理邮箱的密码管理器，并附带 ProxiedMail ChatGPT 邮件机器人（上限 50 条消息）。

### 3. 终身买断版 (Forever)

价格： `$60 USD` / 单次付费（注：官方常有活动，如冬季限时 5 折优惠，同样具备 14 天退款保证）  
这是在同类服务中极为罕见的方案，官方主打“拒绝订阅制”与“对抗通胀”。

- **一次付费，终身享有**： 包含上述“Plus”进阶版的所有功能，但只需支付一次费用，未来无需每年缴纳订阅费。
- **市场稀缺性**： 官方强调，目前市场上几乎没有其他服务商针对“无限域名与无限代理邮箱”提供终身买断的选择。

**_Forever 通常指的是商品或厂商的生命周期寿命。_**

## 在 Proxiedmail 新增自己的 mail address

在控制台页面内寻找『Enter your real email』
![add address.png](/images/ProxiedMail/add-address.png)

直接在框内输入您要添加的真实邮箱地址，添加成功后会在下方『Your proxy-emails』看见添加的邮箱地址。同时，请到您添加的邮箱内查收一封确认信，验证通过后才能正常收发信。

如果您要自定义生成的用户名，在『Proxy Address』填写即可，否则系统会自动生成一个随机用户名。

如果要更改某个生成的别名的目的接收邮箱，点击『Enter your real email』旁的向下三角箭头，然后点击 **Manage real emails**：
![add address-2.png](/images/ProxiedMail/add-address-2.png)

会跳转到此页面：
![add address-3.png](/images/ProxiedMail/add-address-3.png)

如果要更改真实邮箱，在 Real emails 点击 **Update** 并填入要更改的真实邮箱地址：
![add address-4.png](/images/ProxiedMail/add-address-4.png)

之后系统会发送一封确认信到您新添加的邮箱中，验证后的邮件将会自动发往新设置的真实邮箱。

## 删除 mail address

如果要删除已添加的真实接收地址，需要将『Your proxy-emails』列表中所有关联该接收地址的别名全部删除，这样就能彻底移除该真实接收邮箱。

## 添加自己的域名

您必须拥有一个自己购买或免费获取的域名才能添加域名。

点击『Choose domain』旁的 **Manage**：
![add domian.png](/images/ProxiedMail/add-domian.png)

点击 **Add domain**：
![add domian-1.png](/images/ProxiedMail/add-domian-1.png)

添加域名后，系统会给出对应的 DNS 解析配置，建议全部添加并验证通过才安全。

添加完毕后，点击 Choose domain 格子旁的向下箭头，就能在菜单中看到并选择该域名。
![add domian.png](/images/ProxiedMail/add-domian.png)

## 使用心得

Proxiedmail 是一个闭源服务。在 Reddit 或一些技术论坛上，Proxiedmail 的工作人员算是十分活跃的，经常在提到 Proxiedmail 服务或者别名服务的地方在底下跟帖解答。

有网友提问过：为什么不开源？什么时候开源？

Proxiedmail 工作人员的回复大致是这样的：『未来有机会会开源，但开源并非目前首要目标，目前财务资金不够，只能优先放在更重要的功能实现与修复上』。

所以对于极度排斥闭源服务的人来说，可能不会考虑这家服务。

我自己使用下来，觉得它的操作面板稍微不够直观，有些功能需要摸索一下才能知道在哪里、怎么用。
而且很有趣的是，点击到一些页面时，上方的导航栏并没有出现回到控制台的选项，该页面内也没看到返回主页的链接。

这可能是他们前端的一个小 Bug 吧？

但冲着他们提供的 Forever (lifetime) 方案，这个服务还是非常值得一试的。毕竟在别名服务中提供终身买断且价格不贵的非常少见。

**_Forever (lifetime) 通常指的是商品或厂商的生命周期。_**

[ProxiedMail 官网](https://proxiedmail.com?r=MiInBYbsah)
