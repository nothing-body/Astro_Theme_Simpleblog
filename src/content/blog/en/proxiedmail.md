---
title: 'Proxiedmail Email Alias Service'
pubDate: 2026-03-16
category: 'Alias'
tags: ['Email Alias', 'Privacy', 'Closed Source']
---

# Introduction to Proxiedmail

[ProxiedMail](https://proxiedmail.com?r=MiInBYbsah) is a privacy-focused "Email Proxy" and alias management service.
Its primary function is to generate proxy emails (aliases) that automatically forward received emails to your real personal or work inbox (such as Gmail, ProtonMail, Outlook, etc.). This helps prevent your real email address from being leaked, reduces spam, and mitigates the risk of data breaches.

## Core Features and Highlights

- **Unlimited Proxy Emails:** Users can create an unlimited number of alias emails ending with official domains like @proxiedmail.com.

- **Custom Domain Support:** Allows you to bind your own unique domains (e.g., contact@yourdomain.com) and use them to send, receive, and forward emails.

- **Two-Way Communication (Direct Reply Support):** This is the biggest difference between [ProxiedMail](https://proxiedmail.com?r=MiInBYbsah) and typical one-way "disposable mailboxes." When you reply to a forwarded email from your real inbox, the message is routed through ProxiedMail and sent to the recipient using the "proxy email" identity. Assuming routing works as intended and headers do not leak extra metadata, the recipient normally will not directly see your real email address.

- **Developer Friendly (API & Webhook):** Provides full API support, allowing developers to automatically generate aliases via code or send received email content directly to their own applications via Webhooks (official open-source Laravel / PHP receiver packages are available).

- **Long-Lived Aliases and No Long-Term Email Storage:** Generated aliases usually remain active unless you delete them, disable forwarding, or plan rules change. ProxiedMail's servers are designed as simple forwarding nodes and do not store your email content long-term; emails are delivered directly to your real inbox.

- **No Vendor Lock-in:** You can change your forwarding target (e.g., from Gmail to ProtonMail) in the dashboard at any time without needing to update your email address on every website you've registered with.

## Why Choose ProxiedMail?

With open-source alternatives like SimpleLogin and Addy.io, and closed-source options like Apple's "Hide My Email," why pay attention to this service?

ProxiedMail is niche. Using domains provided by ProxiedMail when registering on websites is less likely to be blocked compared to SimpleLogin or Addy.io domains, which are often flagged and may lead to registration rejections. Additionally, ProxiedMail emphasizes developer-friendly features like Webhooks and APIs.

## ProxiedMail Pricing Plans

[ProxiedMail](https://proxiedmail.com?r=MiInBYbsah) offers Free, Plus, and Forever plans.

### 1. Free Plan (Personal)

The Free plan provides a generous foundation for general personal users; current limits and pricing should still be checked against the official plan page.

- **Proxy Emails:** Up to 10 proxy emails.
- **Inactivity Limit:** Up to 3 unused proxy emails.
- **Custom Domains:** Impressively, the free version supports binding up to 50 custom domains.
- **Real Email Binding:** Limited to 1 real email address for forwarding.
- **Reply Function:** Supports replying directly from proxy emails.
- **Advanced Features:** Includes Webhook and API access (up to 2,000 requests per month) and wildcard support (\*@proxy-email).
- **Security & Support:** Uses 3DES encryption and advertises customer support within 24 hours.

### 2. Plus Plan (Subscription)

**Price:** `$20 USD` / year (with a 14-day money-back guarantee).
Suitable for users who need to manage a large number of emails, prioritize extreme privacy, or have small team collaboration needs.

- **Unlimited Access:** Includes all Free plan features, upgraded to unlimited proxy emails, unlimited custom domains, and no limit on unused emails.
- **Real Email Expansion:** Supports binding up to 50 real emails (more can be requested from support), ideal for one-to-many forwarding scenarios.
- **Outbound Sending:** Not just for replying; it also supports sending new "outbound emails" from proxy addresses.
- **Security & Privacy Enhancements:** Adds Multi-Factor Authentication (MFA), an extra layer of AES encryption, data breach notifications, and email tracking protection.
- **Quality of Service:** 99.9% uptime SLA guarantee and faster priority support.
- **Advanced Tools:** API/Webhook request limit increased to 10,000 per month, support for deleting proxy emails, built-in proxy email password manager, and includes a ProxiedMail ChatGPT mail bot (up to 50 messages).

### 3. Forever Plan (Lifetime)

**Price:** `$60 USD` / One-time payment (Note: Images may show limited-time winter discounts; standard price is `$60 USD`, also with a 14-day money-back guarantee).
This is an extremely rare plan in this category, focusing on "rejecting subscriptions" and "fighting inflation."

- **Pay Once, Use Forever:** Includes all "Plus" features with no recurring annual fees.
- **Market Scarcity:** The official team emphasizes that few other providers offer lifetime buy-out options for "unlimited domains and unlimited proxy emails."

_\* "Forever" typically refers to the lifetime of the product or the provider._

## Adding Your Real Email Address in Proxiedmail

In the Dashboard, look for "Enter your real email."
![add address.png](/images/ProxiedMail/add-address.png)

Enter the email address you want to add directly into the box. Once successful, you will see it under "Your proxy-emails." A confirmation email will be sent to the address you added; you must verify it before you can send or receive mail.

If you want a custom username for the generated alias, fill in the "Proxy Address" field; otherwise, the system will auto-generate one.

To change the destination email address for a specific alias, click the downward triangle arrow next to "Enter your real email" and select "Manage real emails."
![add address-2.png](/images/ProxiedMail/add-address-2.png)

You will be redirected to this page:
![add address-3.png](/images/ProxiedMail/add-address-3.png)

To change an email address, click "Update" in the "Real emails" section and enter the new address.
![add address-4.png](/images/ProxiedMail/add-address-4.png)

A confirmation email will be sent to the new address. After verification, emails sent to that alias will be forwarded to the new address instead of the old one.

## Deleting Email Addresses

To delete an added real email address, you must first delete all associated entries in the "Your proxy-emails" list. Once they are gone, the real email address can be removed.

## Adding Your Own Domain

You must own a domain (purchased or obtained for free) to add it.

Click "Manage" next to "Choose domain."
![add domian.png](/images/ProxiedMail/add-domian.png)

Click "Add Domain."
![add domian-1.png](/images/ProxiedMail/add-domian-1.png)

After adding the domain, you will be given DNS settings. It is recommended to add all of them and ensure they pass verification for security.

Once added, click the downward arrow next to "Choose domain" to see your domain in the dropdown menu.
![add domian.png](/images/ProxiedMail/add-domian.png)

## Personal User Experience

Proxiedmail is a closed-source service. The Proxiedmail staff is quite active on Reddit and other platforms, often commenting on threads discussing email aliases.

When asked why it isn't open-source or when it will be, staff usually reply along the lines of: "There is a possibility in the future, but open-sourcing is not the current priority. Limited financial resources are focused on implementing or fixing more important features."

Therefore, those who strictly prefer open-source software might not consider this service.

In terms of usability, I find the dashboard not very intuitive. Some features require a bit of exploration to find and understand how to use. Interestingly, when navigating to certain pages, the top navigation bar disappears and there is no direct "back to dashboard" link.

This might be a minor bug in their UI.

However, given the Forever (lifetime) plan they offer, it is worth a try. Lifetime options for alias services are rare, and the price is quite reasonable.

_\* "Forever" typically refers to the lifetime of the product or the provider._

[ProxiedMail Official Website](https://proxiedmail.com?r=MiInBYbsah)
