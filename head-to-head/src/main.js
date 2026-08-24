import { supabase, supabaseReady } from "./supabaseClient.js";

const DEFAULT_NAMES = ["Player 1", "Player 2"];

const $ = (id) => document.getElementById(id);
const els = {
  gameNum: $("gameNum"), plateSub: $("plateSub"),
  nameA: $("nameA"), nameB: $("nameB"),
  scoreA: $("scoreA"), scoreB: $("scoreB"),
  lastA: $("lastA"), lastB: $("lastB"),
  strokes: $("strokes"), strokeCount: $("strokeCount"),
  logBody: $("logBody"), undoBtn: $("undoBtn"),
  toast: $("toast"), syncHint: $("syncHint"),
};

let state = { names: DEFAULT_NAMES.slice(), scores: [0, 0], order: [], log: [] };
let busy = false; // guards overlapping writes from double-taps

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("on");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove("on"), 1900);
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dayKey(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function dayLabel(key) {
  const p = key.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
  const today = dayKey(new Date());
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (key === today) return "Today · " + DAYS[d.getDay()] + " " + d.getDate() + " " + MONS[d.getMonth()];
  if (key === dayKey(y)) return "Yesterday · " + DAYS[d.getDay()] + " " + d.getDate() + " " + MONS[d.getMonth()];
  return DAYS[d.getDay()] + " " + d.getDate() + " " + MONS[d.getMonth()] + " " + d.getFullYear();
}
function clockOf(iso) {
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

// ---- Supabase-backed state -------------------------------------------------

function deriveState(settingsRow, events) {
  const names = [
    (settingsRow && settingsRow.name_a) || DEFAULT_NAMES[0],
    (settingsRow && settingsRow.name_b) || DEFAULT_NAMES[1],
  ];
  let scores = [0, 0];
  let order = [];
  const log = [];
  events.forEach((e) => {
    if (e.kind === "score") {
      scores[e.side] += e.delta;
      if (e.delta > 0) order.push(e.side);
      else {
        const i = order.lastIndexOf(e.side);
        if (i > -1) order.splice(i, 1);
      }
    } else if (e.kind === "reset") {
      scores = [0, 0];
      order = [];
    }
    log.push({
      id: e.id, t: e.created_at, kind: e.kind, side: e.side, delta: e.delta,
      after: e.after, name: e.name, note: e.note, detail: e.detail,
    });
  });
  return { names, scores, order, log };
}

async function fetchState() {
  const [{ data: settingsRow, error: sErr }, { data: events, error: eErr }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", "default").maybeSingle(),
    supabase.from("events").select("*").order("id", { ascending: true }),
  ]);
  if (sErr || eErr) throw sErr || eErr;
  state = deriveState(settingsRow, events || []);
}

async function refresh() {
  try {
    await fetchState();
    render();
    setSyncHint(false);
  } catch (err) {
    console.error(err);
    setSyncHint(true, "Couldn't reach Supabase. Check your connection and reload.");
  }
}

function setSyncHint(isError, msg) {
  els.syncHint.classList.toggle("err", !!isError);
  els.syncHint.textContent = isError
    ? msg
    : "Synced to Supabase — shared live across every device open on this scoreboard.";
}

// ---- Rendering (unchanged from the original design) ------------------------

function render() {
  const total = state.scores[0] + state.scores[1];
  els.gameNum.textContent = total + 1;
  els.plateSub.textContent = total === 0
    ? "Nothing played yet"
    : total + (total === 1 ? " game logged" : " games logged");

  els.scoreA.textContent = state.scores[0];
  els.scoreB.textContent = state.scores[1];
  if (document.activeElement !== els.nameA) els.nameA.value = state.names[0];
  if (document.activeElement !== els.nameB) els.nameB.value = state.names[1];

  const lead = state.scores[0] - state.scores[1];
  els.lastA.textContent = lead > 0 ? "Leads by " + lead : (lead === 0 && total > 0 ? "All square" : "");
  els.lastB.textContent = lead < 0 ? "Leads by " + (-lead) : (lead === 0 && total > 0 ? "All square" : "");

  document.querySelectorAll(".step.minus").forEach((b) => {
    b.disabled = state.scores[+b.dataset.side] === 0;
  });

  renderStrokes();
  renderLog();
  els.undoBtn.disabled = !state.log.some((e) => e.kind === "score");
}

function renderStrokes() {
  els.strokes.innerHTML = "";
  if (!state.order.length) {
    const p = document.createElement("p");
    p.className = "strokes-empty";
    p.textContent = "Each win adds a stroke here, in the order it happened.";
    els.strokes.appendChild(p);
    els.strokeCount.textContent = "";
    return;
  }
  state.order.forEach((side, i) => {
    if (i > 0 && i % 5 === 0) {
      const g = document.createElement("i"); g.className = "stroke gap"; els.strokes.appendChild(g);
    }
    const s = document.createElement("i");
    s.className = "stroke " + (side === 0 ? "a" : "b");
    s.title = "Game " + (i + 1) + " — " + state.names[side];
    els.strokes.appendChild(s);
  });
  els.strokeCount.textContent = state.order.length + " played";
}

function renderLog() {
  els.logBody.innerHTML = "";
  if (!state.log.length) {
    const e = document.createElement("p");
    e.className = "empty";
    e.textContent = "No entries yet. Tap + on a side after each game and it gets stamped with the time here.";
    els.logBody.appendChild(e);
    return;
  }
  const groups = {}, keys = [];
  state.log.forEach((entry) => {
    const k = dayKey(new Date(entry.t));
    if (!groups[k]) { groups[k] = []; keys.push(k); }
    groups[k].push(entry);
  });
  keys.sort().reverse();

  keys.forEach((k) => {
    const rows = groups[k].slice().reverse();
    const net = [0, 0];
    groups[k].forEach((en) => { if (en.kind === "score") net[en.side] += en.delta; });

    const wrap = document.createElement("section"); wrap.className = "day";
    const head = document.createElement("div"); head.className = "day-head";
    const dt = document.createElement("span"); dt.className = "day-date"; dt.textContent = dayLabel(k);
    const tot = document.createElement("span"); tot.className = "day-tot";
    tot.textContent = net[0] + " – " + net[1] + "  ·  " + (net[0] + net[1]) + " games";
    head.appendChild(dt); head.appendChild(tot); wrap.appendChild(head);

    rows.forEach((en) => {
      const r = document.createElement("div");
      r.className = "row " + (en.kind === "score" ? (en.side === 0 ? "a" : "b") : "sys");
      const t = document.createElement("time"); t.dateTime = en.t; t.textContent = clockOf(en.t);
      const who = document.createElement("div"); who.className = "who";
      const val = document.createElement("div"); val.className = "val";
      if (en.kind === "score") {
        who.textContent = en.name || state.names[en.side];
        val.innerHTML = (en.delta > 0 ? "+1 → <b>" : "−1 → <b>") + en.after + "</b>";
      } else {
        who.textContent = en.note || "Series reset";
        val.textContent = en.detail || "";
      }
      r.appendChild(t); r.appendChild(who); r.appendChild(val);
      wrap.appendChild(r);
    });
    els.logBody.appendChild(wrap);
  });
}

// ---- Actions ----------------------------------------------------------------

async function bump(side, delta) {
  if (busy) return;
  if (delta < 0 && state.scores[side] === 0) return;
  busy = true;
  try {
    const after = state.scores[side] + delta;
    const { error } = await supabase.from("events").insert({
      kind: "score", side, delta, after, name: state.names[side],
    });
    if (error) throw error;
    await refresh();
  } catch (err) {
    console.error(err);
    toast("Couldn't save that — check your connection");
  } finally {
    busy = false;
  }
}

async function undo() {
  const last = [...state.log].reverse().find((e) => e.kind === "score");
  if (!last) return;
  busy = true;
  try {
    const { error } = await supabase.from("events").delete().eq("id", last.id);
    if (error) throw error;
    await refresh();
    toast("Reverted " + (last.delta > 0 ? "+1" : "−1") + " for " + (last.name || state.names[last.side]));
  } catch (err) {
    console.error(err);
    toast("Couldn't undo — check your connection");
  } finally {
    busy = false;
  }
}

async function resetSeries() {
  const total = state.scores[0] + state.scores[1];
  if (total === 0) { toast("Nothing to reset"); return; }
  if (!confirm("Reset the scoreboard to 0 – 0?\n\nThe daily log is kept, so your history stays intact.")) return;
  busy = true;
  try {
    const { error } = await supabase.from("events").insert({
      kind: "reset",
      note: "Series reset",
      detail: "Closed at " + state.scores[0] + " – " + state.scores[1],
    });
    if (error) throw error;
    await refresh();
    toast("Scoreboard back to 0 – 0");
  } catch (err) {
    console.error(err);
    toast("Couldn't reset — check your connection");
  } finally {
    busy = false;
  }
}

function toCsv() {
  const out = ["date,time,player,change,running_total,entry_type"];
  state.log.forEach((en) => {
    const d = new Date(en.t);
    const row = [
      dayKey(d),
      clockOf(en.t),
      en.kind === "score" ? (en.name || state.names[en.side]) : "—",
      en.kind === "score" ? (en.delta > 0 ? "+1" : "-1") : "",
      en.kind === "score" ? en.after : "",
      en.kind === "score" ? "game" : "reset",
    ];
    out.push(row.map((c) => {
      c = String(c);
      return /[",]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c;
    }).join(","));
  });
  return out.join("\n");
}

function download(name, text, mime) {
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch (e) { return false; }
}

async function updateName(idx, value) {
  const clean = value.trim() || DEFAULT_NAMES[idx];
  state.names[idx] = clean;
  renderStrokes();
  try {
    const patch = idx === 0 ? { name_a: clean } : { name_b: clean };
    const { error } = await supabase.from("settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", "default");
    if (error) throw error;
  } catch (err) {
    console.error(err);
    toast("Name change didn't save — check your connection");
  }
}

async function restoreFromBackup(parsed) {
  const names = Array.isArray(parsed.names) ? parsed.names.slice(0, 2) : DEFAULT_NAMES.slice();
  const log = Array.isArray(parsed.log) ? parsed.log : [];

  const { error: delErr } = await supabase.from("events").delete().neq("id", -1);
  if (delErr) throw delErr;

  const { error: upErr } = await supabase.from("settings").upsert({
    id: "default", name_a: names[0] || DEFAULT_NAMES[0], name_b: names[1] || DEFAULT_NAMES[1],
    updated_at: new Date().toISOString(),
  });
  if (upErr) throw upErr;

  if (log.length) {
    const rows = log.map((en) => ({
      created_at: en.t, kind: en.kind, side: en.side ?? null, delta: en.delta ?? null,
      after: en.after ?? null, name: en.name ?? null, note: en.note ?? null, detail: en.detail ?? null,
    }));
    const { error: insErr } = await supabase.from("events").insert(rows);
    if (insErr) throw insErr;
  }
}

// ---- Wiring ------------------------------------------------------------------

const dlg = $("dumpDlg"), dumpText = $("dumpText"), dumpTitle = $("dumpTitle");
function openDump() {
  dumpTitle.textContent = "Backup — copy this text, or paste a backup in and restore";
  dumpText.value = JSON.stringify(state, null, 2);
  if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
}
$("dumpClose").addEventListener("click", () => { dlg.close ? dlg.close() : dlg.removeAttribute("open"); });
$("dumpCopy").addEventListener("click", () => {
  dumpText.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) {}
  if (!ok && navigator.clipboard) { navigator.clipboard.writeText(dumpText.value); ok = true; }
  toast(ok ? "Backup copied" : "Select the text and copy manually");
});
$("dumpLoad").addEventListener("click", async () => {
  let parsed;
  try { parsed = JSON.parse(dumpText.value); }
  catch (e) { toast("That text isn't a valid backup"); return; }
  if (!parsed || !Array.isArray(parsed.scores) || !Array.isArray(parsed.log)) {
    toast("That backup is missing scores or log"); return;
  }
  try {
    await restoreFromBackup(parsed);
    await refresh();
    dlg.close ? dlg.close() : dlg.removeAttribute("open");
    toast("Restored");
  } catch (err) {
    console.error(err);
    toast("Restore failed — check your connection");
  }
});

document.querySelectorAll(".step").forEach((btn) => {
  btn.addEventListener("click", () => bump(+btn.dataset.side, +btn.dataset.delta));
});
els.undoBtn.addEventListener("click", undo);
$("resetBtn").addEventListener("click", resetSeries);
$("backup").addEventListener("click", openDump);
$("exportCsv").addEventListener("click", () => {
  if (!state.log.length) { toast("Nothing to export yet"); return; }
  const csv = toCsv();
  if (download("head-to-head-" + dayKey(new Date()) + ".csv", csv, "text/csv;charset=utf-8")) {
    toast("CSV downloaded");
  } else {
    dumpTitle.textContent = "CSV — copy this into a spreadsheet";
    dumpText.value = csv;
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  }
});

function bindName(input, idx) {
  let t;
  input.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => updateName(idx, input.value), 400);
  });
  input.addEventListener("blur", () => { clearTimeout(t); updateName(idx, input.value); });
  input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") input.blur(); });
}
bindName(els.nameA, 0);
bindName(els.nameB, 1);

document.addEventListener("keydown", (ev) => {
  if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
  const k = ev.key.toLowerCase();
  if (k === "a") bump(0, 1);
  else if (k === "l") bump(1, 1);
  else if (k === "z" && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); undo(); }
});

// ---- Boot --------------------------------------------------------------------

if (!supabaseReady) {
  setSyncHint(true, "Supabase isn't configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example) and reload.");
  render();
} else {
  refresh();
  supabase
    .channel("h2h-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => refresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => refresh())
    .subscribe();
}
