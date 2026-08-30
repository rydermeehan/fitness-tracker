/*
 * ui.js — rendering. Every function here returns or paints HTML from state;
 * all event wiring lives in app.js.
 */
(function (root) {
  'use strict';
  var L = root.Logic, T = root.Templates;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function prettyDate(iso) {
    var d = L.fromISO(iso);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function activeHabits(state) {
    return state.habits.filter(function (h) { return !h.archived; });
  }

  /* ----------------------------------------------------------------- today */

  function renderToday(state, el) {
    var today = L.toISO();
    var due = L.dueToday(state.habits, state.log, today);
    var kept = due.filter(function (h) { return L.isDone(state.log, h.id, today); });
    var active = activeHabits(state);

    if (!active.length) {
      el.innerHTML = emptyState();
      return;
    }

    // Once today is kept the miss streak is already broken, so drop the warning.
    var flagged = active.filter(function (h) {
      return L.missedTwice(h, state.log, today) && !L.isDone(state.log, h.id, today);
    });
    var votes = L.identityVotes(active, state.log).slice(0, 4);
    var open = due.filter(function (h) { return !L.isDone(state.log, h.id, today); });
    var doneList = due.filter(function (h) { return L.isDone(state.log, h.id, today); });
    var offToday = active.filter(function (h) { return due.indexOf(h) === -1; });

    var html = '' +
      '<div class="page-head">' +
        '<h1>' + esc(prettyDate(today)) + '</h1>' +
        '<div class="sub">' + kept.length + ' of ' + due.length + ' kept today · ' +
        'every rep is a vote for who you are becoming</div>' +
      '</div>';

    if (flagged.length) {
      html += '<div class="banner">' +
        '<span class="b-ico" aria-hidden="true">⚠</span><div>' +
        '<strong>Never miss twice</strong>' +
        '<p>' + esc(listNames(flagged)) + ' ' + (flagged.length > 1 ? 'have' : 'has') +
        ' been missed twice in a row. Missing once is an accident; missing twice starts a new habit. ' +
        'Do the two-minute version today.</p></div></div>';
    }

    if (votes.length) {
      html += '<div class="identity-strip">' + votes.map(function (v) {
        return '<span class="identity-chip"><b>' + v.votes + '</b> ' +
          (v.votes === 1 ? 'vote' : 'votes') + ' for being ' + esc(v.identity) + '</span>';
      }).join('') + '</div>';
    }

    html += '<div class="section-title">Due today</div>';
    html += open.length
      ? open.map(function (h) { return habitRow(h, state, today); }).join('')
      : '<div class="empty"><h3>Everything is done.</h3>' +
        '<p class="tiny">Come back tomorrow. Showing up again is the whole game.</p></div>';

    if (doneList.length) {
      html += '<div class="section-title">Kept today</div>' +
        doneList.map(function (h) { return habitRow(h, state, today); }).join('');
    }
    if (offToday.length) {
      html += '<div class="section-title">Not scheduled today</div>' +
        offToday.map(function (h) { return habitRow(h, state, today, true); }).join('');
    }
    el.innerHTML = html;
  }

  function listNames(habits) {
    var names = habits.map(function (h) { return '"' + h.name + '"'; });
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  function habitRow(habit, state, today, offDuty) {
    var done = L.isDone(state.log, habit.id, today);
    var entry = L.entryFor(state.log, habit.id, today);
    var st = L.streak(habit, state.log, today);
    var flagged = !done && L.missedTwice(habit, state.log, today);
    var line = L.intention(habit);

    var pills = '';
    if (st.count > 0) pills += '<span class="pill hot">🔥 ' + st.count + ' ' + st.unit + '</span>';
    pills += '<span class="pill">' + esc(L.scheduleLabel(habit)) + '</span>';
    if (L.isFlexible(habit)) {
      pills += '<span class="pill">' + L.weekCount(habit, state.log, today, today) +
        ' / ' + L.weeklyTarget(habit) + ' this week</span>';
    }
    if (entry && entry.mini) pills += '<span class="pill mini">two-minute rep</span>';
    if (flagged) pills += '<span class="pill flag">missed twice</span>';
    if (habit.type === 'break') pills += '<span class="pill">avoiding</span>';

    return '' +
      '<div class="habit-row' + (done ? ' is-done' : '') + '" style="--h-color:' + esc(habit.color || '') + '" data-habit="' + esc(habit.id) + '">' +
        '<button class="check" data-act="toggle" data-id="' + esc(habit.id) + '" aria-pressed="' + done + '"' +
          ' aria-label="' + (done ? 'Undo' : 'Mark done') + ': ' + esc(habit.name) + '">✓</button>' +
        '<div class="habit-main">' +
          '<div class="habit-name">' + esc(habit.name) + '</div>' +
          '<div class="habit-cue">' + esc(line) + '</div>' +
          '<div class="habit-meta">' + pills + '</div>' +
        '</div>' +
        '<div class="habit-side">' +
          weekDots(habit, state, today) +
          (!done && !offDuty && habit.twoMinute
            ? '<button class="btn small ghost" data-act="mini" data-id="' + esc(habit.id) + '"' +
              ' title="' + esc(habit.twoMinute) + '">2-min</button>'
            : '') +
        '</div>' +
      '</div>';
  }

  /** Last seven days, oldest first. Clicking a dot back-fills that day. */
  function weekDots(habit, state, today) {
    var cells = '';
    for (var i = 6; i >= 0; i--) {
      var d = L.addDays(today, -i);
      var on = L.isDone(state.log, habit.id, d);
      var cls = 'dot' + (on ? ' on' : '') + (L.isScheduled(habit, d) ? '' : ' off-schedule') + (i === 0 ? ' today' : '');
      cells += '<button class="' + cls + '" data-act="toggle-day" data-id="' + esc(habit.id) + '"' +
        ' data-date="' + d + '" title="' + DOW[L.dayOfWeek(d)] + ' ' + d + (on ? ' — done' : '') + '"' +
        ' aria-label="' + DOW[L.dayOfWeek(d)] + ' ' + d + '"></button>';
    }
    return '<div class="dots">' + cells + '</div>';
  }

  function emptyState() {
    return '' +
      '<div class="page-head"><h1>Start with one habit</h1>' +
      '<div class="sub">You do not rise to the level of your goals; you fall to the level of your systems.</div></div>' +
      '<div class="empty">' +
        '<h3>Nothing here yet</h3>' +
        '<p class="tiny">Design a habit through the four laws, or start from one of these.</p>' +
        '<div class="chips" style="justify-content:center;margin-top:1rem">' +
          T.STARTERS.map(function (s, i) {
            return '<button class="chip" data-act="starter" data-i="' + i + '">' + esc(s.name) + '</button>';
          }).join('') +
        '</div>' +
        '<p class="tiny" style="margin-top:1rem">Or <button class="link" data-act="new">write your own</button>.</p>' +
      '</div>';
  }

  /* ---------------------------------------------------------------- habits */

  function renderHabits(state, el) {
    var today = L.toISO();
    var live = activeHabits(state);
    var archived = state.habits.filter(function (h) { return h.archived; });

    var html = '<div class="page-head"><h1>Your habits</h1>' +
      '<div class="sub">Each one is a small system. Open it to see the four laws behind it.</div></div>';

    if (!live.length && !archived.length) {
      el.innerHTML = html + emptyState();
      return;
    }

    html += live.map(function (h, i) { return habitCard(h, state, today, i, live.length); }).join('');

    if (archived.length) {
      html += '<div class="section-title">Archived</div>' +
        archived.map(function (h) {
          return '<div class="card habit-card" style="--h-color:' + esc(h.color) + '">' +
            '<div style="display:flex;align-items:center;gap:.7rem">' +
              '<span class="swatch"></span><span class="muted">' + esc(h.name) + '</span>' +
              '<span style="margin-left:auto;display:flex;gap:.4rem">' +
                '<button class="btn small" data-act="unarchive" data-id="' + esc(h.id) + '">Restore</button>' +
                '<button class="btn small danger" data-act="delete" data-id="' + esc(h.id) + '">Delete</button>' +
              '</span></div></div>';
        }).join('');
    }
    el.innerHTML = html;
  }

  function habitCard(habit, state, today, index, total) {
    var st = L.streak(habit, state.log, today);
    var best = L.bestStreak(habit, state.log, today);
    var c = L.consistency(habit, state.log, today, 30);
    var reps = L.totalReps(habit, state.log);

    function law(name, value, fallback) {
      var blank = !value || !String(value).trim();
      return '<div class="law"><div class="law-name">' + name + '</div>' +
        '<div class="law-val' + (blank ? ' blank' : '') + '">' +
        esc(blank ? fallback : value) + '</div></div>';
    }

    var inv = habit.type === 'break';
    return '' +
    '<details class="card habit-card" style="--h-color:' + esc(habit.color || '') + '">' +
      '<summary>' +
        '<span class="swatch" aria-hidden="true"></span>' +
        '<span style="flex:1;min-width:0">' +
          '<span style="font-weight:640">' + esc(habit.name) + '</span>' +
          '<span class="tiny muted" style="display:block">' +
            esc(L.scheduleLabel(habit)) + ' · ' + reps + ' total reps · ' + c.pct + '% over 30 days' +
          '</span>' +
        '</span>' +
        '<span class="pill' + (st.count ? ' hot' : '') + '">' + st.count + ' ' + st.unit + '</span>' +
      '</summary>' +

      '<div class="laws">' +
        (habit.identity
          ? '<div class="law"><div class="law-name">Identity</div><div class="law-val">I am ' +
            esc(habit.identity) + ' — ' + reps + ' ' + (reps === 1 ? 'vote' : 'votes') + ' cast</div></div>'
          : '') +
        law(inv ? '1 · Invisible' : '1 · Obvious', habit.stackAfter
              ? L.intention(habit) + (habit.cue ? ' Cue: ' + habit.cue : '')
              : [L.intention(habit), habit.cue].filter(Boolean).join(' Cue: '),
            'No cue yet — when and where will this happen?') +
        law(inv ? '2 · Unattractive' : '2 · Attractive', habit.attractive,
            'Nothing pairs it with something you want yet.') +
        law(inv ? '3 · Difficult' : '3 · Easy',
            [habit.twoMinute, habit.friction].filter(Boolean).join(' · '),
            'No two-minute version yet — what is the smallest possible rep?') +
        law(inv ? '4 · Unsatisfying' : '4 · Satisfying', habit.reward,
            'No immediate reward yet.') +
      '</div>' +

      '<div class="stat-grid" style="margin-top:.9rem">' +
        stat('Current streak', st.count + ' ' + st.unit, '') +
        stat('Best streak', best + (L.isFlexible(habit) ? (best === 1 ? ' week' : ' weeks') : (best === 1 ? ' day' : ' days')), '') +
        stat('Last 30 days', c.pct + '%', c.done + ' of ' + c.due + ' kept') +
        stat('1% better', '×' + L.compound(reps).toFixed(2), reps + ' reps compounded') +
      '</div>' +

      '<div class="card-actions">' +
        '<button class="btn small" data-act="edit" data-id="' + esc(habit.id) + '">Edit</button>' +
        '<button class="btn small" data-act="up" data-id="' + esc(habit.id) + '"' + (index === 0 ? ' disabled' : '') + '>Move up</button>' +
        '<button class="btn small" data-act="down" data-id="' + esc(habit.id) + '"' + (index === total - 1 ? ' disabled' : '') + '>Move down</button>' +
        '<button class="btn small" data-act="archive" data-id="' + esc(habit.id) + '">Archive</button>' +
      '</div>' +
    '</details>';
  }

  function stat(k, v, n) {
    return '<div class="stat"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div>' +
      (n ? '<div class="n">' + esc(n) + '</div>' : '') + '</div>';
  }

  /* ------------------------------------------------------------- scorecard */

  function renderScorecard(state, el) {
    var items = state.scorecard;
    var counts = { '+': 0, '-': 0, '=': 0 };
    items.forEach(function (i) { counts[i.verdict] = (counts[i.verdict] || 0) + 1; });

    el.innerHTML = '' +
      '<div class="page-head"><h1>Habits scorecard</h1>' +
      '<div class="sub">List what you already do in a normal day, then mark each one. ' +
      'You cannot change a habit you have never noticed.</div></div>' +

      '<div class="card">' +
        '<form id="score-form" style="display:flex;gap:.5rem">' +
          '<input type="text" id="score-input" placeholder="Wake up · check phone · make coffee · sit down…" aria-label="Add a habit you already do">' +
          '<button class="btn btn-primary" type="submit">Add</button>' +
        '</form>' +
        '<p class="hint" style="margin-top:.6rem;margin-bottom:0">' +
          '<b>+</b> moves you toward the person you want to be · ' +
          '<b>=</b> is neutral · <b>−</b> moves you away.' +
        '</p>' +
      '</div>' +

      (items.length
        ? '<div class="section-title">' + items.length + ' habits noticed — ' +
            counts['+'] + ' good, ' + counts['='] + ' neutral, ' + counts['-'] + ' costly</div>' +
          items.map(scoreRow).join('')
        : '<div class="empty" style="margin-top:1rem"><h3>Nothing listed yet</h3>' +
          '<p class="tiny">Walk through your morning in order and write down every habit, ' +
          'however small. No judgement on the first pass — just notice.</p></div>') +

      (counts['-'] ? '<div class="banner" style="margin-top:1rem">' +
        '<span class="b-ico" aria-hidden="true">↺</span><div><strong>Turn a minus into a system</strong>' +
        '<p>Pick one costly habit and invert the four laws on it: make the cue invisible, ' +
        'the craving unattractive, the response difficult, the reward unsatisfying. ' +
        'Add it here as a habit to avoid.</p></div></div>' : '');
  }

  function scoreRow(item) {
    function b(v, label) {
      return '<button class="verdict" data-v="' + v + '" data-act="verdict" data-id="' + esc(item.id) + '"' +
        ' aria-pressed="' + (item.verdict === v) + '" aria-label="' + label + '">' + v + '</button>';
    }
    return '<div class="score-row">' +
      '<span class="txt">' + esc(item.text) + '</span>' +
      '<span class="verdicts">' + b('+', 'Good habit') + b('=', 'Neutral') + b('-', 'Costly habit') + '</span>' +
      '<button class="icon-btn" data-act="score-remove" data-id="' + esc(item.id) + '" aria-label="Remove">✕</button>' +
      '</div>';
  }

  /* -------------------------------------------------------------- progress */

  function renderProgress(state, el) {
    var today = L.toISO();
    var active = activeHabits(state);

    if (!active.length) {
      el.innerHTML = '<div class="page-head"><h1>Progress</h1></div>' + emptyState();
      return;
    }

    var totalReps = active.reduce(function (n, h) { return n + L.totalReps(h, state.log); }, 0);
    var due = L.dueToday(state.habits, state.log, today);
    var keptToday = due.filter(function (h) { return L.isDone(state.log, h.id, today); }).length;
    var longest = active.reduce(function (m, h) {
      var s = L.streak(h, state.log, today);
      return s.count > m.count ? { count: s.count, unit: s.unit, name: h.name } : m;
    }, { count: 0, unit: 'days', name: '—' });
    var avg = Math.round(active.reduce(function (n, h) {
      return n + L.consistency(h, state.log, today, 30).pct;
    }, 0) / active.length);

    var html = '<div class="page-head"><h1>Progress</h1>' +
      '<div class="sub">Habits are compound interest. The results arrive late, and then all at once.</div></div>' +

      '<div class="stat-grid">' +
        stat('Today', keptToday + ' / ' + due.length, 'habits kept') +
        stat('Total reps', String(totalReps), 'votes cast for your identity') +
        stat('Longest streak', longest.count + ' ' + longest.unit, longest.name) +
        stat('30-day average', avg + '%', 'across ' + active.length + ' habits') +
      '</div>';

    /* The plateau of latent potential, drawn from the user's own rep count. */
    var mult = L.compound(totalReps);
    html += '<div class="section-title">If every rep made you 1% better</div>' +
      '<div class="card">' +
        '<div style="display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap">' +
          '<span style="font-size:2rem;font-weight:700;letter-spacing:-.02em">×' + mult.toFixed(2) + '</span>' +
          '<span class="muted tiny">after ' + totalReps + ' reps · 1.01<sup>' + totalReps + '</sup></span>' +
        '</div>' +
        compoundCurve(totalReps) +
        '<p class="tiny muted" style="margin-top:.6rem;margin-bottom:0">' +
          'The line barely moves for a long time — that flat stretch is the plateau of latent potential, ' +
          'where most people quit. 1% better every day for a year is ×37.78.</p>' +
      '</div>';

    html += '<div class="section-title">Last 16 weeks</div>' +
      '<div class="card">' + heatmap(state, today) + '</div>';

    html += '<div class="section-title">Consistency, last 30 days</div><div class="card">' +
      active.map(function (h) {
        var c = L.consistency(h, state.log, today, 30);
        return '<div class="bar-row" style="--h-color:' + esc(h.color) + '">' +
          '<span class="name-ellipsis" title="' + esc(h.name) + '">' + esc(h.name) + '</span>' +
          '<span class="bar-track"><span class="bar-fill" style="width:' + c.pct + '%"></span></span>' +
          '<span class="bar-val">' + c.pct + '%</span></div>';
      }).join('') + '</div>';

    var votes = L.identityVotes(active, state.log);
    if (votes.length) {
      var max = Math.max.apply(null, votes.map(function (v) { return v.votes; })) || 1;
      html += '<div class="section-title">Votes cast</div><div class="card">' +
        votes.map(function (v) {
          return '<div class="bar-row">' +
            '<span class="name-ellipsis" title="' + esc(v.identity) + '">' + esc(v.identity) + '</span>' +
            '<span class="bar-track"><span class="bar-fill" style="width:' + Math.round(v.votes / max * 100) + '%"></span></span>' +
            '<span class="bar-val">' + v.votes + '</span></div>';
        }).join('') +
        '<p class="tiny muted" style="margin:.6rem 0 0">Every action is a vote for the type of person you wish to become.</p>' +
        '</div>';
    }

    el.innerHTML = html;
  }

  /**
   * 1.01^n over a year, plotted linearly on purpose: the long flat stretch is
   * the plateau of latent potential, and a log scale would hide it.
   */
  function compoundCurve(reps) {
    var W = 520, H = 96, days = 365, top = 6;
    var max = L.compound(days);
    var y = function (i) { return H - (L.compound(i) / max) * (H - top); };
    var pts = [];
    for (var i = 0; i <= days; i += 3) pts.push(((i / days) * W).toFixed(1) + ',' + y(i).toFixed(1));

    var at = Math.min(reps, days);
    var mx = (at / days) * W, my = y(at);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="96" role="img" ' +
      'aria-label="Compounding curve: times ' + L.compound(reps).toFixed(2) + ' after ' + reps + ' reps" ' +
      'preserveAspectRatio="none" style="margin-top:.75rem;display:block">' +
      '<polygon points="0,' + H + ' ' + pts.join(' ') + ' ' + W + ',' + H + '" ' +
        'fill="var(--accent)" fill-opacity=".10"/>' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="var(--accent)" ' +
        'stroke-width="2" vector-effect="non-scaling-stroke"/>' +
      '<line x1="' + mx.toFixed(1) + '" y1="0" x2="' + mx.toFixed(1) + '" y2="' + H + '" ' +
        'stroke="currentColor" stroke-opacity=".25" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>' +
      '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="4" fill="var(--accent)" ' +
        'vector-effect="non-scaling-stroke"/>' +
      '</svg>' +
      '<div class="tiny muted" style="display:flex;justify-content:space-between;margin-top:.2rem">' +
        '<span>day 0</span><span>you are here</span><span>day 365 · ×37.78</span></div>';
  }

  /** 16 weeks of daily completion, GitHub-style. Rows are Mon..Sun. */
  function heatmap(state, today) {
    var weeks = 16;
    var end = L.addDays(L.weekStart(today), 6);
    var start = L.addDays(L.weekStart(today), -7 * (weeks - 1));
    var cells = '';
    L.range(start, end).forEach(function (d) {
      var future = L.daysBetween(today, d) > 0;
      var lvl = 0, title = prettyDate(d) + ' — no habits';
      if (!future) {
        var activeThatDay = state.habits.filter(function (h) {
          return !h.archived && (!h.createdAt || L.daysBetween(h.createdAt, d) >= 0);
        });
        var done = activeThatDay.filter(function (h) { return L.isDone(state.log, h.id, d); }).length;
        if (activeThatDay.length) {
          var ratio = done / activeThatDay.length;
          lvl = done === 0 ? 0 : Math.max(1, Math.ceil(ratio * 4));
          title = prettyDate(d) + ' — ' + done + ' of ' + activeThatDay.length + ' kept';
        }
      } else {
        title = prettyDate(d);
      }
      cells += '<div class="heat-cell" data-lvl="' + lvl + '"' +
        (future ? ' style="opacity:.25"' : '') + ' title="' + esc(title) + '"></div>';
    });
    return '<div class="heatmap"><div class="heat-grid">' + cells + '</div></div>' +
      '<div class="legend"><span>Less</span>' +
      [0, 1, 2, 3, 4].map(function (l) { return '<span class="heat-cell" data-lvl="' + l + '"></span>'; }).join('') +
      '<span>More</span></div>';
  }

  /* ----------------------------------------------------------------- guide */

  function renderGuide(state, el) {
    el.innerHTML = '' +
      '<div class="page-head"><h1>Field guide</h1>' +
      '<div class="sub">The parts of the book this app is built on, in the order you use them.</div></div>' +

      '<div class="card guide-card">' +
        '<h3>Start with identity, not outcomes</h3>' +
        '<p class="muted">"I want to run a marathon" is a goal. "I am a runner" is an identity. ' +
        'Goals end; identities compound. Decide the type of person you want to be, then prove it ' +
        'with small wins. Every habit you complete here is one vote.</p>' +
        '<div class="quote">You do not rise to the level of your goals. You fall to the level of your systems.</div>' +
      '</div>' +

      '<div class="section-title">The four laws of behaviour change</div>' +
      T.LAWS.map(function (l) {
        return '<div class="card guide-card">' +
          '<h3><span class="law-num">' + l.n + '</span>' + esc(l.title) +
          ' <span class="law-sub">· ' + esc(l.sub) + '</span></h3>' +
          '<p class="muted">' + esc(l.note) + '</p>' +
          '<p class="tiny muted" style="margin:0"><b>To break a habit — ' + esc(l.inverse) + ':</b> ' +
          esc(l.inverseNote) + '</p>' +
        '</div>';
      }).join('') +

      '<div class="section-title">The techniques this app uses</div>' +
      '<div class="two-col">' +
        guideItem('Implementation intention',
          'I will [habit] at [time] in [place]. Deciding in advance beats deciding in the moment.') +
        guideItem('Habit stacking',
          'After [current habit], I will [new habit]. Anchor the new behaviour to something already automatic.') +
        guideItem('Temptation bundling',
          'Do what you need right before what you want. The craving carries the habit.') +
        guideItem('The two-minute rule',
          'Scale it down until it takes two minutes. "Read before bed" becomes "read one page". Master showing up first.') +
        guideItem('Environment design',
          'Make the cue for a good habit visible and the friction low. Do the opposite for the habits you want gone.') +
        guideItem('Never miss twice',
          'One miss is an accident. Two is the start of a new habit. The tracker flags the second one for you.') +
        guideItem('The plateau of latent potential',
          'Progress hides in the flat part of the curve. Most quitting happens there, just before results show up.') +
        guideItem('The Goldilocks rule',
          'Motivation peaks at tasks just beyond your current ability. When a habit gets boring, raise the difficulty slightly.') +
      '</div>' +

      '<p class="tiny muted" style="margin-top:1.25rem">' +
        'These ideas are from <i>Atomic Habits</i> by James Clear, summarised here for your own use. ' +
        'The book is worth reading in full.</p>';
  }

  function guideItem(title, body) {
    return '<div class="card guide-card"><h3>' + esc(title) + '</h3>' +
      '<p class="muted tiny" style="margin:0">' + esc(body) + '</p></div>';
  }

  /* ---------------------------------------------------------------- editor */

  function editorForm(habit) {
    var h = habit || {};
    var inv = h.type === 'break';
    var s = h.schedule || { type: 'daily' };
    var days = s.days || [1, 2, 3, 4, 5];

    function f(name, label, hint, value, placeholder, type) {
      return '<div class="field"><label for="f-' + name + '">' + esc(label) + '</label>' +
        (hint ? '<p class="hint">' + esc(hint) + '</p>' : '') +
        '<input type="' + (type || 'text') + '" id="f-' + name + '" name="' + name + '" ' +
        'value="' + esc(value || '') + '" placeholder="' + esc(placeholder || '') + '"></div>';
    }

    var lawBlocks = T.LAWS.map(function (l, i) {
      var body = '';
      if (i === 0) {
        body =
          '<div class="field"><label for="f-stackAfter">Habit stack</label>' +
          '<p class="hint">After [an existing habit], I will [this one].</p>' +
          '<input type="text" id="f-stackAfter" name="stackAfter" value="' + esc(h.stackAfter || '') + '" ' +
          'placeholder="I pour my morning coffee"></div>' +
          '<div class="row-2">' +
            f('time', 'Time', '', h.time, '7:00am') +
            f('location', 'Place', '', h.location, 'the kitchen') +
          '</div>' +
          f('cue', inv ? 'How the cue disappears' : 'Anything else that makes it obvious', '', h.cue,
            inv ? 'Phone charges in another room' : 'Shoes left by the door') +
          '<div class="sentence" id="sentence">' + esc(L.intention(h.name ? h : { name: 'this habit' })) + '</div>';
      } else if (i === 1) {
        body = f('attractive', inv ? 'Why you no longer want it' : 'Pair it with something you want', l.note,
          h.attractive, inv ? 'What it actually costs me' : 'Only listen to my podcast while walking');
      } else if (i === 2) {
        body = f('twoMinute', 'The two-minute version', l.note, h.twoMinute, 'Put on my running shoes') +
          f('friction', inv ? 'Friction to add' : 'Friction to remove', '', h.friction,
            inv ? 'Delete the app from my phone' : 'Bag packed the night before');
      } else {
        body = f('reward', inv ? 'What makes slipping cost something' : 'Immediate reward', l.note, h.reward,
          inv ? 'Tell my accountability partner' : 'Tick the box, then coffee');
      }
      return '<div class="law-block">' +
        '<div class="law-head"><span class="law-num">' + l.n + '</span>' +
        '<span class="law-title">' + esc(inv ? l.inverse : l.title) + '</span>' +
        '<span class="law-sub">' + esc(l.sub) + '</span></div>' + body + '</div>';
    }).join('');

    return '' +
      '<div class="field"><label for="f-name">The habit</label>' +
        '<p class="hint">Write it as an action, small enough to be obvious: "walk for 10 minutes", not "get fit".</p>' +
        '<input type="text" id="f-name" name="name" value="' + esc(h.name || '') + '" placeholder="do 2 push-ups" required></div>' +

      '<div class="field"><span class="field-label">This is a habit I want to…</span>' +
        '<div class="chips" role="group">' +
          '<button type="button" class="chip" data-type="build" aria-pressed="' + (!inv) + '">build</button>' +
          '<button type="button" class="chip" data-type="break" aria-pressed="' + inv + '">break</button>' +
        '</div>' +
        '<p class="hint" style="margin-top:.4rem;margin-bottom:0">Breaking a habit inverts the four laws.</p></div>' +

      '<div class="field"><label for="f-identity">I am someone who…</label>' +
        '<p class="hint">The identity this habit votes for. Keep it in the present tense.</p>' +
        '<input type="text" id="f-identity" name="identity" value="' + esc(h.identity || '') + '" ' +
        'placeholder="trains, even on bad days"></div>' +

      '<div class="field"><span class="field-label">How often</span>' +
        '<div class="chips" role="group" style="margin-bottom:.5rem">' +
          '<button type="button" class="chip" data-sched="daily" aria-pressed="' + (s.type === 'daily') + '">Every day</button>' +
          '<button type="button" class="chip" data-sched="days" aria-pressed="' + (s.type === 'days') + '">Certain days</button>' +
          '<button type="button" class="chip" data-sched="weekly" aria-pressed="' + (s.type === 'weekly') + '">X per week</button>' +
        '</div>' +
        '<div id="sched-days" ' + (s.type === 'days' ? '' : 'hidden') + '>' +
          '<div class="chips">' + DOW.map(function (d, i) {
            return '<button type="button" class="chip" data-dow="' + i + '" aria-pressed="' +
              (days.indexOf(i) !== -1) + '">' + d + '</button>';
          }).join('') + '</div></div>' +
        '<div id="sched-weekly" ' + (s.type === 'weekly' ? '' : 'hidden') + '>' +
          '<label class="tiny muted" for="f-times">Times per week</label>' +
          '<select id="f-times" name="times">' +
            [1, 2, 3, 4, 5, 6, 7].map(function (n) {
              return '<option value="' + n + '"' + ((s.times || 3) === n ? ' selected' : '') + '>' + n + '×</option>';
            }).join('') +
          '</select></div>' +
      '</div>' +

      '<div class="section-title">Design it through the four laws</div>' +
      lawBlocks;
  }

  root.UI = {
    esc: esc,
    renderToday: renderToday,
    renderHabits: renderHabits,
    renderScorecard: renderScorecard,
    renderProgress: renderProgress,
    renderGuide: renderGuide,
    editorForm: editorForm
  };
})(window);
