# Connect `Lot-Keys.ca` to LotKeys

The repository now contains a root `CNAME` file for `lot-keys.ca`. Complete these steps in this order.

## 1. Secure the domain in GitHub first

1. In GitHub, open **Settings → Pages** for `MrMilo34/Lot-Keys`.
2. In **Custom domain**, enter `lot-keys.ca` and save.
3. In the GitHub account's Pages/domain settings, verify ownership of `lot-keys.ca` if GitHub offers the verification TXT record.

GitHub recommends adding the custom domain to the repository before pointing DNS at it, and recommends domain verification to reduce takeover risk.

## 2. Add these Cloudflare DNS records

Delete any default parking `A`, `AAAA`, or `CNAME` record for the same host first. Do not create a wildcard record.

| Type | Name | Target | Proxy for first setup |
|---|---|---|---|
| A | `@` | `185.199.108.153` | DNS only |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |
| CNAME | `www` | `MrMilo34.github.io` | DNS only |

Use **Auto** TTL. Keep the Cloudflare clouds gray/DNS-only until GitHub's certificate is active. GitHub can then redirect `www.lot-keys.ca` to the apex address.

## 3. Enable HTTPS

Return to **GitHub → Settings → Pages**. Wait for the DNS check and certificate to finish, then enable **Enforce HTTPS**. DNS and certificate provisioning can take time; GitHub says DNS changes may take up to 24 hours.

## 4. Update Google OAuth

In the existing Google OAuth Web Client add these exact **Authorized JavaScript origins**:

- `https://lot-keys.ca`
- `https://www.lot-keys.ca`
- Keep `https://mrmilo34.github.io` during the transition.

Origins contain only the scheme and hostname—no `/Lot-Keys/` path and no trailing page name.

In Google Auth Platform, add `lot-keys.ca` as an authorized domain and use:

- Home page: `https://lot-keys.ca/`
- Privacy policy: `https://lot-keys.ca/privacy.html`
- Terms: `https://lot-keys.ca/terms.html`

Verify the domain through Google Search Console before production brand verification.

## 5. Verify the release

- Open `https://lot-keys.ca/?build=09451` in a private browser tab.
- Confirm the address remains HTTPS.
- Confirm Account sign-in opens Google's real account chooser.
- Confirm `https://lot-keys.ca/install.html` loads and offers installation on supported devices.
- Confirm the in-app Post Buddy card downloads the current ZIP.
- Confirm the old GitHub Pages URL still reaches LotKeys or redirects during the transition.

Official references:

- GitHub: <https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site>
- GitHub HTTPS: <https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https>
- Google web client setup: <https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid>
- Google production policy: <https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance>
