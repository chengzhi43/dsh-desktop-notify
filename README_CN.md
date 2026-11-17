<!-- README_SYNC: source=working-tree; updated=2026-11-17 -->

<p align="center">
  简体中文 · <a href="./README.md">English</a>
</p>

<div align="center">

<img src="./docs/hero.svg" width="760" alt="dsh-desktop-notify：圆角底板上的一枚铃铛与项目名">

<h1>dsh-desktop-notify</h1>

<p><strong>DeepSeek Harness 在后台跑，你要知道它什么时候跑完，什么时候在等你。</strong></p>

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

<p>如果它每天帮你少切一次窗口，点个 Star，下一个人也能搜到。</p>

</div>

一个回合要跑好几分钟。你切去别的窗口，真正需要你的两个时刻就发生在别处：回合跑完了，或者智能体停下来等你回答。这个插件把这两件事送进系统通知中心，点一下就回到那场对话。

它只是个客户端插件：一个文件夹，没有依赖、不用构建、不联网，也不往磁盘写东西。

## 会弹什么

| 什么时候 | 正文 | 点击 |
| --- | --- | --- |
| 回合结束 | `<会话名> · 已完成` | 打开这场对话 |
| 提问、审批、计划确认或操作卡片开始等你 | `<会话名> · 等待你的选择` | 打开这场对话 |

标题固定是 `DeepSeek Harness`，正文带会话名和状态。状态文案跟着应用语言走，目前支持八种。子智能体的会话不提醒；同一个等待状态重复发布，也不会重复弹。

## 安装

两种方式，挑省事的那个。

加索引链接。在 DSH 里打开 **插件 → 发现 → 添加索引源**，粘贴：

```text
https://raw.githubusercontent.com/chengzhi43/dsh-desktop-notify/main/index.json
```

列表里就会出现 `dsh-desktop-notify`，点安装即可。索引里每条都钉死了 commit，装上的是什么，索引里写的就是什么。想先看内容，同一个文件在 [index.json](https://raw.githubusercontent.com/chengzhi43/dsh-desktop-notify/main/index.json) 可以直接打开。

或者解压安装包。从[最新版本](https://github.com/chengzhi43/dsh-desktop-notify/releases/latest)下载 `dsh-desktop-notify.zip`，解压到一个能长期放着的位置，然后 **插件 → 添加插件**，选这个文件夹，根目录里要有 `package.json`。最后按 `Cmd/Ctrl + R` 刷新一次窗口。

装完之后允许系统发通知：macOS 在**系统设置 → 通知 → DeepSeek Harness**，Windows 在**设置 → 系统 → 通知**。

各平台的验证项，包括 Windows toast 那个还没定论的问题，写在 [docs/WINDOWS-VERIFICATION.md](./docs/WINDOWS-VERIFICATION.md)。

## 它读的是什么状态

```text
DSH client (open page)
  uiSession.sessionStatus          running + highest-precedence pending interaction
    dsh-desktop-notify             diff one snapshot against the previous one
      Notification                 "<title> · finished" / "<title> · waiting for your choice"
        click                      uiWorkspace.openSession(sessionId)
  fallback: sessions.list          running state only, completions still announced
```

插件在内存里留一张小表，每次快照和上一次比。`running` 从 true 变 false，就是一个回合结束了；出现新的待处理交互，就是应用在等你回答。不落盘，卸载插件时订阅一起收掉。

它读的是应用本来就发布的那份状态，和侧栏的转圈、输入框的待办面板是同一个来源。审批、计划确认这些也能提醒，原因就在这里：它们同属这份状态，插件不用为它们单独写代码。

## 它做不到什么

- 完整体验需要客户端提供 `uiSession.sessionStatus`。老版本会退回会话列表，那里只有运行状态，所以只能提醒完成，提醒不了"在等你"。
- 通知由打开的页面发出。关掉窗口或退出应用就没有提醒了，后端该跑完的还是会跑完。
- 没有提示音开关、单会话静音、免打扰时段。同一个等待状态只提醒一次。
- Linux 依赖桌面通知服务，也依赖它把点击回传给 Electron。
- 在浏览器标签页里用，第一次通知会走浏览器的权限申请。
- Windows 上窗口收进托盘时，点击可能没法把它提到前面。要提起来得调 `dsh://open`，这个插件没有做。
- 不给模型加任何文本，不发遥测，不读凭据。

## 本地跑一遍

```bash
git clone https://github.com/chengzhi43/dsh-desktop-notify.git
cd dsh-desktop-notify
node --check client.js
node test/harness.cjs
```

测试用桩服务顶替客户端服务，不需要 DOM、Electron 或 DSH 本体。它检查完成提醒、等待提醒、重复抑制、子代理静默、点击跳转、卸载清理和降级路径。CI 在 Linux 上跑同样两条命令，索引文件也一起校验，配置见 [.github/workflows/checks.yml](./.github/workflows/checks.yml)。

## 参与

中文、英文 issue 都行。提代码的话：保持插件无依赖、只在客户端侧跑，状态比较仍然是唯一的状态来源，并在 [CHANGELOG.md](./CHANGELOG.md) 补一行。新增一类提醒，通常意味着应用多了一种待处理交互，而不是这个插件要写更多代码。

## 许可证

[MIT](./LICENSE)。随便用、随便改，也可以塞进自己的环境里。

有用的话：点个 Star，Watch releases 跟版本，遇到漏提醒或太吵就直接开 issue。
