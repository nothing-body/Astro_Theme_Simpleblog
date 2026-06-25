---
title: 'NameCrane - CraneMail'
pubDate: 2026-04-06
category: '隱私與信箱'
categoryPath: ['隱私與信箱', '電子郵件']
tags: ['電子郵件', '隱私']
---

# Crane Mail介紹

Crane Mail 是 NameCrane 提供的網域郵局服務，NameCrane 是母公司 [BuyVM](https://buyvm.net/) Frantech 旗下的公司。

[BuyVM](https://buyvm.net/)的業務是虛擬主機，而[NameCrane](https://namecrane.com/)業務是主機託管跟Email Hosting

[NameCrane](https://namecrane.com/)同時也是ICANN 認證的域名註冊商

Crane Mail主打是企業郵箱也提供SpamExperts作為反垃圾郵件服務，並且有轉傳和別名服務，一小時能寄送600封信件

# 為什麼選擇Crane Mail

為什麼選擇Crane Mail呢？
因為我想要一個用自己域名的信箱，脫離gmail等大廠商的控制(?)，NameCrane政策也有說明，除非有明顯帳號產生什麼問題(e.g. 法律責任)，不然不會主動掃描和探查用戶信件，還有是因為終身方案。
其實還有還有另一個服務[mxroute](https://www.mxroute.com/)也有提供終身方案，但僅限在黑五期間販售也很難搶

Crane Mail的老闆[Francisco](https://lowendtalk.com/profile/Francisco)在lowendtalk論壇上很活躍，BuyVM評價也很好

所以我選擇購買Crane Mail服務

# 訂閱方案

Crane Mail有基礎訂閱也有提供終身方案
訂閱方案

| 容量 | 價格            | 能用域名數量 |
| ---- | --------------- | ------------ |
| 100G | 10 USD _年_     | 15           |
| 250G | 15 USD _六個月_ | 20           |
| 1TB  | 10 USD _月_     | 25           |
| 10TB | 55 USD _月_     | 70           |

### 終身方案

| 容量 | 價格    | 能用域名數量 |
| ---- | ------- | ------------ |
| 250G | 75 USD  | 25           |
| 500G | 150 USD | 100          |
| 750G | 225 USD | 150          |

這只是一部分方案，詳細查看[NameCrane網站](https://namecrane.com/store/email-hosting-deals)

- 詳細價格依照NameCrane價格為準
- 終身是指網站或產品壽命

# 購買注意

如要用PayPal付款，會要求註冊NameCrane網站的信箱，跟PayPal使用的信箱一樣。
(e.g. paypal使用的信箱是abc@abc.com那NameCrane帳號使用的信箱也必須是abc@abc.com)

如想隱私建議是使用其他付款方式，甚至是使用加密貨幣

# Web Mail

[CraneMail](https://namecrane.com/cranemail-email-hosting)的web UI是[SmarterMail](https://www.smartertools.com/smartermail/business-email-server)的web UI 登入後開啟2FA
能查看到應用程式密碼
![2fa.jpg](/images/CraneMail/2fa.jpg)

## CraneMail支援協議

- 歐區 eu1.workspace.org
- 美區 us1.workspace.org

| 協議                  | 用途                | 主機名                                                                 | 端口     | SSL/TLS |
| --------------------- | ------------------- | ---------------------------------------------------------------------- | -------- | ------- |
| SMTP                  | 發信                | eu1.workspace.org/us1.workspace.org                                    | 465/2465 | 是/隱式 |
| SMTP                  | 發信                | eu1.workspace.org/us1.workspace.org                                    | 587/2587 | 是/顯式 |
| IMAP                  | 收信/同步           | eu1.workspace.org/us1.workspace.org                                    | 993      | 是/隱式 |
| IMAP                  | 收信/同步           | eu1.workspace.org/us1.workspace.org                                    | 143      | 否      |
| POP                   | 收信/下載           | eu1.workspace.org/us1.workspace.org                                    | 995      | 是/隱式 |
| POP                   | 收信/下載           | eu1.workspace.org/us1.workspace.org                                    | 110      | 否      |
| EAS                   | ActiveSync Exchange | eu1.workspace.org/us1.workspace.org                                    | N/A      | N/A     |
| WebDAV/CardDAV/CalDAV | 文件管理            | https://eu1.workspace.org/webdav/ 或 https://us1.workspace.org/webdav/ | N/A      | N/A     |
| XMPP                  | 即時通訊            | eu1.workspace.org/us1.workspace.org                                    | 5222     | 是/顯式 |
| FTPS                  | 文件傳輸            | eu1.workspace.org/us1.workspace.org                                    | 8221     | 是/顯式 |
| FTP                   | 文件傳輸            | eu1.workspace.org/us1.workspace.org                                    | 8231     | 否      |

# eM Client

SmarterMail自帶能申請一個eM Client的授權碼

進入管理員帳號web mail頁面，進入域市場選擇 eM Client，點擊請求代碼，出現提示後，等待啟動碼信箱

這個授權是Business方案，有效期限是一年

這個授權碼是SmarterMail提供的跟NameCrane沒有任何關係

# 心得

目前使用起來信件基本都收的到，用我自己的xyz域名有SpamExperts阻擋，需要到SpamExperts放信進來，SpamExperts放進時能選擇訓練，訓練好以後就不會被阻擋了。

寄信的話，說來好笑，我自己沒什麼在寄信，測試寄信用自己的.com寄送到gmail或者outlook都沒問題

Crane Mail主打是企業郵箱，但是不允許寄送騷擾信件，被發現會被封禁帳號。

在社群有看到有人抱怨用來當用戶註冊網站帳號的歡迎信件，會被當成發送垃圾郵件，需要請客服解封帳號，這點可能要注意一下。

後續社群內的官方人員建議不要用.xyz這類，高危險域名來使用，且註冊頁面添加驗證機制以防被機器人大量請求信件
