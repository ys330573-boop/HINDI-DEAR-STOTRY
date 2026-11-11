# HI02H02_L01_S01 - वह हँस दिया (Guessing new-word meanings from context clues)

**Grade:** G2 · **LO:** HI02H02_L01 · **Attribute:** H02 · **Type:** CORE

**Skill:** कहानी-क्रम एवं प्रसंग-संकेत (context-clue) रणनीतियों का उपयोग कर नए शब्द का अर्थ अनुमानता है।

## Flow (21 slides + landing)
| # | Slide | Phase | Mechanic (type) |
|---|---|---|---|
| - | landing | - | Cover: the greeting VO plays by itself, then the Play button appears |
| - | gate | - | Swiftee transition: "चलिए, शुरू करें!" |
| 0-10 | S01-S11 | tutorial | Story pages: picture + sentence + mic. Tap the mic, the words light one by one, then the sentence is read aloud with word highlight → **आगे** (`STORY_MIC_READ`) |
| 11 | T7 | tutorial | Demo: 'ठोकर' - question, options pop in, the magnifier reads the two clue sentences, the answer card glows, the hand points at it, the child taps it, it flips to the meaning → **आगे** (`EVIDENCE_QA`, auto) |
| 12 | T8 | tutorial | Demo: 'सहलाया' - same steps as T7 (`EVIDENCE_QA`, auto) |
| - | gate | - | "चलिए, साथ में करें!" |
| 13 | G1 | guided | Picture with three boxes (हिरण / नहर / झाड़ियाँ): tap where the नहर is (`TAP_IN_SCENE`, boxed) |
| 14-17 | G2-G5 | guided | Word meaning from the passage: कूदना / झाड़ियाँ / वरना / फूट-फूटकर रोना - pick 1 of 3 (`EVIDENCE_QA`, ladder) |
| - | gate | - | "वाह! अब आपकी बारी।" |
| 18 | P1 | practice | Word search, 4 words (कूदना, ठोकर, सहलाना, झाड़ियाँ), the magic hat (`WORD_SEARCH`) |
| 19 | P2 | practice | Word search, 8 words (चुपचाप, शोर, किसान, बादल, बस्ता, सूरज, बकरी, गिलहरी) (`WORD_SEARCH`) |
| 20 | CEL | - | "शाबाश! आपने कर दिखाया।" - Swiftee cheers and talks, end arrow button |

Tutorial pages move on with **आगे**. Guided and practice pages move on by themselves after a correct answer, so they have no आगे.

---

## Reference behaviour

### 1. Speaker button 🔊
There are two speakers. One is on the cover (`#sgVo`). The other is in the header on every slide (`#audioChip`).

**On every slide, the speaker replays the last VO heard on that screen.** That includes the prompt, a hint, a feedback line, a story sentence or a word clip. Before any VO has played, it falls back to the slide's own replay (`state.replayAudio`). The memory is kept per screen, so a VO from the previous slide or from a transition gate is never replayed.

| Moment | What the speaker plays |
|---|---|
| Cover, while the greeting plays | Nothing - the speaker is grey and cannot be tapped |
| Cover, after the greeting | The greeting again. **The Play button stays on screen**; only the speaker greys out while it speaks |
| Cover, sound blocked by the browser | The speaker is full colour and pulses; tapping it starts the greeting |
| S01-S11, before the mic is tapped | The mic prompt "इस बटन पर टैप कीजिए और वाक्य पढ़िए।" |
| S01-S11, after the sentence was read | The sentence again, **with the words lighting up again** |
| T7 / T8 | The last line of the demo heard (e.g. the answer line or "tap the answer" line) |
| G1, before any wrong tap | The question "इस चित्र में नहर कहाँ है? …" |
| G1, after a wrong tap | The hint just heard (`vo2_g2_h1`, the box names, or `vo2_g2_h3`) |
| G2-G5, after the intro | The last passage line read |
| G2-G5, after a wrong tap | The hint just heard (`hint1`, the option clips, or `hint3`) |
| P1 / P2 | The last clue, hint or word VO heard |
| Celebration | The celebration line |

Rules:
- **Grey until the VO is complete, on every screen.** While a voice-over sequence is going, the speaker shows one still grey state: 50% faded, no throb, no moving sound waves, and taps do nothing. That covers:
  - every clip;
  - the short gaps between clips;
  - a page's opening voice;
  - the mic reading the words on S pages;
  - the whole T7/T8 demo;
  - a found word flying into its box in the word search.
- It turns **blue** 0.7 s after the last voice ends, so it doesn't flash blue in the gaps.
- A page with no opening voice (S02-S11 before the mic tap) turns blue after 2.5 s.
- On T7/T8 it turns blue when the game is waiting for the child to tap the answer.
- A replay never restarts a demo, a hint animation or a hand. It is voice only (the story read-along also lights its words).
- The **7 s idle replay** is separate (see §6). It plays the slide's own prompt, not the last VO.
- There is no mute.

### 2. Swiftee
- **Header head** (every slide): it shows the pointing/talking face by default.
  - Hint face on hint rungs and during the T7/T8 demo.
  - Sad "try again" face on a wrong answer. It goes back to pointing by itself when the voice ends.
  - Happy/cheer face on a correct answer.
  - The header head has no lip-sync.
- **Cover:** Swiftee waves while the greeting plays, and waves again when the speaker replays it.
- **Transition gate:** the peeking Swiftee animation with the gate VO and its caption. The header is hidden while the gate is up.
- **Celebration:** Swiftee stands still, cheers with his arms up on "शाबाश!", then lip-syncs the rest of the line and ends with his mouth closed.

### 3. Feedback
| Event | Sound | Visual | Voice |
|---|---|---|---|
| Correct (G1-G5) | `sfx_correct` | Green ring + star crown, confetti, happy Swiftee | The option's own clip (G2-G5), then "शाबाश!" → next slide |
| Correct (T7/T8 tap) | `sfx_correct` | Wrong cards slide away, the answer card centres and flips to its meaning, star burst (no confetti) | T7: wrap-up line; T8: none |
| Word found (P1/P2) | Rising `sfx_tring`, then `sfx_tring_big` | Ring round the letters, the letters fly into the answer box, the picture goes back into the hat | The word's VO, then the next clue |
| All words found | `sfx_correct` | Confetti, celebrating Swiftee | "शाबाश!" → next slide |
| Wrong | `sfx_wrong` (soft) | Red flash + wiggle (cards) / shake (G1 boxes) / letter wiggle (P1/P2), sad Swiftee | The next hint rung (below) |

**Hint ladder - three rungs**, one per wrong attempt. The 3rd rung repeats after that.

| Rung | G1 (boxes) | G2-G5 (options) | P1/P2 (word search, per word) |
|---|---|---|---|
| 1st wrong | "फिर से कोशिश कीजिए। देखिए, नहर कहाँ है?" | `hint1` (G2: read the sentences around the word; G3-G5: "फिर से कोशिश कीजिए।") | The word's picture comes out of the hat + "फिर से कोशिश कीजिए।" |
| 2nd wrong | Each box glows in turn while its name is said | Each option glows in turn while it is read aloud | The first letter glows + "सही शब्द है, X।" |
| 3rd wrong | The other boxes are disabled, the answer glows, the hand points at it + "यहाँ नहर है। इस पर टैप कीजिए।" | The other options fade out, the answer glows, the hand points at it + `hint3` | The other letters are disabled, the hand traces the word in a loop + "सही शब्द है, X।" |

The child always makes the final tap or drag; the game never answers for them.

### 4. Hand nudge
| Where | When |
|---|---|
| S01 mic | 0.5 s after the transition ends, with the mic prompt; stays until the mic is tapped |
| S02-S11 mic | After 7 s without a tap, with the mic prompt; repeats every 7 s |
| T7 / T8 answer card | When the "tap the answer" VO plays; stays until the card is tapped |
| G1-G5 answer | 3rd wrong rung only |
| P1 first word | A one-time demo drag over कूदना; the first touch on the grid ends it |
| P1/P2 | 3rd wrong rung: the hand traces the word in a loop (it pauses while the child touches the grid) |

**Never a hand on:** the आगे button (it only pulses), the cover, the transition gates, the celebration screen.

### 5. Buttons
- **Play (cover):** hidden while the greeting plays, then it pops in and pulses. It does **not** disappear again when the speaker replays the greeting. A tap plays `sfx_play` and starts the music. If a voice is still speaking, the game waits for it to finish, then runs the transition gate into S01.
- **आगे:** shown only on S01-S11 and T7/T8.
  - Greyed until the page's VO is done: the sentence read-aloud on S pages, the full demo on T7/T8 (with a 90 s safety release).
  - Then it lights up and pulses. A tap plays `sfx_next`.
  - It cannot be tapped while a VO plays, and is disabled during a transition gate.
- **Hint button:** not shown in this game (hints come from the wrong-attempt ladder).
- **Back:** none for the child. A dev nav bar exists only with `?dev=1` / `?nav=1`.
- **End arrow (celebration):** shown straight away with a glow. A tap sends `proceed_next` to the host app.

### 6. Voice rules
- **VO lock:** while any VO plays, answer cards, G1 boxes, आगे and the speakers cannot be tapped. They don't change colour, except the speaker, which greys out.
  - On the word search, the grid is locked only while the instruction or a clue is being read. Hint and word VOs never lock it.
- **Idle replay:** G1-G5 only. After 7 s of silence with no touch, the slide's prompt plays again (G2-G5: the prompt plus the passage lines). It repeats after every further 7 s of silence until the answer is correct.
  - S pages use the mic hand and prompt instead (see §4).
  - P1/P2 use the magic hat instead: after 7 s idle the hat sparkles, the first letter glows gold and the clue is read again.
- **Music:** background music starts on Play, steps down while any VO speaks, and stops at the celebration.
- **Tab away:** all audio pauses and resumes from the same point when the child returns; nothing starts while the tab is hidden.
- **Missing file:** a short silent beat, never a robot voice.

### 7. Pop-ups and transitions
- **Transition gates** - start → S01, T8 → G1, G5 → P1. In order:
  1. The page blurs and a whoosh plays.
  2. Peeking Swiftee and the gate VO play, and the caption pops in on its word.
  3. The gate closes when the VO ends (at least 1.2 s; safety close at 12 s).
- **T7/T8 flip card:** the answer card flips to show the word and its meaning (ठोकर - किसी चीज़ से पैर टकराना / सहलाना - प्यार से हाथ फेरना).
- **P1/P2 hat:** the word's picture rises out of the hat on the 1st wrong attempt. It stays until the word is found, then sinks back in. The hat only moves while a picture comes out or goes back.
- **Celebration screen:** a star burst, `sfx_celebrate`, then "शाबाश! आपने कर दिखाया।" with the animated Swiftee and the end arrow.
- **Next slide timing:** after a correct answer the next slide waits for both the confetti and the voice to finish (8 s / 15 s safety caps).

---

## Where things live
- `index.html` - the page and the **card** (all slide data, VO ids, word timings) in `<script type="application/json" id="cardData">`.
- `app.js` - the SwiftPAL engine and this game's slide modules (`STORY_MIC_READ`, `EVIDENCE_QA`, `TAP_IN_SCENE`, `WORD_SEARCH`, `CELEBRATION`). `AUDIO_BUILD` is the cache stamp: bump it, and the `?v=` on `style.css` / `app.js` in `index.html`, whenever audio, CSS or JS changes.
- `style.css` - layout and animations. `ui-kit.js` - the shared feedback kit (rings, wiggle, crown).
- `assets/Audio/*.ogg` - VO (Opus, 48 kHz). `assets/SFX/` - sound effects. `voiceovers/` - the source WAV recordings.
- `VO_MANIFEST.csv` / `VO_MANIFEST.json` - the VO script: slide, moment, file, text.

## Known gaps
- The mic does not record or listen. It is a button that runs the word-by-word animation, so there is no "mic denied" path.
- A few VO lines have no text in the manifest: `vo2_t7_first`, `vo2_tap_answer`, `vo2_g3_l1`, `vo2_g3_l2`.
- In the card's `audio_text`, the G1 hint lines still read "नाला". The recordings and on-screen text say "नहर".
- `audio_text` for `vo2_ws1_q` still includes "…और उन पर गोला लगाइए।", which the trimmed recording no longer says.
- The CSV describes the older word-search ladder (1st = try again, 3rd = all letters glow). The table in §3 is what the game does now.
