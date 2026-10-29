
"use strict";

// =====================================================
// MUSIC PAL LIVE — BASIC SONG EDITOR
// =====================================================

const PART_TYPES = [
  "INTRO",
  "VERSE",
  "CHORUS",
  "BRIDGE",
  "ADLIB",
  "OUTRO"
];

const STORAGE_KEY = "music_pal_live_v1";

const $ = (id) => document.getElementById(id);

const els = {
  newSongBtn: $("newSongBtn"),
  saveBtn: $("saveBtn"),
  partsList: $("partsList"),
  addPartBtn: $("addPartBtn"),
  songTitle: $("songTitle"),
  saveStatus: $("saveStatus"),
  emptyState: $("emptyState"),
  startBtn: $("startBtn"),
  songEditor: $("songEditor"),
  partTitle: $("partTitle"),
  deletePartBtn: $("deletePartBtn"),
  lyricsInput: $("lyricsInput"),
  chordsInput: $("chordsInput"),
  previewContent: $("previewContent"),
  prevBtn: $("prevBtn"),
  nextBtn: $("nextBtn"),
  slideCounter: $("slideCounter"),
  fullscreenBtn: $("fullscreenBtn"),
  openOutputBtn: $("openOutputBtn")
};

let song = null;
let selectedPartId = null;
let draggedPartId = null;
let outputWindow = null;
let saveTimer = null;

// =====================================================
// HELPERS
// =====================================================

function makeId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
}

function createPart(type = "VERSE", number = 1) {
  return {
    id: makeId(),
    type,
    title: type === "VERSE" ? `VERSE ${number}` : type,
    lyrics: "",
    chords: ""
  };
}

function defaultSong() {
  return {
    id: makeId(),
    title: "Untitled Song",
    parts: []
  };
}

function selectedPart() {
  return song?.parts.find(part => part.id === selectedPartId) || null;
}

function setStatus(message) {
  els.saveStatus.textContent = message;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// =====================================================
// CREATE / OPEN SONG
// =====================================================

function startNewSong() {
  if (song && !confirm("Create a new song? Make sure your current work is saved.")) {
    return;
  }

  song = defaultSong();
  selectedPartId = null;

  els.songTitle.value = song.title;

  renderAll();
  setStatus("New song");
  saveSong();
}

els.newSongBtn.addEventListener("click", startNewSong);
els.startBtn.addEventListener("click", startNewSong);

// =====================================================
// SONG PARTS
// =====================================================

function addPart(type) {
  if (!song) {
    song = defaultSong();
    els.songTitle.value = song.title;
  }

  const verseCount = song.parts.filter(
    part => part.type === "VERSE"
  ).length;

  const part = createPart(
    type,
    type === "VERSE" ? verseCount + 1 : 1
  );

  song.parts.push(part);
  selectedPartId = part.id;

  renderAll();
  saveSong();

  els.partTitle.focus();
  els.partTitle.select();
}

function showAddPartMenu() {
  if (!song) {
    song = defaultSong();
    els.songTitle.value = song.title;
  }

  const choice = prompt(
    "Enter a song part:\n" +
    "INTRO, VERSE, CHORUS, BRIDGE, ADLIB, OUTRO",
    "VERSE"
  );

  if (!choice) return;

  const type = choice.trim().toUpperCase();

  if (!PART_TYPES.includes(type)) {
    alert("Choose INTRO, VERSE, CHORUS, BRIDGE, ADLIB, or OUTRO.");
    return;
  }

  addPart(type);
}

els.addPartBtn.addEventListener("click", showAddPartMenu);

// =====================================================
// RENDER PART LIST
// =====================================================

function renderParts() {
  els.partsList.innerHTML = "";

  if (!song) return;

  song.parts.forEach((part, index) => {
    const item = document.createElement("div");
    item.className = "part-item";
    item.draggable = true;
    item.dataset.id = part.id;

    if (part.id === selectedPartId) {
      item.classList.add("selected");
    }

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "⠿";
    handle.title = "Drag to reorder";

    const select = document.createElement("button");
    select.className = "part-select";
    select.textContent = part.title || part.type;
    select.title = "Edit " + (part.title || part.type);

    if (part.id === selectedPartId) {
      select.classList.add("selected");
    }

    select.addEventListener("click", () => {
      selectedPartId = part.id;
      renderAll();
    });

    item.addEventListener("dragstart", event => {
      draggedPartId = part.id;
      item.classList.add("dragging");

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", part.id);
    });

    item.addEventListener("dragend", () => {
      draggedPartId = null;
      document.querySelectorAll(".part-item").forEach(el => {
        el.classList.remove("dragging", "drag-over");
      });
    });

    item.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      item.classList.add("drag-over");
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over");
    });

    item.addEventListener("drop", event => {
      event.preventDefault();

      const fromId = draggedPartId ||
        event.dataTransfer.getData("text/plain");

      if (!fromId || fromId === part.id) return;

      const fromIndex = song.parts.findIndex(p => p.id === fromId);
      const toIndex = song.parts.findIndex(p => p.id === part.id);

      if (fromIndex < 0 || toIndex < 0) return;

      const [moved] = song.parts.splice(fromIndex, 1);
      song.parts.splice(toIndex, 0, moved);

      renderAll();
      saveSong();
    });

    item.append(handle, select);
    els.partsList.appendChild(item);
  });
}

// =====================================================
// EDIT SELECTED PART
// =====================================================

function renderEditor() {
  const part = selectedPart();
  const hasSong = Boolean(song);
  const hasPart = Boolean(part);

  els.emptyState.hidden = hasSong;
  els.songEditor.hidden = !hasPart;

  if (!hasSong) {
    els.songTitle.value = "";
  }

  if (!hasPart) {
    els.partTitle.value = "";
    els.lyricsInput.value = "";
    els.chordsInput.value = "";
    return;
  }

  els.partTitle.value = part.title;
  els.lyricsInput.value = part.lyrics;
  els.chordsInput.value = part.chords;
}

els.songTitle.addEventListener("input", () => {
  if (!song) return;

  song.title = els.songTitle.value;
  saveSong();
});

els.partTitle.addEventListener("input", () => {
  const part = selectedPart();
  if (!part) return;

  part.title = els.partTitle.value;
  renderParts();
  saveSong();
});

els.lyricsInput.addEventListener("input", () => {
  const part = selectedPart();
  if (!part) return;

  part.lyrics = els.lyricsInput.value;
  renderPreview();
  scheduleSave();
  updateOutput();
});

els.chordsInput.addEventListener("input", () => {
  const part = selectedPart();
  if (!part) return;

  part.chords = els.chordsInput.value;
  scheduleSave();
});

// =====================================================
// DELETE PART
// =====================================================

els.deletePartBtn.addEventListener("click", () => {
  const part = selectedPart();
  if (!part) return;

  if (!confirm(`Delete "${part.title}"?`)) return;

  song.parts = song.parts.filter(p => p.id !== part.id);
  selectedPartId = song.parts[0]?.id || null;

  renderAll();
  saveSong();
});

// =====================================================
// SAVE / RESTORE
// =====================================================

function saveSong() {
  if (!song) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(song));
    setStatus("Saved locally");
  } catch (error) {
    console.error(error);
    setStatus("Save failed");
  }

  updateOutput();
}

function scheduleSave() {
  setStatus("Saving…");
  clearTimeout(saveTimer);

  saveTimer = setTimeout(saveSong, 300);
}

els.saveBtn.addEventListener("click", () => {
  saveSong();
  alert("Song saved in this browser.");
});

function loadSavedSong() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return false;

    const parsed = JSON.parse(saved);

    if (!parsed || !Array.isArray(parsed.parts)) return false;

    song = parsed;
    selectedPartId = song.parts[0]?.id || null;
    els.songTitle.value = song.title || "";

    return true;
  } catch (error) {
    console.error("Could not load saved song:", error);
    return false;
  }
}

// =====================================================
// PREVIEW
// =====================================================

function renderPreview() {
  const part = selectedPart();

  if (!part || !part.lyrics.trim()) {
    els.previewContent.textContent = part
      ? part.title
      : "Your slide preview";
    return;
  }

  els.previewContent.textContent = part.lyrics;
}

// =====================================================
// SLIDE NAVIGATION
// =====================================================

function selectRelativePart(direction) {
  if (!song || song.parts.length === 0) return;

  let index = song.parts.findIndex(p => p.id === selectedPartId);
  if (index < 0) index = 0;

  index = (index + direction + song.parts.length) % song.parts.length;

  selectedPartId = song.parts[index].id;
  renderAll();
}

els.prevBtn.addEventListener("click", () => selectRelativePart(-1));
els.nextBtn.addEventListener("click", () => selectRelativePart(1));

function renderCounter() {
  if (!song || song.parts.length === 0) {
    els.slideCounter.textContent = "No slides";
    return;
  }

  const index = song.parts.findIndex(p => p.id === selectedPartId);
  els.slideCounter.textContent =
    `${Math.max(index + 1, 1)} / ${song.parts.length}`;
}

// =====================================================
// PRESENTATION OUTPUT WINDOW
// =====================================================

function outputDocument() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MUSIC PAL — Presentation Output</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#000;color:#fff;font-family:Arial,sans-serif}
main{height:100vh;display:flex;align-items:center;justify-content:center;
padding:5vw;text-align:center;white-space:pre-wrap;overflow-wrap:anywhere;
font-size:clamp(24px,5vw,72px);line-height:1.45}
</style>
</head>
<body>
<main id="slide">Waiting for slide…</main>
<script>
window.addEventListener("storage", event => {
  if (event.key !== "music_pal_live_output") return;
  try {
    const data = JSON.parse(event.newValue);
    document.getElementById("slide").textContent = data.lyrics || data.title || "";
  } catch {}
});
try {
  const data = JSON.parse(localStorage.getItem("music_pal_live_output") || "{}");
  document.getElementById("slide").textContent = data.lyrics || data.title || "Waiting for slide…";
} catch {}
<\/script>
</body>
</html>`;
}

function openOutput() {
  outputWindow = window.open("", "MusicPalPresentationOutput");

  if (!outputWindow) {
    alert("Your browser blocked the output window. Allow pop-ups for this site, then try again.");
    return;
  }

  outputWindow.document.open();
  outputWindow.document.write(outputDocument());
  outputWindow.document.close();

  updateOutput();
}

function updateOutput() {
  const part = selectedPart();
  if (!part) return;

  const data = {
    title: part.title,
    lyrics: part.lyrics
  };

  try {
    localStorage.setItem("music_pal_live_output", JSON.stringify(data));
  } catch (error) {
    console.error("Output update failed:", error);
  }
}

els.openOutputBtn.addEventListener("click", openOutput);

els.fullscreenBtn.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    console.error("Fullscreen unavailable:", error);
  }
});

// =====================================================
// NAVIGATION PLACEHOLDERS
// =====================================================

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    if (button.dataset.view !== "songs") {
      alert(`${button.textContent.trim()} library will be added in a later version.`);
      document.querySelector('[data-view="songs"]').classList.add("active");
      button.classList.remove("active");
    }
  });
});

// =====================================================
// RENDER ALL
// =====================================================

function renderAll() {
  renderParts();
  renderEditor();
  renderPreview();
  renderCounter();
  updateOutput();
}

// =====================================================
// STARTUP
// =====================================================

if (loadSavedSong()) {
  renderAll();
  setStatus("Loaded saved song");
} else {
  song = null;
  renderAll();
  setStatus("Ready");
}

console.log("MUSIC PAL LIVE initialized.");
