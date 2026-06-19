---
title: 'NameCrane - CraneMail'
pubDate: 2026-04-06
category: 'Mail'
tags: ['namecrane', 'CraneMail', 'Managed Mail']
---

# Introduction to Crane Mail

Crane Mail is an email hosting service provided by NameCrane, a company under the parent company [BuyVM](https://buyvm.net/) (Frantech).

[BuyVM](https://buyvm.net/)'s primary business is VPS hosting, while [NameCrane](https://namecrane.com/)'s business is server hosting and Email Hosting.

[NameCrane](https://namecrane.com/) is also an ICANN-accredited domain registrar.

Crane Mail is primarily positioned as a business email service. It provides SpamExperts for anti-spam filtering, features email forwarding and alias services, and allows sending up to 600 emails per hour.

# Why Choose Crane Mail

Why did I choose Crane Mail?
I wanted an email address using my own domain to break away from the control of giant providers like Gmail (?). Furthermore, NameCrane's policy clearly states that they will not actively scan or probe user emails unless there's an obvious issue with the account (e.g., legal liabilities). Another main reason is their lifetime plans.
Actually, there is another service, [MXroute](https://www.mxroute.com/), that also offers lifetime plans, but they are usually only sold during Black Friday and are very hard to grab.

The owner of Crane Mail, [Francisco](https://lowendtalk.com/profile/Francisco), is highly active on the LowEndTalk forum, and BuyVM itself has an excellent reputation.

That's why I chose to purchase the Crane Mail service.

# Subscription Plans

Crane Mail offers basic subscriptions as well as lifetime plans.

**Subscription Plans**

| Capacity | Price                  | Number of Domains |
| -------- | ---------------------- | ----------------- |
| 100G     | 10 USD _Annually_      | 15                |
| 250G     | 15 USD _Semi-Annually_ | 20                |
| 1TB      | 10 USD _Monthly_       | 25                |
| 10TB     | 55 USD _Monthly_       | 70                |

**Lifetime Plans**

| Capacity | Price   | Number of Domains |
| -------- | ------- | ----------------- |
| 250G     | 75 USD  | 25                |
| 500G     | 150 USD | 100               |
| 750G     | 225 USD | 150               |

These are just a few of the plans available; please check the [NameCrane website](https://namecrane.com/store/email-hosting-deals) for full details.

- Detailed pricing is subject to the official NameCrane website.
- "Lifetime" refers to the lifespan of the website or product.

# Purchasing Notes

If you want to pay with PayPal, you will be required to register a NameCrane account with the exact same email address you use for PayPal.
(e.g., if the email used for PayPal is `abc@abc.com`, then the email used for the NameCrane account must also be `abc@abc.com`).

If you value your privacy, it is highly recommended to use other payment methods, or even cryptocurrency.

# Web Mail

The web UI for [CraneMail](https://namecrane.com/cranemail-email-hosting) is provided by [SmarterMail](https://www.smartertools.com/smartermail/business-email-server). Make sure to enable 2FA after logging in.
You can view the application passwords in the settings.

![2fa.jpg](/images/CraneMail/2fa.jpg)

## CraneMail Supported Protocols

- Europe Region: `eu1.workspace.org`
- US Region: `us1.workspace.org`

| Protocol              | Purpose             | Hostname                            | Port     | SSL/TLS      |
| --------------------- | ------------------- | ----------------------------------- | -------- | ------------ |
| SMTP                  | Send Mail           | eu1.workspace.org/us1.workspace.org | 465/2465 | Yes/Implicit |
| SMTP                  | Send Mail           | eu1.workspace.org/us1.workspace.org | 587/2587 | Yes/Explicit |
| IMAP                  | Receive/Sync        | eu1.workspace.org/us1.workspace.org | 993      | Yes/Implicit |
| IMAP                  | Receive/Sync        | eu1.workspace.org/us1.workspace.org | 143      | No           |
| POP                   | Receive/Download    | eu1.workspace.org/us1.workspace.org | 995      | Yes/Implicit |
| POP                   | Receive/Download    | eu1.workspace.org/us1.workspace.org | 110      | No           |
| EAS                   | ActiveSync Exchange | eu1.workspace.org/us1.workspace.org | N/A      | N/A          |
| WebDAV/CardDAV/CalDAV | File Management     | https://eu1.workspace.org/webdav/   | N/A      | N/A          |
| XMPP                  | Instant Messaging   | eu1.workspace.org/us1.workspace.org | 5222     | Yes/Explicit |
| FTPS                  | File Transport      | eu1.workspace.org/us1.workspace.org | 8221     | Yes/Explicit |
| FTP                   | File Transport      | eu1.workspace.org/us1.workspace.org | 8231     | No           |

# eM Client

SmarterMail comes with an option to request an eM Client license key.

Go to the web mail page of your admin account, navigate to the Domain Market, select eM Client, and click request code. After a prompt appears, wait for your activation code email.

This license corresponds to the Business plan and is valid for one year.

**Note:** This license key is provided by SmarterMail and has no relation to NameCrane.

# Personal Experience

So far, I've had no issues receiving emails. When using my own `.xyz` domain, emails were initially blocked by SpamExperts, so I had to manually release them from the SpamExperts quarantine. When releasing emails, you can choose to train the filter; once trained, they will no longer be blocked.
As for sending emails, funnily enough, I don't send many emails myself. However, in my tests, sending emails from my `.com` domain to Gmail or Outlook went through without any issues.
While Crane Mail is positioned as a business email service, sending spam or harassment emails is strictly prohibited. If discovered, your account will be banned.

I saw someone complain in the community that using this service to send out automated website registration welcome emails got them flagged for sending spam, requiring them to contact support to have their account unbanned. You might want to be careful about this.
Later, official staff in the community advised against using high-risk domains like `.xyz` for such purposes, and recommended adding a verification mechanism to the registration page to prevent bots from submitting massive email requests.
