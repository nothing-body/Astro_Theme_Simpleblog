---
title: 'AI API 中转站现状：便宜、方便，还是把数据交给陌生人？'
pubDate: 2026-06-20
description: '分析 AI API 中转站、代理网关和低价转售服务的真实风险：记录请求、凭证泄露、私钥与密码暴露、恶意自动化、跑路和安全检查方式。'
category: '网络与安全'
categoryPath: ['网络与安全', 'API 安全']
tags: ['AI API', 'API 安全', '隐私']
---

> 核查日期：2026-06-20。本文把公开论文、官方文档与可查证报道写成事实；对于单一社群爆料或未公开截图，则作为用户投诉与风险信号处理，不编造不存在的统计比例。

AI API 中转站通常指一种“把你的请求先发到第三方，再由第三方转发到 OpenAI、Anthropic、Google、DeepSeek、Groq、OpenRouter 等模型供应商”的服务。它可能是正常的企业网关，也可能是个人搭建的低价转售站，还可能是完全不透明的灰色站点。

这类服务吸引用户的原因很直接：价格可能较低、付款方式更灵活、可用同一个接口切换多家模型，或者绕过某些地区和账号限制。但安全问题也同样直接：**中转站位于你的程序和模型供应商之间，它在技术上可以看到、记录、修改或重放你的请求。**

## 先分清楚：不是所有“中转”都一样

AI API 中转大致可以分成三类。

第一类是**企业级 AI Gateway**。例如 Cloudflare AI Gateway、LiteLLM Proxy 这类产品，本来就设计来做路由、成本统计、限流、缓存、审计日志和数据泄露防护。这类工具不是问题本身；问题在于你是否信任运营方，以及是否知道它记录了什么。

第二类是**自建代理层**。公司或个人把 LiteLLM、one-api、new-api、自写 proxy 等部署在自己的服务器上，让内部项目统一走同一个 API endpoint。若由自己管理、密钥隔离清楚、日志策略透明，风险可控。

第三类是**公开低价转售或不透明中转站**。这类服务常见卖点是低价、免绑卡、支持多模型、国内可直连、按量充值。真正的风险也多半集中在这里：你不知道它是否合规取得上游额度，不知道是否完整记录 prompt，不知道上游 key 是否稳定，也不知道站长消失后余额是否能退。

## “会不会记录我的内容？”答案是：技术上可以，而且很多正规网关本来就有记录功能

这不是幻想。Cloudflare AI Gateway 官方文档说明，仪表板日志可包含 individual requests 的 user prompt、model response、provider、timestamp、request status、token usage、cost、duration、user agent 等数据；它也提供 header 让用户控制是否收集 log 或 raw request/response payload。

LiteLLM Proxy 官方文档也把 logging 当成正式功能，说明可以记录 proxy input、output 和 exceptions，并可发送到 Langfuse、OpenTelemetry、S3、GCS、DataDog、Azure Sentinel、DynamoDB 等系统。

这些正规产品的文档反而证明了一件事：**AI API proxy 看到请求内容并保存日志，在技术上是正常能力，不是阴谋论。**差别只在于正规服务会把日志功能、保存方式、关闭方式、权限与责任写清楚；不透明中转站则可能什么都不说。

因此，只要你把以下内容发进不可信中转站，就要假设运营者有机会看到：

- 账号密码
- API key
- Cookie、JWT、session token
- SSH private key
- 加密货币助记词、私钥、交易签名数据
- 公司内部代码
- 客户数据、订单数据、后台截图
- 尚未公开的产品计划或商业资料

## 恶意中转不是猜测：Your Agent Is Mine 已经测到实例

2026 年 4 月公开的论文 **Your Agent Is Mine: Measuring Malicious Intermediary Attacks on the LLM Supply Chain**，研究的正是 LLM API routers / intermediary services 这个攻击面。arXiv 页面显示论文作者测试了 28 个付费 routers，来源包含淘宝、闲鱼与 Shopify storefronts，并收集 400 个公开社群中的免费 routers。

它的发现很直接：

- 1 个付费 router 与 8 个免费 routers 主动注入恶意代码。
- 2 个 routers 使用 adaptive evasion triggers，也就是有条件地触发恶意行为以规避测试。
- 17 个 routers 触碰了研究者放置的 AWS canary credentials。
- 1 个 router drain 了研究者控制的 ETH private key。
- 研究中的 poisoning studies 还显示，泄露的 OpenAI key 可被滥用产生大量 tokens，弱配置诱饵环境也能导致 credentials 被收集与自动化 Codex sessions 被启动。

所以，对“中转站偷私钥、触碰凭证、注入恶意 payload”这件事，现在不能只写成抽象可能性。更准确的说法是：**公开研究已经在真实购买与收集到的 LLM API routers 中观察到恶意注入、凭证触碰与 ETH 私钥被 drain 的案例。**

需要小心的是另一个层次：这篇论文证明了“样本中的恶意 router 真的存在”，但不等于每一家 API 中转站都偷数据。因此，实务上应该把不透明中转站视为高风险供应链，而不是把所有中转服务一概等同于恶意服务。

## 已公开研究证明：LLM API 凭证泄露是真实问题

2026 年 6 月的论文 **Mind your key: An Empirical Study of LLM API Credential Leakage in iOS Apps** 分析 444 个整合 LLM 的 iOS app，发现其中 282 个会在网络流量中暴露可利用的 LLM API credentials。研究列出三类模式：JWT token 泄露、未验证的 backend proxy、明文 API key 传输。

这份研究不等于“所有 API 中转站都偷 key”，但它证明了几件事：

1. LLM API key 和 proxy access token 已经是实际攻击面。
2. 很多开发者把 proxy 设计成未验证或弱验证。
3. 攻击者不一定需要入侵模型供应商；只要找到 app、proxy、日志、前端或移动端的弱点，就可能偷到可用额度。

对用户来说，这代表“用中转站省钱”和“把中转 token 放进客户端”都不能草率处理。对站长来说，这代表中转服务一旦没有权限隔离、限流、审计与密钥轮换，很快就会变成别人的免费算力池。

## 私钥和加密货币被偷：AI API 中转站不是唯一场景，但风险逻辑相同

公开资料中，更容易找到的是 AI 插件、开发者供应链和恶意软件包偷取私钥、浏览器密码、SSH key、云端凭证的案例。

例如 The Verge 报道 OpenClaw 的第三方 skill / extension 生态出现大量恶意扩展，研究者发现部分扩展伪装成加密货币工具，实际上会窃取 crypto wallet keys、SSH credentials 和 browser passwords。这是 AI agent / extension 生态的案例，不是传统 API 中转站案例，但它说明了同一件事：一旦 AI 工具取得文件、终端、浏览器或凭证环境的访问权，攻击面会迅速扩大。

2025 年也有多起 npm / JavaScript 供应链攻击被公开报道，恶意软件包会窃取开发者凭证，或拦截加密货币交易并导向攻击者地址。这些案例同样不是“AI API 中转站直接偷私钥”的证据，但能证明攻击者确实有动机锁定开发者环境、API keys、钱包私钥和自动化工作流。

所以，合理结论不是“每个中转站都会偷私钥”，而是：

> 不可信的 AI API 中转站、恶意 AI 插件、恶意软件包、未验证 proxy 都属于同一类供应链信任问题。只要它们位于请求、代码或执行环境中间，就有机会取得敏感数据。

## “直接自动化攻击”什么情况下会发生？

单纯的 API 中转站通常只是转发文字、图片或模型请求；它本身不一定能操作你的电脑。但在下面几种情境中，风险会升级成自动化攻击：

1. 你把中转站提供的 SDK、浏览器插件、桌面客户端或命令行工具装到本机。
2. 你的 AI agent 连接了 shell、浏览器、自动化工具、MCP server、云端 API 或钱包工具。
3. 你把 token、密码、私钥或后台 cookie 贴进 prompt。
4. 中转站不只转发，还会改写 system prompt、插入 tool call、替换 model response。
5. 你的程序把模型输出当成命令执行，没有人工确认或权限限制。

OWASP LLM Top 10 和多个 prompt injection 研究都把敏感信息泄露、过度代理权限、工具滥用列为 LLM 应用的重要风险。这代表问题不只在“模型会不会乱答”，而是在“模型输出是否能触发真实操作”。

如果一个中转站同时提供“便宜 API”、“自动写代码工具”、“浏览器插件”、“一键部署脚本”、“MCP 工具包”，风险就不能只用 API 价格来评估。你需要把它当成会进入开发环境的软件供应链来看。

## 跑路、恶意涨价、注册机与封号：低价中转站的另一组现实问题

AI API 转售站常见的商业模式是先收充值，再由站方统一向上游购买或使用模型额度。这会产生几个现实问题：

- 上游账号被封，用户 API 立刻不可用。
- 站方低价补贴撑不住，直接关站。
- 站方先用低价吸引用户充值，再恶意调高价格或调整倍率。
- 站方没有公司资料、退款条款和客服记录，余额难以追回。
- 用户不知道请求实际走哪个模型、哪个地区、哪个供应商。
- 站方可能用不合规方式取得上游额度，导致服务不稳定。
- 站方或上游滥用注册机、自动化注册免费账号、薅试用额度，账号被风控后整批服务失效。

这类“跑路、恶意涨价、注册机薅免费账号导致被封”在社群讨论中并不少见，也符合低价灰色转售服务的商业诱因：当上游成本、风控或账号来源不可持续时，运营者最容易把损失转嫁给充值用户，或者直接关站消失。

严格来说，目前仍缺少一个可靠的公开数据库去统计“AI API 中转站跑路率”或“恶意涨价比例”，所以不应凭空写成某个百分比。但风险本身不是幻想；它是低价预付费、匿名运营、灰色上游、缺乏契约与缺乏退款保障共同造成的真实运营风险。

## 怎么判断一个中转站比较可信？

可以用下面这份检查表。

### 身份与合规

- 是否有公司名称、注册地、服务条款、隐私政策和退款政策？
- 是否说明上游模型供应商与数据处理方式？
- 是否明确禁止滥用、攻击、扫描、诈骗和违法用途？
- 是否提供正式客服与安全通报渠道？

### 日志与数据

- 是否说明会不会记录 prompt、response、IP、User-Agent、API key、错误堆栈？
- 是否能关闭 request/response payload 日志？
- 日志保存多久？谁能看？
- 是否有数据删除方式？
- 是否提供 DLP 或敏感字符串遮罩？

### 密钥与权限

- 是否支持每个项目独立 key？
- 是否支持限额、限速、模型白名单、IP allowlist？
- 是否能一键撤销 key？
- 是否能看每把 key 的用量？
- 是否禁止把 admin key 放在前端或 app 内？

### 技术行为

- 是否完全兼容 OpenAI API，但不要求安装奇怪的本机程序？
- 是否使用 HTTPS？
- 是否有公开状态页？
- 是否提供错误码与上游错误透明度？
- 是否会改写模型回复或插入广告、提示词、额外工具调用？

### 付款与跑路风险

- 是否只接受不可追回的付款方式？
- 是否要求一次充值大额余额？
- 是否有最低消费陷阱？
- 是否有退款记录或清楚规则？
- 是否在社群中频繁换域名、换品牌、删公告？

## 安全使用建议

1. 不要把密码、私钥、助记词、session cookie、SSH key、云端 long-lived token 贴进任何 AI。
2. 不要把不可信中转站用在公司内部代码、客户数据、法律文件、财务数据或未公开产品资料上。
3. 只给中转 key 最小额度，并设置每日或每月上限。
4. 每个项目使用不同 key，不要多人共用同一把 key。
5. 定期轮换 key，停用不用的 key。
6. 不要在前端、手机 app、公开 GitHub repo、浏览器插件中硬编码中转 token。
7. 高风险任务使用官方 API、企业网关或自建 proxy。
8. 如果一定要用低价中转站，先用测试数据、低额充值、非敏感场景试用。
9. 避免安装来源不明的 AI 客户端、插件、脚本和 npm / PyPI 软件包。
10. 对 AI agent 的 shell、浏览器、云端 API、钱包操作加上人工确认和最小权限。

## 最后结论

AI API 中转站不是天生邪恶。企业网关、自建 proxy、成本统计与模型路由都是合理需求。真正的问题是：**你把所有 prompt、代码、token 和业务数据交给谁？你知道它记录什么吗？你能删除吗？你能追责吗？**

关于“中转站记录账号密码、偷加密货币私钥、甚至自动化攻击”这类说法，现在已经不能只停留在假设层面。**Your Agent Is Mine** 已经在真实付费与免费 LLM API routers 样本中测到恶意注入、AWS canary credentials 被触碰，以及 ETH private key 被 drain。这代表恶意中转站不是理论恐吓，而是被公开研究观察到的供应链攻击面。

跑路、恶意涨价、注册机薅免费账号导致风控封号，则更偏向运营与灰色转售风险。这类案例在社群中反复出现，但不应乱编比例；比较可靠的结论是：低价中转站的成本不只在 token 价格，也包含数据信任、余额安全、上游来源与服务可持续性。

## 参考资料

- [Cloudflare AI Gateway Logging](https://developers.cloudflare.com/ai-gateway/observability/logging/)
- [LiteLLM Proxy Logging](https://docs.litellm.ai/docs/proxy/logging)
- [Your Agent Is Mine: Measuring Malicious Intermediary Attacks on the LLM Supply Chain](https://arxiv.org/abs/2604.08407)
- [Mind your key: An Empirical Study of LLM API Credential Leakage in iOS Apps](https://arxiv.org/abs/2606.12212)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [The Verge: OpenClaw's AI skill extensions are a security nightmare](https://www.theverge.com/news/874011/openclaw-ai-skill-clawhub-extensions-security-nightmare)
- [TechRadar: Dangerous npm packages are targeting developer credentials](https://www.techradar.com/pro/security/dangerous-npm-packages-are-targeting-developer-credentials-on-windows-linux-and-mac-heres-what-we-know)
- [Tom's Hardware: JavaScript packages compromised with crypto-stealing code](https://www.tomshardware.com/tech-industry/cyber-security/javascript-packages-with-billions-of-downloads-were-injected-with-malicious-code-in-worlds-largest-supply-chain-hack-geared-to-steal-crypto-a-phishing-email-is-all-it-took-to-undermine-npm-packages)
- [ITPro: GitHub is awash with leaked AI company secrets](https://www.itpro.com/security/github-is-awash-with-leaked-ai-company-secrets-api-keys-tokens-and-credentials-were-all-found-out-in-the-open)
