/*
 * store.js — state, persistence, and mutations.
 *
 * Everything lives in localStorage under one key, so the app works offline and
 * owns no server. Import/export moves the same shape as a JSON file.
 */
(function (root) {
  'use strict';
  var L = root.Logic;

  var KEY = 'atomic.v1';
  var listeners = [];

  var state = null;

  function blank() {
    return {
      version: 1,
      habits: [],
      log: {},          // { habitId: { 'YYYY-MM-DD': { done, mini, note } } }
      scorecard: [],    // { id, text, verdict: '+' | '-' | '=' }
      settings: { theme: 'dark', onboarded: false },
      createdAt: L.toISO()
    };
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  /* ------------------------------------------------------------ lifecycle */

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      state = raw ? migrate(JSON.parse(raw)) : blank();
    } catch (e) {
      console.warn('Could not read saved data, starting fresh.', e);
      state = blank();
    }
    return state;
  }

  /** Fill in anything a older/hand-edited payload is missing. */
  function migrate(data) {
    var base = blank();
    var out = Object.assign(base, data || {});
    out.settings = Object.assign(base.settings, data && data.settings);
    if (!Array.isArray(out.habits)) out.habits = [];
    if (!Array.isArray(out.scorecard)) out.scorecard = [];
    if (!out.log || typeof out.log !== 'object') out.log = {};
    out.habits.forEach(function (h) {
      if (!h.id) h.id = uid();
      if (!h.schedule) h.schedule = { type: 'daily' };
      if (!h.createdAt) h.createdAt = out.createdAt || L.toISO();
    });
    return out;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save. Storage may be full or blocked.', e);
    }
  }

  function commit() {
    save();
    listeners.forEach(function (fn) { fn(state); });
  }

  function subscribe(fn) { listeners.push(fn); return function () {
    listeners = listeners.filter(function (f) { return f !== fn; });
  }; }

  function get() { return state; }

  /* --------------------------------------------------------------- habits */

  var PALETTE = ['#6ee7b7', '#93c5fd', '#fca5a5', '#fcd34d', '#c4b5fd', '#f9a8d4', '#5eead4', '#fdba74'];

  function addHabit(fields) {
    var habit = Object.assign({
      id: uid(),
      name: '',
      type: 'build',          // 'build' | 'break'
      identity: '',
      cue: '',                 // make it obvious
      time: '',
      location: '',
      stackAfter: '',
      attractive: '',          // make it attractive (temptation bundle)
      twoMinute: '',           // make it easy
      friction: '',            // environment design
      reward: '',              // make it satisfying
      schedule: { type: 'daily' },
      color: PALETTE[state.habits.length % PALETTE.length],
      createdAt: L.toISO(),
      archived: false
    }, fields || {});
    state.habits.push(habit);
    commit();
    return habit;
  }

  function updateHabit(id, fields) {
    var h = habitById(id);
    if (!h) return null;
    Object.assign(h, fields);
    commit();
    return h;
  }

  function removeHabit(id) {
    state.habits = state.habits.filter(function (h) { return h.id !== id; });
    delete state.log[id];
    commit();
  }

  function archiveHabit(id, archived) {
    return updateHabit(id, { archived: archived !== false });
  }

  function habitById(id) {
    return state.habits.filter(function (h) { return h.id === id; })[0] || null;
  }

  function reorder(id, delta) {
    var i = state.habits.findIndex(function (h) { return h.id === id; });
    var j = i + delta;
    if (i < 0 || j < 0 || j >= state.habits.length) return;
    var moved = state.habits.splice(i, 1)[0];
    state.habits.splice(j, 0, moved);
    commit();
  }

  /* ----------------------------------------------------------------- log */

  /** Toggle a day. `mini` marks it as a two-minute-rule rep. */
  function toggle(habitId, iso, mini) {
    var day = iso || L.toISO();
    if (!state.log[habitId]) state.log[habitId] = {};
    var entry = state.log[habitId][day];
    if (entry && entry.done && (!mini || entry.mini)) {
      delete state.log[habitId][day];
    } else {
      state.log[habitId][day] = Object.assign({}, entry, { done: true, mini: !!mini });
    }
    commit();
    return state.log[habitId][day] || null;
  }

  function setNote(habitId, iso, note) {
    var day = iso || L.toISO();
    if (!state.log[habitId]) state.log[habitId] = {};
    var entry = state.log[habitId][day] || { done: false };
    entry.note = note;
    if (!entry.done && !note) delete state.log[habitId][day];
    else state.log[habitId][day] = entry;
    commit();
  }

  /* ----------------------------------------------------------- scorecard */

  function addScorecardItem(text, verdict) {
    state.scorecard.push({ id: uid(), text: text, verdict: verdict || '=' });
    commit();
  }
  function updateScorecardItem(id, fields) {
    var it = state.scorecard.filter(function (s) { return s.id === id; })[0];
    if (it) { Object.assign(it, fields); commit(); }
  }
  function removeScorecardItem(id) {
    state.scorecard = state.scorecard.filter(function (s) { return s.id !== id; });
    commit();
  }

  /* ------------------------------------------------------------ settings */

  function setSetting(key, value) {
    state.settings[key] = value;
    commit();
  }

  /* -------------------------------------------------------- import/export */

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    var data = JSON.parse(text);
    if (!data || typeof data !== 'object') throw new Error('That file is not habit data.');
    if (!Array.isArray(data.habits)) throw new Error('No habits found in that file.');
    state = migrate(data);
    commit();
  }

  function resetAll() {
    state = blank();
    commit();
  }

  root.Store = {
    KEY: KEY,
    PALETTE: PALETTE,
    load: load, get: get, subscribe: subscribe, commit: commit, uid: uid,
    addHabit: addHabit, updateHabit: updateHabit, removeHabit: removeHabit,
    archiveHabit: archiveHabit, habitById: habitById, reorder: reorder,
    toggle: toggle, setNote: setNote,
    addScorecardItem: addScorecardItem, updateScorecardItem: updateScorecardItem,
    removeScorecardItem: removeScorecardItem,
    setSetting: setSetting,
    exportJSON: exportJSON, importJSON: importJSON, resetAll: resetAll
  };
})(window);
