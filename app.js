const CARD = JSON.parse(document.getElementById('cardData').textContent);
  const AUDIO_EXT = (CARD.assets && CARD.assets.audio_ext) || "mp3";  // .ogg (maths) / .ogg (Hindi FLN)
  const IMG_EXT   = (CARD.assets && CARD.assets.img_ext)   || "png";  // .webp (working) / .webp (delivered/FLN) — twin of AUDIO_EXT (fixes A3)
  const ENGINE_VERSION = "2026.07.21b-unified";  // ENGINE STAMP — the receipt (verify_bundle.py) asserts a built game carries THIS exact string; a stale/divergent engine → hard FAIL, so the wrong engine can never silently ship. BUMP IN LOCKSTEP with engine_guard.py + swiftpal_build.py + unified_build.py + verify_bundle.py on EVERY engine change (r2: drag/pattern feedback standard + PHASE_TRANSITION; r3c: off-white toybox bg, dual-coded counting options numeral+hand, full-body landing mascot, true-corner square/rect; r3d: Swiftie mouth-stops-when-silent (still frame), Arabic display numerals 1/2/3, landing shows full 1..n hand row, volume-chip aligned in header pill; r4a: ADDITIVE rhyme modules MEET_RHYME + RHYME_YESNO + RHYME_PICK for phonological-awareness तुक games — no existing module touched; r4b: ADDITIVE sentence-reading modules SENTENCE_READ + SENTENCE_FIND for H06 वाक्य reading — no existing module touched; r4c: ADDITIVE TAP_ALL_WITH_SOUND multi-select for repeated-sound/alliteration; r4d: ADDITIVE SENTENCE_SOUND — read an alliterative line, tap the repeated sound; r4e: ADDITIVE middle-sound modules MEET_MIDDLE + TAP_MIDDLE_SOUND + MIDDLE_PICK_WORD + MIDDLE_YESNO for H02 बीच-की-ध्वनि games; r4f: ADDITIVE reading-direction modules READ_PATH + TAP_READ_ARROW + TAP_READ_POS + TRACK_FOLLOW (guided "animated tracker" variant of READ_PATH) (+ readPage helper) for H03 पठन-दिशा/tracking print-concept games; r4g: ADDITIVE classroom-label modules MEET_LABEL + TAP_LABEL_SCENE + TAP_WORD_FOR_OBJECT (+ MATCH_DRAG_N word-tile mode) for H03 environmental-print/label games; r4h: ADDITIVE READ_TRACE (finger-swipe drag across words) + FIX_TRACKING (correct a confused reader's wrong finger via TAP_READ_POS confused_at marker) for H03 finger-tracking games; r4i: ADDITIVE USE_INTERFACE (operate a mini media-player/device by tapping the right button — H03 symbol/button recognition) — no existing module touched; r4j: ADDITIVE syllable-clap modules MEET_SYLLABLE + SYLLABLE_CLAP + TAP_SYLLABLE_COUNT for H02 ताली syllable-counting (no-मात्रा words, one clap per अक्षर, match count→numeral) — no existing module touched; r4k: ADDITIVE DECODE_TAP — the decode-tap reader for H04 L02 (tap each अक्षर of a no-मात्रा 2-letter word L→R to hear its sound, then a BLEND button merges them into the spoken word + reveals its picture; ordered tapping counters the letter-reversal misconception) — no existing module touched; r4l: ADDITIVE MEET_GENDER_PAIR — teaches पुल्लिंग→स्त्रीलिंग word-FORM change by doing (masculine noun → feminine noun with the ending change badged; tap each to hear) for H11 L03 लिंग-रूप games — no existing module touched; r4m: ADDITIVE STORY_READ_PAGE — picture-cue sentence reading (child taps words + reads the whole sentence, picture as support) for H04 चित्र-संकेत कहानी-पठन games — no existing module touched).
  try { window.SWIFTPAL_ENGINE = ENGINE_VERSION; } catch(e){}
const $ = id => document.getElementById(id);

/* ---------- 1. SCALE THE 1333x750 STAGE ---------- */
function fit(){
  const vw = (window.visualViewport ? window.visualViewport.width  : document.documentElement.clientWidth)  || window.innerWidth;
  const vh = (window.visualViewport ? window.visualViewport.height : document.documentElement.clientHeight) || window.innerHeight;
  // contain-fit, scaling UP to fill the screen (no 1× cap, no margin) so a 16:9
  // viewport is covered edge-to-edge. Any leftover bars on non-16:9 are blue, not white.
  const s = Math.min(vw/1333, vh/750);
  document.documentElement.style.setProperty("--scale", s);
}
window.addEventListener("resize", fit);
window.addEventListener("load", fit);
if(window.visualViewport) window.visualViewport.addEventListener("resize", fit);
fit();

/* ---------- 2. SIGNAL BUS + OFFLINE TELEMETRY ---------- */
/* TELEMETRY: offline self-capture. Every signal is buffered to localStorage so
   the run survives a reload / works with NO host app. A full results record can
   be pulled via SwiftPAL.downloadResults() (or the ?dev=1 button on the end
   screen). If `endpoint` is set AND the device is online, the final record is
   also POSTed — left null so the lesson is fully offline by default. */
const TELEMETRY = {
  endpoint: null,   // e.g. "https://lrs.example.com/swiftpal" — null = offline only
  storageKey: "swiftpal:run:" + CARD.skill_code + "_" + (CARD.part_label || "P1")
};
const SwiftPAL = window.SwiftPAL = {
  signals: [],
  validatorReport: { missing_signals: [], errors: [], passed: false },
  firedSet: new Set(),
  startedAt: Date.now(),
  emit(name, payload){
    const evt = Object.assign({
      ts: Date.now(),
      skill_code: CARD.skill_code,
      lo_code: CARD.lo_code,
      signal: name
    }, payload || {});
    this.signals.push(evt);
    this.firedSet.add(name);
    try{ console.log("[signal]", name, evt); }catch(e){}
    try{ window.parent?.postMessage({type:"swiftpal:signal", payload: evt}, "*"); }catch(e){}
    this.persist();
  },
  /* full results record (used for download / POST / end-of-lesson dump) */
  exportResults(){
    const ms = (typeof state!=="undefined") ? state.masteryAttempts : 0;
    const mh = (typeof state!=="undefined") ? state.masteryHits : 0;
    return {
      skill_code: CARD.skill_code, lo_code: CARD.lo_code, part: CARD.part_label || null,
      started_at: this.startedAt, exported_at: Date.now(),
      mastery: { hits: mh, attempts: ms, score: ms ? mh/ms : 0 },
      validatorReport: this.validatorReport,
      signals: this.signals
    };
  },
  /* silent: flush the running buffer to localStorage (survives reload / offline) */
  persist(){
    try{ localStorage.setItem(TELEMETRY.storageKey, JSON.stringify(this.exportResults())); }
    catch(e){ /* private mode / quota — non-fatal, postMessage + memory still work */ }
  },
  /* pull the run as a JSON file (teacher/dev; not in the child's flow) */
  downloadResults(){
    try{
      const blob = new Blob([JSON.stringify(this.exportResults(), null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = CARD.skill_code + "_" + (CARD.part_label||"P1") + "_results.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 1000);
    }catch(e){ console.error("[telemetry] download failed", e); }
  }
};

const GameBus = SwiftPAL;   /* [HI02H02] the reference engine names its signal bus GameBus */
/* ---------- 3. AUDIO ---------- */
let isPlaying=false, currentAudio=null, currentVoiceSource=null, _audioGen=0, _voStart=0;
/* [31x] ANDROID LOW-LATENCY VO — decode every short clip ONCE and replay it from memory.
   The tab plays over Wi-Fi from a LAN server; a per-play() fetch costs 200-500ms AT THE MOMENT the clip is
   needed, which lands as silence between words and reads as "the VO is slower on the tab". Buffers remove
   the network from the playback path completely. Device-passed on HI01H06_L01_S01, 2026-08-07. */
let _voiceAC=null;
/* [31z] play() PUBLISHES the length of what it is currently speaking, in ms, so a per-clip net can ask
   "how long is this clip?". THIS IS LOAD-BEARING: on the buffer path there is NO Audio element, so any
   existing net that reads `currentAudio.duration` gets null and falls back to its FLAT default — which
   silently re-breaks the very cut it was written to prevent. Caught on HIKGH02_L01_S03_P2, whose
   armClipNet() had already fixed a 4.52s clip against a 4500ms net; the buffer port regressed it.
   Any net you add MUST consult this, not the element. Null whenever nothing is speaking. */
let _curVoMs=null;
let _voCtx=null, _voCtxT0=0;   /* [HI02H02] Web Audio clip start (context clock) - read-along word sync */
const _voiceBuffers=new Map(), _voiceLoads=new Map();
let _audioWarmPromise=Promise.resolve(), _initialAudioWarmPromise=Promise.resolve();
function _voiceContext(){
  if(!_voiceAC){
    try{ _voiceAC=new (window.AudioContext||window.webkitAudioContext)({latencyHint:"interactive"}); }
    catch(e){ _voiceAC=null; }
  }
  return _voiceAC;
}
/* ALWAYS go through this, never _voiceContext(), on any path that is about to make sound: an interrupted
   Android context is `suspended`, and a suspended context accepts start() and plays NOTHING — no onended,
   so vo-lock never lifts. */
function _resumeVoiceAudio(){
  const c=_voiceContext();
  if(c && c.state==="suspended") try{ const p=c.resume(); if(p&&p.catch)p.catch(()=>{}); }catch(e){}
  return c;
}
/* [H11-77] A REPLACED CLIP MUST ACTUALLY REACH THE CHILD. Every clip lives at a fixed path -
   assets/VO/<id>.ogg - so re-recording one changes the FILE but not its URL, and a browser that
   already has the old bytes keeps playing them. That is not a theory: a corrected line was
   reported as still wrong three times running while the file on the server was, byte for byte,
   the corrected one. Hard-refreshing fixes it once, on one machine, for someone who knows to do
   it; a child on a tablet never will.
   AUDIO_BUILD changes whenever the game is rebuilt, so every clip URL changes with it and the
   browser has to fetch. It is added in the two places every clip passes through, rather than at
   the ~20 sites that spell out a path, so nothing can be missed. */
const AUDIO_BUILD = "20261012120000";
/* [H11-187] ASSET PRELOADER - every file the game uses is fetched ONCE, behind the loading bar,
   before the Play button can appear.
   - ONE DOWNLOAD PER FILE. The bar, the voice decoder, the picture warm-up and the gate / landing /
     end Swifty clips all ask AssetLoader.blob(url); a file already in flight is shared.
   - LOCAL ONCE LOADED. bustAudio() and bustArt() hand out a file's blob: URL as soon as it has
     arrived, so an <audio>, <video> or <img> made after that plays from memory, not the network.
   - SMALLEST FIRST, FIVE AT A TIME (the manifest is sorted by size), so the pictures land in the
     first seconds and nothing small waits behind a 1.5MB clip. Something the engine needs NOW
     (the landing greeting) jumps the queue simply by asking for it.
   - BYTE-ACCURATE BAR. Each body is read as a stream and every chunk counts; files are weighted
     by their real size on disk (the table below, written by _tools/asset_manifest.py - restamp.py
     refreshes it) and corrected by Content-Length when the server sends one. Never backwards.
   - NOTHING CAN BLOCK. A failed, refused, stalled (10s without a byte) or overlong (60s) transfer
     counts as done and the element just keeps the ordinary URL. On file://, where fetch() is
     refused, every file counts as done at once and the game loads exactly as it always did.
   Formats: WebM (VP9 + Opus) and WebP play in Chrome, Edge, Firefox and Safari (WebP 14+, WebM
   video 16.4+); WAV plays everywhere. Fetch streams + AbortController: every browser since 2019. */
var AssetLoader = (function(){
  const MANIFEST = /*@ASSET_MANIFEST*/[["assets/Audio/vo2_try_again.ogg",14933],["assets/Images/st_cry_center.webp",106000],["assets/SFX/sfx_tring_1.ogg",7733],["assets/SFX/sfx_tring_2.ogg",7646],["assets/SFX/sfx_tring_3.ogg",7455],["assets/SFX/sfx_tring_4.ogg",6796],["assets/SFX/sfx_tring_5.ogg",7540],["assets/SFX/sfx_tring_6.ogg",7366],["assets/SFX/sfx_tring_big.ogg",11039],["assets/Images/cover.webp",193254],["assets/UI/btn-next-arrow.svg",409],["assets/UI/btn-next-disabled-arrow.svg",418],["assets/UI/btn-next-disabled-pill.svg",589],["assets/swiftpal_buttons/btn-play-waiting.svg",607],["assets/UI/nudge_fx_ring_outer.svg",631],["assets/UI/nudge_fx_ring_inner.svg",648],["assets/swiftpal_buttons/btn-next-disabled.svg",673],["assets/UI/start_card.webp",1024],["assets/UI/btn-next-pill.svg",1269],["assets/swiftpal_buttons/btn-next.svg",1271],["assets/swiftpal_buttons/btn-finish.svg",1316],["assets/SFX/sfx_next.ogg",1412],["assets/SFX/sfx_tap.ogg",1599],["assets/UI/nudge_fx_sparks.svg",2340],["assets/UI/btn-play.svg",2692],["assets/swiftpal_buttons/btn-play-round.svg",2692],["assets/UI/btn-play-waiting.svg",2702],["assets/swiftpal_buttons/btn-play-round-waiting.svg",2702],["assets/SFX/sfx_play.ogg",3317],["assets/Audio/vo2_w_thokar.ogg",4034],["assets/Audio/vo2_w_hiran.ogg",4100],["assets/Audio/vo2_w_shor.ogg",4255],["assets/Audio/vo2_o_phir_se.ogg",4317],["assets/Audio/vo_o_opt_tokri.ogg",4322],["assets/Audio/vo2_w_chupchap.ogg",4563],["assets/Audio/vo2_w_kisan.ogg",4735],["assets/Audio/vo2_w_suraj.ogg",4767],["assets/Audio/vo2_o_jharna.ogg",4863],["assets/Audio/vo_o_t_bhookh.ogg",4950],["assets/Audio/vo2_w_sahlana.ogg",5022],["assets/Audio/vo2_w_jhadiyan.ogg",5143],["assets/Audio/vo2_w_koodna.ogg",5210],["assets/UI/nudge_tap.webp",5306],["assets/Audio/vo2_o_nahi_to.ogg",5415],["assets/Audio/vo2_w_nala.ogg",5495],["assets/Audio/vo2_shabaash.ogg",5622],["assets/Audio/vo_o_t_saheli.ogg",5689],["assets/Audio/vo2_w_bakri.ogg",5731],["assets/Audio/vo2_w_jhadi.ogg",5750],["assets/SFX/sfx_wrong.ogg",5882],["assets/Audio/vo2_w_badal.ogg",5979],["assets/Audio/vo2_w_basta.ogg",6030],["assets/SFX/sfx_whoosh.ogg",6120],["assets/Audio/vo2_o_gusse_se.ogg",6307],["assets/Audio/vo_pt_practice.ogg",6391],["assets/Audio/vo2_w_gilahri.ogg",6498],["assets/Audio/vo2_o_gir_jana.ogg",6594],["assets/UI/nudge_hand_new.svg",6873],["assets/Audio/vo2_o_ooncha_ped.ogg",6947],["assets/Audio/vo_o_t_takrana.ogg",7002],["assets/Audio/vo_o_t_kheencha.ogg",7448],["assets/Audio/vo2_o_chhalang.ogg",7769],["assets/UI/mascot.webp",8006],["assets/Audio/vo2_c_tez_awaaz.ogg",8128],["assets/Audio/vo2_c_kheti.ogg",8508],["assets/Audio/vo2_o_phir_rone.ogg",8538],["assets/Audio/vo2_c_bina_bole.ogg",8548],["assets/Audio/vo2_o_tez_bhagna.ogg",8576],["assets/SFX/sfx_correct.ogg",9207],["assets/Audio/vo2_st04.ogg",9962],["assets/Audio/vo2_o_chhote_paudhe.ogg",10077],["assets/Audio/vo2_c_haath_phera.ogg",10284],["assets/Audio/vo2_h_thokar.ogg",10656],["assets/SFX/sfx_burst.ogg",11035],["assets/Audio/vo2_c_paani.ogg",11165],["assets/Audio/vo2_h_shor.ogg",11249],["assets/Audio/vo2_o_zor_rone.ogg",11550],["assets/Audio/vo2_h_bakri.ogg",11551],["assets/Audio/vo2_h_basta.ogg",11621],["assets/Audio/vo2_h_koodna.ogg",11627],["assets/Audio/vo2_h_chupchap.ogg",11853],["assets/Audio/vo2_h_badal.ogg",11890],["assets/Audio/vo2_h_kisan.ogg",11926],["assets/Audio/vo2_h_jhadiyan.ogg",12080],["assets/Audio/vo2_h_suraj.ogg",12289],["assets/Audio/vo2_h_gilahri.ogg",12353],["assets/Audio/vo2_h_sahlana.ogg",12498],["assets/Audio/vo2_o_dheere_rone.ogg",12498],["assets/Audio/vo2_c_takrana.ogg",13383],["assets/Audio/vo2_c_kutar.ogg",13680],["assets/Audio/vo2_t7_q.ogg",13971],["assets/Audio/vo2_g3_q.ogg",14181],["assets/SFX/sfx_celebrate.ogg",14250],["assets/Audio/vo2_st01.ogg",14440],["assets/Audio/vo2_st03.ogg",14749],["assets/Audio/vo2_c_doodh.ogg",14826],["assets/Audio/vo2_g4_q.ogg",15145],["assets/Audio/vo2_g1_q.ogg",15227],["assets/Audio/vo2_c_dhoop.ogg",16377],["assets/Audio/vo2_celebrate.ogg",17087],["assets/Audio/vo2_g5_q.ogg",17090],["assets/UI/audio.webp",17132],["assets/UI/hint.webp",17670],["assets/UI/start_mascot.webp",18020],["assets/Audio/vo2_g2_h3.ogg",18691],["assets/Audio/vo_pt_guided.ogg",18726],["assets/Audio/vo2_c_kitaben.ogg",19146],["assets/Audio/vo2_st11.ogg",19315],["assets/UI/start_bg.webp",19840],["assets/Audio/vo2_st06.ogg",19940],["assets/Audio/vo2_mic_read.ogg",22455],["assets/Audio/vo2_st09.ogg",23026],["assets/Audio/vo2_st07.ogg",23837],["assets/Images/opt_tokri.webp",23902],["assets/Audio/vo2_st05.ogg",23915],["assets/UI/sw_explain_still.webp",24366],["assets/UI/startnew_bg_plain.webp",24446],["assets/Audio/vo2_st08.ogg",25474],["assets/Audio/vo2_g2_h1.ogg",25746],["assets/Images/last_swifty_still.webp",26456],["assets/Audio/vo2_g4_h3.ogg",26698],["assets/Audio/vo2_g2_q.ogg",27711],["assets/Audio/vo2_g1_h3.ogg",29875],["assets/Audio/vo2_st02.ogg",30396],["assets/Audio/vo2_g1_h1.ogg",31049],["assets/UI/vo_button.webp",31892],["assets/UI/sw_head_neutral.webp",31940],["assets/Audio/vo2_g3_h3.ogg",32420],["assets/Audio/vo2_pt_tutorial.ogg",32850],["assets/Audio/vo2_t8_q.ogg",34870],["assets/Audio/vo2_st10.ogg",35146],["assets/Audio/vo2_g5_h3.ogg",36671],["assets/UI/sw_head_hint.webp",36812],["assets/UI/sw_head_talking.webp",37384],["assets/Audio/vo2_t8_read.ogg",37880],["assets/Audio/vo2_ws1_q.ogg",40435],["assets/UI/sw_head_celebrate.webp",41998],["assets/Audio/vo2_landing.ogg",42172],["assets/Audio/vo2_t7_end.ogg",44821],["assets/Audio/vo2_ws2_q.ogg",47189],["assets/UI/sw_head_tryagain.webp",48836],["assets/UI/end_screen.webp",50224],["assets/UI/startnew_bg.webp",52978],["assets/Audio/vo2_t7_type.ogg",56021],["assets/Audio/vo2_t7_ans.ogg",62497],["assets/UI/hint_active.webp",62642],["assets/UI/start_btn.webp",65092],["assets/UI/sw_lg_talking.webp",69960],["assets/UI/sw_lg_hint.webp",72584],["assets/UI/sw_lg_celebrating.webp",79680],["assets/Audio/vo2_t8_ans.ogg",82125],["assets/Images/st_cry.webp",88818],["assets/Images/st_ahead.webp",90326],["assets/Images/st_hans.webp",102828],["assets/Images/st_thokar.webp",105844],["assets/Images/st_cry_alone.webp",106676],["assets/UI/sw_lg_tryagain.webp",110656],["assets/Images/st_bandar.webp",114896],["assets/Images/st_maa.webp",115290],["assets/Images/st_bhalu.webp",115490],["assets/Images/st_run.webp",119698],["assets/Images/st_bola.webp",135808],["assets/Images/st_jhadi.webp",140506],["assets/Images/st_nala.webp",156254],["assets/SFX/bgm_mela.ogg",171495],["assets/UI/loader.webp",178248],["assets/UI/sw_explain_talk.webp",369026],["assets/UI/sw_head_celebrate_anim.webp",390546],["assets/UI/sw_head_tryagain_anim.webp",429222],["assets/UI/sw_lg_celebrating_anim.webp",430844],["assets/UI/sw_head_hint_anim.webp",435706],["assets/UI/cel_talk.webp",650742],["assets/UI/cel_idle.webp",651146],["assets/UI/cel_shabaash.webp",684852],["assets/UI/sw_lg_hint_anim.webp",878778],["assets/UI/new_landing_swiftee_anim.webp",1160630],["assets/UI/swiftee_transition.webp",1500554],["assets/UI/peeking_talk_up.webp",1561680],["assets/peeking_talk_up.webp",1561680],["assets/Images/last_swifty_end.webp",1779506]]/*@END_ASSET_MANIFEST*/;
  const HTTP = /^https?:$/.test(location.protocol) && !!window.fetch;
  const STALL_MS = 10000, HARD_MS = 60000, WORKERS = 5;
  const BASE = (function(){ try{ return new URL(".", location.href).href; }catch(e){ return ""; } })();
  const key = u => {
    let s = String(u || "");
    if(/^https?:/.test(s) && BASE && s.indexOf(BASE) === 0) s = s.slice(BASE.length);
    s = s.split("#")[0].split("?")[0].replace(/^\.?\//, "");
    try{ s = decodeURIComponent(s); }catch(e){}
    return s;
  };
  const urlOf = p => p + "?v=" + AUDIO_BUILD;        // the exact URL every other request for it uses
  const expect = new Map(), got = new Map(), jobs = new Map(), blobUrl = new Map(), origOf = new Map(), blobs = new Map(), freshUrl = new Map(), ctls = new Map();
  const listeners = [];
  let total = 0, recv = 0, finished = 0, shown = -1, readyRes = null;
  MANIFEST.forEach(r => { expect.set(r[0], r[1]); got.set(r[0], 0); total += r[1]; });
  const ready = new Promise(r => { readyRes = r; });
  const api = {};
  function emit(){
    const all = finished >= MANIFEST.length;
    const pct = all ? 100 : Math.min(99, Math.floor(100 * recv / Math.max(1, total)));
    if(pct > shown){ shown = pct; listeners.forEach(f => { try{ f(pct); }catch(e){} }); }
    if(all && !api.isReady){ api.isReady = true; readyRes(); }
  }
  function add(p, n){ if(!expect.has(p)) return; got.set(p, got.get(p) + n); recv += n; emit(); }
  function settle(p){
    if(!expect.has(p)) return;
    const short = expect.get(p) - got.get(p);
    if(short > 0){ recv += short; got.set(p, expect.get(p)); }
    finished++; emit();
  }
  async function download(p){
    if(!HTTP) return null;
    const ctl = window.AbortController ? new AbortController() : null;
    if(ctl) ctls.set(p, ctl);
    let stall = 0;
    const arm = () => { clearTimeout(stall); if(ctl) stall = setTimeout(() => ctl.abort(), STALL_MS); };
    const hard = ctl ? setTimeout(() => ctl.abort(), HARD_MS) : 0;
    try{
      arm();
      const r = await fetch(urlOf(p), { cache: "force-cache", signal: ctl ? ctl.signal : undefined });
      if(!r.ok) return null;
      const len = +r.headers.get("content-length") || 0;
      if(len && expect.has(p) && !r.headers.get("content-encoding") && len !== expect.get(p)){
        total += len - expect.get(p); expect.set(p, len);
      }
      const type = r.headers.get("content-type") || "";
      if(!r.body || !r.body.getReader){ const b = await r.blob(); add(p, b.size); return b; }
      const rd = r.body.getReader(), parts = [];
      for(;;){
        const c = await rd.read();
        if(c.done) break;
        parts.push(c.value); add(p, c.value.byteLength); arm();
      }
      return new Blob(parts, { type: type });
    }catch(e){ return null; }
    finally{ clearTimeout(stall); clearTimeout(hard); }
  }
  function blob(u){
    if(/^(blob|data):/.test(String(u || ""))) return Promise.resolve(null);
    const p = key(u);
    if(!p) return Promise.resolve(null);
    if(!jobs.has(p)) jobs.set(p, download(p).then(b => {
      if(b){ const bu = URL.createObjectURL(b); blobUrl.set(p, bu); origOf.set(bu, urlOf(p)); blobs.set(p, b); }
      settle(p); return b;
    }));
    return jobs.get(p);
  }
  /* [H11-216] ON A TABLET THE PICTURE ON SCREEN COMES FIRST. Reported: assets rendering very late on a
     tablet. Measured at 5 Mbps / 4x CPU: the poem clips started 1-4s after their slide, because the
     queue went smallest-file-first (so every video sat at the very end) and five background downloads
     shared the line with whatever the slide was loading right then - sometimes the same file twice.
     Now: (1) the queue is ordered by FIRST USE - prioritize() with the game's own order at boot and
     the current + next two slides' files at every mount; (2) a file the slide is loading itself is
     released - the preloader drops it, or aborts it if it is mid-download - so it arrives once;
     (3) while a slide's own pictures/clip are still loading, the background waits (foreground(),
     6s cap per element) so they get the whole line. */
  const queue = MANIFEST.map(r => r[0]);
  let fg = 0;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function start(){
    const worker = async () => {
      for(;;){
        let waited = 0;
        while(fg > 0 && waited < 6000){ await sleep(150); waited += 150; }
        const p = queue.shift();
        if(p === undefined) return;
        if(jobs.has(p)) continue;
        await blob(p);
      }
    };
    for(let w = 0; w < WORKERS; w++) worker();
    emit();
    return ready;
  }
  api.prioritize = urls => {
    const want = []; (urls || []).forEach(u => { const k = key(u); if(k && !jobs.has(k) && want.indexOf(k) < 0 && queue.indexOf(k) >= 0) want.push(k); });
    if(!want.length) return;
    for(let n = queue.length - 1; n >= 0; n--) if(want.indexOf(queue[n]) >= 0) queue.splice(n, 1);
    queue.unshift.apply(queue, want);
  };
  api.release = u => {
    const k = key(u); if(!k || blobUrl.has(k)) return;
    const qi = queue.indexOf(k); if(qi >= 0) queue.splice(qi, 1);
    if(!jobs.has(k)){ jobs.set(k, Promise.resolve(null)); settle(k); }
    else { const c = ctls.get(k); if(c) try{ c.abort(); }catch(e){} }
  };
  api.foreground = (el, events) => {
    if(!el) return; fg++; let done = false;
    const end = () => { if(done) return; done = true; fg = Math.max(0, fg - 1); };
    (events || ["load", "error"]).forEach(ev => el.addEventListener(ev, end, { once: true }));
    setTimeout(end, 6000);
  };
  api.isReady = false;
  api.ready = ready;
  api.key = key;
  api.blob = blob;
  api.start = start;
  api.resolve = u => { const s = String(u || ""); return /^(blob|data):/.test(s) ? s : (blobUrl.get(key(s)) || null); };
  api.original = bu => origOf.get(bu) || null;
  /* a NEW blob: URL of a loaded file - what restarts a play-once animated image without a download */
  api.fresh = u => { const p = key(u), b = blobs.get(p); if(!b) return null;
    const old = freshUrl.get(p); if(old) setTimeout(() => URL.revokeObjectURL(old), 2000);
    const nu = URL.createObjectURL(b); freshUrl.set(p, nu); origOf.set(nu, urlOf(p)); return nu; };
  api.onProgress = f => { listeners.push(f); if(shown >= 0) try{ f(shown); }catch(e){} };
  api.list = () => MANIFEST.map(r => r[0]);
  api.stats = () => ({ files: MANIFEST.length, finished: finished, total: total, recv: recv, shown: shown, local: blobUrl.size });
  return api;
})();
/* [H11-187] A BLOB THAT WILL NOT PLAY FALLS BACK TO THE FILE - once. Any <img>/<video>/<audio>
   whose blob: source errors is pointed back at the ordinary URL (and a video or a sounding clip is
   restarted), before the element's own error handler can treat the file as missing. Elements in
   the page are caught here, in the capture phase; detached Audio objects by the wrapper below. */
document.addEventListener("error", function(e){
  const el = e.target;
  if(!el || !/^(IMG|VIDEO|AUDIO)$/.test(el.tagName || "")) return;
  const s = el.currentSrc || el.src || "";
  const o = s.indexOf("blob:") === 0 && AssetLoader.original(s);
  if(!o || el.__blobFellBack) return;
  el.__blobFellBack = true; e.stopImmediatePropagation();
  el.src = o;
  if(el.tagName !== "IMG"){ try{ el.load(); const p = el.play(); if(p && p.catch) p.catch(()=>{}); }catch(_){} }
}, true);
(function(){
  const A = window.Audio; if(!A) return;
  function GuardedAudio(src){
    const a = arguments.length ? new A(src) : new A();
    a.addEventListener("error", function(e){
      const s = a.currentSrc || a.src || "";
      const o = s.indexOf("blob:") === 0 && AssetLoader.original(s);
      if(!o || a.__blobFellBack) return;
      a.__blobFellBack = true; e.stopImmediatePropagation();
      const wasPlaying = !a.paused;
      a.src = o;
      try{ a.load(); if(wasPlaying){ const p = a.play(); if(p && p.catch) p.catch(()=>{}); } }catch(_){}
    });
    return a;
  }
  GuardedAudio.prototype = A.prototype;
  window.Audio = GuardedAudio;
})();
function bustAudio(u){
  if(!u || u.indexOf("data:") === 0 || u.indexOf("blob:") === 0) return u;
  const b = AssetLoader && AssetLoader.resolve(u); if(b) return b;   /* [H11-187] the local copy, once it is in */
  return u.indexOf("?") >= 0 ? u : (u + "?v=" + AUDIO_BUILD);
}
/* [H11-79] PICTURES GO STALE TOO. The audio fix above left images and SVGs out, and the same
   thing promptly happened to them: a redrawn button was reported as unchanged three times while
   the file on disk was the new one - the browser was answering from its own copy of a path that
   had not changed. Everything the page loads by URL now carries the same build token.
   Done once, over the whole document, AFTER it is built rather than at each of the places a src
   is written: <img> and CSS background-image are set in dozens of spots and a sweep cannot miss
   one. It re-runs on every slide, because each mount writes fresh markup. */
function bustArt(root){
  try{
    (root || document).querySelectorAll("img[src]").forEach(function(im){
      var s = im.getAttribute("src");
      if(!s || s.indexOf("data:") === 0 || s.indexOf("blob:") === 0) return;
      /* [H11-187] a picture still loading takes the preloaded copy; one already on screen is left
         alone (it is in memory, and swapping an animated one would restart it) */
      var b = AssetLoader && AssetLoader.resolve(s);
      if(b && !im.complete){ im.setAttribute("src", b); return; }
      if(s.indexOf("?") < 0) im.setAttribute("src", s + "?v=" + AUDIO_BUILD);
    });
  }catch(e){}
}
function _loadVoiceBuffer(src){
  /* [H11-187] keyed by FILE, not by URL form: before the bar fills a clip is asked for by its ?v=
     URL, after it by its blob: URL - both are the same buffer */
  const orig = src, k = (src && AssetLoader) ? AssetLoader.key(src) : src;
  src = bustAudio(src);
  if(!src) return Promise.reject(new Error("missing audio source"));
  if(_voiceBuffers.has(k)) return Promise.resolve(_voiceBuffers.get(k));
  if(_voiceLoads.has(k)) return _voiceLoads.get(k);
  const p=(async()=>{
    const c=_voiceContext();
    if(!c||!window.fetch) throw new Error("Web Audio unavailable");
    /* [33b] DO NOT fetch() on file://. Chrome blocks it outright ("from origin 'null' ... blocked by CORS
       policy"), and it logs TWO red console lines per clip — a CORS error plus a net::ERR_FAILED GET. On a
       60-clip game that is a wall of red, and a reviewer who double-clicks the HTML sees it and reasonably
       concludes the game is broken. It is not: every caller already falls back to an HTML <audio> element,
       which file:// permits (media elements are not subject to this restriction), so sound still plays.
       QA hit exactly this on 2026-08-10 from C:\\Users\\ConveGenius\\Downloads\\...
       Throwing HERE routes to that same fallback one step earlier and Chrome logs nothing.
       NOTHING IS LOST: fetch() could never have succeeded on file://, so the Web Audio buffer path was
       already unreachable there. Behaviour on http/https — the real host, and any WebView served over
       http — is completely unchanged, which is what keeps the device-passed [31x] path intact. */
    if(location.protocol === "file:") throw new Error("file:// — fetch is CORS-blocked, using element path");
    const bl=await AssetLoader.blob(orig);   /* [H11-187] the preloader's bytes, or its one shared download */
    if(!bl) throw new Error("audio fetch failed: "+orig);
    const b=await c.decodeAudioData(await bl.arrayBuffer());
    _voiceBuffers.set(k,b); return b;
  })();
  _voiceLoads.set(k,p);
  p.catch(()=>{}).finally(()=>_voiceLoads.delete(k));
  return p;
}
let isMuted = false;
/* [H11-15] THE SCENE DUCKS UNDER THE SPOKEN LINE.
   The poem clips (T2-T9) carry their own ambience track. That was fine while vo_poem_* did not
   exist - the comment on the <video> block still says the scene would otherwise be silent - but
   with the narration recorded the two now compete, and the ambience wins because the video plays
   at volume 1 while the VO sits at 0.7. Ducking to 15% puts roughly 16dB between them, which is
   what speech needs to stay intelligible over a bed.

   TWO PATHS, because one does not cover the devices this ships to:
     - volume ramp. Works on Android and desktop. Ramped over 260ms rather than snapped: an
       instant drop on every clip start reads as a glitch, not as mixing.
     - mute fallback. iOS/iPadOS makes HTMLMediaElement.volume READ-ONLY - the assignment is
       silently ignored, so on an iPad the ramp alone would leave the ambience at full volume and
       the narration buried. We read the value back; if it did not take, we mute instead. Harsher
       than a duck, but the child hearing the line is the point.
   _voMutedByUs is tracked separately so we never UNMUTE a video that was already muted - the
   loadeddata handler above mutes it deliberately when autoplay-with-sound is refused, and undoing
   that would turn sound on mid-poem on exactly the devices that refused it. */
/* [H11-209] deeper duck, asked for again from a tablet ("VO aaye tab music aur video ki awaaz kam ho"):
   at 0.15 the fair's crowd in the poem clips still competed with the line on a small speaker. 0.06 is
   ~24dB under, against the VO's 0.7 - the scene stays audible, the words are clearly on top. */
const VO_DUCK = 0.06;
function _voRampVol(v, to, ms){
  try{
    if(v._voRamp){ clearInterval(v._voRamp); v._voRamp = null; }
    const from = v.volume;
    if(Math.abs(to - from) < 0.02){ v.volume = to; return; }
    const t0 = Date.now();
    v._voRamp = setInterval(function(){
      const k = Math.min(1, (Date.now() - t0) / ms);
      try{ v.volume = from + (to - from) * k; }catch(e){}
      if(k >= 1){ clearInterval(v._voRamp); v._voRamp = null; }
    }, 30);
  }catch(e){}
}
function _duckScene(on){
  let vids; try{ vids = document.querySelectorAll("video"); }catch(e){ return; }
  (vids || []).forEach(function(v){
    try{
      /* [H11-213] a clip routed through Web Audio is ducked on its gain - works on every browser */
      if(v._gain){ const c = v._gain.context; v._voDucked = !!on;
        v._gain.gain.cancelScheduledValues(c.currentTime);
        if(on && (v.paused || v.currentTime < 0.35)) v._gain.gain.setValueAtTime(VO_DUCK, c.currentTime);   // not started: at once
        else v._gain.gain.setTargetAtTime(on ? VO_DUCK : 1, c.currentTime, 0.08); return; }
      if(on){
        if(v._voDucked) return;
        v._voDucked = true;
        const _full = (typeof v.volume === "number" && v.volume > 0) ? v.volume : 1;
        v._voFull = _full;
        /* Probe whether this platform honours the volume setter AT ALL before choosing a path.
           Done as a half-volume write that is immediately undone, both inside one synchronous
           block, so nothing is audible: on Android/desktop it sticks and we take the ramp, on
           iOS the assignment is ignored, v.volume reads back as _full, and we mute instead.
           Probing matters - reading the ducked value back would report success on every
           platform if we had already snapped the volume down to test it, which also threw
           away the ramp this function exists to provide. */
        const _probe = _full * 0.5;
        v.volume = _probe;
        const _settable = Math.abs(v.volume - _probe) < 0.01;
        v.volume = _full;
        if(!_settable){ if(!v.muted){ v.muted = true; v._voMutedByUs = true; } }
        /* [H11-209] a clip that has not started yet (or just has) is set down at once - a ramp from
           full volume would be heard as a burst of crowd over the first word */
        else if(v.paused || v.currentTime < 0.35){ try{ v.volume = _full * VO_DUCK; }catch(e){} }
        else _voRampVol(v, _full * VO_DUCK, 260);
      } else {
        if(!v._voDucked) return;
        v._voDucked = false;
        if(v._voMutedByUs){ v.muted = false; v._voMutedByUs = false; try{ v.volume = v._voFull; }catch(e){} }
        else _voRampVol(v, (v._voFull == null ? 1 : v._voFull), 260);
      }
    }catch(e){}
  });
}
function setPlaying(on){
  // the dynamic Swiftie sits header-left; the audio chips pulse to signal playback. r4/F1: share the
  // .playing toggle across the header chip AND the tut-card replay chip (the header is hidden in the
  // tut frame, so the in-card .tut-audio is the only visible affordance and must react to VO too).
  isPlaying=on;
  if(on) _voStart = Date.now();   // drag VO-gate 4s safety: stamp when a VO began so a stalled clip can't soft-lock the tiles
  document.querySelectorAll(".audio-chip, .tut-audio, .sg-vo").forEach(c => c.classList.toggle("playing", on && !isMuted));
  /* [30g] VO LOCK — UNTAPPABLE, ZERO VISUAL. Yasir 2026-07-30: "cards untappable when VO being
     played, you dont need to show any affect for untappable, just make it untappable."
     28u bundled a lock (pointer-events:none) with a pale board (opacity:.55). 30f removed BOTH, which
     went too far — nothing was untappable any more. The class is back; its CSS now carries only
     pointer-events. Never re-add opacity/filter under it: a "wait" cue, if ever wanted, belongs on the
     single card the child touched.
     Driven off setPlaying and NOT a timer, deliberately: this is the one function every playback exit
     passes through (stopAudio, and fire() for natural end / supersede / cancelled TTS / missing-file
     fallback), so the lock can never outlive the audio and leave a slide permanently dead.
     Toggled on `on` alone, NOT `on && !isMuted` like the chips above: the tap gate keys off isPlaying
     regardless of mute, so gating this on mute would let taps land while muted and diverge from it. */
  document.body.classList.toggle("vo-lock", !!on);
  _duckScene(!!on);   /* [H11-15] scene ambience steps back while the line speaks */
  if(typeof bgmUpdate === "function") bgmUpdate();   /* [H11-133] and so does the music */
}
/* stopAudio(): hard-stop the current clip AND bump the playback generation so any in-flight
   callback (a chain's onended, a fallback timer, a cancelled TTS onend) becomes a no-op. This is
   what prevents the "voice echo": a stale callback from an earlier tap/slide can no longer fire a
   NEW clip on top of the current one, or resume onto the next screen. */
function stopAudio(){
  _audioGen++;
  if(currentVoiceSource){
    try{ currentVoiceSource.onended=null; currentVoiceSource.stop(); currentVoiceSource.disconnect(); }catch(e){}
    currentVoiceSource=null;
  }
  if(currentAudio){ try{ currentAudio.onended=null; currentAudio.onerror=null; currentAudio.pause(); }catch(e){} currentAudio=null; }
  try{ if(window.speechSynthesis) speechSynthesis.cancel(); }catch(e){}   // [20a] also stop the TTS placeholder
  setPlaying(false);
}

function play(src, onEnd){
  stopAudio(); setPlaying(true);
  const myGen=_audioGen;
  let done=false; const fire=()=>{ if(done || myGen!==_audioGen)return; done=true; currentVoiceSource=null; currentAudio=null; _curVoMs=null; setPlaying(false); if(onEnd) onEnd(); };
  if(src){
    /* [31u] trim window if this game has a VO_TRIM map; games without one play the clip whole. */
    const _tw = (typeof _trimFor === "function") ? _trimFor(src) : null;
    /* The pre-[31x] element path, kept verbatim as the fallback for EVERY failure: no Web Audio, fetch or
       decode error, start() throw. Failure mode = today's behaviour, never worse, and never TTS. */
    const htmlFallback=()=>{
      if(myGen!==_audioGen)return;
      const a=new Audio(bustAudio(src)); currentAudio=a; a.preload="auto";
      a.playbackRate = 1.0;   // natural recorded pace — any pep-up factor makes HUMAN VO too fast (Yasir 2026-07-24)
      if(_tw){
        a.addEventListener("loadedmetadata",()=>{ try{ if(isFinite(a.duration)&&_tw[0]<a.duration)a.currentTime=_tw[0]; }catch(e){} });
        a.addEventListener("timeupdate",()=>{ if(a.currentTime>=_tw[1]){ try{a.pause();}catch(e){} fire(); } });
      }
      let handled=false;
      const onFail=()=>{ if(handled||myGen!==_audioGen)return; handled=true; currentAudio=null; setTimeout(fire,1200); }; /* [30o] silent beat — never a synthetic voice (Yasir) */
      a.onended=fire; a.onerror=onFail;
      /* [H11-188] WATCHDOG for the element path: the clip's length + 3s after its metadata arrives,
         then it ends the line if the element has stopped moving without saying so; and a clip that
         never even reports metadata in 10s is treated as missing (the same silent beat). */
      let _wdT = -1;
      const _wd = ()=>{ if(handled || done || myGen !== _audioGen) return;
        if(a.ended || (!a.paused && a.currentTime === _wdT)){ fire(); return; }
        _wdT = a.currentTime; setTimeout(_wd, 2000); };
      a.addEventListener("loadedmetadata", ()=>{ setTimeout(_wd, (isFinite(a.duration) ? a.duration * 1000 : 0) + 3000); });
      setTimeout(()=>{ if(!done && myGen === _audioGen && a.readyState === 0) onFail(); }, 10000);
      /* [30n] AN AUTOPLAY REFUSAL IS NOT A MISSING FILE. NotAllowedError/AbortError fire on every load
         before the child's first gesture; treating them as a load failure is what made a game with perfect
         human VO speak the OS voice on the landing. fire() here is NOT optional — play() already ran
         setPlaying(true), so returning without it strands body.vo-lock and the screen goes untappable. */
      a.play().catch(err=>{
        const nm=err&&err.name;
        if(nm==="NotAllowedError"||nm==="AbortError"){
          if(handled||myGen!==_audioGen)return; handled=true; currentAudio=null; fire(); return;
        }
        onFail();
      });
    };
    _loadVoiceBuffer(src).then(buffer=>{
      if(myGen!==_audioGen)return;                 // superseded while decoding
      const c=_resumeVoiceAudio(); if(!c){htmlFallback();return;}  /* resume, NOT _voiceContext(): a suspended
         context queues the clip SILENTLY with vo-lock held — no sound, no onended, screen soft-locked. */
      const source=c.createBufferSource(); source.buffer=buffer; source.connect(c.destination);
      source.onended=fire; currentVoiceSource=source;
      _curVoMs = (_tw ? Math.max(0, Math.min(_tw[1],buffer.duration) - Math.max(0,Math.min(_tw[0],buffer.duration))) : buffer.duration) * 1000;
      try{
        if(_tw){
          const start=Math.max(0,Math.min(_tw[0],buffer.duration));
          const dur=Math.max(0.01,Math.min(_tw[1],buffer.duration)-start);
          source.start(0,start,dur);
        }else source.start(0);
        _voCtx = c; _voCtxT0 = c.currentTime;
        /* [H11-188] WATCHDOG. onended is the reveal path and the html fallback is the error path; this
           is the third. It reads the AUDIO clock, not the wall clock: on a suspended context (sound
           refused, Android interruption) the clip is not playing, so it is not overdue either - the
           check simply waits. A clip whose time has run out without onended is ended here. */
        const _endAt = c.currentTime + (_curVoMs || 0) / 1000;
        const _wd = ()=>{ if(done || myGen !== _audioGen) return;
          if(c.state === "running" && c.currentTime >= _endAt + 0.5){ try{ source.onended = null; source.stop(); }catch(_){} fire(); }
          else setTimeout(_wd, Math.max(600, (_endAt - c.currentTime) * 1000 + 2500)); };
        setTimeout(_wd, (_curVoMs || 0) + 3000);
      }catch(e){ try{source.disconnect();}catch(_){} currentVoiceSource=null; htmlFallback(); }
    }).catch(htmlFallback);
  } else { setTimeout(fire, 800); }   // [30o] no src: silent beat, never TTS
}
/* voProgress(): 0..1 through the voice clip now speaking (Web Audio or the <audio> fallback); -1 before it starts. */
function voProgress(){
  if(typeof currentVoiceSource !== "undefined" && currentVoiceSource && typeof _voCtx !== "undefined" && _voCtx && _curVoMs) return Math.min(1, Math.max(0, (_voCtx.currentTime - _voCtxT0) * 1000 / _curVoMs));
  const a = currentAudio; if(a && a.duration > 0 && !a.paused) return a.currentTime / a.duration;
  return -1;
}
/* readAlong(words, voText, src, onEnd): play src and light each word span (.on) when the voice reaches it - the word's
   character offset in the spoken text over the clip's progress. Stops (and clears) as soon as another line takes over. */
function readAlong(words, voText, src, onEnd, onWord){
  voText = String(voText || "");
  const starts = (()=>{ let from = 0; return words.map(w=>{ const t = w.textContent, at = voText.indexOf(t, from);
    const pos = at < 0 ? from : at; from = pos + t.length; return pos / Math.max(1, voText.length); }); })();
  let cur = -2;   // onWord(i) hears every change of the lit word (-1 = none)
  const lit = (i)=>{ words.forEach((w, k)=> w.classList.toggle("on", k === i));
    if(i !== cur){ cur = i; if(onWord) try{ onWord(i, words[i] || null); }catch(_){} } };
  let fin = false;
  play(src, ()=>{ fin = true; lit(-1); if(onEnd) onEnd(); });
  const gen = _audioGen;
  (function sync(){ if(fin || gen !== _audioGen){ lit(-1); return; }
    const p = voProgress();
    if(p >= 0){ let i = -1; starts.forEach((s, k)=>{ if(p >= s - 0.01) i = k; }); lit(i); }
    requestAnimationFrame(sync); })();
}
/* playSfx(id): fire-and-forget sound effect on its OWN Audio element so it can
   overlap the spoken VO (does NOT touch currentAudio / the play() chain).
   Silently no-ops if the file is missing or playback is blocked. */
function playSfx(id, onEnd){
  /* [34v] onEnd is OPTIONAL and NEW — ported from HI01H04_L03_S05, where it was added on 2026-09-01
     so CELEBRATION could stop overlapping the jingle with the spoken line (SME: "celebration sound me
     2 sounds mix ho rhe hain"). Omitting the argument keeps the original fire-and-forget behaviour, so
     every other call site is unchanged. onEnd fires on EVERY path — ended, fallback ended, blocked
     play(), and the catch — so a missing or blocked sfx can never swallow a VO sequenced off it. */
  if(!id){ if(onEnd) onEnd(); return; }
  /* [H11-188] onEnd fires exactly once, and a watchdog makes sure it fires: the clip's own length +
     2s once that is known, 15s at the very most - a VO sequenced off a jingle can never wait forever */
  if(onEnd){ const _o = onEnd; let _f = false; onEnd = ()=>{ if(_f) return; _f = true; _o(); }; setTimeout(onEnd, 15000); }
  const src=audioDir(id)+id+"."+AUDIO_EXT;   /* [H11-50] playSfx also takes sfx_ ids */
  /* [H11-161] mark it, so the kit's cue() (the star burst asks for the same jingle in the same
     tick) sees it is already sounding - two copies of one clip at once play twice as loud */
  try{ (window.__sfxLast = window.__sfxLast || {})[id] = Date.now(); }catch(e){}
  _loadVoiceBuffer(src).then(buffer=>{
    /* [34w] NEVER START ON A SUSPENDED CONTEXT. resume() is async and pre-gesture the browser will
       not resume at all, so a source started here is queued SILENTLY and `onended` never fires —
       which, once CELEBRATION chains its VO off onEnd, means the celebration NEVER SPEAKS. Measured
       in a real browser on HI01H06_L01_S02: mounted CEL, ctx suspended at mount, voice still silent
       10s later. Throwing sends us to the element fallback below, which does surface a blocked
       play() and calls onEnd. Same guard as play()'s [34s]. */
    const c=_resumeVoiceAudio();
    if(!c || c.state!=="running") throw new Error("Web Audio not running");
    const source=c.createBufferSource(),gain=c.createGain();
    source.buffer=buffer; gain.gain.value=0.7; source.connect(gain).connect(c.destination);
    if(onEnd){ source.onended=onEnd; setTimeout(onEnd, buffer.duration * 1000 + 2000); }
    source.start(0);
  }).catch(()=>{
    try{
      const a=new Audio(bustAudio(src)); a.volume=0.7;
      if(onEnd){ a.onended=onEnd; a.onerror=onEnd;
        a.addEventListener("loadedmetadata", ()=>{ if(isFinite(a.duration)) setTimeout(onEnd, a.duration * 1000 + 2000); }); }
      a.play().catch(()=>{ if(onEnd) onEnd(); });
    }catch(e){ if(onEnd) onEnd(); }
  });
}
/* ---------- game-feel: procedural SFX (no audio files) + success particle burst ----------
   WebAudio resumes on the first user tap (autoplay policy), so taps/answers always sound. */
let _juiceAC = null;
function _ac(){ _juiceAC=_resumeVoiceAudio(); return _juiceAC; }   // [31x] one context for VO + procedural SFX
function _tone(freqs, type, dur, vol){ const c = _ac(); if(!c) return; const t0 = c.currentTime;
  freqs.forEach((f, i)=>{ const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
    const t = t0 + i*(dur/freqs.length); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur/freqs.length); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur/freqs.length); }); }
/* [H11-133] the tap is a recorded wooden "tok" now (sfx_tap.ogg); the tone stays as the fallback */
const sfxTap       = ()=> { if(!_sfxFile("sfx_tap")) _tone([520], "sine", 0.09, 0.09); };
/* [H11-5] REAL RECORDINGS replace the synthesised correct/wrong cues (FLN Animation Kit
   recipe 22). _sfxFile() plays the file and reports whether it could START one; the old tone
   stays as the fallback ONLY for a genuinely missing file, so an asset-pruned dist degrades to
   the previous behaviour instead of going mute. Volume matches playSfx (0.7) so the cue sits
   under the VO rather than over it. */
/* [H11-50] VOICE AND EFFECTS LIVE IN SEPARATE FOLDERS NOW: assets/VO and assets/SFX.
   They are commissioned, reviewed and replaced on completely different cycles - a whole
   voice batch gets dropped in at once, the four effects almost never change - and keeping
   them in one folder meant every VO sweep had to tiptoe around four files that were not
   part of it.
   audioDir() decides from the id's own prefix, in ONE place, so a new sfx_ id lands in SFX
   and a new vo_ id in VO with nothing else to edit and no call site left behind. */
function audioDir(id){ return String(id).indexOf("sfx_") === 0 ? "assets/SFX/" : "assets/Audio/"; }   /* [HI02H02] voice lines live in assets/Audio */
/* [H11-133] BACKGROUND MUSIC - a small मेला tune (bgm_mela.ogg, made by _tools/make_audio.py).
   It is a BED, not a feature, so every rule below keeps it out of the way:
     - it starts on the शुरू करें tap (the first gesture, so autoplay cannot refuse it)
     - it sits at BGM_VOL and DUCKS to BGM_DUCK whenever a line is spoken - hooked into
       setPlaying, the one function every VO start and stop passes through
     - it also ducks while a poem video is on screen, because those clips carry their own sound
     - it stops for the celebration, which has its own jingle and its own clip
     - it pauses when the tab is hidden and follows the mute toggle.
   A plain <audio> element rather than Web Audio: it loops, and it works from file:// as well. */
const BGM_VOL = 0.14, BGM_DUCK = 0.02;   /* [H11-209] music under a line: 0.04 -> 0.02 */
let _bgm = null, _bgmOn = false, _bgmRamp = null;
function _bgmTarget(){
  if(!_bgmOn || isMuted) return 0;
  let vid = false; try{ vid = !!document.querySelector(".story-vid"); }catch(e){}
  return (isPlaying || vid) ? BGM_DUCK : BGM_VOL;
}
function bgmUpdate(){
  if(!_bgm) return;
  const to = _bgmTarget();
  if(to > 0 && _bgm.paused && !document.hidden){ const pr = _bgm.play(); if(pr && pr.catch) pr.catch(()=>{}); }
  clearInterval(_bgmRamp);
  const from = _bgm.volume, t0 = Date.now();
  _bgmRamp = setInterval(()=>{
    const k = Math.min(1, (Date.now() - t0) / 300);
    try{ _bgm.volume = Math.max(0, Math.min(1, from + (to - from) * k)); }catch(e){}
    if(k >= 1){ clearInterval(_bgmRamp); if(to === 0) try{ _bgm.pause(); }catch(e){} }
  }, 30);
}
function bgmStart(){
  try{
    if(!_bgm){ _bgm = new Audio(bustAudio("assets/SFX/bgm_mela." + AUDIO_EXT)); _bgm.loop = true; _bgm.volume = 0; }
    _bgmOn = true; bgmUpdate();
  }catch(e){}
}
function bgmStop(){ _bgmOn = false; bgmUpdate(); }
document.addEventListener("visibilitychange", ()=>{
  if(!_bgm) return;
  if(document.hidden){ try{ _bgm.pause(); }catch(e){} } else bgmUpdate();
});
function _sfxFile(name){
  { const _now = Date.now(), _last = (window.__sfxLast = window.__sfxLast || {});   /* [H11-150] see cue() */
    if(_last[name] && _now - _last[name] < 150) return true; _last[name] = _now; }
  try{ const a = new Audio(bustAudio(audioDir(name) + name + "." + AUDIO_EXT)); a.volume = 0.7;   /* [H11-156] follows the card */
       a.play().catch(()=>{}); return true; }catch(e){ return false; }
}
const sfxCorrect   = ()=> { if(!_sfxFile("sfx_correct")) _tone([660, 880, 1180], "sine", 0.42, 0.13); };
const sfxWrongSoft = ()=> { if(!_sfxFile("sfx_wrong"))   _tone([300, 235], "triangle", 0.20, 0.08); };
/* dynamic Swiftie buddy: swap pose + a little pop on every reaction (correct/wrong/explain/celebrate) */
// [20a mascot-01] moods -> production EXPRESSIONS (head webp), not idle-gif basenames.
const SW_POSE = { talk:"talking", point:"talking", idle:"talking", happy:"celebrate", celebrate:"celebrate",
                  hint:"hint", teach:"hint", idea:"hint", tryagain:"tryagain" };
const SW_STILL = (() => { try { const q=new URLSearchParams(location.search);
  return q.has("still") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch(e){ return false; } })();
let swMood = "point";
function setSwMood(m){ swMood = m;
  const img = document.getElementById("swBuddyImg"), w = document.getElementById("swBuddy");
  if(!img) return;
  const expr = SW_POSE[m] || "talking";
  const animated = expr !== "talking" && !SW_STILL;   // resting face is the static talking head
  img.onerror = () => { img.onerror = null; img.src = bustAudio("assets/UI/mascot.webp"); };   // [mascot-10]
  const _p = "assets/UI/sw_head_" + expr + (animated ? "_anim" : "") + ".webp";
  /* [mascot-08] the play-once celebrate face restarts on every correct answer. [H11-189] it used to
     do that with "?r=<slide>", a NEW URL - a fresh 430KB download each time. A fresh blob: URL of
     the preloaded copy restarts it from memory; the ?r= form stays only if the copy is not in. */
  const _fresh = (animated && expr === "celebrate") ? AssetLoader.fresh(_p) : null;
  img.src = _fresh || ((animated && expr === "celebrate") ? (_p + "?r=" + (state.slideStart || 1)) : bustAudio(_p));
  if(w) w.dataset.expr = expr;
  /* [H11-217] BUG_06: THE SAD FACE DOES NOT STAY. After a wrong answer Swifty was left in the try-again
     (sad) face until the next correct answer. Now the sad face lasts exactly as long as the wrong-answer
     feedback: once no voice/feedback clip has been playing for 0.4s (and at least 0.8s has passed),
     he goes back to his resting, smiling face. Anything that changes his mood in the meantime (a hint,
     the correct-answer cheer) wins - the reset only applies while he is still sad. 12s at most. */
  clearInterval(setSwMood._sadT);
  if(m === "tryagain"){
    const t0 = Date.now(); let quietSince = 0;
    setSwMood._sadT = setInterval(()=>{
      if(swMood !== "tryagain"){ clearInterval(setSwMood._sadT); return; }
      const busy = isPlaying || (typeof state !== "undefined" && state.hintActive);
      if(busy){ quietSince = 0; }
      else if(!quietSince){ quietSince = Date.now(); }
      if((!busy && quietSince && Date.now() - quietSince >= 400 && Date.now() - t0 >= 800) || Date.now() - t0 > 12000){
        clearInterval(setSwMood._sadT); setSwMood("point");
      }
    }, 100);
  } }
/* [28u] CONFETTI FALLS FROM THE TOP OF THE PAGE — the correct-answer celebration (replaces the popup).
   Yasir 2026-07-29, stated final: "confetti is supposed to come from top of the screen and not from the
   sides", then the follow-up "it should drop from the top of the entire page". This REPLACES the two
   bottom-corner cannons that shipped from r4 through 28t.
   Two details that are load-bearing, both learned the hard way on HI01H01_L02_S04/S05 where this was
   first built and verified before being lifted here:
     - parent to <body> in VIEWPORT coords with position:fixed, NOT to .slide-stage. The stage is inset
       inside the viewport, so spawning at the stage's top edge visibly began part-way down the page.
     - z-index above the end-screen overlay, or the celebration that matters most is the one you cannot
       see.
   The element and the --tx/--ty custom-property contract are unchanged, so the existing .conf-shot
   keyframes still drive it — only the origin and the vectors moved. Note `.confetti i{top:-24px;
   animation:confettiFall}` in style.css remains DEAD CSS from the pre-r4 implementation: nothing
   creates those <i> elements. Left alone deliberately rather than deleted in the same bump. */
function confettiCannon(){
  /* [H11-214] THE STANDARD FLN CONFETTI (the MTG2A04_L02_S01 build, inlined at the end of this file as
     "FLN confetti kit"): one burst of 100 pieces over the whole window, sized with the stage at 1.5x.
     Replaces FLNKit.confetti on .slide-stage (80 pieces, stage only). No sound here - the callers
     already play their own. */
  if(!document.getElementById("fxLayer")){
    const l = document.createElement("div"); l.className = "fx-layer"; l.id = "fxLayer"; l.setAttribute("aria-hidden", "true");
    document.body.appendChild(l);
  }
  try{ FLNMotion.confetti.burst({ host: "#fxLayer", phases: [], count: 100, fall: [1.6, 2.6] }); }catch(e){}
}
/* [HI02H02] a joyful star pop centred on the play stage - this game's teaching demos use it */
function burstStars(){ const stage = document.querySelector(".slide-stage") || document.body;
  const cx = stage.offsetWidth/2, cy = stage.offsetHeight*0.38, emo = ["⭐","✨","🌟","💫","🎉"];
  for(let i=0;i<14;i++){ const s = document.createElement("span"); s.className = "spark"; s.textContent = emo[i % emo.length];
    const ang = (Math.PI*2)*(i/14) + Math.random()*0.5, dist = 70 + Math.random()*110;
    s.style.left = cx + "px"; s.style.top = cy + "px";
    s.style.setProperty("--dx", (Math.cos(ang)*dist).toFixed(0) + "px");
    s.style.setProperty("--dy", (Math.sin(ang)*dist).toFixed(0) + "px");
    s.style.animationDelay = (i*10) + "ms"; stage.appendChild(s); setTimeout(()=> s.remove(), 950); } }
/* [HI02H02] the reference kit's tile feedback, cleared (its own selClear is private to the kit) */
function kitClear(el){ if(!el) return;
  if(el._selT){ el._selT.forEach(clearTimeout); el._selT = []; }
  el.classList.remove("ck-correct", "wg-wrong", "wg-out", "wg-rel", "old-correct", "old-wrong");
  el.querySelectorAll(".ck-fx,.wg-fx").forEach(x=> x.remove()); }
/* ---------- Block Town helpers (flagship) ---------- */
const BT_COLORS = ["#F9695E","#FDC23C","#4EBE6A","#4EA3F0","#9B7BE8"];
function btBlock(i){ const b = document.createElement("div"); b.className = "blk"; b.style.background = BT_COLORS[i % BT_COLORS.length]; return b; }
function btThunk(n){ _tone([360 + n*46], "sine", 0.12, 0.10); }   // pitch climbs one step per block — HEAR the count
function btDust(plot){ const d = document.createElement("span"); d.className = "bt-dust"; d.textContent = "💨"; plot.appendChild(d); setTimeout(()=> d.remove(), 520); }
function btSkyline(done, total){ const s = document.createElement("div"); s.className = "bt-skyline";
  for(let i=0;i<total;i++){ const b = document.createElement("div"); b.className = "bt-bldg" + (i < done ? " done" : "");
    b.style.height = (26 + ((i*17) % 32)) + "px"; s.appendChild(b); } return s; }
/* the teach scene: the crane drops N blocks ONE AT A TIME (ascending thunk + spoken count) then a
   cardinality "freeze" (vo_total_N). Reached from MEET_NUMBER via data.present==='crane'. */
function btCraneMeet(host, slide){
  const d = slide.data, N = d.count;
  state.ownsAudio = true;   // the crane drops+counts blocks on its own timed VO — skip autoPlayChain
  const stage = document.createElement("div"); stage.className = "bt-stage";
  const board = document.createElement("div"); board.className = "bt-board";
  board.innerHTML = `<span class="bt-numeral">${N}</span>` + (d.word ? `<span class="bt-goallbl">${d.word}</span>` : "");   // Arabic numeral (from the integer, not card Devanagari)
  const track = document.createElement("div"); track.className = "bt-track"; const cells = [];
  for(let i=1;i<=N;i++){ const c = document.createElement("div"); c.className = "bt-nt"; track.appendChild(c); cells.push(c); }
  const yard = document.createElement("div"); yard.className = "bt-yard";
  const crane = document.createElement("div"); crane.className = "bt-crane"; crane.innerHTML = `<img src="assets/Images/obj_crane.webp" alt="">`;
  const plotwrap = document.createElement("div"); plotwrap.className = "bt-plotwrap";
  const plot = document.createElement("div"); plot.className = "bt-plot ground";
  plot.style.setProperty("--bh", Math.max(20, Math.min(46, Math.floor(230/N) - 2)) + "px");
  plotwrap.appendChild(plot); yard.appendChild(crane); yard.appendChild(plotwrap);
  stage.appendChild(board); stage.appendChild(track); stage.appendChild(yard);
  host.appendChild(stage);
  state.gateNavUntilAudio = false; setNavActive(false);
  $("navBtn").onclick = ()=> completeSlide(true);
  let i = 0;
  const step = ()=>{
    if(i >= N){ if(d.topper){ const t = document.createElement("div"); t.className = "bt-topper snap"; t.innerHTML = `<img src="assets/Images/${d.topper}.webp" alt="">`; plot.appendChild(t); }
      burstStars(); play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, ()=> setNavActive(true)); return; }
    const b = btBlock(i); b.classList.add("drop"); plot.appendChild(b); i++;
    if(cells[i-1]){ cells[i-1].classList.add("lit"); cells[i-1].textContent = i; }
    btThunk(i); btDust(plot);
    play("assets/Audio/vo_num_" + i + "." + AUDIO_EXT, ()=> setTimeout(step, 340));
  };
  // play the slide prompt FIRST, then start the crane count sequence — so the count VO never cuts the
  // prompt off (we own the audio here; mountSlide's autoPlayChain is skipped via state.ownsAudio).
  play(audioFor(slide, "prompt") || null, ()=> setTimeout(step, 400));
}
/* slide audio path: per slide, we look at slide.audio.prompt / .phoneme / etc.
   In this v0.1 the embedded card holds short ids; the compiler would replace
   them with base64 data URIs. We resolve to assets/Audio/{id}.ogg with fallback. */
function audioFor(slide, key){
  if(!slide.audio || !slide.audio[key]) return null;
  return "assets/Audio/" + slide.audio[key] + "." + AUDIO_EXT;
}
/* audioText(slide,key): the exact Hindi line the VO for this slot speaks, so a
   popup can SHOW what it SAYS (shown == spoken). Looks up the build-injected
   CARD.assets.audio_text map by the slot's audio_id. null if unknown. */
function audioText(slide, key){
  const id = slide.audio && slide.audio[key];
  if(!id) return null;
  return (CARD.assets && CARD.assets.audio_text && CARD.assets.audio_text[id]) || null;
}
/* [2026-08-31] An audio slot may hold an ARRAY of ids, played back-to-back. WHY: a 2-option slide
   offers exactly TWO wrong taps (measured on HI01H01_L03_S01/G1 -- wrong 1 speaks, wrong 2 speaks
   and crosses the card, wrong 3 is impossible), so a hint ladder with THREE authored rungs cannot
   fit one-rung-per-tap. Its last two rungs travel together at the terminal-help moment instead of
   one of them being wired, green in the ledger, and unhearable. audioFor still returns ONE src for
   every existing caller. */
function audioSeqFor(slide, key){
  if(!slide.audio || !slide.audio[key]) return null;
  const _v = slide.audio[key];
  return (Array.isArray(_v) ? _v : [_v]).map(id => audioDir(id) + id + "." + AUDIO_EXT);
}
function playSeq(list, cb){
  if(!list || !list.length){ if(cb) cb(); return null; }
  return list.length === 1 ? play(list[0], cb) : playChain(list, 0, cb);
}
/* Play a SEQUENCE of audio sources back-to-back. Each one finishes (or
   falls back to silent beat if missing) before the next starts. */
function playChain(srcs, i, onDone){
  i = i || 0;
  if(i >= srcs.length){ if(onDone) onDone(); return; }
  play(srcs[i], () => playChain(srcs, i+1, onDone));
}
/* On slide mount, play prompt → phoneme/word_name → instruction in order.
   KG learners can't read prompt_hi — the chain gives them both the
   instruction AND the cue (letter sound or picture name) audibly.
   onDone fires after the whole chain finishes (used to gate the नav button). */
function autoPlayChain(slide, onDone){
  const order = ["prompt","phoneme","shape_name","word_name","instruction"];
  const chain = [];
  for(const k of order){
    const src = audioFor(slide, k);
    if(src) chain.push(src);
  }
  if(chain.length) playChain(chain, 0, onDone);
  else if(onDone) onDone();
}

/* [33c no-आगे-in-test] ONE PLACE DECIDES WHETHER आगे MAY BE ON SCREEN AT ALL.
   Yasir 2026-08-02: "we dont need the buttons in guided and independent"; restated 2026-08-09: "we
   don't need the next buttons in guided or practice as we anyway auto advance, hence never actually
   use the next button"; and again 2026-08-16 off a HI01H02_L02_S01 screenshot. The ruling shipped
   THREE times as per-call-site hides — [31g] in MATCH_DRAG_N + SEQUENCE_DRAG, the older one inside
   mountTapOptions, and [32d] as a phase test in HI01H02_L02_S02's private engine — and each pass
   closed only the routes its author happened to be looking at. SEQUENCE_COMPLETE, SORT_GENDER and
   MATCH_GENDER_PAIRS were in none of them, which is why a greyed, permanently dead आगे was still on
   screen on 39 answerable slides two weeks after the ruling. Same shape as the hand-nudge rule,
   reported fixed four times before it moved INSIDE pointNudgeAt. So: gate here, once.

   THE RULE IS NOT A LIST OF MECHANICS. A type list has to be maintained, and the failure mode of a
   forgotten entry is a SOFT-LOCK — the child stranded on a page with no exit, silent, with every
   static receipt still reading 0 FAIL. Instead the gate asks the structural question:

       on a TEST-phase slide, आगे appears only if the mechanic ENABLES it.

   A mechanic whose only way onward is आगे must call setNavActive(true) to make it pressable — that
   is what "the button is usable" MEANS — so the same call reveals it (STORY_SCENE arms it when the
   narration ends, PHASE_TRANSITION when its VO ends, GENDER_INTRO through gateNavUntilAudio). A
   mechanic that finishes itself never calls it, so its dead pill never renders. Both directions are
   automatic, and a NEW mechanic inherits whichever it actually is — nothing to remember.

   EXEMPT: `tutorial` (teaching runs itself to the end and आगे is the child's only way onward — the
   tutorial-autonomy ruling depends on that button existing and being SEEN to unlock), and any slide
   carrying data.auto (an engine-driven demo in a test phase, same contract).

   MEASURED BEFORE SHIPPING (_tools/probe_navbtn_advance.py): of the 59 modules in this table, 11
   never enable आगे. Ten of them end in celebrateThenAdvance; the eleventh, CELEBRATION, drives
   #endBtn — and on the end screen navBtn is already `visibility:hidden` under body.is-end, so
   nothing changes for the child there either way. The three in the Hindi fleet's scope
   (SEQUENCE_COMPLETE, SORT_GENDER, MATCH_GENDER_PAIRS) were walked behaviourally on BOTH exits —
   correct answer AND the terminal rung — before their buttons came off. The seven maths ones
   (COUNT_DRAG_MATCH, MAKE_SET, MATCH_DRAG_1, ORDER_BY_ATTR, ORDER_BY_WEIGHT, PATTERN_BUILD,
   SORT_SHAPE) read the same in source but were NOT driven: walk them before building a maths game
   onto this engine. */
function navSuppressed(slide){
  if(!slide) return false;
  if(slide.phase === "tutorial") return false;
  if(slide.data && slide.data.auto) return false;
  return true;
}
/* nav button: enable/disable the kit-style pill. When it becomes active (the
   activity is done) but the child doesn't tap आगे, the hand-nudge points at it. */
function setNavActive(on){
  const btn = $("navBtn");
  btn.disabled = !on;
  btn.classList.toggle("active", on);
  /* [33c] on a suppressed slide, ENABLING is the only thing that puts the pill on screen — and
     disabling takes it away again. Scoped to state.navSuppressed so tutorial and data.auto keep the
     greyed-then-unlocks pill that the autonomy screening looks for. */
  if(state.navSuppressed) btn.style.display = on ? "" : "none";
  clearTimeout(state.navNudgeTimer);
  /* [20a nudge-03] no auto-nudge on आगे — buttons are known affordances (ruling); nudge is for learning elements only. */
}
function nudgeNavBtn(){
  const btn = $("navBtn");
  if(!btn.classList.contains("active") || state.hintActive) return;
  const nh = $("nudgeHand");
  const r = btn.getBoundingClientRect();
  const sw = document.querySelector(".slide-stage").getBoundingClientRect();
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  nh.style.left = ((r.left - sw.left)/scale + r.width/scale/2 - 48) + "px";
  nh.style.top  = ((r.top  - sw.top )/scale + r.height/scale/2 - 6) + "px";
  nh.classList.add("show");
}

/* ---------- 4. STATE ---------- */
const state = {
  idx: 0,
  slideStart: Date.now(),
  attempts: 0,
  audioReplays: 0,
  hintUsed: false,
  nudgeUsed: false,
  scaffoldLevel: 0,   // 0 none, 1 nudge, 2 hint, 3 reveal
  selectedKey: null,
  locked: false,
  hintActive: false,
  masteryHits: 0,
  masteryAttempts: 0,
  nudgeTimer: null,
  navSuppressed: false,   // [33c] reference: a test-phase slide shows आगे only if its mechanic enables it
  helpShown: false,
  mountId: 0,         // bumped on every mountSlide — a module's late callbacks check it (alive()) so they never touch the next slide
  cleanups: []        // per-slide teardown (timers/intervals a module started); run by clearHost
};
/* per-slide lifecycle helpers: later() = a setTimeout that dies with the slide; onLeave() = teardown hook;
   aliveFor() = a guard a module captures at mount so a stale audio/timer callback becomes a no-op. */
function later(fn, ms){ const t = setTimeout(fn, ms); state.cleanups.push(()=> clearTimeout(t)); return t; }
function onLeave(fn){ state.cleanups.push(fn); }
function aliveFor(){ const id = state.mountId; return ()=> state.mountId === id; }

/* ---------- 5. NUDGE ----------
   target may be a CSS selector OR an element. Used ONLY for flow guidance
   (e.g. the "listen" button / prompt) — never to point at the correct answer. */
function startNudge(slide, target){
  clearTimeout(state.nudgeTimer);
  if(!target) return;
  const ms = (CARD.scaffold_rules.nudge_timeout_ms || {})[slide.phase];
  if(!ms) return;
  state.nudgeTimer = setTimeout(()=>{
    if(state.locked || state.hintActive) return;
    const el = (typeof target === "string") ? document.querySelector(target) : target;
    if(!el) return;
    const nh = $("nudgeHand");
    const r = el.getBoundingClientRect();
    // reference the nudge's positioning context (.slide-stage), NOT the whole stage,
    // or the hand lands ~140px (header height) too low.
    const sw = document.querySelector(".slide-stage").getBoundingClientRect();
    const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
    nh.style.left = ((r.left - sw.left)/scale + r.width/scale/2 - 48) + "px";
    nh.style.top  = ((r.top  - sw.top )/scale + r.height/scale - 30) + "px";
    nh.classList.add("show");
    state.nudgeUsed = true;
    state.scaffoldLevel = Math.max(state.scaffoldLevel, 1);
    SwiftPAL.emit("nudge_invoked", { slide_id: slide.id, phase: slide.phase });
  }, ms);
}
function stopNudge(){
  clearTimeout(state.nudgeTimer);
  $("nudgeHand").classList.remove("show");
}
/* Show the hand-nudge immediately on a specific element (INTRO uses it to guide
   tapping each letter). Finger points up; fingertip sits just inside the tile's
   lower edge. References .slide-stage (the nudge's positioning context). */
function pointNudgeAt(el){
  if(!el) return;
  const nh = $("nudgeHand");
  const r = el.getBoundingClientRect();
  const sw = document.querySelector(".slide-stage").getBoundingClientRect();
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  nh.style.left = ((r.left - sw.left)/scale + r.width/scale/2 - 48) + "px";
  // fingertip overlaps the lower part of the tile (close to it, not far below)
  nh.style.top  = ((r.top  - sw.top )/scale + r.height/scale - 56) + "px";
  nh.classList.add("show");
}

/* ---------- 6. IDLE VO REPLAY [27b] ----------
   Yasir 2026-07-27: "in guided and practice, when no interaction, make the vo play again at exactly
   after 7 seconds of no interaction." A child who stalls hears the question again instead of sitting
   in silence. Distinct from the hand-nudge above (that POINTS, this SPEAKS) and from the manual
   replay chip — same guards as the chip, but fired by inactivity rather than a tap.

   SCOPE = EVERY test phase (27d, Yasir 2026-07-27: the 7s replay "needs to be all uniform and done
   and perfected" for the 50-game batch). Was guided+practice only, which silently skipped
   `independent` and `mastery` — Antim's I1/I2 + M1-M3 had no idle replay while its G/P slides did.
   Inconsistency across a 50-game fleet is worse than either behaviour, so all four test phases now
   behave identically. `tutorial` stays excluded on purpose: teaching slides either self-play
   (data.auto) or gate on the child tapping through, so an idle timer there would talk over the
   lesson. CELEBRATION is excluded by type: it expects no interaction and self-narrates.

   FIRES EXACTLY ONCE PER SLIDE (27f, Yasir 2026-07-27: "it only needs to be repeated once ... once
   the audio is played after 7 second, no need to be replayed after that"). The first cut re-armed
   after every fire, so a child — or an unattended tab — heard the prompt again every 7s forever;
   he caught it as sound coming from a test tab I had left open. One reminder, then silence.
   A correct answer (state.locked) holds it, and the slide teardown clears it, so a timer can never
   leak across slides. 7000ms is the default, overridable per card via
   scaffold_rules.idle_vo_replay_ms. */
const IDLE_VO_PHASES = new Set(["guided", "independent", "practice", "mastery"]);
// 100ms tick so the fire lands within 0.1s of the target (a 500ms tick measured 7.1-8.0s in-browser,
// and he asked for EXACTLY 7s). Cost is 10 boolean checks/sec on test slides only.
const IDLE_VO_TICK = 100;
let _idleVoTimer = null, _idleSince = 0, _idleVoFired = false;
function stopIdleVo(){ clearInterval(_idleVoTimer); _idleVoTimer = null; _idleSince = 0; }
/* Called by mountSlide so the ONE allowed reminder is per SLIDE, not per lesson. Kept separate from
   stopIdleVo() on purpose: stopIdleVo is also called for transient reasons (wrong phase, teardown)
   and must NOT hand a slide a second reminder. */
function resetIdleVo(){ stopIdleVo(); _idleVoFired = false; }
/* The 7s is 7s of SILENCE AND no touching — the clock only runs while the game is quiet, so the
   replay lands 7s after the prompt stops, never on top of it. (First cut used a plain 7s setTimeout
   that re-armed a FULL 7s whenever it found audio playing, which stretched the real delay to as much
   as 14s — measured in-browser, it never fired. A ticker that resets the silence clock is exact.) */
/* [H11-117] THE REMINDER REPEATS NOW - asked for: "har 7 sec baad inactivity pai phir se bole".
   This reverses [27f], which capped it at one per slide on a specific complaint, and the
   complaint is worth keeping in view: the uncapped first cut was caught as sound coming from an
   UNATTENDED TAB, replaying forever into an empty room. So it repeats for a child who is there
   and goes quiet for one who is not - see the document.hidden check in the ticker, which is the
   part that makes repeating safe rather than the cap. A correct answer still holds it
   (state.locked) and the teardown still clears it. */
function armIdleVo(){
  _idleSince = 0;                                // any (re)arm restarts the silence clock
  const slide = CARD.slides[state.idx];
  if(!slide || slide.type === "CELEBRATION" || !IDLE_VO_PHASES.has(slide.phase)){ stopIdleVo(); return; }
  if(_idleVoTimer) return;                       // ticker already running for this slide
  const ms = (CARD.scaffold_rules && CARD.scaffold_rules.idle_vo_replay_ms) || 7000;
  _idleVoTimer = setInterval(()=>{
    const s = CARD.slides[state.idx];
    if(!s || s.type === "CELEBRATION" || !IDLE_VO_PHASES.has(s.phase)){ stopIdleVo(); return; }
    // HOLD (not stop) on every transient busy flag. state.locked MUST be a hold: besides "answered
    // correctly" it is also set TRANSIENTLY while reveal_seq narrates the options one by one (see the
    // _enableAll() that clears it). Treating it as terminal killed the ticker 0.6s into every guided
    // slide — measured in-browser, which is the only way this was visible. Slide teardown is what
    // really ends the watch, and after a correct answer the hold simply means nothing more is spoken.
    /* [H11-218] BUG_05: THE REMINDER COMES 7s AFTER THE LAST SOUND, NOT 10. Sound and help restart the
       clock; a SILENT demo or reveal does not - it only holds the reminder back until it is over. G6's
       demo hand runs ~3s after its last word in silence, and used to restart the clock: 3 + 7 = 10s. */
    if(state.hintActive || isPlaying){ _idleSince = 0; return; }
    /* [H11-135] a child holding a line mid-drag is not idle - pointerdown only restarts the clock
       once, and a slow drag used to have the reminder start talking under the child's finger. */
    if(typeof _linkOwner !== "undefined" && _linkOwner){ _idleSince = 0; return; }
    if(!_idleSince){ _idleSince = Date.now(); return; }
    if(Date.now() - _idleSince < ms) return;
    if(state.locked || state.revealing || state.demoRunning) return;   /* due - but a silent demo finishes first */
    // [27f] ONE reminder, then done for this slide. Mark spent and stop the ticker BEFORE speaking,
    // so a pointerdown arriving during the replay cannot re-arm it.
    /* [H11-117] a backgrounded tab says nothing. This is the guard that replaces [27f]'s cap:
       it silences the exact case that cap was introduced for, without silencing the child who
       is sitting in front of the screen waiting to be asked again. */
    if(document.hidden){ _idleSince = Date.now(); return; }
    _idleSince = Date.now();                     // restart the silence clock for the NEXT reminder
    GameBus.emit("idle_vo_replay", { slide_id: s.id, phase: s.phase });
    if(state.replayAudio) state.replayAudio(); else autoPlayChain(s);
  }, IDLE_VO_TICK);
}
// ONE document-level listener for the whole session (a per-slide listener would pile up across the
// drag slides — the same trap the drag mechanics warn about). armIdleVo() itself re-checks phase, so
// a pointerdown on a tutorial slide is a cheap no-op.
document.addEventListener("pointerdown", ()=>{ armIdleVo(); }, true);

/* ---------- 7. HINT / FEEDBACK BOX ----------
   No button: the popup plays its VO, then auto-dismisses. onEnd runs after it
   closes (callers add a short pause there so the revealed answer shows). */
function showBox(emoji, text, theme, audioSrc, onEnd){
  // CORRECT: no popup (lead review) — confetti cannons from both sides + Swiftie cheer, then onEnd.
  if(theme === "correct"){
    sfxCorrect(); confettiCannon(); setSwMood("celebrate");
    play(audioSrc || null, ()=> setTimeout(()=>{ if(onEnd) onEnd(); }, 300));
    return;
  }
  state.hintActive = true;
  // wrong/hint/reveal keep a light card (mechanics use it for a short cue); Swiftie reacts too.
  // one-Swiftie rule: the popup shows the reacting Swiftie (animated), so HIDE the header buddy
  // while it's open — never two Swifties on screen at once (MoM flag).
  const swMap = { wrong:"sw_lg_tryagain", hint:"sw_lg_hint", reveal:"sw_lg_hint" };
  const sw = $("hintMascot");
  if(sw){ sw.style.display=""; sw.src = "assets/UI/" + (swMap[theme] || "sw_lg_talking") + ".webp"; }
  setSwMood(theme === "wrong" ? "tryagain" : "hint");
  $("hintBox").classList.remove("celebrate");
  sfxWrongSoft();
  const ht = $("hintText"); ht.textContent = text; ht.className = "hint-text " + theme;
  $("stage").classList.add("blurred");
  $("hintOverlay").classList.add("show");
  $("hintBtn").disabled = true;
  const hi = $("hintImg"); if(hi) hi.src = "assets/UI/hint_active.webp";
  const close = ()=>{
    $("hintOverlay").classList.remove("show");
    $("stage").classList.remove("blurred");
    state.hintActive = false;
    if(hi) hi.src = "assets/UI/hint.webp";
    if(!state.locked) $("hintBtn").disabled = false;
    if(onEnd) onEnd();
  };
  // auto-dismiss after the VO finishes (small buffer so it never just flashes)
  play(audioSrc, ()=> setTimeout(close, 300));
}

/* ---------- reveal hand (reference: Bandar port) — parented to .slide-stage, placed under the anchor and pushed
   past any label text sharing its column, clamped into the stage. ---------- */
function _placeRevealHand(el, nh){
  if(!el || !el.getBoundingClientRect) return;
  var r = el.getBoundingClientRect();
  var sw = document.querySelector(".slide-stage").getBoundingClientRect();
  var scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  nh.style.left = ((r.left - sw.left)/scale + r.width/scale/2 - 48) + "px";
  var HAND_H = 96, GAP = 4, stageH = sw.height/scale;
  var top = (r.top - sw.top)/scale, hh = r.height/scale;
  var below = top + hh + GAP;
  var _tile = el.closest(".opt-cell, .q-cell") || el.parentElement;
  if(_tile){
    _tile.querySelectorAll(".lbl, .opt-label, .story-q-opt-label, .pic-label, .count-badge")
      .forEach(function(t){
        var tr = t.getBoundingClientRect();
        if(tr.width < 2 || tr.height < 2) return;
        if(tr.right < r.left || tr.left > r.right) return;
        var tb = (tr.bottom - sw.top)/scale;
        if(tb > below - HAND_H && tb + GAP > below) below = tb + GAP;
      });
  }
  if(below + HAND_H > stageH) below = Math.max(0, stageH - HAND_H);
  nh.style.top = below + "px";
}
function showRevealHand(grid, cell){
  if(!cell) return;
  var stage = document.querySelector(".slide-stage");
  if(!stage) return;
  var old = stage.querySelector(".reveal-hand"); if(old) old.remove();
  var hd = document.createElement("img");
  hd.className = "reveal-hand"; hd.src = "assets/UI/nudge_hand_new.svg"; hd.alt = "";
  hd.onerror = function(){ this.style.display = "none"; };
  stage.appendChild(hd);
  _placeRevealHand(cell, hd);
  requestAnimationFrame(function(){ if(hd.parentNode) _placeRevealHand(cell, hd); });
}

/* ---------- 8. TAP-OPTION HELPER (shared by 5 slide types) ---------- */
function mountTapOptions({slide, host, signalName, stimulus, options, isCorrect, optionRenderer, columnsHint, mastery, hintAction, nudgeTarget, shuffle}){
  state.attempts = 0; state.selectedKey = null; state.locked = false;
  state.audioReplays = 0; state.hintUsed = false; state.nudgeUsed = false; state.scaffoldLevel = 0;
  // idle hand-nudge target: defaults to the stimulus (re-listen), but a slide can pass
  // nudgeTarget:null to suppress it entirely (e.g. "how many?" — nothing to re-tap).
  const _nudge = (nudgeTarget !== undefined) ? nudgeTarget : (stimulus || null);
  // optional custom hint (runs on the live slide instead of a text popup), e.g. a
  // count-demonstration. Wrapped to block option taps while it plays.
  const runHint = hintAction ? (after)=>{ state.hintActive = true; hintAction(()=>{ state.hintActive = false; if(after) after(); }); } : null;

  // Shuffle options once so the correct answer isn't pinned to one position (engine-wide anti
  // positional-bias — otherwise "always tap the same spot" can pass mastery). Opt out with
  // shuffle:false for inherently-ordered options (e.g. a number line).
  const _opts = (shuffle === false) ? options.slice()
    : (function(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; })(options);

  const wrap = document.createElement("div"); wrap.className = "q-row";
  if(stimulus){ wrap.appendChild(stimulus); }
  const grid = document.createElement("div");
  const cols = columnsHint || (_opts.length <= 2 ? 2 : _opts.length <= 3 ? 3 : 4);
  grid.className = "opt-grid cols-" + cols;
  _opts.forEach((opt, i) => {
    const cell = optionRenderer(opt, i);
    cell.classList.add("opt-cell");
    cell.dataset.key = String(i);
    cell.onclick = ()=>{
      if(state.locked || state.hintActive || cell.classList.contains("crossed") || cell.classList.contains("correct")) return;
      stopNudge();
      // SME rule: SPEAK THE TAPPED WORD on EVERY tap (right or wrong), then the feedback — never two
      // voices at once (buzz/confetti are sfx, they ride alongside the word). opt.audio = word clip id.
      // Fallback wiring for LETTER options (SME: the tapped item's own sound speaks EVERYWHERE): options
      // authored as {letter:"आ"} carry no audio id, but the slide's data.phonemes map has each letter's
      // clip — derive it here centrally so every TAP_LETTER_* / mastery module inherits speak-on-tap
      // without per-module or per-card changes. Explicit opt.audio always wins.
      const _aid = opt.audio ||
                   (opt.letter && slide.data && slide.data.phonemes && slide.data.phonemes[opt.letter]) || null;
      const _word = _aid ? ("assets/Audio/" + _aid + "." + AUDIO_EXT) : null;
      const _afterWord = (cb)=>{ if(_word) play(_word, cb); else cb(); };
      if(isCorrect(opt, i)){
        state.locked = true; cell.classList.add("correct"); if(window.FLNKit) FLNKit.ck(cell, {}); /* FLN ANIMATION KIT: correct-select */ sfxCorrect(); confettiCannon(); setSwMood("happy");
        if(mastery){ state.masteryAttempts++; if(state.attempts === 0) state.masteryHits++; }
        SwiftPAL.emit(signalName, { slide_id: slide.id, phase: slide.phase, value: true,
          first_try: state.attempts === 0, attempts: state.attempts + 1,
          scaffold_level: state.scaffoldLevel, latency_ms: Date.now()-state.slideStart });
        // [VO-BATCH] audio.correct (the SME's शाबाश line, where one was recorded) follows the word; then advance (confetti is the reward)
        _afterWord(()=>{ const _ok = audioFor(slide, "correct"), _adv = ()=> setTimeout(()=> completeSlide(true), 700);
          if(_ok) play(_ok, _adv); else _adv(); });
      } else {
        state.attempts++; cell.classList.add("crossed"); sfxWrongSoft(); setSwMood("tryagain");
        // reference: a ~1s RED GLOW on the tapped wrong card (5px red border + pink pulse), then it reads normal again
        if(window.FLNKit) FLNKit.wg(cell, {});   /* FLN ANIMATION KIT: wrong-select - the kit beat replaces the 1s red glow below */
        else (function(_c){ _c.classList.add("opt-redglow-1s"); setTimeout(function(){ _c.classList.remove("opt-redglow-1s"); }, 1000); })(cell);
        // (do NOT count masteryAttempts here — the correct branch counts one attempt PER ITEM.)
        SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
        // LAYERED SCAFFOLD (A1): L1 re-listen → L2 hint → L3 REVEAL at max_attempts (never stuck).
        const _maxA = (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
        _afterWord(()=>{   // speak the tapped word FIRST, then the layered feedback VO (no overlap)
          if(state.attempts >= _maxA){ revealAnswer("wrong"); return; }
          // reference parity: after the feedback line the card returns to normal and the child may try again
          const _uncross = ()=>{ if(!state.locked){ cell.classList.remove("crossed"); setSwMood("talk"); } };
          if(state.attempts >= 2){ state.scaffoldLevel = Math.max(state.scaffoldLevel, 2);
            if(runHint) runHint(_uncross); else play(audioFor(slide, "hint") || audioFor(slide, "try_again") || null, _uncross); }
          else { state.scaffoldLevel = Math.max(state.scaffoldLevel, 1); play(audioFor(slide, "try_again") || null, _uncross); }
        });
      }
    };
    grid.appendChild(cell);
  });
  wrap.appendChild(grid);
  host.appendChild(wrap);

  // ---- layered-hint helpers (A1/B2): reveal-on-max + a wired manual hint button ----
  function _correctCell(){ return [...grid.querySelectorAll(".opt-cell")].find(c => isCorrect(_opts[+c.dataset.key], +c.dataset.key)); }
  function revealAnswer(reason){
    if(state.locked) return; state.locked = true; state.scaffoldLevel = 3; setSwMood("hint");
    const el = _correctCell();
    // reference reveal: decoys blur out and go dead, the answer carries the green guide-pulse + the pointing hand
    [...grid.querySelectorAll(".opt-cell")].forEach(c => { c.classList.remove("crossed"); if(c !== el) c.classList.add("opt-dim"); });
    if(el){ el.classList.add("opt-guided"); showRevealHand(grid, el); }
    SwiftPAL.emit("answer_revealed", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts, reason });
    // TAP-GATED REVEAL: after the reveal VO the slide WAITS. The correct option keeps its guide-pulse + the
    // pointing hand and the dimmed decoys stay inert; ONLY the child's tap on the guided option advances
    // (no auto-advance). The tap speaks the option's own clip, then completes the slide as a revealed answer.
    play(audioFor(slide, "reveal") || audioFor(slide, "correct") || audioFor(slide, "try_again") || null, ()=>{});
    if(!el){ setTimeout(()=> completeSlide(false), 800); return; }   // no resolvable answer cell → previous behaviour
    el.addEventListener("click", function onGuidedTap(){
      el.removeEventListener("click", onGuidedTap);
      if(CARD.slides[state.idx] !== slide) return;   // slide already changed — ignore a stale tap
      stopNudge();
      document.querySelectorAll(".reveal-hand").forEach(x => x.remove());
      el.classList.remove("opt-guided"); el.classList.add("correct"); setSwMood("happy");
      if(window.FLNKit) FLNKit.ck(el, {});   /* FLN ANIMATION KIT: correct-select */
      const _o = _opts[+el.dataset.key] || {};
      const _aid = _o.audio || (_o.letter && slide.data && slide.data.phonemes && slide.data.phonemes[_o.letter]) || null;
      const _word = _aid ? ("assets/Audio/" + _aid + "." + AUDIO_EXT) : null;
      const _go = ()=> setTimeout(()=> completeSlide(false), 700);
      const _ok = audioFor(slide, "correct"), _then = _ok ? ()=> play(_ok, _go) : _go;   // [VO-BATCH] the correct line follows the word here too
      if(_word) play(_word, _then); else _then();
    });
  }
  $("hintBtn").onclick = ()=>{ if(state.locked || state.hintActive) return;
    state.hintUsed = true; if(state.attempts < 1) state.attempts = 1;
    SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true });
    if(runHint) runHint(); else play(audioFor(slide, "hint") || audioFor(slide, "try_again") || null, ()=>{}); };

  startNudge(slide, _nudge);
  // Tap-to-answer standard (lead review): a WRONG tap = soft buzz + ✕ + that card LOCKS (can't re-tap);
  // a RIGHT tap = confetti cannons + Swiftie cheer, then auto-advance. No select-then-आगे for pick questions.
  $("navBtn").style.display = "none"; setNavActive(false);
}

/* LADDER variant of the tap-option contract (HI02H02 SME review): a wrong card WIGGLES and stays tappable
   (it does not lock), and each wrong tap climbs one hint rung —
     rung 1: wiggle + optional audio.hint1 ("फिर से कोशिश कीजिए…")
     rung 2: every option glows in turn while its own clip is read out
     rung 3: audio.hint3 names the answer ("X का मतलब है Y। इसपर टैप कीजिए।"), the answer glows and the
             other cards are disabled — the child still makes the final tap.
   The manual hint button runs the next rung. Correct = tapped word → audio.correct ("शाबाश!") → advance.
   Visuals are the reference lesson's (FLN animation kit): a right tap = kit correct-select (green ring + star crown) +
   confetti; a wrong tap = kit wrong-select (the shake, no red); rung 3 = the reference reveal (decoys dimmed + dead,
   the answer's green guide-pulse + the pointing hand). */
function mountLadderOptions({slide, host, signalName, stimulus, options, optionRenderer, mastery}){
  state.attempts = 0; state.locked = false; state.scaffoldLevel = 0; state.hintUsed = false;
  const alive = aliveFor();
  const wrap = document.createElement("div"); wrap.className = "q-row";
  if(stimulus) wrap.appendChild(stimulus);
  const grid = document.createElement("div"); grid.className = "opt-grid cols-1";
  const cells = options.map((opt, i)=>{ const cell = optionRenderer(opt, i);
    cell.classList.add("opt-cell"); cell.dataset.key = String(i); cell._opt = opt;
    cell._src = opt.audio ? ("assets/Audio/" + opt.audio + "." + AUDIO_EXT) : null;
    grid.appendChild(cell); return cell; });
  wrap.appendChild(grid); host.appendChild(wrap);
  const ok = cells.find(c=> c._opt.correct === true);
  let level = 0;
  const rung = (n)=>{
    level = Math.max(level, n); state.scaffoldLevel = Math.max(state.scaffoldLevel, n);
    state.hintActive = true; setSwMood("hint");
    SwiftPAL.emit("hint_shown", { slide_id: slide.id, level: n });
    const fin = ()=>{ if(!alive()) return; state.hintActive = false; cells.forEach(c=> c.classList.remove("hint-glow")); setSwMood("talk"); };
    if(n === 1){ const s = audioFor(slide, "hint1"); if(s) play(s, fin); else later(fin, 450); }
    else if(n === 2){ let i = 0;
      const step = ()=>{ if(!alive()) return; cells.forEach(c=> c.classList.remove("hint-glow"));
        if(i >= cells.length){ fin(); return; }
        const c = cells[i++]; c.classList.add("hint-glow"); play(c._src, ()=> later(step, 250)); };
      step(); }
    else { cells.forEach(c=>{ if(c !== ok) c.classList.add("faded"); });   // reference terminal hold: the others fade and go dead
      if(ok){ ok.classList.add("reveal-hold"); pointNudgeAt(ok); }
      play(audioFor(slide, "hint3") || null, ()=>{ if(!alive()) return; state.hintActive = false; setSwMood("talk"); }); }
  };
  cells.forEach(cell=> cell.onclick = ()=>{
    if(state.locked || state.hintActive || cell.classList.contains("faded")) return;
    stopNudge();
    if(cell === ok){
      state.locked = true; stopNudge();
      cell.classList.remove("reveal-hold"); cell.classList.add("correct");
      if(window.FLNKit) FLNKit.ck(cell, {});   /* FLN ANIMATION KIT: correct-select */
      sfxCorrect(); confettiCannon(); setSwMood("happy");
      if(mastery){ state.masteryAttempts++; if(state.attempts === 0) state.masteryHits++; }
      SwiftPAL.emit(signalName, { slide_id: slide.id, phase: slide.phase, value: true,
        first_try: state.attempts === 0, attempts: state.attempts + 1,
        scaffold_level: state.scaffoldLevel, latency_ms: Date.now() - state.slideStart });
      const cheer = ()=> play(audioFor(slide, "correct") || null, ()=> later(()=> completeSlide(state.scaffoldLevel < 3), 600));
      if(cell._src) play(cell._src, cheer); else cheer();
    } else {
      state.attempts++; sfxWrongSoft(); setSwMood("tryagain");
      cell.classList.add("wrong-flash"); later(()=> cell.classList.remove("wrong-flash"), 700);   // reference: a red flash on a still-live card
      if(window.FLNKit) FLNKit.wg(cell, {});   /* FLN ANIMATION KIT: wrong-select (the wiggle) */
      else { cell.classList.remove("wiggle"); void cell.offsetWidth; cell.classList.add("wiggle"); later(()=> cell.classList.remove("wiggle"), 700); }
      $("hintBtn").classList.add("show");
      SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
      const next = Math.min(Math.max(state.attempts, level + 1), 3);
      state.hintActive = true;   // the tapped word speaks first, then the rung (never two voices)
      const go = ()=>{ if(!alive()) return; state.hintActive = false; rung(next); };
      if(cell._src) play(cell._src, go); else later(go, 450);
    }
  });
  $("hintBtn").onclick = ()=>{ if(state.locked || state.hintActive || level >= 3) return;
    state.hintUsed = true; rung(Math.min(level + 1, 3)); };
  $("navBtn").style.display = "none"; setNavActive(false);
}

/* the word search's magic hat (an idle guide): the SME's own art (New assets map/magic cap.svg) - a navy top hat, teal band, magic wand + gold sparkles */
const CAP_SVG = '<svg class="cap-svg" viewBox="0 0 357 358" fill="none" aria-hidden="true"><g class="cap-wand"><path d="M138.749 92.1798L30.1562 75.1113L29.0012 82.4602L137.594 99.5286L138.749 92.1798Z" fill="#8E80E0"/><path d="M138.32 94.8388C138.32 94.8388 81.6249 90.0364 29.7293 77.7645L28.9911 82.4609L137.582 99.5352L138.32 94.8388Z" fill="#B7ADF5"/><path d="M28.9946 82.4609L2.86722 78.3529C2.57262 77.8891 1.92227 76.7241 1.97678 75.1455C2.06075 72.7304 3.72763 71.2568 4.02208 71.0047C12.7314 72.3738 21.4401 73.7437 30.1495 75.1127L28.9946 82.4609Z" fill="#FFE08A"/><path d="M29.7301 77.7644L4.02018 71.0053L30.1468 75.1127L29.7301 77.7644Z" fill="#FFCB55"/><path d="M28.9929 82.4616C24.8188 82.0424 19.272 81.0335 13.1497 78.5765C8.87564 76.8608 5.35291 74.8531 2.59037 73.0121C2.33747 73.5268 1.56344 75.2636 2.22063 77.1369C2.39385 77.63 2.63093 78.0335 2.86637 78.3542C11.5749 79.7226 20.2836 81.0925 28.9929 82.4616Z" fill="#FFCB55"/><path d="M137.545 99.5292L163.672 103.637C164.095 103.287 165.072 102.377 165.503 100.858C166.164 98.5331 165.03 96.6193 164.827 96.2891C156.118 94.92 147.409 93.5501 138.7 92.1811L137.545 99.5292Z" fill="#FFE08A"/><path d="M138.283 94.8328L164.827 96.2891L138.7 92.1803L138.283 94.8328Z" fill="#FFCB55"/><path d="M137.543 99.5294C141.645 100.411 147.233 101.154 153.814 100.693C158.409 100.372 162.377 99.5423 165.572 98.6367C165.655 99.2041 165.859 101.094 164.658 102.676C164.343 103.092 163.993 103.404 163.671 103.637C154.961 102.268 146.253 100.898 137.543 99.5294Z" fill="#FFCB55"/><path d="M49.2003 78.1087C49.2003 78.1087 88.6514 87.9372 127.038 90.3471L49.2003 78.1087Z" fill="#B7ADF5"/><circle class="cap-wandtip" cx="4" cy="77" r="2" fill="#FFF3B0"/></g><path class="cap-star s1" d="M194.992 117.441C194.992 117.441 206.708 121.017 212.523 114.175C212.523 114.175 207.003 124.664 213.301 130.771C213.301 130.771 204.921 127.894 195.806 135.582C195.806 135.582 200.541 128.343 194.992 117.441Z" fill="#EFD460"/><path class="cap-star s2" d="M180.647 96.7828C180.647 96.7828 184.875 98.0733 186.974 95.6035C186.974 95.6035 184.982 99.3887 187.255 101.593C187.255 101.593 184.231 100.555 180.941 103.33C180.941 103.33 182.649 100.717 180.647 96.7828Z" fill="#EFD460"/><path class="cap-star s3" d="M169.567 125.929C169.567 125.929 175.686 127.796 178.722 124.223C178.722 124.223 175.839 129.701 179.129 132.891C179.129 132.891 174.752 131.388 169.991 135.404C169.991 135.404 172.465 131.623 169.567 125.929Z" fill="#EFD460"/><path class="cap-star s4" d="M153.148 125.867C152.438 126.844 151.069 127.061 150.092 126.351C149.115 125.64 148.898 124.271 149.608 123.294C150.319 122.316 151.687 122.101 152.664 122.811C153.642 123.521 153.859 124.889 153.148 125.867Z" fill="#EFD460"/><path class="cap-star s5" d="M172.793 154.221C172.198 155.04 171.053 155.221 170.234 154.626C169.415 154.031 169.234 152.886 169.829 152.067C170.424 151.248 171.57 151.067 172.388 151.662C173.207 152.256 173.388 153.402 172.793 154.221Z" fill="#EFD460"/><path class="cap-star s6" d="M173.974 111.853C173.227 112.882 171.786 113.111 170.756 112.362C169.727 111.614 169.499 110.174 170.247 109.144C170.995 108.114 172.436 107.886 173.465 108.635C174.495 109.383 174.723 110.823 173.974 111.853Z" fill="#EFD460"/><g class="cap-body"><path d="M293.028 181.41C301.815 180.778 308.893 189.611 307.832 199.805C306.371 213.842 305.301 228.906 304.84 244.893C303.953 275.626 305.497 303.457 308.124 327.658C308.972 335.468 304.973 342.853 298.565 345.326C283.853 351.003 263.242 356.526 238.492 356.047C216.364 355.618 197.831 350.526 184.155 345.215C177.884 342.78 173.926 335.591 174.632 327.927C177.11 301.022 178.293 270.791 176.968 237.858C176.538 227.175 175.871 216.852 175.016 206.912C174.221 197.672 180.183 189.528 188.13 188.956C223.096 186.441 258.062 183.925 293.028 181.41Z" fill="#9CBBF5"/><path d="M259.002 225.196C259.002 225.196 246.183 322.5 191.07 347.716C191.07 347.716 255.371 371.314 298.59 345.86C305.414 341.841 309.311 334.248 308.676 326.353C306.679 301.545 302.9 243.146 309.473 221.243C317.917 193.103 259.002 225.196 259.002 225.196Z" fill="#7C9DE6"/><path d="M176.273 224.054L177.466 256.642C177.466 256.642 253.583 283.227 306.047 256.642C306.047 256.642 305.829 234.318 310.205 220.949C314.581 207.58 176.273 224.054 176.273 224.054Z" fill="#FFA9CB"/><path d="M356.467 189.19C356.492 223.804 201.789 251.181 152.137 221.883C146.696 218.673 133.789 211.056 130.682 197.363C126.633 179.515 141.855 162.887 143.963 160.584C168.677 133.587 215.295 139.622 243.063 143.216C276.655 147.564 356.449 164.334 356.467 189.19Z" fill="#B3C9F8"/><path d="M186.874 226.991L210.372 229.034C210.495 233.745 210.292 239.368 209.35 245.636C208.276 252.779 206.526 258.876 204.771 263.743L181.867 258.046C183.488 254.668 185.288 250.046 186.363 244.359C187.704 237.269 187.413 231.201 186.874 226.991Z" fill="#FFC4DB"/><path d="M309.471 188.34C309.486 208.588 218.99 224.603 189.945 207.464C186.762 205.586 179.212 201.131 177.395 193.121C175.026 182.681 183.93 172.954 185.164 171.606C199.621 155.814 226.891 159.344 243.134 161.446C262.784 163.99 309.461 173.8 309.471 188.34Z" fill="#6F86D6"/><path d="M276.747 228.842C276.747 228.842 159.291 240.273 130.684 197.363C130.684 197.363 141.856 255.212 276.747 228.842Z" fill="#C7D7FB"/><mask id="capMask" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="176" y="159" width="134" height="56"><path d="M309.471 188.34C309.486 208.588 218.99 224.603 189.945 207.464C186.762 205.586 179.212 201.131 177.395 193.121C175.026 182.681 183.93 172.954 185.164 171.606C199.621 155.814 226.891 159.344 243.134 161.446C262.784 163.99 309.461 173.8 309.471 188.34Z" fill="white"/></mask><g mask="url(#capMask)"><path d="M271.671 164.67C242.057 175.968 224.297 190.722 226.386 201.302C226.823 203.516 228.88 209.348 243.289 214.076C233.316 216.958 224.941 217.094 219.566 216.775C213.213 216.397 201.318 215.541 189.938 207.58C185.539 204.502 178.781 199.775 176.656 191.234C176.534 190.744 175.178 184.988 176.891 179.452C183.001 159.715 223.843 156.684 226.717 156.498C235.958 155.901 252.261 156.259 271.671 164.67Z" fill="#5A70C2"/></g><path d="M220.586 159.562C220.587 159.792 226.562 159.505 236.932 160.584C242.453 161.158 246.575 161.844 251.235 162.627C258.064 163.775 263.968 164.768 271.668 166.714C277.624 168.219 285.611 170.537 293.123 173.866C295.854 175.076 298.916 176.595 302.318 178.974C304.532 180.522 306.25 181.988 307.426 183.061C303.229 177.965 299.058 174.757 296.188 172.845C289.618 168.468 283.542 166.672 276.777 164.672C271.288 163.05 266.652 162.134 263.496 161.607C259.924 160.925 255.036 160.122 249.193 159.564C233.605 158.074 220.583 159.223 220.586 159.562Z" fill="#C7D7FB"/><path d="M310.202 220.948C310.202 220.948 304.781 242.319 305.802 257.643C305.802 257.643 288.994 268.025 248.66 268.452C248.66 268.452 252.843 250.162 255.615 232.447C255.615 232.447 298.231 225.969 310.202 220.948Z" fill="#F48DB8"/><path d="M204.77 263.743C204.77 263.743 193.427 292.377 176.996 294.931L177.488 271.684L177.518 265.814C177.518 265.814 180.686 260.68 181.866 258.047C181.866 258.047 198.632 262.587 204.77 263.743Z" fill="#D3E3FF"/></g></svg>';
/* crying FX: tear drops flung from the eyes (the "आँसू हवा में उड़ते हुए" cue). Positions are % of the picture. */
/* tear FOUNTAINS (page 6, SME pick): cartoon "फूट-फूटकर" crying - drops shoot out of both eyes in arcs and fall
   (the PPT's "आँसू हवा में उड़ते हुए"). Each drop = an x-wrapper moving linearly + the drop moving up, then down under
   "gravity" (CSS .fx-fountain). eyesAt: [{x,y (% of the picture), dx:-1|1 (which way that eye's drops fly)}]. */
function fountainFx(eyesAt){
  const fx = document.createElement("div"); fx.className = "fx-fountain";
  // 5 drops in all (3 from the first eye, 2 from the second), slow (1.8 s flight), launched one at a time in a calm rhythm
  const PLAN = [[0, 0.6, 1.2], [0.3, 0.9]], T = 1.8;
  (eyesAt || []).forEach((e, k)=>{ (PLAN[k] || []).forEach((delay, i)=>{
    const t = T.toFixed(2) + "s", dl = delay.toFixed(2) + "s";
    const w = document.createElement("i"); w.className = "ff-x";
    w.style.cssText = `left:${e.x}%;top:${e.y}%;--t:${t};--dl:${dl};--dx:${e.dx * (32 + i*12)}px;`;
    const d = document.createElement("i"); d.className = "ff-d";
    d.style.cssText = `--s:${8 + (i%2)}px;--up:${-(14 + i*5)}px;--down:${46 + i*8}px;--t:${t};--dl:${dl};`;
    w.appendChild(d); fx.appendChild(w); }); });
  return fx;
}
function tearsFx(eyesAt){
  const fx = document.createElement("div"); fx.className = "fx-tears";
  const eyes = eyesAt || [{x:78.5, y:67.5, dx:-1}, {x:97, y:81, dx:1}];   // default: st_cry (16:9); a slide passes data.fx_eyes for its own art
  eyes.forEach((e, ei)=>{ for(let i=0;i<4;i++){ const t = document.createElement("i");
    t.style.left = e.x + "%"; t.style.top = e.y + "%";
    t.style.setProperty("--dx", (e.dx * (60 + i*28)) + "px"); t.style.setProperty("--dy", (40 + i*22) + "px");
    t.style.animationDelay = (i*0.32 + ei*0.16).toFixed(2) + "s"; fx.appendChild(t); } });
  return fx;
}

/* ---------- 10. RENDER HELPERS ---------- */
/* Render a picture as the real PNG (assets/Images/<key>.webp); if the file is
   missing it falls back to the emoji. Pass the image id (e.g. "pic_anaar"). */
function imgOrEmoji(imgKey, emoji, imgClass, emojiClass){
  if(imgKey){
    const fb = String(emoji||"❓").replace(/'/g,"");
    return `<img class="${imgClass}" src="assets/Images/${imgKey}.${IMG_EXT}" alt="" `+
      `onerror="var s=document.createElement('span');s.className='${emojiClass}';s.textContent='${fb}';this.replaceWith(s);">`;
  }
  return `<span class="${emojiClass}">${emoji||"❓"}</span>`;
}
function letterCell(letter){
  const cell = document.createElement("div");
  cell.innerHTML = `<span class="big-glyph ink-glyph">${letter}</span>`;
  return cell;
}
function pictureCell(picture, emoji, imgKey){
  const cell = document.createElement("div");
  cell.innerHTML = imgOrEmoji(imgKey, emoji, "pic-img", "pic-emoji") + `<span class="lbl">${picture||""}</span>`;
  return cell;
}
function stimulusLetter(letter){
  const el = document.createElement("div"); el.className = "stimulus-letter";
  el.innerHTML = `<span class="ink-glyph">${letter}</span>`;
  return el;
}
function stimulusPic(picture, emoji, imgKey){
  const el = document.createElement("div"); el.className = "stimulus-pic";
  el.innerHTML = imgOrEmoji(imgKey, emoji, "img", "emoji") + `<span class="lbl">${picture||""}</span>`;
  return el;
}
/* gender helpers: an option card showing a gender label (पुल्लिंग/स्त्रीलिंग),
   and a stimulus card showing the target gender label. */
function genderLabelCell(label, gender){
  const cell = document.createElement("div");
  cell.innerHTML = `<span class="gender-label${gender==="F"?" fem":""}">${label}</span>`;
  return cell;
}
function stimulusGender(label, gender){
  const el = document.createElement("div");
  el.className = "stimulus-gender" + (gender==="F"?" fem":"");
  el.textContent = label;
  return el;
}

/* shape helpers (maths): render circle/square/triangle/rectangle as inline SVG in
   any colour / size / rotation (LO: recognise regardless of orientation or size).
   No image assets needed — shapes are pure geometry, so the sample renders offline. */
function shapeSVG(shape, opts){
  opts = opts || {};
  const color = opts.color || "#386AF6";
  const size  = opts.size  || 120;
  const rot   = opts.rotate || 0;
  let inner = "";
  if(shape === "circle")         inner = `<circle cx="50" cy="50" r="42" fill="${color}"/>`;
  else if(shape === "square")    inner = `<rect x="12" y="12" width="76" height="76" rx="0" fill="${color}"/>`;   // TRUE corners — teachable geometry is never rounded
  else if(shape === "triangle")  inner = `<polygon points="50,9 91,89 9,89" fill="${color}"/>`;
  else if(shape === "rectangle") inner = `<rect x="6" y="28" width="88" height="44" rx="0" fill="${color}"/>`;    // TRUE corners
  const g = rot ? `<g transform="rotate(${rot} 50 50)">${inner}</g>` : inner;
  return `<svg class="shape-svg" viewBox="0 0 100 100" width="${size}" height="${size}" `+
         `xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${g}</svg>`;
}
function shapeCell(o){
  const cell = document.createElement("div");
  cell.innerHTML = shapeSVG(o.shape, {color:o.color, size:130, rotate:o.rotate});
  return cell;
}
function stimulusShape(o){
  const el = document.createElement("div"); el.className = "stimulus-shape";
  el.innerHTML = shapeSVG(o.shape, {color:o.color, size:150, rotate:o.rotate});
  return el;
}

/* counting helpers (maths): a numeral option card (big numeral + small number word),
   and a stimulus box showing a set of `count` identical objects to be counted. */
function numberCell(numeral, word){
  const cell = document.createElement("div");
  cell.innerHTML = `<span class="num-glyph">${numeral}</span>` + (word ? `<span class="num-word">${word}</span>` : "");
  return cell;
}
/* VISUAL-FIRST quantity: a HAND showing n fingers up (assets/UI/hand_1..5) — pre-reader,
   NO number-word text. Falls back to the numeral only if n is outside 1..5 or the art is missing. */
function fingerCount(n, cls){ cls = cls || "finger-hand";
  if(!(n>=1 && n<=5)) return `<span class="num-glyph">${n}</span>`;
  return `<img class="${cls}" src="assets/UI/hand_${n}.webp" alt="" ` +
    `onerror="var s=document.createElement('span');s.className='num-glyph';s.textContent='${n}';this.replaceWith(s);">`;
}
function fingerCell(n){ const c = document.createElement("div"); c.innerHTML = fingerCount(n, "opt-hand"); return c; }
/* DISPLAY numeral: ALWAYS Arabic (1 2 3) on screen — kids learn the universal digit.
   Spoken VO stays Hindi (एक/दो/तीन) via the separate vo_num_/vo_total_ audio files. */
function devNumeral(n){ return String(n); }
/* DUAL-CODED counting option: the Devanagari NUMERAL the child is learning, big and on top,
   with a smaller finger-hand beneath it as a visual anchor. The point of counting is to learn the
   NUMBER SYMBOL, not just read a hand-sign — so the numeral leads and the hand supports. Falls back
   to the numeral alone if the hand art (1..5) is missing. */
function numFingerCell(n){
  // outer div BECOMES the .opt-cell (mountTapOptions adds that class), so the stack lives in an
  // INNER .numfinger wrapper — otherwise ".opt-cell .numfinger x" selectors wouldn't match.
  const c = document.createElement("div");
  c.innerHTML = `<div class="numfinger"><span class="num-glyph">${devNumeral(n)}</span>${fingerCount(n, "nf-hand")}</div>`;
  return c;
}
function stimulusCountSet(count, obj){
  const el = document.createElement("div"); el.className = "count-set";
  for(let i=0;i<count;i++){
    const c = document.createElement("span"); c.className = "cobj";
    c.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji");
    el.appendChild(c);
  }
  return el;
}
/* COMPARE_SETS helpers (one-to-one matching → ज़्यादा / कम / बराबर).
   Two left-aligned rows (columns line up), a dashed connector drawn top[i]↔bottom[i]
   for each matched pair, and the unmatched leftover item(s) in the longer row glow —
   that glow IS the "which has more" proof. Offsets (not getBoundingClientRect) so it
   works even when the preview tab is throttled. */
function cmpObj(obj){
  const c = document.createElement("span"); c.className = "cobj";
  c.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji");
  return c;
}
function stimulusCompareSets(data){
  const nA = data.a_count, nB = data.b_count, A = data.a_object, B = data.b_object;
  const NS = "http://www.w3.org/2000/svg";
  const stage = document.createElement("div"); stage.className = "compare-stage";
  const rowA = document.createElement("div"); rowA.className = "cmp-row top";
  const rowB = document.createElement("div"); rowB.className = "cmp-row bot";
  const svg  = document.createElementNS(NS, "svg"); svg.setAttribute("class", "cmp-lines");
  for(let i=0;i<nA;i++) rowA.appendChild(cmpObj(A));
  for(let i=0;i<nB;i++) rowB.appendChild(cmpObj(B));
  stage.appendChild(rowA); stage.appendChild(svg); stage.appendChild(rowB);
  const btn = document.createElement("button"); btn.type = "button"; btn.className = "cmp-match-btn";
  btn.textContent = "🔗 मिलाओ"; stage.appendChild(btn);
  const min = Math.min(nA, nB);
  let drawn = false;
  function draw(){
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    const IA = [...rowA.children], IB = [...rowB.children];
    const y1 = rowA.offsetTop + rowA.offsetHeight - 4;
    const y2 = rowB.offsetTop + 4;
    for(let i=0;i<min;i++){
      const x = IA[i].offsetLeft + IA[i].offsetWidth/2;
      const ln = document.createElementNS(NS, "line");
      ln.setAttribute("x1", x); ln.setAttribute("y1", y1);
      ln.setAttribute("x2", x); ln.setAttribute("y2", y2);
      ln.setAttribute("class", "cmp-line"); svg.appendChild(ln);
      setTimeout(()=> ln.classList.add("show"), 130*i);
    }
    const longer = nA > nB ? IA : nB > nA ? IB : null;   // null when equal (nothing left over)
    if(longer) for(let i=min;i<longer.length;i++)
      setTimeout(()=> longer[i].classList.add("leftover"), 130*min + 160);
  }
  // reveal the matching (child taps मिलाओ, or the hint/tutorial calls this). cb fires after it settles.
  stage._revealMatches = (cb)=>{ if(!drawn){ drawn = true; btn.disabled = true; draw(); }
    if(cb) setTimeout(cb, 130*min + 800); };
  btn.onclick = ()=> stage._revealMatches();
  if(data.show_matches){ btn.style.display = "none"; setTimeout(()=> stage._revealMatches(), 420); }
  return stage;
}
/* HINT for "how many": instead of a text popup, COUNT the set FOR the child —
   highlight each object left→right, say एक/दो/तीन, show the numeral on top of it.
   The child sees + hears the count modelled, then answers from the options. */
function demoCount(items, numerals, onDone){
  numerals = numerals || [];
  const clear = ()=> items.forEach(o=>{ o.classList.remove("counting"); const c=o.querySelector(".count-callout"); if(c) c.remove(); });
  clear();
  let i = 0;
  (function step(){
    if(i >= items.length){                       // last count landed → clear, then continue
      setTimeout(()=>{ clear(); if(onDone) onDone(); }, 1000);
      return;
    }
    const o = items[i];
    o.classList.add("counting");
    let cal = o.querySelector(".count-callout");
    if(!cal){ cal = document.createElement("span"); cal.className = "count-callout"; o.appendChild(cal); }
    cal.textContent = String(i+1);   // Arabic count callout; Hindi number-word is spoken separately
    play("assets/Audio/vo_num_" + (i+1) + "." + AUDIO_EXT, ()=>{ i++; setTimeout(step, 320); });
  })();
}
function demoCountSet(setEl, count, numerals, onDone){   // count the "how many?" stimulus set
  demoCount([...setEl.querySelectorAll(".cobj")].slice(0, count), numerals, onDone);
}

/* ---------- 10b. DEVANAGARI GLYPH INK-CENTERING ----------
   Devanagari glyphs carry matras above (ओ, औ, अं) and below (ऋ) the shirorekha,
   so plain flex `align-items:center` leaves them sitting high with a gap below —
   and the offset differs per glyph. Measure each glyph's real ink box (canvas
   actualBoundingBox) + its baseline in the DOM, then translateY so the INK is
   truly centred in its tile/box. Font-agnostic; recomputed on mount + fonts.ready. */
let _inkCtx = null;
function centerInkGlyph(span){
  if(!span || !span.parentElement) return;
  const glyph = (span.textContent || "").trim();
  if(!glyph) return;
  const box = span.parentElement;
  const cs = getComputedStyle(span);
  const fpx = parseFloat(cs.fontSize);
  if(!fpx) return;
  _inkCtx = _inkCtx || document.createElement("canvas").getContext("2d");
  _inkCtx.font = `${cs.fontWeight} ${fpx}px ${cs.fontFamily}`;
  const m = _inkCtx.measureText(glyph);
  const a = m.actualBoundingBoxAscent, d = m.actualBoundingBoxDescent;
  if(!isFinite(a) || !isFinite(d)) return;
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  span.style.transform = "";   // reset before measuring baseline
  const probe = document.createElement("span");
  probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline;";
  span.appendChild(probe);
  const baseScreen = probe.getBoundingClientRect().top;
  span.removeChild(probe);
  const br = box.getBoundingClientRect();
  if(br.height < 5) return;    // not laid out yet
  const boxCenter = br.top + br.height/2;
  const inkCenter = baseScreen + ((d - a)/2) * scale;   // screen px
  const dy = (boxCenter - inkCenter) / scale;           // css px to move glyph down
  span.style.transform = `translateY(${dy}px)`;
}
function centerAllGlyphs(root){
  (root || document).querySelectorAll(".ink-glyph").forEach(centerInkGlyph);
}

/* ---------- 11. DRAG-DROP PRIMITIVE ---------- */
function makeDraggable(tileEl, onDrop){
  let startX=0, startY=0, dx=0, dy=0, dragging=false;
  let scale = 1;
  const refScale = ()=> scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  function onDown(e){
    if(tileEl.classList.contains("snapped") || tileEl.classList.contains("matched")) return;
    refScale();
    dragging = true;
    // bind move/up on the document ONLY while dragging (removed in onUp) — otherwise every tile leaves
    // stale document listeners that pile up across the 11 drag slides.
    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchmove", onMove, {passive:false});
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    const p = e.touches ? e.touches[0] : e;
    startX = p.clientX; startY = p.clientY;
    dx = 0; dy = 0;
    tileEl.classList.add("dragging");
    e.preventDefault();
  }
  function onMove(e){
    if(!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    dx = (p.clientX - startX) / scale; dy = (p.clientY - startY) / scale;
    tileEl.style.transform = `translate(${dx}px,${dy}px) scale(1.08)`;
    // highlight zone under — hide the tile from hit-testing so the dragged tile
    // (z-index 50, now covering the zone) doesn't mask the zone beneath it.
    const cx = p.clientX, cy = p.clientY;
    document.querySelectorAll(".dd-zone").forEach(z => z.classList.remove("hover"));
    tileEl.style.pointerEvents = "none";
    const under = document.elementFromPoint(cx, cy);
    tileEl.style.pointerEvents = "";
    const zone = under?.closest?.(".dd-zone");
    if(zone && !zone.classList.contains("filled")) zone.classList.add("hover");
    e.preventDefault();
  }
  function onUp(e){
    if(!dragging) return;
    dragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("mouseup", onUp);
    document.removeEventListener("touchend", onUp);
    tileEl.classList.remove("dragging");
    const p = e.changedTouches ? e.changedTouches[0] : e;
    // hide the tile from hit-testing so we detect the zone underneath it
    tileEl.style.pointerEvents = "none";
    const under = document.elementFromPoint(p.clientX, p.clientY);
    tileEl.style.pointerEvents = "";
    const zone = under?.closest?.(".dd-zone");
    document.querySelectorAll(".dd-zone").forEach(z => z.classList.remove("hover"));
    if(zone && !zone.classList.contains("filled")){
      // snap
      tileEl.style.transform = "";
      onDrop(zone, tileEl);
    } else {
      tileEl.style.transform = "";
    }
  }
  tileEl.addEventListener("mousedown", onDown);
  tileEl.addEventListener("touchstart", onDown, {passive:false});
}
/* shared wrong-drop response for drag/sort/sequence modules: soft buzz + Swiftie try-again pose + the
   authored spoken "try_again". Pre-readers need the SPOKEN recovery, not just the visual spring-back. */
function dragWrong(slide){ sfxWrongSoft(); setSwMood("tryagain"); play(audioFor(slide, "try_again") || null, ()=>{}); }

/* shared SUCCESS response — the engine-wide answer-feedback standard (lead-confirmed): side confetti
   cannons + rising sfx + Swiftie celebrates + the authored "correct" VO, then AUTO-ADVANCE. Never a
   celebration popup, never a "press आगे to continue" gate on a solved activity. `revealed` = the child
   got there via the reveal scaffold → quieter settle (no confetti/cheer) + completeSlide(false) so
   mastery telemetry stays honest. */
function celebrateThenAdvance(slide, revealed){
  if(revealed){ play(audioFor(slide, "reveal") || null, ()=>{}); setTimeout(()=> completeSlide(false), 1400); return; }
  sfxCorrect(); confettiCannon(); setSwMood("celebrate");
  play(audioFor(slide, "correct") || null, ()=>{});
  setTimeout(()=> completeSlide(true), 1400);
}

/* Reading-direction (H03 print concepts) shared builder: render `lines` (array of word arrays) as a
   book "page" of word-cards; return the page with page._cards (flat, in reading order, each tagged
   ._li/._wi) and optional page._buddy (a reading buddy sprite). Used by READ_PATH / TAP_READ_ARROW /
   TAP_READ_POS. ADDITIVE (r4f) — no existing module reads it. */
function readPage(lines, opts){
  opts = opts || {};
  const page = document.createElement("div"); page.className = "read-page";
  const flat = [];
  (lines || []).forEach((words, li)=>{
    const lineEl = document.createElement("div"); lineEl.className = "read-line";
    words.forEach((w, wi)=>{
      const c = document.createElement("div"); c.className = "read-word";
      c.innerHTML = `<span class="rw-text ink-glyph">${w}</span>`;
      c._li = li; c._wi = wi; lineEl.appendChild(c); flat.push(c);
    });
    page.appendChild(lineEl);
  });
  if(opts.buddy){
    const b = document.createElement("div"); b.className = "read-buddy";
    b.innerHTML = imgOrEmoji(opts.buddy_img, opts.buddy_emoji || "🐞", "rb-img", "rb-emoji");
    page.appendChild(b); page._buddy = b;
  }
  page._cards = flat;
  return page;
}

/* EVIDENCE comprehension helpers (H04 L03 शाब्दिक एवं अनुमान-आधारित बोध) — ADDITIVE (r4n); used only by
   STORY_READALONG / EVIDENCE_QA / FIND_EVIDENCE / QTYPE_RECAP. A passage = optional picture + the story
   text as sentence spans (each sentence has its own clip, so it can be read along / re-heard / tapped).
   evMark() lights the proof: literal → yellow highlight + "📖 उत्तर यहाँ लिखा है"; inference → dashed
   purple outline + "🔍 सुराग़" (the curriculum's "सुराग़ अलग टैग से दिखता है"). */
function evPassage(p, opts){
  p = p || {}; opts = opts || {};
  const card = document.createElement("div"); card.className = "ev-passage" + (opts.big ? " big" : "") +
    (p.poem ? " poem" : "") + (p.portrait ? " portrait" : "");
  if(p.image_id){ card.insertAdjacentHTML("beforeend", `<div class="ev-pic">${imgOrEmoji(p.image_id, "📖", "ev-img", "ev-emoji")}</div>`);
    if(p.fx === "tears") card.lastElementChild.appendChild(tearsFx(p.fx_eyes)); }   // passage.fx_eyes: the tears on this picture's own eyes
  const txt = document.createElement("div"); txt.className = "ev-text";
  const lines = [];
  (p.lines || []).forEach((ln, i)=>{
    const s = document.createElement("span"); s.className = "ev-line"; s.dataset.idx = String(i);
    s.innerHTML = `<span class="ev-l-text">${ln.text}</span>`;
    s._src = ln.audio ? ("assets/Audio/" + ln.audio + "." + AUDIO_EXT) : null;
    s._voText = s.textContent; s._words = evWordify(s.firstChild);
    txt.appendChild(s); txt.appendChild(document.createTextNode(" ")); lines.push(s);
  });
  card.appendChild(txt); card._lines = lines;
  return card;
}
/* evWordify(el): wrap each word of el's text (marks like the new word included) in a .ev-w span, in reading order */
function evWordify(el){
  const words = [];
  const walk = (node)=> Array.from(node.childNodes).forEach(n=>{
    if(n.nodeType === 3){ const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(p=>{ if(!p) return;
        if(/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
        else { const w = document.createElement("span"); w.className = "ev-w"; w.textContent = p; frag.appendChild(w); words.push(w); } });
      n.parentNode.replaceChild(frag, n); }
    else if(n.nodeType === 1) walk(n); });
  if(el) walk(el);
  return words;
}
/* evReadLine(line, cb): the sentence's VO with its words lighting one by one (the story pages' read-along) */
/* evReadLine(line, cb) + the MAGNIFYING GLASS (SME): while the VO reads, a magnifier glides from word to word with the
   voice; the word under the glass grows (.ev-w.on) and turns orange. The lens lives in the passage card, sized to the word. */
const LENS_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><defs>' +
  '<radialGradient id="evLensGlass" cx="34%" cy="30%" r="78%"><stop offset="0" stop-color="#fff" stop-opacity=".38"/>' +
  '<stop offset=".55" stop-color="#DDEEFF" stop-opacity=".14"/><stop offset="1" stop-color="#8CC0FF" stop-opacity=".3"/></radialGradient>' +
  '<linearGradient id="evLensHandle" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD64D"/><stop offset="1" stop-color="#E89400"/></linearGradient></defs>' +
  '<line x1="62" y1="62" x2="91" y2="91" stroke="#8A4B0F" stroke-width="13" stroke-linecap="round"/>' +
  '<line x1="62" y1="62" x2="90" y2="90" stroke="url(#evLensHandle)" stroke-width="8" stroke-linecap="round"/>' +
  '<circle cx="40" cy="40" r="30" fill="url(#evLensGlass)"/>' +
  '<circle cx="40" cy="40" r="30" fill="none" stroke="#1565F4" stroke-width="6"/>' +
  '<circle cx="40" cy="40" r="26.4" fill="none" stroke="#fff" stroke-width="1.4" opacity=".75"/>' +
  '<path d="M21 33 A20 20 0 0 1 33 20" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/></svg>';
function evLensFor(line){
  const card = line && line.closest(".ev-passage"); if(!card || !card.classList.contains("with-lens")) return null;   // tutorials only (T7, T8)
  if(!card._lens){ const l = document.createElement("div"); l.className = "ev-lens"; l.innerHTML = LENS_SVG; card.appendChild(l); card._lens = l; }
  return card._lens;
}
function evReadLine(line, cb){
  const lens = evLensFor(line), card = lens && lens.parentNode;
  const onWord = (i, w)=>{ if(!lens) return;
    clearTimeout(lens._hideT);
    if(!w){ lens._hideT = setTimeout(()=>{ lens.classList.remove("on"); card.classList.remove("ev-lensing"); }, 450); return; }
    const cr = card.getBoundingClientRect(), sc = (cr.width / card.offsetWidth) || 1, wr = w.getBoundingClientRect();
    const cx = (wr.left + wr.width / 2 - cr.left) / sc - card.clientLeft, cy = (wr.top + wr.height / 2 - cr.top) / sc - card.clientTop;
    const d = Math.max(64, Math.min(150, wr.width / sc * 1.3 + 22));   // glass diameter: the grown word fits inside
    const box = d / 0.6;                                               // the glass is 60% of the drawing
    lens.style.width = lens.style.height = box + "px";
    lens.style.transform = `translate(${cx - box * 0.4}px, ${cy - box * 0.4}px)`;
    if(!lens.classList.contains("on")){ lens.classList.add("snap"); void lens.offsetWidth; lens.classList.remove("snap"); }
    lens.classList.add("on"); card.classList.add("ev-lensing"); };
  readAlong(line._words || [], line._voText || "", line._src, cb, onWord);
}
function evMark(lines, idxs, qtype){
  (idxs || []).forEach(i=>{ const l = lines[i];
    if(!l || l.classList.contains("ev-hl") || l.classList.contains("ev-clue")) return;
    l.classList.add(qtype === "inference" ? "ev-clue" : "ev-hl");
    const t = document.createElement("span"); t.className = "ev-tag";
    t.textContent = qtype === "inference" ? "🔍 सुराग़" : "📖 उत्तर यहाँ लिखा है";
    l.insertBefore(t, l.firstChild); });
}
function evQtypeChip(qtype, label, icon){
  const el = document.createElement("div"); el.className = "ev-qtype " + (qtype === "inference" ? "inference" : "literal");
  const ic = icon || (qtype === "inference" ? "🔍" : "📖");
  const tx = label || (qtype === "inference" ? "अनुमान प्रश्न" : "सीधा प्रश्न");
  el.innerHTML = `<span class="ic">${ic}</span><span>${tx}</span>`;
  return el;
}

/* ---------- 12. SLIDE MODULES ---------- */
const SlideModules = {
  INTRO: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "intro-stage";
      const row  = document.createElement("div"); row.className = "intro-letters";
      const letters = slide.data.letters;
      const tapped = new Set();
      const tiles = [];
      // Size tiles to the letter count so the single row ALWAYS fits the stage.
      // Available width = stage(1333) - slide padding(2×150) + intro breakout(2×100)
      // ≈ 1233; use 1220 for safety. Cap at 184 (so a 6-letter set looks unchanged),
      // floor at 110. font scales with the tile (≈0.565 of size, i.e. 104/184).
      const GAP = 20, MAXW = 1220, n = letters.length;
      const tSize = Math.max(110, Math.min(184, Math.floor((MAXW - (n-1)*GAP) / n)));
      const tFont = Math.round(tSize * 0.565);
      row.style.gap = GAP + "px";
      // hand-nudge points at the first letter not yet tapped — guides every box
      function nudgeNext(){
        for(let i=0;i<letters.length;i++){
          if(!tapped.has(letters[i])){ pointNudgeAt(tiles[i]); return; }
        }
        stopNudge();
      }
      letters.forEach((L, i) => {
        const tile = document.createElement("div"); tile.className = "intro-letter";
        tile.style.width = tile.style.height = tSize + "px";
        tile.style.fontSize = tFont + "px";
        tile.innerHTML = `<span class="ink-glyph">${L}</span>`;
        tile.onclick = ()=>{
          tile.classList.add("played");
          const phon = slide.data.phonemes && slide.data.phonemes[L];
          play(phon ? "assets/Audio/" + phon + "." + AUDIO_EXT : null);
          SwiftPAL.emit("intro_letter_tap", { slide_id: slide.id, letter: L });
          tapped.add(L);
          // नav unlocks only after EVERY letter has been heard
          if(tapped.size >= letters.length){ stopNudge(); setNavActive(true); }
          else { nudgeNext(); }
        };
        row.appendChild(tile); tiles.push(tile);
      });
      wrap.appendChild(row);
      host.appendChild(wrap);

      setNavActive(false);
      $("navBtn").onclick = ()=>{ if(tapped.size >= letters.length) completeSlide(true); };
      nudgeNext();   // start by guiding the first letter
    }
  },

  MEET_LETTER: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "meet-stage";
      if(slide.data.pair){
        const pair = document.createElement("div"); pair.className = "meet-pair";
        slide.data.pair.forEach(p => {
          const item = document.createElement("div"); item.className = "meet-pair-item";
          item.innerHTML = `
            <div class="meet-letter-box"><span class="glyph ink-glyph">${p.letter}</span></div>
            <div class="meet-arrow">→</div>
            <div class="meet-pic-box">
              ${imgOrEmoji(p.picture_img, p.picture_emoji, "pic-img", "pic-emoji")}
              <span class="pic-label">${p.word_hi}</span>
            </div>`;
          pair.appendChild(item);
        });
        wrap.appendChild(pair);
      } else {
        wrap.innerHTML = `
          <div class="meet-letter-box"><span class="glyph ink-glyph">${slide.data.letter}</span></div>
          <div class="meet-arrow">→</div>
          <div class="meet-pic-box">
            ${imgOrEmoji(slide.data.picture_img, slide.data.picture_emoji, "pic-img", "pic-emoji")}
            <span class="pic-label">${slide.data.word_hi}</span>
          </div>`;
      }
      host.appendChild(wrap);
      // नav unlocks only after the VO has played once (students can't skip the model)
      state.gateNavUntilAudio = true;
      setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  /* ===== SHAPES (maths) — reuse the same scaffold/nudge/feedback as letters ===== */
  SHAPE_INTRO: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "intro-stage";
      const row  = document.createElement("div"); row.className = "intro-shapes";
      const shapes = slide.data.shapes; const tapped = new Set(); const tiles = [];
      const GAP = 28, MAXW = 1220, n = shapes.length;
      const tSize = Math.max(120, Math.min(184, Math.floor((MAXW - (n-1)*GAP) / n)));
      row.style.gap = GAP + "px";
      function nudgeNext(){
        for(let i=0;i<shapes.length;i++){ if(!tapped.has(i)){ pointNudgeAt(tiles[i]); return; } }
        stopNudge();
      }
      shapes.forEach((sh, i) => {
        const tile = document.createElement("div"); tile.className = "intro-shape";
        tile.style.width = tile.style.height = tSize + "px";
        // name label (revealed on tap — child hears the name AND sees it on top of the shape)
        tile.innerHTML = `<span class="shape-name">${sh.name || ""}</span>` +
                         shapeSVG(sh.shape, {color: sh.color, size: Math.round(tSize*0.62), rotate: sh.rotate});
        tile.onclick = ()=>{
          tile.classList.add("played");
          play(sh.name_audio ? "assets/Audio/" + sh.name_audio + "." + AUDIO_EXT : null);
          SwiftPAL.emit("intro_shape_tap", { slide_id: slide.id, shape: sh.shape });
          tapped.add(i);
          if(tapped.size >= shapes.length){ stopNudge(); setNavActive(true); }
          else { nudgeNext(); }
        };
        row.appendChild(tile); tiles.push(tile);
      });
      wrap.appendChild(row); host.appendChild(wrap);
      setNavActive(false);
      $("navBtn").onclick = ()=>{ if(tapped.size >= shapes.length) completeSlide(true); };
      nudgeNext();
    }
  },

  MEET_SHAPE: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "meet-stage";
      wrap.innerHTML = `
        <div class="meet-shape-box">
          ${shapeSVG(slide.data.shape, {color: slide.data.color, size: 190, rotate: slide.data.rotate})}
          <span class="label">${slide.data.name}</span>
        </div>
        <div class="meet-arrow">→</div>
        <div class="meet-pic-box">
          ${imgOrEmoji(slide.data.object_img, slide.data.object_emoji, "pic-img", "pic-emoji")}
          <span class="pic-label">${slide.data.object_hi}</span>
        </div>`;
      host.appendChild(wrap);
      state.gateNavUntilAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  TAP_SHAPE_BY_NAME: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "shape_name_first_try",
        stimulus: (()=> {
          const el = document.createElement("div"); el.className = "stimulus-pic"; el.style.cursor = "pointer";
          el.innerHTML = `<span class="emoji">🔊</span><span class="lbl">${slide.data.name || "नाम सुनो"}</span>`;
          el.onclick = ()=>{ state.audioReplays++; play(audioFor(slide,"shape_name") || null); };
          return el;
        })(),
        options: slide.data.options,
        isCorrect: (opt) => opt.shape === slide.data.target,
        optionRenderer: (opt) => shapeCell(opt)
      });
    }
  },

  TAP_SHAPE_BY_PICTURE: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "shape_env_first_try",
        stimulus: stimulusPic(slide.data.object_hi, slide.data.object_emoji, slide.data.object_img),
        options: slide.data.options,
        isCorrect: (opt) => opt.shape === slide.data.target,
        optionRenderer: (opt) => shapeCell(opt)
      });
    }
  },

  TAP_PICTURE_BY_SHAPE: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "shape_object_first_try",
        stimulus: stimulusShape({shape: slide.data.shape, color: slide.data.color, rotate: slide.data.rotate}),
        options: slide.data.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => pictureCell(opt.object_hi, opt.object_emoji, opt.object_img)
      });
    }
  },

  SORT_SHAPE: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "sort-stage shape-sort";
      const binsRow = document.createElement("div");
      binsRow.className = "sort-bins" + (slide.data.bins.length >= 4 ? " many" : "");
      slide.data.bins.forEach(b => {
        const bin = document.createElement("div");
        bin.className = "sort-bin dd-zone";            // dd-zone → drop detection
        bin.dataset.shape = b.shape;
        // header (faint reference shape + label) INSIDE the box, then a clear drop area
        bin.innerHTML = `<div class="bin-head-row"><span class="bin-ref">${shapeSVG(b.shape, {color:"#AEB9CC", size:34})}</span><span class="bin-title">${b.label}</span></div>`+
          `<div class="bin-items"></div>`;
        binsRow.appendChild(bin);
      });
      const tray = document.createElement("div"); tray.className = "sort-tray";
      const items = slide.data.items.slice().sort(()=> Math.random() - 0.5);
      items.forEach(it => {
        const t = document.createElement("div"); t.className = "sort-item"; t.dataset.shape = it.shape;
        t.innerHTML = shapeSVG(it.shape, {color: it.color, size: 70, rotate: it.rotate});
        tray.appendChild(t);
      });
      wrap.appendChild(binsRow); wrap.appendChild(tray);
      host.appendChild(wrap);

      state.attempts = 0; state.locked = false;
      let placed = 0; const need = slide.data.items.length;
      [...tray.children].forEach(tile => {
        makeDraggable(tile, (zone, t) => {
          const bin = zone.closest(".sort-bin"); if(!bin) return;
          state.attempts++;
          if(bin.dataset.shape === t.dataset.shape){
            t.classList.add("snapped");
            bin.querySelector(".bin-items").appendChild(t);
            placed++;
            SwiftPAL.emit("shape_sort_item", { slide_id: slide.id, shape: t.dataset.shape, attempts: state.attempts });
            if(placed === need){
              state.locked = true;
              SwiftPAL.emit("shape_sort_correct", {
                slide_id: slide.id, phase: slide.phase, value: true,
                attempts: state.attempts, latency_ms: Date.now() - state.slideStart
              });
              setTimeout(()=> celebrateThenAdvance(slide, false), 250);   // standard: confetti + VO + auto-advance, no popup
            }
          } else {
            bin.classList.add("hover"); bin.style.borderColor = "var(--wrong)";
            setTimeout(()=>{ bin.classList.remove("hover"); bin.style.borderColor = ""; }, 500);
            dragWrong(slide);   // buzz + Swiftie + spoken try_again (pre-readers need the spoken recovery)
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          }
        });
      });
    }
  },

  /* ===== COUNTING (maths) — OTO tap-count, cardinality, meet-number, make-set ===== */
  COUNT_TAP: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "count-stage";
      const row  = document.createElement("div"); row.className = "count-row";
      const N = slide.data.count, obj = slide.data.object, nums = slide.data.numerals || [];
      const items = []; let c = 0;
      for(let i=0;i<N;i++){
        const it = document.createElement("div"); it.className = "count-item";
        it.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji") + `<span class="count-badge"></span>`;
        row.appendChild(it); items.push(it);
      }
      wrap.appendChild(row); host.appendChild(wrap);

      function nudgeNext(){ const nx = items.find(x=>!x.classList.contains("counted")); if(nx) pointNudgeAt(nx); else stopNudge(); }
      items.forEach(it => {
        it.onclick = ()=>{
          if(it.classList.contains("counted")) return;   // one-to-one: never double-count
          c++; it.classList.add("counted");
          it.querySelector(".count-badge").textContent = String(c);   // Arabic running count; Hindi word spoken separately
          SwiftPAL.emit("count_tap", { slide_id: slide.id, phase: slide.phase, n: c });
          if(c >= N){
            stopNudge();
            SwiftPAL.emit("count_oto_complete", { slide_id: slide.id, phase: slide.phase,
              total: N, value: true, latency_ms: Date.now()-state.slideStart });
            // say the LAST number, then the total; enable आगे ONLY after "कुल N" finishes
            play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT, ()=> setTimeout(()=>
              play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, ()=> setNavActive(true)), 300));
          } else {
            play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT);    // one number word per touch
            nudgeNext();
          }
        };
      });
      setNavActive(false);
      $("navBtn").onclick = ()=>{ if(c >= N) completeSlide(true); };
      nudgeNext();
    }
  },

  MEET_NUMBER: {
    mount(host, slide){
      if(slide.data && slide.data.present === "crane"){ return btCraneMeet(host, slide); }   // Block Town teach
      const wrap = document.createElement("div"); wrap.className = "meet-stage number-meet";
      let objs = ""; for(let i=0;i<slide.data.count;i++) objs += imgOrEmoji(slide.data.object.img, slide.data.object.emoji, "cobj-img", "cobj-emoji");
      wrap.innerHTML = `
        <div class="meet-number-box"><span class="num-glyph">${slide.data.count}</span>${fingerCount(slide.data.count,'meet-hand')}</div>
        <div class="meet-arrow">→</div>
        <div class="count-set meet-set">${objs}</div>`;
      host.appendChild(wrap);
      state.gateNavUntilAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  COUNT_HOW_MANY: {
    mount(host, slide){
      const setEl = stimulusCountSet(slide.data.count, slide.data.object);
      mountTapOptions({
        slide, host, signalName: "cardinality_first_try",
        stimulus: setEl,
        nudgeTarget: null,   // nothing to re-tap here → no idle hand
        options: slide.data.options,
        columnsHint: Math.min(slide.data.options.length, 5),
        isCorrect: (opt) => opt.value === slide.data.count,
        optionRenderer: (opt) => numFingerCell(opt.value),   // DUAL-CODED: the numeral (what they're learning) + a supporting finger-hand
        mastery: slide.phase === "mastery",
        // HINT = count the set FOR the child (highlight + say एक/दो/तीन + numeral on top)
        hintAction: (done) => demoCountSet(setEl, slide.data.count, slide.data.numerals, done)
      });
    }
  },

  MAKE_SET: {
    mount(host, slide){
      const N = slide.data.target, obj = slide.data.object;
      const wrap = document.createElement("div"); wrap.className = "makeset-stage";
      wrap.innerHTML = `
        <div class="makeset-target"><span class="ms-label">डालो</span><span class="num-glyph">${devNumeral(slide.data.target)}</span>${imgOrEmoji(obj.img, obj.emoji, "ms-goal-obj", "ms-goal-emoji")}</div>
        <div class="makeset-frame" id="msFrame"></div>
        <button class="makeset-add" id="msAdd"><span class="ms-add-plus">＋</span>${imgOrEmoji(obj.img, obj.emoji, "ms-add-obj", "ms-add-emoji")}</button>`;
      host.appendChild(wrap);
      const frame = wrap.querySelector("#msFrame"), addBtn = wrap.querySelector("#msAdd");
      const numerals = slide.data.numerals || [];
      const MAXITEMS = 5;                          // never allow more than 5
      let c = 0; state.attempts = 0; state.locked = false; state.hintActive = false;
      const refreshNav = ()=> setNavActive(!state.locked && !state.hintActive && c === N);  // आगे activates ONLY at exactly N — no premature/wrong submit; child self-corrects by adding more / removing (×). Nudge on the add-button guides an idle child.
      function makeItem(){
        const it = document.createElement("div"); it.className = "ms-item";
        it.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji") + `<span class="ms-del" aria-label="हटाओ">×</span>`;
        const remove = (e)=>{ if(e) e.stopPropagation(); if(state.locked || state.hintActive) return; it.remove(); c--; refreshNav(); };
        // remove ONLY via the explicit × badge — tapping the object itself must NOT delete it
        // (the count tutorial teaches "tap the object to count it"; a placed apple that vanishes on tap
        //  would silently destroy the child's work)
        it.querySelector(".ms-del").onclick = remove;
        frame.appendChild(it); return it;
      }
      addBtn.onclick = ()=>{
        if(state.locked || state.hintActive) return;
        if(c >= MAXITEMS){ addBtn.classList.add("shake"); setTimeout(()=> addBtn.classList.remove("shake"), 420); return; }  // cap at 5
        c++; makeItem();
        play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT);   // count up as you add
        SwiftPAL.emit("make_set_add", { slide_id: slide.id, count: c });
        refreshNav();
      };
      // HINT = count what the child actually placed (highlight + say the number)
      const runHint = (after)=>{
        state.hintActive = true; refreshNav();
        demoCount([...frame.querySelectorAll(".ms-item")], numerals, ()=>{ state.hintActive = false; refreshNav(); if(after) after(); });
      };
      $("hintBtn").onclick = ()=>{ if(state.locked || state.hintActive) return;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true }); runHint(); };
      // आगे = SUBMIT. correct → celebrate & advance. wrong → graduated scaffold, same as
      // everywhere: 1st = try again, 2nd = count-demo hint, 3rd = REVEAL (auto-fix to N,
      // count 1..N automatically, then move to the next slide).
      $("navBtn").onclick = ()=>{
        if(state.locked || state.hintActive || c !== N) return;   // gated to exactly N → only the correct-set path runs (self-correcting design)
        if(c === N){
          state.locked = true; refreshNav();
          SwiftPAL.emit("make_set_correct", { slide_id: slide.id, phase: slide.phase,
            value: true, target: N, attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
          play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, ()=>
            celebrateThenAdvance(slide, false));   // standard: confetti + VO + auto-advance, no popup
          return;
        }
        state.attempts++;
        SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts, made: c, target: N });
        const maxA = (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
        $("hintBtn").classList.add("show");
        if(state.attempts >= maxA){
          // 3rd wrong → reveal: correct the set to exactly N, count it 1..N, then advance
          state.locked = true; state.scaffoldLevel = 3; refreshNav();
          while(frame.querySelectorAll(".ms-item").length > N) frame.querySelector(".ms-item:last-child").remove();
          while(frame.querySelectorAll(".ms-item").length < N) makeItem();
          c = N;
          SwiftPAL.emit("answer_revealed", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          state.hintActive = true;
          // count the (now-correct) set 1..N, then say the total "कुल N", then advance
          demoCount([...frame.querySelectorAll(".ms-item")], numerals, ()=>{
            state.hintActive = false;
            play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, ()=> setTimeout(()=> completeSlide(false), 500));
          });
        } else if(state.attempts === 2){
          runHint();                                                   // 2nd wrong → count what they made
        } else {
          // 1st wrong → try again, WITH the spoken VO (was silent)
          showBox("", audioText(slide,"try_again") || "फिर से कोशिश करो।", "wrong", audioFor(slide,"try_again"), ()=>{});
        }
      };
      setNavActive(false);
      pointNudgeAt(addBtn);
    }
  },

  COMPARE_SETS: {
    // Two visible groups, TWO picture options — the child taps the object that has MORE (or LESS).
    // No बराबर chip (lead review): equality is taught in MEET_COMPARE + produced on the see-saw, so
    // a judge question always has one clear answer between the two objects. Tap-to-answer: a wrong
    // tap buzzes + crosses + locks that card; the right one confetti-cheers + advances.
    mount(host, slide){
      const d = slide.data;
      const stage = stimulusCompareSets(d);
      // JUDGE (test): hide the "मिलाओ" reveal button — its one-to-one reveal + leftover glow gives the
      // answer away (and on a "less" question it glows the MORE set, pointing at the WRONG option).
      // The two rows stay visible so the child still compares by eye. (Reveal stays only on MEET_COMPARE.)
      const mb = stage.querySelector(".cmp-match-btn"); if(mb) mb.style.display = "none";
      const answer = (d.ask === "less") ? (d.a_count < d.b_count ? "a" : "b")
                                        : (d.a_count > d.b_count ? "a" : "b");
      const options = [ {kind:"a", obj:d.a_object}, {kind:"b", obj:d.b_object} ];
      // (option shuffle is now centralized in mountTapOptions — no per-module reverse needed)
      mountTapOptions({
        slide, host, signalName: "compare_first_try",
        stimulus: stage,
        nudgeTarget: null,
        options,
        columnsHint: 2,
        isCorrect: (opt)=> opt.kind === answer,
        optionRenderer: (opt)=>{
          const cell = document.createElement("div");
          cell.innerHTML = imgOrEmoji(opt.obj.img, opt.obj.emoji, "pic-img", "cmp-chip-emoji")
            + `<span class="cmp-chip-lbl">${opt.obj.word_hi || ""}</span>`;
          return cell;
        },
        mastery: slide.phase === "mastery"
      });
    }
  },

  MEET_COMPARE: {
    // TEACH BY DOING (lead review): the child COUNTS each group by tapping its objects one-by-one
    // (running numeral + spoken एक/दो/तीन), the top group then the bottom. Then the one-to-one
    // match reveals, the leftover glows, and Swiftie EXPLAINS the outcome by name — e.g.
    // "एक सेब बच गया, सेब ज़्यादा हैं, केले कम" / "कुछ नहीं बचा, दोनों बराबर". आगे appears after.
    mount(host, slide){
      const d = slide.data;
      const wrap = document.createElement("div"); wrap.className = "meet-compare";
      const stage = stimulusCompareSets({a_object:d.a_object, a_count:d.a_count,
                                          b_object:d.b_object, b_count:d.b_count, show_matches:false});
      const mb = stage.querySelector(".cmp-match-btn"); if(mb) mb.style.display = "none";
      const verdict = document.createElement("div");
      verdict.className = "cmp-verdict " + (d.outcome || "more");
      verdict.textContent = d.label_hi || "";
      wrap.appendChild(stage); wrap.appendChild(verdict);
      host.appendChild(wrap);

      state.gateNavUntilAudio = false; state.locked = false; state.ownsAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=>{ if(state.locked) completeSlide(true); };

      // 🔊 replay: re-hear the teach line (and, once revealed, the explanation). autoPlayChain skips
      // count_intro/explain, so without this the header chip would be silent on teach slides.
      let revealed = false;
      state.replayAudio = ()=>{ const chain = [audioFor(slide, "count_intro")];
        if(revealed) chain.push(audioFor(slide, "explain"));
        playChain(chain.filter(Boolean), 0); };

      const rowA = [...stage.querySelectorAll(".cmp-row.top .cobj")];
      const rowB = [...stage.querySelectorAll(".cmp-row.bot .cobj")];

      // make one row countable-by-tapping; cb fires once every item in it is counted
      function countRow(items, cb){
        const nudgeNext = ()=>{ const nx = items.find(o=>!o.classList.contains("counted"));
          if(nx) pointNudgeAt(nx); else stopNudge(); };
        let n = 0;
        items.forEach(o=>{
          o.classList.add("tappable");
          o.onclick = ()=>{
            if(state.locked || o.classList.contains("counted")) return;
            o.classList.add("counted", "counting"); n++; sfxTap();
            let cal = o.querySelector(".count-callout");
            if(!cal){ cal = document.createElement("span"); cal.className = "count-callout"; o.appendChild(cal); }
            cal.textContent = n;
            play("assets/Audio/vo_num_" + n + "." + AUDIO_EXT, ()=>{});
            if(items.every(x=>x.classList.contains("counted"))){ stopNudge(); setTimeout(cb, 550); }
            else nudgeNext();
          };
        });
        nudgeNext();
      }

      // intro VO → count group A → count group B → reveal match + explain the outcome.
      // NB: uses non-autochain role names (count_intro / explain) so mountSlide's autoPlayChain
      // does NOT also fire the intro — this module owns its own audio sequence.
      play(audioFor(slide, "count_intro") || null, ()=>{
        countRow(rowA, ()=> countRow(rowB, ()=>{
          stage._revealMatches(()=>{
            verdict.classList.add("show"); setSwMood("point");
            state.locked = true; revealed = true; setNavActive(true);
            play(audioFor(slide, "explain") || null, ()=>{});
          });
        }));
      });
    }
  },

  MAKE_EQUAL: {
    // PRODUCE mechanic (see-saw): the left pan holds a fixed group; the child taps + जोड़ो to
    // add to the right pan (tap an added item to take it back). The beam tilts toward the heavier
    // side in real time; at equal it levels, locks, celebrates. Overshoot is enacted (invite to
    // remove), never a red ✗ — the KG "produce, don't pick" model.
    mount(host, slide){
      const d = slide.data, L = d.a_count, fixedObj = d.a_object, addObj = d.b_object;
      const MAXR = d.max || Math.max(L + 2, 6);
      const wrap = document.createElement("div"); wrap.className = "balance-stage";
      wrap.innerHTML = `
        <div class="balance">
          <div class="beam-wrap" id="beamWrap"><div class="beam"></div>
            <div class="pan pan-left"><div class="pan-grid" id="panL"></div></div>
            <div class="pan pan-right"><div class="pan-grid" id="panR"></div></div></div>
          <div class="fulcrum"></div>
        </div>
        <button class="balance-add" id="balAdd" type="button"></button>`;
      host.appendChild(wrap);
      const panL = wrap.querySelector("#panL"), panR = wrap.querySelector("#panR");
      const beam = wrap.querySelector("#beamWrap"), addBtn = wrap.querySelector("#balAdd");
      const balance = wrap.querySelector(".balance");
      addBtn.innerHTML = imgOrEmoji(addObj.img, addObj.emoji, "cobj-img", "cobj-emoji") + `<span>+ जोड़ो</span>`;
      for(let i=0;i<L;i++){ const c=document.createElement("span"); c.className="cobj";
        c.innerHTML = imgOrEmoji(fixedObj.img, fixedObj.emoji, "cobj-img", "cobj-emoji"); panL.appendChild(c); }
      let right = 0; state.locked = false; state.attempts = 0; let tipT = 0;
      const TILT = 6, TMAX = 15;
      const tilt = ()=>{ const diff = right - L; const deg = Math.max(-TMAX, Math.min(TMAX, diff*TILT));
        beam.style.transform = `translateX(-50%) rotate(${deg}deg)`; balance.classList.toggle("level", diff===0 && right>0); };
      const check = ()=>{ if(state.locked) return; const diff = right - L;
        if(diff===0 && right>0){ state.locked = true; setNavActive(true);
          SwiftPAL.emit("make_equal_correct", { slide_id: slide.id, phase: slide.phase, value: true,
            count: right, target: L, attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
          showBox("⚖️", audioText(slide,"balanced") || "बराबर! दोनों बराबर हैं।", "correct", audioFor(slide,"balanced") || null, ()=>{});
        } else if(diff > 0){ state.attempts++;
          SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, made: right, target: L });
          if(Date.now()-tipT > 1200){ tipT = Date.now();
            showBox("", audioText(slide,"too_many") || "बहुत ज़्यादा! एक हटाओ।", "hint", audioFor(slide,"too_many"), ()=>{}); } }
      };
      const addItem = ()=>{ const c=document.createElement("span"); c.className="cobj added";
        c.innerHTML = imgOrEmoji(addObj.img, addObj.emoji, "cobj-img", "cobj-emoji");
        c.onclick = ()=>{ if(state.locked) return; c.remove(); right = Math.max(0, right-1); tilt(); check(); };
        panR.appendChild(c); right++; };
      addBtn.onclick = ()=>{ if(state.locked) return;
        if(right >= MAXR){ addBtn.classList.add("shake"); setTimeout(()=> addBtn.classList.remove("shake"), 400); return; }
        addItem(); tilt(); sfxTap();
        // count EVERY added item aloud INCLUDING the final/target one (एक, दो, तीन) — then, on the
        // last count, the "बराबर" VO follows (check runs in the count's onEnd so the number isn't cut).
        if(right <= L) play("assets/Audio/vo_num_" + right + "." + AUDIO_EXT, right === L ? ()=> check() : ()=>{});
        else check();   // overshoot → "एक हटाओ" hint
      };
      setNavActive(false);
      $("navBtn").onclick = ()=>{ if(state.locked) completeSlide(true); };
      tilt();                 // START tilted toward the heavier (left) group — the see-saw is NOT level yet
      pointNudgeAt(addBtn);
    }
  },

  MEET_PATTERN: {
    // TEACH: show a repeating pattern and pulse the repeating UNIT (first data.unit_len cells) a few
    // times so the child sees "this part comes again". Nav gated on the VO, like MEET_NUMBER.
    mount(host, slide){
      const d = slide.data;
      const wrap = document.createElement("div"); wrap.className = "pattern-stage";
      const lbl = document.createElement("div"); lbl.className = "pat-unit-lbl"; lbl.textContent = "यह हिस्सा दोहराता है 🔁";
      const row = document.createElement("div"); row.className = "pattern-row";
      d.items.forEach(o=>{ const c = document.createElement("div"); c.className = "pat-cell";
        c.innerHTML = imgOrEmoji(o.img, o.emoji, "cobj-img", "cobj-emoji"); row.appendChild(c); });
      wrap.appendChild(lbl); wrap.appendChild(row); host.appendChild(wrap);
      state.gateNavUntilAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
      const cells = [...row.children]; let rep = 0;
      const glow = ()=>{ cells.forEach((c,i)=> { if(i < d.unit_len) c.classList.add("unit-glow"); });
        setTimeout(()=> cells.forEach(c=> c.classList.remove("unit-glow")), 1100); };
      glow(); const t = setInterval(()=>{ if(rep++ >= 2){ clearInterval(t); return; } glow(); }, 1700);
    }
  },

  PATTERN_BUILD: {
    // PRODUCE: a pattern with empty ghost slot(s) — at the END (extend) or in the MIDDLE (fill the
    // gap). Tap a tray item to drop it into the active slot; the correct item = data.items[slot].
    // Wrong taps bounce (enacted, no ✗). Fill every blank → complete. data:{items[],blanks[],tray[]}.
    mount(host, slide){
      const d = slide.data;
      const wrap = document.createElement("div"); wrap.className = "pattern-stage";
      const row = document.createElement("div"); row.className = "pattern-row";
      const cells = d.items.map((o,i)=>{
        const c = document.createElement("div");
        if(d.blanks.includes(i)){ c.className = "pat-ghost"; c.innerHTML = `<span class="qmark">?</span>`; }
        else { c.className = "pat-cell"; c.innerHTML = imgOrEmoji(o.img, o.emoji, "cobj-img", "cobj-emoji"); }
        row.appendChild(c); return c;
      });
      const tray = document.createElement("div"); tray.className = "pattern-tray";
      d.tray.forEach(o=>{ const t = document.createElement("div"); t.className = "pat-tray-item"; t._obj = o;
        t.innerHTML = imgOrEmoji(o.img, o.emoji, "cobj-img", "cobj-emoji"); tray.appendChild(t); });
      wrap.appendChild(row); wrap.appendChild(tray); host.appendChild(wrap);
      const blanks = d.blanks.slice(); let bi = 0, wrongStreak = 0, revealedAny = false;
      state.locked = false; state.attempts = 0;
      const key = (o)=> o.img || o.emoji;
      const activeGhost = ()=> cells[blanks[bi]];
      const markActive = ()=>{ cells.forEach(c=> c.classList.remove("active"));
        // idle nudge points at the ACTIVE BLANK ('?' slot = "put one here"), re-armed per blank —
        // NEVER at a tray answer; startNudge is phase-aware so it's silent in practice/mastery.
        if(bi < blanks.length){ activeGhost().classList.add("active"); startNudge(slide, activeGhost()); } else stopNudge(); };
      const flashHint = ()=>{ const want = d.items[blanks[bi]], g = activeGhost(); const prev = g.innerHTML;
        g.innerHTML = imgOrEmoji(want.img, want.emoji, "cobj-img", "cobj-emoji"); g.style.opacity = ".4";
        setTimeout(()=>{ if(g.classList.contains("pat-ghost")){ g.innerHTML = prev; g.style.opacity = ""; } }, 950); };
      const placeCorrect = ()=>{                      // one placement path (tap AND reveal)
        const want = d.items[blanks[bi]], g = activeGhost();
        g.className = "pat-cell"; g.innerHTML = imgOrEmoji(want.img, want.emoji, "cobj-img", "cobj-emoji");
        g.classList.add("unit-glow"); setTimeout(()=> g.classList.remove("unit-glow"), 700); bi++;
        if(bi >= blanks.length){
          state.locked = true; stopNudge();
          SwiftPAL.emit("pattern_extend_correct", { slide_id: slide.id, phase: slide.phase, value: !revealedAny,
            attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
          // engine standard: confetti + cheer + correct VO + AUTO-advance — no popup, no आगे gate.
          celebrateThenAdvance(slide, revealedAny);
        } else markActive();
      };
      markActive();
      tray.querySelectorAll(".pat-tray-item").forEach(t=>{
        t.onclick = ()=>{
          if(state.locked || bi >= blanks.length) return;
          stopNudge();
          const want = d.items[blanks[bi]];
          if(key(t._obj) === key(want)){
            wrongStreak = 0;
            placeCorrect();
          } else {
            state.attempts++;
            t.classList.add("shake"); setTimeout(()=> t.classList.remove("shake"), 420);
            activeGhost().classList.add("shake"); setTimeout(()=> activeGhost().classList.remove("shake"), 420);
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
            $("hintBtn").classList.add("show");
            // layered ladder, standard-aligned: L1 spoken try-again (buzz + Swiftie, no popup) →
            // L2 flash the answer ghost + spoken hint → L3 reveal ceiling: DEMONSTRATE the placement.
            if(++wrongStreak >= (CARD.scaffold_rules.max_attempts||3)){
              revealedAny = true; wrongStreak = 0;
              activeGhost().classList.add("reveal-glow");
              play(audioFor(slide,"reveal") || audioFor(slide,"hint") || null, ()=>{});
              setTimeout(()=>{ placeCorrect(); }, 1000);
            }
            else if(state.attempts >= 2){ flashHint(); play(audioFor(slide,"hint") || null, ()=>{}); }
            else dragWrong(slide);
          }
        };
      });
      setNavActive(false);
      $("navBtn").onclick = ()=>{};   // completion is automatic now — आगे never gates a solved pattern
      $("hintBtn").onclick = ()=>{ if(!state.locked && bi < blanks.length) flashHint(); };
      // NB: the idle nudge is armed by markActive() → startNudge(activeGhost) above — it points at the
      // BLANK, phase-aware. (Bug fix: was pointNudgeAt(first tray tile) = an immediate hand on the WRONG
      // answer on most slides, and it showed even in mastery.)
    }
  },

  BUILD_TO_NUMBER: {
    // Signature produce module. data: {target, mode:'guided'|'independent', topper, friend, goal_hi,
    // skyline_done, skyline_total}. Guided = dashed blueprint, auto-completes on fill. Independent =
    // free stack + "बन गया!" serve with world-enacted feedback (short/teeter, never a ✗). Ascending-
    // pitch thunk + spoken एक/दो/… per block. Geometry via offsets (throttle-safe).
    mount(host, slide){
      const d = slide.data, N = d.target, mode = d.mode || "independent";
      const stage = document.createElement("div"); stage.className = "bt-stage";
      const board = document.createElement("div"); board.className = "bt-board";
      board.innerHTML = `<span class="bt-numeral">${N}</span>` +
        (d.topper ? `<img class="bt-goalpic" src="assets/Images/${d.topper}.webp" alt="">` : "") +
        (d.goal_hi ? `<span class="bt-goallbl">${d.goal_hi}</span>` : "");
      const track = document.createElement("div"); track.className = "bt-track"; const cells = [];
      for(let i=1;i<=N;i++){ const c = document.createElement("div"); c.className = "bt-nt"; track.appendChild(c); cells.push(c); }
      const yard = document.createElement("div"); yard.className = "bt-yard";
      const crane = document.createElement("div"); crane.className = "bt-crane"; crane.innerHTML = `<img src="assets/Images/obj_crane.webp" alt="">`;
      const pile = document.createElement("div"); pile.className = "bt-pile";
      pile.innerHTML = `<div class="bt-pile-blocks"></div><span class="bt-pile-lbl">＋ ब्लॉक</span>`;
      const pb = pile.querySelector(".bt-pile-blocks");
      for(let i=0;i<3;i++){ const b = btBlock(i+1); b.style.left = (i*12) + "px"; b.style.bottom = (i*18) + "px"; pb.appendChild(b); }
      const plotwrap = document.createElement("div"); plotwrap.className = "bt-plotwrap";
      const plot = document.createElement("div"); plot.className = "bt-plot ground " + mode;
      plot.style.setProperty("--bh", Math.max(20, Math.min(46, Math.floor(230/N) - 2)) + "px");   // tall towers auto-shrink to fit
      plotwrap.appendChild(plot);
      const friend = document.createElement("div"); friend.className = "bt-friend";
      if(d.friend) friend.innerHTML = `<img src="assets/Images/${d.friend}.webp" alt="">`;
      yard.appendChild(crane); yard.appendChild(pile); yard.appendChild(plotwrap); if(d.friend) yard.appendChild(friend);
      stage.appendChild(board); stage.appendChild(track); stage.appendChild(yard);
      if(d.skyline_total) stage.appendChild(btSkyline(d.skyline_done || 0, d.skyline_total));
      let serveBtn = null;
      if(mode === "independent"){ serveBtn = document.createElement("button"); serveBtn.type = "button"; serveBtn.className = "bt-serve"; serveBtn.textContent = "बन गया!"; stage.appendChild(serveBtn); }
      host.appendChild(stage);

      let count = 0; state.locked = false; state.attempts = 0;
      const lit = ()=> cells.forEach((c,i)=>{ const on = i < count; c.classList.toggle("lit", on); c.textContent = on ? (i+1) : ""; });
      const addSound = ()=>{ btThunk(count); btDust(plot); play("assets/Audio/vo_num_" + count + "." + AUDIO_EXT); };

      function success(){
        state.locked = true; if(serveBtn) serveBtn.disabled = true;
        if(d.topper){ const t = document.createElement("div"); t.className = "bt-topper snap"; t.innerHTML = `<img src="assets/Images/${d.topper}.webp" alt="">`; plot.appendChild(t);
          if(d.topper === "top_rocket") setTimeout(()=> t.classList.add("rocket-go"), 750); }
        if(d.friend) friend.classList.add("hop");
        sfxCorrect(); burstStars();
        const lots = [...stage.querySelectorAll(".bt-bldg")]; const nextLot = lots[d.skyline_done || 0];
        if(nextLot) setTimeout(()=> nextLot.classList.add("done"), 380);
        SwiftPAL.emit("build_to_number_correct", { slide_id: slide.id, phase: slide.phase, value: true, target: N, attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
        play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT); setNavActive(true);
      }

      if(mode === "guided"){
        const ghosts = [];
        for(let i=0;i<N;i++){ const g = document.createElement("div"); g.className = "bp-slot"; plot.appendChild(g); ghosts.push(g); }
        ghosts[0].classList.add("next");
        pile.onclick = ()=>{ if(state.locked) return;
          const g = ghosts.find(x=> x.classList.contains("bp-slot"));
          if(!g){ showBox("", "बस इतने ही चाहिए!", "hint", null, ()=>{}); return; }
          g.className = "blk drop"; g.style.background = BT_COLORS[count % 5];
          count++; lit(); addSound();
          const nx = ghosts.find(x=> x.classList.contains("bp-slot")); if(nx) nx.classList.add("next");
          if(count === N) setTimeout(success, 280);
        };
      } else {
        pile.onclick = ()=>{ if(state.locked) return;
          const b = btBlock(count); b.classList.add("drop");
          b.onclick = (e)=>{ e.stopPropagation(); if(state.locked) return; b.remove(); count--; lit(); };
          plot.appendChild(b); count++; lit(); addSound(); };
        serveBtn.onclick = ()=>{ if(state.locked) return;
          if(count === N){ success(); return; }
          state.attempts++;
          SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts, made: count, target: N });
          if(count < N){ if(d.friend) friend.classList.add("peer");
            showBox("", "थोड़े और चाहिए!", "hint", null, ()=>{ if(d.friend) friend.classList.remove("peer"); }); }
          else { const bs = [...plot.querySelectorAll(".blk")]; const top = bs[bs.length-1];
            if(top){ top.classList.add("wobble"); setTimeout(()=> top.classList.remove("wobble"), 520); }
            showBox("", "अरे! एक ब्लॉक हटाओ।", "hint", null, ()=>{}); } };
      }
      setNavActive(false);
      $("navBtn").onclick = ()=>{ if(state.locked) completeSlide(true); };
      pointNudgeAt(pile);
    }
  },

  MAKE_NUMBER: {
    // produce-the-numeral dial (grafted from Firefly Valley). A set of N built blocks; ＋/− dials a
    // 1–10 numeral; wrong is inert (build dim), exact match ignites the build + snaps its topper.
    mount(host, slide){
      const d = slide.data, N = d.count;
      const stage = document.createElement("div"); stage.className = "bt-stage";
      if(d.prompt2_hi){ const lbl = document.createElement("div"); lbl.className = "pat-unit-lbl"; lbl.textContent = d.prompt2_hi; stage.appendChild(lbl); }
      const yard = document.createElement("div"); yard.className = "bt-yard";
      const plotwrap = document.createElement("div"); plotwrap.className = "bt-plotwrap";
      const plot = document.createElement("div"); plot.className = "bt-plot ground"; plot.style.filter = "grayscale(.35) brightness(.95)";
      plot.style.setProperty("--bh", Math.max(20, Math.min(46, Math.floor(230/N) - 2)) + "px");
      for(let i=0;i<N;i++){ plot.appendChild(btBlock(i)); }
      plotwrap.appendChild(plot); yard.appendChild(plotwrap);
      const dial = document.createElement("div"); dial.className = "bt-dial";
      dial.innerHTML = `<button class="bt-dial-btn" data-d="-1" type="button">−</button><div class="bt-dial-val">1</div><button class="bt-dial-btn" data-d="1" type="button">＋</button>`;
      stage.appendChild(yard); stage.appendChild(dial); host.appendChild(stage);
      let val = 1; state.locked = false; const valEl = dial.querySelector(".bt-dial-val");
      const check = ()=>{ if(val === N && !state.locked){ state.locked = true; valEl.classList.add("match"); plot.style.filter = "";
        if(d.topper){ const t = document.createElement("div"); t.className = "bt-topper snap"; t.innerHTML = `<img src="assets/Images/${d.topper}.webp" alt="">`; plot.appendChild(t); }
        sfxCorrect(); burstStars(); play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT);
        SwiftPAL.emit("make_number_correct", { slide_id: slide.id, phase: slide.phase, value: true, count: N, latency_ms: Date.now()-state.slideStart });
        setNavActive(true); } };
      dial.querySelectorAll(".bt-dial-btn").forEach(btn=> btn.onclick = ()=>{ if(state.locked) return;
        val = Math.max(1, Math.min(10, val + parseInt(btn.dataset.d, 10))); valEl.textContent = val; sfxTap(); check(); });
      setNavActive(false); $("navBtn").onclick = ()=>{ if(state.locked) completeSlide(true); };
    }
  },

  TAP_LETTER_BY_NAME: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "letter_name_first_try",
        stimulus: null,
        options: slide.data.options,
        isCorrect: (opt) => opt.letter === slide.data.target,
        optionRenderer: (opt) => letterCell(opt.letter)
      });
    }
  },

  TAP_LETTER_BY_SOUND: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "letter_sound_first_try",
        stimulus: (()=> {
          const el = document.createElement("div"); el.className = "stimulus-pic";
          el.innerHTML = `<span class="emoji">🔊</span><span class="lbl">ध्वनि सुनो</span>`;
          el.style.cursor = "pointer";
          el.onclick = ()=>{ state.audioReplays++; play(audioFor(slide,"phoneme") || null); };
          return el;
        })(),
        options: slide.data.options,
        isCorrect: (opt) => opt.letter === slide.data.target,
        optionRenderer: (opt) => letterCell(opt.letter)
      });
    }
  },

  TAP_PICTURE_BY_LETTER: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "letter_image_match_first_try",
        stimulus: stimulusLetter(slide.data.target_letter),
        options: slide.data.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => pictureCell(opt.picture, opt.emoji, opt.img)
      });
    }
  },

  TAP_LETTER_BY_PICTURE: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "image_letter_match_first_try",
        stimulus: stimulusPic(slide.data.picture, slide.data.emoji, slide.data.img),
        options: slide.data.options,
        isCorrect: (opt) => opt.letter === slide.data.target,
        optionRenderer: (opt) => letterCell(opt.letter)
      });
    }
  },

  ODD_ONE_OUT: {
    mount(host, slide){
      const sig = (slide.signals && slide.signals.on_complete && slide.signals.on_complete[0]) || "letter_recognise_first_try";
      const useShape = slide.data.options.some(o => o.shape);
      const usePic = slide.data.options.some(o => o.picture || o.word_hi || o.img);
      mountTapOptions({
        slide, host, signalName: sig,
        stimulus: null,
        options: slide.data.options,
        columnsHint: 4,
        isCorrect: (opt) => opt.is_odd === true,
        optionRenderer: (opt) => useShape
          ? shapeCell(opt)
          : usePic
            ? pictureCell(opt.word_hi || opt.picture, opt.emoji, opt.img)
            : letterCell(opt.letter),
        mastery: slide.phase === "mastery"
      });
    }
  },

  TAP_GENDER: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "gender_match_first_try",
        stimulus: stimulusPic(slide.data.noun.word_hi, slide.data.noun.emoji, slide.data.noun.img),
        options: slide.data.options,
        columnsHint: 2,
        isCorrect: (opt) => opt.gender === slide.data.target_gender,
        optionRenderer: (opt) => genderLabelCell(opt.label, opt.gender),
        mastery: slide.phase === "mastery"
      });
    }
  },

  TAP_PICTURE_BY_GENDER: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "gender_match_first_try",
        stimulus: stimulusGender(slide.data.label, slide.data.target_gender),
        options: slide.data.options,
        // tap-to-answer needs ONE unambiguous key — author marks the single intended picture
        // with correct:true (matches every other TAP_* module). The old `|| gender===target`
        // fallback silently accepted any same-gender distractor, defeating buzz+✗+lock.
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => pictureCell(opt.word_hi, opt.emoji, opt.img),
        mastery: slide.phase === "mastery"
      });
    }
  },

  GENDER_INTRO: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "gender-cats";
      const cats = slide.data.categories;
      const tapped = new Set();
      cats.forEach(cat => {
        const card = document.createElement("div");
        card.className = "gender-cat " + (cat.gender === "F" ? "fem" : "masc");
        card.innerHTML =
          `<div class="cat-title">${cat.label}</div>` +
          imgOrEmoji(cat.anchor.img, cat.anchor.emoji, "cat-pic", "cat-emoji") +
          `<div class="cat-word">${cat.anchor.word_hi}</div>`;
        card.onclick = ()=>{
          card.classList.add("played");
          playChain(["assets/Audio/" + cat.label_audio + "." + AUDIO_EXT, "assets/Audio/" + cat.name_audio + "." + AUDIO_EXT], 0);
          tapped.add(cat.gender);
          SwiftPAL.emit("gender_intro_tap", { slide_id: slide.id, gender: cat.gender });
          if(tapped.size >= cats.length){ stopNudge(); setNavActive(true); }
        };
        wrap.appendChild(card);
      });
      host.appendChild(wrap);
      state.gateNavUntilAudio = true;   // nav unlocks after the concept VO
      setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  MEET_GENDER: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "meet-gender";
      const n = slide.data.noun;
      wrap.innerHTML =
        `<div class="meet-pic-box">${imgOrEmoji(n.img, n.emoji, "pic-img", "pic-emoji")}<span class="pic-label">${n.word_hi}</span></div>` +
        `<div class="meet-arrow">→</div>` +
        `<div class="gender-badge${slide.data.gender === "F" ? " fem" : ""}">${slide.data.label}</div>`;
      host.appendChild(wrap);
      state.gateNavUntilAudio = true;   // nav unlocks after the model VO
      setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  /* MEET_GENDER_PAIR (H11 L03 लिंग-रूप बदलाव) — ADDITIVE (r4l); no existing module touched. Teaches the
     पुल्लिंग→स्त्रीलिंग FORM CHANGE by doing (not just gender classification): shows the masculine noun
     (pic+word) → the feminine noun (pic+word) with the ending change badged (आ→ई / +नी / irregular); the
     child taps EACH card to hear its word, then Swiftie explains the change and आगे unlocks. Mixing the
     change types across slides counters the "one ending-rule fits all" misconception. teach family (no ✗).
     data:{ masc:{word_hi,img,emoji,audio}, fem:{word_hi,img,emoji,audio}, change_hi }; audio (ownsAudio, non-autochain): prompt (spoken on mount), explain (after both taps). */
  MEET_GENDER_PAIR: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "meet-gender mgp";
      const build = (item, cls)=>{ const c = document.createElement("div");
        c.className = "meet-pic-box mgp-card " + cls + " tappable";
        c.innerHTML = imgOrEmoji(item.img, item.emoji, "pic-img", "pic-emoji") + `<span class="pic-label">${item.word_hi}</span>`;
        return c; };
      const mCard = build(d.masc, "masc");
      const arrow = document.createElement("div"); arrow.className = "meet-arrow mgp-arrow";
      arrow.innerHTML = `<span class="mgp-ar">→</span>` + (d.change_hi ? `<span class="mgp-change">${d.change_hi}</span>` : "");
      const fCard = build(d.fem, "fem");
      wrap.appendChild(mCard); wrap.appendChild(arrow); wrap.appendChild(fCard);
      host.appendChild(wrap);

      state.ownsAudio = true; state.locked = false; setNavActive(false);
      state.replayAudio = ()=> playChain([audioFor(slide,"prompt"), audioFor(slide,"explain")].filter(Boolean), 0, ()=>{});
      const clip = (item)=> item.audio ? ("assets/Audio/" + item.audio + "." + AUDIO_EXT) : null;
      const cards = [[mCard, d.masc],[fCard, d.fem]];
      const nudgeNext = ()=>{ const nx = cards.find(([c])=> !c.classList.contains("said")); if(nx) pointNudgeAt(nx[0]); else stopNudge(); };
      let said = 0;
      cards.forEach(([card, item])=>{
        card.onclick = ()=>{
          if(state.locked) return;
          if(card.classList.contains("said")){ play(clip(item)); return; }
          card.classList.add("said","reveal-glow"); setTimeout(()=> card.classList.remove("reveal-glow"), 500);
          sfxTap(); setSwMood("point"); said++;
          play(clip(item), ()=>{ if(said >= 2){ stopNudge(); state.locked = true; setSwMood("happy");
              play(audioFor(slide,"explain") || null, ()=> setNavActive(true)); }
            else nudgeNext(); });
        };
      });
      $("navBtn").onclick = ()=>{ if(state.locked) completeSlide(true); };
      playChain([audioFor(slide,"prompt")].filter(Boolean), 0, ()=> nudgeNext());
    }
  },

  SORT_GENDER: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "sort-stage";
      const binsRow = document.createElement("div"); binsRow.className = "sort-bins";
      slide.data.bins.forEach(b => {
        const bin = document.createElement("div");
        bin.className = "sort-bin dd-zone" + (b.gender === "F" ? " fem" : "");   // dd-zone → drop detection
        bin.dataset.gender = b.gender;
        bin.innerHTML = `<div class="bin-title">${b.label}</div><div class="bin-items"></div>`;
        binsRow.appendChild(bin);
      });
      const tray = document.createElement("div"); tray.className = "sort-tray";
      const items = slide.data.items.slice().sort(()=> Math.random() - 0.5);
      items.forEach(it => {
        const t = document.createElement("div"); t.className = "sort-item";
        t.dataset.gender = it.gender;
        t.innerHTML = imgOrEmoji(it.img, it.emoji, "img", "emoji") + `<span class="lbl">${it.word_hi}</span>`;
        tray.appendChild(t);
      });
      wrap.appendChild(binsRow); wrap.appendChild(tray);
      host.appendChild(wrap);

      state.attempts = 0; state.locked = false;
      let placed = 0; const need = slide.data.items.length;
      [...tray.children].forEach(tile => {
        makeDraggable(tile, (zone, t) => {
          const bin = zone.closest(".sort-bin"); if(!bin) return;
          state.attempts++;
          if(bin.dataset.gender === t.dataset.gender){
            t.classList.add("snapped");
            bin.querySelector(".bin-items").appendChild(t);
            placed++;
            SwiftPAL.emit("gender_sort_item", { slide_id: slide.id, gender: t.dataset.gender, attempts: state.attempts });
            if(placed === need){
              state.locked = true;
              SwiftPAL.emit("gender_sort_correct", {
                slide_id: slide.id, phase: slide.phase, value: true,
                attempts: state.attempts, latency_ms: Date.now() - state.slideStart
              });
              setTimeout(()=> celebrateThenAdvance(slide, false), 250);   // standard: confetti + VO + auto-advance, no popup
            }
          } else {
            bin.classList.add("hover"); bin.style.borderColor = "var(--wrong)";
            setTimeout(()=>{ bin.classList.remove("hover"); bin.style.borderColor = ""; }, 500);
            dragWrong(slide);   // buzz + Swiftie + spoken try_again (pre-readers need the spoken recovery)
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          }
        });
      });
    }
  },

  MATCH_GENDER_PAIRS: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "dd-stage";
      const zoneRow = document.createElement("div"); zoneRow.className = "dd-row";
      const zones = slide.data.pairs.slice().sort(()=> Math.random() - 0.5);
      zones.forEach(p => {
        const z = document.createElement("div"); z.className = "dd-zone"; z.dataset.accept = p.id;
        z.innerHTML = imgOrEmoji(p.f.img, p.f.emoji, "zone-img", "zone-emoji") + `<span class="zone-lbl">${p.f.word_hi}</span>`;
        zoneRow.appendChild(z);
      });
      const tileRow = document.createElement("div"); tileRow.className = "dd-row"; tileRow.style.marginTop = "34px";
      const tiles = slide.data.pairs.slice().sort(()=> Math.random() - 0.5);
      tiles.forEach(p => {
        const t = document.createElement("div"); t.className = "dd-tile pic-tile"; t.dataset.pairId = p.id;
        t.innerHTML = imgOrEmoji(p.m.img, p.m.emoji, "zone-img", "zone-emoji") + `<span class="zone-lbl">${p.m.word_hi}</span>`;
        tileRow.appendChild(t);
      });
      wrap.appendChild(zoneRow); wrap.appendChild(tileRow);
      host.appendChild(wrap);

      state.attempts = 0; state.locked = false;
      let filled = 0, wrongStreak = 0, revealed = false; const need = slide.data.pairs.length;
      const settle = (zone, t)=>{                       // the one correct-placement path (drop AND reveal)
        zone.classList.add("filled","correct");
        // grey the matched masculine tile in place (pictures don't badge well)
        t.classList.add("matched"); t.style.transform = "";
        filled++;
        if(filled === need){ state.locked = true; setTimeout(()=> celebrateThenAdvance(slide, revealed), 250); }
      };
      // A8 reveal ceiling: after max consecutive misses, DEMONSTRATE one pair (pulse + auto-settle) so
      // the child is guided forward instead of dead-ending; run counts success=false via `revealed`.
      const revealOne = ()=>{
        const zone = [...zoneRow.children].find(z=> !z.classList.contains("filled")); if(!zone) return;
        const t = [...tileRow.children].find(x=> !x.classList.contains("matched") && x.dataset.pairId === zone.dataset.accept); if(!t) return;
        revealed = true; wrongStreak = 0;
        zone.classList.add("reveal-glow"); t.classList.add("reveal-glow");
        play(audioFor(slide,"reveal") || null, ()=>{});
        setTimeout(()=>{ zone.classList.remove("reveal-glow"); t.classList.remove("reveal-glow"); settle(zone, t); }, 1000);
      };
      [...tileRow.children].forEach(tile => {
        makeDraggable(tile, (zone, t) => {
          if(state.locked || zone.classList.contains("filled")) return;
          state.attempts++;
          if(zone.dataset.accept === t.dataset.pairId){
            wrongStreak = 0;
            SwiftPAL.emit("gender_pair_match", {
              slide_id: slide.id, phase: slide.phase, value: true,
              pair: t.dataset.pairId, attempts: state.attempts
            });
            settle(zone, t);
          } else {
            zone.classList.add("filled","wrong");
            setTimeout(()=> zone.classList.remove("filled","wrong"), 600);
            dragWrong(slide);
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
            if(++wrongStreak >= (CARD.scaffold_rules.max_attempts||3)) revealOne();
          }
        });
      });
    }
  },

  MATCH_DRAG_1: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "dd-stage";
      // zone (target picture)
      const zoneRow = document.createElement("div"); zoneRow.className = "dd-row";
      const zone = document.createElement("div"); zone.className = "dd-zone";
      zone.innerHTML = imgOrEmoji(slide.data.target.img, slide.data.target.emoji, "zone-img", "zone-emoji") + `<span class="zone-lbl">${slide.data.target.picture||""}</span>`;
      zone.dataset.accept = slide.data.letter.letter;
      zoneRow.appendChild(zone);
      // tile
      const tileRow = document.createElement("div"); tileRow.className = "dd-row"; tileRow.style.marginTop = "30px";
      const tile = document.createElement("div"); tile.className = "dd-tile"; tile.innerHTML = `<span class="ink-glyph">${slide.data.letter.letter}</span>`;
      tileRow.appendChild(tile);
      wrap.appendChild(zoneRow); wrap.appendChild(tileRow);
      host.appendChild(wrap);

      state.attempts = 0; state.locked = false;
      makeDraggable(tile, (zone, t) => {
        state.attempts++;
        const ok = (zone.dataset.accept === t.textContent.trim());
        if(ok){
          zone.classList.add("filled","correct");
          // snap tile into zone (badge is small — drop the ink-centering transform)
          t.classList.add("snapped");
          t.querySelector(".ink-glyph")?.style.removeProperty("transform");
          zone.appendChild(t);
          state.locked = true;
          SwiftPAL.emit("letter_image_match_first_try", {
            slide_id: slide.id, phase: slide.phase, value: true,
            first_try: state.attempts === 1, attempts: state.attempts,
            latency_ms: Date.now()-state.slideStart
          });
          celebrateThenAdvance(slide, false);
        } else {
          zone.classList.add("filled","wrong");
          setTimeout(()=> zone.classList.remove("filled","wrong"), 600);
          dragWrong(slide);
          SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          if(state.attempts >= (CARD.scaffold_rules.max_attempts||3)){
            state.locked = true;
            // reveal = DEMONSTRATE, don't just tell: snap the letter into its picture (dimmed pulse)
            // with the spoken reveal line, then move on as success=false.
            showBox("", audioText(slide,"reveal") || "कोई बात नहीं! इसे यहाँ रखो।", "reveal", audioFor(slide,"reveal"), ()=>{});
            setTimeout(()=>{
              zone.classList.add("filled","correct","reveal-glow");
              t.classList.add("snapped");
              t.querySelector(".ink-glyph")?.style.removeProperty("transform");
              zone.appendChild(t);
              setTimeout(()=> completeSlide(false), 1300);
            }, 900);
          }
        }
      });
    }
  },

  MATCH_DRAG_N: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "dd-stage";
      // word-mode (labels, r4g): multi-char tiles (whole words) need wider, auto-size tiles so a word
      // like कुर्सी doesn't overflow the 104px letter box. Single-letter games are unaffected.
      if((slide.data.pairs || []).some(p => String(p.letter || "").length > 1)) wrap.classList.add("dd-words");
      const zoneRow = document.createElement("div"); zoneRow.className = "dd-row";
      // shuffle zones so order ≠ tile order
      const zones = slide.data.pairs.slice().sort(()=> Math.random()-0.5);
      zones.forEach(p => {
        const z = document.createElement("div"); z.className = "dd-zone";
        z.innerHTML = imgOrEmoji(p.img, p.emoji, "zone-img", "zone-emoji") + `<span class="zone-lbl">${p.picture||""}</span>`;
        z.dataset.accept = p.letter;
        zoneRow.appendChild(z);
      });
      const tileRow = document.createElement("div"); tileRow.className = "dd-row"; tileRow.style.marginTop = "30px";
      const tiles = slide.data.pairs.slice().sort(()=> Math.random()-0.5);
      tiles.forEach(p => {
        const t = document.createElement("div"); t.className = "dd-tile"; t.innerHTML = `<span class="ink-glyph">${p.letter}</span>`;
        tileRow.appendChild(t);
      });
      wrap.appendChild(zoneRow); wrap.appendChild(tileRow);
      host.appendChild(wrap);

      state.attempts = 0; state.locked = false;
      let filled = 0, wrongStreak = 0, revealed = false; const need = slide.data.pairs.length;
      const settle = (zone, t)=>{                       // one correct-placement path (drop AND reveal)
        zone.classList.add("filled","correct");
        t.classList.add("snapped"); t.querySelector(".ink-glyph")?.style.removeProperty("transform"); zone.appendChild(t);
        filled++;
        if(filled === need){ state.locked = true; setTimeout(()=> celebrateThenAdvance(slide, revealed), 250); }
      };
      // A8 reveal ceiling: after max consecutive misses, demonstrate one letter→picture match.
      const revealOne = ()=>{
        const zone = [...zoneRow.children].find(z=> !z.classList.contains("filled")); if(!zone) return;
        const t = [...tileRow.children].find(x=> !x.classList.contains("snapped") && x.textContent.trim() === zone.dataset.accept); if(!t) return;
        revealed = true; wrongStreak = 0;
        zone.classList.add("reveal-glow"); t.classList.add("reveal-glow");
        play(audioFor(slide,"reveal") || null, ()=>{});
        setTimeout(()=>{ zone.classList.remove("reveal-glow"); t.classList.remove("reveal-glow"); settle(zone, t); }, 1000);
      };
      [...tileRow.children].forEach(tile => {
        makeDraggable(tile, (zone, t) => {
          if(state.locked || zone.classList.contains("filled")) return;
          state.attempts++;
          const ok = (zone.dataset.accept === t.textContent.trim());
          if(ok){
            wrongStreak = 0;
            SwiftPAL.emit("letter_image_match_first_try", {
              slide_id: slide.id, phase: slide.phase, value: true,
              letter: t.textContent, attempts: state.attempts
            });
            settle(zone, t);
          } else {
            zone.classList.add("filled","wrong");
            dragWrong(slide);
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
            setTimeout(()=> zone.classList.remove("filled","wrong"), 600);
            if(++wrongStreak >= (CARD.scaffold_rules.max_attempts||3)) revealOne();
          }
        });
      });
    }
  },

  SEQUENCE_DRAG: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "dd-stage";
      // word-mode (SENTENCE ordering, r4b): multi-char tiles (whole words) need wider, wrapping
      // tiles + slots so they don't overflow the letter-sized 104px box. Single-letter games are
      // unaffected (all tiles length 1 → no class).
      if((slide.data.tiles || []).some(t => String(t.letter || "").length > 1)) wrap.classList.add("seq-words");
      // slots row
      const slots = document.createElement("div"); slots.className = "seq-slots";
      slide.data.correct_order.forEach((L,i) => {
        const sl = document.createElement("div"); sl.className = "seq-slot";
        sl.dataset.accept = L; sl.dataset.idx = String(i);
        sl.classList.add("dd-zone");      // reuse drop logic
        sl.innerHTML = `<span class="ordinal">${i+1}</span>`;
        slots.appendChild(sl);
      });
      const tileRow = document.createElement("div"); tileRow.className = "dd-row"; tileRow.style.marginTop = "40px";
      slide.data.tiles.forEach(t => {
        const tl = document.createElement("div"); tl.className = "dd-tile"; tl.innerHTML = `<span class="ink-glyph">${t.letter}</span>`;
        tileRow.appendChild(tl);
      });
      wrap.appendChild(slots); wrap.appendChild(tileRow);
      host.appendChild(wrap);

      let placed = 0, wrongStreak = 0, revealed = false; const need = slide.data.correct_order.length;
      state.attempts = 0; state.locked = false;
      const settle = (zone, t)=>{                       // one correct-placement path (drop AND reveal)
        zone.classList.remove("dd-zone");
        zone.classList.add("filled","correct");
        zone.innerHTML = `<span class="ordinal">${parseInt(zone.dataset.idx,10)+1}</span><span class="ink-glyph">${t.textContent.trim()}</span>`;
        centerInkGlyph(zone.querySelector(".ink-glyph"));
        t.remove();
        placed++;
        if(placed === need){
          state.locked = true;
          SwiftPAL.emit("letter_sequence_correct", {
            slide_id: slide.id, phase: slide.phase, value: !revealed,
            attempts: state.attempts, latency_ms: Date.now()-state.slideStart
          });
          setTimeout(()=> celebrateThenAdvance(slide, revealed), 250);
        }
      };
      // A8 reveal ceiling: after max consecutive misses, demonstrate the NEXT slot in the order.
      const revealOne = ()=>{
        const zone = [...slots.children].find(z=> !z.classList.contains("filled")); if(!zone) return;
        const t = [...tileRow.children].find(x=> x.textContent.trim() === zone.dataset.accept); if(!t) return;
        revealed = true; wrongStreak = 0;
        zone.classList.add("reveal-glow"); t.classList.add("reveal-glow");
        play(audioFor(slide,"reveal") || null, ()=>{});
        setTimeout(()=>{ zone.classList.remove("reveal-glow"); settle(zone, t); }, 1000);
      };
      [...tileRow.children].forEach(tile => {
        makeDraggable(tile, (zone, t) => {
          if(state.locked || zone.classList.contains("filled")) return;
          state.attempts++;
          const ok = (zone.dataset.accept === t.textContent.trim());
          if(ok){
            wrongStreak = 0;
            settle(zone, t);
          } else {
            zone.classList.add("wrong");
            setTimeout(()=> zone.classList.remove("wrong"), 600);
            dragWrong(slide);
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
            if(++wrongStreak >= (CARD.scaffold_rules.max_attempts||3)) revealOne();
          }
        });
      });
    }
  },

  MASTERY_SILENT_PICK: {
    mount(host, slide){
      const mode = slide.data.mode;
      let stimulus = null, options = null, isCorrect = null, optionRenderer = null;
      if(mode === "sound_to_letter"){
        stimulus = (()=> {
          const el = document.createElement("div"); el.className = "stimulus-pic"; el.style.cursor="pointer";
          el.innerHTML = `<span class="emoji">🔊</span><span class="lbl">ध्वनि सुनो</span>`;
          el.onclick = ()=>{ state.audioReplays++; play(audioFor(slide,"phoneme") || null); };
          return el;
        })();
        options = slide.data.options;
        isCorrect = (opt) => opt.letter === slide.data.target;
        optionRenderer = (opt) => letterCell(opt.letter);
      } else if(mode === "picture_to_letter"){
        stimulus = stimulusPic(slide.data.picture, slide.data.emoji, slide.data.img);
        options = slide.data.options;
        isCorrect = (opt) => opt.letter === slide.data.target;
        optionRenderer = (opt) => letterCell(opt.letter);
      } else if(mode === "name_to_shape"){
        stimulus = (()=> {
          const el = document.createElement("div"); el.className = "stimulus-pic"; el.style.cursor="pointer";
          el.innerHTML = `<span class="emoji">🔊</span><span class="lbl">${slide.data.name || "नाम सुनो"}</span>`;
          el.onclick = ()=>{ state.audioReplays++; play(audioFor(slide,"shape_name") || null); };
          return el;
        })();
        options = slide.data.options;
        isCorrect = (opt) => opt.shape === slide.data.target;
        optionRenderer = (opt) => shapeCell(opt);
      } else if(mode === "object_to_shape"){
        stimulus = stimulusPic(slide.data.object_hi, slide.data.object_emoji, slide.data.object_img);
        options = slide.data.options;
        isCorrect = (opt) => opt.shape === slide.data.target;
        optionRenderer = (opt) => shapeCell(opt);
      } else if(mode === "shape_to_object"){
        stimulus = stimulusShape({shape: slide.data.shape, color: slide.data.color, rotate: slide.data.rotate});
        options = slide.data.options;
        isCorrect = (opt) => opt.correct === true;
        optionRenderer = (opt) => pictureCell(opt.object_hi, opt.object_emoji, opt.object_img);
      } else { // letter_to_picture
        stimulus = stimulusLetter(slide.data.letter);
        options = slide.data.options;
        isCorrect = (opt) => opt.correct === true;
        optionRenderer = (opt) => pictureCell(opt.picture, opt.emoji, opt.img);
      }
      // SAME scaffold as the rest of the lesson — hint button after 1st wrong,
      // correct/incorrect feedback popups, reveal-on-3rd-wrong. Not silent.
      // `mastery:true` keeps the mastery_score tracking (first-try = hit).
      mountTapOptions({
        slide, host, signalName: "mastery_item",
        stimulus, options, isCorrect, optionRenderer, mastery: true
      });
    }
  },

  STORY_SCENE: {
    // TEACH: one picture-story beat. Scene image fills the frame; narration VO plays on mount;
    // slow Ken-Burns pan keeps it alive for a pre-reader. Chain several in order for the story.
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "story-scene";
      const fb = String(d.emoji || "📖").replace(/'/g,"");
      wrap.innerHTML =
        '<div class="story-frame">' +
          '<img class="story-img" src="assets/Images/' + d.image_id + '.' + IMG_EXT + '" alt="' + (d.alt_hi||'') + '" ' +
            'onerror="var s=document.createElement(\'span\');s.className=\'story-fallback\';s.textContent=\'' + fb + '\';this.replaceWith(s);"/>' +
        '</div>' +
        (d.caption_hi ? '<div class="story-caption">' + d.caption_hi + '</div>' : '');
      host.appendChild(wrap);
      state.ownsAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
      state.replayAudio = ()=>{ play(audioFor(slide, "narration") || null, ()=>{}); };
      setSwMood("talk");
      let _armed = false;
      const _armNav = ()=>{ if(_armed) return; _armed = true; setNavActive(true); setSwMood("point"); };
      play(audioFor(slide, "narration") || null, _armNav);
      setTimeout(_armNav, 30000);   // watchdog: nav always eventually opens if VO buffers slowly
    }
  },

  /* STORY_READ_PAGE (H04 L02 चित्र-संकेत की सहायता से वाक्य पठन) — ADDITIVE (r4m); no existing module
     touched. A picture CUE + the sentence as tappable word chips + a "पूरा पढ़िए" whole-read button:
     the CHILD reads (taps each word to hear it), then plays the whole sentence; आगे gates until the
     sentence has been read once. Unlike STORY_SCENE (narrated TO the child) this is the child reading
     WITH picture support — the faithful "चित्र-संकेत" reading beat. data:{image_id, alt_hi, emoji,
     words:[{text,audio}], whole_audio}; audio: prompt (instruction, autoplayed on mount), explain
     (optional teach line played after the whole-read, before आगे unlocks). */
  STORY_READ_PAGE: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "story-read";
      const pic = document.createElement("div"); pic.className = "story-read-pic";
      pic.innerHTML = imgOrEmoji(d.image_id, d.emoji, "srp-img", "srp-emoji");
      const strip = document.createElement("div"); strip.className = "sentence-strip srp-strip";
      (d.words || []).forEach(w => { const chip = document.createElement("div"); chip.className = "sentence-word tappable";
        chip.innerHTML = `<span class="sw-text ink-glyph">${w.text}</span>`;
        chip.onclick = ()=>{ chip.classList.add("said"); state.audioReplays++;
          if(w.audio) play("assets/Audio/" + w.audio + "." + AUDIO_EXT); };
        strip.appendChild(chip); });
      const readBtn = document.createElement("button"); readBtn.className = "read-whole-btn"; readBtn.innerHTML = `🔊 पूरा पढ़िए`;
      const wholeSrc = d.whole_audio ? ("assets/Audio/" + d.whole_audio + "." + AUDIO_EXT) : null;
      readBtn.onclick = ()=>{ if(readBtn.classList.contains("playing")) return; state.audioReplays++; readBtn.classList.add("playing"); stopNudge();
        strip.querySelectorAll(".sentence-word").forEach(c => c.classList.add("said"));
        play(wholeSrc, ()=>{ readBtn.classList.remove("playing"); readBtn.classList.add("done"); setSwMood("happy");
          const ex = audioFor(slide, "explain"); if(ex) play(ex, ()=> setNavActive(true)); else setNavActive(true); }); };
      wrap.appendChild(pic); wrap.appendChild(strip); wrap.appendChild(readBtn);
      host.appendChild(wrap);
      state.replayAudio = ()=> play(wholeSrc, ()=>{});
      setNavActive(false);
      $("navBtn").onclick = ()=>{ if(!$("navBtn").disabled) completeSlide(true); };
      setTimeout(()=> pointNudgeAt(readBtn), 500);
    }
  },

  STORY_QUESTION: {
    // TEST: a comprehension question after story beats. A recall thumb (visual anchor) + 🔊 chip
    // form the stimulus; options are 2–3 picture chips. Tap-to-answer feedback is inherited from
    // mountTapOptions. Recall thumb is a CUE, hidden at mastery / when data.hide_recall so the
    // answer isn't leaked by thumb-reading.
    mount(host, slide){
      const d = slide.data || {};
      const stim = document.createElement("div"); stim.className = "story-q-stim"; stim.style.cursor = "pointer";
      const hideRecall = slide.phase === "mastery" || d.hide_recall === true;
      const thumb = (!hideRecall && d.recall_image_id)
        ? '<img class="story-q-thumb" src="assets/Images/' + d.recall_image_id + '.' + IMG_EXT + '" alt="" ' +
          'onerror="this.style.display=\'none\';"/>'
        : '';
      stim.innerHTML = thumb +
        '<span class="story-q-listen"><span class="emoji">🔊</span>' +
        '<span class="lbl">' + (d.stim_hi || 'प्रश्न सुनो') + '</span></span>';
      stim.onclick = ()=>{ state.audioReplays++; play(audioFor(slide, "prompt") || null); };
      mountTapOptions({
        slide, host,
        signalName: d.signal_name || "story_question_first_try",
        stimulus: stim,
        options: d.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => {
          const cell = document.createElement("div");
          cell.innerHTML =
            imgOrEmoji(opt.img, opt.emoji, "story-q-opt-img", "story-q-opt-emoji") +
            (opt.label_hi ? '<span class="story-q-opt-label">' + opt.label_hi + '</span>' : '');
          return cell;
        },
        mastery: d.mastery === true,
        columnsHint: (d.options && d.options.length) <= 2 ? 2 : 3
      });
    }
  },

  TAP_IN_SCENE: {
    // "Tap the thing in the picture" — a PRODUCE-style comprehension mechanic (NOT an MCQ). A story
    // scene fills the frame; the child taps the target region(s) (e.g. the monkeys who took the caps).
    // A correct hotspot → confetti + advance; a miss → soft buzz + try_again VO; after a few idle
    // seconds the target gently pulses (hint). Data: {image_id, alt_hi, prompt, hotspots:[{x,y,w,h,
    // correct}] (as % of the frame), audio:{prompt,correct,try_again}}. Reusable for any "find X".
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "tis-scene";
      const frame = document.createElement("div"); frame.className = "tis-frame";
      const img = document.createElement("img"); img.className = "tis-img";
      img.src = "assets/Images/" + d.image_id + "." + IMG_EXT; img.alt = d.alt_hi || "";
      frame.appendChild(img);
      if(d.boxed){ wrap.appendChild(frame); host.appendChild(wrap); SlideModules.TAP_IN_SCENE.mountBoxed(frame, slide); return; }
      let done = false;
      const miss = ()=>{ if(done) return; sfxWrongSoft(); setSwMood("tryagain"); play(audioFor(slide,"try_again")||null,()=>{}); };
      (d.hotspots || []).forEach(h => {
        const hs = document.createElement("button"); hs.className = "tis-hot" + (h.correct ? " correct-hot" : "");
        hs.style.left=h.x+"%"; hs.style.top=h.y+"%"; hs.style.width=h.w+"%"; hs.style.height=h.h+"%";
        hs.onclick = (e)=>{ e.stopPropagation(); if(done) return;
          if(h.correct){ done=true; hs.classList.add("hit"); sfxCorrect(); confettiCannon(); setSwMood("happy");
            SwiftPAL.emit(d.signal_name || "scene_tap_first_try", {slide_id:slide.id, phase:slide.phase, correct:true});
            play(audioFor(slide,"correct")||null, ()=> setTimeout(()=>completeSlide(true), 900)); }
          else { hs.classList.add("shake"); miss(); } };
        frame.appendChild(hs);
      });
      frame.onclick = miss;   // tapping empty scene = gentle try_again
      wrap.appendChild(frame); host.appendChild(wrap);
      $("navBtn").style.display = "none";   // advance on the correct tap — no आगे on a pick
      state.replayAudio = ()=> play(audioFor(slide,"prompt")||null, ()=>{});
      setSwMood("point");
      play(audioFor(slide,"prompt")||null, ()=>{});
      setTimeout(()=>{ if(!done) frame.querySelectorAll(".tis-hot.correct-hot").forEach(el=>el.classList.add("pulse")); }, 6000);
    },
    /* data.boxed (HI02H02 SME review): every candidate object wears a visible WHITE box; the right box turns
       GREEN. Taps outside the boxes are ignored. Wrong box → shake + buzz, then one hint rung per wrong tap:
       1 = audio.hint1 ("फिर से कोशिश कीजिए, देखिए नाला कहाँ है?"), 2 = the boxes glow one by one (each says its
       name, hotspot.audio), 3 = the right box glows, the others are disabled (+ audio.hint3). */
    mountBoxed(frame, slide){
      const d = slide.data || {}; const alive = aliveFor();
      state.attempts = 0; state.locked = false; state.scaffoldLevel = 0;
      const boxes = (d.hotspots || []).map(h=>{
        const b = document.createElement("button"); b.className = "tis-box"; b.type = "button";
        b.style.left = h.x + "%"; b.style.top = h.y + "%"; b.style.width = h.w + "%"; b.style.height = h.h + "%";
        b.setAttribute("aria-label", h.id || ""); b._h = h;
        b._src = h.audio ? ("assets/Audio/" + h.audio + "." + AUDIO_EXT) : null;
        frame.appendChild(b); return b; });
      const ok = boxes.find(b=> b._h.correct);
      let level = 0;
      const rung = (n)=>{
        level = Math.max(level, n); state.scaffoldLevel = Math.max(state.scaffoldLevel, n);
        state.hintActive = true; setSwMood("hint");
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, level: n });
        const fin = ()=>{ if(!alive()) return; state.hintActive = false; boxes.forEach(b=> b.classList.remove("glow")); setSwMood("point"); };
        if(n === 1) play(audioFor(slide, "hint1") || null, fin);
        else if(n === 2){ let i = 0;
          const step = ()=>{ if(!alive()) return; boxes.forEach(b=> b.classList.remove("glow"));
            if(i >= boxes.length){ fin(); return; }
            const b = boxes[i++]; b.classList.add("glow"); play(b._src, ()=> later(step, 350)); };
          step(); }
        else { boxes.forEach(b=>{ if(b !== ok) b.classList.add("disabled"); });
          if(ok){ ok.classList.add("glow", "hold"); pointNudgeAt(ok); }   // reference reveal: the pointing hand under the answer
          play(audioFor(slide, "hint3") || null, ()=>{ if(!alive()) return; state.hintActive = false; setSwMood("talk"); }); }
      };
      boxes.forEach(b=> b.onclick = (e)=>{ e.stopPropagation();
        if(state.locked || state.hintActive || b.classList.contains("disabled")) return;
        if(b === ok){
          state.locked = true; stopNudge();
          b.classList.remove("glow", "hold"); b.classList.add("hit");
          sfxCorrect(); confettiCannon(); setSwMood("happy");
          SwiftPAL.emit(d.signal_name || "scene_tap_first_try", { slide_id: slide.id, phase: slide.phase, value: true,
            correct: true, first_try: state.attempts === 0, attempts: state.attempts + 1, scaffold_level: state.scaffoldLevel });
          play(audioFor(slide, "correct") || null, ()=> later(()=> completeSlide(state.scaffoldLevel < 3), 800));
        } else {
          state.attempts++; sfxWrongSoft(); setSwMood("tryagain");
          b.classList.remove("shake", "miss"); void b.offsetWidth; b.classList.add("shake", "miss");
          later(()=> b.classList.remove("shake", "miss"), 700);
          $("hintBtn").classList.add("show");
          SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          rung(Math.min(Math.max(state.attempts, level + 1), 3));
        } });
      $("hintBtn").onclick = ()=>{ if(state.locked || state.hintActive || level >= 3) return; state.hintUsed = true; rung(level + 1); };
      $("navBtn").style.display = "none";
      state.ownsAudio = true;
      state.replayAudio = ()=> play(audioFor(slide, "prompt") || null, ()=>{});
      setSwMood("point");
      play(audioFor(slide, "prompt") || null, ()=>{});
    }
  },

  /* STORY_READALONG (H04 L03) — AUTONOMOUS story page: picture + the page's text; each sentence lights
     up as its own clip is read (karaoke read-along), so the child follows the print. Zero required
     interaction; आगे unlocks when the page has been read. Tapping a sentence re-hears it.
     data:{passage:{image_id, lines:[{text,audio}]}, page_no?, page_total?}; audio.prompt = optional lead-in. */
  STORY_READALONG: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "ev-read";
      const card = evPassage(d.passage, {big:true}); wrap.appendChild(card);
      if(d.credit) wrap.insertAdjacentHTML("beforeend", `<div class="ev-credit">${d.credit}</div>`);
      if(d.page_no) wrap.insertAdjacentHTML("beforeend", `<div class="ev-pageno">${d.page_no}${d.page_total ? " / " + d.page_total : ""}</div>`);
      host.appendChild(wrap);
      const lines = card._lines;
      state.ownsAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=>{ if(!$("navBtn").disabled) completeSlide(true); };
      let armed = false;
      const arm = ()=>{ if(armed) return; armed = true; lines.forEach(l=> l.classList.remove("ev-now")); setNavActive(true); setSwMood("point"); };
      const run = (i, done)=>{ lines.forEach(l=> l.classList.remove("ev-now"));
        if(i >= lines.length){ if(done) done(); return; }
        lines[i].classList.add("ev-now", "ev-said");
        play(lines[i]._src, ()=> setTimeout(()=> run(i + 1, done), 250)); };
      lines.forEach(l=> l.onclick = ()=>{ state.audioReplays++; lines.forEach(x=> x.classList.remove("ev-now"));
        l.classList.add("ev-now"); play(l._src, ()=>{ l.classList.remove("ev-now"); arm(); }); });
      state.replayAudio = ()=> run(0, arm);
      setSwMood("talk");
      const pre = audioFor(slide, "prompt");
      if(pre) play(pre, ()=> run(0, arm)); else run(0, arm);
      setTimeout(arm, 60000);   // watchdog: nav always eventually opens
    }
  },

  /* STORY_MIC_READ (HI02H02 SME review) — one story sentence per page, read ALOUD by the child, in the reference
     lesson's teaching frame (tutorial phase → .tut-card) and with its read-aloud look: the picture (.story-frame, pops on
     mount) above the sentence pill (.story-caption), the frame's MIC chip (.tut-audio) beside the pill.
     Flow: audio.prompt ("इस बटन पर टैप कीजिए और वाक्य पढ़िए।") while the mic pulses/glows (.p2-cue; idle: hand nudge,
     then the cue again) → TAP the mic: its glyph becomes the sound wave (.p2-rec) and the sentence's words light ONE
     BY ONE (.p2-word.on), data.word_ms (1 s) each, while the child reads → the mic greys out (.p2-rec-done) → the
     sentence VO plays, its words lit in step with the voice → आगे unlocks. The sentence pill replays it afterwards.
     data:{sentence:{text,audio,vo_text?}, image_id, page_no?, page_total?, credit?, fx?:'tears', word_ms?}. */
  STORY_MIC_READ: {
    mount(host, slide){
      const d = slide.data || {}; const sen = d.sentence || {}; const alive = aliveFor();
      const WORD_MS = d.word_ms || 1000;
      $("stage").classList.add("l02-story");   // the HI02H04_L02_S01 story-page layout (CSS [L02-STORY-FIG]); off again on leave
      onLeave(()=> $("stage").classList.remove("l02-story"));
      const wrap = document.createElement("div"); wrap.className = "story-scene mr-read";
      const frame = document.createElement("div"); frame.className = "story-frame mr-frame";
      frame.innerHTML = `<img class="story-img" src="assets/Images/${d.image_id}.${IMG_EXT}" alt="" onerror="this.style.visibility='hidden'">`;
      if(d.fx === "tears") frame.appendChild(tearsFx(d.fx_eyes));
      else if(d.fx === "fountain") frame.appendChild(fountainFx(d.fx_eyes));
      const cap = document.createElement("div"); cap.className = "story-caption has-chip mr-caption";
      const words = String(sen.text || "").trim().split(/\s+/).filter(Boolean).map((w, k)=>{
        if(k) cap.appendChild(document.createTextNode(" "));
        const s = document.createElement("span"); s.className = "p2-word"; s.textContent = w; cap.appendChild(s); return s; });
      wrap.appendChild(frame); wrap.appendChild(cap);
      host.appendChild(wrap);
      // the read-aloud MIC sits beside the sentence pill; the teaching frame keeps its own replay speaker at Swiftee's shoulder
      const mic = document.createElement("span"); mic.className = "mr-mic"; mic.innerHTML = SPK_SVG;
      mic.setAttribute("role", "button"); mic.setAttribute("aria-label", "टैप करके वाक्य पढ़िए");
      cap.appendChild(mic);
      frame.classList.add("p2-pop");                     // the reference picture pop (2 s) on mount
      // a long sentence wraps onto two centred lines; the picture then steps down a size so the आगे button keeps its gap
      const fitLines = ()=>{ if(!alive()) return;
        wrap.classList.remove("mr-two");                                      // measure at the full size (same frame: nothing paints in between)
        const rows = new Set(words.map(w=> Math.round(w.offsetTop / 6)));   // distinct word rows = the line count, whatever the pill's style
        wrap.classList.toggle("mr-two", rows.size > 1); };
      requestAnimationFrame(fitLines); if(document.fonts && document.fonts.ready) document.fonts.ready.then(fitLines);
      later(fitLines, 400); later(fitLines, 1200);                            // and again once the page has settled

      const sentSrc = sen.audio ? ("assets/Audio/" + sen.audio + "." + AUDIO_EXT) : null;
      const promptSrc = audioFor(slide, "prompt");
      state.ownsAudio = true; state.locked = false;
      $("hintBtn").style.display = "none";
      const nav = $("navBtn"); nav.style.display = ""; setNavActive(false);
      nav.onclick = ()=>{ if(!nav.disabled) completeSlide(true); };
      let phase = "cue";            // cue → rec → listen → done
      let idleT = null;
      const clearIdle = ()=>{ clearTimeout(idleT); idleT = null; };
      onLeave(clearIdle);
      const lit = (i)=> words.forEach((w, k)=> w.classList.toggle("on", k === i));
      // idle guidance while the mic waits: hand on the mic after 6 s, the spoken cue again after 7 s more
      const armIdle = ()=>{ clearIdle(); if(phase !== "cue") return;
        idleT = setTimeout(()=>{ if(!alive() || phase !== "cue") return; pointNudgeAt(mic); state.nudgeUsed = true;
          SwiftPAL.emit("nudge_invoked", { slide_id: slide.id, phase: slide.phase, target: "mic" });
          idleT = setTimeout(()=>{ if(!alive() || phase !== "cue") return; cue(); }, 7000); }, 6000); };
      const cue = ()=>{ if(phase !== "cue") return; cap.classList.add("p2-cue"); mic.classList.add("mr-glow"); setSwMood("talk");
        play(promptSrc, ()=>{ if(alive() && phase === "cue"){ setSwMood("point"); armIdle(); } }); };
      /* word sync while the sentence VO speaks: each shown word lights when the voice reaches it. The timing is the word's
         character offset in the spoken line (data.sentence.vo_text when the VO says more than the page shows) over the
         clip's own progress (currentAudio.currentTime / duration). */
      const voText = String(sen.vo_text || sen.text || "");
      const speak = (then)=> readAlong(words, voText, sentSrc, ()=>{ if(then) then(); });
      /* SME: once आगे is lit it pulses gently (.nav-call); after 6 s with no touch the hand points at it. Any touch hides the
         hand and the 6 s start again; a replayed sentence holds it back until the voice is over. */
      let navNudgeT = null;
      const armNavNudge = ()=>{ clearTimeout(navNudgeT);
        navNudgeT = setTimeout(()=>{ if(!alive() || phase !== "done" || !nav.classList.contains("active")) return;
          if(isPlaying){ armNavNudge(); return; }
          nudgeNavBtn(); SwiftPAL.emit("nudge_invoked", { slide_id: slide.id, phase: slide.phase, target: "next" }); }, 6000); };
      const onTouch = ()=>{ if(phase !== "done" || !nav.classList.contains("active")) return; stopNudge(); armNavNudge(); };
      document.addEventListener("pointerdown", onTouch, true);
      onLeave(()=>{ clearTimeout(navNudgeT); document.removeEventListener("pointerdown", onTouch, true); });
      const listen = ()=>{ phase = "listen"; setSwMood("talk");
        speak(()=>{ if(!alive()) return; phase = "done";
          setSwMood("point");
          /* the HI02H04_L02_S01 story page ([L02-POP-AFTER-SENTENCE]): when the sentence has been heard the picture POPS (the 2 s pop)
             with its sound, and आगे lights only once the pop is over (2 s after the voice) */
          frame.classList.remove("p2-pop"); void frame.offsetWidth; frame.classList.add("p2-pop");
          playSfx("sfx_burst");
          later(()=>{ if(!alive()) return; setNavActive(true); nav.classList.add("nav-call"); armNavNudge(); }, 2000);   // आगे lights and pulses
          SwiftPAL.emit("story_read_done", { slide_id: slide.id, phase: slide.phase, page: d.page_no || null,
            audio_replays: state.audioReplays, latency_ms: Date.now() - state.slideStart }); }); };
      mic.onclick = (e)=>{ if(e) e.stopPropagation();
        if(phase !== "cue") return;
        clearIdle(); stopNudge(); stopAudio(); _ac();
        phase = "rec"; cap.classList.remove("p2-cue"); mic.classList.remove("mr-glow"); mic.classList.add("p2-rec"); setSwMood("point");
        SwiftPAL.emit("mic_read_started", { slide_id: slide.id, words: words.length });
        let i = 0;
        const step = ()=>{ if(!alive()) return;
          if(i >= words.length){ lit(-1); mic.classList.remove("p2-rec"); mic.classList.add("p2-rec-done"); later(listen, 350); return; }
          lit(i); i++; later(step, WORD_MS); };
        step();
      };
      cap.onclick = ()=>{ if(phase !== "done" || document.body.classList.contains("vo-playing")) return; state.audioReplays++; speak(); };
      state.replayAudio = ()=>{ if(phase === "cue"){ clearIdle(); cue(); } else if(phase === "done") cap.onclick(); };
      cue();
    }
  },

  /* WORD_SEARCH (वर्ग पहेली, HI02H02 SME review) — a grid of अक्षर; the child finds each clue's word and rings
     it ("गोला लगाइए"). Words run only left→right or top→bottom (data.words[].dir 'h'|'v' from r,c). Select by
     DRAGGING across the cells, or TAP the first cell then the last. Clues are worked in order: the active clue
     is lit and read aloud (any listed word found early is accepted too). Wrong ring → the cells wiggle; per
     active word the misses climb: 1 = wiggle, 2 = hint_audio ("सही शब्द है …"), 3 = the hand traces the word.
     All found → शाबाश + confetti → advance. data:{grid:[[akshar]], words:[{word_hi, r, c, dir, clue_hi,
     clue_audio, word_audio, hint_audio, emoji?}], highlight_first?, mastery?, signal_name?}; audio:{prompt, correct}. */
  WORD_SEARCH: {
    mount(host, slide){
      const d = slide.data || {}; const alive = aliveFor();
      const G = d.grid || []; const R = G.length, C = (G[0] || []).length;
      const src = (id)=> id ? ("assets/Audio/" + id + "." + AUDIO_EXT) : null;
      const wrap = document.createElement("div"); wrap.className = "ws-wrap g" + C + (C > 6 ? " dense" : "");
      const board = document.createElement("div"); board.className = "ws-board ws-intro";
      later(()=> board.classList.remove("ws-intro"), 1300);   // the diagonal pop-in plays once, on open
      board.style.gridTemplateColumns = `repeat(${C}, var(--ws-cs))`;
      const cells = G.map((row, r)=> row.map((ch, c)=>{ const el = document.createElement("div"); el.className = "ws-cell";
        el.style.setProperty("--d", r + c);   // soft-cream tiles pop in diagonally (delay = r + c)
        el.dataset.r = r; el.dataset.c = c; el.innerHTML = `<span class="ws-ch">${ch}</span>`; board.appendChild(el); return el; }));
      const rings = document.createElement("div"); rings.className = "ws-rings"; board.appendChild(rings);
      // resolve each word's cells by walking from its start until the अक्षर spell the word
      const COLORS = ["#3EDB4E","#FF4D5E","#5B5BF0","#FF4FAE","#F2E33A","#1FD3EE","#FF9F2E","#A562FF"];   // capsule colours (the mock)
      const words = (d.words || []).map((w, i)=>{ const out = []; let acc = "";
        for(let k = 0; k < Math.max(R, C) && acc.length < w.word_hi.length; k++){
          const r = w.dir === "v" ? w.r + k : w.r, c = w.dir === "v" ? w.c : w.c + k;
          if(!cells[r] || !cells[r][c]) break; out.push(cells[r][c]); acc += G[r][c]; }
        if(acc !== w.word_hi) console.error("[WORD_SEARCH] word not in grid:", w.word_hi);
        return Object.assign({}, w, { i, cells: out, found: false, miss: 0, level: 0, color: COLORS[i % COLORS.length] }); });
      if(d.highlight_first) words.forEach(w=> w.cells[0] && w.cells[0].classList.add("ws-first"));
      // right side: progress dots, ONE numbered clue card at a time (it stays until its word is found), the found words below
      const side = document.createElement("div"); side.className = "ws-side";
      const dots = document.createElement("div"); dots.className = "ws-dots";
      const list = document.createElement("div"); list.className = "ws-clues ws-stage";
      const tray = document.createElement("div"); tray.className = "ws-tray";
      words.forEach((w, i)=>{ const it = document.createElement("div"); it.className = "ws-clue";
        const aks = w.cells.map(c=> c.textContent);
        it.innerHTML = `<span class="ws-num">${i + 1}</span><i class="ws-tw t1"></i><i class="ws-tw t2"></i>` +
          `<span class="ws-ctext">${w.clue_hi}</span><span class="ws-slots">${aks.map(a=> `<span class="ws-slot" data-a="${a}"></span>`).join("")}</span>`;
        it.onclick = ()=>{ if(state.hintActive) return; state.audioReplays++; play(src(w.clue_audio)); };
        w.item = it; list.appendChild(it);
        w.dot = document.createElement("i"); dots.appendChild(w.dot); });
      side.appendChild(dots); side.appendChild(list); side.appendChild(tray);
      wrap.appendChild(board); wrap.appendChild(side); host.appendChild(wrap);
      const fitSide = ()=>{ if(alive()) side.style.height = board.offsetHeight + "px"; };
      requestAnimationFrame(fitSide); if(document.fonts && document.fonts.ready) document.fonts.ready.then(fitSide);
      let shownCard = null;
      const showCard = (w)=>{ if(!w || shownCard === w.item) return;
        const old = shownCard; shownCard = w.item;
        if(old){ old.classList.add("leaving"); later(()=> old.classList.remove("show", "leaving"), 340); }
        w.item.classList.add("show"); };
      const syncDots = ()=>{ const a = words.find(x=> !x.found);
        words.forEach(x=>{ x.dot.classList.toggle("done", x.found); x.dot.classList.toggle("now", x === a); }); };

      state.ownsAudio = true; state.locked = false; state.attempts = 0; state.scaffoldLevel = 0;
      $("navBtn").style.display = "none"; setNavActive(false);
      const active = ()=> words.find(w=> !w.found);
      const markActive = ()=>{ const a = active(); words.forEach(w=> w.item.classList.toggle("active", w === a)); showCard(a); syncDots(); return a; };
      // --- hand demo (rung 3): the hand glides first cell → last cell, over and over, until the word is found
      let demo = null, demoT = null;
      const stopDemo = ()=>{ clearInterval(demoT); demoT = null; if(demo) demo.cells.forEach(c=> c.classList.remove("ws-hint")); demo = null;
        $("nudgeHand").classList.remove("glide"); stopNudge(); };
      onLeave(stopDemo);
      const runDemo = (w)=>{ stopDemo(); demo = w; w.cells.forEach(c=> c.classList.add("ws-hint"));
        const a = w.cells[0], b = w.cells[w.cells.length - 1]; let atEnd = false;
        $("nudgeHand").classList.remove("glide"); pointNudgeAt(a);
        requestAnimationFrame(()=> $("nudgeHand").classList.add("glide"));
        demoT = setInterval(()=>{ if(!alive()){ stopDemo(); return; } atEnd = !atEnd; pointNudgeAt(atEnd ? b : a); }, 1100); };
      const pauseDemo = ()=>{ clearInterval(demoT); demoT = null; $("nudgeHand").classList.remove("glide"); stopNudge(); };
      const rung = (w, n)=>{ w.level = Math.max(w.level, n); state.scaffoldLevel = Math.max(state.scaffoldLevel, n);
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, word: w.word_hi, level: n });
        if(n === 1){ setSwMood("tryagain");                                   // the wiggle is wrong()'s; the voice: "फिर से कोशिश कीजिए।"
          const s = audioFor(slide, "hint1");
          if(s){ state.hintActive = true; play(s, ()=>{ if(alive()){ state.hintActive = false; setSwMood("point"); } }); }
          return; }
        if(n === 2){ state.hintActive = true; setSwMood("hint");
          play(src(w.hint_audio), ()=>{ if(alive()){ state.hintActive = false; setSwMood("point"); } }); return; }
        setSwMood("hint"); runDemo(w); };
      // --- selection (drag, or tap-start + tap-end)
      let dragFrom = null, lastCell = null, anchor = null, painted = [];
      const live = document.createElement("div"); live.className = "ws-live"; rings.appendChild(live);
      const paint = (path)=>{ painted.forEach(c=> c.classList.remove("sel")); painted = path; path.forEach(c=> c.classList.add("sel"));
        if(path.length){ capsule(live, path[0], path[path.length - 1]); live.classList.add("on"); } else live.classList.remove("on"); };
      const cellAt = (x, y)=>{ const el = document.elementFromPoint(x, y); const c = el && el.closest ? el.closest(".ws-cell") : null; return (c && board.contains(c)) ? c : null; };
      const pathBetween = (a, b)=>{ const r1 = +a.dataset.r, c1 = +a.dataset.c, r2 = +b.dataset.r, c2 = +b.dataset.c; const out = [];
        if(Math.abs(c2 - c1) >= Math.abs(r2 - r1)){ for(let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) out.push(cells[r1][c]); }
        else { for(let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) out.push(cells[r][c1]); }
        return out; };
      const capsule = (el, a, b)=>{ const pad = 3;
        el.style.left = (a.offsetLeft + pad) + "px"; el.style.top = (a.offsetTop + pad) + "px";
        el.style.width = (b.offsetLeft + b.offsetWidth - a.offsetLeft - 2*pad) + "px";
        el.style.height = (b.offsetTop + b.offsetHeight - a.offsetTop - 2*pad) + "px"; };
      const drawRing = (w)=>{ const a = w.cells[0], b = w.cells[w.cells.length - 1]; const ring = document.createElement("div");
        ring.className = "ws-ring"; ring.style.setProperty("--wc", w.color); capsule(ring, a, b);
        rings.appendChild(ring); };
      const finish = ()=>{ state.locked = true; stopDemo(); markActive();
        const clean = words.filter(w=> w.level < 2).length;
        if(d.mastery){ state.masteryAttempts += words.length; state.masteryHits += clean; }
        SwiftPAL.emit(d.signal_name || "word_search_done", { slide_id: slide.id, phase: slide.phase, value: true,
          words: words.length, found_without_hint: clean, wrong_rings: state.attempts,
          scaffold_level: state.scaffoldLevel, latency_ms: Date.now() - state.slideStart });
        later(()=> celebrateThenAdvance(slide, false), 300); };
      /* CANDY POP + ARC FLY (SME pick, data.found_fx === "candy_arc" - P1): the found letters pop one by one like Candy Crush (a jelly
         squash-and-stretch + a star burst + a rising "tring", sfx_tring_1..6), then copies of the letters jump in a curved arc, one
         after another, into the clue's answer box, which bounces, turns green and rings a bright TRING (sfx_tring_big). The word's own
         voice follows the landing. Taps are held (hintActive) for the ~2 s it takes. */
      const CANDY = d.found_fx === "candy_arc";
      /* HAT FLY (SME, data.found_fx === "hat_arc" - P2): the same letter pops, then the letters fly in an arc INTO the magic hat, the hat
         gulps them with a sparkle, and the whole word rises out of the hat and flies to its place in the answer box. */
      const HATFLY = d.found_fx === "hat_arc";
      const wsScale = ()=> parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
      const at = (el)=>{ const s = wsScale(), wr = wrap.getBoundingClientRect(), r = el.getBoundingClientRect();
        return { x: (r.left - wr.left) / s, y: (r.top - wr.top) / s, w: r.width / s, h: r.height / s }; };
      const starBurst = (p, n, spread)=>{ for(let i = 0; i < n; i++){ const s = document.createElement("i"); s.className = "ws-cstar"; wrap.appendChild(s);
        const a = Math.PI * 2 * i / n + Math.random() * .5, dd = spread * (.7 + Math.random() * .5);
        const an = s.animate([{ transform: `translate(${p.x}px,${p.y}px) scale(.3) rotate(0deg)`, opacity: 1 },
          { transform: `translate(${p.x + Math.cos(a) * dd}px,${p.y + Math.sin(a) * dd + 12}px) scale(1) rotate(200deg)`, opacity: 0 }],
          { duration: 700, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" });
        an.onfinish = ()=> s.remove(); onLeave(()=> s.remove()); } };
      const settle = (w, wasActive)=>{
        w.item.classList.add("done"); w.item.querySelector(".ws-slots").innerHTML = `<span class="ws-answer">${w.word_hi}</span>`;
        { const chip = document.createElement("span"); chip.className = "ws-chip"; chip.textContent = w.word_hi;
          chip.style.setProperty("--wc", w.color); tray.appendChild(chip); }
        syncDots();
        play(src(w.word_audio), ()=>{ if(!alive()) return; state.hintActive = false;
          if(!active()){ finish(); return; }
          const a = markActive(); palUp(a, true); if(wasActive) play(src(a.clue_audio), ()=>{}); }); };
      const landBox = (w, wasActive)=>{ const box = w.item.querySelector(".ws-slots"), b = at(box);
        box.classList.add("ws-land"); later(()=> box.classList.remove("ws-land"), 600);
        starBurst({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, 12, 70); playSfx("sfx_tring_big"); settle(w, wasActive); };
      const hatFly = (w, wasActive)=>{ if(!alive()) return;
        const n = w.cells.length, IN = 700, GAP = 120;
        const cp = at(cap), k = cp.w / 230, mouth = { x: cp.x + 156 * k, y: cp.y + 122 * k };   // the hat's opening (the art's 243,190)
        w.cells.forEach((c, i)=>{ const p = at(c), f = document.createElement("div"); f.className = "ws-fly"; f.textContent = c.textContent;
          f.style.cssText = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;--wc:${w.color};`;
          wrap.appendChild(f); onLeave(()=> f.remove());
          const tx = mouth.x - p.w / 2 - p.x, ty = mouth.y - p.h / 2 - p.y;
          f.animate([{ transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
            { transform: `translate(${tx * .55}px,${Math.min(0, ty) - 90}px) scale(1.1) rotate(${i % 2 ? 14 : -14}deg)`, offset: .5 },
            { transform: `translate(${tx}px,${ty - 6}px) scale(.45) rotate(0deg)`, opacity: 1, offset: .88 },
            { transform: `translate(${tx}px,${ty + 10}px) scale(.15)`, opacity: 0 }],
            { duration: IN, delay: i * GAP, easing: "ease-in-out", fill: "forwards" }).onfinish = ()=> f.remove(); });
        const inAt = IN + (n - 1) * GAP;
        later(()=>{ if(!alive()) return;                                                        // the hat gulps them
          const sv = cap.querySelector(".cap-svg");
          if(sv) sv.animate([{ transform: "scale(1)" }, { transform: "scale(1.12,.86)" }, { transform: "scale(.94,1.1)" }, { transform: "scale(1)" }],
            { duration: 420, easing: "ease-out" });
          starBurst(mouth, 10, 54); playSfx("sfx_tring_" + Math.min(6, n + 1));
        }, inAt);
        later(()=>{ if(!alive()) return;                                                        // the word rises out of the hat ...
          const card = document.createElement("div"); card.className = "ws-fly ws-flyword"; card.textContent = w.word_hi;
          card.style.setProperty("--wc", w.color); wrap.appendChild(card); onLeave(()=> card.remove());
          const cw = card.offsetWidth, ch = card.offsetHeight;
          card.style.left = (mouth.x - cw / 2) + "px"; card.style.top = (mouth.y - ch / 2) + "px";
          const b = at(w.item.querySelector(".ws-slots"));
          const dx = b.x + b.w / 2 - mouth.x, dy = b.y + b.h / 2 - mouth.y;
          const an = card.animate([{ transform: "translate(0,10px) scale(.15)", opacity: 0 },
            { transform: "translate(0,-70px) scale(1.15)", opacity: 1, offset: .35 },
            { transform: "translate(0,-62px) scale(1)", opacity: 1, offset: .5 },
            { transform: `translate(${dx}px,${dy}px) scale(.85)`, opacity: 1, offset: .95 },
            { transform: `translate(${dx}px,${dy}px) scale(.8)`, opacity: 0 }],
            { duration: 1300, easing: "ease-in-out", fill: "forwards" });
          an.onfinish = ()=>{ card.remove(); if(alive()) landBox(w, wasActive); };            // ... and lands in its place
        }, inAt + 380);
      };
      const found = (w)=>{ const wasActive = (w === active()); w.found = true;
        if(demo === w) stopDemo();
        w.cells.forEach((c, k)=>{ c.classList.add("found"); c.style.setProperty("--wc", w.color); c.style.setProperty("--k", k); });   // --k: the wave-hop order
        drawRing(w);
        capHide();
        setSwMood("happy");
        SwiftPAL.emit("word_found", { slide_id: slide.id, word: w.word_hi, misses: w.miss, level: w.level });
        state.hintActive = true;
        if(!CANDY && !HATFLY){ sfxCorrect(); settle(w, wasActive); return; }
        const n = w.cells.length, STEP = 200;
        w.cells.forEach((c, i)=> later(()=>{ c.classList.add("ws-candy");
          c.animate([{ transform: "scale(1)" }, { transform: "scale(1.35,.7)" }, { transform: "scale(.8,1.25)" }, { transform: "scale(1.1,.92)" }, { transform: "scale(1)" }],
            { duration: 520, easing: "ease-out" });
          const p = at(c); starBurst({ x: p.x + p.w / 2, y: p.y + p.h / 2 }, 7, 46);
          playSfx("sfx_tring_" + Math.min(6, i + 1)); }, i * STEP));
        if(HATFLY){ later(()=> hatFly(w, wasActive), (n - 1) * STEP + 520); return; }
        later(()=>{ const box = w.item.querySelector(".ws-slots"), b = at(box), FLY = 750, GAP = 140;
          const lw = Math.min(54, (b.w - 16) / n);
          w.cells.forEach((c, i)=>{ const p = at(c), f = document.createElement("div"); f.className = "ws-fly"; f.textContent = c.textContent;
            f.style.cssText = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;--wc:${w.color};`;
            wrap.appendChild(f); onLeave(()=> f.remove());
            const tx = b.x + b.w / 2 - (n - 1) * lw / 2 + i * lw - p.w / 2 - p.x, ty = b.y + b.h / 2 - p.h / 2 - p.y;
            f.animate([{ transform: "translate(0,0) scale(1) rotate(0deg)" },
              { transform: `translate(${tx * .5}px,${Math.min(0, ty) - 110}px) scale(1.2) rotate(-12deg)`, offset: .5 },
              { transform: `translate(${tx}px,${ty}px) scale(.62) rotate(0deg)`, opacity: 1, offset: .92 },
              { transform: `translate(${tx}px,${ty}px) scale(.5)`, opacity: 0 }],
              { duration: FLY, delay: i * GAP, easing: "ease-in-out", fill: "forwards" }).onfinish = ()=> f.remove(); });
          later(()=>{ if(!alive()) return;
            box.classList.add("ws-land"); later(()=> box.classList.remove("ws-land"), 600);
            starBurst({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, 12, 70);
            playSfx("sfx_tring_big");
            settle(w, wasActive); }, FLY + (n - 1) * GAP);
        }, (n - 1) * STEP + 520);
      };
      const wrong = (path)=>{ sfxWrongSoft(); state.attempts++;
        path.forEach(c=>{ c.classList.remove("ws-wrong"); void c.offsetWidth; c.classList.add("ws-wrong"); });
        later(()=> path.forEach(c=> c.classList.remove("ws-wrong")), 650);
        $("hintBtn").classList.add("show");
        SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
        const w = active(); if(!w) return; w.miss++;
        rung(w, Math.min(Math.max(w.miss, w.level + 1), 3)); };
      /* SME: ONLY THE TARGET WORD'S LETTERS CAN BE DRAGGED. A drag starts only on a letter of the active word and only grows
         over that word's letters; any other letter just wiggles (a miss on the usual ladder: wiggle -> "सही शब्द है ..." -> hand). */
      const inTarget = (c)=>{ const a = active(); return !!a && a.cells.includes(c); };
      const okPath = (p)=>{ const a = active(); return !!a && p.length > 0 && p.every(c=> a.cells.includes(c)); };
      const evaluate = (path)=>{ paint([]); if(path.length < 2) return;
        const w = words.find(x=> !x.found && x.cells.length === path.length && x.cells[0] === path[0] && x.cells[x.cells.length - 1] === path[path.length - 1]);
        if(w) found(w); else if(!okPath(path)) wrong(path); };   // part of the target word: simply let go
      board.addEventListener("pointerdown", (e)=>{ if(state.locked || state.hintActive) return;
        const c = cellAt(e.clientX, e.clientY); if(!c) return; e.preventDefault();
        if(demoT) pauseDemo();
        if(!inTarget(c)){ if(anchor){ anchor.classList.remove("anchor"); anchor = null; } paint([]); wrong([c]);   // not a letter of the word
          if(demo && !demo.found && !demoT && alive()) later(()=>{ if(demo && !demo.found && !state.locked) runDemo(demo); }, 900);
          return; }
        dragFrom = c; lastCell = c; paint(anchor && anchor !== c && okPath(pathBetween(anchor, c)) ? pathBetween(anchor, c) : [c]);
        try{ board.setPointerCapture(e.pointerId); }catch(err){} });
      board.addEventListener("pointermove", (e)=>{ if(!dragFrom) return; const c = cellAt(e.clientX, e.clientY);
        if(!c || c === lastCell) return; const p = pathBetween(dragFrom, c); if(!okPath(p)) return;   // the selection never leaves the word
        lastCell = c; paint(p); });
      const up = (e)=>{ if(!dragFrom) return; const from = dragFrom, to = lastCell || from; dragFrom = null;
        if(anchor) anchor.classList.remove("anchor");
        if(to === from){
          if(anchor && anchor !== to){ const a = anchor; anchor = null; evaluate(pathBetween(a, to)); }
          else if(anchor === to){ anchor = null; paint([]); }
          else { anchor = to; to.classList.add("anchor"); paint([to]); sfxTap(); }
        } else { anchor = null; evaluate(pathBetween(from, to)); }
        if(demo && !demo.found && !demoT && alive()) later(()=>{ if(demo && !demo.found && !state.locked) runDemo(demo); }, 900); };
      board.addEventListener("pointerup", up);
      board.addEventListener("pointercancel", ()=>{ dragFrom = null; paint(anchor ? [anchor] : []); });
      $("hintBtn").onclick = ()=>{ const w = active(); if(state.locked || state.hintActive || !w || w.level >= 3) return;
        state.hintUsed = true; rung(w, w.level + 1); };
      // re-hear: the instruction + the active clue
      const intro = ()=>{ setSwMood("talk"); const a = markActive();
        play(audioFor(slide, "prompt") || null, ()=>{ if(alive() && a && !a.found) play(src(a.clue_audio), ()=>{ if(alive()) setSwMood("point"); }); }); };
      state.replayAudio = intro;
      intro();

      /* THE MAGIC HAT - always on the page (SME). A character that belongs to the word lives in it (data.words[].pal - a shy
         face for चुपचाप, a farmer for किसान ...): it peeks out each time a new clue comes up; after 6 s with no touch and no
         voice it climbs out, the clue is read again and it throws its own things (data.words[].fx - grain, rain drops, nuts
         ...) onto the FIRST LETTER of the word, which glows gold. Any touch sends it back down into the hat; it comes up again
         after the next quiet 6 s. It speaks before the engine's 7 s reminder would, so the two never overlap. Not a hint
         rung: no score change. */
      const CAP_IDLE_MS = 6000;
      const cap = document.createElement("div"); cap.className = "ws-cap"; cap.innerHTML = '<i class="ws-cap-aura"></i>' + CAP_SVG +
        '<div class="ws-pal"><span class="ws-pal-ch"></span></div>';
      side.appendChild(cap);
      const pal = cap.querySelector(".ws-pal-ch");
      const palOf = (w)=> (w && (w.pal || w.emoji)) || "🐰";
      const fxOf = (w)=> (w && w.fx) || "✨";
      let palT = null;
      /* the hat's guest: a story picture when the word has one (data.words[].pal_img - P1), else the word's character (pal) */
      const palSet = (w)=>{ if(w && w.pal_img){ pal.classList.add("is-pic");
          if(pal._img !== w.pal_img){ pal._img = w.pal_img;
            pal.innerHTML = `<img src="assets/Images/${w.pal_img}.${IMG_EXT}" alt="" draggable="false">`;
            cap.classList.remove("loop"); void cap.offsetWidth; cap.classList.add("loop"); } }   // a new picture: the show starts over
        else { pal.classList.remove("is-pic"); pal.textContent = palOf(w); } };
      const palUp = (w, peek)=>{ clearTimeout(palT); palSet(w); cap.classList.add("pal-up");
        if(peek) palT = setTimeout(()=>{ if(!capOn) cap.classList.remove("pal-up"); }, (w && w.pal_img) ? 4200 : 2600); };   // a picture gets time to grow
      const palDown = ()=>{ clearTimeout(palT); cap.classList.remove("pal-up"); };
      /* P1 (story pictures): the "Wand Halo + Ghost Grow" show - while the picture is up the wand circles round and round over the
         hat with a ring of gold sparkles, and the picture grows from a tiny, faint, blurry ghost into a full, sharp picture (CSS) */
      if(words.some(w=> w.pal_img)){ cap.classList.add("halo");
        /* the hat's own loop (SME): the wand appears, draws a glowing zigzag over the hat and vanishes; the picture rises out of the
           hat, holds, sinks back in - and again (CSS .ws-cap.halo.loop, 7 s) */
        cap.insertAdjacentHTML("beforeend", '<svg class="ws-zig" viewBox="0 0 230 232" aria-hidden="true"><polyline points="95,80 125,50 155,80 185,50 215,80" pathLength="100"/></svg>');
        cap.insertAdjacentHTML("beforeend", '<div class="ws-halo">' + Array.from({ length: 8 }, (_, k)=> `<i style="--k:${k}"></i>`).join("") + "</div>"); }
      later(()=> cap.classList.add("in"), 500);                      // the hat pops in with the page and stays
      later(()=>{ const a = active(); if(a && !capOn) palUp(a, true); }, 1300);
      onLeave(()=> clearTimeout(palT));
      let capOn = false, capWord = null, capCastT = null, capHoldT = null, lastAct = Date.now(), quietSince = Date.now();
      const scaleNow = ()=> parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
      const castSparkles = (cell)=>{ if(!capOn || !cell) return;
        const s = scaleNow(), wr = wrap.getBoundingClientRect(), tr = cell.getBoundingClientRect();
        const tip = pal.getBoundingClientRect();                           // the word's things fly from its character
        const x0 = (tip.left - wr.left + tip.width/2)/s, y0 = (tip.top - wr.top + tip.height/2)/s;
        const x1 = (tr.left - wr.left + tr.width/2)/s, y1 = (tr.top - wr.top + tr.height/2)/s;
        const mx = (x0 + x1)/2, my = Math.min(y0, y1) - 34;
        for(let i = 0; i < 10; i++){ const sp = document.createElement("i"); sp.className = "ws-fxp" + (i % 3 ? "" : " big");
          sp.textContent = fxOf(capWord); wrap.appendChild(sp);
          const jx = (Math.random() - .5) * 26, jy = (Math.random() - .5) * 26;
          const an = sp.animate([
            { transform: `translate(${x0}px,${y0}px) scale(.3) rotate(0deg)`, opacity: 0 },
            { transform: `translate(${mx + jx}px,${my + jy}px) scale(1) rotate(90deg)`, opacity: 1, offset: .45 },
            { transform: `translate(${x1 + jx*.6}px,${y1 + jy*.6}px) scale(.5) rotate(200deg)`, opacity: 0 } ],
            { duration: 1000, delay: i * 70, easing: "ease-in-out", fill: "both" });
          an.onfinish = ()=> sp.remove(); onLeave(()=> sp.remove()); } };
      function capHide(){ if(!capOn) return; capOn = false;
        clearInterval(capCastT); clearTimeout(capHoldT);
        cap.classList.remove("cast", "talk"); palDown();                  // the character ducks back in; the hat stays
        if(capWord && capWord.cells[0]) capWord.cells[0].classList.remove("ws-cap-glow");
        capWord = null; quietSince = Date.now(); }
      const capShow = (w)=>{ capOn = true; capWord = w;
        SwiftPAL.emit("idle_guide_shown", { slide_id: slide.id, phase: slide.phase, word: w.word_hi });
        palUp(w, false);
        later(()=>{ if(!capOn || capWord !== w) return;
          cap.classList.add("cast"); w.cells[0].classList.add("ws-cap-glow");
          /* SME: no particles fly from the hat to the letter any more (castSparkles is kept, unused) - the letter's gold glow remains */
          cap.classList.add("talk");
          play(src(w.clue_audio), ()=>{ cap.classList.remove("talk");
            if(capOn && capWord === w) capHoldT = setTimeout(capHide, 2600); }); }, 750); };
      wrap.addEventListener("pointerdown", ()=>{ lastAct = Date.now(); capHide(); }, true);
      const capTick = setInterval(()=>{
        if(!alive()){ clearInterval(capTick); return; }
        if(isPlaying || state.hintActive || demoT || dragFrom || anchor){ if(!capOn) quietSince = Date.now(); return; }
        if(capOn || state.locked) return;
        const a = active(); if(!a) return;
        if(Date.now() - Math.max(lastAct, quietSince) >= CAP_IDLE_MS) capShow(a);
      }, 250);
      onLeave(()=>{ clearInterval(capTick); clearInterval(capCastT); clearTimeout(capHoldT); });
    }
  },

  /* EVIDENCE_QA (H04 L03) — a comprehension question WITH its proof. Left: the passage (picture + text);
     right: the question-type chip (📖 सीधा / 🔍 अनुमान) + answer options (standard mountTapOptions contract:
     speak-on-tap · buzz+✗+lock · confetti+advance · try→hint→reveal). data.highlight:true (guided) shows
     the evidence/clue lines up front; without it (practice) the HINT step lights them. data.auto:true
     (tutorial) = fully autonomous demo: question → type explanation → evidence lights + is read →
     answer explanation → the right option is marked; आगे unlocks at the end. data:{qtype:'literal'|
     'inference', passage, evidence:[line idx], options:[{label_hi,img?,emoji?,audio,correct?}], highlight?,
     auto?, mastery?}; audio:{prompt, explain_type, explain_answer, try_again, hint, reveal}. */
  EVIDENCE_QA: {
    mount(host, slide){
      const d = slide.data || {}; const qt = d.qtype === "inference" ? "inference" : "literal";
      const wrap = document.createElement("div"); wrap.className = "ev-qa";
      const card = evPassage(d.passage); const lines = card._lines;
      if(d.auto) card.classList.add("with-lens");   // SME: the magnifying glass reads along in the tutorial demos (T7, T8) only
      const right = document.createElement("div"); right.className = "ev-right";
      wrap.appendChild(card); wrap.appendChild(right); host.appendChild(wrap);
      const chip = evQtypeChip(qt, d.chip_hi, d.chip_icon); chip.style.cursor = "pointer";
      chip.onclick = ()=>{ if(state.hintActive) return; state.audioReplays++; play(audioFor(slide, "prompt") || null); };
      const ev = d.evidence || [];
      const showEv = ()=> evMark(lines, ev, qt);
      const pulse = (on)=> ev.forEach(i=> lines[i] && lines[i].classList.toggle("ev-pulse", on));
      lines.forEach(l=> l.onclick = ()=>{ if(state.hintActive || d.auto || isPlaying) return; state.audioReplays++; evReadLine(l); });
      const hintAction = (done)=>{ showEv(); pulse(true); setSwMood("hint");
        play(audioFor(slide, "hint") || null, ()=>{ pulse(false); done(); }); };
      const optionRenderer = (o)=>{ const c = document.createElement("div"); c.className = "ev-opt" + ((o.img || o.emoji) ? "" : " text-only");
          if(o.correct) c.dataset.ok = "1";
          c.innerHTML = ((o.img || o.emoji) ? imgOrEmoji(o.img, o.emoji, "ev-opt-img", "ev-opt-emoji") : "") +
                        `<span class="ev-opt-lbl">${o.label_hi || ""}</span>`;
          return c; };
      if(d.ladder && !d.auto){
        // HI02H02 SME hint ladder: wiggle → read every option → name the answer (see mountLadderOptions)
        mountLadderOptions({ slide, host: right, signalName: d.signal_name || "evidence_qa_first_try", stimulus: chip,
          options: d.options, optionRenderer, mastery: d.mastery === true });
      } else {
        mountTapOptions({ slide, host: right, signalName: d.signal_name || "evidence_qa_first_try", stimulus: chip,
          options: d.options, isCorrect: o=> o.correct === true, columnsHint: 1, mastery: d.mastery === true,
          hintAction, nudgeTarget: null, shuffle: d.shuffle, optionRenderer });
      }
      // stacked layout (SME review): ONE card = the picture (the "नया शब्द" tag as a badge on its corner) with the clue
      // sentences UNDER it; the answer cards in one row under the card
      { const txt = card.querySelector(".ev-text"), pic = card.querySelector(".ev-pic");
        if(txt){ const side = document.createElement("div"); side.className = "ev-side";
          card.insertBefore(side, txt); side.appendChild(txt); }
        if(pic) pic.appendChild(chip); else if(txt) txt.parentNode.insertBefore(chip, txt); }
      state.ownsAudio = true;
      if(d.highlight) showEv();
      if(d.auto){
        state.locked = true; stopNudge(); $("hintBtn").style.display = "none";
        const alive = aliveFor();
        const nav = $("navBtn"); nav.style.display = ""; setNavActive(false);
        nav.onclick = ()=>{ if(!nav.disabled) completeSlide(true); };
        let armed = false; const arm = ()=>{ if(armed || !alive()) return; armed = true; setNavActive(true); setSwMood("point"); };
        // optional roles are skipped (no silent beat): explain_type, evidence_read (one clip that paraphrases
        // the clue lines instead of reading them one by one), conclude (the strategy wrap-up line)
        const say = (key, cb)=>{ if(!alive()) return; const s = audioFor(slide, key); if(s) play(s, cb); else cb(); };
        const readEv = (i, cb)=>{ if(!alive()) return; lines.forEach(l=> l.classList.remove("ev-now"));
          if(i >= ev.length){ cb(); return; }
          const l = lines[ev[i]]; if(!l){ readEv(i + 1, cb); return; }
          evReadLine(l, ()=> later(()=> readEv(i + 1, cb), 200)); };
        /* FLIP-CARD reveal (SME pick): the right card turns green, the wrong cards slide away, the right card moves to the
           centre and FLIPS like a flash card - its back shows the meaning ("ठोकर — किसी चीज़ से पैर टकराना") */
        const ok = right.querySelector('.opt-cell[data-ok="1"]');
        const okFront = ok ? ok.innerHTML : "";
        const backHTML = d.meaning ? `<span class="ev-opt-lbl"><b class="evm-word">${d.meaning.word_hi}</b><span class="evm-dash">—</span>${d.meaning.meaning_hi}</span>` : null;
        const resetReveal = ()=>{ right.querySelectorAll(".opt-cell").forEach(c=> c.classList.remove("opt-dim", "ev-leave"));
          if(!ok) return; kitClear(ok);
          ok.classList.remove("correct", "ev-flip", "ev-back", "ev-solo"); ok.innerHTML = okFront; };
        const flipReveal = ()=>{ if(!ok) return;
          ok.classList.add("correct"); if(window.FLNKit) FLNKit.ck(ok, {});   // the kit's green correct ring
          later(()=>{ right.querySelectorAll(".opt-cell").forEach(c=>{ if(c !== ok) c.classList.add("ev-leave"); });   // wrong cards slide away
            ok.classList.add("ev-solo"); }, 700);                                                                         // the right card widens, centred
          if(!backHTML) return;
          later(()=>{ ok.classList.add("ev-flip");                                                                       // flip: edge-on at the half-way point...
            later(()=>{ kitClear(ok); ok.classList.remove("correct");
              ok.innerHTML = backHTML; ok.classList.add("ev-back"); }, 300);                                             // ...where the face becomes the meaning
            later(()=> ok.classList.remove("ev-flip"), 650); }, 1550); };
        const seq = (done)=>{ setSwMood("teach"); resetReveal();
          say("prompt", ()=> say("explain_type", ()=>{
            showEv(); pulse(true);
            const afterEv = ()=>{ pulse(false); lines.forEach(l=> l.classList.remove("ev-now"));
              say("explain_answer", ()=>{
                flipReveal();
                sfxCorrect(); burstStars(); setSwMood("happy");
                say("conclude", ()=>{ if(done) done(); }); }); };
            if(audioFor(slide, "evidence_read") && !ev.every(i=> lines[i] && lines[i]._src)){ ev.forEach(i=> lines[i] && lines[i].classList.add("ev-now")); say("evidence_read", afterEv); }
            else readEv(0, afterEv); })); };
        state.replayAudio = ()=> seq(arm);
        seq(arm);
        later(arm, 90000);
      } else {
        const alive = aliveFor();
        // chained back to back inside each clip's end: the screen never unlocks between the clips, and any tap/hint
        // that speaks (a new play()) simply ends the chain - no queued line can talk over it later
        const readAll = (i)=>{ if(!alive() || i >= lines.length) return;
          evReadLine(lines[i], ()=> readAll(i + 1)); };
        const intro = ()=> play(audioFor(slide, "prompt") || null, ()=> readAll(0));
        state.replayAudio = intro;
        intro();
      }
    }
  },

  /* FIND_EVIDENCE (H04 L03) — PRODUCE / find-in-context: the child SCANS the story text and taps the
     sentence where the answer is written (the literal-question proof). Tap = that sentence is read aloud;
     right → green + confetti + correct VO + advance; wrong → soft buzz + that sentence crosses out + locks,
     then try_again → hint → REVEAL at max_attempts. data:{passage, answer_line (line idx), mastery?};
     audio:{prompt, try_again, hint, correct, reveal}. */
  FIND_EVIDENCE: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "ev-find";
      const card = evPassage(d.passage, {big:true}); const lines = card._lines;
      card.classList.add("findable");
      const chip = evQtypeChip(d.chip_kind || "literal", d.chip_hi, d.chip_icon); chip.classList.add("ev-find-chip");
      chip.insertAdjacentHTML("beforeend", `<span class="ev-find-do">· ${d.do_hi || "उत्तर वाला वाक्य छुओ"}</span>`);
      chip.style.cursor = "pointer";
      chip.onclick = ()=>{ if(state.locked) return; state.audioReplays++; play(audioFor(slide, "prompt") || null); };
      wrap.appendChild(chip); wrap.appendChild(card); host.appendChild(wrap);
      state.attempts = 0; state.locked = false; state.scaffoldLevel = 0; state.ownsAudio = true;
      const maxA = (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
      const tgt = lines[d.answer_line];
      const reveal = ()=>{ state.locked = true; state.scaffoldLevel = 3; setSwMood("hint");
        if(tgt) tgt.classList.add("correct", "reveal-pulse");
        SwiftPAL.emit("answer_revealed", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts, reason: "wrong" });
        play(audioFor(slide, "reveal") || null, ()=> play(tgt ? tgt._src : null, ()=> setTimeout(()=> completeSlide(false), 700))); };
      lines.forEach((l, i)=> l.onclick = ()=>{
        if(state.locked || state.hintActive || l.classList.contains("crossed")) return; stopNudge();
        if(i === d.answer_line){
          state.locked = true; l.classList.add("correct"); sfxCorrect(); confettiCannon(); setSwMood("happy");
          if(d.mastery){ state.masteryAttempts++; if(state.attempts === 0) state.masteryHits++; }
          SwiftPAL.emit("evidence_find_first_try", { slide_id: slide.id, phase: slide.phase, value: true,
            first_try: state.attempts === 0, attempts: state.attempts + 1, scaffold_level: state.scaffoldLevel,
            latency_ms: Date.now() - state.slideStart });
          play(l._src, ()=> play(audioFor(slide, "correct") || null, ()=> setTimeout(()=> completeSlide(true), 600)));
        } else {
          state.attempts++; l.classList.add("crossed"); sfxWrongSoft(); setSwMood("tryagain"); $("hintBtn").classList.add("show");
          SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          play(l._src, ()=>{
            if(state.attempts >= maxA) reveal();
            else if(state.attempts >= 2){ state.scaffoldLevel = Math.max(state.scaffoldLevel, 2); setSwMood("hint"); play(audioFor(slide, "hint") || null, ()=>{}); }
            else { state.scaffoldLevel = Math.max(state.scaffoldLevel, 1); play(audioFor(slide, "try_again") || null, ()=>{}); }
          });
        }
      });
      $("hintBtn").onclick = ()=>{ if(state.locked) return; state.hintUsed = true;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true }); setSwMood("hint");
        play(audioFor(slide, "hint") || null, ()=>{}); };
      $("navBtn").style.display = "none"; setNavActive(false);
      state.replayAudio = ()=> play(audioFor(slide, "prompt") || null, ()=>{});
      setSwMood("point");
      play(audioFor(slide, "prompt") || null, ()=>{});
    }
  },

  /* QTYPE_RECAP (H04 L03) — AUTONOMOUS "name the target" beat: the two question types side by side
     (📖 सीधा प्रश्न / 🔍 अनुमान प्रश्न), each card lights while its line is spoken. data:{cards:[{kind,
     title_hi, body_hi, example_hi?, audio}]}. आगे unlocks after both. */
  QTYPE_RECAP: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "ev-recap";
      const els = (d.cards || []).map(c=>{ const el = document.createElement("div"); el.className = "ev-recap-card " + (c.kind === "inference" ? "inference" : "literal");
        el.innerHTML = `<div class="rc-ic">${c.kind === "inference" ? "🔍" : "📖"}</div><div class="rc-title">${c.title_hi || ""}</div>` +
          `<div class="rc-body">${c.body_hi || ""}</div>` + (c.example_hi ? `<div class="rc-ex">${c.example_hi}</div>` : "");
        el._src = c.audio ? ("assets/Audio/" + c.audio + "." + AUDIO_EXT) : null;
        el.onclick = ()=>{ state.audioReplays++; play(el._src); };
        wrap.appendChild(el); return el; });
      host.appendChild(wrap);
      state.ownsAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=>{ if(!$("navBtn").disabled) completeSlide(true); };
      let armed = false; const arm = ()=>{ if(armed) return; armed = true; els.forEach(e=> e.classList.remove("now")); setNavActive(true); setSwMood("point"); };
      const run = (i)=>{ els.forEach(e=> e.classList.remove("now")); if(i >= els.length){ arm(); return; }
        els[i].classList.add("now", "seen"); play(els[i]._src, ()=> setTimeout(()=> run(i + 1), 300)); };
      state.replayAudio = ()=> run(0);
      setSwMood("teach");
      const pre = audioFor(slide, "prompt");
      if(pre) play(pre, ()=> run(0)); else run(0);
      setTimeout(arm, 45000);
    }
  },

  /* SORT_QTYPE (H04 L03) — PRODUCE: sort story FACTS into two boxes — "📖 कहानी में लिखा है" (literal)
     vs "🔍 सोचकर पता चला" (inferred). Drag a card onto a box, OR tap a card (it is read aloud + selected)
     then tap a box. Right → snaps in; wrong → buzz + box flashes red + spoken try_again → hint; after
     max consecutive misses the next card is placed for the child (reveal ceiling). All placed →
     celebrate + advance. data:{items:[{text, audio, kind:'literal'|'inference'}], mastery?};
     audio:{prompt, try_again, hint, correct, reveal}. */
  SORT_QTYPE: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "ev-sort";
      const bins = document.createElement("div"); bins.className = "ev-sort-bins";
      const mkBin = (kind, ic, title)=>{ const b = document.createElement("div"); b.className = "ev-sort-bin dd-zone " + kind;
        b.dataset.kind = kind; b.innerHTML = `<div class="esb-title"><span class="ic">${ic}</span>${title}</div><div class="esb-items"></div>`;
        bins.appendChild(b); return b; };
      const _bins = d.bins || [{kind:"literal", icon:"📖", title_hi:"कहानी में लिखा है"}, {kind:"inference", icon:"🔍", title_hi:"सोचकर पता चला"}];
      const bL = mkBin(_bins[0].kind, _bins[0].icon, _bins[0].title_hi), bI = mkBin(_bins[1].kind, _bins[1].icon, _bins[1].title_hi);
      const tray = document.createElement("div"); tray.className = "ev-sort-tray";
      const items = (d.items || []).slice();
      for(let i = items.length - 1; i > 0; i--){ const j = (Math.random()*(i+1))|0; [items[i], items[j]] = [items[j], items[i]]; }
      let sel = null;
      const tiles = items.map(it=>{ const t = document.createElement("div"); t.className = "ev-sort-item";
        t.dataset.kind = it.kind; t.innerHTML = `<span class="esi-text">${it.text}</span>`;
        t._src = it.audio ? ("assets/Audio/" + it.audio + "." + AUDIO_EXT) : null;
        const speak = ()=>{ if(t.classList.contains("snapped") || state.locked || state.hintActive) return; stopNudge(); state.audioReplays++;
          tiles.forEach(x=> x.classList.remove("sel")); t.classList.add("sel"); sel = t; play(t._src); };
        t.addEventListener("mousedown", speak); t.addEventListener("touchstart", speak, {passive:true});
        tray.appendChild(t); return t; });
      wrap.appendChild(bins); wrap.appendChild(tray); host.appendChild(wrap);
      state.attempts = 0; state.locked = false; state.ownsAudio = true;
      const maxA = (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
      let placed = 0, streak = 0, revealed = false; const need = tiles.length;
      const settle = (bin, t)=>{ t.classList.remove("sel", "dragging"); t.classList.add("snapped"); t.style.transform = "";
        bin.querySelector(".esb-items").appendChild(t); placed++; if(sel === t) sel = null;
        if(placed === need){ state.locked = true;
          if(d.mastery){ state.masteryAttempts++; if(state.attempts === need) state.masteryHits++; }
          SwiftPAL.emit("qtype_sort_done", { slide_id: slide.id, phase: slide.phase, value: !revealed,
            attempts: state.attempts, latency_ms: Date.now() - state.slideStart });
          setTimeout(()=> celebrateThenAdvance(slide, revealed), 300); } };
      const revealOne = ()=>{ const t = tiles.find(x=> !x.classList.contains("snapped")); if(!t) return;
        revealed = true; streak = 0; const bin = t.dataset.kind === bI.dataset.kind ? bI : bL;
        t.classList.add("reveal-glow"); bin.classList.add("reveal-glow"); state.hintActive = true;
        play(audioFor(slide, "reveal") || null, ()=>{ t.classList.remove("reveal-glow"); bin.classList.remove("reveal-glow");
          state.hintActive = false; settle(bin, t); }); };
      const tryDrop = (bin, t)=>{ if(state.locked || state.hintActive || t.classList.contains("snapped")) return;
        state.attempts++;
        if(bin.dataset.kind === t.dataset.kind){ streak = 0; sfxCorrect(); burstStars(); setSwMood("happy"); settle(bin, t); }
        else { t.style.transform = ""; bin.classList.add("wrong-flash"); setTimeout(()=> bin.classList.remove("wrong-flash"), 600);
          $("hintBtn").classList.add("show");
          SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          if(++streak >= maxA){ sfxWrongSoft(); setSwMood("hint"); revealOne(); }
          else if(streak === 2){ sfxWrongSoft(); setSwMood("hint"); play(audioFor(slide, "hint") || null, ()=>{}); }
          else dragWrong(slide); } };
      tiles.forEach(t=> makeDraggable(t, (zone, tile)=>{ const bin = zone.closest(".ev-sort-bin"); if(bin) tryDrop(bin, tile); }));
      [bL, bI].forEach(b=> b.addEventListener("click", ()=>{ if(sel) tryDrop(b, sel); }));
      $("hintBtn").onclick = ()=>{ if(state.locked || state.hintActive) return; state.hintUsed = true;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true }); setSwMood("hint"); play(audioFor(slide, "hint") || null, ()=>{}); };
      $("navBtn").style.display = "none"; setNavActive(false);
      state.replayAudio = ()=> play(audioFor(slide, "prompt") || null, ()=>{});
      setSwMood("point");
      play(audioFor(slide, "prompt") || null, ()=>{});
      startNudge(slide, tiles[0]);
    }
  },

  /* FIND_RHYME (H04 L03 S02 तुक-खोज) — the poem as lines of word chips; the child taps EVERY rhyming
     word (data word.rhyme:true). Right tap → green + its ending tag (e.g. "~आई") + spoken word + counter;
     wrong tap (e.g. a meaning-related word like जलेबी) → buzz + ✗ + locks + spoken try_again; 2 misses in a
     row → hint VO + the next unfound word's LINE glows; 3 → that word is revealed for the child. All found →
     celebrate + advance. data.auto:true (tutorial) = autonomous: each line is read with the line lit, then
     the explain VO, then every rhyme word lights + speaks one by one, then the conclude VO; आगे unlocks.
     data:{lines:[{audio, words:[{text, audio?, rhyme?}]}], ending_hi, image_id?, portrait?, auto?, mastery?};
     audio:{prompt, explain, conclude, try_again, hint, correct, reveal}. */
  FIND_RHYME: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "fr-stage" + (d.image_id ? " with-pic" : "");
      if(d.image_id) wrap.insertAdjacentHTML("beforeend", `<div class="fr-pic${d.portrait ? " portrait" : ""}">${imgOrEmoji(d.image_id, "📜", "fr-img", "fr-emoji")}</div>`);
      const right = document.createElement("div"); right.className = "fr-right";
      const head = document.createElement("div"); head.className = "fr-head";
      const counter = document.createElement("div"); counter.className = "fr-count";
      head.appendChild(counter);
      const poem = document.createElement("div"); poem.className = "fr-poem" + ((d.lines || []).length > 5 ? " dense" : "");
      const lineEls = [], chips = [];
      (d.lines || []).forEach((ln, li)=>{ const le = document.createElement("div"); le.className = "fr-line";
        le._src = ln.audio ? ("assets/Audio/" + ln.audio + "." + AUDIO_EXT) : null;
        (ln.words || []).forEach(w=>{ const c = document.createElement("span"); c.className = "fr-word";
          c.innerHTML = `<span class="fw-text">${w.text}</span>`; c._w = w; c._li = li;
          c._src = w.audio ? ("assets/Audio/" + w.audio + "." + AUDIO_EXT) : null;
          le.appendChild(c); chips.push(c); });
        poem.appendChild(le); lineEls.push(le); });
      right.appendChild(head); right.appendChild(poem); wrap.appendChild(right); host.appendChild(wrap);
      const targets = chips.filter(c=> c._w.rhyme);
      const need = targets.length; let found = 0;
      const setCount = ()=>{ counter.innerHTML = `🎵 <span class="c-found">${found}</span> / ${need}`; };
      setCount();
      const mark = (c)=>{ if(c.classList.contains("found")) return; c.classList.add("found"); found++; setCount();
        if(d.ending_hi) c.insertAdjacentHTML("beforeend", `<span class="fw-end">~${d.ending_hi}</span>`); };
      state.ownsAudio = true; state.attempts = 0; state.locked = false; state.scaffoldLevel = 0;
      if(d.auto){
        $("hintBtn").style.display = "none"; const nav = $("navBtn"); nav.style.display = ""; setNavActive(false);
        nav.onclick = ()=>{ if(!nav.disabled) completeSlide(true); };
        let armed = false; const arm = ()=>{ if(armed) return; armed = true; setNavActive(true); setSwMood("point"); };
        const readLines = (i, done)=>{ lineEls.forEach(l=> l.classList.remove("now")); if(i >= lineEls.length){ done(); return; }
          lineEls[i].classList.add("now"); play(lineEls[i]._src, ()=> setTimeout(()=> readLines(i + 1, done), 200)); };
        const lightWords = (i, done)=>{ if(i >= targets.length){ done(); return; }
          mark(targets[i]); targets[i].classList.add("pop"); sfxTap();
          play(targets[i]._src, ()=> setTimeout(()=> lightWords(i + 1, done), 250)); };
        const seq = ()=>{ found = 0; chips.forEach(c=>{ c.classList.remove("found", "pop"); const e = c.querySelector(".fw-end"); if(e) e.remove(); }); setCount();
          setSwMood("talk");
          play(audioFor(slide, "prompt") || null, ()=> readLines(0, ()=>{ setSwMood("teach");
            play(audioFor(slide, "explain") || null, ()=> lightWords(0, ()=>{ burstStars(); setSwMood("happy");
              play(audioFor(slide, "conclude") || null, arm); })); })); };
        state.replayAudio = seq; seq(); setTimeout(arm, 90000);
        return;
      }
      let streak = 0;
      const maxA = (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
      const nextTarget = ()=> targets.find(c=> !c.classList.contains("found"));
      const finish = ()=>{ state.locked = true;
        if(d.mastery){ state.masteryAttempts++; if(state.attempts === 0) state.masteryHits++; }
        SwiftPAL.emit("rhyme_find_done", { slide_id: slide.id, phase: slide.phase, value: state.scaffoldLevel < 3,
          first_try: state.attempts === 0, wrong_taps: state.attempts, latency_ms: Date.now() - state.slideStart });
        setTimeout(()=> celebrateThenAdvance(slide, state.scaffoldLevel >= 3), 500); };
      const reveal = ()=>{ const t = nextTarget(); if(!t) return; state.scaffoldLevel = 3; streak = 0; state.hintActive = true;
        setSwMood("hint"); t.classList.add("reveal-pulse");
        play(audioFor(slide, "reveal") || null, ()=>{ mark(t); play(t._src, ()=>{ state.hintActive = false; if(found === need) finish(); }); }); };
      const hint = ()=>{ const t = nextTarget(); if(!t) return; state.scaffoldLevel = Math.max(state.scaffoldLevel, 2); setSwMood("hint");
        const le = lineEls[t._li]; le.classList.add("glow"); setTimeout(()=> le.classList.remove("glow"), 3500);
        play(audioFor(slide, "hint") || null, ()=>{}); };
      chips.forEach(c=> c.onclick = ()=>{
        if(state.locked || state.hintActive || c.classList.contains("found") || c.classList.contains("crossed")) return; stopNudge();
        if(c._w.rhyme){ streak = 0; mark(c); c.classList.add("pop"); sfxCorrect(); setSwMood("happy");
          play(c._src, ()=>{ if(found === need) finish(); }); }
        else { state.attempts++; streak++; c.classList.add("crossed"); sfxWrongSoft(); setSwMood("tryagain"); $("hintBtn").classList.add("show");
          SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          const after = ()=>{ if(streak >= maxA) reveal(); else if(streak === 2) hint();
            else { state.scaffoldLevel = Math.max(state.scaffoldLevel, 1); play(audioFor(slide, "try_again") || null, ()=>{}); } };
          if(c._src) play(c._src, after); else after(); } });
      $("hintBtn").onclick = ()=>{ if(state.locked || state.hintActive) return; state.hintUsed = true;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true }); hint(); };
      $("navBtn").style.display = "none"; setNavActive(false);
      state.replayAudio = ()=> play(audioFor(slide, "prompt") || null, ()=>{});
      setSwMood("point"); play(audioFor(slide, "prompt") || null, ()=>{});
    }
  },

  PHASE_TRANSITION: {
    // Additive "learning journey" beat between arc phases (the MoM "no sense of progression" fix).
    // Full-screen friendly panel: badge + "अब हम ___ करेंगे" headline + a 5-dot journey map with the
    // current step lit. The header Swiftie presents it (ONE-Swiftie rule — no second mascot). Learner-
    // paced: no auto-advance timer; आगे unlocks when the beat's VO ends (immediately if silent).
    // data:{ headline_hi, icon?, step (1-based), total_steps?, to_phase? }. Build scripts weave one of
    // these before each phase change; older cards without it are untouched (purely additive).
    mount(host, slide){
      const d = slide.data || {};
      const panel = document.createElement("div"); panel.className = "phase-transition";
      const total = d.total_steps || 5, step = Math.min(d.step || 1, total);
      let map = '<div class="pt-map">';
      for(let i = 1; i <= total; i++){
        map += `<span class="pt-step ${i < step ? 'done' : i === step ? 'current' : ''}"></span>`;
        if(i < total) map += '<span class="pt-connector"></span>';
      }
      map += '</div>';
      panel.innerHTML =
        `<div class="pt-badge">${d.icon || '🎯'}</div>` +
        `<div class="pt-headline">${d.headline_hi || slide.prompt_hi || ''}</div>` + map;
      host.appendChild(panel);
      setSwMood("teach");
      SwiftPAL.emit("phase_transition_shown", { slide_id: slide.id, to_phase: d.to_phase || slide.phase, step });
      state.ownsAudio = true; state.locked = false; setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
      const vo = audioFor(slide, "prompt");
      if(vo) play(vo, ()=> setNavActive(true)); else setNavActive(true);
    }
  },

  CELEBRATION: {
    mount(host, slide){
      /* [H11-125] RESTART THE CELEBRATION CLIP HERE, or the child never sees it play.
         .end-mascot lives in the static markup, so the browser starts its animation the moment
         the PAGE loads - and since [H11-124] made it play once rather than loop, that single
         pass is spent during the lesson, minutes before anyone reaches this screen. What arrives
         then is the last frame, sitting still. An infinite loop hid this completely; a one-shot
         exposes it, and "why is the last page a static image" is exactly what it looks like.
         Clearing the src and forcing a reflow before setting it back is what rewinds an animated
         image - the same move the phase gate already uses on its peeking bird, for the same
         reason. */
      // celebration SFX — own Audio element so it overlaps the spoken VO chain
      /* [34v] ONE SOUND, THEN ONE LINE — do not fire the jingle and the spoken celebration in the
         same tick. ownsAudio stops mountSlide's autoPlayChain firing the prompt in parallel (it would
         if left false), and the VO starts from playSfx's onEnd rather than a guessed delay, so it
         never depends on the sfx's length. Ported from HI01H04_L03_S05 (SME, twice: "celebration
         sound me 2 sounds mix ho rhe hain" / "celebration screen pr 2 vo hai"). */
      state.ownsAudio = true;
      bgmStop();   /* [H11-133] the celebration has its own jingle and clip - the bed steps out */
      /* [34w] ONE-SHOT, WITH A CAP. Sequencing the VO off the sfx is only safe if the sfx is
         GUARANTEED to report an end, and it is not: a silently-queued clip never fires onended, and
         a celebration that never speaks is worse than the overlap this fix removes. So: speak on the
         sfx's end OR after 1800ms, whichever lands first, and never twice. Normal case is unchanged
         (real sfx are well under 1800ms, so the callback wins and you hear one sound then one line);
         the cap only rescues the case where the end never arrives. */
      /* [HI02H02] the HI02H04_L02_S01 finale: the sfx now; the sprite block at the end of this file makes Swiftee jump, land and
         THEN speak the line (lip-synced). Without card.end_anim the line follows the sfx as before. */
      { const _sfx = slide.audio && slide.audio.sfx ? slide.audio.sfx : "sfx_celebrate";
        if(CARD.end_anim && CARD.end_anim.shabaash) playSfx(_sfx);
        else { let _spoke = false; const _say = ()=>{ if(_spoke) return; _spoke = true; play(audioFor(slide, "prompt") || null, ()=>{}); };
          setTimeout(_say, 1800); playSfx(_sfx, _say); } }
      /* [30i] NO TEXT ON THE LAST PAGE — Yasir 2026-07-30: "there should be no sentence on the last
         page, no praising nothing. the only writings allowed on that page is inside the button, other
         than that, no other sentences, no other words."
         This used to paint slide.prompt_hi as a 44px headline plus an optional data.end_subtitle. Both
         are now deliberately set EMPTY rather than deleted from the DOM: `.end-title:empty` and
         `.end-subtitle:empty` are already `display:none` in style.css, so they collapse and take their
         margins with them — and any card still carrying an `end_subtitle` simply stops rendering it,
         instead of needing all 28 cards edited.
         The celebration VO is untouched: he banned writing on the page, not the spoken praise. And
         verify_bundle's "every slide SPEAKS its prompt (incl. celebration)" gate reads the card's audio
         map, not the DOM, so clearing the visible text cannot turn that green check red. */
      const et = $("endTitle"); if(et) et.textContent = "";
      const st = $("endSubtitle"); if(st) st.textContent = "";
      const es = $("endScreen"); es.classList.add("show","hint-glow");
      document.body.classList.add("is-end");   // r4: immersive sunburst backdrop (end_screen.webp)
      /* [H11-125] REWIND THE CELEBRATION CLIP - AFTER THE SCREEN IS UP, NOT BEFORE IT.
         .end-mascot lives in the static markup, so the browser starts its animation when the
         PAGE loads. That was harmless while it looped; [H11-124] made it play ONCE, and a
         one-shot spends its single pass during the lesson, long before anyone reaches this
         screen - what arrives then is the last frame, sitting still, which is exactly what "the
         last page is a static image" looks like.
         Clearing the src and forcing a reflow is what rewinds an animated image (the phase gate
         does the same to its peeking bird). My first go at this ran at the TOP of mount, while
         the end screen was still hidden - restarting an animation nothing can see is no better
         than not restarting it. It goes after the screen is shown, on the next frame so the
         layout has actually applied.
         The pattern is worth naming: "plays once" and "lives in the markup" cannot both be true
         for something that has to be SEEN. Either it loops, or whoever reveals it starts it. */
      /* [H11-161] the rewind moved into _revealSwifty above, where the praise starts */
      const c = $("confetti"); c.innerHTML = "";
      starBurst();   // r4: gold star burst from centre (replaces flat falling confetti)
      const masteryScore = state.masteryAttempts ? (state.masteryHits/state.masteryAttempts) : 0;
      GameBus.emit("mastery_score", { value: masteryScore, hits: state.masteryHits, attempts: state.masteryAttempts });
      GameBus.emit("lesson_completed", { skill_code: CARD.skill_code, total_signals: GameBus.signals.length });
      runValidator();
      setNavActive(false);
      /* [30i] THE BUTTON IS THERE THE MOMENT THE SCREEN IS — Yasir 2026-07-30: "on the last
         screen/the celebration page, the button appears after the VO is completed. the button should be
         there as we get on that screen."
         It used to hide the button and set state.endBtnPending, which autoPlayChain's onDone released
         (see the `if(state.endBtnPending)` line further down). On a long celebration clip — or a missing
         one that fell back to the TTS placeholder — the child sat on a dead end screen with nothing to
         press, which is exactly the "silent non-response" failure we keep hitting elsewhere.
         Shown immediately, and endBtnPending is left FALSE so the onDone branch is a no-op. That branch
         is deliberately NOT deleted: it is the only consumer of the flag, and leaving it means a card or
         a future mechanic that still sets the flag keeps working rather than silently never showing its
         button. `hint-glow` is kept so the button still draws the eye. */
      const eb = $("endBtn"); eb.classList.add("show","hint-glow");
      state.endBtnPending = false;
      // dev-only: a small "download results" button (teacher/QA), never in child flow
      if(new URLSearchParams(location.search).has("dev") && !$("dlResults")){
        const dl = document.createElement("button"); dl.id = "dlResults"; dl.textContent = "⬇ results JSON";
        dl.style.cssText = "position:absolute;bottom:20px;left:20px;z-index:5;font-family:var(--font-hi);font-weight:700;font-size:16px;padding:8px 16px;border-radius:12px;border:2px solid #B7DCFB;background:#fff;color:var(--navy);cursor:pointer;";
        dl.onclick = ()=> GameBus.downloadResults();
        es.appendChild(dl);
      }
      eb.onclick = ()=>{
        GameBus.emit("proceed_next", { skill_code: CARD.skill_code, part: CARD.part_label });
        try{ window.parent?.postMessage({type:"swiftpal:proceed", skill_code:CARD.skill_code, part:CARD.part_label}, "*"); }catch(e){}
      };
    }
  },

  /* ---- RHYME (तुक) — phonological awareness. ADDITIVE (r4a); no existing module touched. ----
     Rhyme is auditory: every word plays its own clip; the two-card stimulus + 🔊 replay let a
     pre-reader re-hear. MEET_RHYME teaches (two cards linked, VO stretches the shared ending);
     RHYME_YESNO judges "do these rhyme?" (✓ तुकांत / ✗ नहीं); RHYME_PICK asks "which one rhymes
     with X?" (tap the matching picture). YESNO/PICK ride the standard mountTapOptions answer
     contract (speak-on-tap · buzz+✗+lock · confetti+advance · layered hint→reveal). */
  MEET_RHYME: {
    mount(host, slide){
      const d = slide.data;
      const wrap = document.createElement("div"); wrap.className = "meet-rhyme";
      const card = (w)=>{
        const c = document.createElement("div"); c.className = "rhyme-card";
        c.innerHTML = imgOrEmoji(w.img, w.emoji, "pic-img", "pic-emoji") + `<span class="pic-label">${w.word_hi}</span>`;
        if(w.audio) c.onclick = ()=>{ state.audioReplays++; play("assets/Audio/" + w.audio + "." + AUDIO_EXT); };
        return c;
      };
      const link = document.createElement("div"); link.className = "rhyme-link" + (d.rhymes === false ? " no" : "");
      link.textContent = (d.rhymes === false) ? "≠" : "🎵";
      wrap.appendChild(card(d.a)); wrap.appendChild(link); wrap.appendChild(card(d.b));
      host.appendChild(wrap);
      state.gateNavUntilAudio = true;   // nav unlocks after the model VO
      setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  RHYME_YESNO: {
    mount(host, slide){
      const d = slide.data;
      const stim = document.createElement("div"); stim.className = "rhyme-stim"; stim.style.cursor = "pointer";
      const mini = (w)=>{ const m = document.createElement("div"); m.className = "rhyme-mini";
        m.innerHTML = imgOrEmoji(w.img, w.emoji, "img", "emoji") + `<span class="lbl">${w.word_hi}</span>`; return m; };
      const spk = document.createElement("span"); spk.className = "rhyme-spk"; spk.textContent = "🔊";
      stim.appendChild(mini(d.a)); stim.appendChild(spk); stim.appendChild(mini(d.b));
      // 🔊 / stimulus tap replays both words back-to-back (re-hear the pair)
      const chain = [d.a, d.b].filter(x=>x && x.audio).map(x=> "assets/Audio/" + x.audio + "." + AUDIO_EXT);
      stim.onclick = ()=>{ state.audioReplays++; playChain(chain, 0); };
      mountTapOptions({
        slide, host, signalName: "rhyme_judge_first_try",
        stimulus: stim, columnsHint: 2,
        options: [{ ans: "yes", audio: slide.audio && slide.audio.yes },
                  { ans: "no",  audio: slide.audio && slide.audio.no }],
        isCorrect: (opt)=> opt.ans === (d.rhymes ? "yes" : "no"),
        optionRenderer: (opt)=>{
          const c = document.createElement("div");
          c.innerHTML = (opt.ans === "yes")
            ? `<div class="rhyme-ans yes"><span class="sym">✓</span><span class="lbl">तुकांत</span></div>`
            : `<div class="rhyme-ans no"><span class="sym">✗</span><span class="lbl">नहीं</span></div>`;
          return c;
        },
        mastery: slide.phase === "mastery",
        nudgeTarget: null
      });
    }
  },

  RHYME_PICK: {
    mount(host, slide){
      const d = slide.data;
      const stim = document.createElement("div"); stim.className = "stimulus-pic"; stim.style.cursor = "pointer";
      stim.innerHTML = imgOrEmoji(d.target.img, d.target.emoji, "img", "emoji") + `<span class="lbl">${d.target.word_hi}</span>`;
      stim.onclick = ()=>{ state.audioReplays++; play(audioFor(slide, "target_word") || audioFor(slide, "prompt") || null); };
      mountTapOptions({
        slide, host, signalName: "rhyme_pick_first_try",
        stimulus: stim, columnsHint: d.options.length,
        options: d.options,
        isCorrect: (opt)=> opt.correct === true,
        optionRenderer: (opt)=> pictureCell(opt.word_hi, opt.emoji, opt.img),
        mastery: slide.phase === "mastery"
      });
    }
  },

  // ---- SENTENCE reading (H06): read a simple sentence word-by-word, then whole ----
  SENTENCE_READ: {
    mount(host, slide){
      const d = slide.data;
      const wrap = document.createElement("div"); wrap.className = "sentence-read";
      const strip = document.createElement("div"); strip.className = "sentence-strip";
      (d.words || []).forEach(w => {
        const chip = document.createElement("div"); chip.className = "sentence-word";
        chip.innerHTML = `<span class="sw-text ink-glyph">${w.text}</span>`;
        chip.onclick = ()=>{ chip.classList.add("said"); state.audioReplays++;
          if(w.audio) play("assets/Audio/" + w.audio + "." + AUDIO_EXT); };
        strip.appendChild(chip);
      });
      const readBtn = document.createElement("button"); readBtn.className = "read-whole-btn";
      readBtn.innerHTML = `🔊 पूरा पढ़ो`;
      const wholeSrc = d.whole_audio ? ("assets/Audio/" + d.whole_audio + "." + AUDIO_EXT) : null;
      readBtn.onclick = ()=>{ state.audioReplays++; readBtn.classList.add("playing");
        strip.querySelectorAll(".sentence-word").forEach(c => c.classList.add("said"));
        // nav unlocks only after the child hears the WHOLE sentence read fluently (the point of the skill)
        play(wholeSrc, ()=>{ readBtn.classList.remove("playing"); readBtn.classList.add("done"); setNavActive(true); }); };
      wrap.appendChild(strip); wrap.appendChild(readBtn);
      host.appendChild(wrap);
      state.replayAudio = ()=> play(wholeSrc, ()=>{});   // audio chip re-reads the whole sentence
      setNavActive(false);                                // gated until "पूरा पढ़ो" is played once
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  // ---- SENTENCE_FIND (H06): tap the named word INSIDE the sentence (word recognition) ----
  SENTENCE_FIND: {
    mount(host, slide){
      const d = slide.data;
      const wrap = document.createElement("div"); wrap.className = "sentence-find";
      const strip = document.createElement("div"); strip.className = "sentence-strip";
      state.attempts = 0; state.locked = false; state.scaffoldLevel = 0;
      const maxA = (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
      const chips = [];
      (d.words || []).forEach(w => {
        const chip = document.createElement("div"); chip.className = "sentence-word tappable";
        chip.innerHTML = `<span class="sw-text ink-glyph">${w.text}</span>`;
        chip.__target = (w.target === true);
        const wordSrc = w.audio ? ("assets/Audio/" + w.audio + "." + AUDIO_EXT) : null;
        chip.onclick = ()=>{
          if(state.locked || chip.classList.contains("crossed") || chip.classList.contains("correct")) return;
          const after = (cb)=>{ if(wordSrc) play(wordSrc, cb); else cb(); };
          if(w.target === true){
            state.locked = true; chip.classList.add("correct"); sfxCorrect(); confettiCannon(); setSwMood("happy");
            if(slide.phase === "mastery"){ state.masteryAttempts++; if(state.attempts === 0) state.masteryHits++; }
            SwiftPAL.emit("sentence_word_first_try", { slide_id: slide.id, phase: slide.phase, value: true,
              first_try: state.attempts === 0, attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
            after(()=> setTimeout(()=> completeSlide(true), 700));
          } else {
            state.attempts++; chip.classList.add("crossed"); sfxWrongSoft(); setSwMood("tryagain");
            $("hintBtn").classList.add("show");
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
            after(()=>{
              if(state.attempts >= maxA){                       // A1 reveal ceiling — never stuck
                state.locked = true; state.scaffoldLevel = 3; setSwMood("hint");
                const t = chips.find(c => c.__target); if(t){ t.classList.add("correct", "reveal-pulse"); }
                play(audioFor(slide, "reveal") || audioFor(slide, "correct") || null, ()=> setTimeout(()=> completeSlide(false), 800));
              } else if(state.attempts >= 2){ state.scaffoldLevel = Math.max(state.scaffoldLevel, 2);
                play(audioFor(slide, "hint") || audioFor(slide, "try_again") || null, ()=>{}); }
              else { state.scaffoldLevel = Math.max(state.scaffoldLevel, 1);
                play(audioFor(slide, "try_again") || null, ()=>{}); }
            });
          }
        };
        strip.appendChild(chip); chips.push(chip);
      });
      wrap.appendChild(strip); host.appendChild(wrap);
      $("hintBtn").onclick = ()=>{ if(state.locked) return; state.hintUsed = true;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true });
        play(audioFor(slide, "hint") || audioFor(slide, "try_again") || null, ()=>{}); };
      $("navBtn").style.display = "none"; setNavActive(false);
    }
  },

  // ---- TAP_ALL_WITH_SOUND (H02): tap EVERY word that has the target sound (repeated-sound / ----
  // ---- alliteration). Multi-select: a counter tracks how many of the sound-words are found; ----
  // ---- when all are found → celebrate + advance. Wrong tap = buzz + ✗ + locks that chip. ----
  TAP_ALL_WITH_SOUND: {
    mount(host, slide){
      const d = slide.data || {};
      const items = d.items || [];
      const need = items.filter(it => it.has === true).length;
      state.attempts = 0; state.locked = false;
      let found = 0;
      const wrap = document.createElement("div"); wrap.className = "tap-all";
      const head = document.createElement("div"); head.className = "tap-all-head";
      const badge = document.createElement("div"); badge.className = "tap-all-sound"; badge.style.cursor = "pointer";
      badge.innerHTML = `<span class="ink-glyph">${d.target_sound || ""}</span>`;
      badge.onclick = ()=>{ state.audioReplays++; play(audioFor(slide, "target") || null); };
      const counter = document.createElement("div"); counter.className = "tap-all-count";
      const setCount = ()=>{ counter.innerHTML = `<span class="c-found">${found}</span> / ${need}`; };
      head.appendChild(badge); head.appendChild(counter);
      const strip = document.createElement("div"); strip.className = "tap-all-strip";
      const chips = [];
      items.forEach(it => {
        const chip = document.createElement("div"); chip.className = "tap-all-item";
        chip.innerHTML = imgOrEmoji(it.img, it.emoji, "img", "emoji") + `<span class="lbl">${it.word_hi}</span>`;
        const src = it.audio ? ("assets/Audio/" + it.audio + "." + AUDIO_EXT) : null;
        chip.onclick = ()=>{
          if(state.locked || chip.classList.contains("got") || chip.classList.contains("nope")) return;
          const after = (cb)=>{ if(src) play(src, cb); else cb(); };
          if(it.has === true){
            chip.classList.add("got"); sfxCorrect(); found++; setCount();
            SwiftPAL.emit("sound_found", { slide_id: slide.id, phase: slide.phase, word: it.word_hi });
            after(()=>{
              if(found >= need){
                state.locked = true; setSwMood("celebrate"); confettiCannon();
                if(slide.phase === "mastery"){ state.masteryAttempts++; if(state.attempts === 0) state.masteryHits++; }
                SwiftPAL.emit(d.signal_name || "tap_all_correct", { slide_id: slide.id, phase: slide.phase,
                  value: state.attempts === 0, attempts: state.attempts, latency_ms: Date.now()-state.slideStart });
                play(audioFor(slide, "done") || audioFor(slide, "correct") || null,
                  ()=> setTimeout(()=> completeSlide(state.attempts === 0), 700));
              }
            });
          } else {
            state.attempts++; chip.classList.add("nope"); sfxWrongSoft(); setSwMood("tryagain");
            $("hintBtn").classList.add("show");
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
            after(()=> play(audioFor(slide, "try_again") || null, ()=>{}));
          }
        };
        strip.appendChild(chip); chips.push(chip);
      });
      setCount();
      wrap.appendChild(head); wrap.appendChild(strip);
      host.appendChild(wrap);
      $("hintBtn").onclick = ()=>{ if(state.locked) return; state.hintUsed = true;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true });
        play(audioFor(slide, "hint") || audioFor(slide, "try_again") || null, ()=>{}); };
      $("navBtn").style.display = "none"; setNavActive(false);
      state.replayAudio = ()=> play(audioFor(slide, "prompt") || null, ()=>{});
    }
  },

  // ---- SENTENCE_SOUND (H02): hear an alliterative LINE, tap the sound that REPEATS in it. ----
  // The line is shown as word chips + a 🔊 replay; the answer options are sound-letter chips. ----
  SENTENCE_SOUND: {
    mount(host, slide){
      const d = slide.data || {};
      const stim = document.createElement("div"); stim.className = "sentence-sound-stim";
      const strip = document.createElement("div"); strip.className = "sentence-strip";
      (d.words || []).forEach(w => {
        const chip = document.createElement("div"); chip.className = "sentence-word";
        chip.innerHTML = `<span class="sw-text ink-glyph">${(typeof w === "string") ? w : w.text}</span>`;
        strip.appendChild(chip);
      });
      const whole = d.whole_audio ? ("assets/Audio/" + d.whole_audio + "." + AUDIO_EXT) : null;
      const spk = document.createElement("button"); spk.className = "read-whole-btn"; spk.innerHTML = "🔊 फिर सुनो";
      spk.onclick = ()=>{ state.audioReplays++; strip.querySelectorAll(".sentence-word").forEach(c => c.classList.add("said"));
        play(whole, ()=>{}); };
      stim.appendChild(strip); stim.appendChild(spk);
      mountTapOptions({
        slide, host, signalName: d.signal_name || "sentence_sound_first_try",
        stimulus: stim, columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt)=> opt.letter === d.target_sound,
        optionRenderer: (opt)=> letterCell(opt.letter),
        mastery: slide.phase === "mastery",
        nudgeTarget: null
      });
      state.replayAudio = ()=> play(whole, ()=>{});
    }
  },

  /* ==== MIDDLE SOUND (H02 phonological awareness — बीच की ध्वनि). ADDITIVE (r4e); no existing
     module touched. A 3-अक्षर word is segmented into first · middle · last sound-boxes and the child
     learns/identifies the MIDDLE sound. Four scoped modules:
       - MEET_MIDDLE     (teach BY DOING) — child taps each box to HEAR its sound, then the middle
                          box lights and Swiftie names it ("बीच की ध्वनि — /ट/").
       - TAP_MIDDLE_SOUND (test, gesture 1) — first & last shown; pick the correct middle sound-button.
       - MIDDLE_PICK_WORD (test, gesture 2) — a target sound is given; tap the PICTURE whose middle is it.
       - MIDDLE_YESNO     (test, gesture 3) — "is this word's middle sound /X/?" ✓ हाँ / ✗ नहीं.
     The three test modules ride the shared mountTapOptions answer contract (speak-on-tap · buzz+✗+lock ·
     confetti+advance · layered hint→reveal). ==== */
  MEET_MIDDLE: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "mid-teach";
      const wc = document.createElement("div"); wc.className = "mid-word";
      wc.innerHTML = imgOrEmoji(d.word.img, d.word.emoji, "mid-word-img", "mid-word-emoji") +
                     `<span class="mid-word-lbl">${d.word.word_hi}</span>`;
      const boxes = document.createElement("div"); boxes.className = "mid-boxes";
      const cells = (d.boxes || []).map((b, i)=>{
        const c = document.createElement("div");
        c.className = "mid-box teach pos-" + i + (b.middle ? " is-mid" : "");
        c.innerHTML = `<span class="mid-akshar ink-glyph">${b.akshar}</span>` +
                      (b.pos_hi ? `<span class="mid-pos-lbl">${b.pos_hi}</span>` : "");
        boxes.appendChild(c); return c;
      });
      wrap.appendChild(wc); wrap.appendChild(boxes);
      host.appendChild(wrap);

      state.ownsAudio = true; state.locked = false; setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
      let revealed = false;
      state.replayAudio = ()=>{ const ch = [audioFor(slide, "intro")];
        if(revealed) ch.push(audioFor(slide, "explain")); playChain(ch.filter(Boolean), 0); };

      const tapped = new Set();
      const boxSrc = (i)=> "assets/Audio/" + d.boxes[i].audio + "." + AUDIO_EXT;
      function nudgeNext(){ for(let i=0;i<cells.length;i++){ if(!tapped.has(i)){ pointNudgeAt(cells[i]); return; } } stopNudge(); }
      function enableBoxes(){
        cells.forEach((c, i)=>{ c.classList.add("tappable");
          c.onclick = ()=>{
            if(state.locked) return;
            if(tapped.has(i)){ play(boxSrc(i)); return; }   // re-tap just replays that sound
            tapped.add(i); c.classList.add("said"); sfxTap();
            play(boxSrc(i), ()=>{ if(tapped.size === cells.length){ stopNudge(); revealMiddle(); } else nudgeNext(); });
          };
        });
        nudgeNext();
      }
      function revealMiddle(){
        state.locked = true;
        const mid = cells.find(c => c.classList.contains("is-mid"));
        if(mid) mid.classList.add("reveal-glow", "lit");
        setSwMood("point");
        play(audioFor(slide, "explain") || null, ()=>{ revealed = true; state.locked = false; setNavActive(true); });
      }
      play(audioFor(slide, "intro") || null, ()=> enableBoxes());   // teach line → tap each box → name the middle
    }
  },

  TAP_MIDDLE_SOUND: {
    mount(host, slide){
      const d = slide.data || {};
      const stim = document.createElement("div"); stim.className = "mid-frame";
      const wc = document.createElement("div"); wc.className = "mid-word";
      wc.innerHTML = imgOrEmoji(d.word.img, d.word.emoji, "mid-word-img", "mid-word-emoji") +
                     `<span class="mid-word-lbl">${d.word.word_hi}</span>`;
      const boxes = document.createElement("div"); boxes.className = "mid-boxes";
      // first box (known) — tap to hear
      const b1 = document.createElement("div"); b1.className = "mid-box known first";
      b1.innerHTML = `<span class="mid-akshar ink-glyph">${d.first.akshar}</span>`;
      b1.onclick = ()=>{ state.audioReplays++; play("assets/Audio/" + d.first.audio + "." + AUDIO_EXT); };
      // middle box (the unknown slot)
      const b2 = document.createElement("div"); b2.className = "mid-box slot is-mid";
      b2.innerHTML = `<span class="mid-q">?</span>`;
      // last box (known) — tap to hear
      const b3 = document.createElement("div"); b3.className = "mid-box known last";
      b3.innerHTML = `<span class="mid-akshar ink-glyph">${d.last.akshar}</span>`;
      b3.onclick = ()=>{ state.audioReplays++; play("assets/Audio/" + d.last.audio + "." + AUDIO_EXT); };
      boxes.appendChild(b1); boxes.appendChild(b2); boxes.appendChild(b3);
      stim.appendChild(wc); stim.appendChild(boxes);
      stim.style.cursor = "pointer";
      stim.onclick = (e)=>{ if(e.target.closest(".mid-box.known")) return; state.audioReplays++; play(audioFor(slide, "prompt") || null); };
      mountTapOptions({
        slide, host, signalName: d.signal_name || "middle_sound_first_try",
        stimulus: stim, columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt)=> opt.correct === true,
        optionRenderer: (opt)=>{ const c = document.createElement("div");
          c.innerHTML = `<span class="big-glyph ink-glyph mid-opt-glyph">${opt.akshar}</span><span class="mid-opt-spk">🔊</span>`;
          return c; },
        mastery: slide.phase === "mastery"
      });
    }
  },

  MIDDLE_PICK_WORD: {
    mount(host, slide){
      const d = slide.data || {};
      const stim = document.createElement("div"); stim.className = "mid-ask"; stim.style.cursor = "pointer";
      stim.innerHTML = `<span class="mid-ask-lbl">बीच की आवाज़</span>` +
                       `<div class="mid-ask-chip"><span class="mid-akshar ink-glyph">${d.target_akshar}</span><span class="mid-opt-spk">🔊</span></div>`;
      stim.onclick = ()=>{ state.audioReplays++; play(audioFor(slide, "prompt") || null); };
      mountTapOptions({
        slide, host, signalName: d.signal_name || "middle_pick_first_try",
        stimulus: stim, columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt)=> opt.correct === true,
        optionRenderer: (opt)=> pictureCell(opt.word_hi, opt.emoji, opt.img),
        mastery: slide.phase === "mastery"
      });
    }
  },

  MIDDLE_YESNO: {
    mount(host, slide){
      const d = slide.data || {};
      const stim = document.createElement("div"); stim.className = "mid-yn-stim"; stim.style.cursor = "pointer";
      const wc = document.createElement("div"); wc.className = "mid-word small";
      wc.innerHTML = imgOrEmoji(d.word.img, d.word.emoji, "mid-word-img", "mid-word-emoji") +
                     `<span class="mid-word-lbl">${d.word.word_hi}</span>`;
      const ask = document.createElement("div"); ask.className = "mid-yn-ask";
      ask.innerHTML = `<span class="mid-yn-q">बीच?</span>` +
                      `<div class="mid-ask-chip"><span class="mid-akshar ink-glyph">${d.asked_akshar}</span></div>`;
      stim.appendChild(wc); stim.appendChild(ask);
      stim.onclick = ()=>{ state.audioReplays++; play(audioFor(slide, "prompt") || null); };
      mountTapOptions({
        slide, host, signalName: d.signal_name || "middle_yesno_first_try",
        stimulus: stim, columnsHint: 2,
        options: [{ ans: "yes", audio: slide.audio && slide.audio.yes },
                  { ans: "no",  audio: slide.audio && slide.audio.no }],
        isCorrect: (opt)=> opt.ans === (d.is_yes ? "yes" : "no"),
        optionRenderer: (opt)=>{ const c = document.createElement("div");
          c.innerHTML = (opt.ans === "yes")
            ? `<div class="rhyme-ans yes"><span class="sym">✓</span><span class="lbl">हाँ</span></div>`
            : `<div class="rhyme-ans no"><span class="sym">✗</span><span class="lbl">नहीं</span></div>`;
          return c; },
        mastery: slide.phase === "mastery",
        nudgeTarget: null
      });
    }
  },

  /* ==== READING DIRECTION (H03 print concepts — पठन-दिशा). ADDITIVE (r4f); no existing module touched.
     The child can't read yet, so these teach/test the DIRECTION of print, not its meaning: left→right
     within a line, then the RETURN-SWEEP to the start of the next line. Three gestures:
       - READ_PATH  (teach + produce test) — tap the words in reading order; a buddy hops L→R and sweeps
                     back-and-down at each line break. mode:"teach" narrates + gates on VO; mode:"test" scored.
       - TAP_READ_ARROW (pick) — "which way do we read?" pick → (via mountTapOptions).
       - TAP_READ_POS   (tap-a-spot) — tap where reading STARTS / resumes on the next line (TAP_IN_SCENE-style:
                     buzz + try-again on a miss, no ✗; glow-reveal after max_attempts). ==== */
  READ_PATH: {
    mount(host, slide){
      const d = slide.data || {};
      const teach = d.mode === "teach";
      const wrap = document.createElement("div"); wrap.className = "read-stage" + (teach ? " teach" : "");
      const page = readPage(d.lines, {buddy:true, buddy_img:d.buddy_img, buddy_emoji:d.buddy_emoji});
      wrap.appendChild(page); host.appendChild(wrap);
      const order = page._cards, buddy = page._buddy;
      // TRACK_FOLLOW = the "animated tracker": a glowing cursor rides the current word so the child
      // FOLLOWS word-by-word (guided). Plain READ_PATH has no glow → the child must self-pace (harder).
      const guide = slide.type === "TRACK_FOLLOW" || !!d.guide;
      function markTrack(){ if(!guide) return; order.forEach(o=> o.classList.remove("tracking"));
        if(idx < order.length) order[idx].classList.add("tracking"); }

      let idx = 0, wrongStreak = 0, revealedAny = false;
      state.locked = false; state.attempts = 0;
      if(teach){ state.ownsAudio = true; }
      if(!teach){ $("navBtn").style.display = "none"; }
      setNavActive(false);
      $("navBtn").onclick = ()=>{ if(teach && state.locked) completeSlide(true); };

      function moveBuddyTo(el, sweep, cb){
        buddy.classList.toggle("sweep", !!sweep);
        buddy.style.left = (el.offsetLeft + el.offsetWidth/2 - buddy.offsetWidth/2) + "px";
        buddy.style.top  = (el.offsetTop + el.offsetHeight + 4) + "px";
        if(cb) setTimeout(cb, sweep ? 720 : 240);
      }
      function nudgeNext(){ if(!teach) return; if(idx < order.length) pointNudgeAt(order[idx].el || order[idx]); else stopNudge(); }
      moveBuddyTo(order[0], false); requestAnimationFrame(()=> moveBuddyTo(order[0], false));   // sync (rAF is throttled) + rAF backup
      markTrack();

      function advance(){
        const cur = order[idx];
        cur.classList.add("read");
        const lineEnd = (idx+1 < order.length) && (order[idx+1]._li !== cur._li);
        idx++; markTrack();
        if(idx >= order.length){
          state.locked = true; stopNudge();
          if(teach){ setSwMood("point"); play(audioFor(slide,"explain") || null, ()=>{ setNavActive(true); }); }
          else {
            if(slide.phase === "mastery"){ state.masteryAttempts++; if(state.attempts === 0) state.masteryHits++; }
            SwiftPAL.emit(d.signal_name || "read_path_first_try", {slide_id:slide.id, phase:slide.phase,
              value:!revealedAny, first_try: state.attempts===0, attempts: state.attempts+1});
            celebrateThenAdvance(slide, revealedAny);
          }
          return;
        }
        const nxt = order[idx];
        if(lineEnd){ moveBuddyTo(nxt, true, ()=>{ if(teach){ play(audioFor(slide,"sweep") || null, ()=> nudgeNext()); } else nudgeNext(); }); }
        else { moveBuddyTo(nxt, false, ()=> nudgeNext()); }
      }
      function glowNext(ms){ const g = order[idx]; if(!g) return; g.classList.add("reveal-glow"); setTimeout(()=> g.classList.remove("reveal-glow"), ms||900); }

      order.forEach(card=>{
        card.onclick = ()=>{
          if(state.locked) return;
          if(card === order[idx]){ wrongStreak = 0; sfxTap(); advance(); }
          else {
            state.attempts++; card.classList.add("shake"); setTimeout(()=> card.classList.remove("shake"), 420);
            SwiftPAL.emit("answer_wrong", {slide_id:slide.id, phase:slide.phase, attempts:state.attempts});
            $("hintBtn").classList.add("show");
            if(++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3)){
              revealedAny = true; wrongStreak = 0; glowNext(1100);
              play(audioFor(slide,"reveal") || audioFor(slide,"hint") || null, ()=>{});
              setTimeout(()=>{ if(!state.locked) advance(); }, 1050);   // demonstrate: never stuck
            } else if(state.attempts >= 2){ glowNext(); play(audioFor(slide,"hint") || null, ()=>{}); }
            else dragWrong(slide);
          }
        };
      });

      $("hintBtn").onclick = ()=>{ if(!state.locked) glowNext(); };
      if(teach){
        state.replayAudio = ()=> playChain([audioFor(slide,"intro")].filter(Boolean), 0);
        play(audioFor(slide,"intro") || null, ()=> nudgeNext());
      }
    }
  },

  TAP_READ_ARROW: {
    mount(host, slide){
      const d = slide.data || {};
      const stim = document.createElement("div"); stim.className = "read-stim"; stim.style.cursor = "pointer";
      stim.appendChild(readPage(d.lines, {buddy:false}));
      stim.onclick = ()=>{ state.audioReplays++; play(audioFor(slide,"prompt") || null); };
      mountTapOptions({
        slide, host, signalName: d.signal_name || "read_arrow_first_try",
        stimulus: stim, columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt)=> opt.dir === (d.answer || "right"),
        optionRenderer: (opt)=>{ const c = document.createElement("div");
          c.innerHTML = `<span class="read-arrow read-arrow-${opt.dir}">${opt.glyph}</span>`; return c; },
        mastery: slide.phase === "mastery"
      });
    }
  },

  TAP_READ_POS: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "read-stage pos"; wrap.style.cursor = "pointer";
      const page = readPage(d.lines, {buddy: !!d.buddy_at, buddy_img:d.buddy_img, buddy_emoji:d.buddy_emoji});
      wrap.appendChild(page); host.appendChild(wrap);
      if(d.done_lines){ page._cards.forEach(c=>{ if(d.done_lines.includes(c._li)) c.classList.add("read"); }); }
      wrap.onclick = (e)=>{ if(e.target.closest(".read-dot")) return; state.audioReplays++; play(audioFor(slide,"prompt") || null); };

      state.locked = false; state.attempts = 0; let wrongStreak = 0;
      $("navBtn").style.display = "none"; setNavActive(false);

      const dots = (d.dots || []).map(spec=>{ const dot = document.createElement("div");
        dot.className = "read-dot"; dot._spec = spec; page.appendChild(dot); return dot; });
      // FIX_TRACKING: a "confused reader" finger shown at the WRONG spot (data.confused_at) — the child
      // taps where the finger SHOULD go. Purely decorative marker; the answer is still the correct dot.
      const confused = d.confused_at ? (function(){ const c = document.createElement("div");
        c.className = "read-confused"; c.innerHTML = '<span class="rc-x">✗</span><span class="rc-finger">👆</span>';
        page.appendChild(c); return c; })() : null;
      function lineCards(li){ return page._cards.filter(c=> c._li === li); }
      function anchorXY(s){ const lc = lineCards(s.li); const a = (s.side === "start") ? lc[0] : lc[lc.length-1];
        return {x: (s.side === "start") ? a.offsetLeft - 30 : a.offsetLeft + a.offsetWidth + 8, y: a.offsetTop + a.offsetHeight/2 - 17}; }
      function placeDots(){
        dots.forEach(dot=>{ const p = anchorXY(dot._spec); dot.style.left = p.x + "px"; dot.style.top = p.y + "px"; });
        if(confused){ const p = anchorXY(d.confused_at); confused.style.left = (p.x - 8) + "px"; confused.style.top = (p.y + 20) + "px"; }
        if(page._buddy && d.buddy_at){ const lc = lineCards(d.buddy_at.li);
          const a = (d.buddy_at.side === "end") ? lc[lc.length-1] : lc[0];
          page._buddy.style.left = (a.offsetLeft + a.offsetWidth/2 - page._buddy.offsetWidth/2) + "px";
          page._buddy.style.top  = (a.offsetTop + a.offsetHeight + 4) + "px"; }
      }
      placeDots(); requestAnimationFrame(placeDots);   // sync (rAF is throttled in bg) + rAF backup after layout

      const correctDot = ()=> dots.find(x=> x._spec.correct);
      dots.forEach(dot=>{
        dot.onclick = ()=>{
          if(state.locked) return;
          if(dot._spec.correct){
            state.locked = true; dot.classList.add("hit"); sfxCorrect(); confettiCannon(); setSwMood("happy");
            if(slide.phase === "mastery"){ state.masteryAttempts++; if(state.attempts === 0) state.masteryHits++; }
            SwiftPAL.emit(d.signal_name || "read_pos_first_try", {slide_id:slide.id, phase:slide.phase,
              value:true, first_try: state.attempts===0, attempts: state.attempts+1});
            play(audioFor(slide,"correct") || null, ()=> setTimeout(()=> completeSlide(true), 700));
          } else {
            state.attempts++; dot.classList.add("miss","shake"); setTimeout(()=> dot.classList.remove("shake"), 420);
            SwiftPAL.emit("answer_wrong", {slide_id:slide.id, phase:slide.phase, attempts:state.attempts});
            $("hintBtn").classList.add("show");
            if(++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3)){
              state.locked = true; correctDot().classList.add("reveal-glow");
              play(audioFor(slide,"reveal") || audioFor(slide,"hint") || null, ()=> setTimeout(()=> completeSlide(false), 900));
            } else if(state.attempts >= 2){ const cd = correctDot(); cd.classList.add("reveal-glow");
              setTimeout(()=> cd.classList.remove("reveal-glow"), 900); play(audioFor(slide,"hint") || null, ()=>{}); }
            else dragWrong(slide);
          }
        };
      });
      $("hintBtn").onclick = ()=>{ if(state.locked) return; const cd = correctDot();
        cd.classList.add("reveal-glow"); setTimeout(()=> cd.classList.remove("reveal-glow"), 900);
        play(audioFor(slide,"hint") || null, ()=>{}); };
    }
  },

  /* ==== READ_TRACE (H03 finger-tracking) — the child PRESSES and DRAGS a finger across the words in
     reading order (L→R, then sweeps down-left to the next line's start). Each word lights as the finger
     reaches it, in ORDER; the next expected word glows to guide the swipe; a buddy rides along. This is
     the authentic "track with your finger" gesture (vs watch-a-dot / tap-in-order). Forgiving: lifting
     the finger keeps progress; wrong/backward moves are ignored; tapping a word also advances it (a11y).
     ADDITIVE (r4h); reuses readPage. ==== */
  READ_TRACE: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "read-stage trace";
      const page = readPage(d.lines, {buddy:true, buddy_img:d.buddy_img, buddy_emoji:d.buddy_emoji});
      wrap.appendChild(page); host.appendChild(wrap);
      const order = page._cards, buddy = page._buddy;
      let idx = 0, tracing = false, revealed = false;
      state.locked = false; state.attempts = 0;
      $("navBtn").style.display = "none"; setNavActive(false);
      state.replayAudio = ()=> play(audioFor(slide, "prompt") || null, ()=>{});

      function moveBuddy(el, sweep){ buddy.classList.toggle("sweep", !!sweep);
        buddy.style.left = (el.offsetLeft + el.offsetWidth/2 - buddy.offsetWidth/2) + "px";
        buddy.style.top  = (el.offsetTop + el.offsetHeight + 4) + "px"; }
    function glowNext(){ order.forEach(o=> o.classList.remove("tracking")); if(idx < order.length) order[idx].classList.add("tracking"); }
      moveBuddy(order[0], false); requestAnimationFrame(()=> moveBuddy(order[0], false)); glowNext();

      function reach(el){
        if(state.locked || el !== order[idx]) return;   // only the NEXT expected word advances (enforces order)
        const prev = idx > 0 ? order[idx-1] : null;
        const sweep = !!(prev && prev._li !== el._li);
        el.classList.add("read"); el.classList.remove("tracking"); sfxTap();
        idx++; moveBuddy(el, sweep); glowNext();
        if(idx >= order.length){
          state.locked = true;
          if(slide.phase === "mastery"){ state.masteryAttempts++; if(state.attempts === 0) state.masteryHits++; }
          SwiftPAL.emit(d.signal_name || "read_trace_first_try", {slide_id:slide.id, phase:slide.phase,
            value:!revealed, first_try: state.attempts===0, attempts: state.attempts+1});
          celebrateThenAdvance(slide, revealed);
        }
      }
      function wordAt(x, y){ const el = document.elementFromPoint(x, y); const w = el && el.closest && el.closest(".read-word");
        return (w && order.includes(w)) ? w : null; }
      function pt(e){ return e.touches && e.touches[0] ? e.touches[0] : e; }
      wrap.addEventListener("pointerdown", (e)=>{ if(state.locked) return; tracing = true;
        try{ wrap.setPointerCapture(e.pointerId); }catch(_){}
        const w = wordAt(pt(e).clientX, pt(e).clientY); if(w) reach(w); e.preventDefault(); });
      wrap.addEventListener("pointermove", (e)=>{ if(!tracing || state.locked) return;
        const w = wordAt(pt(e).clientX, pt(e).clientY); if(w) reach(w); });
      wrap.addEventListener("pointerup", ()=>{ tracing = false; });
      order.forEach(w=> w.addEventListener("click", ()=> reach(w)));   // tap fallback (a11y / mouse)

      $("hintBtn").onclick = ()=>{ if(state.locked || idx >= order.length) return;
        order[idx].classList.add("reveal-glow"); setTimeout(()=> order[idx].classList.remove("reveal-glow"), 1000); };
      play(audioFor(slide, "prompt") || null, ()=>{});
    }
  },

  /* ==== CLASSROOM LABELS (H03 environmental print — कक्षा के लेबल). ADDITIVE (r4g); no existing module
     touched. Beginning sight-word/label recognition: the child ties a printed Hindi word to a classroom
     object. MEET_LABEL teaches BY DOING (tap each object to reveal + hear its label); TAP_LABEL_SCENE
     (hear the word → tap the matching labeled object) and TAP_WORD_FOR_OBJECT (see the object → tap its
     printed name) test both directions; the drag match reuses MATCH_DRAG_N (word tiles → objects). All
     picks ride the standard mountTapOptions answer contract. ==== */
  MEET_LABEL: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "label-set";
      const cards = (d.items || []).map(it=>{
        const c = document.createElement("div"); c.className = "label-card";
        c.innerHTML = imgOrEmoji(it.img, it.emoji, "label-img", "label-emoji") +
                      `<span class="label-lbl">${it.word_hi}</span>`;   // NOT .ink-glyph: it would vertical-center within the whole card (onto the image)
        c._it = it; wrap.appendChild(c); return c;
      });
      host.appendChild(wrap);
      state.ownsAudio = true; state.locked = false; setNavActive(false);
      $("navBtn").onclick = ()=>{ if(state.locked) completeSlide(true); };
      const tapped = new Set();
      function nudgeNext(){ const nx = cards.find(c=> !c.classList.contains("said")); if(nx) pointNudgeAt(nx); else stopNudge(); }
      state.replayAudio = ()=> play(audioFor(slide,"intro") || null, ()=>{});
      cards.forEach((c,i)=>{ c.classList.add("tappable");
        c.onclick = ()=>{
          if(state.locked) return;
          const src = "assets/Audio/" + c._it.audio + "." + AUDIO_EXT;
          if(c.classList.contains("said")){ play(src); return; }
          c.classList.add("said", "reveal-glow"); setTimeout(()=> c.classList.remove("reveal-glow"), 700);
          sfxTap(); setSwMood("point"); tapped.add(i);
          play(src, ()=>{ if(tapped.size === cards.length){ stopNudge(); state.locked = true; setSwMood("happy"); setNavActive(true); } else nudgeNext(); });
        };
      });
      play(audioFor(slide,"intro") || null, ()=> nudgeNext());
    }
  },

  TAP_LABEL_SCENE: {
    // hear a word → tap the matching labeled object (picture + Hindi word-label under each).
    mount(host, slide){
      const d = slide.data || {};
      const stim = document.createElement("div"); stim.className = "stimulus-pic"; stim.style.cursor = "pointer";
      stim.innerHTML = `<span class="emoji">🔊</span><span class="lbl">सुनो</span>`;
      stim.onclick = ()=>{ state.audioReplays++; play(audioFor(slide,"prompt") || null); };
      mountTapOptions({
        slide, host, signalName: d.signal_name || "label_scene_first_try",
        stimulus: stim, columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt)=> opt.correct === true,
        optionRenderer: (opt)=> pictureCell(opt.word_hi, opt.emoji, opt.img),
        mastery: slide.phase === "mastery"
      });
    }
  },

  TAP_WORD_FOR_OBJECT: {
    // see an object (no label) → tap its correct printed NAME (word cards; each speaks on tap).
    mount(host, slide){
      const d = slide.data || {};
      const stim = document.createElement("div"); stim.className = "stimulus-pic label-obj-stim";
      stim.innerHTML = imgOrEmoji(d.object.img, d.object.emoji, "img", "emoji");   // NO name shown (that's the answer)
      mountTapOptions({
        slide, host, signalName: d.signal_name || "word_for_object_first_try",
        stimulus: stim, columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt)=> opt.correct === true,
        optionRenderer: (opt)=>{ const c = document.createElement("div");
          c.innerHTML = `<span class="label-word ink-glyph">${opt.word_hi}</span>`; return c; },
        mastery: slide.phase === "mastery"
      });
    }
  },

  /* ==== USE_INTERFACE (H03 symbol/button recognition) — a working mini DEVICE the child operates: a
     screen + control buttons (▶️ ⏸️ 🔊 🔇 ✅ ❌). The prompt names an action ("गाना चलाओ" / "आवाज़ बंद
     करो"); the child taps the matching button and the device REACTS (screen plays/stops, sound mutes).
     Correct = the button whose role === data.target_role → react + confetti + advance. Wrong button =
     buzz + try-again → hint → reveal (demonstrate) ladder. Buttons are icon glyphs (content-true, no
     art). ADDITIVE (r4i); no existing module touched. data:{screen_emoji, buttons:[{role,glyph,glyph_on?,
     label}], target_role, react:"play"|"pause"|"mute"}. ==== */
  USE_INTERFACE: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "ui-stage";
      const device = document.createElement("div"); device.className = "ui-device";
      const screen = document.createElement("div"); screen.className = "ui-screen"
        + (d.state_playing ? " playing" : "") + (d.state_muted ? " muted" : "");
      screen.innerHTML = `<span class="ui-screen-emoji">${d.screen_emoji || "🎵"}</span>`
        + `<span class="ui-wave">◗ ◖ ◗ ◖ ◗</span>`;
      const bar = document.createElement("div"); bar.className = "ui-bar";
      const btns = (d.buttons || []).map(b=>{ const el = document.createElement("button");
        el.className = "ui-btn ui-" + b.role; el._b = b;
        el.innerHTML = `<span class="ui-glyph">${b.glyph}</span>` + (b.label ? `<span class="ui-blabel">${b.label}</span>` : "");
        bar.appendChild(el); return el; });
      device.appendChild(screen); device.appendChild(bar);
      wrap.appendChild(device); host.appendChild(wrap);

      state.locked = false; state.attempts = 0; let wrongStreak = 0;
      $("navBtn").style.display = "none"; setNavActive(false);
      state.replayAudio = ()=> play(audioFor(slide, "prompt") || null, ()=>{});
      const correctBtn = ()=> btns.find(x=> x._b.role === d.target_role);
      function react(){ if(d.react === "play") screen.classList.add("playing");
        else if(d.react === "pause") screen.classList.remove("playing");
        else if(d.react === "mute") screen.classList.add("muted");
        const cb = correctBtn(); if(cb && cb._b.glyph_on) cb.querySelector(".ui-glyph").textContent = cb._b.glyph_on; }
      setSwMood("point");
      play(audioFor(slide, "prompt") || null, ()=>{});
      btns.forEach(el=>{ el.onclick = ()=>{
        if(state.locked) return;
        if(el._b.role === d.target_role){
          state.locked = true; el.classList.add("hit"); react(); sfxCorrect(); confettiCannon(); setSwMood("happy");
          if(slide.phase === "mastery"){ state.masteryAttempts++; if(state.attempts === 0) state.masteryHits++; }
          SwiftPAL.emit(d.signal_name || "use_interface_first_try", {slide_id:slide.id, phase:slide.phase,
            value:true, first_try: state.attempts===0, attempts: state.attempts+1});
          play(audioFor(slide, "correct") || null, ()=> setTimeout(()=> completeSlide(true), 900));
        } else {
          state.attempts++; el.classList.add("miss","shake"); setTimeout(()=> el.classList.remove("shake","miss"), 450);
          SwiftPAL.emit("answer_wrong", {slide_id:slide.id, phase:slide.phase, attempts:state.attempts});
          $("hintBtn").classList.add("show");
          if(++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3)){
            state.locked = true; correctBtn().classList.add("reveal-glow");
            play(audioFor(slide, "reveal") || audioFor(slide, "hint") || null, ()=> setTimeout(()=>{ react(); completeSlide(false); }, 900));
          } else if(state.attempts >= 2){ const cb = correctBtn(); cb.classList.add("reveal-glow");
            setTimeout(()=> cb.classList.remove("reveal-glow"), 900); play(audioFor(slide, "hint") || null, ()=>{}); }
          else dragWrong(slide);
        }
      }; });
      $("hintBtn").onclick = ()=>{ if(state.locked) return; const cb = correctBtn();
        cb.classList.add("reveal-glow"); setTimeout(()=> cb.classList.remove("reveal-glow"), 900);
        play(audioFor(slide, "hint") || null, ()=>{}); };
    }
  },

  /* ==== SYLLABLE CLAPPING (H02 phonological awareness — शब्दों को अक्षरों में बाँटकर ताली से गिनना).
     ADDITIVE (r4j); no existing module touched. No-मात्रा words; one clap per अक्षर.
       MEET_SYLLABLE     teach BY DOING: tap each akshar tile → hear its sound + a clap; then Swiftie
                         states "<शब्द> में N अक्षर — N ताली!". Print↔sound↔count in one beat.
       SYLLABLE_CLAP     PRODUCE test: hear the word (picture + 🔊), tap the DRUM once per akshar, then
                         "हो गया". exact = celebrate; wrong (too few/many — the misconception) = replay
                         the word SEGMENTED (क-म-ल, one clap each) + reset; reveal-demo after max_attempts.
       TAP_SYLLABLE_COUNT pick: hear the word → tap the NUMERAL (1/2/3) matching the akshar count
                         (dual-coded numeral+hand via numFingerCell; rides the mountTapOptions contract).
     Audio roles for the two produce modules are NON-autochain (intro/word/explain) so autoPlayChain
     doesn't double-fire; each sets state.replayAudio so the 🔊 header chip re-plays the word. ==== */
  MEET_SYLLABLE: {
    mount(host, slide){
      const d = slide.data || {};
      const aks = d.aksharas || [];
      const wrap = document.createElement("div"); wrap.className = "syl-meet";
      const pic = document.createElement("div"); pic.className = "syl-pic";
      pic.innerHTML = imgOrEmoji(d.img, d.emoji, "syl-pic-img", "syl-pic-emoji");
      wrap.appendChild(pic);
      const row = document.createElement("div"); row.className = "syl-tiles";
      const tiles = aks.map(a => { const t = document.createElement("div"); t.className = "syl-tile tappable";
        t.innerHTML = `<span class="syl-ch ink-glyph">${a.ch}</span>`; row.appendChild(t); return t; });
      wrap.appendChild(row);
      const dots = document.createElement("div"); dots.className = "syl-dots";
      const dotEls = aks.map(()=>{ const s = document.createElement("span"); s.className = "syl-dot"; dots.appendChild(s); return s; });
      wrap.appendChild(dots);
      host.appendChild(wrap);

      state.ownsAudio = true; state.locked = false; setNavActive(false);
      $("navBtn").onclick = ()=>{ if(state.locked) completeSlide(true); };
      state.replayAudio = ()=> play(audioFor(slide, "word") || audioFor(slide, "intro") || null, ()=>{});
      let done = 0;
      const nudgeNext = ()=>{ const nx = tiles.find(t => !t.classList.contains("said")); if(nx) pointNudgeAt(nx); else stopNudge(); };
      tiles.forEach((t, i)=>{
        t.onclick = ()=>{
          if(state.locked) return;
          const src = "assets/Audio/" + aks[i].audio + "." + AUDIO_EXT;
          if(t.classList.contains("said")){ play(src); return; }
          t.classList.add("said", "reveal-glow"); setTimeout(()=> t.classList.remove("reveal-glow"), 500);
          dotEls[i].classList.add("on"); sfxTap(); btThunk(i + 1); setSwMood("point"); done++;
          play(src, ()=>{ if(done === tiles.length){ stopNudge(); state.locked = true; setSwMood("happy");
              play(audioFor(slide, "explain") || null, ()=> setNavActive(true)); }
            else nudgeNext(); });
        };
      });
      playChain([audioFor(slide, "intro"), audioFor(slide, "word")].filter(Boolean), 0, ()=> nudgeNext());
    }
  },

  SYLLABLE_CLAP: {
    mount(host, slide){
      const d = slide.data || {};
      const target = d.count || (d.aksharas || []).length;
      const aks = d.aksharas || [];
      const wrap = document.createElement("div"); wrap.className = "syl-clap";
      const stim = document.createElement("div"); stim.className = "syl-clap-stim";
      stim.innerHTML = imgOrEmoji(d.img, d.emoji, "syl-pic-img", "syl-pic-emoji") + `<span class="syl-spk">🔊</span>`;
      stim.onclick = ()=>{ state.audioReplays++; play(audioFor(slide, "word") || null); };
      wrap.appendChild(stim);
      const dotRow = document.createElement("div"); dotRow.className = "syl-clap-dots"; wrap.appendChild(dotRow);
      const ctrls = document.createElement("div"); ctrls.className = "syl-clap-ctrls";
      const reset = document.createElement("button"); reset.className = "syl-reset"; reset.textContent = "↺";
      const drum = document.createElement("button"); drum.className = "syl-drum";
      drum.innerHTML = imgOrEmoji(d.drum_img, "🥁", "syl-drum-img", "syl-drum-emoji");
      const doneBtn = document.createElement("button"); doneBtn.className = "syl-done";
      doneBtn.innerHTML = `<span class="sd-ck">✓</span><span class="sd-lbl">हो गया</span>`;
      ctrls.appendChild(reset); ctrls.appendChild(drum); ctrls.appendChild(doneBtn);
      wrap.appendChild(ctrls); host.appendChild(wrap);

      let claps = 0; state.attempts = 0; state.locked = false;
      const maxA = (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
      $("navBtn").style.display = "none"; setNavActive(false);
      state.replayAudio = ()=> play(audioFor(slide, "word") || null, ()=>{});
      const renderDots = ()=>{ dotRow.innerHTML = ""; for(let i=0;i<claps;i++){ const s = document.createElement("span"); s.className = "syl-cdot on"; dotRow.appendChild(s); }
        doneBtn.classList.toggle("ready", claps > 0); };
      const segmentDemo = (cb)=>{   // demonstrate the correct segmentation: क (clap) - म (clap) - ल (clap)
        let i = 0; claps = 0; renderDots();
        const step = ()=>{ if(i >= aks.length){ if(cb) cb(); return; }
          claps++; renderDots(); btThunk(i + 1); sfxTap();
          play("assets/Audio/" + aks[i].audio + "." + AUDIO_EXT, ()=>{ i++; setTimeout(step, 260); }); };
        step();
      };
      drum.onclick = ()=>{ if(state.locked) return; claps++; renderDots(); sfxTap(); btThunk(claps);
        drum.classList.add("hit"); setTimeout(()=> drum.classList.remove("hit"), 140); };
      reset.onclick = ()=>{ if(state.locked) return; claps = 0; renderDots(); };
      doneBtn.onclick = ()=>{
        if(state.locked || claps === 0) return;
        if(claps === target){
          state.locked = true;
          if(slide.phase === "mastery"){ state.masteryAttempts++; if(state.attempts === 0) state.masteryHits++; }
          SwiftPAL.emit(d.signal_name || "syllable_clap_first_try", { slide_id: slide.id, phase: slide.phase,
            value: true, first_try: state.attempts === 0, attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
          sfxCorrect(); confettiCannon(); setSwMood("celebrate");
          play(audioFor(slide, "correct") || null, ()=> setTimeout(()=> completeSlide(true), 800));
        } else {
          state.attempts++; sfxWrongSoft(); setSwMood("tryagain"); $("hintBtn").classList.add("show");
          SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          if(state.attempts >= maxA){ state.locked = true;
            play(audioFor(slide, "reveal") || null, ()=> segmentDemo(()=> setTimeout(()=> completeSlide(false), 900))); }
          else { play(audioFor(slide, "try_again") || null, ()=> segmentDemo(()=>{})); }
        }
      };
      $("hintBtn").onclick = ()=>{ if(state.locked) return; state.hintUsed = true;
        play(audioFor(slide, "hint") || null, ()=> segmentDemo(()=>{})); };
      playChain([audioFor(slide, "intro"), audioFor(slide, "word")].filter(Boolean), 0, ()=>{});
    }
  },

  TAP_SYLLABLE_COUNT: {
    mount(host, slide){
      const d = slide.data || {};
      const stim = document.createElement("div"); stim.className = "syl-clap-stim"; stim.style.cursor = "pointer";
      stim.innerHTML = imgOrEmoji(d.img, d.emoji, "syl-pic-img", "syl-pic-emoji") + `<span class="syl-spk">🔊</span>`;
      stim.onclick = ()=>{ state.audioReplays++; play(audioFor(slide, "word_name") || audioFor(slide, "prompt") || null); };
      mountTapOptions({
        slide, host, signalName: d.signal_name || "syllable_count_first_try",
        stimulus: stim, columnsHint: (d.options || []).length,
        options: d.options,
        isCorrect: (opt)=> opt.n === d.count,
        optionRenderer: (opt)=>{ const c = document.createElement("div"); c.className = "syl-numopt";
          let dots = ""; for(let i=0;i<opt.n;i++) dots += `<span class="syl-ndot"></span>`;
          c.innerHTML = `<span class="syl-numeral">${devNumeral(opt.n)}</span><span class="syl-ndots">${dots}</span>`;
          return c; },
        mastery: slide.phase === "mastery"
      });
    }
  },

  /* ==== DECODE_TAP (H04 L02 — बिना-मात्रा वाले 2-अक्षर शब्दों को अक्षर-ध्वनि से decode करना).
     ADDITIVE (r4k); no existing module touched. The "decode-tap reader": a matra-free 2-letter word
     is shown as ORDERED letter tiles with a + joiner; the child taps each tile LEFT→RIGHT to hear its
     अक्षर-ध्वनि (/घ/, /र/), then taps the BLEND button (जोड़ो) → the tiles merge, the FULL word is
     spoken (घर) and its picture is revealed + celebrates. Ordered tapping directly counters the
     letter-reversal misconception (नल→लन): only the NEXT expected tile is active; tapping ahead just
     re-points the nudge at the correct tile — never a red ✗ (produce/teach family; the world enacts).
     modes: "teach" (picture shown throughout, Swiftie EXPLAINs the blend) · "guided"/"independent"/
     "mastery" (picture HIDDEN until blend, so the child must decode to reveal it — an honest read).
     data:{ word_hi, img, emoji, aksharas:[{ch,audio}], mode, signal_name }.
     audio roles (NON-autochain → set via state.ownsAudio): intro|prompt (open), blend_prompt (nudge to
     the blend button), word (the blended word), explain (teach) / correct (test). ==== */
  DECODE_TAP: {
    mount(host, slide){
      const d = slide.data || {};
      const aks = d.aksharas || [];
      const mode = d.mode || "guided";
      const showPic = (mode === "teach" || mode === "guided");
      const wrap = document.createElement("div"); wrap.className = "decode-stage";
      const pic = document.createElement("div"); pic.className = "decode-pic" + (showPic ? "" : " hidden");
      pic.innerHTML = imgOrEmoji(d.img, d.emoji, "decode-pic-img", "decode-pic-emoji");
      wrap.appendChild(pic);
      const row = document.createElement("div"); row.className = "decode-tiles";
      const tiles = [];
      aks.forEach((a, i)=>{
        if(i > 0){ const plus = document.createElement("span"); plus.className = "decode-plus"; plus.textContent = "+"; row.appendChild(plus); }
        const t = document.createElement("div"); t.className = "decode-tile";
        t.innerHTML = `<span class="decode-ch ink-glyph">${a.ch}</span>`;
        row.appendChild(t); tiles.push(t);
      });
      wrap.appendChild(row);
      const blend = document.createElement("button"); blend.className = "decode-blend";
      blend.innerHTML = `<span class="db-arrow">🔀</span><span class="db-lbl">${d.blend_label || "जोड़ो"}</span>`;
      wrap.appendChild(blend);
      const wordOut = document.createElement("div"); wordOut.className = "decode-word hidden";
      wordOut.innerHTML = `<span class="ink-glyph">${d.word_hi || ""}</span><span class="dw-spk">🔊</span>`;
      wrap.appendChild(wordOut);
      host.appendChild(wrap);

      state.ownsAudio = true; state.locked = false; state.attempts = 0;
      setNavActive(false);   // produce/teach family: keep आगे visible (mountSlide restored display), just gated
      const wordSrc = ()=> audioFor(slide, "word") || null;
      state.replayAudio = ()=> play(wordSrc(), ()=>{});
      wordOut.onclick = ()=>{ state.audioReplays++; play(wordSrc()); };

      let next = 0, blended = false;
      const nudgeActive = ()=>{ if(blended){ stopNudge(); return; }
        if(next < tiles.length) pointNudgeAt(tiles[next]); else pointNudgeAt(blend); };

      tiles.forEach((t, i)=>{
        t.onclick = ()=>{
          if(state.locked || blended) return;
          if(t.classList.contains("said")){ play("assets/Audio/" + aks[i].audio + "." + AUDIO_EXT); return; }
          if(i !== next){ sfxTap(); pointNudgeAt(tiles[next]); return; }   // out-of-order → re-point (reversal guard)
          t.classList.add("said", "reveal-glow"); setTimeout(()=> t.classList.remove("reveal-glow"), 500);
          sfxTap(); btThunk(i + 1); setSwMood("point"); next++;
          play("assets/Audio/" + aks[i].audio + "." + AUDIO_EXT, ()=>{
            if(next >= tiles.length){ blend.classList.add("ready"); setSwMood("point");
              play(audioFor(slide, "blend_prompt") || null, ()=> nudgeActive()); }
            else nudgeActive();
          });
        };
      });

      blend.onclick = ()=>{
        if(state.locked || blended){ return; }
        if(next < tiles.length){ nudgeActive(); return; }   // must decode every tile first
        blended = true; state.locked = true; stopNudge();
        tiles.forEach(t=> t.classList.add("merge"));
        row.querySelectorAll(".decode-plus").forEach(p=> p.classList.add("gone"));
        blend.classList.add("gone");
        wordOut.classList.remove("hidden"); wordOut.classList.add("pop");
        if(!showPic){ pic.classList.remove("hidden"); pic.classList.add("pop"); }
        sfxCorrect(); confettiCannon(); setSwMood("celebrate");
        if(slide.phase === "mastery"){ state.masteryAttempts++; state.masteryHits++; }
        SwiftPAL.emit(d.signal_name || "decode_tap_first_try", { slide_id: slide.id, phase: slide.phase,
          value: true, first_try: true, word: d.word_hi, latency_ms: Date.now()-state.slideStart });
        play(wordSrc(), ()=>{
          play(audioFor(slide, mode === "teach" ? "explain" : "correct") || null, ()=> setNavActive(true));
        });
      };
      $("navBtn").onclick = ()=>{ if(blended) completeSlide(true); };
      playChain([audioFor(slide, "intro"), audioFor(slide, "prompt")].filter(Boolean), 0, ()=> nudgeActive());
    }
  }
};

/* VACHAN (एकवचन/बहुवचन) + any 2-category attribute reuse the GENERIC gender modules — identical
   mechanic, just different labels. A vachan game authors these types with the category in the
   "gender" field (e.g. "S"/"P"), the two labels, and (for pairs) f=singular / m=plural; it then
   inherits immediate tap-to-answer feedback, speak-word-on-tap, layered hints, and the engine
   guard for free. Named *_VACHAN (not *_NUMBER) to avoid colliding with MEET_NUMBER = counting. */
/* TRACK_FOLLOW (H03 tracking) = READ_PATH with a glowing "animated tracker" cursor (guide) that rides
   the current word so the child follows word-by-word. Distinct type (own variety bucket); same mount —
   READ_PATH reads slide.type to switch the glow on. ADDITIVE (r4f). */
SlideModules.TRACK_FOLLOW          = SlideModules.READ_PATH;
/* FIX_TRACKING (H03) = TAP_READ_POS with a "confused reader" finger shown at the wrong spot
   (data.confused_at); the child taps where the finger SHOULD go. Distinct type (own variety bucket);
   same mount. ADDITIVE (r4h). */
SlideModules.FIX_TRACKING          = SlideModules.TAP_READ_POS;
SlideModules.VACHAN_INTRO          = SlideModules.GENDER_INTRO;
SlideModules.MEET_VACHAN           = SlideModules.MEET_GENDER;
SlideModules.TAP_VACHAN            = SlideModules.TAP_GENDER;
SlideModules.TAP_PICTURE_BY_VACHAN = SlideModules.TAP_PICTURE_BY_GENDER;
SlideModules.SORT_VACHAN           = SlideModules.SORT_GENDER;
SlideModules.MATCH_VACHAN_PAIRS    = SlideModules.MATCH_GENDER_PAIRS;

SlideModules.SORT_WORDS = SlideModules.SORT_QTYPE;   // generic two-box word sort (custom data.bins), r4n

/* ---------- 13. CONTROLLER ---------- */
/* [HI02H02] the mic chip art (blue chip, white mic glyph + a hidden 5-bar sound wave) - the story pages' read-aloud mic */
const SPK_SVG = '<svg viewBox="0 0 62 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Audio"><g filter="url(#spChipShadow)"><rect x="8" y="4" width="46" height="44" rx="22" fill="url(#spChipGrad)"/><rect x="6" y="2" width="50" height="48" rx="24" stroke="white" stroke-width="4"/><rect class="mic" x="26.75" y="15.05" width="8.5" height="15.85" rx="4.25" fill="white"/><path class="mic" d="M24.5 26V26.7A6.5 6.5 0 0 0 37.5 26.7V26M31 33.2V36.1M27.7 36.8H34.3" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><g class="mic-wave" fill="white"><rect x="22.9" y="22" width="2.2" height="8" rx="1.1"/><rect x="26.4" y="19" width="2.2" height="14" rx="1.1"/><rect x="29.9" y="17" width="2.2" height="18" rx="1.1"/><rect x="33.4" y="19" width="2.2" height="14" rx="1.1"/><rect x="36.9" y="22" width="2.2" height="8" rx="1.1"/></g></g><defs><filter id="spChipShadow" x="0" y="0" width="62" height="60" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="4"/><feGaussianBlur stdDeviation="2"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/></filter><linearGradient id="spChipGrad" x1="8" y1="26" x2="54" y2="26" gradientUnits="userSpaceOnUse"><stop stop-color="#1987FC"/><stop offset="1" stop-color="#1565F4"/></linearGradient></defs></svg>';
/* r4: gold star burst for the celebration finale (adopted from Shruti's build) */
function starBurst(){
  if(document.documentElement.classList.contains("no-anim")) return;
  /* [KIT 8 / celebration] the kit's retuned burst replaces the engine's finale burst. */
  try{ if(window.FLNKit){
       var _h = document.getElementById('confetti') ||
                document.getElementById('endScreen') || document.body;
       if(_h.clientWidth > 0){ FLNKit.starBurst(_h, FLNKit.SB); return; } } }catch(e){}
  const host = $("confetti"); if(!host) return;
  const cv = document.createElement("canvas");
  cv.width = 1333; cv.height = 750;
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  host.appendChild(cv);
  const ctx = cv.getContext("2d");
  const COLORS = ["#FFE400","#FFBD00","#E89400","#FFCA6C","#FDFFB8"];
  const TICKS = 100, DECAY = 0.96, START_V = 22;
  const parts = [];
  function starPath(r){
    ctx.beginPath();
    for(let i=0;i<10;i++){
      const rad = (i % 2 === 0) ? r : r/2;
      const a = Math.PI/5*i - Math.PI/2;
      ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a)*rad, Math.sin(a)*rad);
    }
    ctx.closePath();
  }
  function shoot(){
    const add = (n, scalar, shape) => {
      for(let i=0;i<n;i++){
        const a = Math.random()*Math.PI*2;
        parts.push({ x:cv.width/2, y:cv.height/2, ax:Math.cos(a), ay:Math.sin(a),
          vel:START_V*(0.5 + Math.random()), tick:0, scalar, shape,
          color:COLORS[Math.floor(Math.random()*COLORS.length)],
          rot:Math.random()*Math.PI*2, spin:(Math.random()-.5)*0.3 });
      }
    };
    add(80, 1.8, "star");
    add(20, 1.0, "circle");
  }
  shoot(); setTimeout(shoot, 150); setTimeout(shoot, 300);
  let frames = 0;
  (function frame(){
    ctx.clearRect(0, 0, cv.width, cv.height);
    let alive = false;
    for(const p of parts){
      if(p.tick >= TICKS) continue;
      alive = true;
      p.x += p.ax*p.vel; p.y += p.ay*p.vel; p.vel *= DECAY; p.rot += p.spin; p.tick++;
      ctx.globalAlpha = 1 - p.tick/TICKS;
      ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if(p.shape === "star"){ starPath(8*p.scalar); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0, 0, 6*p.scalar, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
    frames++;
    if(alive || frames < 30) requestAnimationFrame(frame);
    else setTimeout(()=> cv.remove(), 300);
  })();
}
function clearHost(){
  state.cleanups.splice(0).forEach(f=>{ try{ f(); }catch(e){} });   // [HI02H02] per-slide timers a module started (later/onLeave)
  $("nudgeHand").classList.remove("glide");
  document.body.classList.remove("is-end");   // r4: clear immersive end state when leaving celebration
  /* [28g] "going back from last screen gets swiftie stuck" — clearHost dropped body.is-end but never
     took .show off #endScreen, so the celebration layer (big cheering Swiftie + "बहुत बढ़िया!") stayed
     ON TOP of whatever slide you landed on, covering the middle option card.
     I found this myself earlier tonight and mis-triaged it as low severity — "a child can never go back
     from celebration" — forgetting that REVIEW uses the dev nav, so it hits every review pass. It also
     produced 60 phantom overlap findings in my own audit sweep before I understood it.
     Tear the layer down here, where every slide mount already passes.
     Scoped to the END SCREEN only, on purpose: I first also cleared stage.blurred/gating and the
     phase gate here, but mountSlide runs INSIDE the gate's callback, so that would have un-blurred
     the gray gate mid-flight — breaking the transition built two bumps ago to fix a different report. */
  const _es = $("endScreen");
  if(_es) _es.classList.remove("show", "hint-glow");
  $("slideHost").innerHTML = "";
  $("hintBtn").classList.remove("show");
  $("hintBtn").disabled = false;
  setNavActive(false);
  stopNudge();
  resetIdleVo();   // [27b] no idle-replay timer survives into the next slide; [27f] and the next
                   // slide gets its own single reminder (teardown is the one place the fired flag clears)
  stopAudio();
}

/* [2026-09-04 no-cut-feedback] आगे has no isPlaying guard on the slides that show it (T0-T4 here) —
   safe on the INITIAL teach chain (आगे stays disabled via gateNavUntilAudio/walkDone until it ends),
   but not on a REPLAY the child explicitly triggered afterward (the 🔊 chip, or a T0 word tap): tap
   आगे mid-replay and the next slide's autoPlayChain calls play(), which stopAudio()s the replay mid-
   word. Same shape as the शुरू करें and wrong-tap-retry fixes above: queue the advance on `state.
   navPending` instead of cutting, and resolve it from the replay's own onEnd (navUnlock, and T0's
   word-tap play() call) the instant that clip actually finishes. */
function _navAdvance(){
  if(isPlaying){ state.navPending = true; return; }
  completeSlide(true);
}
function _resolveNavPending(){
  if(state.navPending){ state.navPending = false; completeSlide(true); }
}

function mountSlide(idx){
  state.mountId++;   // [HI02H02] a module's late callbacks check it (aliveFor) so they never touch the next slide
  state.idx = idx;
  state.slideStart = Date.now();
  state.attempts = 0; state.selectedKey = null; state.locked = false;
  state.hintUsed = false; state.nudgeUsed = false; state.scaffoldLevel = 0; state.hintActive = false; state.helpShown = false;
  state.audioReplays = 0; state.gateNavUntilAudio = false; state.endBtnPending = false;
  state.replayAudio = null;   // a module may set a slide-specific replay (e.g. teach slides whose
                              // audio roles aren't in the autoPlayChain order); else the chip replays the chain
  state.ownsAudio = false;    // a module that drives its OWN audio sequence sets this → skip autoPlayChain
                              // (else the auto prompt-chain stomps/truncates the module's timed VO)
  state.revealing = false;    // [24a N8] true while a reveal_seq/sortSeqReveal is mid-flight (blocks replay + drag)
  state.demoRunning = false;  // [24a N8] true while a self-driving teach chain runs (blocks the replay chips)
  const slide = CARD.slides[idx];
  clearHost();

  // header prompt
  $("promptText").textContent = slide.prompt_hi || "";
  /* [2026-08-31 compact-title] auto-shrink a prompt that wraps to 2 lines (e.g. T4 माफ़ करें) so it
     doesn't fill the band edge-to-edge — see the matching .compact rule in style.css. Wording/VO
     untouched.
     NOT scrollHeight/getBoundingClientRect: #promptText reports a 0×0 box on EVERY read (verified
     immediately, after a settle wait, and after a double-rAF) despite rendering fine on screen — no
     children, position:static, display:block, so this isn't the usual absolutely-positioned-children
     collapse; cause not fully root-caused, but it is consistent enough (also hits the ?slide=N QA
     capture path shoot_all.py uses) that box-model reads cannot drive this.
     NOT canvas measureText either — tried it first, but canvas font resolution didn't pick up the
     Devanagari web font's actual glyph widths and measured this exact T4 line at 649px, well under
     the 915px band width, when the real render wraps it: a false negative that would have shipped
     the bug unfixed while looking done.
     CHARACTER-LENGTH THRESHOLD instead — measured against the actual rendered fleet-of-4 in this
     card: T1 46 chars → 1 line, T3 42 chars → 1 line, T2 48 chars → 2 lines, T4 53 chars → 2 lines.
     47 sits in the gap. Coarser than a true measurement, but for this font/size/band-width triple
     and Hindi prompts of ordinary composition it matches every known case without depending on a
     measurement path that has already produced one false negative on this exact slide. */
  (function(){
    const pt = $("promptText");
    pt.classList.toggle("compact", (slide.prompt_hi || "").length > 47);
  })();

  // Hint button stays HIDDEN until the learner makes a wrong attempt, then it is
  // exposed (graduated scaffold). Mastery uses the SAME scaffold — not excluded.
  $("hintBtn").classList.remove("show");
  $("hintBtn").style.display = "";
  /* [33c no-आगे-in-test] the choke point, applied. Runs BEFORE the mechanic mounts, so a module that
     genuinely needs आगे in a test phase brings it back the moment it enables it — see navSuppressed()
     above for why the rule is "did anyone enable it" and not a list of mechanic names. */
  state.navSuppressed = navSuppressed(slide);
  $("navBtn").style.display = state.navSuppressed ? "none" : "";   // tap-to-answer slides also hide it themselves
  // [16i] DEFAULT nav wiring — a module that enables आगे without overriding onclick still advances.
  // (DEMO_COUNT shipped an enabled-but-dead button; auto-INTRO inherited an unfulfillable tap guard.)
  state.navPending = false;
  $("navBtn").onclick = _navAdvance;
  setSwMood("point");                    // Swiftie turns to present each new slide

  GameBus.emit("slide_entered", { slide_id: slide.id, phase: slide.phase, eis: slide.eis, type: slide.type, idx });

  // audio chip = replay the slide audio. Prefer a module-supplied replay (teach slides own their
  // count_intro/explain sequence, which autoPlayChain deliberately skips), else replay the chain.
  // [24a N7b] navUnlock is defined ONCE so BOTH the mount chain AND every replay re-apply it —
  // otherwise a replay's stopAudio() (echo guard) gen-kills the mount chain's onDone and आगे stays
  // stuck disabled forever (the फिर-सुनो-mid-VO brick on gated teach slides). Also releases a
  // pending celebration end-button for the same reason.
  const navUnlock = ()=>{
    if(state.gateNavUntilAudio) setNavActive(true);
    if(state.endBtnPending){ $("endBtn").classList.add("show","hint-glow"); state.endBtnPending = false; }
    _resolveNavPending();   // [2026-09-04 no-cut-feedback] a queued आगे tap fires now, not before
  };
  // [24a N8] replay chips ignore taps: while a VO is SOUNDING (a replay can no longer orphan a
  // mid-clip onDone → the "unlock rides the last clip's onEnd" modules can't be bricked); while a
  // reveal_seq/sort reveal runs (no stomping the one-by-one narration); while a self-driving demo
  // chain runs (a replay would gen-kill its chain); and on self-driving slides that offer no replay.
  const replaySlideAudio = ()=>{
    if(isPlaying || state.revealing || state.demoRunning || (state.ownsAudio && !state.replayAudio)) return;
    state.audioReplays++;
    GameBus.emit("audio_replay", { slide_id: slide.id, phase: slide.phase, count: state.audioReplays });
    if(state.replayAudio){ state.replayAudio(); navUnlock(); } else autoPlayChain(slide, navUnlock);
  };
  $("audioChip").onclick = replaySlideAudio;

  // mount the type
  const mod = SlideModules[slide.type];
  if(!mod){ console.error("[engine] no module for", slide.type); return; }
  // [engine JS] r4/F1 TEACHING FRAME: tutorial slides mount inside a grid-paper .tut-card (header hidden,
  // prompt in-card, standing Swiftie bottom-left + shoulder audio chip). Type-agnostic — any tutorial-phase
  // module renders into the card. Non-tutorial slides mount bare into slideHost as before.
  const isTut = (slide.phase === "tutorial" && slide.type !== "PHASE_TRANSITION" && slide.type !== "CELEBRATION" && slide.frame !== false);   // [HI02H02] slide.frame:false = the header layout
  $("stage").classList.toggle("tut", isTut);
  document.body.classList.toggle("tut-page", isTut);
  let mountHost = $("slideHost");
  if(isTut){
    const card = document.createElement("div"); card.className = "tut-card";
    card.innerHTML = `<div class="tut-prompt">${slide.prompt_hi || ""}</div>` +
      `<img class="tut-mascot" src="assets/UI/start_mascot.webp" alt="" onerror="this.style.display='none'">` +
      `<span class="tut-audio" role="button" aria-label="फिर से सुनो"><svg viewBox="0 0 62 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Audio"><g filter="url(#tutChipShadow)"><rect x="8" y="4" width="46" height="44" rx="22" fill="url(#tutChipGrad)"/><rect x="6" y="2" width="50" height="48" rx="24" stroke="white" stroke-width="4"/><path d="M29.8466 19.0574C29.8804 19.0524 29.9145 19.0496 29.9487 19.0488C30.6094 19.0317 31.0021 19.5124 31.0015 20.1414C31.0008 20.9661 31.0003 21.7911 31.0005 22.6158L31.001 27.7212L31.0009 30.5591C31.0009 31.0364 31.0122 31.5472 30.9863 32.0228C30.9662 32.2709 30.902 32.4608 30.7251 32.643C30.3831 32.9952 29.8337 33.0842 29.4386 32.7671C29.0784 32.4781 28.7473 32.1159 28.4181 31.7862L26.4414 29.8087C26.1771 29.5426 25.9071 29.2636 25.6339 29.0081C25.0227 28.9649 24.3645 29.017 23.7487 28.9979C23.445 28.9885 23.1625 29.0211 22.8589 28.9606C22.3751 28.8616 22.0618 28.4823 22.0642 27.9824C22.0706 26.5937 22.0287 25.1949 22.0828 23.8081C22.0884 23.6626 22.2302 23.4334 22.3309 23.3252C22.454 23.1907 22.6146 23.0963 22.792 23.0543C23.0567 22.9904 23.5328 23.016 23.8224 23.0128C24.4143 23.0063 25.0171 23.0277 25.609 23.0073C25.6794 22.9529 25.8505 22.7743 25.919 22.706L26.5305 22.0945L28.5396 20.0838C28.9157 19.7059 29.3217 19.1749 29.8466 19.0574Z" fill="white"/><path class="wv wv2" d="M36.2367 18.6905C36.8783 18.6449 37.3041 19.231 37.6725 19.6829C38.7675 21.0046 39.4982 22.5894 39.7923 24.2804C40.2503 26.8763 39.6548 29.5478 38.1378 31.7035C37.8393 32.1274 37.508 32.5324 37.149 32.9063C36.9404 33.1236 36.7646 33.2558 36.4622 33.3081C36.2013 33.3412 35.9378 33.2717 35.7272 33.1144C35.5185 32.9615 35.3816 32.7298 35.3483 32.4733C35.2786 31.9235 35.5696 31.6821 35.8914 31.3297C36.0448 31.1639 36.1901 30.9908 36.3269 30.811C38.3669 28.136 38.4986 24.4654 36.6555 21.6511C36.4826 21.3899 36.2966 21.1376 36.0984 20.8951C35.8252 20.5652 35.3947 20.2691 35.3472 19.8184C35.2845 19.2225 35.6439 18.768 36.2367 18.6905Z" fill="white"/><path class="wv wv1" d="M33.3868 21.5044C33.9769 21.4549 34.2563 21.7845 34.5981 22.1981C35.1982 22.924 35.6149 23.7691 35.8211 24.6886C36.171 26.2384 35.8867 27.8637 35.0314 29.2026C34.7421 29.6568 34.2333 30.3745 33.6937 30.4946C33.1633 30.5437 32.6759 30.2927 32.5495 29.7376C32.3921 29.0462 32.9849 28.6956 33.3274 28.1763C34.2088 26.833 34.1932 25.0908 33.288 23.7635C33.0747 23.4522 32.6159 23.0564 32.5518 22.7133C32.4377 22.1027 32.7745 21.619 33.3868 21.5044Z" fill="white"/></g><defs><filter id="tutChipShadow" x="0" y="0" width="62" height="60" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="4"/><feGaussianBlur stdDeviation="2"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/></filter><linearGradient id="tutChipGrad" x1="8" y1="26" x2="54" y2="26" gradientUnits="userSpaceOnUse"><stop stop-color="#1987FC"/><stop offset="1" stop-color="#1565F4"/></linearGradient></defs></svg></span>`;
    const inner = document.createElement("div"); inner.className = "tut-content";
    card.insertBefore(inner, card.querySelector(".tut-mascot"));
    card.querySelector(".tut-audio").onclick = replaySlideAudio;   // [24a N7b/N8] same guard + navUnlock as the header chip
    $("slideHost").appendChild(card);
    mountHost = inner;
  }
  try{ if(state._capObs){ state._capObs.disconnect(); state._capObs = null; } }catch(e){}   /* [H11-83] */
  try{ if(state._fwObs){ state._fwObs.disconnect(); state._fwObs = null; } }catch(e){}   /* [H11-128] */
  try{ if(state._fwRaf){ cancelAnimationFrame(state._fwRaf); state._fwRaf = 0; } }catch(e){}
  /* [H11-129] the prompt band comes back for every other slide - a mechanic that hides chrome
     must put it back itself, or the next slide inherits a missing question. */
  try{ const _s = document.querySelector(".stage"); if(_s) _s.classList.remove("fw-mode"); }catch(e){}
  /* [H11-130] and the full-screen scene leaves with its slide. It lives on document.body rather
     than in the slide host, so nothing else would ever remove it. */
  try{ if(state._fwWrap){ state._fwWrap.remove(); state._fwWrap = null; } }catch(e){}
  /* [H11-89/90] a half-revealed verse, or a button still swelling, must not survive the slide it
     belonged to - both are timers, and timers outlive the DOM they were written for. */
  try{ (state._verseTimers || []).forEach(clearTimeout); state._verseTimers = null; }catch(e){}
  try{ clearTimeout(state._navCallT); state._navCallT = null;
       const _nb = $("navBtn"); if(_nb) _nb.classList.remove("nav-call"); }catch(e){}
  mod.mount(mountHost, slide);
  bustArt(mountHost);   /* [H11-79] every slide writes fresh <img>; stamp them so a replaced picture arrives */
  try{   /* [H11-216] */
    mountHost.querySelectorAll("img").forEach(im => { const s = im.getAttribute("src") || "";
      if(s && !/^(blob|data):/.test(s) && !im.complete){ AssetLoader.release(s); AssetLoader.foreground(im); } });
    AssetLoader.prioritize([].concat(_slideAssetUrls(state.idx), _slideAssetUrls(state.idx + 1), _slideAssetUrls(state.idx + 2)));
  }catch(e){}
  // game-feel: animate the slide content in on every mount
  { const _sh = $("slideHost"); _sh.classList.remove("slide-in"); void _sh.offsetWidth; _sh.classList.add("slide-in"); }

  // fit-to-box + vertically ink-centre every Devanagari glyph. SYNC pass first so tiles are
  // correct immediately even when rAF is throttled (background / non-painting tab) or a module
  // built its tiles synchronously at mount; rAF second pass re-fits after slide-in layout +
  // font-load settle. (16n: the lone rAF pass could skip drag-tile / stimulus glyphs — Yasir #6.)
  centerAllGlyphs($("slideHost"));
  requestAnimationFrame(()=>{ centerAllGlyphs($("slideHost")); });

  // play the full VO chain automatically (prompt → phoneme/word_name → instruction).
  // If the slide gated its nav button on audio, enable it once the chain finishes
  // (so students can't skip before hearing it). SKIP when the module owns its audio
  // (state.ownsAudio) — else this chain stomps/truncates the module's own timed VO.
  if(!state.ownsAudio){
    autoPlayChain(slide, navUnlock);   // [24a N7b] same unlock the replay chips re-apply
  }
  armIdleVo();   // [27b] start the 7s silent-inactivity watch (all four TEST phases; no-op elsewhere)
                 // [27f] fires at most ONCE per slide
}

/* ---------- [engine JS] r4/P1 PHASE-TRANSITION PEEK GATE (Shruti's peek beat) ----------
   An automatic interstitial fired ON A PHASE BOUNDARY (not a slide type): blur the stage, Swiftie
   peeks up from the bottom under a big headline, hold ≥2s, then mount the next slide. Kept ALONGSIDE
   our journey-map PHASE_TRANSITION module (a distinct, author-placed slide type) — the gate below
   skips PHASE_TRANSITION + CELEBRATION so the two never double-fire. */
function afterConfetti(fn){
  /* let a correct-answer confetti burst finish falling before we move on; 8s hard cap.
     [KIT 7 fix] WAS POLLING ".conf-shot" AND SO NEVER WAITED AT ALL. confettiCannon() was
     rewritten as a KIT 7 shim that returns early via FLNKit.confetti(), which builds
     ".fx-confetti" - ".conf-shot" is now only the dead no-kit fallback and is never in the DOM.
     The querySelector therefore returned null on the FIRST tick and fn() fired after 0ms
     (measured), i.e. the slide advanced straight through the celebration the wait exists to
     protect. Matching on BOTH classes keeps the fallback path working if the kit ever fails
     to load. This is the kit's own confetti.after() contract: never advance on a bare timeout. */
  const started = Date.now();
  (function check(){
    /* [H11-14] HOLD FOR THE SPOKEN LINE TOO, NOT ONLY THE CONFETTI.
       With real recorded VO in place this became audible on every correct answer: the praise
       clips run 3.1-5.0s (vo_correct_pair 3.11, vo_correct_pairs 4.01, vo_c_sentence 5.01)
       while the confetti clears in ~2.8s, so the old single condition mounted the next slide
       mid-sentence and mountSlide() -> stopAudio() cut the line dead. vo_c_sentence lost its
       last 2.2s - the child heard "shabash! sahi vakya hai- bakra ghaas kha" and nothing more.
       isPlaying is the right signal: setPlaying() is the one function EVERY playback exit
       passes through (natural end, supersede, missing-file fallback, autoplay refusal), which
       is the same property body.vo-lock already relies on, so this can never outlive the audio.
       playChain hands off synchronously (fire() -> onEnd -> play() in one tick), so a 200ms poll
       cannot slip through the gap between two clips of a chain and advance early.
       Two SEPARATE caps, not one: confetti keeps its original 8s exactly, and the voice gets its
       own 15s - long enough for every clip this card ships (longest at a completion point is
       vo_sort_jata_rule at 13.6s) while still bounding a stalled clip to a known worst case. */
    const _t = Date.now() - started;
    const _confettiUp = !!document.querySelector(".fx-confetti, .conf-shot") && _t < 8000;
    const _voiceUp    = isPlaying && _t < 15000;
    if(!_confettiUp && !_voiceUp){ fn(); return; }
    setTimeout(check, 200);
  })();
}
/* onscreen headline per gate (display only; distinct from any narration). Eligibility = phase IN this map. */
/* [27j] THERE ARE THREE ROUNDS, NOT FOUR (Yasir 2026-07-28).
   Round 3 is called `practice` in some cards and `independent` in others — the SAME round under two
   names — so `independent` is an ALIAS of practice and takes the identical headline. The earlier bug
   was that a card naming round 3 `independent` got NO round-3 gate at all (the gate is conditional on
   PHASE_GATE_TITLE[next.phase] existing); the fix is the alias, NOT a fourth gate. My first attempt
   added `independent` with its own wording plus a `mastery` gate — both wrong: distinct wording would
   make one round look like two, and there is no round 4.
   `mastery` is deliberately ABSENT: mastery slides continue round 3 without a transition. That also
   means vo_pt_mastery is never played, so a card shipping it carries dead audio — verify_bundle's
   "silent gates: [vo_pt_mastery]" warn is a CHECKER ARTIFACT, not a defect.
   VO ids stay optional: play() treats a missing clip as a silent beat and the 2s peek still holds. */
const PHASE_GATE_TITLE = { tutorial:"चलिए, शुरू करें!", guided:"चलिए, साथ में करें!",
                           practice:"अब आपकी बारी!", independent:"अब आपकी बारी!" };   // [16h] the lead’s official transition lines (VO = full sentences in the card manifest; NOTE aap-register — flagged)
const PHASE_GATE_VO    = { tutorial:"vo_pt_tutorial", guided:"vo_pt_guided",
                           practice:"vo_pt_practice", independent:"vo_pt_independent" };
/* [28h] which ROUND each phase belongs to — the dedup key for gates. practice === independent === the
   one round 3; `mastery` is absent on purpose (it continues round 3), and so is any future phase name,
   which fails safe to "no gate" rather than to a spurious extra one. */
const PHASE_ROUND = { tutorial:"tutorial", guided:"guided", practice:"round3", independent:"round3" };
const _gatedPhases = new Set();   // each ROUND gate plays ONCE (Start→tutorial, →guided, →round 3)
let _gateToken = 0;
/* [H11-132] EVERY GATE STARTS THE BIRD FROM FRAME 0. Chrome keeps ONE animation clock per image
   URL: putting the same URL back on the <img> does not restart it, it carries on from wherever that
   clock has got to - and it has been running since the page loaded. The old HD peek rose once and
   HELD, so a gate that joined it late still showed him at the top and nobody could tell. The talking
   clip loops every 16.1s, so a later gate showed whatever frame the clock was on - reported as him
   stuck peeking over the edge at the second transition - and RISE_MS was timed from the wrong frame.
   A NEW URL is a new image with its own clock. Over http it is a blob: URL minted from ONE fetch,
   so the 6.9MB file is downloaded once, not once per gate (the problem [gate-cache] solved). From
   file:// fetch is blocked, so it is a counter in the query instead - a disk read, not a download. */
const PEEK_SRC = "assets/peeking_talk10s.webp?v=20261008161409";
/* [H11-154] THE FIRST GATE SKIPS THE RISE. Asked for: on the first transition Swifty is already up
   and talking, not climbing into view first. peeking_talk_up.webp is the same animation from 3.82s
   - the first frame he is at the top - cut by _tools/peek_cut.py; the other two gates keep the rise. */
const PEEK_UP_SRC = "assets/peeking_talk_up.webp?v=20261008161409";
const _peekBlobs = {}; let _peekBlobUrl = null, _peekN = 0;
if(/^https?:$/.test(location.protocol)){
  /* only the cut file: every gate uses it now, and peeking_talk10s.webp left the game folder */
  [PEEK_UP_SRC].forEach(u => {
    try{ AssetLoader.ready.then(() => AssetLoader.blob(u)).then(b => { if(b) _peekBlobs[u] = b; }).catch(()=>{}); }catch(e){} });   /* [H11-187] */
}
/* [H11-160] THE LANDING SWIFTY WAVES WHEN PLAY IS PRESSED. new_landing_swiftee_anim.webp plays
   once (its own loop count is 1) - and it used to spend that one pass at page load, behind the
   CG loader, so the child only ever saw the last frame. Now it is restarted on the play tap, and
   plays through once more while the greeting begins. Restarting an animated image means a NEW
   URL (one clock per URL, see [H11-132]): a blob: URL over http so the file is fetched once, a
   counter in the query from file://. */
const LAND_ANIM_SRC = "assets/UI/new_landing_swiftee_anim.webp?v=20261008161409";
let _landBlob = null, _landN = 0;
if(/^https?:$/.test(location.protocol)){
  try{ AssetLoader.blob(LAND_ANIM_SRC).then(b => { _landBlob = b; }).catch(()=>{}); }catch(e){}   /* [H11-187] on screen now: first in line */
}
if(/^https?:$/.test(location.protocol)){   /* [H11-177] the celebration clip, fetched once */
  try{ AssetLoader.ready.then(() => AssetLoader.blob("assets/Images/last_swifty_end.webp"))   /* [H11-187] */
         .then(b => { if(b) window.__endSwBlob = b; }).catch(()=>{}); }catch(e){}
}
function replayLandingSwifty(){
  try{
    const im = document.querySelector(".sg-mascot"); if(!im) return;
    const go = u => { im.removeAttribute("src"); void im.offsetWidth; im.src = u; };
    if(_landBlob){ go(URL.createObjectURL(_landBlob)); return; }
    /* [H11-187] still downloading: the picture that is up keeps playing, and restarts the moment the
       one shared download lands - no second 1.1MB request under a cache-busting query. On file://
       there is no download to wait for, so the counter URL restarts it as before. */
    if(!/^https?:$/.test(location.protocol)){ go(LAND_ANIM_SRC + "&r=" + (++_landN)); return; }
    AssetLoader.blob(LAND_ANIM_SRC).then(b => { if(b){ _landBlob = b; go(URL.createObjectURL(b)); } });
  }catch(e){}
}
function _freshPeekSrc(src){
  src = src || PEEK_SRC;
  if(_peekBlobs[src]){
    const old = _peekBlobUrl;
    _peekBlobUrl = URL.createObjectURL(_peekBlobs[src]);
    if(old) setTimeout(()=> URL.revokeObjectURL(old), 1000);
    return _peekBlobUrl;
  }
  return src + "&g=" + (++_peekN);
}

/* [H11-210] THE LINE NEVER SITS ON THE BIRD - MEASURED, NOT ASSUMED. The CSS sizes are right on
   every screen we can emulate, and still a real Android tablet drew the line over Swifty: its Chrome
   enlarges text by its own rules (text scaling) and counts vh against bars that are on screen. So once
   the caption is in, the line's REAL box is measured against the bird's REAL box: his crest is never
   higher than 38% down his picture (measured over all 61 frames). If the line reaches to within 12px
   of it, the line moves up; if there is not room for it above him, or it is wider than the screen, it
   is scaled down until it fits. Re-run on resize/rotation while the gate is up. */
function _fitGateTitle(){
  try{
    const t = $("phaseGateTitle"), im = $("phaseGateImg"), g = $("phaseGate");
    if(!t || !im || !t.textContent || !g || !g.classList.contains("show")){ window.removeEventListener("resize", _fitGateTitle); return; }
    t.style.removeProperty("top"); t.style.scale = "";
    const ir = im.getBoundingClientRect(); if(!ir.height) return;
    const crest = ir.top + ir.height * 0.38, GAP = 12, EDGE = 8, W = window.innerWidth;
    const tr = t.getBoundingClientRect();
    let sc = Math.min(1, (W - 2 * EDGE) / tr.width);                   // never wider than the screen
    if(tr.top + tr.height * sc > crest - GAP){                          // reaches the bird: lift it
      const room = crest - GAP - EDGE;
      sc = Math.min(sc, room / tr.height);
      sc = Math.max(0.35, sc);
      const top = Math.max(EDGE, crest - GAP - tr.height * sc);
      t.style.setProperty("top", top + "px", "important");
    }
    if(sc < 0.999){ t.style.transformOrigin = "50% 0"; t.style.scale = String(sc); }
  }catch(e){}
}
function phaseBlurTransition(cb, toPhase){
  const tok = ++_gateToken;
  /* [34u] A STALE GATE COULD REMOUNT A SLIDE THE CHILD HAD LEFT — and on the celebration that meant
     a second voice talking over the celebration clip. The 12s watchdog below only checks that no
     NEWER gate replaced this one; it never checked whether the child had moved on, so cb() (captured
     as `()=> mountSlide(nextIdx)` when the gate opened) could fire from anywhere, including CEL.
     Measured on HI01H06_L01_S02: mountSlide(0) at finishGate 7s after the celebration mounted, then
     vo_w_1 over vo_celebrate. See _tools/fix_stale_gate_remount.py for the full trace. */
  const _idxAtGateOpen = (typeof state !== "undefined") ? state.idx : -1;
  stopNudge(); stopAudio();
  const gate = $("phaseGate"), img = $("phaseGateImg");
  /* [gate-cache] restart the peek animation WITHOUT re-downloading it. `?r=+Date.now()` minted a new
     URL per gate, so the 1286KB bird downloaded AGAIN at every transition -- measured 2026-08-08:
     one session with 2 gates = 3 fetches = 3.9MB for one asset, and on the tab's Wi-Fi that download
     races the gate VO. Clearing src + forcing a reflow restarts the animated WebP from the cached copy. */
  /* [peek-complete] _peekStart marks when the ART actually begins, not when the gate opened.
     The bird is a 1.3MB 73-frame file; clearing + resetting src restarts it from the cached
     copy, but the decode still costs time, and timing the hold from openedAt spent part of
     the peek budget on that latency - so the animation was still being clipped near the end. */
  let _peekStart = Date.now();
  /* [H11-95] THE FIRST GATE GETS A BIG SWIFTY WHO COMES DOWN AND TALKS. Asked for: on that
     transition screen, once, large, dropping to the centre, and speaking - but only after the
     play button, i.e. the landing -> tutorial gate. Every later gate keeps the small peeking
     bird, so the big entrance stays an ARRIVAL rather than a thing that happens three times.
     The mouth really moves: sw_talk_body.gif is built by _tools/swifty_talk_body.py from the one
     still, with the beak hinged (see that file). The clip runs 2.6s and loops, and PEEK_MS
     already holds this screen 3.1s, so he is still talking when the gate's own VO is speaking.
     The ?v= token is what restamp.py keeps fresh - without it a re-cut GIF never reaches a
     browser that has the old one. */
  const _bigTalk = (toPhase === "tutorial");
  gate.classList.toggle("pg-talk", _bigTalk);
  /* [H11-154] already up - see PEEK_UP_SRC. First the tutorial gate only; then asked for on the
     second and third gates too, so every transition now opens with Swifty at the top, talking.
     Safe on length: the longest gate line (vo_bridge_lost, 11.1s) ends before the cut file's
     12.3s loop, and the watchdog (12s with no rise) is still longer than the line. */
  const _upPeek = true;
  gate.classList.toggle("pg-up", _upPeek);
  if(img){ img.removeAttribute("src"); void img.offsetWidth;
           img.onload = function(){ _peekStart = Date.now(); };
           /* [H11-126] ONE PEEK, EVERYWHERE. The supplied HD animation replaces both the old
              73-frame peek-a-boo and the still I had cut from it: it rises once, on its own, and
              HOLDS at the top to the end - which is the behaviour that was asked for and the
              reason the still existed at all. So the first gate and the other two now show the
              same thing, and .pg-talk survives only to carry the sink on the way out. */
           /* [H11-131] peeking_talk10s.webp: the same rise, then he TALKS - the beak moves from
              ~4s on. 115 frames / 16.1s, and the file loops, so the gate must be gone before
              16.1s or the rise plays a second time (see GATE_WATCHDOG_MS). */
           img.src = _freshPeekSrc(_upPeek ? PEEK_UP_SRC : PEEK_SRC); }
  /* [H11-94] THE GATE SHOWS SWIFTY, NOT A SENTENCE. Asked for: this screen without the text.
     The line is still SPOKEN - only the writing goes, the same ruling [30i] made for the
     celebration page ("no sentence on the last page").
     THE TABLE CANNOT SIMPLY BE EMPTIED, which is the trap here: PHASE_GATE_TITLE is not only a
     list of captions, it is also the registry of WHICH phases get a gate at all - the transition
     test below reads `PHASE_GATE_TITLE[next.phase] &&`. Blank it and the peeking Swifty, the
     2-second hold and the phase VO all disappear with the words. So the table stays exactly as
     it is, still documenting what each gate would say, and the text is dropped at the one place
     it would have been drawn. .pg-title:empty is already display:none, so the box collapses
     rather than holding a gap open. */
  const title = $("phaseGateTitle"); if(title) title.textContent = "";
  $("stage").classList.add("blurred", "gating");
  document.body.classList.add("gating");
  gate.classList.add("show","hint-glow");
  playSfx("sfx_whoosh");   /* [H11-133] the screen changes - a soft swish, well before Swifty speaks */
  GameBus.emit("phase_transition", { to: toPhase });
  const closeGate = ()=>{ gate.classList.remove("show"); $("stage").classList.remove("blurred", "gating"); document.body.classList.remove("gating"); };
  /* [2026-08-31 GATE SOFT LOCK — Yasir, "an issue regarding next button"]
     The nav button stayed ENABLED underneath the transition overlay, and the gate's only close path
     lived inside the gate VO's onEnd. Pressing आगे a second time while the gate was up ran
     completeSlide() again; `_gatedPhases` already held this round so no new gate opened, the next
     slide mounted at once, its autoPlayChain called play(), and play() opens with stopAudio() —
     destroying the pending onEnd. The overlay then never closed: measured on MTG1A01_L04_S02 T2,
     still covering a mounted question 24s later with no nav button. Two halves, because either
     alone leaves a hole — take the button away while the gate owns the screen, and give the gate a
     close path no audio can destroy. */
  setNavActive(false);
  let _gateDone = false;
  const finishGate = ()=>{
    if(_gateDone) return;                       // cb() must mount the next slide exactly once
    _gateDone = true;
    /* [H11-115] HE GOES BACK DOWN FIRST. The gate used to vanish outright; the ask is that he
       holds while the voice runs and drops when it finishes, and finishing is exactly what this
       function means. The teardown below is delayed by the length of that drop and NOTHING else
       moves - the one-shot guard is already set, so a second call still cannot double-mount. */
    gate.classList.add("pg-sink");
    setTimeout(()=> _tearDownGate(), gate.classList.contains("pg-talk") ? 340 : 0);
  };
  const _tearDownGate = ()=>{
    gate.classList.remove("show", "pg-sink");
    clearTimeout(_capT); if(title){ title.textContent = ""; title.classList.remove("pg-pop"); }
    $("stage").classList.remove("blurred");
    //  [34u] mount the gate's target ONLY if the child is still where the gate opened. The overlay
    //  teardown around this stays unconditional — a stuck overlay is the worse failure.
    if(cb && (_idxAtGateOpen < 0 || state.idx === _idxAtGateOpen)) cb();   // mounts the next slide
    $("stage").classList.remove("gating");      // header returns once the slide is in
    document.body.classList.remove("gating");
  };
  /* [H11-131] HE IS UP BEFORE HE SPEAKS. Asked for: no voice while Swifty is still coming up from
     below. peeking_talk10s.webp peeks to his eyes by 0.9s, rises the rest of the way 2.65-3.3s and
     is settled by 3.3s - so the gate VO waits RISE_MS from when the art actually started.
     The watchdog moves out by the same amount, or the longest gate line (vo_bridge_lost, 10.4s)
     would be cut at 12s: 3.3 + 10.4 = 13.7s. 15.3s still ends before the file's 16.1s loop. */
  const RISE_MS = _upPeek ? 0 : 3300;   /* [H11-154] nothing to wait for when he starts at the top */
  const GATE_WATCHDOG_MS = 12000 + RISE_MS;
  setTimeout(()=>{ if(tok === _gateToken) finishGate(); }, GATE_WATCHDOG_MS);
  // VO only if the card actually ships it; else a silent beat — the 2s min-hold keeps the peek visible.
  /* [H11-73] A CARD MAY SAY MORE THAN THE STOCK LINE AT A GATE. The SME deck puts the line that
     carries the story across - "ये कविता सुनकर मुझे तो बहुत मज़ा आया... आइए साथ मिलकर सभी जोड़ियाँ
     ढूँढ़ते हैं।" - on the transition screen after the poem rather than on the last verse. That is
     the right place for it: this screen IS the moment the lesson turns from listening to doing.
     CARD.phase_gate_vo[phase] overrides the stock clip and may be a LIST, so a card can put its
     own line in front of the standard one instead of losing it. A card that sets nothing behaves
     exactly as before. */
  const _vo = (CARD.phase_gate_vo && CARD.phase_gate_vo[toPhase]) || PHASE_GATE_VO[toPhase];
  const voList = (_vo ? (Array.isArray(_vo) ? _vo : [_vo]) : [])
                   .map(id => audioDir(id) + id + "." + AUDIO_EXT);   // [20a] AUDIO_EXT so generated clips resolve
  const openedAt = Date.now();
  const _speak = (go)=>{
    (function waitRise(){
      if(tok !== _gateToken) return;
      const left = RISE_MS - (Date.now() - _peekStart);
      if(left > 0){ setTimeout(waitRise, Math.min(left, 120)); return; }
      go();
    })();
  };
  /* [H11-145] THE HEADLINE ARRIVES WITH ITS WORDS. Asked for on the first transition: "चलिए,
     शुरू करें!" on screen in the gate's magenta headline - but only once the voice SAYS it, not
     before. [H11-94] blanked the gate text for good reason (a sentence sitting there while Swifty
     talks about something else), so this does not undo it: the card names the text and the moment
     it is spoken (at_ms into the clip, measured off the recording), and nothing shows until then. */
  const _cap = CARD.phase_gate_caption && CARD.phase_gate_caption[toPhase];
  let _capT = null;
  const _armCaption = ()=>{
    if(!_cap || !title) return;
    _capT = setTimeout(()=>{
      if(tok !== _gateToken) return;
      title.textContent = _cap.text; title.classList.remove("pg-pop"); void title.offsetWidth; title.classList.add("pg-pop");
      _fitGateTitle(); window.addEventListener("resize", _fitGateTitle);
    }, _cap.at_ms || 0);
  };
  _speak(()=>{ _armCaption(); playSeq(voList, ()=>{
    if(tok !== _gateToken){ closeGate(); return; }               // a newer gate superseded us
    /* [peek-cut fix] WAS 2000ms AND CUT THE BIRD OFF MID-DUCK. peeking.webp runs 3.03s
       (73 frames: peeks up ~f14, ducks ~f29, hidden ~f43, comes fully up f58-72) and this
       card ships NO vo_pt_* clips, so play() fires its callback instantly as a silent beat
       and the hold fell to the 2000ms floor - closing the gate around f48, i.e. while the
       bird is still DOWN. The child never saw the reveal the animation builds to. 3150ms
       covers the full 3.03s with a small margin; a LONGER vo_pt_* clip still wins, and the
       12s watchdog above is untouched. */
    /* Wait for BOTH: the VO (this callback) AND the bird finishing its peek. Polls instead of
       one setTimeout because _peekStart can move later than this callback (a slow decode), so
       a single up-front timeout could still finish early. Whichever is longer wins; the 12s
       watchdog above is untouched, so a stalled gate can never strand the child. */
    /* [H11-126] 3100 -> 4200. That number was measured against the OLD 3.03s peek; the HD clip
       takes 3.82s to bring him fully up, so the gate was letting go while he was still climbing. */
    const PEEK_MS = _upPeek ? 1200 : 4200;   // peeking_talk10s.webp is settled at the top by 3.3s, + a margin
    (function waitPeek(){
      if(tok !== _gateToken){ closeGate(); return; }
      const left = PEEK_MS - (Date.now() - _peekStart);
      if(left > 0){ setTimeout(waitPeek, Math.min(left, 120)); return; }
      finishGate();
    })();
  }); });
}

function completeSlide(success){
  const slide = CARD.slides[state.idx];
  GameBus.emit("slide_completed", {
    slide_id: slide.id, phase: slide.phase, success: !!success,
    attempts: state.attempts, latency_ms: Date.now()-state.slideStart,
    scaffold_level: state.scaffoldLevel, hint_used: state.hintUsed,
    nudge_used: state.nudgeUsed, audio_replays: state.audioReplays
  });
  if(state.idx >= CARD.slides.length - 1){
    // last slide is CELEBRATION; nothing more
    return;
  }
  // advance only AFTER the correct-answer confetti has landed (to the gate AND to the next slide alike).
  const fromIdx = state.idx, nextIdx = state.idx + 1;
  const next = CARD.slides[nextIdx];
  /* [28h] ONE GATE PER ROUND, NOT PER PHASE NAME.
     `independent` and `practice` are two names for round 3 (Yasir 2026-07-28), so a card that uses
     BOTH crossed two "different phases" and got the identical 'अब आपकी बारी!' gate TWICE, back to
     back — the alias fixed the missing gate and introduced a duplicate one. Deduping by ROUND instead
     of by phase string collapses that pair, and a phase with no round (mastery) still gets no gate,
     which is the ruling: three rounds, no round 4. */
  const nextRound = PHASE_ROUND[next && next.phase], curRound = PHASE_ROUND[slide.phase];
  /* [H11-146] A CARD MAY MOVE A ROUND'S GATE to a later slide of that round. Asked for: the
     "वाह! अब आपकी बारी।" transition right before the झूला game (P5), not at P2 where the practice
     round begins. Re-phasing P2-P4 as guided would have done it, and also handed them guided's
     hand and nudge rules; this moves only the screen. CARD.phase_gate_at = { practice: "P5" }. */
  const _gAt = CARD.phase_gate_at && next && CARD.phase_gate_at[next.phase];
  const _gateHere = _gAt ? (next.id === _gAt) : (nextRound && nextRound !== curRound);
  if(next && nextRound && _gateHere
     && next.type !== "CELEBRATION" && next.type !== "PHASE_TRANSITION"
     && PHASE_GATE_TITLE[next.phase] && !_gatedPhases.has(nextRound)){
    _gatedPhases.add(nextRound);
    afterConfetti(()=>{ if(state.idx === fromIdx) phaseBlurTransition(()=> mountSlide(nextIdx), next.phase); });
    return;
  }
  afterConfetti(()=>{ if(state.idx === fromIdx) mountSlide(nextIdx); });
}

/* ---------- 14. VALIDATOR (runtime self-check) ---------- */
function runValidator(){
  const missing = (CARD.signals_expected || []).filter(s => !SwiftPAL.firedSet.has(s));
  SwiftPAL.validatorReport.missing_signals = missing;
  SwiftPAL.validatorReport.passed = missing.length === 0;
  console.log("[validator]", SwiftPAL.validatorReport);
  try{ window.parent?.postMessage({type:"swiftpal:lesson_complete", signals: SwiftPAL.signals, validatorReport: SwiftPAL.validatorReport}, "*"); }catch(e){}
  // offline self-capture: write the final record to localStorage; optionally POST
  // it to a learning-record endpoint if one is configured AND the device is online.
  SwiftPAL.persist();
  if(TELEMETRY.endpoint && navigator.onLine){
    try{ fetch(TELEMETRY.endpoint, {method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(SwiftPAL.exportResults()), keepalive:true}).catch(()=>{}); }catch(e){}
  }
  // dev banner
  if(new URLSearchParams(location.search).has("dev")){
    const b = $("devBanner");
    if(missing.length === 0){ b.textContent = "✓ all expected signals fired"; b.className = "dev-banner show ok"; }
    else { b.textContent = "✗ missing signals: " + missing.join(", "); b.className = "dev-banner show"; }
  }
}

/* ---------- [engine JS] r4/#2 DATA-DRIVEN LANDING CONCEPT STRIP ---------- */
const SG_BALANCE_SVG =
  '<svg viewBox="0 0 124 112" xmlns="http://www.w3.org/2000/svg">' +
  '<line x1="62" y1="30" x2="62" y2="86" stroke="#8AA0C8" stroke-width="6" stroke-linecap="round"/>' +
  '<polygon points="62,60 44,100 80,100" fill="#8AA0C8"/>' +
  '<g transform="rotate(-13 62 34)">' +
  '<rect x="14" y="30" width="96" height="11" rx="5.5" fill="#4EA3F0"/>' +
  '<circle cx="22" cy="20" r="14" fill="#FBD24B" stroke="#D9A21A" stroke-width="2.5"/>' +
  '<circle cx="102" cy="20" r="14" fill="#98A2B3" stroke="#5B6577" stroke-width="2.5"/>' +
  '</g></svg>';
function conceptTileHTML(c){
  const lbl = c && c.label ? ` aria-label="${c.label}"` : "";   // a11y only; not shown (pre-reader → visual+VO)
  switch(c && c.type){
    case "discs": {
      const sizes = c.sizes || [34, 54, 76];
      return `<div class="sg-ex sg-ex-size" role="img"${lbl}>` +
        sizes.map(s => `<span class="sg-disc" style="width:${s}px;height:${s}px"></span>`).join("") + `</div>`;
    }
    case "bars": {
      const widths = c.widths || [42, 72, 102];
      return `<div class="sg-ex sg-ex-len" role="img"${lbl}>` +
        widths.map(w => `<span class="sg-bar" style="width:${w}px"></span>`).join("") + `</div>`;
    }
    case "balance":
      return `<div class="sg-ex sg-ex-wt" role="img"${lbl}>` + SG_BALANCE_SVG + `</div>`;
    case "image":
      return `<div class="sg-ex" role="img"${lbl}><img src="${bustAudio(c.src)}" alt="${c.label || ''}"></div>`;   /* [H11-189] same URL as the preload */
    default:
      return "";
  }
}

/* [H11-155] VIDEO: WEBM WHERE THE BROWSER CAN, MP4 WHERE IT CANNOT. Each poem clip ships as a
   960px VP9/Opus WebM next to the original MP4 - about half the bytes, drawn at the same size the
   frame shows (_tools/optimize_assets.py). The card keeps naming the MP4, so a browser that
   answers "" to VP9 (older iOS) gets exactly what it got before. */
const _canWebm = (function(){ try{ const v = document.createElement("video");
  return !!(v.canPlayType && v.canPlayType('video/webm; codecs="vp9, opus"')); }catch(e){ return false; } })();
function pickVideoSrc(mp4){ return (_canWebm && /\.mp4(\?|$)/.test(mp4)) ? mp4.replace(/\.mp4(\?|$)/, ".webm$1") : mp4; }

/* [H11-155] PRELOAD THE ART. [31q]'s comment promised this and the function had gone: every
   picture the lesson will show is fetched AND decoded during the landing, in the order the slides
   use them, so no image arrives late and no box opens at 0px. Three at a time, the first slides'
   art first. The Image objects are kept on window.__artWarm so the decoded copies are not dropped.
   Videos are warmed after the pictures, one at a time: over http a fetch() fills the browser's
   cache; from file:// they are already on disk, so they are left alone. Audio has its own warm
   (warmCardAudio, above). Nothing here can block the game - every step swallows its errors. */
function _cardArtList(){
  const imgExt = (CARD.assets && CARD.assets.img_ext) || "webp";
  const map = (CARD.assets && CARD.assets.image) || {};
  const seen = new Set(), out = [];
  const add = u => { if(u && !seen.has(u)){ seen.add(u); out.push(u); } };
  const idToUrl = id => map[id] || ("assets/Images/" + id + "." + imgExt);
  const walk = o => {
    if(!o) return;
    if(Array.isArray(o)){ o.forEach(walk); return; }
    if(typeof o !== "object") return;
    for(const k in o){
      const v = o[k];
      if(typeof v === "string" && /^(img|image_id|recall_image_id)$/.test(k) && /^[A-Za-z0-9_]+$/.test(v)) add(idToUrl(v));
      else if(typeof v === "string" && k === "src" && /^assets\/.+\.(webp|png|svg|gif)$/.test(v)) add(v);
      else walk(v);
    }
  };
  walk(CARD.landing_hero);
  add("assets/peeking_talk_up.webp");
  (CARD.slides || []).forEach(sl => {
    walk(sl.data);
    if(sl.type === "WHEEL_PAIRS") ["wheel_bg","wheel_frame","wheel_disc","wheel_bucket","wheel_bucket_front","wheel_plate","wheel_star"]
      .forEach(n => add("assets/Images/" + n + "." + imgExt));
  });
  ["assets/UI/sw_head_hint_anim.webp","assets/UI/sw_head_celebrate_anim.webp","assets/UI/sw_head_tryagain_anim.webp",
   "assets/UI/sw_lg_hint_anim.webp","assets/UI/hint.webp","assets/UI/hint_active.webp","assets/UI/nudge_hand_new.svg",
   "assets/Images/last_swifty_still.webp","assets/Images/last_swifty_end.webp","assets/UI/end_screen.webp"].forEach(add);
  return out;
}
/* [H11-216] every file a slide uses, in the order it needs them: pictures, its clip, its voice lines */
function _slideAssetUrls(i){
  const s = CARD.slides && CARD.slides[i]; if(!s) return [];
  const imgExt = (CARD.assets && CARD.assets.img_ext) || "webp", map = (CARD.assets && CARD.assets.image) || {};
  const out = [], add = u => { if(u && out.indexOf(u) < 0) out.push(u); };
  const walk = o => {
    if(!o) return;
    if(Array.isArray(o)){ o.forEach(walk); return; }
    if(typeof o !== "object") return;
    for(const k in o){ const v = o[k];
      if(typeof v === "string" && /^(img|image_id|recall_image_id)$/.test(k) && /^[A-Za-z0-9_]+$/.test(v)) add(map[v] || ("assets/Images/" + v + "." + imgExt));
      else if(typeof v === "string" && k === "video_id") add(pickVideoSrc((CARD.assets && CARD.assets.video && CARD.assets.video[v]) || ("assets/video/" + v + ".webm")));
      else walk(v); }
  };
  walk(s.data);
  if(s.type === "WHEEL_PAIRS") ["wheel_bg","wheel_frame","wheel_disc","wheel_bucket","wheel_bucket_front","wheel_plate","wheel_star"]
    .forEach(n => add("assets/Images/" + n + "." + imgExt));
  const ids = new Set(); _collectAudioIds(s, ids); ids.forEach(id => add(audioDir(id) + id + "." + AUDIO_EXT));
  return out;
}
function warmCardArt(){
  try{
    const list = _cardArtList().map(u => (typeof bustAudio === "function") ? bustAudio(u) : u);   /* blob: once loaded */
    window.__artWarm = [];
    let next = 0;
    const one = ()=> new Promise(res => {
      if(next >= list.length){ res(false); return; }
      const im = new Image(); im.decoding = "async"; window.__artWarm.push(im);
      const done = ()=> res(true);
      im.onload = ()=>{ (im.decode ? im.decode().catch(()=>{}) : Promise.resolve()).then(done); };
      im.onerror = done;
      im.src = list[next++];
    });
    const worker = async ()=>{ while(await one()){} };
    /* [H11-187] the videos are the preloader's now - it already holds them */
    return Promise.all([worker(), worker(), worker()]);
  }catch(e){ return Promise.resolve(); }
}

/* ---------- 15. BOOT ---------- */
function _collectAudioIds(o,out){
  if(!o)return;
  if(Array.isArray(o)){o.forEach(v=>_collectAudioIds(v,out));return;}
  if(typeof o==="object"){for(const k in o)_collectAudioIds(o[k],out);return;}
  if(typeof o==="string"&&/^(vo2?|phon|sfx)_[A-Za-z0-9_]+$/.test(o))out.add(o);
}
function _warmAudioSources(srcs,concurrency){
  let next=0;
  const worker=async()=>{while(next<srcs.length){const src=srcs[next++];try{await _loadVoiceBuffer(src);}catch(e){}}};
  const count=Math.max(1,Math.min(concurrency||4,srcs.length||1));
  return Promise.all(Array.from({length:count},worker)).then(()=>{});
}
/* [31x] Fetch AND DECODE every clip the card references, during the landing screen. Landing/gate/slide-1
   clips go first so a fast tap on शुरू करें cannot beat the warm. IDs come from audio_text keys (all
   verified on disk by verify_bundle) plus any vo_/phon_/sfx_ id in the slides — a 404 here surfaces in
   render_check, which is wanted: it means the card references a missing clip. */
function warmCardAudio(){
  try{
    const allIds=new Set(Object.keys((CARD.assets||{}).audio_text||{}));
    _collectAudioIds(CARD.slides,allIds);
    const initialIds=new Set();
    if(CARD.landing_audio)initialIds.add(CARD.landing_audio);
    if(typeof PHASE_GATE_VO!=="undefined"&&PHASE_GATE_VO.tutorial)initialIds.add(PHASE_GATE_VO.tutorial);
    if(CARD.slides&&CARD.slides[0])_collectAudioIds(CARD.slides[0],initialIds);
    initialIds.forEach(id=>allIds.add(id));
    const toSrc=id=>audioDir(id)+id+"."+AUDIO_EXT;   /* [H11-186] sfx_ ids live in assets/SFX - "assets/VO/sfx_celebrate" was a 404 on every load */
    const first=[...initialIds].map(toSrc);
    const rest=[...allIds].filter(id=>!initialIds.has(id)).map(toSrc);
    window.__voWarm=_voiceBuffers;
    _initialAudioWarmPromise=_warmAudioSources(first,4);
    /* [H11-187] the rest DECODE once the bar is full - from the preloader's copies, so the warm-up
       never competes with it for the network or jumps its smallest-first order */
    _audioWarmPromise=_initialAudioWarmPromise.then(()=>AssetLoader.ready).then(()=>_warmAudioSources(rest,6));
    return _audioWarmPromise;
  }catch(e){_initialAudioWarmPromise=Promise.resolve();_audioWarmPromise=Promise.resolve();return _audioWarmPromise;}
}
/* [31q] Fetch AND DECODE every card image during the landing. Art used to arrive ~1s after the text on
   the tab, and an undecoded image in an unreserved box is 0px tall, which is what slid a word strip down
   onto an already-placed hand nudge. EXACT art keys only, plus a value guard: a first cut matched any key
   ending `_pic`, swept up AUDIO ids and requested `assets/Images/assets/VO/vo_corr_pic.ogg.png` — 3x404
   that verify_bundle read as 0 FAIL and only render_check caught. A real art id is a bare token: never a
   path, an extension, or Devanagari. */
/* [H11-76] THE GAME DOES NOT ZOOM. The viewport meta above asks for that already, and on
   Android and desktop it is obeyed - but iOS Safari has deliberately IGNORED user-scalable=no
   since iOS 10, which is the tablet this is most likely to be played on. So the gestures are
   refused here as well, where no browser gets a say.
   What each line is for, because they are four different ways in:
     gesturestart/change/end  Safari's pinch. The only thing that actually stops it on an iPad.
     wheel + ctrlKey          ctrl-scroll and trackpad pinch on desktop.
     keydown ctrl/cmd + - 0   the keyboard zoom, including the numeric-keypad keys.
     two-finger touchmove     a last resort for engines that report neither of the above; a
                              one-finger move is left alone, or every drag in the game would die.
   passive:false on all of them, or preventDefault is ignored on touch and wheel listeners.
   This is a fixed-layout lesson that scales ITSELF to the screen, so browser zoom only ever
   pushes it off-centre - there is nothing to reveal by magnifying it. */
(function lockZoom(){
  const stop = e => { e.preventDefault(); };
  ["gesturestart","gesturechange","gestureend"].forEach(t =>
    document.addEventListener(t, stop, { passive:false }));
  document.addEventListener("wheel", e => { if(e.ctrlKey) e.preventDefault(); }, { passive:false });
  document.addEventListener("keydown", e => {
    if(!(e.ctrlKey || e.metaKey)) return;
    if(["+","-","=","0"].indexOf(e.key) >= 0 ||
       ["NumpadAdd","NumpadSubtract","Numpad0"].indexOf(e.code) >= 0) e.preventDefault();
  }, { passive:false });
  document.addEventListener("touchmove", e => {
    if(e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive:false });
})();
function boot(){
  // god-mode visual theme (opt-in via CARD.theme) — warms the whole stage; scoped CSS under .thm-*
  if(CARD.theme) $("stage").classList.add("thm-" + CARD.theme);
  try{ const _ord = ["assets/peeking_talk_up.webp"];                // [H11-216] first-use order: the gate, then slide by slide
       (CARD.slides || []).forEach((_, i) => _slideAssetUrls(i).forEach(u => _ord.push(u)));
       AssetLoader.prioritize(_ord); }catch(e){}
  /* [H11-216] the greeting and the peacock's call come first, alone: on a tablet they were queued behind the
     1.5MB gate clip and the greeting began ~2.5s late. The background waits for them (5s at most). */
  { const _first = [((CARD.assets && CARD.assets.audio && CARD.assets.audio["vo_landing"]) || ("assets/Audio/vo_landing." + AUDIO_EXT))].map(u => AssetLoader.blob(u));
    Promise.race([Promise.all(_first), new Promise(r => setTimeout(r, 5000))]).then(() => AssetLoader.start()); }
  // [H11-187] every file, behind the landing - [H11-216] in the order the game uses them
  warmCardAudio();      // [31x] DECODE every clip: the landing's own now, the rest once the bar is full
  AssetLoader.ready.then(warmCardArt);   // [H11-155] and decode every picture - from local copies
  // banner title = skill name only (strip "(भाग…)" and the ": letters" list)
  $("sgTitle").textContent = (CARD.title.hi || "").split(/[:：(]/)[0].trim();
  // 16j: landing subtitle line (r4 dropped it) + fix the stale document <title> (was hardcoded to
  // the ordering game on every FLN build). Both come from the card now.
  { const _sub = $("sgSub"); if(_sub) _sub.textContent = (CARD.subtitle_hi || ""); }
  try{ document.title = "SwiftPAL · " + (CARD.skill_code || "") + " · " + (CARD.title.hi || "").split(/[:：(]/)[0].trim(); }catch(e){}
  // VISUAL-FIRST landing hero: SHOW the concept (shapes row / a finger-hand / an image), not just the title text
  (function(){ const hero = CARD.landing_hero, el = $("sgHero"); if(!hero || !el) return;
    if(hero.kind === "concept_strip"){
      // r4/#2: each cell is a .sg-acell (keeps the staggered fingerPop pop-in) wrapping a visual example.
      el.innerHTML = (hero.cells || []).map(c => `<div class="sg-acell">${conceptTileHTML(c)}</div>`).join("");
      return;   // keep the landing's tuned title size + spacing (this strip is sized for the full card)
    }
    if(hero.kind === "shapes" && typeof shapeSVG === "function")
      el.innerHTML = (hero.shapes||[]).map(s=> shapeSVG(s.shape, {color:s.color, size:104, rotate:s.rotate||0})).join("");
    else if(hero.kind === "count"){
      // counting game: preview the WHOLE 1..n sequence — a row of hands (1,2,3…), each with its Arabic numeral
      const hi = Math.min(Math.max(parseInt(hero.n,10)||3, 1), 5);   // clamp to available hand art (1..5)
      let cells = "";
      for(let i=1;i<=hi;i++){
        cells += `<div class="sg-hand-cell">${fingerCount(i, "sg-hand")}<span class="sg-hand-num">${devNumeral(i)}</span></div>`;
      }
      el.innerHTML = cells;
    }
    else if(hero.kind === "image") el.innerHTML = `<img src="${hero.src}" alt="">`;
    if(el.innerHTML){ el.classList.add("show","hint-glow"); $("sgTitle").classList.add("compact");
      const c = el.closest && el.closest(".sg-content"); if(c){ c.classList.add("has-hero");
        // SME (S01 review deck): landing reads TITLE first, image BELOW it, image smaller.
        if(hero.title_first) c.classList.add("title-first"); } }
  })();

  // [20a landing] shape-recognition games ship NO landing_hero -> the card fell back to a plain WORD
  // subtitle (unreadable to pre-readers). Derive icon tiles from shape_set instead (labels from the
  // card's own bins; colours are neutral brand tones, never red/green per ruling B5). Additive: only
  // fires when sgHero is still empty AND the card is a shape game.
  (function(){ const el = $("sgHero");
    if(!el || el.innerHTML || typeof shapeSVG !== "function" || !Array.isArray(CARD.shape_set) || !CARD.shape_set.length) return;
    const lab = {}; (CARD.slides||[]).forEach(s => ((s.data && s.data.bins) || []).forEach(b => { if(b.shape && b.label) lab[b.shape] = b.label; }));
    const DEF = { circle:"गोल", square:"चौकोर", triangle:"तिकोना", rectangle:"आयत" };
    const COL = { circle:"#386AF6", square:"#F0A020", triangle:"#9B7BE8", rectangle:"#12A0B8" };
    el.innerHTML = CARD.shape_set.map(sh =>
      `<div class="sg-acell">${shapeSVG(sh, {color: COL[sh] || "#386AF6", size:96})}<span class="sg-alabel">${lab[sh] || DEF[sh] || ""}</span></div>`).join("");
    el.classList.add("show","hint-glow"); $("sgTitle").classList.add("compact");
    const c = el.closest && el.closest(".sg-content"); if(c) c.classList.add("has-hero");   // hides the word subtitle
  })();

  // ----- landing-screen welcome VO (lead review) -----
  // A warm greeting on the title screen. Autoplay is often blocked before a gesture, so we also
  // (a) expose a pulsing 🔊 "listen" button, and (b) fire it on the first pointer-down. The whole
  // greeting lives HERE now (not on slide 0), which also kills the old overlap glitch where the
  // landing VO and slide-0 VO could talk over each other.
  const landSrc = (CARD.assets && CARD.assets.audio && CARD.assets.audio["vo_landing"]) || ("assets/Audio/vo_landing." + AUDIO_EXT);
  /* [2026-09-04 no-cut-landing] `_landingSpeaking`/`_tutorialPending` let an eager tap on शुरू करें
     wait for THIS clip's own onEnd instead of getting silenced mid-sentence — see sgBtn.onclick. */
  let _landingSpeaking = false, _tutorialPending = false;
  /* [H11-106] SWIFTY SPEAKS FIRST AND THE BUTTON WAITS FOR HER, as the reference build does.
     The greeting already started on its own here - the boot loader calls playLanding() when it
     dismisses, so nothing was ever tapped to make her talk. What was missing is that the play
     button sat there GOLD and pressable the whole time, which invites the child to skip her.
     Grey while she speaks, gold the instant she stops.
     THE WATCHDOG IS NOT OPTIONAL. This button is the only way off the landing, so anything that
     can leave it grey strands the child on the first screen of the lesson. play() does fire its
     callback on the error, no-src and autoplay-blocked paths, so the release is near-certain -
     the timer is there for the case that is not covered, a clip that decodes and then never
     ends. */
  const LAND_RELEASE_MS = 9000;
  let _landReleaseT = 0;
  let _landBlocked = false, _landGestured = false, _landRetried = false;   /* [H11-178] see _landingUnlock */
  /* NOT `disabled`, WHICH WAS THE WHOLE BUG. A disabled <button> dispatches no pointer events
     at all in Chrome, and nothing bubbles out of it - so the child tapping the waiting button
     produced NO gesture, the browser's audio stayed locked, and the greeting never started. It
     is pointer-events:none instead (in the .sg-waiting rule): the tap falls through to the gate
     behind it, which IS the gesture that unlocks audio, and the window listener below then
     starts the greeting. aria-disabled keeps the meaning for assistive tech. */
  let _landVoDone = false;
  const setStartBtnReady = (on)=>{ const b = $("sgBtn"); if(!b) return;
    _landVoDone = !!on;
    /* [H11-187] PLAY ALSO WAITS FOR THE LOADING BAR: it appears only when the greeting is over AND
       every file is in. The speaker below follows the voice alone. */
    const show = on;   /* [H11-202] no longer waits for the bar - see .sg-load below */
    if(show && b.classList.contains("sg-waiting")) b.classList.add("sg-appear");   /* [H11-182] pops in */
    if(on || _landingSpeaking){ b.classList.remove("sg-blocked"); const v0 = $("sgVo"); if(v0) v0.classList.remove("sg-blocked"); }
    b.classList.toggle("sg-waiting", !show); b.setAttribute("aria-disabled", String(!show));
    /* [H11-173] the speaker goes with it - checklist: "the speaker button remains disabled when
       the VO is spoken; once the VO is complete it is enabled again" */
    const v = $("sgVo"); if(v){ v.classList.toggle("sg-vo-off", !on); v.setAttribute("aria-disabled", String(!on)); } };
  /* [H11-148] THE GREETING WAITS FOR THE PLAY BUTTON. Asked for: the button is live and pulsing
     from the first frame, the child presses it, THEN Swifty speaks, and when she is done the
     transition screen follows. This reverses [H11-106] (speak first, button waits) for this card
     only - CARD.landing_vo_on_tap. It also removes the autoplay problem that [H11-106] spent most
     of its comments on: the greeting now starts inside a tap, which is always allowed to sound. */
  const _voOnTap = CARD.landing_vo_on_tap === true;
  let _landStarted = false;
  const playLanding = ()=>{ if(_voOnTap && !_landStarted){ setStartBtnReady(true); return; }
    if(!$("startGate").classList.contains("hidden")){
    _landingSpeaking = true;
    if(!_voOnTap){ setStartBtnReady(false); if(typeof replayLandingSwifty === "function") replayLandingSwifty(); }   /* [H11-173] he waves as he speaks */   /* [H11-148] pressed play: it stays gold, it was the child's go */
    /* THE WATCHDOG IS ARMED BY THE FIRST TOUCH, NOT BY THE PAGE OPENING. Armed at load it did
       the exact harm it was meant to prevent: on a browser that refuses autoplay the greeting
       never started, the timer fired anyway nine seconds later, and the button went gold having
       said nothing - so the first tap started the lesson and Swifty was skipped entirely. That
       is what "no voice unless I press play" actually was.
       Now: no gesture, no release. The button simply waits, wearing the pack's waiting art, and
       because it is pointer-events:none a tap on it falls through and IS the gesture that starts
       her. The timer is armed in _landingUnlock below, where a gesture has happened and a silent
       clip really would be a dead end. */
    clearTimeout(_landReleaseT);
    /* [H11-48] The deck gives the landing ONE line and nothing else, so nothing else plays
       here. The peacock calls that used to follow this clip are gone. */
    const _t0 = Date.now();
    /* [H11-179] THE SILENT REFUSAL. On the normal Web Audio path a browser that will not make sound
       yet does not say so: the AudioContext stays "suspended", start() is accepted, nothing is heard
       and the clip never ends. The quick-return check below never sees that, so the button stayed
       hidden with nothing on screen to press (reported with a screenshot). Watch the context for a
       few seconds instead: a clip queued on a context that is not running is a refusal too. */
    clearInterval(window.__landSuspT); let _suspN = 0;
    window.__landSuspT = setInterval(()=>{
      if(++_suspN > 16 || !_landingSpeaking){ clearInterval(window.__landSuspT); return; }
      if(currentVoiceSource && _voiceAC && _voiceAC.state !== "running"){
        clearInterval(window.__landSuspT);
        ["sgBtn","sgVo"].forEach(id=>{ const b = $(id); if(b) b.classList.add("sg-blocked"); });
        _landBlocked = true;
        if(_landGestured && !_landRetried){ _landRetried = true; _landBlocked = false; playLanding(); }
      }
    }, 250);
    play(landSrc, ()=>{ _landingSpeaking = false;
      /* A BLOCKED AUTOPLAY COMES BACK AT ONCE, and that return is not the greeting ending - it
         is the browser refusing to make sound before anyone has touched the page. Releasing the
         button on it was the bug the child actually saw: the button went gold immediately, their
         first tap on it both unlocked the audio AND started the lesson, so the greeting began
         and was cut by the first slide's own voice a moment later. Under half a second is no
         clip, so treat it as a refusal: stay waiting and let the unlock listener replay it. The
         9s watchdog is what stops that decision ever becoming a trap. */
      if(Date.now() - _t0 < 400){ ["sgBtn","sgVo"].forEach(id=>{ const b = $(id); if(b) b.classList.add("sg-blocked"); });   /* [H11-178] something to tap */
        _landBlocked = true;
        /* refused AFTER a touch already came (the touch beat the refusal back): that touch is spent,
           so try once more now rather than wait for another one */
        if(_landGestured && !_landRetried){ _landRetried = true; _landBlocked = false; setTimeout(playLanding, 0); }
        return; }
      /* [H11-120] THE CALL, AND ONLY THE CALL. The names were being spoken here for a moment -
         and they were the wrong thing, because the greeting ALREADY ends on "जैसे- मोर- मोरनी".
         Saying them again straight afterwards is the same two words twice in four seconds. What
         belongs after the line is the bird itself, the way a dog barks after you say "dog".
         So: greeting, then the peacock, then the button opens. The button is still released only
         when the whole chain is done, and the chain carries its own escape hatch, because play()'s
         end callback is not guaranteed and a clip that never ends must not hold the landing shut. */
      const _done = ()=>{ clearTimeout(_landReleaseT); setStartBtnReady(true);
        if(_tutorialPending){ _tutorialPending = false; enterTutorial(); } };
      let _namesOver = false;
      const _finishNames = ()=>{ if(_namesOver) return; _namesOver = true; _done(); };
      setTimeout(_finishNames, 4000);                       // the escape hatch for the call
      /* [H11-118] AND THEN THE PEACOCK ITSELF. Asked for: after the voice finishes, the bird's
         own call - the way a dog barks after you say "dog".
         THE FILE DOES NOT EXIST YET. There is no peacock cry anywhere in this project (not in
         assets/SFX, not in assets/VO, not in _masters), and it is a recording, not something
         that can be written. The chain is wired for it anyway, because play() treats a missing
         clip as a silent beat: until the file is dropped at the path below this line simply
         costs nothing and nothing waits on it. Drop a peacock call at
             assets/SFX/sfx_mor_call.ogg
         and it starts playing with no further change. */
      _finishNames();   /* [HI02H02] this lesson has no animal call after the greeting */
    });
  } };
  const sgVo = $("sgVo"); if(sgVo) sgVo.onclick = (e)=>{ e.stopPropagation(); playLanding(); };
  // ---- [engine JS] r4/P2 boot loader: loader.gif until assets warm, then it dismisses ITSELF into
  // the landing (NO tap gate). DUAL auto-dismiss (window 'load' OR a 2.5s watchdog — never strand the
  // child), deduped by .done. The same handler adds body.loaded (unblocks the concept-strip stagger)
  // and fires the landing VO. play() absorbs an autoplay block; the pulsing 🔊 chip is the fallback. ----
  (function(){
    const bl = $("bootLoader"); if(!bl){ document.body.classList.add("loaded"); playLanding(); return; }
    // [16l] BRAND SPLASH MIN-HOLD: locally, window.load fires in ~100ms and the CG loader was
    // removed before it ever painted ("no CG logo at the start"). The loader now holds for a
    // minimum beat so the ConveGenius mark is always seen; the watchdog still caps the worst case.
    const T0 = performance.now(), MIN_MS = 1600;
    let fired = false;   // .done is the CSS fade trigger, so it must NOT double as the dedup flag
    const ready = ()=>{
      if(fired) return;   // load event + watchdog both land here → dedup
      fired = true;
      setTimeout(()=>{
        bl.classList.add("done");                  // NOW start the fade (after the brand beat)
        document.body.classList.add("loaded");     // starts the .sg-acell pop chain
        playLanding();
        setTimeout(()=> bl.remove(), 450);
      }, Math.max(0, MIN_MS - (performance.now() - T0)));
    };
    if(document.readyState === "complete") ready();
    else window.addEventListener("load", ready);
    setTimeout(ready, 2500);   // watchdog: never strand the child on the loader
  })();
  // landing VO best-effort on first interaction too (some browsers block autoplay pre-gesture)
  /* [H11-111] EVERY KIND OF FIRST CONTACT COUNTS, not just a pointer. A browser will not make
     sound until the page has been touched once, and "touched" for it means any of these - so all
     of them are listened for, and whichever arrives first both unlocks the audio and starts the
     greeting. A stylus, a keyboard, a tap on a tablet and a click each work. They are torn down
     together, so the greeting can never start twice. */
  /* [H11-178] THE EVENTS THAT CARRY PERMISSION, not the first ones to arrive. A browser grants sound on
     mousedown, keydown, pointerup/touchend - NOT on touchstart or a finger's pointerdown. On a
     tablet those two came first, so the greeting was retried while sound was still refused and the
     only chance was spent. Window CAPTURE, because the landing card's own capture listener stops
     presses inside the card from travelling any further. */
  const _LAND_EVTS = ["pointerup","touchend","mousedown","keydown","click"];
  _LAND_EVTS.forEach(function(evt){
    window.addEventListener(evt, _landingUnlock, { once:true, passive:true, capture:true }); });
  function _landingUnlock(){
    _LAND_EVTS.forEach(function(evt){
      window.removeEventListener(evt, _landingUnlock, true); });
    /* [30m] THE LANDING GREETING MUST NOT RESTART ON THE FIRST TAP (Yasir: "the landing VO does not
       seem fine"). This listener exists ONLY as an autoplay-policy fallback: if the browser refused
       the greeting on load, the first real user gesture is our chance to start it. But it fired
       UNCONDITIONALLY, so when autoplay HAD worked, the child's first tap anywhere restarted the 9s
       greeting from the top — and on a tap that happened to be शुरू करें, it bled into the tutorial.
       Guard on whether audio is genuinely audible right now, NOT on "did we call play()": on a blocked
       autoplay we DID call it, so a call-flag would kill the very fallback this line is for.
       currentAudio is set inside play(); paused/ended/currentTime tell us if sound is actually moving.
       The सुनो chip's own playLanding() is untouched — an explicit replay must always replay. */
    const _a = (typeof currentAudio !== "undefined") ? currentAudio : null;
    const _audible = _a && !_a.paused && !_a.ended && _a.currentTime > 0;
    if(_voOnTap) return;   /* [H11-148] only the play button starts her now */
    /* [H11-178] REPLAY ONLY A GREETING THE BROWSER REFUSED. _audible above reads currentAudio, which
       only the HTML-element fallback sets - on the normal Web Audio path it is always null, so this
       read every greeting as silent: a child who first touched the screen on the Play button (after
       hearing the whole greeting) got it a second time instead of the lesson. Now it replays only
       when the greeting actually came back refused (_landBlocked). */
    _landGestured = true; void _audible;
    if(_landBlocked){ _landBlocked = false; playLanding(); }
    /* a gesture has now happened, so silence from here is a real fault rather than the browser
       being careful - this is the point at which leaving the button waiting would strand a
       child, and the only point at which releasing it can skip nothing. */
    clearTimeout(_landReleaseT);
    _landReleaseT = setTimeout(()=> setStartBtnReady(true), LAND_RELEASE_MS);
  }

  /* [2026-09-04 no-cut-landing] SME: "dialogue complete hone se pehle next audio play ho raha hai" —
     measured live (AudioBufferSourceNode timing): vo_landing (5.80s) started, then vo_pt_tutorial
     (4.72s) started 4ms later and stopAudio() killed vo_landing 66ms in. Root cause was this handler
     unconditionally calling stopAudio() the instant शुरू करें was tapped, even mid-greeting.
     Every OTHER tap site in this engine already guards on isPlaying instead of stomping it (the
     audio-chip replay, the हिंट chip) — this was the one exception. Fix: an eager tap while
     vo_landing is still sounding no longer cuts it; it just marks _tutorialPending and returns, and
     vo_landing's OWN onEnd (above) continues into the tutorial gate — event-driven, not a timer, so
     the greeting always finishes exactly once, never twice, never cut. */
  function enterTutorial(){
    stopAudio();          // safe here: vo_landing is confirmed not sounding (either it never started
                           // playing, or its own onEnd just fired) — this is not the cut anymore.
    _ac();                // unlock/resume WebAudio on the start gesture so the first clip never clips
    // [engine JS] r4/P1: peek gate into the tutorial. The landing stays visible-and-BLURRED behind the
    // peeking Swiftie + "चलिए शुरू करें"; it hides once the tutorial mounts (in the callback).
    _gatedPhases.add("tutorial");
    phaseBlurTransition(()=>{
      $("startGate").classList.add("hidden");
      document.body.classList.remove("is-start");   // blue bg only on the title screen
      mountSlide(0);
    }, "tutorial");
  }
  /* [KIT 2] give the hand the ripple + spark layers the preview's hand has: without them
     the press keyframe runs with nothing radiating from it - half the effect, silently. */
  try{ (function(){
    var h = document.getElementById("nudgeHand");
    if(!h || h.querySelector(".nh-tapfx")) return;
    var fx = document.createElement("span"); fx.className = "nh-tapfx";
    ["fx-ro","fx-ri","fx-sp"].forEach(function(c){
      var i = document.createElement("i"); i.className = c; fx.appendChild(i); });
    h.insertBefore(fx, h.firstChild);
  })(); }catch(e){}
  /* [H11-187] the bar fills as bytes arrive; at 100% it fades and, if the greeting is already over,
     the Play button pops in where it stood */
  (function(){
    const bar = $("sgLoad"); if(!bar) return;
    const fill = bar.querySelector(".sg-load-fill"), txt = bar.querySelector(".sg-load-txt");
    AssetLoader.onProgress(p => { fill.style.width = p + "%"; txt.textContent = p + "%";
      bar.dataset.pct = p; bar.setAttribute("aria-valuenow", p); });
    AssetLoader.ready.then(() => { bar.classList.add("done");
      setTimeout(() => { bar.hidden = true; if(_landVoDone) setStartBtnReady(true); }, 320); });
  })();
  $("sgBtn").onclick = ()=>{
    /* [33a] activity_launched — the ONE verb of the seven with no equivalent anywhere in this
       engine. Emitted on the TAP, not on page load: a game opened and abandoned reports nothing,
       which is what the spec asks for. One-shot, because this handler has no `_starting` re-entry
       guard of its own — do not assume it does; a double-tap would otherwise double-report. */
    if(!window.__xapiLaunched){ window.__xapiLaunched = true;
      GameBus.emit("activity_launched", { skill_code: CARD.skill_code }); }

    /* [H11-150] the supplied SwiftPAL play-button sound (sfx_play); the tap tone is the fallback */
    if(!_sfxFile("sfx_play")) sfxTap(); bgmStart();   /* [H11-133] the first gesture is what lets the music start */
    /* [H11-148] press play -> the greeting -> the transition. A second press while she speaks
       does nothing; the greeting's own end (with the peacock after it) opens the gate, and a
       watchdog does it if a clip never reports ending, so the landing can never hold the child. */
    if(_voOnTap){
      if(_landStarted) return;
      _landStarted = true; _tutorialPending = true;
      $("sgBtn").classList.add("sg-pressed");
      replayLandingSwifty();   /* [H11-160] he waves as she starts to speak */
      playLanding();
      setTimeout(()=>{ if(_tutorialPending && !$("startGate").classList.contains("hidden")){ _tutorialPending = false; _landingSpeaking = false; enterTutorial(); } }, 16000);
      return;
    }
    if(_landingSpeaking){ _tutorialPending = true; return; }   // let it finish — see [2026-09-04 no-cut-landing]
    enterTutorial();
  };
  // tapping आगे clears any pending nav-nudge
  /* [H11-150] and the supplied next-button sound on आगे (sfx_next) */
  $("navBtn").addEventListener("click", ()=>{ clearTimeout(state.navNudgeTimer); stopNudge(); if(!_sfxFile("sfx_next")) sfxTap(); });
  // [engine JS] r4 dev jump: ?slide=N skips the loader+gate and mounts slide N directly (QA/capture only)
  (function(){
    const j = parseInt(new URLSearchParams(location.search).get("slide"), 10);
    if(isNaN(j)) return;
    const bl = $("bootLoader"); if(bl) bl.remove();
    document.body.classList.add("loaded");
    $("startGate").classList.add("hidden");
    document.body.classList.remove("is-start");
    mountSlide(Math.max(0, Math.min(j, CARD.slides.length - 1)));
  })();
  // when the web font finishes loading, re-centre glyphs (metrics change vs fallback)
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(()=>{ centerAllGlyphs(); }); }
  // dev banner if ?dev=1 — show empty initially
  if(new URLSearchParams(location.search).has("dev") || new URLSearchParams(location.search).has("nav")){
    if($("devBanner")){ $("devBanner").textContent = "engine ready · slides=" + CARD.slides.length; $("devBanner").className = "dev-banner show"; }
    buildDevNav();
  }
}

/* [engine JS] DEV NAV — a review/QA slide navigator. Shows ONLY with ?dev=1 or ?nav=1 (children never
   see it). Jump to any slide by dropdown, step ◀▶, first/last, or back to the landing. Uses the
   engine's own mountSlide + state.idx; a light poll keeps the label synced when the game self-advances. */
function buildDevNav(){
  if(document.getElementById("devNav")) return;
  const bar = document.createElement("div"); bar.id = "devNav"; bar.className = "dev-nav";
  const mk = (txt, title)=>{ const b = document.createElement("button"); b.className = "dev-nav-btn"; b.textContent = txt; if(title) b.title = title; return b; };
  const land = mk("⌂", "landing"), first = mk("⏮", "first"), prev = mk("◀", "prev"), next = mk("▶", "next"), last = mk("⏭", "last");
  const sel = document.createElement("select"); sel.className = "dev-nav-sel"; sel.title = "jump to slide";
  CARD.slides.forEach((s, i)=>{ const o = document.createElement("option"); o.value = i; o.textContent = (i+1) + ". " + s.id + " · " + s.type; sel.appendChild(o); });
  const lbl = document.createElement("span"); lbl.className = "dev-nav-lbl";
  const cur = ()=> (state && typeof state.idx === "number") ? state.idx : 0;
  const leaveStart = ()=>{ const sg = $("startGate"); if(sg) sg.classList.add("hidden"); document.body.classList.remove("is-start"); document.body.classList.add("loaded"); const bl = $("bootLoader"); if(bl) bl.remove(); };
  const sync = ()=>{ const i = cur(); const s = CARD.slides[i]; if(document.activeElement !== sel) sel.value = i;
    lbl.textContent = (i+1) + "/" + CARD.slides.length + (s ? " · " + s.id : ""); };
  const go = (i)=>{ i = Math.max(0, Math.min(i, CARD.slides.length - 1)); leaveStart(); mountSlide(i); sync(); };
  land.onclick = ()=>{ const sg = $("startGate"); if(sg){ sg.classList.remove("hidden"); document.body.classList.add("is-start"); } };
  first.onclick = ()=> go(0); prev.onclick = ()=> go(cur() - 1); next.onclick = ()=> go(cur() + 1); last.onclick = ()=> go(CARD.slides.length - 1);
  sel.onchange = ()=> go(parseInt(sel.value, 10));
  bar.append(land, first, prev, sel, lbl, next, last);
  document.body.appendChild(bar);
  setInterval(sync, 300); sync();
}
boot();

/* ===== [HI02H02] the HI02H04_L02_S01 celebration (its block L02-CEL-MTG204, copied; the clip clock adapted) =====
   The finale = the reference's: the sunburst, the gold star burst, Swiftee JUMPS (the शाबाश sheet) and lands, THEN speaks the line
   lip-synced on the talk sheet (card.end_anim.bits, from vo2_celebrate), then idles; the arrow waits greyed until the line ends. */
/* ===== L02-CEL-MTG204 =====
   [L02-CEL-MTG204] (2026-10-10, user request) the celebration page's Swiftie and line = the reference MTG2A04_L01_S01's
   (github.com/CodeWithPiyush0/MTG204_L01_S01, its page JS "CELEBRATION SWIFTIE, round 2l-2r"), see build.py. Its code, adapted to this
   engine: play() is this engine's <audio> player and there is no _voiceClock (the typeof check falls back to isPlaying's first true as
   the clip's clock); audioFor / isPlaying / state.ownsAudio / SlideModules.CELEBRATION are the same here. The timeline: she jumps
   (the शाबाश sheet, frames 0-29 at 45 ms) and lands (30-35) in silence but for the celebration sfx the module plays at mount, THEN the
   line starts and the whole of it lip-syncs on the talk sheet (card.end_anim.bits: one char per 25 ms, 1 = mouth open), then the idle
   sheet's mouth-shut frames loop. The arrow waits greyed (cel-wait) until the line has ended, then pulses (cel-ready). */
(function(){
  /* round 2p (user): "once the VO finishes, the button is enabled and pulses" — on the celebration too.
     The engine shows its arrow at once; here it waits (dim, not pressable) until the celebration
     line has ended, then it pulses like the in-lesson arrow (no glow, no border change). */
  function celArrowAfterVO(){
    const eb = document.getElementById("endBtn"); if(!eb) return;
    eb.classList.remove("hint-glow"); eb.classList.add("cel-wait");
    const t0 = performance.now(); let heard = false;
    (function tick(){
      if(!eb.isConnected) return;
      if(isPlaying) heard = true;
      if((heard && !isPlaying) || performance.now() - t0 > 15000){
        eb.classList.remove("cel-wait"); eb.classList.add("cel-ready"); return; }
      requestAnimationFrame(tick);
    })();
  }
  setTimeout(()=> (function wrapCel(tries){
    const C = (typeof SlideModules !== "undefined") && SlideModules.CELEBRATION;
    if(!C || !C.mount){ if(tries < 200) setTimeout(()=> wrapCel(tries + 1), 25); return; }
    if(C.__celWrapped) return; C.__celWrapped = true;
    const _mount = C.mount;
    C.mount = function(host, slide){
      const r = _mount.apply(this, arguments);
      try { celArrowAfterVO(); } catch(e){}
      try { runCelSprite(slide); } catch(e){}
      return r;
    };
  })(0), 0);
  let _celGen = 0;
  /* round 2m — THREE SHEETS, ONE CLOCK (timeline re-ordered in round 2r — see inside: jump first, then
     the line). While she talks the clock is the celebration VO itself, from the moment it is sounding:
     the cursor walks the talk sheet forward (so the body keeps moving naturally) but only ever lands on
     a frame whose mouth matches the VO at that instant — open on each syllable, shut in every dip.
     All three sheets share frame size and alignment (make_cel_sprite.py), so switching never jumps. */
  function runCelSprite(slide){
    const A = CARD && CARD.end_anim;
    const im = document.querySelector("#endScreen .end-mascot");
    if(!A || !im || !A.bits || !A.shabaash) return;
    const gen = ++_celGen;
    let sp = document.getElementById("celSprite");
    if(!sp){
      sp = document.createElement("div"); sp.id = "celSprite"; sp.className = "cel-sprite";
      sp.innerHTML = '<div class="cel-art"></div>';
      im.parentNode.insertBefore(sp, im);
    }
    im.style.display = "none";
    const art = sp.querySelector(".cel-art");
    /* paint the talk + idle sheets once, invisibly, while the screen opens — so the browser decodes and
       uploads them now, not at the शाबाश -> talk switch (measured: a 130-180 ms stall there) */
    [A.talk, A.idle].forEach(sh => {
      const pp = document.createElement("div"); pp.className = "cel-art cel-prepaint";
      pp.style.aspectRatio = A.fw + " / " + A.fh; pp.style.backgroundImage = 'url("' + sh.src + '")';
      sp.appendChild(pp);
      requestAnimationFrame(()=> requestAnimationFrame(()=> setTimeout(()=> pp.remove(), 120)));
    });
    art.style.aspectRatio = A.fw + " / " + A.fh;
    let curSrc = "";
    const show = (sheet, i)=>{
      if(sheet.src !== curSrc){ art.style.backgroundImage = 'url("' + sheet.src + '")'; curSrc = sheet.src; }
      const c = i % A.cols, r = Math.floor(i / A.cols);
      art.style.backgroundPosition = (c * 100 / (A.cols - 1)) + "% " + (r * 100 / (A.cols - 1)) + "%";
      sp.dataset.sheet = sheet === A.shabaash ? "shabaash" : (sheet === A.idle ? "idle" : "talk");
      sp.dataset.f = i;
    };
    const S = A.shabaash, T = A.talk, I = A.idle;
    const OPEN = new Set(T.open);
    const bits = A.bits || "";
    const step = A.step_ms || 25;
    const loud = (t)=> bits.charAt(Math.floor(t / step)) === "1";
    const lenMs = bits.length * step;
    /* round 2r (user + reference HI02H11 r106): SHE JUMPS AND CELEBRATES FIRST, THEN SPEAKS. The line
       («बहुत बढ़िया, दोस्त! तुमने कमाल कर दिया!») has no «शाबाश» to hang the jump on, so the page owns
       the audio (ownsAudio: the engine's auto-play is skipped) and runs:
         jump     «शाबाश» sheet 0-29 at 45 ms/frame (1.35 s) — silent but for the engine's celebration sfx
         landing  «शाबाश» sheet 30-35 (mouth shut, 0.27 s)
         the VO   starts here; the WHOLE line lip-syncs on the talk sheet (the clip speaks from 0 ms)
         after    idle sheet, mouth-shut frames only, looping */
    const JUMP = S.pre.concat(S.word), LAND = S.post, FMS = 45;
    const src = (typeof audioFor === "function") ? audioFor(slide, "prompt") : null;
    if(!src) return;                                   /* no clip: let the engine's own auto-play run */
    state.ownsAudio = true;
    show(S, JUMP[0]);
    let m0 = 0, lastF = 0, smooth = 0, vclock = null;
    let phase = "jump", tj = 0, t0 = 0, waitStart = 0, done = false, cursor = 0, curOpen = null, lastStep = 0;
    const idle = ()=>{
      let j = 0;
      (function tick(){
        if(gen !== _celGen || !sp.isConnected) return;
        show(I, I.loop[j % I.loop.length]); j++;
        setTimeout(tick, 110);
      })();
    };
    (function frame(){
      if(gen !== _celGen || !sp.isConnected || done) return;
      if(CARD.slides[state.idx] !== slide){ done = true; return; }
      const now = performance.now();
      /* the jump's clock starts once the screen's opening work has settled — three smooth paints in a
         row (sunburst, stars, sfx and the sheets' first decode stall the first ~0.2-0.5 s; a jump timed
         from the mount skipped half its frames). Capped at 0.7 s, so she never stands still longer. */
      if(!tj){
        if(!m0){ m0 = now; lastF = now; }
        smooth = (now - lastF < 40) ? smooth + 1 : 0; lastF = now;
        if(smooth >= 3 || now - m0 > 700) tj = now;
        else { requestAnimationFrame(frame); return; }
      }
      if(phase === "jump" || phase === "land"){
        const list = phase === "jump" ? JUMP : LAND, k = Math.floor((now - tj) / FMS);
        if(k < list.length){ show(S, list[k]); requestAnimationFrame(frame); return; }
        if(phase === "jump"){ phase = "land"; tj = now; show(S, LAND[0]); requestAnimationFrame(frame); return; }
        phase = "wait"; waitStart = now;
        play(src, ()=>{});                             /* the line starts as she lands */
        /* the clip's OWN clock where the engine offers one (the reference's _voiceClock); here isPlaying's first true */
        vclock = (typeof _voiceClock === "function") ? _voiceClock()
          : (typeof voProgress === "function") ? ()=>{ const p = voProgress();   /* [HI02H02] this engine's clip clock */
              const d = (typeof _curVoMs !== "undefined" && _curVoMs) || (currentAudio && currentAudio.duration > 0 ? currentAudio.duration * 1000 : 0);
              return { t: (p >= 0 && d) ? p * d : null }; } : null;
      }
      if(phase === "wait"){
        if(isPlaying && (!vclock || vclock().t != null || now - waitStart > 700)){ phase = "talk"; t0 = now; }   /* talk once the clip is really sounding */
        else if(now - waitStart > 1800){ done = true; idle(); return; }     /* the VO never started */
        else { requestAnimationFrame(frame); return; }
      }
      const vt = vclock ? vclock().t : null;
      const t = vt != null ? vt : now - t0;
      if(!isPlaying || t > lenMs + 400){ done = true; idle(); return; }
      const want = loud(t + 16);                       /* one paint ahead: the frame shows on the NEXT paint */
      /* step the talk sheet forward: at once when the mouth must change, else every 80 ms */
      if(want !== curOpen || now - lastStep > 80){
        let k = 1;
        while(k < 36 && OPEN.has((cursor + k) % 36) !== want) k++;
        cursor = (cursor + k) % 36;
        show(T, cursor); curOpen = want; lastStep = now;
      }
      sp.dataset.t = Math.round(t); sp.dataset.w = want ? 1 : 0;   /* the sprite's own clock + choice (tests) */
      requestAnimationFrame(frame);
    })();
  }
  /* warm the sheets during the lesson, so the end screen never opens on an empty box */
  setTimeout(()=>{ try { const A = CARD && CARD.end_anim; if(A && A.shabaash){
    window.__celWarm = [A.shabaash.src, A.talk.src, A.idle.src].map(u => { const i = new Image(); i.src = u; if(i.decode) i.decode().catch(()=>{}); return i; }); } } catch(e){} }, 1500);
})();
