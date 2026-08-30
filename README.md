# Atomic

A habit tracker built around the actual method in *Atomic Habits* — not just a
row of checkboxes. Every habit you create is designed through the Four Laws of
Behavior Change, and the app nudges you with the rules that matter: never miss
twice, the two-minute rule, and votes for an identity.

No account, no server, no build step. Open `index.html` and start.

## Run it

```bash
open index.html          # macOS  (or: xdg-open index.html / double-click it)
```

It is plain HTML, CSS and JavaScript with zero dependencies, so opening the file
directly works. To serve it instead:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

To use it on your phone, push this repo to GitHub and turn on GitHub Pages
(Settings → Pages → deploy from the `main` branch, root folder). Add the page to
your home screen and it behaves like an app.

## What's in it

**Today** — what's due, one tap to keep it. Each habit shows its cue sentence,
its streak, and the last seven days as dots you can click to back-fill a day you
forgot to log.

**Habit designer** — creating a habit walks you through all four laws:

| Law | Building a habit | Breaking one |
|---|---|---|
| 1st · Cue | Make it obvious | Make it invisible |
| 2nd · Craving | Make it attractive | Make it unattractive |
| 3rd · Response | Make it easy | Make it difficult |
| 4th · Reward | Make it satisfying | Make it unsatisfying |

Mark a habit as one you want to *break* and every prompt inverts.

**Habit stacking and implementation intentions** — the cue field builds the
sentence for you as you type: *"After I pour my morning coffee, I will do 2
push-ups."* A habit with a time and place attached beats one that relies on
remembering.

**The two-minute rule** — every habit can carry a gateway version. On a day when
the full thing isn't happening, the `2-min` button logs the small version so the
chain survives. It's marked as a two-minute rep, not passed off as the full one.

**Never miss twice** — the app tracks *closed* opportunities, not calendar days,
so weekends off a Mon/Wed/Fri habit aren't misses. Miss two in a row and you get
a banner, because the second miss is what starts the new habit.

**Identity votes** — write who the habit is making you ("someone who trains")
and each completion counts as one vote. The Progress tab ranks them.

**Habits scorecard** — list what you already do in a day and mark each one `+`,
`=`, or `−`. You can't change a habit you've never noticed.

**Progress** — a 16-week heatmap, per-habit consistency, and the plateau of
latent potential drawn as a real 1.01ⁿ curve with your current rep count marked
on it. The flat part is where people quit.

**Field guide** — the ideas the app is built on, in the order you use them.

## Scheduling

Habits can run every day, on chosen weekdays, or *X times per week*. The last
one is deliberately flexible: streaks count whole weeks that hit the target, and
a habit disappears from Today once you've hit the week's number.

## Your data

Everything lives in this browser's `localStorage` under the key `atomic.v1`.
Nothing is sent anywhere — there is no network code in this app at all. That
also means clearing site data erases it, so **Export data** in the footer writes
a JSON file you can keep or move to another browser with **Import data**.

## Tests

The date, streak, and scheduling rules are pure functions in `js/logic.js` and
are covered by a dependency-free suite:

```bash
node tests/run.js        # or: npm test
```

## Layout

```
index.html        markup and the app shell
assets/styles.css a small design system: tokens, dark/light, components
js/logic.js       pure domain logic — dates, streaks, schedules, compounding
js/store.js       state, localStorage persistence, import/export
js/templates.js   starter habits and field guide copy
js/ui.js          rendering for each view
js/app.js         routing, events, boot
tests/run.js      tests for js/logic.js
```

## Keyboard

`1`–`5` switch tabs · `Esc` closes the editor · `Cmd/Ctrl + Enter` saves it.

---

The ideas are from *Atomic Habits* by James Clear, summarised here for personal
use. The book is worth reading in full.
