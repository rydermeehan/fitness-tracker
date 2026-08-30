/*
 * templates.js — starter habits and the field guide text.
 *
 * The starters are pre-filled through all four laws so a new user can see what
 * a well-designed habit actually looks like before writing their own.
 */
(function (root) {
  'use strict';

  var STARTERS = [
    {
      name: 'do 2 push-ups',
      identity: 'someone who trains',
      cue: 'my shoes are already by the mat',
      stackAfter: 'I brush my teeth in the morning',
      attractive: 'I play the one song I only listen to while training',
      twoMinute: 'Two push-ups. That is the whole requirement.',
      friction: 'Mat stays unrolled in the corner overnight',
      reward: 'Tick the box, then make coffee',
      schedule: { type: 'daily' }
    },
    {
      name: 'walk for 10 minutes',
      identity: 'someone who moves every day',
      cue: 'the moment I close my laptop',
      stackAfter: 'I finish lunch',
      attractive: 'Save my favourite podcast for the walk only',
      twoMinute: 'Put on shoes and step outside the door',
      friction: 'Shoes by the front door, not in the closet',
      reward: 'Log the walk and note how I feel after',
      schedule: { type: 'daily' }
    },
    {
      name: 'lift for 30 minutes',
      identity: 'someone who gets stronger',
      cue: '5:30pm alarm labelled "gym bag"',
      stackAfter: 'I change out of work clothes',
      attractive: 'Train with a friend on Wednesdays',
      twoMinute: 'Pack the bag and drive there. Leaving is allowed.',
      friction: 'Gym bag packed the night before, in the car',
      reward: 'Protein shake I actually like, plus tick the box',
      schedule: { type: 'days', days: [1, 3, 5] }
    },
    {
      name: 'read 1 page',
      identity: 'a reader',
      cue: 'book on the pillow',
      stackAfter: 'I get into bed',
      attractive: 'Only books I would happily talk about',
      twoMinute: 'One page. Closing the book after it is a win.',
      friction: 'Phone charges in the kitchen, not the bedroom',
      reward: 'Cross off the day before lights out',
      schedule: { type: 'daily' }
    },
    {
      name: 'no phone for the first 30 minutes',
      type: 'break',
      identity: 'someone who owns their mornings',
      cue: 'Phone charges outside the bedroom, so waking up shows me no screen',
      stackAfter: 'I wake up',
      attractive: 'Coffee and the window instead — the part of the day I like',
      twoMinute: 'Leave the phone on the shelf while the kettle boils',
      friction: 'Charger moved to the kitchen; alarm is a real clock',
      reward: 'A calm start, marked on the tracker',
      schedule: { type: 'daily' }
    },
    {
      name: 'stretch for 5 minutes',
      identity: 'someone who takes care of their body',
      cue: 'the TV going on in the evening',
      stackAfter: 'I sit down to watch something',
      attractive: 'Stretch during the episode I am already watching',
      twoMinute: 'Sit on the floor instead of the couch',
      friction: 'Mat lives beside the TV',
      reward: 'Tick it off before the episode ends',
      schedule: { type: 'weekly', times: 4 }
    }
  ];

  /** Prompts shown inside the editor, one per law, plus the inversions. */
  var LAWS = [
    {
      n: '1st',
      title: 'Make it obvious',
      inverse: 'Make it invisible',
      sub: 'Cue',
      note: 'A habit that depends on remembering is a habit that dies. Give it a time, a place, or an existing habit to hang off.',
      inverseNote: 'Remove the cue from your environment. You cannot resist what you never see.'
    },
    {
      n: '2nd',
      title: 'Make it attractive',
      inverse: 'Make it unattractive',
      sub: 'Craving',
      note: 'Pair the habit with something you already want — that is temptation bundling. Or join a group where it is the normal thing to do.',
      inverseNote: 'Reframe it. Spell out the real cost of the habit until wanting it feels foolish.'
    },
    {
      n: '3rd',
      title: 'Make it easy',
      inverse: 'Make it difficult',
      sub: 'Response',
      note: 'Scale it down until it takes two minutes. You are mastering showing up, not the outcome.',
      inverseNote: 'Add friction. Every extra step between you and the habit is a step you may not take.'
    },
    {
      n: '4th',
      title: 'Make it satisfying',
      inverse: 'Make it unsatisfying',
      sub: 'Reward',
      note: 'What gets rewarded gets repeated. Ticking the box counts — that is why the tracker works.',
      inverseNote: 'Make the cost immediate and public. An accountability partner turns a private slip into a visible one.'
    }
  ];

  root.Templates = { STARTERS: STARTERS, LAWS: LAWS };
})(window);
