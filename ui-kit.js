/* HI02H02_L01_S01 - the reference lesson HI02H11_L03_S02's FLN animation kit (sky drift, sky burst, correct/wrong
   select, star burst) and FLN confetti kit, verbatim and in their original order. Loaded before app.js. */
/* ===== FLN ANIMATION KIT: preview-js BEGIN ===== */
(function(){ "use strict";
/* ===== FLN ANIMATION KIT: core BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion = window.FLNMotion || {};
  M.still = function(){
    try{ return document.documentElement.classList.contains("no-anim") ||
      (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
    catch(_){ return false; }
  };
  M.scale = function(){
    try{ return parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue("--scale")) || 1; }catch(_){ return 1; }
  };
  M.rect = function(r, sw){                    // screen rect -> stage coords (R1/R2)
    var s = M.scale();
    if(document.documentElement.classList.contains("rotated")){
      return { left:(r.top - sw.top)/s, top:(sw.right - r.right)/s, w:r.height/s, h:r.width/s };
    }
    return { left:(r.left - sw.left)/s, top:(r.top - sw.top)/s, w:r.width/s, h:r.height/s };
  };
  M.guard = function(fn){                      // R4
    try{ fn(); }catch(e){ try{ console.warn("[animation-kit]", e && e.message); }catch(_){} }
  };
  var _actx = null;
  M.audio = function(){
    try{
      var AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null;
      _actx = _actx || new AC();
      if(_actx.state === "suspended") _actx.resume();
      return _actx;
    }catch(_){ return null; }
  };
  M.ready = function(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  };
})();
/* ===== FLN ANIMATION KIT: core END ===== */
/* R5, the JS half: the engine has no ?still=1 of its own - the string does not appear
   in it once - so PHASE 3 check 13c had nothing to switch off. This gives the kit flag
   something to bind to, and the reduced-motion CSS above does the rest. */
try{ if(/[?&]still=1/.test(location.search))
  document.documentElement.classList.add("no-anim"); }catch(e){}
  /* `cue` is the preview's sound trigger and the ONLY thing its effect code reaches for
     outside itself. Mapped onto the real recordings in assets/SFX. `sprinkle`
     shares sfx_burst on the kit's own instruction: burst fires on "every elements-burst
     moment: landing stars, the end-screen burst, and the correct-answer confetti". */
  var SFX = { correct:"sfx_correct", wrong:"sfx_wrong", burst:"sfx_burst",
              celebrate:"sfx_celebrate", sprinkle:"sfx_burst" };
  function cue(el, name){
    /* [H11-54] THIS LOADER WAS LEFT BEHIND BY THE FOLDER SPLIT. [H11-50] moved the effects to
       assets/SFX and taught audioDir() to _sfxFile and playSfx - but cue() is a THIRD loader,
       inside the kit block, with its own hard-coded folder, so every effect it plays (correct,
       wrong, burst, celebrate, sprinkle) has been asking for a file that is not there. Caught
       by logging a real match: the confetti burst requested assets/VO/sfx_burst.ogg.
       audioDir lives in a later script block, but cue() only ever runs on a user action, long
       after that block has parsed; the inline fallback covers the impossible case rather than
       letting a missing helper silence the effects a second time. */
    try{ var f = SFX[name]; if(!f) return;
         /* [H11-150] ONE SOUND PER MOMENT. A right answer asks for sfx_correct twice in the same
            tick - the engine's sfxCorrect() and this kit's tile confirm - and a wrong one asks for
            sfx_wrong twice the same way. Two copies of one clip started together play as one clip
            twice as loud, which the new SwiftPAL set (mastered to full scale) made audible. The
            second request inside 150ms is dropped; window.__sfxLast is shared with _sfxFile. */
         var _now = Date.now(), _last = (window.__sfxLast = window.__sfxLast || {});
         if(_last[f] && _now - _last[f] < 150) return; _last[f] = _now;
         var dir = (typeof audioDir === "function") ? audioDir(f)
                 : (f.indexOf("sfx_") === 0 ? "assets/SFX/" : "assets/VO/");
         var a = new Audio((typeof bustAudio==="function"?bustAudio(dir+f+".wav"):dir+f+".wav")); a.volume = 0.7;   /* [H11-156] WAV now */
         a.play().catch(function(){}); }catch(e){}
  }
var CONF = [
  ["#8B2FC9","#5E1C8C"],   /* violet */
  ["#3F51B5","#27358A"],   /* indigo */
  ["#1E88E5","#135FA6"],   /* blue   */
  ["#22B24C","#157A34"],   /* green  */
  ["#FFD21E","#D9A800"],   /* yellow */
  ["#FF8A1E","#C75F00"],   /* orange */
  ["#E5322D","#A81F1B"]    /* red    */
];

var COLORS = ["#FFE400","#FFBD00","#E89400","#FFCA6C","#FDFFB8"];

var HUES = ["#FCB717","#3B7DD8","#21A74A","#E5484D","#7048D6","#F1781D"];

var KIND = {s1:"k-star", s2:"k-star", s3:"k-spark", s4:"k-dot", s5:"k-dot"};

var SHAPES = ["st","st","st","st","rc","rc","ln","ln","sq","sq"];

var OL_ST = ["is-correct", "is-wrong", "is-muted"];

var SB_NEW = { stars:32, circles:8, startV:14, decay:0.975, ticks:150,
               shots:[0,220,440], spin:0.18, starScale:1.8, circleScale:1.0 };

function rnd(a, b){ return a + Math.random() * (b - a); }

function still(){
  try{ return document.documentElement.classList.contains("no-anim") ||
    (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
  catch(e){ return false; }
}

function mk(cls){ var i = document.createElement("i"); i.className = cls; return i; }

function tempo(el){
  var cs = getComputedStyle(el);
  function num(p, d){
    var v = parseFloat(cs.getPropertyValue(p));
    if(!v && v !== 0) return d;
    return v > 20 ? v / 1000 : v;
  }
  var beat = num("--fx-beat", 0.4);
  return { beat: beat, reward: beat * (parseFloat(cs.getPropertyValue("--fx-reward")) || 2) };
}

function later(el, fn, ms){
  el._selT = el._selT || [];
  el._selT.push(setTimeout(fn, ms));
}

function selClear(el){
  if(el._selT){ for(var j = 0; j < el._selT.length; j++) clearTimeout(el._selT[j]); }
  el._selT = [];
  el.classList.remove("ck-correct", "wg-wrong", "wg-out", "wg-rel",
                      "old-correct", "old-wrong");
  var fx = el.querySelectorAll(".ck-fx,.wg-fx");
  for(var i = 0; i < fx.length; i++) fx[i].remove();
}

function ckPlay(el, o){
  o = o || {};
  var crown = (o.crown == null) ? 5 : o.crown;
  selClear(el);
  void el.offsetWidth;                        /* forced reflow - restarts the pop */
  var dur = o.dur || tempo(el).reward;        /* CSS owns the tempo */
  if(o.dur) el.style.setProperty("--ckT", dur + "s");

  var fx = mk("ck-fx");

  if(crown && !still()){
    var cr = mk("ck-crown");
    /* clientWidth is layout px INSIDE the scaled stage - i.e. design px already.
       getBoundingClientRect() here would come back multiplied by --scale (R1). */
    var w = el.clientWidth || 96, h = el.clientHeight || 96;
    var rx = w * 0.46, ry = h * 0.46;      /* the tile's own edge */
    for(var i = 0; i < crown; i++){
      var t = (crown === 1) ? 0.5 : i / (crown - 1);
      var a = (-158 + t * 136 + rnd(-7, 7)) * Math.PI / 180;   /* TOP arc only */
      var x0 = Math.cos(a) * rx, y0 = Math.sin(a) * ry;       /* start ON the edge */
      var out = rnd(.20, .34);                                /* ...and travel out */
      var s = mk("");
      s.style.cssText =
        "--ss:" + rnd(7, 12).toFixed(1) + "px;" +
        "--x0:" + x0.toFixed(1) + "px;" +
        "--y0:" + y0.toFixed(1) + "px;" +
        "--sx:" + (x0 + Math.cos(a) * w * out).toFixed(1) + "px;" +
        "--sy:" + (y0 + Math.sin(a) * h * out).toFixed(1) + "px;" +
        "--sr:" + Math.round(rnd(-140, 140)) + "deg;";
      cr.appendChild(s);
    }
    fx.appendChild(cr);
  }

  /* class FIRST - the border and pop must not wait on the decoration being built */
  el.classList.add("ck-correct");
  el.appendChild(fx);
  cue(el, "correct");
  /* Only the TRANSIENT layers are swept. .ck-correct stays: the green outline is
     the correct-mark and it belongs to the tile until the slide advances. */
  later(el, function(){
    var t = fx.querySelectorAll(".ck-crown");
    for(var i = 0; i < t.length; i++) t[i].remove();
  }, dur * 1050);
}

function wgPlay(el, o){
  o = o || {};
  selClear(el);
  void el.offsetWidth;
  var dur = o.dur || tempo(el).beat;          /* CSS owns the tempo */
  if(o.dur) el.style.setProperty("--wgT", dur + "s");
  el.classList.add("wg-wrong");          /* class first - see ckPlay */
  cue(el, "wrong");
  var fx = mk("wg-fx");
  fx.appendChild(mk("wg-pulse"));
  el.appendChild(fx);
  /* RELEASE on a timeout, never on animationend: under the reduced-motion kill
     switch animationend never fires and the tile would stay red forever - on
     exactly the devices least able to recover from it. (R5, second half.)
     .wg-rel goes on BEFORE .wg-wrong comes off so the border has something to
     transition with; see the CSS note. */
  later(el, function(){
    el.classList.add("wg-rel");
    el.classList.remove("wg-wrong");
    var f = el.querySelector(".wg-fx"); if(f) f.remove();
    later(el, function(){
      el.classList.remove("wg-rel");
      if(o.then) o.then();
    }, 260);
  }, dur * 1500 + 40);
}

function wgOut(el, o){
  o = o || {};
  selClear(el);
  void el.offsetWidth;
  var dur = o.dur || tempo(el).beat;
  if(o.dur) el.style.setProperty("--wgT", dur + "s");
  el.classList.add("wg-out");
  cue(el, "wrong");
  var fx = mk("wg-fx");
  fx.appendChild(mk("wg-pulse"));
  el.appendChild(fx);
}

function confettiNew(host, n){
  cue(host, "sprinkle");
  host.querySelectorAll(".fx-confetti").forEach(function(x){ x.remove(); });
  var dist = host.clientHeight + 60, maxLife = 0;
  var wrap = document.createElement("div");
  wrap.className = "fx-confetti";
  for(var i = 0; i < n; i++){
    var z     = rnd(0.75, 1.15);           /* depth: nearer pieces are bigger */
    var fall  = rnd(1.1, 1.8) / z;         /* ...and fall faster (parallax)   */
    var delay = rnd(0, 0.35);
    if(fall + delay > maxLife) maxLife = fall + delay;
    var pair = CONF[i % CONF.length];
    /* Two regimes, and a real plate moves DIFFERENTLY in each:
       flutter = zigzags a lot, almost no net sideways drift;
       tumble  = autorotation produces a steady lateral force, so it barely zigzags
                 but drifts consistently to one side. */
    var flutter = Math.random() > 0.22;
    var rockT   = flutter ? rnd(0.6, 1.2) : rnd(0.75, 1.5);
    var sway    = flutter ? rnd(10, 34)   : rnd(2, 8);
    var drift   = flutter ? rnd(-12, 12)  : rnd(-45, 45);
    var bob     = flutter ? rnd(3, 7)     : rnd(2, 4);

    /* every custom property is set once here and INHERITS down to .w and .f */
    var p = document.createElement("i"); p.className = "p";
    p.style.cssText =
      "--x:"     + rnd(-2, 98).toFixed(1) + "%;" +
      "--dist:"  + dist + "px;" +
      "--fall:"  + fall.toFixed(2) + "s;" +
      "--delay:" + delay.toFixed(2) + "s;" +
      "--drift:" + drift.toFixed(0) + "px;" +
      "--sway:"  + sway.toFixed(0) + "px;" +
      "--bob:"   + bob.toFixed(1) + "px;" +
      "--rockT:" + rockT.toFixed(2) + "s;" +
      /* capped short of 90deg: even at max tilt the face still reads */
      "--amp:"   + Math.round(rnd(28, 52)) + "deg;" +
      "--yaw:"   + Math.round(rnd(-30, 30)) + "deg;" +
      "--tilt:"  + Math.round(rnd(-25, 25)) + "deg;" +
      "--z:"     + z.toFixed(2) + ";" +
      "--dim:"   + (0.72 + (z - 0.75) / 0.4 * 0.28).toFixed(2) + ";" +
      "--c:"     + pair[0] + ";--c2:" + pair[1] + ";";

    var w = document.createElement("i"); w.className = "w";
    var f = document.createElement("i");
    f.className = "f " + SHAPES[Math.floor(Math.random() * SHAPES.length)] +
                  (flutter ? "" : " tum");
    w.appendChild(f); p.appendChild(w); wrap.appendChild(p);
  }
  host.appendChild(wrap);
  setTimeout(function(){ wrap.remove(); }, (maxLife + 0.3) * 1000);
}

function starBurst(host, o){
  cue(host, "celebrate");
  host.querySelectorAll("canvas.fx").forEach(function(c){ c.remove(); });
  var W = host.clientWidth, H = host.clientHeight;
  var cv = document.createElement("canvas");
  cv.className = "fx"; cv.width = W; cv.height = H;
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  host.insertBefore(cv, host.firstChild);
  var ctx = cv.getContext("2d"), parts = [];
  /* the real stage is 1333x750; scale velocity and size so the preview reads true */
  var k = W / 1333;
  var COLORS = ["#FFE400","#FFBD00","#E89400","#FFCA6C","#FDFFB8"];

  function starPath(r){
    ctx.beginPath();
    for(var i = 0; i < 10; i++){
      var rad = (i % 2 === 0) ? r : r / 2, a = Math.PI / 5 * i - Math.PI / 2;
      ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
  }
  function add(n, scalar, shape){
    for(var i = 0; i < n; i++){
      var a = Math.random() * Math.PI * 2;
      parts.push({ x:W/2, y:H*0.52, ax:Math.cos(a), ay:Math.sin(a),
        vel:o.startV * k * (0.5 + Math.random()), tick:0,
        scalar:scalar * k, shape:shape,
        color:COLORS[Math.floor(Math.random()*COLORS.length)],
        rot:Math.random()*Math.PI*2, spin:(Math.random()-.5)*o.spin });
    }
  }
  function shoot(){ add(o.stars, o.starScale, "star"); add(o.circles, o.circleScale, "circle"); }
  o.shots.forEach(function(ms){ ms ? setTimeout(shoot, ms) : shoot(); });

  /* derived from the LAST shot, so retiming the shots cannot end the loop early */
  var minFrames = Math.max.apply(null, o.shots) / 16 + 20;
  var frames = 0;
  (function frame(){
    ctx.clearRect(0, 0, W, H);
    var alive = false;
    for(var i = 0; i < parts.length; i++){
      var p = parts[i];
      if(p.tick >= o.ticks) continue;
      alive = true;
      p.x += p.ax*p.vel; p.y += p.ay*p.vel; p.vel *= o.decay;
      p.rot += p.spin; p.tick++;
      ctx.globalAlpha = 1 - p.tick/o.ticks;
      ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if(p.shape === "star"){ starPath(8*p.scalar); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0,0,6*p.scalar,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
    frames++;
    if(alive || frames < minFrames) requestAnimationFrame(frame);
    else setTimeout(function(){ cv.remove(); }, 300);
  })();
}

function starPath(r){
    ctx.beginPath();
    for(var i = 0; i < 10; i++){
      var rad = (i % 2 === 0) ? r : r / 2, a = Math.PI / 5 * i - Math.PI / 2;
      ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
  }

function olSet(el, state){
  if(!el) return;
  /* the same two cues as the tiles: a child should not have to learn a second
     vocabulary because the mechanic changed */
  if(state === "correct") cue(el, "correct");
  else if(state === "wrong") cue(el, "wrong");
  for(var i = 0; i < OL_ST.length; i++) el.classList.remove(OL_ST[i]);
  void el.offsetWidth;                       /* restart - same reason as recipe 19 */
  if(state) el.classList.add("is-" + state);
}

function olBeat(el){
  var v = parseFloat(getComputedStyle(el).getPropertyValue("--olT"));
  if(!v) return 0.4;
  return v > 20 ? v / 1000 : v;
}

function olWrong(el, then){
  olSet(el, "wrong");
  if(el._olT) clearTimeout(el._olT);
  el._olT = setTimeout(function(){
    el.classList.remove("is-wrong");
    if(then) then();
  }, olBeat(el) * 1500 + 40);
}

function olReset(scope){
  var els = document.querySelectorAll(scope + " .ol");
  for(var i = 0; i < els.length; i++){
    if(els[i]._olT) clearTimeout(els[i]._olT);
    olSet(els[i], "");
  }
}
  window.FLNKit = { confetti:confettiNew, starBurst:starBurst, ck:ckPlay, wg:wgPlay,
                    wgOut:wgOut, olSet:olSet, olBeat:olBeat, olWrong:olWrong,
                    olReset:olReset, still:still, SB:SB_NEW };
  /* SB is not optional - starBurst reads o.stars/o.startV/o.shots with no fallbacks.
     No sky/boom/pop here: recipes 1+2 ship their own and own .sg-sky / .sg-burst;
     keeping the preview's too would put two star fields on the same screen. */
/* The sky keeps recipe 1's OWN defaults - lanes 29, 3 layers, r0 22, r1 72vmax.
   They were designed for this masked layout: r0 22 puts the spawn ring just behind the
   card so stars EMERGE from its edge, and r1 72 carries them to the screen edge. The
   preview-matched geometry I had here (r0 7.3, r1 47) was tuned for the UNMASKED look;
   with the mask back it spawned stars deep inside the card - the card edge is ~42vmax
   out - so they were clipped for almost their whole life and only a few ever showed. */
})();

/* The mask HIDES the stars over the landing card, it does not remove them: the <i>
   elements are still in the DOM and recipe 2 hit-tests by rectangle, so a tap on the
   white box would burst a star nobody can see. This runs BEFORE recipe 2 (registered
   earlier on the same node, capture phase) and swallows those taps - never on a
   control, so the start button and the speaker chip are untouched, and only where a
   .sg-card exists, so the end screen keeps its tappable field. */
try{ document.addEventListener("pointerdown", function(e){
  try{
    if(e.target.closest("button,[data-act],.sg-vo,.sg-btn,a,[role=button]")) return;
    var c = document.querySelector(".sg-card"); if(!c) return;
    var r = c.getBoundingClientRect();
    if(e.clientX < r.left || e.clientX > r.right ||
       e.clientY < r.top  || e.clientY > r.bottom) return;
    e.stopImmediatePropagation();
  }catch(_){}
}, true); }catch(e){}
/* ===== FLN ANIMATION KIT: preview-js END ===== */

/* ===== FLN ANIMATION KIT: sky-drift BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;

  function build(o){
    var sky = typeof o.container === "string" ? document.querySelector(o.container) : o.container;
    if(!sky) return null;
    sky.textContent = "";
    var maxSize = 0, frag = document.createDocumentFragment();

    o.layers.forEach(function(L, li){
      for(var i = 0; i < o.lanes; i++){
        var a = ((360 / o.lanes) * i + L.rot) * Math.PI / 180;
        var cos = Math.cos(a), sin = Math.sin(a);
        var size = +((o.size[0] + Math.random() * (o.size[1] - o.size[0])) * L.scale).toFixed(2);
        if(size > maxSize) maxSize = size;
        var dur = +(o.dur[0] + Math.random() * (o.dur[1] - o.dur[0])).toFixed(1);
        var el = document.createElement("i");
        el.className = o.shapes[(i + li) % o.shapes.length];
        el.style.cssText =
          "--s:"  + size + "vmax;" +
          "--x1:" + (o.r0 * cos).toFixed(2) + "vmax;--y1:" + (o.r0 * sin).toFixed(2) + "vmax;" +
          "--x2:" + (o.r1 * cos).toFixed(2) + "vmax;--y2:" + (o.r1 * sin).toFixed(2) + "vmax;" +
          "--t:"  + dur + "s;" +
          "--d:-" + (Math.random() * dur).toFixed(1) + "s;" +     // negative = de-sync
          "--g:"  + (o.glow[0] + Math.random() * (o.glow[1] - o.glow[0])).toFixed(1) + "s;" +
          "--gd:-" + (Math.random() * 4).toFixed(1) + "s;" +
          "--o:"  + (o.opacity[0] + Math.random() * (o.opacity[1] - o.opacity[0])).toFixed(2) + ";";
        frag.appendChild(el);
      }
    });
    sky.appendChild(frag);

    // collision proof: lane arc at the tightest radius must be >= 1.5x the largest element
    var arc = (2 * Math.PI * o.r0) / o.lanes, ok = arc >= maxSize * 1.5;
    if(!ok && o.warn !== false){
      console.warn("[animation-kit] sky lanes too tight: arc " + arc.toFixed(2) +
        "vmax vs element " + maxSize.toFixed(2) + "vmax. Reduce lanes or size.");
    }
    return { arc:arc, maxSize:maxSize, safe:ok, count:sky.children.length };
  }

  M.sky = {
    defaults: {
      container:".sg-sky", lanes:29,
      layers:[{rot:0,scale:1},{rot:6.2,scale:0.62},{rot:-6.2,scale:0.55}],
      r0:22, r1:72, size:[0.8,2.6], dur:[18,34], glow:[3.0,4.8],
      opacity:[0.62,0.92], shapes:["s1","s2","s3","s4","s5"], warn:true
    },
    init: function(opts){
      var o = Object.assign({}, this.defaults, opts || {}), res = null;
      M.guard(function(){ res = build(o); });
      return res;
    }
  };
  M.ready(function(){ M.guard(function(){ if(!window.__skyManual) M.sky.init(); }); });
})();
/* ===== FLN ANIMATION KIT: sky-drift END ===== */


/* ===== FLN ANIMATION KIT: sky-burst BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;

  function boom(o){                      // sine thud + noise tail + square crackles
    var actx = M.audio(); if(!actx) return;
    try{
      var t = actx.currentTime, out = actx.createGain();
      out.gain.value = o.volume; out.connect(actx.destination);

      var tg = actx.createGain();
      tg.gain.setValueAtTime(0.9, t);
      tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      tg.connect(out);
      var osc = actx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.16);
      osc.connect(tg); osc.start(t); osc.stop(t + 0.18);

      var n = actx.sampleRate * 0.45;
      var buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
      for(var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
      var src = actx.createBufferSource(); src.buffer = buf;

      for(var c = 0; c < o.crackles; c++){
        var cg = actx.createGain(), ct = t + 0.10 + Math.random() * 0.30;
        cg.gain.setValueAtTime(0.0001, ct);
        cg.gain.exponentialRampToValueAtTime(0.18, ct + 0.006);
        cg.gain.exponentialRampToValueAtTime(0.0001, ct + 0.07);
        cg.connect(out);
        var co = actx.createOscillator();
        co.type = "square";
        co.frequency.setValueAtTime(1500 + Math.random() * 2200, ct);
        co.connect(cg); co.start(ct); co.stop(ct + 0.08);
      }
      var bp = actx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 3400; bp.Q.value = 0.8;
      var ng = actx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      src.connect(bp); bp.connect(ng); ng.connect(out); src.start(t + 0.02);
    }catch(_){}
  }

  function pop(el, r, o){
    el.classList.add("popped");
    // respawn on the next FLIGHT lap - the glow cycle is much shorter, so filter by name
    el.addEventListener("animationiteration", function back(e){
      if(e.animationName !== "sgFly") return;
      el.classList.remove("popped");
      el.removeEventListener("animationiteration", back);
    });

    var kind = "k-dot", cls = el.classList;
    for(var ci = 0; ci < cls.length; ci++){ if(o.kind[cls[ci]]) kind = o.kind[cls[ci]]; }

    var bs = Math.max(11, r.width);
    var b = document.createElement("div");
    b.className = "sg-burst " + kind;
    b.style.left = (r.left + r.width / 2) + "px";
    b.style.top  = (r.top  + r.height / 2) + "px";
    b.style.setProperty("--bs", bs + "px");
    b.appendChild(document.createElement("div")).className = "fl";

    var k = 0;
    for(var g = 0; g < o.rings.length; g++){
      var R = o.rings[g], off = Math.random() * Math.PI * 2;
      for(var i = 0; i < R.n; i++, k++){
        var a = off + i / R.n * Math.PI * 2;
        var dist = bs * R.rad * (0.78 + Math.random() * 0.44);
        var p = document.createElement("i");
        p.style.cssText =
          "--ps:"  + (bs * R.size * (0.8 + Math.random() * 0.5)).toFixed(1) + "px;" +
          "--dx:"  + (Math.cos(a) * dist).toFixed(1) + "px;" +
          "--dy:"  + (Math.sin(a) * dist).toFixed(1) + "px;" +
          "--gy:"  + (dist * o.gravity).toFixed(1) + "px;" +
          "--sd:"  + (R.dur + Math.random() * 0.22).toFixed(2) + "s;" +
          "--sdl:" + (Math.random() * 0.06).toFixed(3) + "s;" +
          "color:" + o.hues[k % o.hues.length];
        b.appendChild(p);
      }
    }
    document.body.appendChild(b);
    if(o.sound) boom(o);
    setTimeout(function(){ b.remove(); }, o.life);
  }

  M.skyBurst = {
    defaults: {
      container:".sg-sky", when:["is-start","is-end"],
      rings:[{n:9,rad:3.1,size:.58,dur:.80},{n:7,rad:1.8,size:.78,dur:.62}],
      hues:["#FCB717","#3B7DD8","#21A74A","#E5484D","#7048D6","#F1781D"],
      kind:{s1:"k-star",s2:"k-star",s3:"k-spark",s4:"k-dot",s5:"k-dot"},
      gravity:0.42, pad:12, padRatio:0.7, minAlpha:0.08, life:1200,
      sound:true, volume:0.22, crackles:4
    },
    init: function(opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        var sky = typeof o.container === "string"
          ? document.querySelector(o.container) : o.container;
        if(!sky) return;
        // capture phase: .sg-sky is pointer-events:none, so hit-test by rect (R6)
        document.addEventListener("pointerdown", function(e){
          if(M.still()) return;
          if(!o.when.some(function(c){ return document.body.classList.contains(c); })) return;
          var els = sky.querySelectorAll("i:not(.popped)");
          for(var i = 0; i < els.length; i++){
            var el = els[i], r = el.getBoundingClientRect();
            if(r.width < 2) continue;
            var pad = Math.max(o.pad, r.width * o.padRatio);   // ~4px targets need slack
            if(e.clientX < r.left - pad || e.clientX > r.right  + pad ||
               e.clientY < r.top  - pad || e.clientY > r.bottom + pad) continue;
            if(parseFloat(getComputedStyle(el).opacity) < o.minAlpha) continue;
            // claim the tap, or it also fires the button under the star
            e.stopPropagation(); e.preventDefault();
            pop(el, r, o);
            return;
          }
        }, true);
      });
    }
  };
  M.ready(function(){ M.guard(function(){ M.skyBurst.init(); }); });
})();
/* ===== FLN ANIMATION KIT: sky-burst END ===== */

window.FLN_OWN_SCALE = true;

/* FLN confetti - standalone, exact copy of the game build (MTG2A04_L02_S01 app.js). No sound.
   Usage: include confetti.css and this file, then call confettiCannon() - one burst over the whole window.
   It adds <div class="fx-layer" id="fxLayer"> to the page itself if there is none. */

/* ---- the two kit-core helpers the confetti uses (verbatim from "FLN ANIMATION KIT: core") ---- */
(function(){ "use strict";
  var M = window.FLNMotion = window.FLNMotion || {};
  M.still = M.still || function(){
    try{ return document.documentElement.classList.contains("no-anim") ||
      (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
    catch(_){ return false; }
  };
  M.guard = M.guard || function(fn){
    try{ fn(); }catch(e){ try{ console.warn("[animation-kit]", e && e.message); }catch(_){} }
  };
})();

/* ===== FLN ANIMATION KIT: confetti BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;
  function rnd(a, b){ return a + Math.random() * (b - a); }

  M.confetti = {
    defaults: {
      host:".stage-inner", count:80, stagger:0.35,
      fall:[1.1,1.8], drift:45, sway:[10,34], bob:[3,7],
      rockT:[0.6,1.2], tumbleT:[0.75,1.5], tumbleShare:0.22,
      amp:[28,52], yaw:30, depth:[0.75,1.15], tilt:25,
      /* weighted: star 40%, rectangle 20%, line 20%, square 20%.
         Repeat an entry to weight it - the array is sampled uniformly. */
      shapes:["st","st","st","st","rc","rc","ln","ln","sq","sq"],
      /* VIBGYOR. Front/back pairs - the back is the SAME hue darkened, never a
         different hue, or it reads as two pieces flickering instead of one turning. */
      colors:[["#8B2FC9","#5E1C8C"],   /* violet */
              ["#3F51B5","#27358A"],   /* indigo */
              ["#1E88E5","#135FA6"],   /* blue   */
              ["#22B24C","#157A34"],   /* green  */
              ["#FFD21E","#D9A800"],   /* yellow */
              ["#FF8A1E","#C75F00"],   /* orange */
              ["#E5322D","#A81F1B"]],  /* red    */
      phases:["guided","practice","mastery"]   /* [] disables phase gating */
    },
    burst: function(opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        if(M.still()) return;
        /* confetti ONLY on activity phases - never tutorials, demos, landing, transitions */
        if(o.phases.length && o.phase && o.phases.indexOf(o.phase) < 0) return;
        var host = document.querySelector(o.host); if(!host) return;

        var dist = host.clientHeight + 60, maxLife = 0;
        var wrap = document.createElement("div");
        wrap.className = "fx-confetti";

        for(var i = 0; i < o.count; i++){
          var z     = rnd(o.depth[0], o.depth[1]);        /* depth */
          var fall  = rnd(o.fall[0], o.fall[1]) / z;      /* nearer = bigger = faster */
          var delay = rnd(0, o.stagger);
          if(fall + delay > maxLife) maxLife = fall + delay;
          var pair = o.colors[i % o.colors.length];
          /* most pieces flutter (face stays visible); a minority go end-over-end */
          /* Two regimes, and a real plate moves DIFFERENTLY in each:
             flutter = zigzags hard, almost no net sideways drift;
             tumble  = autorotation gives a steady lateral force, so it barely
                       zigzags but drifts consistently to one side. */
          var flutter = Math.random() > o.tumbleShare;
          var rockT   = flutter ? rnd(o.rockT[0], o.rockT[1])
                                : rnd(o.tumbleT[0], o.tumbleT[1]);
          var sway    = flutter ? rnd(o.sway[0], o.sway[1]) : rnd(2, 8);
          var drift   = flutter ? rnd(-o.drift/2.5, o.drift/2.5) : rnd(-o.drift, o.drift);
          var bob     = flutter ? rnd(o.bob[0], o.bob[1]) : rnd(2, 4);

          /* set every property once - they inherit down to .w and .f */
          var p = document.createElement("i"); p.className = "p";
          p.style.cssText =
            "--x:"     + rnd(-2, 98).toFixed(1) + "%;" +
            "--dist:"  + dist + "px;" +
            "--fall:"  + fall.toFixed(2) + "s;" +
            "--delay:" + delay.toFixed(2) + "s;" +
            "--drift:" + drift.toFixed(0) + "px;" +
            "--sway:"  + sway.toFixed(0) + "px;" +
            "--bob:"   + bob.toFixed(1) + "px;" +
            "--rockT:" + rockT.toFixed(2) + "s;" +
            /* capped short of 90deg: even at max tilt the face still reads */
            "--amp:"   + Math.round(rnd(o.amp[0], o.amp[1])) + "deg;" +
            "--yaw:"   + Math.round(rnd(-o.yaw, o.yaw)) + "deg;" +
            "--tilt:"  + Math.round(rnd(-o.tilt, o.tilt)) + "deg;" +
            "--z:"     + z.toFixed(2) + ";" +
            "--dim:"   + (0.72 + (z - o.depth[0]) /
                          (o.depth[1] - o.depth[0]) * 0.28).toFixed(2) + ";" +
            /* shapes stay legible by ASPECT RATIO, not size - see the shape table */
            "--c:"     + pair[0] + ";--c2:" + pair[1] + ";";

          var w = document.createElement("i"); w.className = "w";
          var f = document.createElement("i");
          f.className = "f " + o.shapes[Math.floor(Math.random() * o.shapes.length)] +
                        (flutter ? "" : " tum");
          w.appendChild(f); p.appendChild(w); wrap.appendChild(p);
        }
        host.appendChild(wrap);
        /* lifetime is computed, not hard-coded - a longer fall cannot be cut off */
        setTimeout(function(){ wrap.remove(); }, (maxLife + 0.3) * 1000);
      });
    },
    /* stops a slide advancing mid-celebration. 8s safety cap. */
    after: function(fn){
      var started = Date.now();
      (function check(){
        if(!document.querySelector(".fx-confetti") || Date.now() - started > 8000){ fn(); return; }
        setTimeout(check, 200);
      })();
    }
  };
})();
/* ===== FLN ANIMATION KIT: confetti END ===== */

/* ---- the stage scale the pieces are sized with (the game's fit(): its 1333 x 750 stage contain-fitted to the
   window). Skip it (window.FLN_OWN_SCALE = true before this file) if your page already sets --scale. ---- */
(function(){
  if(window.FLN_OWN_SCALE) return;
  function fit(){
    var vw = (window.visualViewport ? window.visualViewport.width  : document.documentElement.clientWidth)  || window.innerWidth;
    var vh = (window.visualViewport ? window.visualViewport.height : document.documentElement.clientHeight) || window.innerHeight;
    document.documentElement.style.setProperty("--scale", Math.min(vw / 1333, vh / 750));
  }
  fit(); window.addEventListener("resize", fit);
  if(window.visualViewport) window.visualViewport.addEventListener("resize", fit);
})();

/* ---- the game's call (app.js confettiCannon), without its sound ---- */
function confettiCannon(){
  if(!document.getElementById("fxLayer")){
    var l = document.createElement("div"); l.className = "fx-layer"; l.id = "fxLayer"; l.setAttribute("aria-hidden", "true");
    document.body.appendChild(l);
  }
  FLNMotion.confetti.burst({
    host: "#fxLayer", phases: [], count: 100, fall: [1.6, 2.6]
  });
}
