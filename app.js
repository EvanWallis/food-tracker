const STORAGE_KEY = "food-tracker-entries";
const WHOLE_GOAL = 80;

const form = document.querySelector("#entry-form");
const entriesList = document.querySelector("#entries");
const emptyState = document.querySelector("#empty");
const todayCount = document.querySelector("#today-count");
const todayWhole = document.querySelector("#today-whole");
const goalText = document.querySelector("#goal-text");
const wholeProgress = document.querySelector("#whole-progress");
const filters = document.querySelectorAll(".filter");
const clearToday = document.querySelector("#clear-today");
const exportBtn = document.querySelector("#export");
const wholeSlider = document.querySelector("input[name='wholePercent']");
const wholeValue = document.querySelector("#whole-value");
const chips = document.querySelectorAll(".chip");

const now = new Date();

const setDefaultTime = () => {
  const timeInput = form.elements.time;
  if (!timeInput.value) {
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    timeInput.value = `${hours}:${minutes}`;
  }
};

const loadEntries = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const saveEntries = (entries) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const calculateTodayStats = (entries) => {
  const today = new Date().toDateString();
  const todayEntries = entries.filter((entry) => new Date(entry.date).toDateString() === today);
  const avgWhole = todayEntries.length
    ? Math.round(todayEntries.reduce((sum, entry) => sum + entry.wholePercent, 0) / todayEntries.length)
    : 0;

  todayCount.textContent = todayEntries.length;
  todayWhole.textContent = `${avgWhole}%`;
  wholeProgress.style.width = `${Math.min(avgWhole, 100)}%`;
  goalText.textContent = avgWhole >= WHOLE_GOAL ? "Goal met ✅" : `Goal: ${WHOLE_GOAL}%`;
};

const renderEntries = (entries) => {
  entriesList.innerHTML = "";
  if (entries.length === 0) {
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  entries.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "entry";

    const header = document.createElement("div");
    header.className = "entry-header";

    const title = document.createElement("div");
    title.className = "entry-title";
    title.textContent = entry.food;

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    meta.textContent = `${formatDate(entry.date)} • ${entry.time} • ${entry.mood}`;

    const whole = document.createElement("div");
    whole.className = "entry-whole";
    whole.textContent = `Whole foods: ${entry.wholePercent}%`;

    header.append(title, meta, whole);

    const notes = document.createElement("div");
    notes.className = "entry-notes";
    notes.textContent = entry.notes || "No notes";

    li.append(header, notes);
    entriesList.append(li);
  });
};

const filterEntries = (entries, range) => {
  const now = new Date();
  if (range === "today") {
    return entries.filter((entry) => new Date(entry.date).toDateString() === now.toDateString());
  }
  if (range === "week") {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 6);
    return entries.filter((entry) => new Date(entry.date) >= weekAgo);
  }
  return entries;
};

const refresh = (range = "today") => {
  const entries = loadEntries().sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
  calculateTodayStats(entries);
  renderEntries(filterEntries(entries, range));
};

const updateWholeValue = (value) => {
  wholeValue.textContent = `${value}%`;
};

wholeSlider.addEventListener("input", (event) => {
  updateWholeValue(event.target.value);
});

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const value = chip.dataset.value;
    wholeSlider.value = value;
    updateWholeValue(value);
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const time = formData.get("time");
  const date = new Date();
  const entry = {
    id: crypto.randomUUID(),
    food: formData.get("food"),
    time,
    date: date.toISOString(),
    dateTime: new Date(`${date.toDateString()} ${time}`).toISOString(),
    mood: formData.get("mood"),
    notes: formData.get("notes"),
    wholePercent: Number(formData.get("wholePercent")) || 0,
  };

  const entries = loadEntries();
  entries.push(entry);
  saveEntries(entries);
  form.reset();
  setDefaultTime();
  wholeSlider.value = "80";
  updateWholeValue(wholeSlider.value);
  refresh(currentRange);
});

let currentRange = "today";
filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    currentRange = button.dataset.range;
    refresh(currentRange);
  });
});

clearToday.addEventListener("click", () => {
  const today = new Date().toDateString();
  const entries = loadEntries().filter((entry) => new Date(entry.date).toDateString() !== today);
  saveEntries(entries);
  refresh(currentRange);
});

exportBtn.addEventListener("click", () => {
  const entries = loadEntries();
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "food-tracker-export.json";
  link.click();
  URL.revokeObjectURL(url);
});

setDefaultTime();
updateWholeValue(wholeSlider.value);
refresh();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
