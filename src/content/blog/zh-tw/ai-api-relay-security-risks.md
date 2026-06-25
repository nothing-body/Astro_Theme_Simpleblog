---
title: 'AI API 中轉站現況：便宜、方便，還是把資料交給陌生人？'
pubDate: 2026-06-20
description: '分析 AI API 中轉站、代理閘道與低價轉售服務的真實風險：記錄請求、憑證外洩、私鑰與密碼暴露、惡意自動化、跑路和安全檢查方式。'
category: '網路與安全'
categoryPath: ['網路與安全', 'API 安全']
tags: ['AI API', 'API 安全', '隱私']
---

> 查核日期：2026-06-20。本文把公開論文、官方文件與可查證報導寫成事實；對於單一社群爆料或未公開截圖，則作為使用者投訴與風險訊號處理，不編造不存在的統計比例。

AI API 中轉站通常指一種「把你的請求先送到第三方，再由第三方轉送到 OpenAI、Anthropic、Google、DeepSeek、Groq、OpenRouter 等模型供應商」的服務。它可能是正常的企業閘道，也可能是個人架設的低價轉售站，還可能是完全不透明的灰色站點。

這類服務吸引用戶的原因很直接：價格可能較低、付款方式更彈性、可用同一組接口切換多家模型、或繞過某些地區與帳號限制。但安全問題也同樣直接：**中轉站位在你的程式與模型供應商之間，它技術上可以看到、記錄、修改或重放你的請求。**

## 先分清楚：不是所有「中轉」都一樣

AI API 中轉大致可以分成三類。

第一類是**企業級 AI Gateway**。例如 Cloudflare AI Gateway、LiteLLM Proxy 這類產品，本來就設計來做路由、成本統計、限流、快取、記錄、審計和資料外洩防護。這類工具不是問題本身；問題在於你是否信任營運方，以及是否知道它記錄了什麼。

第二類是**自架代理層**。公司或個人把 LiteLLM、one-api、new-api、自寫 proxy 等部署在自己的伺服器上，讓內部專案統一走同一個 API endpoint。若由自己管理、金鑰隔離清楚、日誌政策透明，風險可控。

第三類是**公開低價轉售或不透明中轉站**。這類服務常見賣點是低價、免綁卡、支援多模型、國內可直連、按量充值。真正的風險也多半集中在這裡：你不知道它是否合規取得上游額度、不知道是否完整記錄 prompt、不知道上游 key 是否穩定，也不知道站長消失後餘額是否能退。

## 「會不會記錄我的內容？」答案是：技術上可以，而且很多正規閘道本來就有記錄功能

這不是幻想。Cloudflare AI Gateway 官方文件說明，儀表板日誌可包含 individual requests 的 user prompt、model response、provider、timestamp、request status、token usage、cost、duration、user agent 等資料；它也提供 header 讓使用者控制是否收集 log 或 raw request/response payload。

LiteLLM Proxy 官方文件也把 logging 當成正式功能，說明可以記錄 proxy input、output 和 exceptions，並可送到 Langfuse、OpenTelemetry、S3、GCS、DataDog、Azure Sentinel、DynamoDB 等系統。

這些正規產品的文件反而證明了一件事：**AI API proxy 看到請求內容並保存日誌，在技術上是正常能力，不是陰謀論。**差別只在於正規服務會把日誌功能、保存方式、關閉方式、權限與責任寫清楚；不透明中轉站則可能什麼都不說。

因此，只要你把以下內容送進不可信中轉站，就要假設營運者有機會看到：

- 帳號密碼
- API key
- Cookie、JWT、session token
- SSH private key
- 加密貨幣助記詞、私鑰、交易簽名資料
- 公司內部程式碼
- 客戶資料、訂單資料、後台截圖
- 尚未公開的產品計畫或商業資料

## 惡意中轉不是猜測：Your Agent Is Mine 已經測到實例

2026 年 4 月公開的論文 **Your Agent Is Mine: Measuring Malicious Intermediary Attacks on the LLM Supply Chain**，研究的正是 LLM API routers / intermediary services 這個攻擊面。arXiv 頁面顯示論文作者測試了 28 個付費 routers，來源包含淘寶、閒魚與 Shopify storefronts，並收集 400 個公開社群中的免費 routers。

它的發現很直接：

- 1 個付費 router 與 8 個免費 routers 主動注入惡意程式碼。
- 2 個 routers 使用 adaptive evasion triggers，也就是有條件地觸發惡意行為以規避測試。
- 17 個 routers 觸碰了研究者放置的 AWS canary credentials。
- 1 個 router drain 了研究者控制的 ETH private key。
- 研究中的 poisoning studies 還顯示，洩漏的 OpenAI key 可被濫用產生大量 tokens，弱配置誘餌環境也能導致 credentials 被收集與自動化 Codex sessions 被啟動。

所以，對「中轉站偷私鑰、觸碰憑證、注入惡意 payload」這件事，現在不能只寫成抽象可能性。更準確的說法是：**公開研究已經在真實購買與收集到的 LLM API routers 中觀察到惡意注入、憑證觸碰與 ETH 私鑰被 drain 的案例。**

需要小心的是另一個層次：這篇論文證明了「樣本中的惡意 router 真的存在」，但不等於每一家 API 中轉站都偷資料。因此，實務上應該把不透明中轉站視為高風險供應鏈，而不是把所有中轉服務一概等同於惡意服務。

## 已公開研究證明：LLM API 憑證外洩是真實問題

2026 年 6 月的論文 **Mind your key: An Empirical Study of LLM API Credential Leakage in iOS Apps** 分析 444 個整合 LLM 的 iOS app，發現其中 282 個會在網路流量中暴露可利用的 LLM API credentials。研究列出三類模式：JWT token 外洩、未驗證的 backend proxy、明文 API key 傳輸。

這份研究不等於「所有 API 中轉站都偷 key」，但它證明了幾件事：

1. LLM API key 和 proxy access token 已經是實際攻擊面。
2. 很多開發者把 proxy 設計成未驗證或弱驗證。
3. 攻擊者不一定需要入侵模型供應商；只要找到 app、proxy、日誌、前端或行動端的弱點，就可能偷到可用額度。

對使用者來說，這代表「用中轉站省錢」和「把中轉 token 放進客戶端」都不能草率處理。對站長來說，這代表中轉服務一旦沒有權限隔離、限流、審計與密鑰輪替，很快就會變成別人的免費算力池。

## 私鑰和加密貨幣被偷：AI API 中轉站不是唯一場景，但風險邏輯相同

公開資料中，更容易找到的是 AI 外掛、開發者供應鏈和惡意套件偷取私鑰、瀏覽器密碼、SSH key、雲端憑證的案例。

例如 The Verge 報導 OpenClaw 的第三方 skill / extension 生態出現大量惡意擴充，研究者發現部分擴充偽裝成加密貨幣工具，實際上會竊取 crypto wallet keys、SSH credentials 和 browser passwords。這是 AI agent / extension 生態的案例，不是傳統 API 中轉站案例，但它說明了同一件事：一旦 AI 工具取得檔案、終端機、瀏覽器或憑證環境的存取權，攻擊面會迅速擴大。

2025 年也有多起 npm / JavaScript 供應鏈攻擊被公開報導，惡意套件會竊取開發者憑證，或攔截加密貨幣交易並導向攻擊者地址。這些案例同樣不是「AI API 中轉站直接偷私鑰」的證據，但能證明攻擊者確實有動機鎖定開發者環境、API keys、錢包私鑰和自動化工作流。

所以，合理結論不是「每個中轉站都會偷私鑰」，而是：

> 不可信的 AI API 中轉站、惡意 AI 外掛、惡意套件、未驗證 proxy 都屬於同一類供應鏈信任問題。只要它們位於請求、程式碼或執行環境中間，就有機會取得敏感資料。

## 「直接自動化攻擊」什麼情況下會發生？

單純的 API 中轉站通常只是轉送文字、圖片或模型請求；它本身不一定能操作你的電腦。但在下面幾種情境中，風險會升級成自動化攻擊：

1. 你把中轉站提供的 SDK、瀏覽器外掛、桌面客戶端或命令列工具裝到本機。
2. 你的 AI agent 連接了 shell、瀏覽器、自動化工具、MCP server、雲端 API 或錢包工具。
3. 你把 token、密碼、私鑰或後台 cookie 貼進 prompt。
4. 中轉站不只轉送，還會改寫 system prompt、插入 tool call、替換 model response。
5. 你的程式把模型輸出當成命令執行，沒有人工確認或權限限制。

OWASP LLM Top 10 和多個 prompt injection 研究都把敏感資訊外洩、過度代理權限、工具濫用列為 LLM 應用的重要風險。這代表問題不只在「模型會不會亂答」，而是在「模型輸出是否能觸發真實操作」。

如果一個中轉站同時提供「便宜 API」、「自動寫程式工具」、「瀏覽器外掛」、「一鍵部署腳本」、「MCP 工具包」，風險就不能只用 API 價格來評估。你需要把它當成會進入開發環境的軟體供應鏈來看。

## 跑路、惡意漲價、註冊機與封號：低價中轉站的另一組現實問題

AI API 轉售站常見的商業模式是先收充值，再由站方統一向上游購買或使用模型額度。這會產生幾個現實問題：

- 上游帳號被封，使用者 API 立刻不可用。
- 站方低價補貼撐不住，直接關站。
- 站方先用低價吸引用戶充值，再惡意調高價格或調整倍率。
- 站方沒有公司資料、退款條款和客服紀錄，餘額難以追回。
- 使用者不知道請求實際走哪個模型、哪個地區、哪個供應商。
- 站方可能用不合規方式取得上游額度，導致服務不穩。
- 站方或上游濫用註冊機、自動化註冊免費帳號、薅試用額度，帳號被風控後整批服務失效。

這類「跑路、惡意漲價、註冊機薅免費帳號導致被封」在社群討論中並不少見，也符合低價灰色轉售服務的商業誘因：當上游成本、風控或帳號來源不可持續時，營運者最容易把損失轉嫁給充值用戶，或者直接關站消失。

嚴格來說，目前仍缺少一個可靠的公開資料庫去統計「AI API 中轉站跑路率」或「惡意漲價比例」，所以不應憑空寫成某個百分比。但風險本身不是幻想；它是低價預付費、匿名營運、灰色上游、缺乏契約與缺乏退款保障共同造成的真實營運風險。

## 怎麼判斷一個中轉站比較可信？

可以用下面這份檢查表。

### 身分與合規

- 是否有公司名稱、註冊地、服務條款、隱私政策和退款政策？
- 是否說明上游模型供應商與資料處理方式？
- 是否明確禁止濫用、攻擊、掃描、詐騙和違法用途？
- 是否提供正式客服與安全通報管道？

### 日誌與資料

- 是否說明會不會記錄 prompt、response、IP、User-Agent、API key、錯誤堆疊？
- 是否能關閉 request/response payload 日誌？
- 日誌保存多久？誰能看？
- 是否有資料刪除方式？
- 是否提供 DLP 或敏感字串遮罩？

### 金鑰與權限

- 是否支援每個專案獨立 key？
- 是否支援限額、限速、模型白名單、IP allowlist？
- 是否能一鍵撤銷 key？
- 是否能看每把 key 的用量？
- 是否禁止把 admin key 放在前端或 app 內？

### 技術行為

- 是否完全相容 OpenAI API，但不要求安裝奇怪的本機程式？
- 是否使用 HTTPS？
- 是否有公開狀態頁？
- 是否提供錯誤碼與上游錯誤透明度？
- 是否會改寫模型回覆或插入廣告、提示詞、額外工具呼叫？

### 付款與跑路風險

- 是否只接受不可追回的付款方式？
- 是否要求一次充值大額餘額？
- 是否有最低消費陷阱？
- 是否有退款紀錄或清楚規則？
- 是否在社群中頻繁換域名、換品牌、刪公告？

## 安全使用建議

1. 不要把密碼、私鑰、助記詞、session cookie、SSH key、雲端 long-lived token 貼進任何 AI。
2. 不要把不可信中轉站用在公司內部程式碼、客戶資料、法律文件、財務資料或未公開產品資料上。
3. 只給中轉 key 最小額度，並設定每日或每月上限。
4. 每個專案使用不同 key，不要多人共用同一把 key。
5. 定期輪替 key，停用不用的 key。
6. 不要在前端、手機 app、公開 GitHub repo、瀏覽器外掛中硬編碼中轉 token。
7. 高風險任務使用官方 API、企業閘道或自架 proxy。
8. 如果一定要用低價中轉站，先用測試資料、低額充值、非敏感場景試用。
9. 避免安裝來源不明的 AI 客戶端、外掛、腳本和 npm / PyPI 套件。
10. 對 AI agent 的 shell、瀏覽器、雲端 API、錢包操作加上人工確認和最小權限。

## 最後結論

AI API 中轉站不是天生邪惡。企業閘道、自架 proxy、成本統計與模型路由都是合理需求。真正的問題是：**你把所有 prompt、程式碼、token 和業務資料交給誰？你知道它記錄什麼嗎？你能刪除嗎？你能追責嗎？**

關於「中轉站記錄帳密、偷加密貨幣私鑰、甚至自動化攻擊」這類說法，現在已經不能只停留在假設層面。**Your Agent Is Mine** 已經在真實付費與免費 LLM API routers 樣本中測到惡意注入、AWS canary credentials 被觸碰，以及 ETH private key 被 drain。這代表惡意中轉站不是理論恐嚇，而是被公開研究觀察到的供應鏈攻擊面。

跑路、惡意漲價、註冊機薅免費帳號導致風控封號，則更偏向營運與灰色轉售風險。這類案例在社群中反覆出現，但不應亂編比例；比較可靠的結論是：低價中轉站的成本不只在 token 價格，也包含資料信任、餘額安全、上游來源與服務可持續性。

## 參考資料

- [Cloudflare AI Gateway Logging](https://developers.cloudflare.com/ai-gateway/observability/logging/)
- [LiteLLM Proxy Logging](https://docs.litellm.ai/docs/proxy/logging)
- [Your Agent Is Mine: Measuring Malicious Intermediary Attacks on the LLM Supply Chain](https://arxiv.org/abs/2604.08407)
- [Mind your key: An Empirical Study of LLM API Credential Leakage in iOS Apps](https://arxiv.org/abs/2606.12212)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [The Verge: OpenClaw's AI skill extensions are a security nightmare](https://www.theverge.com/news/874011/openclaw-ai-skill-clawhub-extensions-security-nightmare)
- [TechRadar: Dangerous npm packages are targeting developer credentials](https://www.techradar.com/pro/security/dangerous-npm-packages-are-targeting-developer-credentials-on-windows-linux-and-mac-heres-what-we-know)
- [Tom's Hardware: JavaScript packages compromised with crypto-stealing code](https://www.tomshardware.com/tech-industry/cyber-security/javascript-packages-with-billions-of-downloads-were-injected-with-malicious-code-in-worlds-largest-supply-chain-hack-geared-to-steal-crypto-a-phishing-email-is-all-it-took-to-undermine-npm-packages)
- [ITPro: GitHub is awash with leaked AI company secrets](https://www.itpro.com/security/github-is-awash-with-leaked-ai-company-secrets-api-keys-tokens-and-credentials-were-all-found-out-in-the-open)
