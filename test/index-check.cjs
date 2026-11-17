/**
 * Structural check for `index.json`, the plugin-market index this repository publishes.
 *
 * DSH validates indexes with `@deepseek-ai/dsh-plugin-market-index` at read time. That package ships inside the
 * desktop app, so CI cannot import it. This script keeps the four mistakes that matter here from reaching `main`:
 * a wrong format number, an unpinned Git source, a version that is not exact SemVer, and a URL that is not the
 * canonical https form the validator demands.
 *
 * Run: node test/index-check.cjs
 */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')

const REPOSITORY = 'https://github.com/chengzhi43/dsh-desktop-notify'
const SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
const COMMIT = /^[0-9a-f]{40}$/
const PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

const file = path.join(__dirname, '..', 'index.json')
const index = JSON.parse(fs.readFileSync(file, 'utf8'))

assert.equal(index.format, 1, 'index.json must declare format 1')
assert.ok(index.title && typeof index.title === 'object' && typeof index.title.en === 'string', 'title needs an en string')
assert.ok(Array.isArray(index.plugins) && index.plugins.length > 0, 'plugins must be a non-empty array')

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
const names = new Set()

for (const plugin of index.plugins) {
  assert.match(plugin.name, PACKAGE_NAME, `${plugin.name}: not an npm package name`)
  assert.ok(!names.has(plugin.name), `${plugin.name}: duplicated in the index`)
  names.add(plugin.name)
  assert.ok(plugin.title && typeof plugin.title.en === 'string', `${plugin.name}: title needs an en string`)
  assert.ok(Array.isArray(plugin.versions) && plugin.versions.length > 0, `${plugin.name}: needs a version`)
  for (const version of plugin.versions) {
    assert.match(version.version, SEMVER, `${plugin.name}: ${version.version} is not exact SemVer`)
    assert.ok(Number.isInteger(version.publishTimestamp) && version.publishTimestamp > 0, `${plugin.name}: publishTimestamp must be Unix seconds`)
    assert.equal(version.source?.type, 'git', `${plugin.name}: this repository publishes Git sources`)
    assert.equal(version.source.url, REPOSITORY, `${plugin.name}: source url must be the canonical repository URL`)
    assert.match(version.source.commit, COMMIT, `${plugin.name}: commit must be a lowercase 40-hex SHA`)
  }
  if (plugin.name === pkg.name) {
    assert.ok(
      plugin.versions.some(version => version.version === pkg.version),
      `${plugin.name}: index does not list the package.json version ${pkg.version}`,
    )
  }
}

console.log(`index.json: ok, ${index.plugins.length} plugin(s), versions ${index.plugins.flatMap(p => p.versions.map(v => v.version)).join(', ')}`)
