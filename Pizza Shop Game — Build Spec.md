# Pizza Shop Game — Build Spec

Oct 15, 2026 · @Hubert

## Overview

We are building a browser game where you run a small pizza shop one day at a time: make pizzas to order, bake them just right, earn money, and grow the shop. Dad writes the code (with Claude's help); Zofia is the game designer, artist, sound designer and chief tester. The plan is about 8 weekend sessions of 60 to 90 minutes, with a playable version live on a private web link from the very first session.

Working title: **Zofia's Pizzeria**. Zofia picks the real name in Session 0.

**Goals**

- Fun for an 8 to 9 year old to play alone, in short "days" of about 5 minutes.
- Playable without reading: orders, prices and feedback are pictures, numbers and sounds.
- Zofia's ideas are visibly in it: her shop name, her drawings, her recipes, her voice in the sound effects.
- Always playable: every session ends with something new she can show Mum and friends on the live link.
- Safe and private: no accounts, no ads, no chat, no personal data, saves stay on the device.
- Gentle learning on the side: money in pounds, timing, planning ahead (fits Year 4 maths).

**Not in version 1:** multiplayer, leaderboards, app-store release, 3D graphics.

**Done means:** Zofia can open the link on the family laptop or tablet, play days 1 to 10, see her own art and recipes, and wants to play again.

## Game design

The game is a loop of short days: buy ingredients in the morning, serve customers against the clock, then count the money and improve the shop. There is no game over; a bad day just means fewer coins. A diagram of the loop is at the end of this section.

### A day in the shop

1. **Morning (about 1 minute, no timer):** check the fridge and buy ingredients. Running out mid-service is the main planning challenge.
2. **Service (3 minutes on a visible clock):** customers walk in, show their order, and wait. You make, bake and serve.
3. **Closing time:** a summary screen counts coins, happy faces and stars, with a little celebration.
4. **Shop upgrades:** spend coins on new toppings, a second oven, a bigger counter or decorations. Then the next day starts.

### Making a pizza

1. Tap a dough ball to put a base on the counter.
2. Drag the ladle to add sauce, then drag the cheese bowl.
3. Drag toppings from their tubs onto the pizza. Each drop uses one portion from the fridge.
4. Slide the pizza into the oven. A bake bar fills: raw, then golden, then burnt.
5. Take it out while golden, then drag it to the waiting customer.

A burnt or wrong pizza can go in the bin. The ingredients are lost, nothing else.

### Customers

- Each customer has a speech bubble showing the order as pictures (base plus topping icons), never words.
- Patience is a face above their head that goes from happy to grumpy. If it runs out they leave, with no money.
- Early days allow 1 customer at a time, rising to 3 at once by about day 5.
- Zofia designs 4 to 6 characters. Example types: the Regular (patient), the Hurry (short patience, big tip), the Picky one (always extra topping), a VIP who visits once a week.

### Scoring each pizza

| Check | 3 stars | 2 stars | 1 star |
| --- | --- | --- | --- |
| Right toppings | all correct | one missing or extra | two or more wrong |
| Bake | golden | slightly under or over | raw or burnt |
| Wait | face still happy | face neutral | face grumpy |

The customer pays the menu price, plus a tip of £0, £1 or £2 for 1, 2 or 3 stars. Stars across the day add up to the shop's reputation, which unlocks new customers and recipes.

### Starting economy (placeholders to balance in testing)

| Item | Cost or price |
| --- | --- |
| Starting money | £20 |
| Dough ball | £1 |
| Sauce or cheese, per pizza | £1 each |
| Topping portion | £1 |
| Margherita sells for | £6 |
| Pepperoni or veggie sells for | £8 |
| Second oven | £60 |
| Decoration (cosmetic) | £10 to £30 |

Whole pounds only at first. A later level could add giving change to customers as an optional mini-game.

### Progression

- Days 1 to 2: Margherita only, one customer at a time.
- Days 3 to 5: pepperoni and one topping of Zofia's choice unlock; up to 2 customers.
- Days 6 to 10: more recipes, 3 customers, upgrades start to matter.
- Day 10: a weekly goal (for example earn £150 in total) wins a printable "Pizzeria of the Year" certificate.

### Controls and feel

- Mouse and touch both work; everything is tap or drag.
- Buttons and drop targets at least 48 pixels so small fingers hit them.
- Every action has a sound and a small animation; good moments get confetti.
- Raw, golden and burnt are shown by shape and picture as well as colour, so they read for anyone.
- Pause button always visible; the game saves after every day.

&#91;embedded content: game loop · 4 stages per day, 5 steps per customer\]

Service is the heart of the game; the other three stages are short breathers where planning happens.

## Who does what

Zofia owns every decision a player can see or hear; Dad owns everything that makes it work. When in doubt, Zofia decides what it looks like and Dad decides how it is built.

| Area | Zofia | Dad (with Claude) |
| --- | --- | --- |
| Name and logo | Chooses the name, draws the logo | Puts it on the title screen |
| Menu and recipes | Invents recipes, picks prices | Turns them into the recipes data file |
| Characters | Draws and names 4 to 6 customers | Scans, cleans and animates them |
| Shop look | Draws the counter, oven, decorations | Lays out the screen |
| Sounds | Records "ding", "yum", "hmph" on the phone | Trims and converts them |
| Rules and difficulty | Says what feels too easy or too hard | Changes the numbers, runs the balance simulator |
| Testing | Plays every build, reports bugs to the "bug book" | Fixes bugs, adds tests |
| Launch | Plans a launch party, invites testers | Deploys and shares the link |

### Design-together activities

- **Paper prototype first (Session 0):** cut out paper pizzas, toppings and customers and play the game on the kitchen table, with Dad as the "computer" running the timer. Finds most design problems before any code exists.
- **The design notebook:** one physical notebook for ideas, drawings and the bug book. Every session starts by reading the last page.
- **Her numbers file:** recipes and prices live in a simple data file Zofia can read. She changes a price, refreshes the browser, and sees the effect.
- **Dad codes, Zofia directs:** she sits beside you and says what should happen; you type the request to Claude together and watch it appear.

### Turning drawings into game art

1. Draw on white paper with thick felt-tip outlines (thin pencil disappears when scanned).
2. Photograph each drawing flat, in daylight.
3. Remove the background to get a transparent PNG (a background-removal tool or a short Python script).
4. Resize to a consistent size, for example 256 pixels tall for customers, and save into the assets folder with a simple name.

## Tech approach

Recommended stack: **Phaser 4 + Vite + plain JavaScript**, with all game rules in small pure-JavaScript modules that know nothing about the screen. Phaser handles sprites, drag and drop, touch, sound, animation and screen scaling; the rules modules can be tested in milliseconds and tuned by a simulator. Phaser 4 became stable in April 2026 (4.1.0 on 30 April 2026) and its starter app sets up Vite for you ([Phaser releases](https://phaser.io/download/phaser4)).

### Options considered

| Option | Good for | Weak for | Verdict |
| --- | --- | --- | --- |
| Phaser 4 + Vite | Drag and drop, sprites, sound, touch, a real "game" feel; huge example library | A learning curve on scenes and the game loop | **Recommended** |
| Plain HTML, CSS and JavaScript | Menus, shop screens, text; no framework to learn | Animation, sound timing and many moving sprites get fiddly | Good fallback if Phaser feels heavy |
| Godot (web export) | Proper game engine, visual editor | Large downloads, slower to start in the browser, a new language | Overkill here |
| Scratch | Zofia can code it herself | Hard to grow, can't use your own tooling or tests | Great side project for her, not this game |

### How the code is organised

The game has four layers, shown in the diagram below:

- **Data (JSON files):** recipes, toppings, customers, upgrades and economy numbers. Zofia's numbers file lives here.
- **Rules (pure JavaScript):** order scoring, money, customer arrivals, day progression. Takes data plus state, returns new state. No Phaser, no browser.
- **Scenes (Phaser):** Title, Morning shop, Kitchen (service), Day summary, Upgrades. They draw the state and turn taps and drags into calls to the rules.
- **Save:** the game state written to the browser's local storage after each day, with a "start over" button.

&#91;embedded content: architecture · 4 layers plus save and tests\]

Scenes only draw and pass on actions; every number Zofia changes lives in the data files, and the tests reach the rules without opening a browser.

Two rules keep it testable: scenes never change money or stars directly, and all randomness (who walks in, what they order) comes from one seeded random generator, so any day can be replayed exactly.

### Game state

```json
{
  "version": 1,
  "day": 4,
  "money": 57,
  "reputation": 23,
  "fridge": { "dough": 6, "sauce": 6, "cheese": 6, "pepperoni": 4 },
  "unlocked": ["margherita", "pepperoni"],
  "upgrades": ["second-oven"],
  "seed": 81723
}
```

The `version` field lets old saves be upgraded when the game changes, so Zofia never loses her shop.

### File layout

```text
pizzeria/
  index.html
  package.json
  src/
    main.js              start Phaser, register scenes
    scenes/              Title, Morning, Kitchen, Summary, Upgrades
    rules/               scoring.js, economy.js, customers.js, day.js, rng.js, save.js
    data/                recipes.json, toppings.json, customers.json, upgrades.json
  public/assets/
    art/                 Zofia's drawings as PNG
    sound/               her recordings as MP3 or OGG
  tests/
    unit/                Vitest tests for rules/
    e2e/                 Playwright smoke test
  tools/simulate.js      plays 1,000 days with a bot to check balance
  .github/workflows/     test and deploy on every push
```

### Building it with Claude

Use Claude Code in the repo for the build sessions. Keep a short `CLAUDE.md` at the top of the repo saying: rules stay pure and tested, scenes only draw, data lives in JSON, and the target player is 8 years old. Ask for one small feature at a time, run it, then commit.

## Build plan

Nine sessions of 60 to 90 minutes, one per weekend, take the game from paper to a 10-day playable launch in about two months. The live link exists from Session 1, and every session ends with Zofia playing the new build. Keep sessions short: stop while it is still fun.

| # | Session | Zofia | Dad | Done when |
| --- | --- | --- | --- | --- |
| 0 | Paper prototype | Names the shop, draws the logo, invents 3 recipes, plays the paper game | Runs the paper timer, takes notes | Name, menu and 4 customer ideas are in the notebook |
| 1 | Hello Pizzeria | Picks the background colour and title music | Creates the repo, Phaser starter, CI and deploy | Title screen with her logo is live on the link |
| 2 | Make a pizza | Tests dragging toppings, says what feels wrong | Kitchen scene: base, sauce, cheese, toppings, oven bake bar | She can make and bake a Margherita |
| 3 | First customer | Draws customer 1, records "yum" and "hmph" | Customer walks in, order bubble, serve, scoring, pay | One full order earns coins and stars |
| 4 | A whole day | Chooses how long a day lasts | Service clock, several customers, closing summary, save | A 3-minute day plays start to finish and saves |
| 5 | Morning shop | Sets ingredient prices in her numbers file | Fridge stock, buying, running out | Running out of cheese actually matters |
| 6 | Upgrades | Draws decorations and the second oven | Upgrade shop, unlocks by day and reputation | Spending coins visibly changes the shop |
| 7 | Her art and sounds | Draws remaining customers and props, records all sounds | Swaps placeholder art, adds animations and confetti | No placeholder art left |
| 8 | Polish and launch | Runs a playtest party with 2 or 3 friends | Fixes bugs from the bug book, tunes balance, adds certificate | Days 1 to 10 play through; launch |

Placeholder art (coloured circles and boxes) is fine until Session 7, so code never waits for drawings and drawings never wait for code.

### First-session setup checklist

- [ ] Install Node.js (current LTS) and Git
- [ ] Run the Phaser starter (`npm create @phaserjs/game@latest`), choose the Vite + JavaScript template
- [ ] Create a GitHub repo and push the starter
- [ ] Add Vitest and Playwright as dev dependencies
- [ ] Add the GitHub Actions workflow: install, test, build, deploy
- [ ] Add `CLAUDE.md` with the project rules
- [ ] Confirm the live link loads on the laptop and the tablet

## Testing

Testing has four layers: fast unit tests on the rules, one automated browser smoke test, a balance simulator, and real playtests with Zofia. The first three run automatically on every push and block a broken build from going live; the fourth is where the fun gets checked.

| Layer | Tool | What it checks | When it runs |
| --- | --- | --- | --- |
| Unit tests | Vitest | Scoring, money, unlocks, save and load, seeded customer arrivals | Every save locally, every push in CI |
| Smoke test | Playwright (Chromium + mobile viewport) | Game loads, title starts a day, one pizza can be made and served, no console errors | Every push in CI |
| Balance simulator | `tools/simulate.js` | Money and reputation curves across 1,000 simulated players of different skill | When economy numbers change |
| Playtests | Zofia, then friends | Fun, confusion, difficulty, bugs | End of every session; party in Session 8 |

### Unit tests to write first

- A perfect pizza, golden, served fast, scores 3 stars and pays price plus £2.
- A pizza with one missing topping scores 2 stars on toppings.
- A burnt pizza never scores more than 1 star on bake.
- Buying with too little money is refused; money never goes below £0.
- The same seed produces the same customers and orders, every time.
- An old save (version 1) loads correctly after the game moves to version 2.
- Every recipe in the data file uses only toppings that exist (catches typos in Zofia's numbers file).

### Balance simulator

A bot plays the rules layer with no graphics, at three skill levels: careful (always correct, sometimes slow), average (one mistake in five), and chaotic (random toppings). For each it records money and reputation per day across 1,000 runs and writes a CSV. Targets to aim for:

- The average player can afford the second oven by about day 4.
- The chaotic player still earns something every day, so no one is stuck.
- The careful player hits the day-10 goal with room to spare, but not by day 5.

This is the part of the project closest to your day job; a quick chart of the CSV after each economy change is the whole balancing process.

### Playtest protocol

1. Hand over the device and say only "play it"; don't explain.
2. Watch quietly. Write in the bug book wherever she hesitates, frowns, or asks a question.
3. Ask afterwards: best bit, most annoying bit, one thing to add.
4. Fix confusion before adding features; if she didn't understand it, a friend won't either.
5. For friends at the launch party, keep a simple tally: finished day 1, wanted to keep playing.

### Devices to check before launch

- [ ] Family laptop in Chrome and Safari or Edge
- [ ] Tablet in portrait and landscape, touch only
- [ ] A phone, to make sure it at least scales and doesn't break
- [ ] Sound on, sound off, and the mute button works

## Getting it live

Recommended: a public GitHub repo deployed to **GitHub Pages** by a GitHub Actions workflow on every push to `main`, after the tests pass. It is free, needs no server, and gives a stable link from Session 1. The game is static files only, so any static host works.

### Hosting options

| Option | Cost | Repo can be private | Notes |
| --- | --- | --- | --- |
| GitHub Pages | Free | Only on a paid plan | Simplest with Actions; the site itself is public either way |
| Cloudflare or Netlify static hosting | Free tier | Yes | Preview link for every branch, handy for trying ideas |
| itch.io | Free | Yes | Feels like a "real" game page; can be kept as a draft with a secret link |
| Claude artifact | Included | n/a | Instant shareable page for early prototypes, not the long-term home |

On GitHub, a free personal account gets Pages for public repositories only; Pro adds Pages for private ones ([GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)). Either way the published site is reachable by anyone with the link, so treat it as "unlisted", not private.

### Deploy steps (GitHub Pages)

1. In the repo settings, set Pages to deploy from GitHub Actions.
2. Set Vite's `base` to the repo name (for example `/pizzeria/`), or images and sounds will fail to load on the live site. This is the most common first-deploy bug.
3. Add a workflow that runs `npm ci`, `npm test`, `npx playwright test`, `npm run build`, then uploads the `dist` folder and deploys it.
4. Push to `main`; the link appears in the workflow summary within a couple of minutes.
5. Add the link to the tablet's home screen so it opens like an app.

### Keeping Zofia safe online

- First name only in the credits; no surname, school, photos of her, or her voice saying her name.
- Add a `noindex` tag so search engines don't list the game; share the link only with family and friends.
- No analytics, cookies, accounts, chat or external ads; nothing is sent anywhere.
- Music and sounds are her own recordings or clearly licensed free assets, with credits on a "Thanks" screen.

### Release routine

- Every session ends with a push; the live link updates itself.
- Tag a named version at milestones (v0.1 "First slice", v1.0 "Launch") so you can always go back.
- A small "What's new" note on the title screen, written by Zofia, for her testers.

## Backlog, risks and open decisions

The biggest risk is not technical: it is the project getting too big and stopping being fun for Zofia. Everything below protects the core loop first.

### Open decisions

- [ ] Which devices will she mainly play on: laptop, tablet, or both? This sets portrait or landscape.
- [ ] Pounds or a made-up coin ("pizza coins")? Pounds teach money; coins avoid change maths.
- [ ] Does a customer who gets the wrong pizza still pay something, or nothing?
- [ ] Public or private repo (decides GitHub Pages versus another host)?
- [ ] Is pineapple allowed? (Zofia's ruling is final.)

### Risks

| Risk | Sign it's happening | What to do |
| --- | --- | --- |
| Scope creep | Sessions end without a playable change | Move ideas to the backlog; one feature per session |
| Zofia loses interest | Sessions feel like homework | Shorter sessions, more drawing and sound, play other management games for ideas |
| Too hard for her age | She gets grumpy customers on day 2 | Longer patience, fewer customers, use the simulator |
| Too easy, boring by day 5 | She stops trying for 3 stars | New customer types and recipes earlier |
| Art pipeline is slow | Drawings pile up unscanned | Batch scanning once a fortnight; placeholders are fine |
| Touch bugs on the tablet | Drags miss or the page scrolls | Test on the tablet every session, not just at the end |

### Backlog (after version 1)

- Delivery mode: a scooter ride to houses on a little map.
- Give-change mini-game for customers paying with notes.
- Seasonal events: a Halloween pumpkin pizza, a Christmas menu.
- A recipe editor screen so Zofia can add pizzas without the numbers file.
- Polish and English language toggle, with her doing the Polish voice lines.
- A daily challenge with a fixed seed so family members can compare scores.
- Second shop location once the first one is fully upgraded.

## Sources

- [Phaser 4 releases](https://phaser.io/download/phaser4)
- [GitHub's plans (Pages availability)](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)
