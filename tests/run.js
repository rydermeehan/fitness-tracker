/* Zero-dependency test runner:  node tests/run.js  */
'use strict';
var L = require('../js/logic.js');

var pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}
function eq(actual, expected, msg) {
  var a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error((msg ? msg + ': ' : '') + 'expected ' + b + ', got ' + a);
}
function ok(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }

/* helpers -------------------------------------------------------------- */
var TODAY = '2026-08-30';           // a Sunday
function habit(over) {
  return Object.assign({
    id: 'h1', name: 'read', createdAt: '2026-01-01',
    schedule: { type: 'daily' }
  }, over || {});
}
/** log built from ISO dates that are done */
function log(dates, id) {
  var m = {}; m[id || 'h1'] = {};
  (dates || []).forEach(function (d) { m[id || 'h1'][d] = { done: true }; });
  return m;
}
function back(n) { return L.addDays(TODAY, -n); }

/* dates ---------------------------------------------------------------- */
console.log('\ndates');
t('toISO uses local time, not UTC', function () {
  eq(L.toISO(new Date(2026, 0, 1, 23, 30)), '2026-01-01');
});
t('addDays crosses month and year boundaries', function () {
  eq(L.addDays('2026-12-31', 1), '2027-01-01');
  eq(L.addDays('2026-03-01', -1), '2026-02-28');
});
t('daysBetween is signed', function () {
  eq(L.daysBetween('2026-08-01', '2026-08-30'), 29);
  eq(L.daysBetween('2026-08-30', '2026-08-01'), -29);
});
t('weekStart snaps to Monday', function () {
  eq(L.weekStart('2026-08-30'), '2026-08-24'); // Sunday -> previous Monday
  eq(L.weekStart('2026-08-24'), '2026-08-24');
});
t('range is inclusive', function () {
  eq(L.range('2026-08-28', '2026-08-30'), ['2026-08-28', '2026-08-29', '2026-08-30']);
});

/* schedules ------------------------------------------------------------ */
console.log('\nschedules');
t('day-of-week schedule only fires on its days', function () {
  var h = habit({ schedule: { type: 'days', days: [1, 3, 5] } });
  eq(L.isScheduled(h, '2026-08-31'), true);   // Monday
  eq(L.isScheduled(h, '2026-09-01'), false);  // Tuesday
});
t('weekly schedule is available any day', function () {
  eq(L.isScheduled(habit({ schedule: { type: 'weekly', times: 3 } }), TODAY), true);
});

/* streaks -------------------------------------------------------------- */
console.log('\nstreaks');
t('unfinished today does not break the streak', function () {
  var h = habit();
  eq(L.streak(h, log([back(1), back(2), back(3)]), TODAY).count, 3);
});
t('finishing today extends it', function () {
  var h = habit();
  eq(L.streak(h, log([TODAY, back(1), back(2)]), TODAY).count, 3);
});
t('a missed yesterday resets to zero', function () {
  var h = habit();
  eq(L.streak(h, log([back(2), back(3)]), TODAY).count, 0);
});
t('off-schedule days are skipped, not counted as misses', function () {
  // Mon/Wed/Fri habit, done last three sessions; weekend gap must not break it.
  var h = habit({ schedule: { type: 'days', days: [1, 3, 5] } });
  var l = log(['2026-08-28', '2026-08-26', '2026-08-24']); // Fri, Wed, Mon
  eq(L.streak(h, l, TODAY).count, 3);
});
t('weekly streak counts weeks that hit target', function () {
  var h = habit({ schedule: { type: 'weekly', times: 3 }, createdAt: '2026-08-01' });
  var l = log([
    '2026-08-24', '2026-08-25', '2026-08-26',  // this week: 3/3
    '2026-08-17', '2026-08-18', '2026-08-19',  // last week: 3/3
    '2026-08-10'                               // week before: 1/3
  ]);
  eq(L.streak(h, l, TODAY).count, 2);
});
t('weekly streak ignores an in-progress week that is short', function () {
  var h = habit({ schedule: { type: 'weekly', times: 3 }, createdAt: '2026-08-01' });
  var l = log(['2026-08-24', '2026-08-17', '2026-08-18', '2026-08-19']);
  eq(L.streak(h, l, TODAY).count, 1); // current week 1/3 -> only last week counts
});
t('bestStreak finds the longest historical run', function () {
  var h = habit({ createdAt: back(10) });
  var l = log([back(10), back(9), back(8), back(7), back(4), back(3)]);
  eq(L.bestStreak(h, l, TODAY), 4);
});

/* never miss twice ------------------------------------------------------ */
console.log('\nnever miss twice');
t('two missed days in a row raises the flag', function () {
  eq(L.missedTwice(habit(), log([back(3)]), TODAY), true);
});
t('one missed day does not', function () {
  eq(L.missedTwice(habit(), log([back(1)]), TODAY), false);
});
t('today being unfinished is never a miss', function () {
  eq(L.missedTwice(habit(), log([back(1), back(2)]), TODAY), false);
});
t('a brand-new habit cannot have missed twice', function () {
  eq(L.missedTwice(habit({ createdAt: back(1) }), log([]), TODAY), false);
});
t('weekly habits compare the last two closed weeks', function () {
  var h = habit({ schedule: { type: 'weekly', times: 3 }, createdAt: '2026-07-01' });
  eq(L.missedTwice(h, log(['2026-08-17']), TODAY), true);
  eq(L.missedTwice(h, log(['2026-08-17', '2026-08-18', '2026-08-19']), TODAY), false);
});

/* consistency ----------------------------------------------------------- */
console.log('\nconsistency');
t('percentage over the trailing window', function () {
  var h = habit({ createdAt: back(9) });
  var l = log([back(0), back(1), back(2), back(3), back(4)]);
  eq(L.consistency(h, l, TODAY, 10), { done: 5, due: 10, pct: 50 });
});
t('window never starts before the habit existed', function () {
  var h = habit({ createdAt: back(2) });
  eq(L.consistency(h, log([back(2), back(1), back(0)]), TODAY, 30).pct, 100);
});

/* due today ------------------------------------------------------------- */
console.log('\ndue today');
t('archived and future habits are excluded', function () {
  var hs = [habit({ id: 'a' }), habit({ id: 'b', archived: true }),
            habit({ id: 'c', createdAt: L.addDays(TODAY, 1) })];
  eq(L.dueToday(hs, {}, TODAY).map(function (h) { return h.id; }), ['a']);
});
t('a weekly habit drops off once its target is met', function () {
  var h = habit({ id: 'w', schedule: { type: 'weekly', times: 2 }, createdAt: '2026-08-01' });
  eq(L.dueToday([h], log(['2026-08-25', '2026-08-26'], 'w'), TODAY).length, 0);
  eq(L.dueToday([h], log(['2026-08-25'], 'w'), TODAY).length, 1);
});
t('a weekly habit stays visible on the day it was completed', function () {
  var h = habit({ id: 'w', schedule: { type: 'weekly', times: 2 }, createdAt: '2026-08-01' });
  eq(L.dueToday([h], log(['2026-08-25', TODAY], 'w'), TODAY).length, 1);
});

/* identity + compounding ------------------------------------------------ */
console.log('\nidentity and compounding');
t('every rep is one vote for an identity', function () {
  var hs = [habit({ id: 'a', identity: 'an athlete' }), habit({ id: 'b', identity: 'an athlete' })];
  var l = { a: { x: { done: true }, y: { done: true } }, b: { z: { done: true } } };
  eq(L.identityVotes(hs, l), [{ identity: 'an athlete', votes: 3 }]);
});
t('1% better compounds to ~37x over a year', function () {
  ok(Math.abs(L.compound(365) - 37.78) < 0.1, 'got ' + L.compound(365));
});
t('half-done entries do not count as reps', function () {
  eq(L.totalReps(habit(), { h1: { a: { done: true }, b: { done: false } } }), 1);
});

/* intentions ------------------------------------------------------------ */
console.log('\nintentions');
t('habit stacking wins over time and place', function () {
  eq(L.intention({ name: 'do 10 pushups', stackAfter: 'I pour my coffee', time: '7am' }),
     'After I pour my coffee, I will do 10 pushups.');
});
t('implementation intention uses time and location', function () {
  eq(L.intention({ name: 'stretch', time: '7:00am', location: 'the living room' }),
     'I will stretch at 7:00am in the living room.');
});
t('bare habit still forms a sentence', function () {
  eq(L.intention({ name: 'walk' }), 'I will walk.');
});
t('a habit being broken is not phrased as "I will"', function () {
  eq(L.intention({ name: 'no phone in bed', type: 'break' }), 'No phone in bed.');
  eq(L.intention({ name: 'no phone in bed', type: 'break', stackAfter: 'I get into bed' }),
     'After I get into bed: no phone in bed.');
  eq(L.intention({ name: 'no snacking', type: 'break', time: '9pm', location: 'the kitchen' }),
     'No snacking — at 9pm in the kitchen.');
});
t('identities with no votes yet are left out', function () {
  var hs = [{ id: 'a', identity: 'a runner' }, { id: 'b', identity: 'a reader' }];
  eq(L.identityVotes(hs, { a: { x: { done: true } } }), [{ identity: 'a runner', votes: 1 }]);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
