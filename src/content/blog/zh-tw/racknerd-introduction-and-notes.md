---
title: 'RackNerd 介紹與購買前注意事項'
pubDate: 2026-06-18
description: '整理 RackNerd 官方網站目前可確認的 KVM VPS、Ryzen VPS、Dedicated Server 價格、服務特色與購買前需注意的條款。'
category: '伺服器'
categoryPath: ['伺服器', '主機服務']
tags: ['主機服務', 'VPS']
---

> 查詢日期：2026-06-18。價格、促銷與庫存會變動，本文只整理 RackNerd 官方網站當天可確認的公開資訊；付款前請以官方訂單頁最後顯示為準。

[RackNerd](https://www.racknerd.com/) 是 RackNerd LLC 的 IaaS 主機服務商。官方 Terms of Service 寫明 RackNerd LLC 是 Delaware 註冊公司，辦公與郵寄地址為 10602 N. Trademark Pkwy Suite 511, Rancho Cucamonga, CA, USA 91730。

官方首頁介紹 RackNerd 提供 dedicated servers、colocation、private cloud 與 virtual private servers，並列出 KVM VPS、AMD Ryzen VPS、Windows VPS、Hybrid Servers、Bare Metal Servers、AMD Ryzen Dedicated Servers、Unmetered Servers、SEO Dedicated Servers、Colocation 等分類。

## 目前官方頁面顯示的起價

RackNerd 首頁在查詢時顯示：

- KVM VPS starting at $2.24/month
- Hybrid Servers $39/month
- Dedicated Servers $139/month
- Colocation 首頁卡片顯示 $99/month；同一頁上方介紹 colocation 也出現 starting at $179/month，因此實際 colocation 價格需看 colocation 訂單頁確認

首頁頂部也顯示 dedicated servers 可使用 `15OFFDEDI` 取得 life-time 15% off 的促銷碼，但該區塊標示為 current promotions / while available，因此下單前要確認仍可使用。

## KVM VPS 價格

[KVM VPS](https://www.racknerd.com/kvm-vps) 頁面說明使用 KVM virtualization、RAID-10 Pure SSD storage、1 Gbps 連線、full root admin access，並列出 Los Angeles、San Jose、Seattle、Dallas、Atlanta、Chicago、New York、Ashburn、Amsterdam、France、Dublin、Toronto 等可用地點。

| RAM    | CPU     | 儲存               | 流量           | IPv4      | 價格         |
| ------ | ------- | ------------------ | -------------- | --------- | ------------ |
| 512 MB | 1 vCore | 30 GB RAID-10 SSD  | 500 GB @ 1Gbps | 1 Free IP | $26.99/year  |
| 1 GB   | 2 vCore | 50 GB RAID-10 SSD  | 1 TB @ 1Gbps   | 1 Free IP | $17.99/month |
| 2 GB   | 3 vCore | 75 GB RAID-10 SSD  | 2 TB @ 1Gbps   | 1 Free IP | $20.59/month |
| 4 GB   | 4 vCore | 130 GB RAID-10 SSD | 3 TB @ 1Gbps   | 1 Free IP | $24.59/month |
| 6 GB   | 5 vCore | 170 GB RAID-10 SSD | 4 TB @ 1Gbps   | 1 Free IP | $27.59/month |
| 8 GB   | 6 vCore | 220 GB RAID-10 SSD | 5 TB @ 1Gbps   | 1 Free IP | $36.59/month |
| 12 GB  | 7 vCore | 300 GB RAID-10 SSD | 6 TB @ 1Gbps   | 1 Free IP | $55.99/month |

KVM VPS FAQ 寫明 VPS 套餐在訂單完成後 instant activation；洛杉磯與法國地點可透過 ticket 申請最多 100 個免費 IPv6 位址，更多地點會陸續支援。

## AMD Ryzen VPS 價格

[AMD Ryzen VPS](https://www.racknerd.com/ryzen-vps) 頁面說明使用 AMD Ryzen 3900X、NVMe SSD、KVM virtualization，並列出 Linux OS 選項包含 CentOS、AlmaLinux、Debian、Ubuntu 等。

| RAM    | CPU      | 儲存           | 流量           | IPv4      | 價格         |
| ------ | -------- | -------------- | -------------- | --------- | ------------ |
| 512 MB | 1 vCore  | 10 GB NVMe SSD | 500 GB @ 1Gbps | 1 Free IP | $26.99/year  |
| 1 GB   | 1 vCore  | 15 GB NVMe SSD | 1 TB @ 1Gbps   | 1 Free IP | $17.99/month |
| 2 GB   | 2 vCores | 20 GB NVMe SSD | 2 TB @ 1Gbps   | 1 Free IP | $20.59/month |
| 4 GB   | 2 vCores | 30 GB NVMe SSD | 3 TB @ 1Gbps   | 1 Free IP | $24.59/month |
| 6 GB   | 3 vCores | 45 GB NVMe SSD | 4 TB @ 1Gbps   | 1 Free IP | $27.59/month |
| 8 GB   | 3 vCores | 75 GB NVMe SSD | 5 TB @ 1Gbps   | 1 Free IP | $36.59/month |
| 12 GB  | 4 vCores | 90 GB NVMe SSD | 6 TB @ 1Gbps   | 1 Free IP | $55.99/month |

Ryzen VPS FAQ 寫明 Los Angeles DC-02 可透過 ticket 申請最多 100 個免費 IPv6 位址。

## Dedicated Server 價格

[Dedicated Servers](https://www.racknerd.com/dedicated-servers) 頁面說明 bare metal dedicated servers 通常 48 小時內部署，多數情況可 same-day；頁面也列出 full root access、remote power reboot、IPMI / KVM access。

| CPU                        | 儲存                       | RAM    | 流量           | IPv4   | 地點                 | 價格       |
| -------------------------- | -------------------------- | ------ | -------------- | ------ | -------------------- | ---------- |
| Intel Xeon E3-1230 v2      | 480 GB SSD                 | 16 GB  | 35 TB @ 1Gbps  | 5 IPs  | See Order Form       | $139/month |
| Intel Xeon E3-1270 v3      | 2x 1 TB SSD                | 32 GB  | 35 TB @ 1Gbps  | 5 IPs  | See Order Form       | $169/month |
| Dual Intel Xeon E5-2650 v2 | 1 TB SSD                   | 64 GB  | 100 TB @ 1Gbps | 5 IPs  | First Available (US) | $199/month |
| Dual Intel Xeon E5-2650 v2 | 1 TB SSD + 3 TB HDD        | 128 GB | 50 TB @ 1Gbps  | 5 IPs  | First Available (US) | $245/month |
| Dual Intel Xeon E5-2650 v2 | 4x 2 TB SSD                | 256 GB | 100 TB @ 1Gbps | 29 IPs | First Available (US) | $349/month |
| Dual Intel Xeon E5-2680 v4 | 4x 2 TB SSD                | 256 GB | 100 TB @ 1Gbps | 61 IPs | First Available (US) | $399/month |
| Dual Intel Xeon E5-2640 v2 | 256 GB SSD + 10x 16 TB HDD | 64 GB  | 200 TB @ 1Gbps | 5 IPs  | Los Angeles DC-02    | $479/month |

Dedicated server FAQ 寫明庫存與地點會依 order form 顯示為準；若需要不同配置，可以聯絡 RackNerd 詢價。

## 購買前注意事項

1. RackNerd Terms of Service 寫明 Shared Hosting、Reseller Hosting、Hybrid Servers、KVM VPS 是收到訂單與付款後立即交付；Dedicated Servers / Bare Metal Servers 與 domain registrations 可能需要最多 72 小時。
2. Refunds 預設不是付款後自動提供，而是 case-by-case；account credit 等預付款不可退款。
3. 取消服務需要在續約日前 5 天透過 client area 提交 written notice；合約型服務需要 7 天。
4. 取消時伺服器資料會立即移除，因此取消前必須先自行備份。
5. TOS 明確禁止 spam、copyright infringement / DMCA、過度資源使用、cryptocurrency mining、email spamming、bruteforce attacks、outbound DDoS、CPU mining、Traffic Exchange 等。
6. VPS 使用者需要以 fair share 方式使用 Disk I/O 與 CPU；若需要長時間吃滿資源，官方建議改用 dedicated server。
7. Dedicated server 每個 billing cycle 提供 1 次免費 OS reload；同一週期額外 OS reload 需 $25。
8. RackNerd SLA 寫明 transit 與 electricity 的月度 99.999% 目標；符合條件時 credit 需在事件後 30 天內申請，且帳號不能逾期。

## 適合誰

RackNerd 適合需要多地點、低門檻 VPS、能接受 self-managed 主機模式的使用者。KVM VPS 的年付入門方案價格低，適合測試、小型服務與學習；Ryzen VPS 偏向需要較高單核效能與 NVMe I/O 的用途；Dedicated Server 則適合需要完整硬體控制、IPMI/KVM、較高流量或多 IP 的場景。

真正下單前，建議把地點、IPv6、作業系統、是否可退款、取消日期、SLA credit 條件、資料備份與促銷碼是否仍有效逐項確認。這些細節比單看月費更容易影響後續使用成本。

## 社群優惠資訊

RackNerd 的優惠有時也會出現在 [LowEndTalk](https://lowendtalk.com/) 這類主機社群，尤其是限時活動或特價方案。這類貼文適合用來發現優惠，但不要直接當成最終條款；付款前仍應回到 RackNerd 官方下單頁確認結帳價格、庫存、計費週期、優惠碼有效性與退款規則。

## 官方來源

- [RackNerd 官方首頁](https://www.racknerd.com/)
- [RackNerd KVM VPS](https://www.racknerd.com/kvm-vps)
- [RackNerd AMD Ryzen VPS](https://www.racknerd.com/ryzen-vps)
- [RackNerd Dedicated Servers](https://www.racknerd.com/dedicated-servers)
- [RackNerd Terms of Service](https://www.racknerd.com/terms-of-service)
- [RackNerd Service Level Agreement](https://www.racknerd.com/service-level-agreement)
