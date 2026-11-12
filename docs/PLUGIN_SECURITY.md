# Plugin security model

Plugins are third-party programs, not cosmetic themes. Agent Notch therefore separates review, installation, and activation:

1. The marketplace shows repository, pinned commit, license, source tree, architecture, dependencies, permissions, and network endpoints.
2. Installation requires an explicit review confirmation and always leaves the plugin disabled.
3. Catalog downloads use a pinned commit, reject unsafe ZIP paths, symbolic links, oversized files, duplicate paths, and archives over the configured limits.
4. Runtime commands use argument arrays with `shell: false`. Relative executable paths must remain inside the plugin source folder.
5. Each plugin receives separate `source`, `data`, and `logs` directories and a reduced environment. Application secrets are never forwarded.
6. Host actions such as clipboard writes, opening links, and file access are checked against declared permissions. HTTP targets cannot contain credentials.
7. Uninstall preserves plugin data by default. “Delete data” is a separate explicit action.

This is process isolation and capability mediation, not an operating-system sandbox. Review source and dependencies before enabling a plugin, especially plugins that launch programs, access browser cookies, or handle arbitrary network URLs.
