<!-- README_SYNC: source=working-tree; updated=2026-11-17 -->

<p align="center">
  <a href="./README_CN.md">简体中文</a> · English
</p>

<div align="center">

<img src="./docs/hero.svg" width="760" alt="dsh-desktop-notify — a bell in a rounded tile beside the project wordmark">

<h1>dsh-desktop-notify</h1>

<p><strong>System notifications for DeepSeek Harness: know when a turn lands, and know when the agent is waiting for you.</strong></p>

<p>
  <a href="https://github.com/chengzhi43/dsh-desktop-notify/stargazers"><img src="https://img.shields.io/badge/Star-this%20repository-2F6FEB?style=flat-square" alt="Star this repository"></a>
  <a href="https://github.com/chengzhi43/dsh-desktop-notify/releases/latest"><img src="https://img.shields.io/github/v/release/chengzhi43/dsh-desktop-notify?style=flat-square" alt="Latest release"></a>
  <a href="https://github.com/chengzhi43/dsh-desktop-notify/actions/workflows/checks.yml"><img src="https://img.shields.io/github/actions/workflow/status/chengzhi43/dsh-desktop-notify/checks.yml?style=flat-square" alt="Checks"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/chengzhi43/dsh-desktop-notify?style=flat-square" alt="MIT license"></a>
  <a href="https://github.com/chengzhi43/dsh-desktop-notify/issues"><img src="https://img.shields.io/github/issues/chengzhi43/dsh-desktop-notify?style=flat-square" alt="Open issues"></a>
  <a href="https://github.com/chengzhi43/dsh-desktop-notify/commits/main"><img src="https://img.shields.io/github/last-commit/chengzhi43/dsh-desktop-notify?style=flat-square" alt="Last commit"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-4B5563?style=flat-square" alt="macOS, Windows, Linux">
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/DSH-plugin-2F6FEB?style=flat-square" alt="DeepSeek Harness plugin"></a>
</p>

<p>If this saves you one context switch a day, a star helps other DSH users find it — and tells me the plugin is worth keeping current.</p>

</div>

A DeepSeek Harness conversation runs for minutes at a time. You switch to another window, and the moment it finishes
— or the moment it stops and waits for your answer — happens somewhere you are not looking. This plugin puts that
moment on the system notification layer, and a click lands you back in the right conversation.

It is a client-side DSH bundle: one folder, no dependencies, no build step, no network calls, nothing written to disk.

## What you get

| Moment | Notification body | Click |
| --- | --- | --- |
| A turn finishes | `<conversation> · finished` | Opens that conversation |
| A question, approval, plan review, or action card starts waiting | `<conversation> · waiting for your choice` | Opens that conversation |

- Title is always `DeepSeek Harness`; the body carries the conversation title and the state.
- The state text follows the app language: zh, en, ja, es, fr, de, ru, pt.
- Subagent conversations never notify, and a pending request that is republished does not announce twice.

## Why it is built this way

- **It watches state, not output.** The plugin reads the conversation status the app already publishes — the same
  one that drives the sidebar spinner and the composer's pending panel. No transcript polling, no extra model calls.
- **"Waiting for you" is a first-class case.** Most notifier scripts only hook "turn ended", which is exactly the
  moment a turn does *not* end when the agent needs a decision. Here questions, approvals, plan reviews, and action
  cards all surface, because they share one pending-interaction status.
- **The click is real navigation.** It calls the same `openSession` path the sidebar uses, so you land on the
  conversation instead of a guessed URL.
- **It degrades instead of breaking.** If a DSH build lacks the unified status field, the plugin falls back to the
  conversation list's running state and keeps announcing completions.

## Install

1. Download `dsh-desktop-notify.zip` from the [latest release](https://github.com/chengzhi43/dsh-desktop-notify/releases/latest) and unzip it into a folder you keep.
2. In DSH, open **Plugins → Add plugin** and choose that folder — the one whose root contains `package.json`.
3. Reload the window once (`Cmd/Ctrl + R`). Then let the system notify: macOS **System Settings → Notifications → DeepSeek Harness**; Windows **Settings → System → Notifications**.

The released zip and a git clone are the same bundle; installing from the checkout works the same way. Platform
checks, including the Windows toast question, live in [docs/WINDOWS-VERIFICATION.md](./docs/WINDOWS-VERIFICATION.md).

## How it works

```text
DSH client (open page)
  uiSession.sessionStatus          running + highest-precedence pending interaction
    dsh-desktop-notify             diff one snapshot against the previous one
      Notification                 "<title> · finished" / "<title> · waiting for your choice"
        click                      uiWorkspace.openSession(sessionId)
  fallback: sessions.list          running state only, completions still announced
```

The plugin keeps one small in-memory map of per-conversation state. Every snapshot is compared with the previous
one: `running true → false` announces a finished turn, a new pending-interaction key announces a request for you.
Nothing is persisted, and unloading the bundle removes the subscription.

## Compatibility and limits

- Needs a DSH build whose client exposes `uiSession.sessionStatus` for full coverage, or `sessions.list` for
  completion-only coverage. The fallback is exercised in the test suite.
- Notifications come from the open page. Close the window or quit the app and nothing is sent, even though the
  conversation keeps running on the Host.
- No sound setting, no per-conversation mute, no quiet hours. One pending request announces once; the same state
  republished stays silent.
- Linux depends on the desktop notification daemon, including whether it reports clicks back to Electron.
- In a browser tab (the Web GUI), the browser asks for notification permission on the first notification.
- On Windows, a window hidden in the tray may not come forward on click; raising it needs a `dsh://open` call,
  which is not implemented.
- The plugin adds no model-facing text, sends no telemetry, and reads no credentials.

## Verify it yourself

```bash
git clone https://github.com/chengzhi43/dsh-desktop-notify.git
cd dsh-desktop-notify
node --check client.js
node test/harness.cjs
```

The harness stubs the client services — no DOM, no Electron, no DSH — and asserts completion, pending choice,
duplicate suppression, subagent silence, click navigation, teardown, and the fallback path. CI runs the same two
commands on Linux.

## Contributing

Issues in Chinese or English are both fine. If you send a change: keep the plugin dependency-free and client-side,
keep the status diff the only source of state, and add a line to [CHANGELOG.md](./CHANGELOG.md). A new notification
kind usually means the app gained a new pending-interaction domain, not that this plugin needs more code.

## License

[MIT](./LICENSE). Use it, fork it, ship it inside your own setup.

If this is useful: **Star** the repository so the next person searching for this problem finds it, **Watch → Releases**
for version updates, and open an issue when a notification is missing or noisy.
