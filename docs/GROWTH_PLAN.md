# aniBet growth plan

Goal: get anime/manga fans to **(1) try a game, (2) make an account, (3) place a
bet, (4) propose bets of their own**. Each step below is ordered by
impact ÷ effort, and tied to features that already exist or are small to add.

> **Status (built in code):** share cards for games, bets and wins · per-market
> link previews, sitemap, robots · starter quest · guest "you'd have earned" ·
> closing soon · notification bell (results, approvals) · creator rewards
> (+500 on approval, 0.5% of the pool) · "proposed by" · Top Creators ·
> proposal templates · follows + friends leaderboard · admin Growth tab (the
> section 7 metrics). Still manual: content, distribution, mods, emails
> (see "What's left" at the bottom).

The big advantage: aniBet runs on play money (AniCoins). There's no deposit and
nothing to lose, so the pitch is just *"prove you called it first"*. Lean into
that everywhere.

---

## 0. Before inviting anyone (this week)

- [ ] **Deploy the security fixes** from this branch. The signup bug let anyone
      make themselves admin, so it needs to be live before any promotion.
- [ ] **Rotate `SESSION_SECRET_KEY`** in production if it still equals the value
      that was hardcoded in `main.py` before commit `76a446f` (it's in git
      history). Rotate `SECRET_KEY` too if it was ever shared.
- [ ] **Fill the silhouette days** (Tue/Thu/Sat). Trivia now runs itself on
      Mon/Wed/Fri/Sun, but streaks need a game *every* day. One missing
      silhouette resets everyone's streak, which is the fastest way to lose
      daily players.
- [ ] **Seed 15–20 live markets** across the 5 biggest currently airing or
      publishing series. An empty site never converts. Mix quick ones (resolve
      after the next chapter) with season-long ones.
- [ ] Give yourself an AniConnections buffer of 3–4 weeks.

## 1. Make every game and bet shareable (biggest lever, ~2–3 days)

Fans already share predictions and Wordle-style scores. Give them a reason to
link aniBet when they do.

- **Share card after every daily/weekly game**: emoji grid + streak, like
  Wordle, with no spoilers:
  `aniBet Trivia 21/10 🟩🟩🟥🟩🟩 4/5 · 🔥12` + link. One `navigator.share` /
  copy-to-clipboard button on the result screens in `daily/trivia`,
  `daily/silhouette` and `weekly`.
- **Open Graph images per market** (`markets/[id]`): title, outcomes and the
  current odds/pool split, generated with Next's `opengraph-image.tsx`. A pasted
  market link on Discord/X/Reddit should *look like a bet slip*.
- **"I called it" card when a bet wins**: "@user called *Gojo comes back*
  at 12% odds → +8,400 🪙". This is the most shareable moment. Show it on the
  profile and in the post-resolution notification.
- Add `sitemap.ts` + per-page metadata so market pages rank for searches like
  "will X die in chapter Y".

## 2. Turn guests into accounts (~1–2 days)

Guest play already exists. Now push guests to sign up at the moments they care most:

- After a guest game, the result screen now says *"log in to see the right
  answers"*. Keep that hook, and show what they'd have earned:
  "+200 🪙 and a 1-day streak if you had an account."
- **Starter quest** for new accounts (worth ~2,000 🪙 total): place your
  first bet → play a daily → propose a bet → set an avatar. It teaches the
  whole product in 5 minutes. It fits the existing `point_transactions`
  ledger.
- Keep Discord login front and center: it's the main fan-community login.

## 3. Get people betting (ongoing)

- **"Chapter day" markets**: every Monday-ish (Jump release), post 3–5 quick
  markets on that week's chapters that lock at release time. Short loops
  (bet → result in days) keep people coming back. Long ones alone don't.
- **Homepage = "closing soon"** sorted by `locks_at`, with the pool size
  shown. Urgency plus social proof.
- **Weekly "featured bet"** pinned with the existing admin carousel, plus a
  2× payout or an exclusive badge to concentrate activity on one market.
- **Seasons as events**: announce season start/end, show the Hall of Fame,
  give finishing badges by tier. Seasons and tiers already exist. They need
  marketing, not code.

## 4. Get people creating bets (the long-term engine)

Proposals and per-series mods already exist. This is what scales content
beyond what you can write yourself.

- **Reward approved proposals**: +500 🪙, plus a small cut of the market's fee
  to the proposer (e.g. 0.5% of the pool). Then good proposers *want* their
  market to be popular, and they'll share it.
- Show "proposed by @user" on market cards and a **Top Creators** tab on the
  leaderboard.
- **Recruit series mods from the community**: find the most active fan in each
  series' Discord/subreddit, give them mod scope for that series and a "Mod"
  badge. They create and resolve markets, and they bring their community.
- Proposal templates ("Will ___ appear in chapter ___?", "Who wins ___ vs
  ___?") lower the effort of proposing.

## 5. Distribution: where the fans already are

| Channel | What to post | Cadence |
|---|---|---|
| **Own Discord server** | Bot or webhook posting new markets, results, daily game link, leaderboard | Daily |
| **Reddit** (r/OnePiece, r/JuJutsuKaisen, r/ChainsawMan, r/Animemes…) | Weekly "community predictions" post: *"62% of aniBet players think X happens next chapter"*. Read each sub's self-promo rules first. Lead with the data, link at the end | Weekly per sub |
| **X / Twitter** | Live odds when big leaks/spoilers drop, "I called it" cards, trivia question of the day | Daily |
| **TikTok / Shorts** | 15 s "can you get 5/5 on today's trivia?" clips. The trivia bank is ready-made content | 3–4×/week |
| **Small anime YouTubers / streamers** | Free "creator market" on their channel's theory, and they ask viewers to bet | 2–3 creators/month |

Spoilers: chapter-based markets must be spoiler-safe in titles/previews on
public channels, or you'll get banned from subreddits. Use "Chapter 1130
predictions" rather than the plot point.

## 6. Retention mechanics (after launch)

- Email/Discord DM reminder when a streak is about to break (Resend is
  already wired in `email_utils.py`).
- "Your market resolved" notification with the result and the share card.
- Friends/following: a leaderboard of just the people you follow is far
  more motivating than a global top 20 once the site has >500 users.

## 7. What to measure

Track weekly:

1. **Guest → account conversion** (guest game finishes ÷ new signups)
2. **New account → first bet** within 24 h
3. **D7 retention** (still playing a week after signup)
4. **Daily game completion** and average streak length
5. **Proposals submitted / approved per week**, and the share of markets that
   come from the community vs. you

If (1) is low → improve the guest result screen. If (2) is low → the starter
quest and "closing soon". If (5) is low → proposal rewards and mods.

---

### Suggested order

| Week | Focus |
|---|---|
| 1 | Section 0 + share cards for daily games |
| 2 | OG images for markets, starter quest, first Discord server + Reddit posts |
| 3 | Proposal rewards + "proposed by", recruit 2–3 series mods |
| 4+ | Creator partnerships, streak reminders, measure and iterate |

---

### What's left (not code, or needs your accounts)

- Run `backend/migrations/018_growth.sql` on the production database before deploying the backend.
- Set `NEXT_PUBLIC_SITE_URL` (e.g. `https://anibet.io`) on the frontend so link previews and the sitemap use the real domain.
- Submit `https://<your-domain>/sitemap.xml` in Google Search Console.
- Streak-reminder emails: needs explicit opt-in + unsubscribe link (GDPR) and a scheduled job; not built.
- Featured bet with 2× payout: needs a decision on who pays the bonus (it creates coins); not built.
- Everything in sections 3 and 5 that is content or distribution.
