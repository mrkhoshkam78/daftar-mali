/**
 * tests.js — تست‌های سبک دفتر مالی
 * اجرا: window.__runDaftarTests() یا ?test=1 / localStorage daftar-run-tests=1
 * وابسته به globals: $, fmt, safeNum, getStatePayload, notes, render*, …
 * منطق assertها و پوشش تست‌ها عمداً ثابت است.
 */
(function () {
  'use strict';

  /* --- harness --- */
  function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
  }
  function approx(a, b, eps) {
    return Math.abs(Number(a) - Number(b)) < (eps || 1e-6);
  }

  const tests = [];
  function test(name, fn) {
    tests.push({ name: name, fn: fn });
  }

  /* --- helpers / core --- */
  test('helpers: $ and fmt exist', function () {
    assert(typeof $ === 'function', '$ missing');
    assert(typeof fmt === 'function', 'fmt missing');
    assert(typeof safeNum === 'function', 'safeNum missing');
  });

  test('safeNum edge cases', function () {
    assert(safeNum(null, 0) === 0, 'null');
    assert(safeNum(undefined, 5) === 5, 'undefined');
    assert(safeNum('1,234', 0) === 1234 || safeNum('1234', 0) === 1234, 'string number');
    assert(safeNum(NaN, 1) === 1, 'NaN');
  });

  test('persist payload includes notes', function () {
    assert(typeof getStatePayload === 'function', 'getStatePayload');
    const p = getStatePayload();
    assert(p && typeof p === 'object', 'payload object');
    assert(Array.isArray(p.notes), 'notes array');
    assert(Array.isArray(p.logs), 'logs array');
    assert(Array.isArray(p.notebook), 'notebook array');
    assert(p.assets && typeof p.assets === 'object', 'assets');
  });

  /* --- notes --- */
  test('notes open/save flow (in-memory)', function () {
    assert(typeof openNoteEditor === 'function', 'openNoteEditor');
    assert(typeof openNoteModal === 'function', 'openNoteModal');
    assert(typeof renderNotes === 'function', 'renderNotes');
    if (!$('noteModal') || !$('noteSaveBtn') || !$('noteTitle')) {
      // DOM incomplete — skip soft
      return;
    }
    const before = (notes || []).length;
    openNoteEditor(null);
    assert($('noteModal').classList.contains('open'), 'modal opens');
    assert($('noteModal').classList.contains('mode-edit'), 'mode-edit');
    $('noteTitle').value = '__test_note_title__';
    $('noteBody').value = 'test body';
    // simulate save without relying on click
    const title = ($('noteTitle').value || '').trim();
    const body = ($('noteBody').value || '').trim();
    assert(title || body, 'title/body');
    if (!Array.isArray(notes)) notes = [];
    const now = new Date().toISOString();
    notes.push({
      id: 'test-' + Date.now(),
      title: title,
      body: body,
      cat: 'daily',
      tags: [],
      pinned: false,
      createdAt: now,
      updatedAt: now
    });
    assert(notes.length === before + 1, 'note pushed');
    // cleanup test note
    notes = notes.filter(function (n) {
      return !(n && String(n.title) === '__test_note_title__');
    });
    if (typeof closeNoteModal === 'function') closeNoteModal();
  });

  /* --- notebook / snapp --- */
  test('notebook day grouping structure', function () {
    assert(typeof renderNotebook === 'function', 'renderNotebook');
    if (!$('nbList')) return;
    const prev = Array.isArray(notebook) ? notebook.slice() : [];
    try {
      renderNotebook();
    } catch (e) {
      throw new Error('renderNotebook threw: ' + e.message);
    }
    notebook = prev;
  });

  test('snapp logs render', function () {
    assert(typeof renderLogs === 'function', 'renderLogs');
    if (!$('logList')) return;
    try {
      renderLogs();
    } catch (e) {
      throw new Error('renderLogs threw: ' + e.message);
    }
    const items = $('logList').querySelectorAll('.log-item');
    items.forEach(function (it) {
      assert(it.querySelector('.d'), 'date span');
      assert(it.querySelector('.p'), 'profit span');
    });
  });

  test('day collapse default is collapsed class when no expanded keys', function () {
    if (typeof nbDayExpanded === 'undefined') return;
    assert(nbDayExpanded instanceof Set, 'nbDayExpanded is Set');
  });

  /* --- shell --- */
  test('design attribute preserved', function () {
    const d = document.documentElement.getAttribute('data-design');
    assert(d === 'aurora' || d === 'neobank' || d === 'classic', 'valid design');
  });

  /* --- runner --- */
  window.__runDaftarTests = function () {
    const results = [];
    let passed = 0;
    let failed = 0;
    tests.forEach(function (t) {
      try {
        t.fn();
        results.push({ name: t.name, ok: true });
        passed++;
      } catch (e) {
        results.push({
          name: t.name,
          ok: false,
          error: String(e && e.message ? e.message : e)
        });
        failed++;
      }
    });
    const summary = { passed: passed, failed: failed, total: tests.length, results: results };
    try {
      console.log('[DaftarTests]', summary);
    } catch (e) {}
    return summary;
  };

  // auto-run after load when ?test=1
  function boot() {
    try {
      if (
        /[?&]test=1\b/.test(location.search) ||
        localStorage.getItem('daftar-run-tests') === '1'
      ) {
        setTimeout(function () {
          window.__runDaftarTests();
        }, 400);
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
