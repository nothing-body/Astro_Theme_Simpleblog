---
title: 'Proxiedmail電子郵箱別名服務'
pubDate: 2026-03-16
category: '別名'
tags: ['電子郵件別名', '隱私', '閉源']
---

# Proxiedmail介紹

[ProxiedMail](https://proxiedmail.com?r=MiInBYbsah) 是一款隱私保護的「電子郵件代理（Email Proxy）」與別名管理服務。
它的主要功能是透過生成代理信箱（即別名），你可以將接收到的郵件自動轉發到真實的個人或工作信箱（如 Gmail、ProtonMail、Outlook 等），從而避免真實電子郵件地址外洩、減少垃圾郵件，並防範資料外洩的風險。

## 核心功能與特色

- 無限制的代理信箱： 用戶可以無限制地建立以 @proxiedmail.com 等官方網域結尾的別名信箱。

- 支援自訂網域： 允許綁定你自己的專屬網域（例如 contact@yourdomain.com），並利用這些自訂網域來收發與轉發郵件。

- 雙向通訊（支援直接回信）： 這是 [ProxiedMail](https://proxiedmail.com?r=MiInBYbsah) 與一般單向「免洗信箱」最大的差異。當你從真實信箱收到轉發來的信件並點擊「回覆」時，郵件會先經過 ProxiedMail 路由，然後以「代理信箱」的名義寄給對方；在服務正常路由與郵件標頭沒有額外洩漏的前提下，收件者通常不會直接看到你的真實電子郵件地址。

- 開發者友善（API 與 Webhook）： 提供完整的 API 支援，允許開發者透過程式碼自動生成別名，或透過 Webhook 將收到的郵件內容直接傳送到自家的應用程式中（官方有開源提供 Laravel / PHP 的接收套件）。

- 長期有效且不長期儲存郵件： 生成的別名通常會持續有效（除非你手動刪除、關閉轉發，或服務方案規則變更）。ProxiedMail 的伺服器設計為單純的轉發節點，不長期儲存你的郵件內容，郵件會直接送達你的真實信箱。

- 避免廠商鎖定（No Vendor Lock-in）： 你可以隨時在後台將轉發目標（例如從 Gmail 換成 ProtonMail），而不需要去所有已註冊的網站一一修改會員信箱。

## 為什麼選擇 ProxiedMail？

市面上已經有開源的 SimpleLogin、Addy.io ，閉源的有 Apple 的「隱藏我的電子郵件」，為什麼還要關注這款服務？

因為ProxiedMail小眾，註冊網站時使用ProxiedMail提供的網域，不會像SimpleLogin、Addy.io網域早就被各網站標記，可能因為使用服務提供的網域註冊帳號被拒絕。

ProxiedMail且主打Webhook/API 的開發者友善特性

## ProxiedMail有什麼方案?

[ProxiedMail](https://proxiedmail.com?r=MiInBYbsah) 提供Free、Plus、Forever方案

免費版 (Free - Personal)

對於一般個人使用者來說，免費版已經提供了相當慷慨的防護基礎；實際限制與價格仍以官方最新方案為準。

- 代理信箱數量： 最多 10 個代理信箱（Proxy-emails）。

- 閒置限制： 最多允許 3 個未使用的代理信箱。

- 自訂網域： 令人驚豔的是，免費版即支援綁定高達 50 個自訂網域。

- 真實信箱綁定： 僅限綁定 1 個真實信箱接收轉發。

- 回信功能： 支援直接從代理信箱回覆郵件。

- 進階功能： 支援 Webhook、API 存取（每月最高 2,000 次請求）、支援萬用字元（Wildcard \*@proxy-email）。

- 安全性與客服： 採用 3DES 加密，並保證在 24 小時內提供客服支援。

進階訂閱版 (Plus)

價格： `$20 USD` / 年（提供 14 天退款保證）
適合需要管理大量信箱、重視極致隱私或有小型團隊協作需求的使用者。

- 無限制解放： 包含免費版所有功能，並升級為無限制的代理信箱數量、無限制的自訂網域，且解除未使用信箱的數量限制。

- 真實信箱擴充： 支援綁定高達 50 個真實信箱（若有需求還可向官方申請增加），非常適合一對多轉發的情境。

- 主動發信： 不僅能回信，還支援「主動從代理信箱發送全新郵件」（Sending outbound emails）。

- 安全性與隱私強化： 加入多因素驗證 (MFA)、額外的 AES 加密層、資料外洩通知，以及電子郵件追蹤保護。

- 服務品質： 擁有 99.9% 運行時間 SLA 保證與最快的客服支援。

- 進階工具： API/Webhook 請求上限提升至每月 10,000 次、支援刪除代理信箱、內建代理信箱的密碼管理員，並附帶 ProxiedMail ChatGPT 郵件機器人（上限 50 則訊息）。

3. 終身買斷版 (Forever)

價格： `$60 USD` / 單次付費（註：圖片顯示為冬季限時 5 折優惠，原價為 `$60 USD`，同樣具備 14 天退款保證）
這是在同類服務中極為罕見的方案，官方主打「拒絕訂閱制」與「對抗通膨」。

- 一次付費，終身享有： 包含上述「Plus」進階版的所有功能，但只需支付一次費用，未來無需每年繳交訂閱費。

- 市場稀缺性： 官方強調，目前市場上幾乎沒有其他服務商針對「無限網域與無限代理信箱」提供終身買斷的選擇。

**_Forever通常指的是商品或廠商的壽命_**

## 在Proxiedmail新增自己的mail address

在Dashboard頁面內尋找『Enter your real email』
![add address.png](/images/ProxiedMail/add-address.png)
直接在框內輸入您要添加的mail address，添加成功後會在下方『Your proxy-emails』看見添加的mail address，同時請到您添加的mail address內有一封確認信到您添加的mail address，驗證通過後才能正常收發信

如您要自定生成的使用者名稱在『Proxy Address』填寫即可，不然系統會自動生成一個使用者名稱

如要更改某個生成的別名的目的mail address，點擊『Enter your real email』旁的向下三角箭頭
點擊Manage real emails
![add address-2.png](/images/ProxiedMail/add-address-2.png)

會轉跳到此頁面
![add address-3.png](/images/ProxiedMail/add-address-3.png)

如要更改mail address，在Real emails點擊Update填入要更改的mail address

![add address-4.png](/images/ProxiedMail/add-address-4.png)

之後會寄一封確認信到您添加的mail address，驗證後的郵件將會傳送到新設定的mail address。

## 刪除mail address

如要刪除已添加的真實地址的mail address，將『Your proxy-emails』內的列表相關的mail address全部刪除，這樣就能移除該真實的mail address

## 添加自己的域名

您必須擁有一個自己購買或免費獲取的域名才能添加域名

點擊『Choose domain』旁的Manage
![add domian.png](/images/ProxiedMail/add-domian.png)

點擊add domain

![add domian-1.png](/images/ProxiedMail/add-domian-1.png)

添加域名後會給對應設定的dns設定，建議要全數添加並驗證通過才安全

添加完畢後點擊Choose domain格子旁的向下箭頭就能在選單內看到該域名
![add domian.png](/images/ProxiedMail/add-domian.png)

## 使用心得

Proxiedmail是一個閉源服務，在Reddit或一些地方Proxiedmail工作人員算是十分活躍，提到Proxiedmail服務或者別名服務時會在底下留言

有被提問為什麼不開源？什麼時候開源？

Proxiedmail工作人員回覆類似這種回應『未來有機會會開源，但開源並非目前首要目標，財務費用不夠只能放在更重要的功能實現或修復上』

所以不喜歡閉源的人們，可能不會考慮這家服務

我自己使用上覺得操作面板不夠直覺，有些功能需要摸索一下才能知道在哪裡，怎麽用
且很有趣的事，點擊到一些頁面上方的導航欄位並沒有出現回到儀表板的選項，該頁面內也沒看到返回儀表板的連結

這可能是他們的一個小bug?

可衝著他們提供的Forever(lifetime)方案，值得一試這個服務，畢竟別名服務提供Forever(lifetime)很少見，且價格也不是那麼的貴

**_Forever(lifetime)通常指的是商品或廠商的壽命_**

[ProxiedMail](https://proxiedmail.com?r=MiInBYbsah) 官網
