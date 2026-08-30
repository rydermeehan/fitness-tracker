# 1% Better

A habit tracker for putting *Atomic Habits* by James Clear into practice. No accounts, no
build step, no dependencies — one HTML file that stores everything in your browser.

## The system it implements

- **Identity-based habits** — every habit is tied to who it makes you ("I am becoming a
  runner"). Each completion is a *vote* for that identity, and the app counts your votes.
- **The Four Laws of Behavior Change** — the habit form walks you through them:
  - *Make it obvious*: habit stacking ("After I pour my coffee, I will…") or an
    implementation intention (time + place), composed into a sentence as you type.
  - *Make it attractive*: temptation bundling — pair the habit with something you enjoy.
  - *Make it easy*: a two-minute version of the habit, shown on the Today view so you
    only ever have to start.
  - *Make it satisfying*: check the day off and watch the chain grow.
- **Don't break the chain** — per-habit streaks, best streaks, and a 15-week heatmap.
- **A daily tracker grid** — the classic paper habit tracker as a month view (habits ×
  days). Tap any past square to mark or fix a day; rest days show as dots.
- **Environment design** — per habit, a list of setup steps in the book's three moves
  (make the cue visible, cut the friction, hide the temptation), rolled up into a daily
  "prime today's environment" checklist that resets each morning. With the AI runtime,
  Claude studies your habits, where they slip, and an optional note about your spaces,
  and suggests concrete physical tweaks you can adopt with one tap.
- **An AI coach** — when the app runs as a Claude artifact, the Coach tab sends your
  habit designs and last four weeks of check-ins to Claude (on your account, with your
  consent) and streams back feedback: which of the Four Laws to adjust per habit,
  day-of-week patterns in your data, and new habits to stack onto existing routines.
  Outside the artifact runtime the tab explains itself and sits out; everything else
  works unchanged.
- **Never miss twice** — a gentle nudge after one missed day, a firmer one after two,
  and a one-tap way to repair yesterday if you actually did it.
- **The compounding curve** — the 1.01³⁶⁵ ≈ 37× vs 0.99³⁶⁵ ≈ 0.03 chart, with a marker
  for where your total votes put you.

## Running it

The app is live at **https://rydermeehan.github.io/fitness-tracker/** — every push to
the working branch redeploys it via `.github/workflows/deploy-pages.yml`, which syncs
`index.html` to the `gh-pages` branch. You can also just open `index.html` in any
browser.

Data lives in `localStorage`, private to your browser. Use **Export** / **Import** in
the header to back it up or move it between devices.

## Habits can be scheduled

Each habit picks its days of the week. Streaks, completion rates, and the never-miss-twice
nudges only count scheduled days, so a weekdays-only habit isn't punished for the weekend.
