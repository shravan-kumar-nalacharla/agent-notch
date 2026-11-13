# Developing Agent Notch plugins

Open **Tools → Plugins → Create** to generate a real Node.js or Python starter. The wizard creates it disabled so you can inspect and edit it first.

Development loop:

1. Give the plugin a stable lowercase id.
2. Define `plugin.toml` and declare only capabilities the plugin actually needs.
3. Emit a small `tile`; add a `page` only when the plugin needs more room.
4. Give every interactive control a stable `id`, then handle matching `event` messages.
5. Write diagnostics to standard error or send `log` messages. Do not print ordinary text to standard output because stdout is the JSON-lines protocol.
6. Import the folder through the marketplace, review it, install disabled, then enable and inspect its logs.
7. Package the source as a ZIP with `plugin.toml` at its root. Do not include secrets, user data, symlinks, or generated environments.

The standalone helpers live under `plugins/sdk/node` and `plugins/sdk/python`; examples live under `plugins/examples`.
