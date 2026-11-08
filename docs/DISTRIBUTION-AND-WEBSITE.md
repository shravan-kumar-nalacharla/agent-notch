# Distribution, install pitch and website

## What is live

- Product site: https://shravan-kumar-nalacharla.github.io/agent-notch-site/
- Public release channel: https://github.com/shravan-kumar-nalacharla/agent-notch-releases/releases
- Stable download alias: `https://github.com/shravan-kumar-nalacharla/agent-notch-releases/releases/latest/download/Agent-Notch-Setup.exe`
- Private source: `shravan-kumar-nalacharla/agent-notch` (private)
- Site source: `shravan-kumar-nalacharla/agent-notch-site` (public static HTML/CSS/JS) and `site/` in the private source.

The release-only repository holds the installer, `latest.yml`, the NSIS blockmap, `SHA256SUMS.txt`, release notes and required notices. It never holds source archives or build evidence.

## Why not the Microsoft Store

The Store needs a paid developer account and a packaged MSIX path with its own review and update behavior. It is a useful later channel, not the bootstrap channel for a Windows utility with a native helper and a managed Chromium runtime. A direct signed (or transparently unsigned) installer from a public release channel is the shortest route to real users.

## Why GitHub Releases + GitHub Pages

- No hosting bill for the installer or the site.
- Public release metadata (`latest.yml`) is exactly what `electron-updater` reads.
- The site can be static, fast, crawlable and free of third-party scripts.
- The source repository stays private; the release repository contains only binaries and metadata.
- Release assets are immutable version tags; a bad build is replaced by a higher version, not overwritten.

GitHub Pages is free for public repositories; a custom domain can be attached later without changing the app. [GitHub Pages documentation](https://docs.github.com/en/pages)

## The installer pitch

The site leads with one sentence and one action:

1. **What it is:** a small island at the top of Windows for dictation, screen questions, media/lyrics and daily tools.
2. **Why install rather than open another chat tab:** one shortcut works in the app you are already in; the screen is captured only on explicit intent; the data and keys stay local.
3. **What it costs:** the installer is a direct download. Cloud providers are optional and use the user's own keys. There is no Agent Notch account.
4. **What the warning means:** the build is unsigned, so SmartScreen may say “Windows protected your PC”. The site explains **More info → Run anyway** and publishes SHA-256.
5. **What happens next:** Settings → Providers is optional; the notch opens with `Ctrl + Shift + Space`; updates are built in.

This is a pitch to install, not a promise of instant trust. The honest unsigned disclosure and checksum are part of the conversion: users who care about safety can verify the bytes.

## Trust and signing

`electron-updater` verifies the downloaded installer against the `sha512` in `latest.yml`. A Windows code-signing certificate adds publisher identity and SmartScreen reputation; it does not guarantee the warning disappears immediately. Microsoft's current guidance should be treated as authoritative. [SmartScreen reputation guidance](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation)

The release workflow fails closed for unsigned normal releases. It accepts an explicit `allow_unsigned` manual dispatch only for the bootstrap period. A signed build replaces the unsigned one through the same update path.

## Optional later channels

- **winget:** submit a manifest to `microsoft/winget-pkgs` pointing at the stable installer URL with the published SHA-256 and silent switches. Free, reviewed, and useful for technical users. [winget repository](https://github.com/microsoft/winget-pkgs)
- **Custom domain:** point a domain at GitHub Pages; add the canonical URL to both pages and the sitemap. The app's update feed does not depend on the domain.
- **Beta channel:** publish prereleases and set `allowPrerelease` only for an explicit beta build. Do not mix beta metadata into the stable `latest.yml`.
- **Microsoft Store:** only after the MSIX and account cost are justified.

## SEO implementation

- Unique title and meta description on both pages.
- Canonical URLs, Open Graph and Twitter card with a generated 1200×630 image.
- `SoftwareApplication`, `Organization`, `FAQPage` and `BreadcrumbList` JSON-LD.
- Semantic `h1`/`h2`/`h3`, one topical page per intent: product + install and release catalog.
- `robots.txt`, `sitemap.xml`, web manifest, descriptive alt/aria labels and fast static assets.
- Real product UI in the hero preview rather than stock imagery.
- No fabricated reviews, ratings, customer counts or prices.

Search engines need a canonical host and time. The GitHub Pages URL is the canonical host until a domain is bought. Adding the site to the GitHub repository homepage and linking it from the release notes gives it a first crawl path.

## Release sequence

1. Bump `package.json` and write `release/RELEASE-NOTES.md`.
2. Run `npm test`.
3. Build native and restore Playwright Chromium.
4. `npm run dist -- --publish never` and run `scripts/verify-release.cjs`.
5. Publish the versioned installer, `latest.yml`, blockmap, checksums, notes and notices.
6. Upload the stable `Agent-Notch-Setup.exe` alias to the same release.
7. Deploy the site; the download link always uses the stable alias.
8. Verify an installed previous build updates to the new release.

## What still needs user action

- A code-signing certificate and publisher identity.
- A real support email and, optionally, a custom domain.
- A clean Windows 10/11 VM pass and physical microphone/insertion checks.
- Legal review of the bundled third-party notices before broad paid promotion.
