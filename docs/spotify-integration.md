# Spotify Connect — 0.9.0

Current authorization/status behavior: [0.10.1 fix and recovery](0.10.1-SPOTIFY-ACCESS.md). Connected now requires verified account API access; OAuth consent followed by a profile403 remains disconnected. Spotify requires a Premium developer-app owner for development-mode access.

Agent Notch is a remote controller for Spotify Connect. It does not stream Spotify audio inside Electron and does not use the Web Playback SDK. Existing generic Windows media controls remain separate; a Spotify button sends one Spotify API action rather than also sending a system media keystroke.

## Setup with your own Spotify application

1. Create a Spotify developer application under your own account and follow Spotify's current eligibility/development-mode rules. Register this exact redirect: `http://127.0.0.1:43857/callback`.
2. In Agent Notch, open All features → Spotify → setup. Save the public Client ID. No client secret is needed or accepted.
3. Leave playback permission off for metadata-only access, or enable it for remote controls. Click Connect; authorization opens in the system browser. Choose the account you intend to control and approve its scopes.
4. Open Spotify on a compatible device and start playback there once if no active device is found. Select that device in Agent Notch. Eligible Premium access and the granted playback scope are required for playback controls.
5. Disconnect removes locally stored Spotify credentials. Revoke application access on Spotify's account page if you also want provider-side revocation. Changing the Client ID or requested scopes requires reconnection.

Spotify currently restricts development mode, including a small authorized-user allowance and Premium ownership requirements. Your application/account may not qualify. An unauthorized test user must be added in the Spotify developer dashboard where allowed. Do not paste tokens, passwords or client secrets into chat. Agent Notch cannot create a developer registration on your behalf without your account interaction.

## Security and lifecycle

`spotify.cjs` creates a random PKCE verifier and S256 challenge, binds a short-lived HTTP callback server to literal IPv4 loopback, validates state in constant time and accepts only the expected callback path. Authorization expires after five minutes. It rejects mismatched state and duplicate callbacks, and closes the listener after success/cancel/timeout. `localhost` is not used. Remote API/token calls use HTTPS.

`integration-secrets.cjs` stores access/refresh credentials with Electron asynchronous Windows safeStorage (DPAPI) in app-owned per-user files. Tokens are never in renderer state, localStorage, exported routine backups or application logs. The public Client ID, account display metadata and granted scope names are safe UI configuration. Writes are serialized and use a temporary file plus rename. Refresh is single-flight; rotated refresh tokens are preserved. Disconnect invalidates in-flight generations so a late refresh cannot reconnect an account. DPAPI ciphertext is not a portable account backup.

Read scopes: `user-read-playback-state`, `user-read-private`, `playlist-read-private`. Optional mutation scope: `user-modify-playback-state`. Actual granted scopes are checked. No password, cookie scraping or client secret is used.

## Controls and limits

Supported surfaces include account/connection status, current playback, devices, search, the user's playlist metadata with pagination, a chosen focus playlist, play/pause/previous/next, seek, volume where the device supports it, shuffle, repeat, track queue and device transfer. Transfer uses `play:false`; it does not unexpectedly start audio. Playlist playback is a user-requested API context, not locally hosted music. Album art uses provider image URLs subject to CSP and ordinary browser caching; no offline audio cache is provided.

Search respects the current ten-item limit. Polling slows when hidden, stops without a connection/device, and observes rate-limit backoff. HTTP 401 refreshes once and then requests reconnect; 403 explains scope/Premium/developer restrictions, 404 explains missing devices, and 429 obeys Retry-After. Network failures are reported without discarding local productivity data. Restricted devices and unsupported volume/queue values fail explicitly. Optional voice playback first requires on-screen confirmation.

## Executed and unverified

Automated tests exercise a real local HTTP OAuth callback with stubbed provider responses, PKCE validation, wrong/Unicode state, token rotation, disconnect, no-device/restricted-device errors, 401/403/404/429, search limits and single API mutation. Windows packaged tests exercise configuration UI and DPAPI using disposable data.

**NOT VERIFIED:** real Spotify authorization, developer app registration, authorized-user eligibility, Premium device control, minimized-device playback, live catalog/playlist responses and audible playback. No Spotify credentials or own developer registration were available. The UI therefore starts disconnected; no simulated track is presented as live music. Standalone Electron playback is intentionally not advertised.

## Official references checked during implementation

- [Authorization Code with PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Redirect URI requirements](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)
- [February 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
- [Start/resume playback](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback)
- [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)

Provider requirements can change; the developer portal's current rules govern account eligibility.
