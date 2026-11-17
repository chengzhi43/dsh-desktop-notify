<!-- README_SYNC: source=working-tree; updated=2026-11-17 -->

<p align="center">
  <a href="./README_CN.md">简体中文</a> · English
</p>

<div align="center">

<img src="./docs/hero.svg" width="760" alt="dsh-desktop-notify: a bell in a rounded tile next to the project name">

<h1>dsh-desktop-notify</h1>

<p><strong>A DeepSeek Harness session runs in the background. You find out when it is done, or when it needs you.</strong></p>

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

<p>If it saves you one context switch a day, a star helps the next person find it.</p>

</div>

A turn takes minutes. You switch to another window, and the two moments that matter happen while you are looking somewhere else: the turn ends, or the agent stops and waits for an answer. This plugin puts both in the system notification center. Click one and you land back in that conversation.

It is a client-side bundle: one folder, no dependencies, no build step, no network calls, nothing written to disk.

## What shows up

| When | Body | Click |
| --- | --- | --- |
| A turn finishes | `<conversation> · finished` | Opens that conversation |
| A question, approval, plan review, or action card starts waiting | `<conversation> · waiting for your choice` | Opens that conversation |

The title is always `DeepSeek Harness`; the body carries the conversation name and the state. The state text follows the app language, eight of them so far. Subagent conversations never notify, and a pending request that gets republished does not announce twice.

## Install

Two ways. Take whichever is less work for you.

Add the index link. In DSH open **Plugins → Discover → Add index source** and paste:

```text
https://raw.githubusercontent.com/chengzhi43/dsh-desktop-notify/main/index.json
```

The list then shows `dsh-desktop-notify`, with an install button. Each entry pins a commit, so you install exactly what the index lists. The same file is readable at [index.json](https://raw.githubusercontent.com/chengzhi43/dsh-desktop-notify/main/index.json) if you want to check it first.

Or unzip the bundle. Grab `dsh-desktop-notify.zip` from the [latest release](https://github.com/chengzhi43/dsh-desktop-notify/releases/latest), unzip it somewhere it can stay, then use **Plugins → Add plugin** and pick that folder. It is the one with `package.json` at its root. Reload the window once with `Cmd/Ctrl + R`.

Either way, let the system deliver the notifications: macOS **System Settings → Notifications → DeepSeek Harness**, Windows **Settings → System → Notifications**.

Platform checks, including the open Windows toast question, live in [docs/WINDOWS-VERIFICATION.md](./docs/WINDOWS-VERIFICATION.md).

## How it reads state

```text
DSH client (open page)
  uiSession.sessionStatus          running + highest-precedence pending interaction
    dsh-desktop-notify             diff one snapshot against the previous one
      Notification                 "<title> · finished" / "<title> · waiting for your choice"
        click                      uiWorkspace.openSession(sessionId)
  fallback: sessions.list          running state only, completions still announced
```

The plugin keeps one small map in memory and compares every snapshot with the previous one. `running` going from true to false means a finished turn; a new pending-interaction key means the app wants an answer from you. Nothing is persisted, and unloading the bundle drops the subscription.

It reads what the app already publishes, the same status behind the sidebar spinner and the composer's pending panel. That is also why approval prompts and plan reviews show up: they share that status, so they do not need their own code here.

## Where it stops

- Full coverage needs a DSH build that exposes `uiSession.sessionStatus`. Older builds fall back to the conversation list, which only knows running state, so those get completion notifications and nothing else.
- Notifications come from the open page. Close the window or quit the app and nothing is sent, even though the turn keeps running on the host.
- No sound setting, no per-conversation mute, no quiet hours. One pending request announces once.
- Linux depends on the desktop notification daemon, including whether it reports clicks back to Electron.
- In a browser tab the first notification goes through the browser permission prompt.
- On Windows a window hidden in the tray may not come forward on click. Raising it needs a `dsh://open` call, which this plugin does not make.
- No model-facing text, no telemetry, no credential reads.

## Try it locally

```bash
git clone https://github.com/chengzhi43/dsh-desktop-notify.git
cd dsh-desktop-notify
node --check client.js
node test/harness.cjs
```

The harness stubs the client services, so it runs without a DOM, Electron, or DSH. It checks completion, pending choice, duplicate suppression, subagent silence, click navigation, teardown, and the fallback path. CI runs the same two commands on Linux. The index file is validated too; see [.github/workflows/checks.yml](./.github/workflows/checks.yml).

## Contributing

Issues in Chinese or English are both fine. If you send code, keep the bundle dependency-free and client-side, keep the status diff as the only source of state, and add a line to [CHANGELOG.md](./CHANGELOG.md). A new kind of notification usually means the app gained a new pending interaction, not that this plugin needs more code.

## License

[MIT](./LICENSE). Use it, fork it, ship it inside your own setup.

If it is useful: star the repo, watch releases for updates, and open an issue when a notification is missing or noisy.
