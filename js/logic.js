/*
 * logic.js — pure domain logic for Atomic.
 *
 * Nothing in here touches the DOM or localStorage, so every rule below is
 * testable from Node (see tests/run.js) and reusable from the UI.
 *
 * The vocabulary comes straight from Atomic Habits: habits are votes for an
 * identity, streaks matter less than "never miss twice", and small wins
 * compound.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------------------------------------------------------- dates */

  var DAY_MS = 86400000;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /** Local-time ISO date (YYYY-MM-DD). Never use toISOString(): it's UTC. */
  function toISO(date) {
    var d = date || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /** Parse YYYY-MM-DD into a Date at local midnight. */
  function fromISO(iso) {
    var p = String(iso).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function addDays(iso, n) {
    var d = fromISO(iso);
    d.setDate(d.getDate() + n);
    return toISO(d);
  }

  /** Whole days from `a` to `b` (b - a). Both are ISO strings. */
  function daysBetween(a, b) {
    return Math.round((fromISO(b) - fromISO(a)) / DAY_MS);
  }

  /** 0 = Sunday .. 6 = Saturday, matching Date#getDay. */
  function dayOfWeek(iso) { return fromISO(iso).getDay(); }

  /** Monday-start week key, so "3x per week" resets on Monday. */
  function weekStart(iso) {
    var dow = dayOfWeek(iso);
    return addDays(iso, -((dow + 6) % 7));
  }

  function range(fromIso, toIso) {
    var out = [], cur = fromIso;
    while (daysBetween(cur, toIso) >= 0) { out.push(cur); cur = addDays(cur, 1); }
    return out;
  }

  /* ------------------------------------------------------------- schedule */

  /**
   * Schedules:
   *   { type: 'daily' }
   *   { type: 'days',  days: [1,3,5] }   // day-of-week numbers
   *   { type: 'weekly', times: 3 }       // any 3 days in a Mon-Sun week
   */
  function isScheduled(habit, iso) {
    var s = (habit && habit.schedule) || { type: 'daily' };
    if (s.type === 'days') return (s.days || []).indexOf(dayOfWeek(iso)) !== -1;
    return true; // daily and weekly are both "available" every day
  }

  function isFlexible(habit) {
    var s = (habit && habit.schedule) || {};
    return s.type === 'weekly';
  }

  function weeklyTarget(habit) {
    var s = (habit && habit.schedule) || {};
    return Math.max(1, Number(s.times) || 1);
  }

  function scheduleLabel(habit) {
    var s = (habit && habit.schedule) || { type: 'daily' };
    var names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (s.type === 'weekly') return weeklyTarget(habit) + '× per week';
    if (s.type === 'days') {
      var days = (s.days || []).slice().sort(function (a, b) { return a - b; });
      if (days.length === 7) return 'Every day';
      if (days.join() === '1,2,3,4,5') return 'Weekdays';
      if (days.join() === '0,6') return 'Weekends';
      return days.map(function (d) { return names[d]; }).join(' · ') || 'No days set';
    }
    return 'Every day';
  }

  /* --------------------------------------------------------------- status */

  /** A day is "done" if it was completed in full or as a two-minute rep. */
  function entryFor(log, habitId, iso) {
    var byHabit = log && log[habitId];
    return (byHabit && byHabit[iso]) || null;
  }

  function isDone(log, habitId, iso) {
    var e = entryFor(log, habitId, iso);
    return !!(e && e.done);
  }

  /**
   * Completions inside the Mon-Sun week containing `iso`, bounded by today so
   * future days never inflate the count.
   */
  function weekCount(habit, log, iso, todayIso) {
    var start = weekStart(iso);
    var end = addDays(start, 6);
    if (todayIso && daysBetween(todayIso, end) > 0) end = todayIso;
    if (daysBetween(start, end) < 0) return 0;
    return range(start, end).reduce(function (n, d) {
      return n + (isDone(log, habit.id, d) ? 1 : 0);
    }, 0);
  }

  /**
   * Current streak.
   *  - fixed schedules: consecutive scheduled days completed, walking back from
   *    today. Today not being done yet doesn't break the streak (the day isn't
   *    over), but yesterday not being done does.
   *  - weekly schedules: consecutive weeks that hit their target; the current
   *    week counts only once the target is met.
   */
  function streak(habit, log, todayIso) {
    var today = todayIso || toISO();
    if (isFlexible(habit)) {
      var weeks = 0;
      var wk = weekStart(today);
      if (weekCount(habit, log, wk, today) >= weeklyTarget(habit)) weeks++;
      wk = addDays(wk, -7);
      while (daysBetween(habit.createdAt || '1970-01-01', addDays(wk, 6)) >= 0) {
        if (weekCount(habit, log, wk, today) < weeklyTarget(habit)) break;
        weeks++;
        wk = addDays(wk, -7);
      }
      return { count: weeks, unit: weeks === 1 ? 'week' : 'weeks' };
    }

    var count = 0;
    var cur = today;
    // Today is still open: if it isn't done, start counting from yesterday.
    if (isScheduled(habit, cur) && !isDone(log, habit.id, cur)) cur = addDays(cur, -1);
    var guard = 0;
    while (guard++ < 3650) {
      if (!isScheduled(habit, cur)) { cur = addDays(cur, -1); continue; }
      if (!isDone(log, habit.id, cur)) break;
      count++;
      cur = addDays(cur, -1);
    }
    return { count: count, unit: count === 1 ? 'day' : 'days' };
  }

  function bestStreak(habit, log, todayIso) {
    var today = todayIso || toISO();
    var start = habit.createdAt || today;
    if (daysBetween(start, today) < 0) return 0;

    if (isFlexible(habit)) {
      var best = 0, run = 0;
      var wk = weekStart(start);
      while (daysBetween(wk, today) >= 0) {
        var full = daysBetween(today, addDays(wk, 6)) <= 0; // completed week
        var hit = weekCount(habit, log, wk, today) >= weeklyTarget(habit);
        if (hit) { run++; best = Math.max(best, run); }
        else if (full) { run = 0; }
        wk = addDays(wk, 7);
      }
      return best;
    }

    var b = 0, r = 0;
    range(start, today).forEach(function (d) {
      if (!isScheduled(habit, d)) return;
      if (isDone(log, habit.id, d)) { r++; b = Math.max(b, r); }
      else if (d !== today) { r = 0; } // an unfinished today is not a miss
    });
    return b;
  }

  /**
   * "Never miss twice" — the only rule that really protects a habit.
   * True when the two most recent *closed* opportunities were both missed.
   */
  function missedTwice(habit, log, todayIso) {
    var today = todayIso || toISO();
    var start = habit.createdAt || today;

    if (isFlexible(habit)) {
      var w1 = addDays(weekStart(today), -7);
      var w2 = addDays(w1, -7);
      if (daysBetween(start, addDays(w2, 6)) < 0) return false;
      return weekCount(habit, log, w1, today) < weeklyTarget(habit) &&
             weekCount(habit, log, w2, today) < weeklyTarget(habit);
    }

    var misses = 0, seen = 0, cur = addDays(today, -1), guard = 0;
    while (guard++ < 365 && seen < 2) {
      if (daysBetween(start, cur) < 0) return false; // not enough history yet
      if (isScheduled(habit, cur)) {
        seen++;
        if (!isDone(log, habit.id, cur)) misses++;
      }
      cur = addDays(cur, -1);
    }
    return seen === 2 && misses === 2;
  }

  /** Share of scheduled opportunities kept over the trailing `windowDays`. */
  function consistency(habit, log, todayIso, windowDays) {
    var today = todayIso || toISO();
    var win = windowDays || 30;
    var start = addDays(today, -(win - 1));
    if (habit.createdAt && daysBetween(habit.createdAt, start) < 0) start = habit.createdAt;
    if (daysBetween(start, today) < 0) return { done: 0, due: 0, pct: 0 };

    if (isFlexible(habit)) {
      var done = 0, due = 0;
      var wk = weekStart(start);
      while (daysBetween(wk, today) >= 0) {
        done += Math.min(weekCount(habit, log, wk, today), weeklyTarget(habit));
        due += weeklyTarget(habit);
        wk = addDays(wk, 7);
      }
      return { done: done, due: due, pct: due ? Math.round((done / due) * 100) : 0 };
    }

    var d = 0, n = 0;
    range(start, today).forEach(function (day) {
      if (!isScheduled(habit, day)) return;
      n++;
      if (isDone(log, habit.id, day)) d++;
    });
    return { done: d, due: n, pct: n ? Math.round((d / n) * 100) : 0 };
  }

  function totalReps(habit, log) {
    var byHabit = (log && log[habit.id]) || {};
    return Object.keys(byHabit).filter(function (d) { return byHabit[d] && byHabit[d].done; }).length;
  }

  /**
   * The plateau of latent potential, made literal: 1% better per rep.
   * 1.01^n — the curve that looks flat long before it looks exponential.
   */
  function compound(reps, rate) {
    return Math.pow(1 + (rate == null ? 0.01 : rate), reps);
  }

  /** Habits due today that are still open, in display order. */
  function dueToday(habits, log, todayIso) {
    var today = todayIso || toISO();
    return habits.filter(function (h) {
      if (h.archived) return false;
      if (h.createdAt && daysBetween(h.createdAt, today) < 0) return false;
      if (!isScheduled(h, today)) return false;
      if (isFlexible(h) && weekCount(h, log, today, today) >= weeklyTarget(h) && !isDone(log, h.id, today)) {
        return false; // weekly target already met — no obligation left
      }
      return true;
    });
  }

  /** Votes cast for each identity: one habit completion, one vote. */
  function identityVotes(habits, log) {
    var tally = {};
    habits.forEach(function (h) {
      var id = (h.identity || '').trim();
      if (!id) return;
      tally[id] = (tally[id] || 0) + totalReps(h, log);
    });
    return Object.keys(tally).map(function (k) {
      return { identity: k, votes: tally[k] };
    }).filter(function (v) { return v.votes > 0; })
      .sort(function (a, b) { return b.votes - a.votes; });
  }

  /**
   * Sentence form of an implementation intention / habit stack.
   *
   * Habits being broken are usually named in the negative already ("no phone
   * in bed"), so "I will no phone in bed" is nonsense. Those get the name as
   * the commitment itself, with the cue attached.
   */
  function intention(habit) {
    var name = strip(habit.name || 'this habit');
    var stack = habit.stackAfter && strip(habit.stackAfter);
    var time = habit.time ? strip(habit.time) : '';
    var place = habit.location ? strip(habit.location) : '';

    if (habit.type === 'break') {
      if (stack) return 'After ' + stack + ': ' + name + '.';
      var when = [time && 'at ' + time, place && 'in ' + place].filter(Boolean).join(' ');
      return upper(name) + (when ? ' — ' + when : '') + '.';
    }

    if (stack) return 'After ' + stack + ', I will ' + name + '.';
    return 'I will ' + name +
      (time ? ' at ' + time : '') +
      (place ? ' in ' + place : '') + '.';
  }

  function upper(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function strip(s) { return String(s).trim().replace(/[.\s]+$/, ''); }

  return {
    DAY_MS: DAY_MS,
    toISO: toISO,
    fromISO: fromISO,
    addDays: addDays,
    daysBetween: daysBetween,
    dayOfWeek: dayOfWeek,
    weekStart: weekStart,
    range: range,
    isScheduled: isScheduled,
    isFlexible: isFlexible,
    weeklyTarget: weeklyTarget,
    scheduleLabel: scheduleLabel,
    entryFor: entryFor,
    isDone: isDone,
    weekCount: weekCount,
    streak: streak,
    bestStreak: bestStreak,
    missedTwice: missedTwice,
    consistency: consistency,
    totalReps: totalReps,
    compound: compound,
    dueToday: dueToday,
    identityVotes: identityVotes,
    intention: intention
  };
});
