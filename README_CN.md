<!-- README_SYNC: source=working-tree; updated=2026-11-17 -->

<p align="center">
  简体中文 · <a href="./README.md">English</a>
</p>

<div align="center">

<img src="./docs/hero.svg" width="760" alt="dsh-desktop-notify：圆角底板上的一枚铃铛与项目名">

<h1>dsh-desktop-notify</h1>

<p><strong>DeepSeek Harness 会话在后台运行。插件负责报告两个需要你的时刻：回合结束，以及智能体开始等待你的选择。</strong></p>

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

<p>点 Star 可以让下一个需要它的用户更容易找到这个项目。</p>

</div>

一个会话通常要运行数分钟。窗口处于后台时，有两件事需要你知道：回合结束，或智能体停下来等待回答。插件把这两件事交给系统通知中心，点击通知即可回到对应会话。

它只是一个客户端插件：一个目录，没有依赖，不需要构建，不发起网络请求，也不写入磁盘。

## 通知内容

| 触发事件 | 正文 | 点击 |
| --- | --- | --- |
| 回合结束 | `<会话名> · 已完成` | 打开该会话 |
| 提问、审批、计划确认或操作卡片进入等待 | `<会话名> · 等待你的选择` | 打开该会话 |

标题固定为 `DeepSeek Harness`，正文包含会话名与状态。状态文案跟随应用语言，目前支持八种。子智能体会话不提醒；同一等待状态重复发布时不会再次通知。

## 安装

提供两种安装方式，安装结果相同。

### 方式一：通过索引链接安装

1. 在 DSH 中打开 **插件 → 发现 → 添加索引源**。
2. 粘贴以下索引地址：

```text
https://raw.githubusercontent.com/chengzhi43/dsh-desktop-notify/main/index.json
```

3. 列表中出现 `dsh-desktop-notify`，选择安装。索引中的每个条目都固定到具体 commit，因此安装内容与列表中的版本一致。
4. 按下方说明允许系统通知。

索引文件可在 [index.json](https://raw.githubusercontent.com/chengzhi43/dsh-desktop-notify/main/index.json) 直接查看。

### 方式二：通过插件目录安装

1. 从[最新版本](https://github.com/chengzhi43/dsh-desktop-notify/releases/latest)下载 `dsh-desktop-notify.zip`。
2. 解压到一个可以长期保留的目录。
3. 在 DSH 中打开 **插件 → 添加插件**，选择该目录。目录根层级需包含 `package.json`。
4. 使用 `Cmd/Ctrl + R` 刷新窗口。

两种方式都需要系统允许该应用发送通知：macOS 在**系统设置 → 通知 → DeepSeek Harness**，Windows 在**设置 → 系统 → 通知**。

各平台的验证情况，包括 Windows toast 尚未确认的问题，记录在 [docs/WINDOWS-VERIFICATION.md](./docs/WINDOWS-VERIFICATION.md)。

## 工作方式

```text
DSH client (open page)
  uiSession.sessionStatus          running + highest-precedence pending interaction
    dsh-desktop-notify             diff one snapshot against the previous one
      Notification                 "<title> · finished" / "<title> · waiting for your choice"
        click                      uiWorkspace.openSession(sessionId)
  fallback: sessions.list          running state only, completions still announced
```

插件在内存中维护一张小型状态表，每次快照与上一次比较：`running` 由 true 变为 false 表示回合结束；出现新的待处理交互标识表示应用在等待回答。状态不落盘，卸载插件时订阅一并释放。

读取的状态来自应用本身已发布的数据，与侧栏运行指示、输入框待办面板同源。审批与计划确认之所以也被覆盖，是因为它们同属这份状态，无需单独处理。

## 版本要求与限制

- 需要 DeepSeek Harness 桌面端 0.2.2-rc.3 或更高版本。该版本是插件的开发与验证版本，其内置运行时版本相同。更低版本未经验证；若某版本缺少 `uiSession.sessionStatus`，插件会退回会话列表，此时只能提醒回合结束，无法提醒等待状态。
- 通知由已打开的页面发出。窗口关闭或应用退出后不再发送通知，但会话仍在主机侧继续运行。
- 没有提示音设置、单会话静音和免打扰时段。同一等待状态通知一次，重复发布保持静默。
- 在 Linux 上，通知能否送达取决于桌面通知服务，也取决于该服务是否把点击事件回传给 Electron。
- 在浏览器标签页中使用时，首次通知会经过浏览器权限申请。
- 在 Windows 上，窗口最小化到托盘后，点击通知可能无法将窗口置前。置前需要调用 `dsh://open`，本插件未实现该调用。
- 插件不向模型添加任何文本，不发送遥测，不读取凭据。

## 本地验证

```bash
git clone https://github.com/chengzhi43/dsh-desktop-notify.git
cd dsh-desktop-notify
node --check client.js
node test/harness.cjs
```

测试用桩实现替代客户端服务，因此不需要 DOM、Electron 或 DSH 本体。覆盖范围包括回合结束提醒、等待提醒、重复抑制、子智能体排除、点击跳转、卸载清理与降级路径。CI 在 Linux 上执行同样的命令，并校验索引文件，配置见 [.github/workflows/checks.yml](./.github/workflows/checks.yml)。

## 参与贡献

中文与英文 issue 均可。提交代码时请保持：插件无依赖且仅运行在客户端；状态比较仍是唯一的状态来源；在 [CHANGELOG.md](./CHANGELOG.md) 增加对应条目。新增一类通知，通常意味着应用增加了新的待处理交互，而不是本插件需要更多代码。

## 许可证

[MIT](./LICENSE)。可自由使用、修改，并分发到自己的环境中。

如果这个插件有用：欢迎点 Star，通过 Watch releases 跟进版本，遇到漏提醒或重复提醒时提交 issue。
