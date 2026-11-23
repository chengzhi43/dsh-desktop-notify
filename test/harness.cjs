/**
 * Headless status-machine test for the notification client half.
 *
 * Runs `client.js` against stubbed Client services — no DOM, no Electron, no
 * DSH — and asserts the behaviours the plugin promises: announce a finished
 * turn, announce a new pending choice once, stay silent for subagent rows, open
 * the conversation on click, badge the app icon while the window is away, and
 * drop that badge when the user comes back. Also covers the conversation-list
 * fallback.
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

/**
 * A window that can be away from the user: `away()` hides and unfocuses it,
 * `back()` restores both and lets the page see the change.
 */
function createView({ badging = true } = {}) {
  const listeners = new Map()
  const state = { visibility: 'visible', focused: true }
  const badgeCalls = []
  const add = (type, listener) => {
    const set = listeners.get(type) ?? new Set()
    set.add(listener)
    listeners.set(type, set)
  }
  const remove = (type, listener) => { listeners.get(type)?.delete(listener) }
  const emit = (type) => { for (const listener of [...(listeners.get(type) ?? [])]) listener() }

  const view = {
    __ModuleLoader__: { load: ({ id, factory }) => { view.registry[id] = factory } },
    registry: {},
    focus: () => { state.focused = true },
    addEventListener: add,
    removeEventListener: remove,
    document: {
      get visibilityState() { return state.visibility },
      hasFocus: () => state.focused,
      addEventListener: add,
      removeEventListener: remove,
    },
    navigator: badging
      ? {
        setAppBadge: (count) => { badgeCalls.push(['set', count]); return Promise.resolve() },
        clearAppBadge: () => { badgeCalls.push(['clear']); return Promise.resolve() },
      }
      : {},
    badgeCalls,
    away: () => { state.visibility = 'hidden'; state.focused = false },
    back: () => {
      state.visibility = 'visible'
      state.focused = true
      emit('visibilitychange')
      emit('focus')
    },
    listenerCount: () => [...listeners.values()].reduce((total, set) => total + set.size, 0),
  }
  return view
}

function mount({ withStatus, badging = true }) {
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

  const view = createView({ badging })
  new Function('window', 'document', 'navigator', 'Notification', source)(
    view,
    view.document,
    view.navigator,
    NotificationStub,
  )
  const plugin = view.registry[ID]({})
  plugin.apply(ctx)
  assert.ok(view.registry[ID], 'client bundle registers its factory')
  assert.deepEqual(plugin.inject, ['sessions', 'uiWorkspace', 'locale'])

  return {
    rows,
    effects,
    view,
    publishStatus: (entries) => {
      statusSnapshot = new Map(entries)
      for (const listener of [...statusListeners]) listener()
    },
    publishList: () => { for (const listener of [...listListeners]) listener() },
    teardown: () => {
      for (const effect of effects) if (typeof effect.dispose === 'function') effect.dispose()
    },
    listeners: () => statusListeners.size + listListeners.size + view.listenerCount(),
  }
}

const bodies = () => shown.map(notification => notification.options.body)
const labels = () => shown.map(notification => notification.options.body.split(' · ')[1])

// ---------- preferred status source ----------
const run = mount({ withStatus: true })
assert.deepEqual(run.effects.map(effect => effect.label), [
  'desktop-notify: dictionaries',
  'desktop-notify: app-icon badge',
  'desktop-notify: conversation status',
])

// Baseline never announces.
run.publishStatus([['s1', { running: true }], ['s2', { running: false }], ['s3', { running: true }]])
assert.equal(shown.length, 0, 'priming announces nothing')

// The user is at the window: a notification is announced, and the icon stays clean.
run.publishStatus([['s1', { running: false }], ['s2', { running: false }], ['s3', { running: true }]])
assert.deepEqual(bodies(), ['Fix the login bug · finished'])
assert.deepEqual(run.view.badgeCalls, [], 'a watched window never badges')

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
assert.deepEqual(run.view.badgeCalls, [], 'clicking an unbadged notification clears nothing')
assert.equal(shown[0].closed, true)
assert.equal(shown[0].title, 'DeepSeek Harness')

// ---------- app-icon badge ----------
// Two conversations finish while the user is in another app: the icon counts both.
run.view.away()
run.publishStatus([['s1', { running: true }], ['s2', { running: true, pendingInteraction: { key: 'ask-1' } }], ['s3', { running: true }]])
run.publishStatus([['s1', { running: false }], ['s2', { running: true, pendingInteraction: { key: 'ask-1' } }], ['s3', { running: true }]])
assert.deepEqual(run.view.badgeCalls, [['set', 1]], 'the first unseen notification badges 1')

run.publishStatus([['s1', { running: false }], ['s2', { running: false, pendingInteraction: undefined }], ['s3', { running: true }]])
assert.deepEqual(run.view.badgeCalls, [['set', 1], ['set', 2]], 'a second conversation badges 2')

// The same conversation reporting again replaces its notification instead of stacking.
run.publishStatus([['s1', { running: true }], ['s2', { running: false }], ['s3', { running: true }]])
run.publishStatus([['s1', { running: false }], ['s2', { running: false }], ['s3', { running: true }]])
assert.deepEqual(run.view.badgeCalls, [['set', 1], ['set', 2]], 'one conversation keeps one badge slot')

// Clicking a notification forgets that conversation only.
shown.at(-1).onclick()
assert.deepEqual(run.view.badgeCalls, [['set', 1], ['set', 2], ['set', 1]], 'opening one conversation leaves the other counted')

// Coming back to the window clears the icon.
run.view.back()
assert.deepEqual(run.view.badgeCalls, [['set', 1], ['set', 2], ['set', 1], ['clear']], 'returning to the window clears the badge')

// Unloading leaves no listener behind.
run.teardown()
assert.equal(run.listeners(), 0, 'dispose removes every subscription')

console.log('status source: ok', JSON.stringify(bodies()), 'labels:', JSON.stringify(labels()), 'badge:', JSON.stringify(run.view.badgeCalls))

// ---------- conversation-list fallback ----------
const fallback = mount({ withStatus: false })
assert.deepEqual(fallback.effects.map(effect => effect.label), [
  'desktop-notify: dictionaries',
  'desktop-notify: app-icon badge',
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

// ---------- no Badging API ----------
const plain = mount({ withStatus: true, badging: false })
plain.view.away()
plain.publishStatus([['s1', { running: true }], ['s2', { running: false }], ['s3', { running: true }]])
plain.publishStatus([['s1', { running: false }], ['s2', { running: false }], ['s3', { running: true }]])
assert.equal(shown.length, 1, 'notifications still work without the badge API')
assert.deepEqual(plain.view.badgeCalls, [], 'a Client without the Badging API stays quiet')
plain.teardown()
assert.equal(plain.listeners(), 0)

console.log('without badging: ok', JSON.stringify(bodies()))
console.log('all assertions passed')
