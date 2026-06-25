---
title: 'NameCrane - CraneMail'
pubDate: 2026-04-06
category: '隐私与邮箱'
categoryPath: ['隐私与邮箱', '电子邮件']
tags: ['电子邮件', '隐私']
---

# Crane Mail介绍

Crane Mail是NameCrane提供的域名邮局服务，NameCrane是母公司[BuyVM](https://buyvm.net/)Frantech旗下的公司。

[BuyVM](https://buyvm.net/)的业务是虚拟主机，而[NameCrane](https://namecrane.com/)的业务是主机托管与Email Hosting（邮件托管）。

[NameCrane](https://namecrane.com/)同时也是ICANN认证的域名注册商。

Crane Mail主打企业邮箱，也提供SpamExperts作为反垃圾邮件服务，并且有转发和别名服务，一小时能发送600封信件。

# 为什么选择Crane Mail

为什么选择Crane Mail呢？
因为我想要一個使用自己域名的邮箱，脱离gmail等大厂商的控制（？），NameCrane的政策也有说明，除非账号产生明显的问题（如法律责任），否则不会主动扫描和探查用户邮件，另外就是因为它有终身方案。
其实还有另一個服务[mxroute](https://www.mxroute.com/)也提供终身方案，但仅限在黑五期间贩售，非常难抢。

Crane Mail的老板[Francisco](https://lowendtalk.com/profile/Francisco)在lowendtalk论坛上很活跃，BuyVM的评价也很好。

所以我选择购买Crane Mail服务。

# 订阅方案

Crane Mail有基础订阅，也提供终身方案。
订阅方案如下：

| 容量 | 价格            | 支持域名数量 |
| ---- | --------------- | ------------ |
| 100G | 10 USD _年_     | 15           |
| 250G | 15 USD _六个月_ | 20           |
| 1TB  | 10 USD _月_     | 25           |
| 10TB | 55 USD _月_     | 70           |

### 终身方案

| 容量 | 价格    | 支持域名数量 |
| ---- | ------- | ------------ |
| 250G | 75 USD  | 25           |
| 500G | 150 USD | 100          |
| 750G | 225 USD | 150          |

这只是一部分方案，详细可以查看[NameCrane网站](https://namecrane.com/store/email-hosting-deals)。

- 详细价格以NameCrane官方价格为准。
- 终身是指网站或产品寿命。

# 购买注意

如果想要使用PayPal付款，系统会要求注册NameCrane网站的邮箱与PayPal使用的邮箱保持一致。
（例如：PayPal使用的邮箱是abc@abc.com，那么NameCrane账号使用的邮箱也必须是abc@abc.com）

如果注重隐私，建议使用其他付款方式，甚至是使用加密货币。

# Web Mail

[CraneMail](https://namecrane.com/cranemail-email-hosting)的Web UI是[SmarterMail](https://www.smartertools.com/smartermail/business-email-server)的Web UI，登录后建议开启2FA。
在后台可以查看应用程序密码。
![2fa.jpg](/images/CraneMail/2fa.jpg)

## CraneMail支持协议

- 欧区 eu1.workspace.org
- 美区 us1.workspace.org

| 协议                  | 用途                | 主机名                                                                 | 端口     | SSL/TLS |
| --------------------- | ------------------- | ---------------------------------------------------------------------- | -------- | ------- |
| SMTP                  | 发信                | eu1.workspace.org/us1.workspace.org                                    | 465/2465 | 是/隐式 |
| SMTP                  | 发信                | eu1.workspace.org/us1.workspace.org                                    | 587/2587 | 是/显式 |
| IMAP                  | 收信/同步           | eu1.workspace.org/us1.workspace.org                                    | 993      | 是/隐式 |
| IMAP                  | 收信/同步           | eu1.workspace.org/us1.workspace.org                                    | 143      | 否      |
| POP                   | 收信/下载           | eu1.workspace.org/us1.workspace.org                                    | 995      | 是/隐式 |
| POP                   | 收信/下载           | eu1.workspace.org/us1.workspace.org                                    | 110      | 否      |
| EAS                   | ActiveSync Exchange | eu1.workspace.org/us1.workspace.org                                    | N/A      | N/A     |
| WebDAV/CardDAV/CalDAV | 文件管理            | https://eu1.workspace.org/webdav/ 或 https://us1.workspace.org/webdav/ | N/A      | N/A     |
| XMPP                  | 即时通讯            | eu1.workspace.org/us1.workspace.org                                    | 5222     | 是/显式 |
| FTPS                  | 文件传输            | eu1.workspace.org/us1.workspace.org                                    | 8221     | 是/显式 |
| FTP                   | 文件传输            | eu1.workspace.org/us1.workspace.org                                    | 8231     | 否      |

# eM Client

SmarterMail自带能申请一个eM Client的授权码。

进入管理员账号Web Mail页面，进入域市场选择 eM Client，点击请求代码，出现提示后，等待激活码发送至邮箱。

这个授权是Business方案，有效期为一年。

需要注意的是，这个授权码是SmarterMail提供的，跟NameCrane没有任何关系。

# 心得

目前使用下来，邮件基本都能收到。使用我自己的xyz域名时会被SpamExperts拦截，需要到SpamExperts控制台放行邮件。在放行时可以选择训练，训练好以后就不会再被拦截了。

发信的话，说来好笑，我自己平时没怎么发信，测试使用我自己的.com域名发送到gmail或者outlook都完全没问题。

Crane Mail主打企业邮箱，但是不允许发送垃圾或骚扰邮件，被发现会被封禁账号。

在社区有看到有人抱怨，用来作为用户注册网站账号的欢迎邮件也会被判定为发送垃圾邮件，需要找客服解封账号，这点可能需要注意一下。

后续社区内的官方人员建议不要使用.xyz这类高风险域名，且注册页面最好添加验证机制以防被机器人大量请求发送邮件。
