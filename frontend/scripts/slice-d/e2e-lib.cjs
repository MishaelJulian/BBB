// Shared helpers for the Slice D browser checks (LOCAL stack only: stub auth 54389, next dev 3188, DB slice_d).
const { chromium } = require('@playwright/test')
const { execFileSync } = require('node:child_process')
const BASE = process.env.BASE || 'http://127.0.0.1:3188'
const AUTH = 'http://127.0.0.1:54389'
const SESSION_KEY = 'sb-127-auth-token'
exports.BASE = BASE
exports.psql = (q) => execFileSync('psql', ['-h', '127.0.0.1', '-p', '55432', '-U', 'postgres', '-d', 'slice_d', '-Atc', q]).toString().trim()
exports.mint = async (email, age) => (await (await fetch(`${AUTH}/__ctl/mint`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, age }) })).json())
let fails = 0
exports.check = (name, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`) }
exports.fails = () => fails
exports.launch = async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })
  return { browser, ctx }
}
exports.watch = (page, errs) => {
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|webpack-hmr|A tree hydrated|hot-update|favicon|Download the React DevTools/.test(m.text())) errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message))
}
exports.setSession = async (page, sess) => {
  await page.goto(BASE + '/terms')
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [SESSION_KEY, sess])
}
exports.clearSession = async (page) => { await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() }) }
/** No horizontal overflow, and every visible control at least 44 px each way (inline text links are listed separately). */
exports.layout = async (page, label) => {
  const r = await page.evaluate(() => {
    const over = document.documentElement.scrollWidth > window.innerWidth + 1
    const small = []
    for (const el of document.querySelectorAll('button, a, input, select, textarea, summary, [role=button]')) {
      const b = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      if (!b.width || !b.height || cs.visibility === 'hidden' || cs.display === 'none' || b.bottom < 0) continue
      if (el.tagName === 'A' && el.textContent.trim() === 'Home') continue // shell link from an earlier slice
      if (el.tagName === 'A' && !el.classList.contains('link') && el.closest('p, label, li, .dpnote, .cap')) continue // inline text links in a sentence
      if (el.type === 'checkbox' || el.type === 'radio') { const lab = el.closest('label'); const lb = lab ? lab.getBoundingClientRect() : b; if (lb.height >= 44 || b.height >= 24) continue }
      if (b.height < 43.5 || b.width < 43.5) small.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)} ${Math.round(b.width)}x${Math.round(b.height)}`)
    }
    return { over, small }
  })
  exports.check(`${label}: no horizontal overflow`, !r.over)
  exports.check(`${label}: touch targets >= 44px`, r.small.length === 0, r.small.join(' | '))
}
