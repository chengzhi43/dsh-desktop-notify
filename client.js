/**
 * Browser half of the desktop notification plugin.
 *
 * The app already publishes per-conversation UI status: whether a turn runs and
 * the pending interaction awaiting the user. This module turns the two
 * transitions that matter into system notifications — a turn finishing, and the
 * agent starting to wait for a choice — opens that conversation when the
 * notification is clicked, and badges the app icon with the number of
 * conversations that reported while the user was looking elsewhere.
 *
 * No Host work is involved, so the same bundle runs on macOS, Windows, and the
 * browser-served Web GUI.
 */
window.__ModuleLoader__.load({
  id: 'dsh-desktop-notify',
  factory(require) {
    /** Locale namespace owned by this plugin. */
    const NS = 'desktopNotify'
    /** Notification heading; the conversation label and state go in the body. */
    const HEADING = 'DeepSeek Harness'
    /** Longest conversation label kept verbatim in a notification body. */
    const MAX_LABEL = 48

    const dictionaries = {
      en: { complete: 'finished', choice: 'waiting for your choice' },
      zh: { complete: '已完成', choice: '等待你的选择' },
      ja: { complete: '完了しました', choice: '選択を待っています' },
      es: { complete: 'terminado', choice: 'esperando tu elección' },
      fr: { complete: 'terminé', choice: 'en attente de votre choix' },
      de: { complete: 'abgeschlossen', choice: 'wartet auf deine Auswahl' },
      ru: { complete: 'готово', choice: 'ждёт вашего выбора' },
      pt: { complete: 'concluído', choice: 'aguardando sua escolha' },
    }

    /**
     * Human label of one conversation, or undefined for rows this plugin stays
     * quiet about: unknown rows and subagent children, which finish constantly.
     */
    function labelOf(sessions, sessionId) {
      try {
        const row = sessions.list.getSnapshot().byId[sessionId]
        if (row === undefined || row.origin === 'subagent' || row.parentId !== undefined) return undefined
        const label = typeof row.displayTitle === 'string' && row.displayTitle !== '' ? row.displayTitle : row.id
        return label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label
      } catch (_error) {
        return undefined
      }
    }

    /** Reasons already reported, so a blocked platform warns once, not per turn. */
    const warned = new Set()

    /** Report a blocking condition once, keeping the console usable. */
    function warnOnce(ctx, reason, message) {
      if (warned.has(reason)) return
      warned.add(reason)
      ctx.logger?.warn?.(`desktop-notify: ${message}`)
    }

    /**
     * Whether the user is looking at the app right now. A hidden window and a
     * window behind another app both count as looking away, which is when a
     * notification has to be visible from the icon alone.
     */
    function isWatching() {
      try {
        if (typeof document === 'undefined') return true
        if (document.visibilityState === 'hidden') return false
        if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false
        return true
      } catch (_error) {
        return true
      }
    }

    /**
     * App-icon badge: how many conversations pushed a notification the user has
     * not come back for.
     *
     * The carrier is the Badging API. Electron maps it onto the app icon — a
     * numbered Dock badge on macOS, a taskbar overlay on Windows, a launcher
     * badge on Linux — and a browser without the API simply keeps the
     * notifications, so the badge never becomes a second failure mode.
     */
    function createBadge(ctx) {
      const api = typeof navigator === 'undefined' ? undefined : navigator
      const usable = typeof api?.setAppBadge === 'function' && typeof api?.clearAppBadge === 'function'
      /**
       * Conversations with an unseen notification. One entry per notification
       * tag, which is the conversation, so the number matches what the platform
       * shows: a second notification for the same conversation replaces the
       * first instead of stacking.
       */
      const pending = new Set()
      /** Count already pushed, so a repeated state stays out of the platform. */
      let applied = 0
      let broken = false

      const fail = (error) => {
        broken = true
        applied = 0
        warnOnce(ctx, 'badge', `the app-icon badge is unavailable: ${String(error)}`)
      }

      /** Push the current count, skipping unchanged values and broken platforms. */
      const publish = () => {
        if (!usable || broken) return
        const count = pending.size
        if (count === applied) return
        applied = count
        try {
          Promise.resolve(count === 0 ? api.clearAppBadge() : api.setAppBadge(count)).catch(fail)
        } catch (error) {
          fail(error)
        }
      }

      return {
        /** Count one notification that has just been raised. */
        note(sessionId) {
          // A notification raised while the user watches the window is already
          // read, so it never reaches the icon.
          if (!usable || broken || isWatching()) return
          pending.add(sessionId)
          publish()
        },
        /** Forget one conversation, once its notification was opened. */
        forget(sessionId) {
          if (!pending.delete(sessionId)) return
          publish()
        },
        /** The user is back at the window: nothing is unseen any more. */
        settle() {
          if (pending.size === 0) return
          pending.clear()
          publish()
        },
      }
    }

    /**
     * Watch for the moment the user comes back, and drop the badge there.
     * Registered for the lifetime of the plugin.
     */
    function watchReturn(ctx, badge) {
      ctx.effect(() => {
        const view = typeof window === 'undefined' ? undefined : window
        const page = typeof document === 'undefined' ? undefined : document
        if (typeof view?.addEventListener !== 'function') return
        const onFocus = () => { badge.settle() }
        const onVisibility = () => {
          if (page.visibilityState === 'visible') badge.settle()
        }
        view.addEventListener('focus', onFocus)
        page?.addEventListener?.('visibilitychange', onVisibility)
        return () => {
          view.removeEventListener('focus', onFocus)
          page?.removeEventListener?.('visibilitychange', onVisibility)
        }
      }, 'desktop-notify: app-icon badge')
    }

    /**
     * Raise one system notification and wire its click to conversation navigation.
     * @param notice - body, conversation id, and the badge hooks for both ends.
     */
    function announce(ctx, uiWorkspace, notice) {
      const { body, sessionId } = notice
      if (typeof Notification === 'undefined') {
        warnOnce(ctx, 'unsupported', 'this Client has no system notification API')
        return
      }
      if (Notification.permission === 'denied') {
        warnOnce(ctx, 'denied', 'notifications are blocked; allow DeepSeek Harness in the system settings')
        return
      }
      const show = () => {
        try {
          // No `icon`: every platform already attributes the notification to this
          // app, so the app icon is the one the user should see.
          const notification = new Notification(HEADING, {
            body,
            tag: `dsh-desktop-notify:${sessionId}`,
            silent: false,
          })
          notice.shown?.()
          notification.onclick = () => {
            notice.clicked?.()
            try {
              uiWorkspace.openSession(sessionId)
            } catch (error) {
              ctx.logger?.warn?.(`desktop-notify: could not open the conversation: ${String(error)}`)
            }
            try {
              window.focus()
            } catch (_error) {
              // Focus is best effort; macOS raises the app on click by itself.
            }
            try {
              notification.close()
            } catch (_error) {
              // Closing is best effort.
            }
          }
        } catch (error) {
          ctx.logger?.warn?.(`desktop-notify: could not show a notification: ${String(error)}`)
        }
      }
      if (Notification.permission === 'default') {
        Promise.resolve(Notification.requestPermission()).then((permission) => {
          if (permission !== 'denied') show()
        }).catch(() => {})
        return
      }
      show()
    }

    return {
      inject: ['sessions', 'uiWorkspace', 'locale'],
      /**
       * Watch conversation status for the lifetime of the plugin.
       * @param ctx - browser plugin context.
       */
      apply(ctx) {
        const sessions = ctx.get('sessions')
        const uiWorkspace = ctx.get('uiWorkspace')
        const locale = ctx.get('locale')
        if (sessions === undefined || uiWorkspace === undefined) {
          ctx.logger?.warn?.('desktop-notify: conversation services are unavailable in this Client')
          return
        }
        if (locale !== undefined) {
          ctx.effect(() => locale.register(NS, dictionaries), 'desktop-notify: dictionaries')
        }
        const t = locale === undefined ? (key) => key : locale.bind(NS)

        const badge = createBadge(ctx)
        watchReturn(ctx, badge)

        /**
         * Last observed state per conversation. A comparison baseline only:
         * every value is rederived from the app's own snapshot each time.
         */
        const previous = new Map()
        let primed = false

        /**
         * Compare one snapshot of `{ running, interactionKey }` per conversation
         * against the previous one and announce the transitions that matter.
         * Accepts a Map or an iterable of [sessionId, state] pairs.
         */
        const diff = (entries) => {
          const seen = new Set()
          for (const [sessionId, state] of entries) {
            seen.add(sessionId)
            const running = state?.running === true
            const interactionKey = state?.interactionKey
            const before = previous.get(sessionId)
            previous.set(sessionId, { running, interactionKey })
            if (!primed || before === undefined) continue
            const label = labelOf(sessions, sessionId)
            if (label === undefined) continue
            const notice = (suffix) => ({
              body: `${label} · ${suffix}`,
              sessionId,
              shown: () => { badge.note(sessionId) },
              clicked: () => { badge.forget(sessionId) },
            })
            if (before.running && !running) {
              announce(ctx, uiWorkspace, notice(t('complete')))
            } else if (interactionKey !== undefined && interactionKey !== before.interactionKey) {
              announce(ctx, uiWorkspace, notice(t('choice')))
            }
          }
          for (const sessionId of [...previous.keys()]) {
            if (!seen.has(sessionId)) previous.delete(sessionId)
          }
          primed = true
        }

        const uiSession = ctx.get('uiSession')
        const status = uiSession?.sessionStatus
        if (status !== undefined && typeof status.subscribe === 'function') {
          // Preferred source: the app's unified status also carries the pending
          // interaction, so choices are announced too.
          const inspect = () => {
            let snapshot
            try {
              snapshot = status.getSnapshot()
            } catch (_error) {
              return
            }
            const entries = []
            for (const [sessionId, value] of snapshot) {
              entries.push([sessionId, { running: value?.running === true, interactionKey: value?.pendingInteraction?.key }])
            }
            diff(entries)
          }
          ctx.effect(() => status.subscribe(inspect), 'desktop-notify: conversation status')
          inspect()
          return
        }

        // Fallback for a Host whose status field is unavailable: the conversation
        // list still reports running state, so completions keep working.
        const inspectList = () => {
          let snapshot
          try {
            snapshot = sessions.list.getSnapshot()
          } catch (_error) {
            return
          }
          const entries = []
          for (const [sessionId, row] of Object.entries(snapshot.byId)) {
            entries.push([sessionId, { running: row?.running === true, interactionKey: undefined }])
          }
          diff(entries)
        }
        ctx.effect(() => sessions.list.subscribe(inspectList), 'desktop-notify: conversation list')
        inspectList()
      },
    }
  },
})
