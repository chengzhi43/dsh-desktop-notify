# Changelog

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
