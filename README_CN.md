<!-- README_SYNC: source=working-tree; updated=2026-11-17 -->

<p align="center">
  简体中文 · <a href="./README.md">English</a>
</p>

<div align="center">

<img src="./docs/hero.svg" width="760" alt="dsh-desktop-notify —— 圆角底板上的一枚铃铛与项目名称">

<h1>dsh-desktop-notify</h1>

<p><strong>给 DeepSeek Harness 加系统通知：回合跑完了告诉你，智能体停下来等你也告诉你。</strong></p>

<p>
  <a href="https://github.com/chengzhi43/dsh-desktop-notify/stargazers"><img src="https://img.shields.io/badge/Star-this%20repository-2F6FEB?style=flat-square" alt="给这个仓库点 Star"></a>
  <a href="https://github.com/chengzhi43/dsh-desktop-notify/releases/latest"><img src="https://img.shields.io/github/v/release/chengzhi43/dsh-desktop-notify?style=flat-square" alt="最新版本"></a>
  <a href="https://github.com/chengzhi43/dsh-desktop-notify/actions/workflows/checks.yml"><img src="https://img.shields.io/github/actions/workflow/status/chengzhi43/dsh-desktop-notify/checks.yml?style=flat-square" alt="CI 状态"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/chengzhi43/dsh-desktop-notify?style=flat-square" alt="MIT 许可证"></a>
  <a href="https://github.com/chengzhi43/dsh-desktop-notify/issues"><img src="https://img.shields.io/github/issues/chengzhi43/dsh-desktop-notify?style=flat-square" alt="未关闭的 issue"></a>
  <a href="https://github.com/chengzhi43/dsh-desktop-notify/commits/main"><img src="https://img.shields.io/github/last-commit/chengzhi43/dsh-desktop-notify?style=flat-square" alt="最近提交"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-4B5563?style=flat-square" alt="macOS、Windows、Linux">
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/badge/DSH-plugin-2F6FEB?style=flat-square" alt="DeepSeek Harness 插件"></a>
</p>

<p>如果它每天帮你少切一次窗口，点个 Star，别人也能搜到它，我也更有动力继续维护。</p>

</div>

DeepSeek Harness 的一个回合往往要跑好几分钟。你切去别的窗口，它跑完的那一刻、或者它停住等你回答的那一刻，就发生在你没看的地方。这个插件把这两个时刻交给系统通知，点一下就能回到那场对话。

它只是一个客户端侧的 DSH 插件：一个文件夹，没有依赖、没有构建步骤、不联网，也不往磁盘写东西。

## 你会得到什么

| 时刻 | 通知正文 | 点击之后 |
| --- | --- | --- |
| 回合结束 | `<会话标题> · 已完成` | 打开这场对话 |
| 提问、审批、计划确认或操作卡片开始等你 | `<会话标题> · 等待你的选择` | 打开这场对话 |

- 通知标题固定是 `DeepSeek Harness`，正文带会话标题和当前状态。
- 状态文案跟随应用语言：中文、英文、日文、西班牙文、法文、德文、俄文、葡萄牙文。
- 子智能体的会话不提醒；同一个等待状态重复发布也不会重复弹。

## 为什么这么做

- **看的是状态，不是输出。** 插件读的是应用本来就发布的那份会话状态——驱动侧栏转圈和输入框待办面板的同一个数据源。不轮询对话记录，不额外发模型请求。
- **"在等你"是一等公民。** 多数提醒脚本只挂"回合结束"，可智能体要你决策时回合根本不会结束。这里提问、审批、计划确认、操作卡片都会提醒，因为它们同属一份待处理交互状态。
- **点击是真的跳转。** 走的是侧栏用的同一个打开会话接口，直接落到那场对话，不猜 URL。
- **缺字段就降级，不会失效。** 如果某个 DSH 版本没有统一状态字段，插件退回会话列表的运行状态，完成提醒照常工作。

## 安装

1. 到[最新版本](https://github.com/chengzhi43/dsh-desktop-notify/releases/latest)下载 `dsh-desktop-notify.zip`，解压到一个固定目录。
2. 在 DSH 里打开 **插件 → 添加插件**，选这个目录——根目录下有 `package.json` 的那个。
3. 刷新一次窗口（`Cmd/Ctrl + R`），然后允许系统通知：macOS 在**系统设置 → 通知 → DeepSeek Harness**，Windows 在**设置 → 系统 → 通知**。

Release 里的 zip 和 git clone 下来的是同一份插件，从源码目录安装也一样。各平台验证项（包括 Windows toast 那个待确认的问题）写在 [docs/WINDOWS-VERIFICATION.md](./docs/WINDOWS-VERIFICATION.md)。

## 它怎么工作

```text
DSH client (open page)
  uiSession.sessionStatus          running + highest-precedence pending interaction
    dsh-desktop-notify             diff one snapshot against the previous one
      Notification                 "<title> · finished" / "<title> · waiting for your choice"
        click                      uiWorkspace.openSession(sessionId)
  fallback: sessions.list          running state only, completions still announced
```

插件只保留一张内存里的会话状态表。每次快照和上一次比较：`运行 true → false` 就是回合结束，出现新的待处理交互 key 就是要你做选择。不落盘，卸载插件时订阅一起收掉。

## 兼容性与边界

- 完整体验需要客户端提供 `uiSession.sessionStatus`；只有 `sessions.list` 的版本会退化成"仅完成提醒"，测试里覆盖了这条路径。
- 通知由已打开的页面发出。关掉窗口或退出应用后不再提醒，虽然后端会话照常跑完。
- 没有提示音开关、没有单会话静音、没有免打扰时段。同一个等待状态只提醒一次，重复发布保持安静。
- Linux 依赖桌面的通知服务，以及它是否把点击事件回传给 Electron。
- 在浏览器标签页里打开 Web 界面时，首次通知会走浏览器的权限申请。
- Windows 上窗口被收进托盘时，点击可能无法把它提到前台；要拉回前台需要额外调 `dsh://open`，目前没做。
- 插件不加任何给模型看的文本，不发遥测，不读凭据。

## 自己验一遍

```bash
git clone https://github.com/chengzhi43/dsh-desktop-notify.git
cd dsh-desktop-notify
node --check client.js
node test/harness.cjs
```

测试用桩服务替代客户端服务，不需要浏览器、Electron 或 DSH 本体，覆盖：完成提醒、等待提醒、重复抑制、子代理静默、点击跳转、卸载清理、降级路径。CI 在 Linux 上跑同样两条命令。

## 参与

中文、英文 issue 都可以。如果要提改动：保持插件无依赖、只在客户端侧运行，状态比较仍然是唯一的状态来源，并在 [CHANGELOG.md](./CHANGELOG.md) 补一行。新增一类提醒，通常意味着应用多了一种待处理交互，而不是这个插件要写更多代码。

## 许可证

[MIT](./LICENSE)。随便用、随便改，也可以塞进你自己的环境里。

如果它对你有用：点 **Star** 让下一个遇到同样问题的人也能搜到，**Watch → Releases** 跟版本更新，少提醒或漏提醒的时候直接开 issue。
