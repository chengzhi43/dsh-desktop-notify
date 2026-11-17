/**
 * Headless status-machine test for the notification client half.
 *
 * Runs `client.js` against stubbed Client services — no DOM, no Electron, no
 * DSH — and asserts the four behaviours the plugin promises: announce a finished
 * turn, announce a new pending choice once, stay silent for subagent rows, and
 * open the conversation on click. Also covers the conversation-list fallback.
 *
 * Exit code 0 means every assertion passed; CI runs it on Linux.
 */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')

const source = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8')
const ID = 'dsh-desktop-notify'

let shown = []
const opened = []

class NotificationStub {
  static permission = 'granted'
  static requestPermission() { return Promise.resolve('granted') }
  constructor(title, options) {
    this.title = title
    this.options = options
    this.onclick = undefined
    shown.push(this)
  }
  close() { this.closed = true }
}

function mount({ withStatus }) {
  shown = []
  const statusListeners = new Set()
  const listListeners = new Set()
  let statusSnapshot = new Map()
  const rows = {
    s1: { id: 's1', displayTitle: 'Fix the login bug', running: false },
    s2: { id: 's2', displayTitle: 'Write release notes', running: false },
    s3: { id: 's3', displayTitle: 'child worker', running: true, parentId: 's1', origin: 'subagent' },
  }
  const services = {
    sessions: {
      list: {
        getSnapshot: () => ({ ids: Object.keys(rows), byId: rows, phase: 'ready', projectionsBySession: {} }),
        subscribe: (listener) => { listListeners.add(listener); return () => listListeners.delete(listener) },
      },
    },
    uiWorkspace: { openSession: (id) => { opened.push(id) } },
    locale: {
      register: () => () => {},
      bind: () => (key) => ({ complete: 'finished', choice: 'waiting for your choice' })[key],
    },
  }
  if (withStatus) {
    services.uiSession = {
      sessionStatus: {
        getSnapshot: () => statusSnapshot,
        subscribe: (listener) => { statusListeners.add(listener); return () => statusListeners.delete(listener) },
      },
    }
  }

  const effects = []
  const ctx = {
    get: (name) => services[name],
    effect: (factory, label) => { const dispose = factory(); effects.push({ label, dispose }); return dispose },
    logger: { warn: (message) => console.error('[warn]', message) },
  }

  const registry = {}
  const previousNotification = globalThis.Notification
  const previousWindow = globalThis.window
  globalThis.Notification = NotificationStub
  globalThis.window = {
    __ModuleLoader__: { load: ({ id, factory }) => { registry[id] = factory } },
    focus: () => { globalThis.focused = true },
  }
  new Function(source)()
  const plugin = registry[ID]({})
  plugin.apply(ctx)
  assert.equal(globalThis.Notification, NotificationStub)
  assert.ok(registry[ID], 'client bundle registers its factory')
  assert.deepEqual(plugin.inject, ['sessions', 'uiWorkspace', 'locale'])

  return {
    rows,
    effects,
    publishStatus: (entries) => {
      statusSnapshot = new Map(entries)
      for (const listener of [...statusListeners]) listener()
    },
    publishList: () => { for (const listener of [...listListeners]) listener() },
    teardown: () => {
      for (const effect of effects) if (typeof effect.dispose === 'function') effect.dispose()
      globalThis.Notification = previousNotification
      globalThis.window = previousWindow
    },
    listeners: () => statusListeners.size + listListeners.size,
  }
}

const bodies = () => shown.map(notification => notification.options.body)
const labels = () => shown.map(notification => notification.options.body.split(' · ')[1])

// ---------- preferred status source ----------
const run = mount({ withStatus: true })
assert.deepEqual(run.effects.map(effect => effect.label), [
  'desktop-notify: dictionaries',
  'desktop-notify: conversation status',
])

// Baseline never announces.
run.publishStatus([['s1', { running: true }], ['s2', { running: false }], ['s3', { running: true }]])
assert.equal(shown.length, 0, 'priming announces nothing')

// A finished turn announces with the conversation title.
run.publishStatus([['s1', { running: false }], ['s2', { running: false }], ['s3', { running: true }]])
assert.deepEqual(bodies(), ['Fix the login bug · finished'])

// A new pending choice announces once, and republishing it stays quiet.
const choice = [['s1', { running: false }], ['s2', { running: true, pendingInteraction: { key: 'ask-1' } }], ['s3', { running: true }]]
run.publishStatus(choice)
assert.deepEqual(bodies(), ['Fix the login bug · finished', 'Write release notes · waiting for your choice'])
run.publishStatus(choice)
assert.equal(shown.length, 2, 'a republished interaction does not re-announce')

// A subagent row finishing stays silent.
run.publishStatus([
  ['s1', { running: false }],
  ['s2', { running: true, pendingInteraction: { key: 'ask-1' } }],
  ['s3', { running: false }],
])
assert.equal(shown.length, 2, 'subagent completion stays silent')

// Clicking opens that conversation, focuses, and closes the notification.
shown[0].onclick()
assert.deepEqual(opened, ['s1'])
assert.equal(globalThis.focused, true)
assert.equal(shown[0].closed, true)
assert.equal(shown[0].title, 'DeepSeek Harness')

// Unloading leaves no listener behind.
run.teardown()
assert.equal(run.listeners(), 0, 'dispose removes every subscription')

console.log('status source: ok', JSON.stringify(bodies()), 'labels:', JSON.stringify(labels()))

// ---------- conversation-list fallback ----------
const fallback = mount({ withStatus: false })
assert.deepEqual(fallback.effects.map(effect => effect.label), [
  'desktop-notify: dictionaries',
  'desktop-notify: conversation list',
])
fallback.rows.s1.running = true
fallback.publishList()
fallback.rows.s1.running = false
fallback.publishList()
assert.deepEqual(bodies(), ['Fix the login bug · finished'])
fallback.rows.s2.running = true
fallback.publishList()
fallback.rows.s2.running = false
fallback.publishList()
assert.equal(shown.length, 2, 'the fallback announces every completion')
fallback.teardown()
assert.equal(fallback.listeners(), 0)

console.log('fallback source: ok', JSON.stringify(bodies()))
console.log('all assertions passed')
