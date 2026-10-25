# AdaptiveSteps

Step-by-step support for homework and review that adapts to how a child actually performs — not to a diagnosis.

## What it is

AdaptiveSteps is a mobile app (built with Expo/React Native, running on iOS, Android, and web) for kids who benefit from extra structure around schoolwork — breaking a task into clear steps, getting the right amount of prompting, and reviewing facts until they stick. A parent or teacher sets it up; the child uses it independently.

It has two pillars:

**1. Study & Homework Sessions.** A parent builds a session as an ordered list of steps ("Get out your worksheet," "Read the first problem," "Show your work"), each with an optional photo, hint text, and a support level. The child works through the steps one at a time in a numbered stepper, can ask for help or take a break at any point, and can also answer via a point-to-tap board (Yes / No / More time / Help) for kids who communicate better that way than through text.

**2. Review Cards.** Simple front/back flashcards (spelling words, math facts) that use spaced repetition: cards you get right are shown less often, cards you miss come back sooner.

## The adaptive engine

Both pillars are driven by the same small, fully unit-tested, framework-free engine (`src/lib/adaptiveEngine.ts`) built on two ideas from special education that are usually kept separate:

- **MTSS (Multi-Tiered System of Supports):** how much support a step or card gets is set by the child's measured response to it — not by a label — and can differ per skill for the same child. Three "need help" responses in a row on a step adds a more detailed prompt; three correct-with-support answers in a row on a review card offers to reduce it.
- **Errorless learning vs. retrieval practice:** a child who's struggling on a specific item gets more scaffolding (fewer chances to fail) while learning it; a child who's succeeding gets less scaffolding and more real retrieval challenge, because effortful recall is what actually strengthens memory once a learner can handle it.

Every adjustment the engine makes writes a plain-language reason to an audit log (`AdaptiveAdjustment`) that the parent dashboard shows — nothing is a black box. **Increasing** support happens automatically, since asking for help is never treated as failure. **Decreasing** support always requires explicit parent approval first, since that's the one direction a wrong call actually costs the child something.

## What makes it different

- **No diagnosis, anywhere.** There is deliberately no medical or diagnostic field in the data model. The app responds to how a child performs on a given skill, not to a label — the same engine works whether or not a child has a formal diagnosis.
- **Explainable by design.** Every support-level change has a reason a parent can read in one sentence, and every reduction in support is opt-in, not automatic.
- **Two evidence-based special-ed practices reconciled into one decision rule**, rather than treating "how much scaffolding" and "how much retrieval challenge" as separate systems a parent has to configure by hand.
- **Built for how kids actually communicate.** Point-to-answer boards, adjustable text size, picture/text/voice preference per child, high-contrast mode, and reduced-animation mode are first-class settings, not accessibility add-ons bolted on later.
- **Local-first and genuinely free to start.** Runs entirely on-device storage (no account, no backend, works offline); the data layer (`src/lib/db.ts`) is written so swapping in a cloud backend later only touches that one file.
- **Design system matched to the task, not to "kid app" defaults.** The UI deliberately avoids emoji-as-icons, decorative color, and shadow/card chrome in favor of a dense, structured status-list-and-numbered-stepper pattern (visually closer to a course/LMS tool than a game) — because the people actually using this day to day are a parent tracking progress and a child who needs to know exactly where they are in a task, not be entertained.

## Status

Actively in development. The adaptive engine and its test suite are stable; the UI has been through several design passes and currently covers the full app (home, session runner, review cards, parent dashboard with pending-approval review, profile/session/card builders, accessibility settings, and PIN-gated Parent Mode) in one consistent design system.
