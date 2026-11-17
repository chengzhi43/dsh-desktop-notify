# dsh-desktop-notify

System notifications for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH): a conversation
finished its turn, or the agent is now waiting for your choice. Clicking the notification opens that conversation.

English | [中文](#中文)

## What it does

| Moment | Notification |
| --- | --- |
| A turn finishes (`running → idle`) | `<conversation title> · finished` |
| The agent starts waiting for a decision (question, approval, plan review, action card) | `<conversation title> · waiting for your choice` |

- **Icon** — the notification is raised by the DSH app itself, so the platform shows the DSH application icon.
- **Click** — switches the main view to that conversation (and asks the OS to raise the app).
- **Quiet where it should be** — subagent conversations never notify; a repeated state does not re-announce.
- **Localized body** — the state text follows the app language (zh / en / ja / es / fr / de / ru / pt).
- **No Host work** — the plugin only reads conversation status the app already publishes and calls the existing
  "open this conversation" action. It adds no model requests, sends nothing off the machine, and stores nothing.

## Install

### From a release (no build step)

1. Download `dsh-desktop-notify.zip` from [Releases](../../releases) and unzip it somewhere stable.
2. In DSH: **Plugins → Add plugin**, then choose the unzipped folder (`package.json` must be at its root).
3. Reload the window (`Cmd/Ctrl + R`) if the notification does not appear on the next turn.
4. Check **System Settings → Notifications → DeepSeek Harness** (macOS) or **Settings → System → Notifications**
   (Windows) so the app is allowed to notify.

### From npm

If the package is published, pass the package name to the same **Add plugin** entry, or install it into the
profile with the plugin manager. The package is a plain ESM bundle with no dependencies.

### Remove

**Plugins → Desktop notifications → Disable**, or remove the bundle row and reload the window.

## Platform notes

- **macOS** — notifications use the app icon; the system raises DSH on click.
- **Windows** — DSH must be installed through its installer so the Start Menu entry (AppUserModelID) exists;
  otherwise Windows drops the toast. Focus Assist / "Do not disturb" hides banners while active — they still
  land in the Notification Center.
- **Linux** — depends on the desktop's notification daemon; the click action needs a daemon that reports
  clicks back to Electron.
- **Web GUI in a browser** — the browser asks for notification permission on the first notification; the click
  still switches conversations.

## Limits

- Notifications come from the open page. If the window is closed (or the app quits), nothing is raised; the
  conversation keeps running on the Host.
- The status source is the app's own client API (`uiSession.sessionStatus`, with a conversation-list fallback
  for completion-only coverage). A future DSH release that renames it degrades to the fallback instead of
  breaking the plugin.

## Development

```sh
node --check client.js          # syntax
node test/harness.cjs           # headless status-machine test, no DOM required
```

The bundle is three files: `index.js` (empty Host half), `client.js` (browser half), and `cordis.patch.yml`
(the Loader row). `locale/*.json` holds the Plugin Manager title and description.

## 中文

给 DeepSeek Harness 加系统通知：**回合结束**时提醒「已完成」，智能体**开始等你做选择**（提问、审批、计划确认、操作卡片）时提醒「等待你的选择」。点击通知直接切换到对应会话。

- 图标使用 DSH 应用图标；子智能体会话不提醒；重复状态不重复弹。
- 不增加任何模型请求，不联网，不落盘；关掉插件即恢复原样。
- 通知由已打开的页面发出：窗口关掉后不再提醒（后端任务照常跑完）。

### 安装

1. 到 [Releases](../../releases) 下载 `dsh-desktop-notify.zip` 并解压到固定目录。
2. DSH → **插件 → 添加插件** → 选择解压后的目录（根目录要有 `package.json`）。
3. 下一次回合若没看到通知，刷新窗口（`Cmd/Ctrl + R`）。
4. 确认系统允许 DSH 发送通知：macOS「系统设置 → 通知 → DeepSeek Harness」，Windows「设置 → 系统 → 通知」。

### Windows 验证清单

- [ ] 跑完一个回合后出现 toast，标题为 DeepSeek Harness，正文为「会话标题 · 已完成」
- [ ] 提问/审批时出现「等待你的选择」
- [ ] toast 图标是 DSH 应用图标
- [ ] 点击 toast 切到该会话并把窗口提到前台
- [ ] 关闭「专注助手」后行为一致
- [ ] 关闭插件后不再通知

## License

[MIT](LICENSE)
