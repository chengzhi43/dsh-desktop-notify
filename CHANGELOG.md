# Changelog

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
