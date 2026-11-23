# Changelog

## 1.1.0 (2026-11-23)

- The market copy is rewritten in both languages: it now names the exact moments that trigger a notification, the
  `conversation · state` body, the app-icon badge, the silent subagent rows, and the two limits — a closed window and
  a denied system permission. The plugin-detail text in `locale/*.json` carries the same facts, plus where the
  notification is triggered and what turning the plugin off restores.
- `docs/screenshots/` adds the two notifications this plugin produces, in English and Chinese, and both READMEs show
  them above the notification table.
- `screenshots.json` declares those images to the community catalog, which reads the file from this repository
  instead of a hand-maintained list over there.
- The app icon now carries a badge while a notification stays unseen: one per conversation, numbered like the
  Dock badge on macOS, the taskbar overlay on Windows, and the Linux launcher badge. The count comes from the
  standard Badging API, which Electron maps onto the application icon.
- The badge clears when the window regains focus, when the page becomes visible again, or when a notification is
  clicked. A conversation reporting twice replaces its notification instead of raising the number twice.
- Nothing is counted while the window has focus, and a Client without the Badging API keeps notifying without a
  badge. Both cases are covered by `test/harness.cjs`.

## 1.0.4

- Install section split into numbered methods with headings, and both install text and limitations rewritten
  in a formal register.
- States the version requirement: DeepSeek Harness desktop 0.2.2-rc.3 or newer, the release this plugin was
  built and verified on. The index entry now declares the same range in `engines.dsh`.

## 1.0.3

- `index.json`: a plugin-market index for this repository, so DSH can install the plugin from a link
  (`Plugins → Discover → Add index source`). The entry pins a commit.
- README rewritten in a plainer voice in both languages, and the install section now lists the index method
  next to the zip, the folder install, and the from-source path.
- CI validates the index file, so the Discover entry cannot drift from `package.json`.

## 1.0.2

- English README with a hero title, badges, and a Star entry point; Chinese moved to `README_CN.md` with a
  first-screen language switch and a sync marker.
- Windows verification moved out of the README into `docs/WINDOWS-VERIFICATION.md`.
- The released zip now carries the bilingual README, the changelog, and `docs/`, so the plugin page shows the
  same document as the repository.

## 1.0.1

- Warn once in the console when system notifications are unsupported or denied, so a platform without
  notifications (for example a Windows machine whose shortcut lacks an AppUserModelID) is diagnosable.

## 1.0.0

- System notification when a conversation finishes a turn.
- System notification when the agent starts waiting for a user decision (question, approval, plan review, action card).
- Clicking a notification opens that conversation in the main view.
- Subagent conversations stay silent; repeated states do not re-announce.
- Localized state text for zh, en, ja, es, fr, de, ru, pt.
- Fallback to conversation-list running state when the unified status source is unavailable.
