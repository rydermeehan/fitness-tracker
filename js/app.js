/*
 * app.js — bootstrap, routing, and every event handler.
 */
(function (root, doc) {
  'use strict';
  var L = root.Logic, Store = root.Store, UI = root.UI, T = root.Templates;

  var VIEWS = ['today', 'habits', 'scorecard', 'progress', 'guide'];
  var current = 'today';

  /* Editor working state: what the chips have selected before saving. */
  var editing = null;           // habit id, or null for a new habit
  var draft = { type: 'build', schedule: { type: 'daily', days: [1, 2, 3, 4, 5], times: 3 } };

  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  /* ---------------------------------------------------------------- routing */

  function show(view) {
    if (VIEWS.indexOf(view) === -1) view = 'today';
    current = view;
    VIEWS.forEach(function (v) { $('#view-' + v).hidden = v !== view; });
    $$('.tab').forEach(function (t) {
      t.setAttribute('aria-selected', String(t.dataset.view === view));
    });
    if (root.location.hash.slice(1) !== view) root.location.hash = view;
    render();
    root.scrollTo(0, 0);
  }

  function render() {
    var state = Store.get();
    var el = $('#view-' + current);
    if (current === 'today') UI.renderToday(state, el);
    else if (current === 'habits') UI.renderHabits(state, el);
    else if (current === 'scorecard') UI.renderScorecard(state, el);
    else if (current === 'progress') UI.renderProgress(state, el);
    else UI.renderGuide(state, el);
  }

  /* ------------------------------------------------------------------ toast */

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ----------------------------------------------------------------- editor */

  function openEditor(habitOrNull) {
    editing = habitOrNull ? habitOrNull.id : null;
    var h = habitOrNull || {};
    draft = {
      type: h.type || 'build',
      schedule: {
        type: (h.schedule && h.schedule.type) || 'daily',
        days: (h.schedule && h.schedule.days) || [1, 2, 3, 4, 5],
        times: (h.schedule && h.schedule.times) || 3
      }
    };
    $('#editor-title').textContent = habitOrNull ? 'Edit habit' : 'Design a new habit';
    $('#editor-body').innerHTML = UI.editorForm(h);
    $('#editor').hidden = false;
    doc.body.style.overflow = 'hidden';
    setTimeout(function () { var n = $('#f-name'); if (n) n.focus(); }, 30);
  }

  function closeEditor() {
    $('#editor').hidden = true;
    doc.body.style.overflow = '';
    editing = null;
  }

  function readField(name) {
    var el = $('[name="' + name + '"]', $('#editor-body'));
    return el ? el.value.trim() : '';
  }

  function updateSentence() {
    var el = $('#sentence');
    if (!el) return;
    el.textContent = L.intention({
      type: draft.type,
      name: readField('name') || 'this habit',
      stackAfter: readField('stackAfter'),
      time: readField('time'),
      location: readField('location')
    });
  }

  function saveEditor() {
    var name = readField('name');
    if (!name) {
      toast('Give the habit a name first.');
      var n = $('#f-name'); if (n) n.focus();
      return;
    }
    var schedule = { type: draft.schedule.type };
    if (schedule.type === 'days') {
      schedule.days = draft.schedule.days.slice().sort(function (a, b) { return a - b; });
      if (!schedule.days.length) { toast('Pick at least one day.'); return; }
    } else if (schedule.type === 'weekly') {
      schedule.times = Number(readField('times')) || draft.schedule.times;
    }

    var fields = {
      name: name,
      type: draft.type,
      identity: readField('identity'),
      stackAfter: readField('stackAfter'),
      time: readField('time'),
      location: readField('location'),
      cue: readField('cue'),
      attractive: readField('attractive'),
      twoMinute: readField('twoMinute'),
      friction: readField('friction'),
      reward: readField('reward'),
      schedule: schedule
    };

    if (editing) { Store.updateHabit(editing, fields); toast('Habit updated.'); }
    else { Store.addHabit(fields); toast('Habit created. Now go and cast one vote.'); }
    closeEditor();
    if (current !== 'today' && current !== 'habits') show('habits');
  }

  /* ------------------------------------------------------- click delegation */

  doc.addEventListener('click', function (e) {
    var tab = e.target.closest('.tab');
    if (tab) { show(tab.dataset.view); return; }

    /* editor chips ------------------------------------------------------- */
    var body = $('#editor-body');
    if (body && body.contains(e.target)) {
      var typeChip = e.target.closest('[data-type]');
      if (typeChip) {
        draft.type = typeChip.dataset.type;
        var scroll = body.scrollTop;
        // Re-render so the law prompts flip to their inverted wording.
        var kept = collectDraftFields();
        body.innerHTML = UI.editorForm(Object.assign(kept, { type: draft.type, schedule: draft.schedule }));
        body.scrollTop = scroll;
        return;
      }
      var schedChip = e.target.closest('[data-sched]');
      if (schedChip) {
        draft.schedule.type = schedChip.dataset.sched;
        $$('[data-sched]', body).forEach(function (c) {
          c.setAttribute('aria-pressed', String(c.dataset.sched === draft.schedule.type));
        });
        $('#sched-days', body).hidden = draft.schedule.type !== 'days';
        $('#sched-weekly', body).hidden = draft.schedule.type !== 'weekly';
        return;
      }
      var dowChip = e.target.closest('[data-dow]');
      if (dowChip) {
        var d = Number(dowChip.dataset.dow);
        var i = draft.schedule.days.indexOf(d);
        if (i === -1) draft.schedule.days.push(d); else draft.schedule.days.splice(i, 1);
        dowChip.setAttribute('aria-pressed', String(i === -1));
        return;
      }
    }

    if (e.target.closest('[data-close]')) { closeEditor(); return; }

    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var act = btn.dataset.act;
    var id = btn.dataset.id;

    if (act === 'toggle') {
      Store.toggle(id, L.toISO(), false);
      celebrate(id);
    } else if (act === 'mini') {
      Store.toggle(id, L.toISO(), true);
      toast('Two-minute rep logged. Showing up is the habit.');
    } else if (act === 'toggle-day') {
      Store.toggle(id, btn.dataset.date, false);
    } else if (act === 'edit') {
      openEditor(Store.habitById(id));
    } else if (act === 'archive') {
      Store.archiveHabit(id, true); toast('Archived. Its history is kept.');
    } else if (act === 'unarchive') {
      Store.archiveHabit(id, false);
    } else if (act === 'delete') {
      var h = Store.habitById(id);
      if (h && confirm('Delete "' + h.name + '" and all of its history? This cannot be undone.')) {
        Store.removeHabit(id);
      }
    } else if (act === 'up') {
      Store.reorder(id, -1);
    } else if (act === 'down') {
      Store.reorder(id, 1);
    } else if (act === 'new') {
      openEditor(null);
    } else if (act === 'starter') {
      var s = T.STARTERS[Number(btn.dataset.i)];
      if (s) { openEditor(Object.assign({}, s)); }
    } else if (act === 'verdict') {
      Store.updateScorecardItem(id, { verdict: btn.dataset.v });
    } else if (act === 'score-remove') {
      Store.removeScorecardItem(id);
    }
  });

  /** Pull whatever is currently typed, so re-rendering the form loses nothing. */
  function collectDraftFields() {
    return {
      name: readField('name'), identity: readField('identity'),
      stackAfter: readField('stackAfter'), time: readField('time'),
      location: readField('location'), cue: readField('cue'),
      attractive: readField('attractive'), twoMinute: readField('twoMinute'),
      friction: readField('friction'), reward: readField('reward')
    };
  }

  /** A quiet nod when a habit is completed — the reward that closes the loop. */
  function celebrate(id) {
    var h = Store.habitById(id);
    if (!h || !L.isDone(Store.get().log, id, L.toISO())) return;
    var st = L.streak(h, Store.get().log, L.toISO());
    if (h.identity) toast('One more vote for being ' + h.identity + '. Streak: ' + st.count + ' ' + st.unit + '.');
    else toast('Done. Streak: ' + st.count + ' ' + st.unit + '.');
  }

  /* -------------------------------------------------------- input handlers */

  doc.addEventListener('input', function (e) {
    var body = $('#editor-body');
    if (body && body.contains(e.target)) updateSentence();
  });

  doc.addEventListener('submit', function (e) {
    if (e.target.id === 'score-form') {
      e.preventDefault();
      var input = $('#score-input');
      var text = input.value.trim();
      if (!text) return;
      Store.addScorecardItem(text, '=');
      // Re-rendering wipes the field, so restore focus for fast list entry.
      var next = $('#score-input');
      if (next) { next.value = ''; next.focus(); }
    }
  });

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('#editor').hidden) { closeEditor(); return; }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !$('#editor').hidden) { saveEditor(); return; }
    // Number keys jump between views when not typing.
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(doc.activeElement.tagName);
    if (!typing && !e.metaKey && !e.ctrlKey && /^[1-5]$/.test(e.key)) show(VIEWS[Number(e.key) - 1]);
  });

  /* ----------------------------------------------------- chrome + settings */

  function applyTheme(theme) {
    doc.documentElement.setAttribute('data-theme', theme);
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f6f7f9' : '#0e1116');
  }

  $('#theme-toggle').addEventListener('click', function () {
    var next = Store.get().settings.theme === 'light' ? 'dark' : 'light';
    Store.setSetting('theme', next);
    applyTheme(next);
  });

  $('#new-habit-btn').addEventListener('click', function () { openEditor(null); });
  $('#editor-save').addEventListener('click', saveEditor);

  $('#export-btn').addEventListener('click', function () {
    var blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    var a = doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'atomic-habits-' + L.toISO() + '.json';
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('Exported.');
  });

  $('#import-btn').addEventListener('click', function () { $('#import-file').click(); });
  $('#import-file').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        Store.importJSON(String(reader.result));
        applyTheme(Store.get().settings.theme);
        toast('Data imported.');
      } catch (err) {
        toast('Could not import that file: ' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  $('#reset-btn').addEventListener('click', function () {
    if (!confirm('Erase every habit, all history, and the scorecard? This cannot be undone.')) return;
    if (!confirm('Really erase everything? Export first if you might want it back.')) return;
    Store.resetAll();
    applyTheme(Store.get().settings.theme);
    toast('Everything erased.');
  });

  root.addEventListener('hashchange', function () {
    var v = root.location.hash.slice(1);
    if (v && v !== current) show(v);
  });

  /* A tab left open overnight should wake up on the new day, not yesterday. */
  var bootDay = L.toISO();
  setInterval(function () {
    if (L.toISO() !== bootDay) { bootDay = L.toISO(); render(); }
  }, 60000);
  doc.addEventListener('visibilitychange', function () {
    if (!doc.hidden && L.toISO() !== bootDay) { bootDay = L.toISO(); render(); }
  });

  /* ------------------------------------------------------------------ boot */

  Store.load();
  Store.subscribe(render);
  applyTheme(Store.get().settings.theme);
  show(root.location.hash.slice(1) || 'today');
})(window, document);
