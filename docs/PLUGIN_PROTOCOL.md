# Agent Notch plugin protocol v1

Plugins are separate processes. They read one JSON object per line from standard input and write one JSON object per line to standard output. Standard error is captured as plugin log output. Unknown message and component types are ignored for forward compatibility.

## Manifest

Each source folder has a top-level `plugin.toml`. Required fields are `id`, `name`, and a shell-free `run` array. Optional fields include `version`, `description`, `author`, `mode` (`live` or `poll`), `interval`, `size`, `page_size`, `accepts_files`, `requires`, and `permissions`.

## Host messages

The host sends `hello`, `event`, and explicit file events. A control event is `{ "type":"event", "id":"control-id", "value":... }`.

## Plugin messages

Plugins can send `tile`, `page`, `badge`, `active`, `open_page`, `close_page`, `show`, `copy`, `open`, and `log`. Tile and page views are declarative trees. Supported layout components are `column`, `row`, `grid`, `card`, `spacer`, and `divider`. Content includes `text`, `icon`, `image`, `progress`, `ring`, `sparkline`, `list`, and `canvas`. Controls include `button`, `toggle`, `slider`, `input`, and `chips`.

Live plugins remain running. Poll plugins receive a 30-second execution budget and run at their manifest interval while enabled. Live plugins restart at most three times per minute.
