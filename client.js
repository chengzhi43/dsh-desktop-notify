/**
 * Browser half of the desktop notification plugin.
 *
 * The app already publishes per-conversation UI status: whether a turn runs and
 * the pending interaction awaiting the user. This module turns the two
 * transitions that matter into system notifications — a turn finishing, and the
 * agent starting to wait for a choice — and opens that conversation when the
 * notification is clicked.
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

    /** Raise one system notification and wire its click to conversation navigation. */
    function announce(ctx, uiWorkspace, body, sessionId) {
      if (typeof Notification === 'undefined') return
      if (Notification.permission === 'denied') return
      const show = () => {
        try {
          // No `icon`: every platform already attributes the notification to this
          // app, so the app icon is the one the user should see.
          const notification = new Notification(HEADING, {
            body,
            tag: `dsh-desktop-notify:${sessionId}`,
            silent: false,
          })
          notification.onclick = () => {
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
            if (before.running && !running) {
              announce(ctx, uiWorkspace, `${label} · ${t('complete')}`, sessionId)
            } else if (interactionKey !== undefined && interactionKey !== before.interactionKey) {
              announce(ctx, uiWorkspace, `${label} · ${t('choice')}`, sessionId)
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
