# Windows verification

A checklist for checking the plugin on a Windows machine. Keep this out of the README; it is working material for
release checks.

## What was already verified elsewhere

- macOS: toast appears for a finished turn and for a pending choice; clicking it opens that conversation.
- Logic (Linux CI, macOS local): `node test/harness.cjs` covers completion, pending choice, duplicate suppression,
  subagent silence, click handling, and teardown.
- Static review of the DSH desktop shell: the app grants every non-microphone permission to the page, which covers
  `Notification`; the plugin passes no `icon`, so the platform draws the app icon.

## Open question on Windows

DSH's Electron main process never calls `app.setAppUserModelId`. Windows only shows a toast when the process
resolves an AppUserModelID that matches an installed Start Menu shortcut, so display depends on what the DSH
installer wrote rather than on this plugin.

Two outcomes, both useful:

- The toast appears → nothing to do.
- No toast at all → compare with DSH's own notification (its forced-update reminder uses the same Electron API).
  If that one is also missing, the platform side is the cause, not this plugin.

## Checklist

| Check | Expected |
| --- | --- |
| A turn finishes | Toast titled DeepSeek Harness, body `<conversation> · finished` |
| A question, approval, plan review, or action card waits for you | Body `<conversation> · waiting for your choice` |
| Toast icon | The DeepSeek Harness application icon |
| Click the toast | Main view switches to that conversation; window comes forward |
| Focus Assist on | No banner, entry still lands in Notification Center; banners return when Focus Assist is off |
| Window minimized to the tray, then a turn finishes | Toast appears; click may not raise a hidden window (needs `dsh://open`, not implemented) |
| Two turns finish close together | Two separate entries; a repeated pending state does not re-announce |
| Subagent conversation finishes | No notification |
| Plugin disabled in Plugins | No notification at all |
| Console (if nothing appears) | One line: `desktop-notify: notifications are blocked` or `… has no system notification API` |

## How to read the console

The DSH desktop window is a Chromium page. Open DevTools from the app menu when available, or start DSH with remote
debugging and inspect the renderer. The plugin warns at most once per blocking reason.
