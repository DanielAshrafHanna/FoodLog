const STORAGE_KEY = "plate-log-data-v1";
const CLOUD_CACHE_KEY = "plate-log-cloud-cache-v1";
const PHOTO_BUCKET = "plate-photos";
const PRODUCTION_URL = "https://food.danyhanna.uk";
const SUPERUSER_EMAIL = "danielhanna0001@gmail.com";
const FILTER_PREFS_KEY = "plate-log-filters-v1";
const SYNC_PANEL_OPEN_KEY = "plate-log-sync-open-v1";

function getAuthRedirectUrl() {
  return window.location.origin;
}

function parsePeopleList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function parseVisited(value) {
  return parsePeopleList(value);
}

function editorEmail() {
  return state.session?.user?.email?.toLowerCase() ?? "";
}

function emailLocalPart(email) {
  const value = String(email ?? "").trim().toLowerCase();
  const at = value.indexOf("@");
  return at > 0 ? value.slice(0, at) : value;
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
}

function editorDisplayName() {
  if (!state.session?.user) return "";
  const { displayName, email } = sessionIdentity(state.session);
  return displayName.trim() || emailLocalPart(email);
}

function resolveUpdatedByLabel(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!looksLikeEmail(raw)) return raw;
  const mapped = state.editorDisplayNames[raw.toLowerCase()];
  if (mapped) return mapped;
  return emailLocalPart(raw);
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark-theme");
  localStorage.setItem("plate-log-theme", isDark ? "dark" : "light");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", isDark ? "#131416" : "#173f2d");
}

const seedData = [
  {
    id: crypto.randomUUID(),
    name: "Silkroad",
    location: "Maadi",
    cuisine: "Chinese",
    price: "$$",
    ratings: [
      { email: "dany", name: "Dany", rating: 4.5, updatedAt: Date.now() - 1000 * 60 * 60 * 12 },
      { email: "mina", name: "Mina", rating: 5, updatedAt: Date.now() - 1000 * 60 * 60 * 11 }
    ],
    maps: "https://maps.app.goo.gl/",
    notes: "Reliable comfort order. Great for noodles and tofu skins.",
    visited: ["Dany", "Mina"],
    playlists: ["Favorites", "Date night"],
    updatedAt: Date.now() - 1000 * 60 * 60 * 12,
    photos: [],
    dishes: [
      { id: crypto.randomUUID(), name: "Liang pi", rating: 5, likedBy: ["Dany", "Mina"], notes: "Cold, chewy, sharp sauce.", photo: "", photoPath: "" },
      { id: crypto.randomUUID(), name: "Tofu skins", rating: 5, likedBy: ["Dany", "Mina"], notes: "Repeat order.", photo: "", photoPath: "" },
      { id: crypto.randomUUID(), name: "Wide fried noodle", rating: 5, likedBy: ["Dany"], notes: "Best texture.", photo: "", photoPath: "" }
    ]
  },
  {
    id: crypto.randomUUID(),
    name: "Gaya",
    location: "Maadi",
    cuisine: "Korean",
    price: "$$$",
    ratings: [
      { email: "dany", name: "Dany", rating: 4, updatedAt: Date.now() - 1000 * 60 * 60 * 30 }
    ],
    maps: "",
    notes: "Good for groups.",
    visited: ["Dany", "Mina", "Paul"],
    playlists: ["Date night"],
    updatedAt: Date.now() - 1000 * 60 * 60 * 30,
    photos: [],
    dishes: [{ id: crypto.randomUUID(), name: "Bibimbap", rating: 4, likedBy: ["Mina"], notes: "", photo: "", photoPath: "" }]
  },
  {
    id: crypto.randomUUID(),
    name: "Hailong",
    location: "Madenet Nasr",
    cuisine: "Chinese",
    price: "$$",
    ratings: [],
    playlists: [],
    maps: "https://maps.app.goo.gl/",
    notes: "Waitress: Engy.",
    visited: ["Dany", "Mina"],
    updatedAt: Date.now() - 1000 * 60 * 7,
    photos: [],
    dishes: [{ id: crypto.randomUUID(), name: "Hand pulled noodles", rating: 5, likedBy: ["Dany"], notes: "Worth crossing town for.", photo: "", photoPath: "" }]
  }
];

const config = window.PLATE_LOG_CONFIG ?? {};
const canUseSupabase = Boolean(config.supabaseUrl && config.supabasePublishableKey && window.supabase);
const client = canUseSupabase
  ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        detectSessionInUrl: true,
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        storage: window.localStorage
      }
    })
  : null;

function authParamsFromUrl(url = new URL(window.location.href)) {
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const get = (key) => url.searchParams.get(key) || hashParams.get(key);
  return {
    code: get("code"),
    error: get("error"),
    errorCode: get("error_code"),
    errorDescription: get("error_description"),
    hashParams
  };
}

function decodeAuthError(value) {
  if (!value) return "";
  return decodeURIComponent(String(value).replace(/\+/g, " "));
}

function friendlyAuthError(error, errorCode) {
  const code = errorCode || "";
  const text = decodeAuthError(error) || decodeAuthError(errorCode) || String(error || "");

  if (code === "signup_disabled" || text.toLowerCase().includes("signup")) {
    return "New Google sign-ins are turned off in Supabase. Enable “Allow new users to sign up” under Authentication → Sign In / Providers (friends still need your approval to edit).";
  }

  if (code === "access_denied") {
    return text || "Google sign-in was cancelled.";
  }

  return text || "Google sign-in failed.";
}

function friendlySessionError(error) {
  const msg = error?.message || String(error || "");

  if (msg.includes("code verifier") || msg.includes("code_verifier")) {
    return "Google sign-in must finish in the same browser tab. Tap Continue with Google again — do not forward or open the link in another app.";
  }

  if (
    msg.toLowerCase().includes("invalid grant") ||
    msg.toLowerCase().includes("already been used") ||
    msg.toLowerCase().includes("auth code")
  ) {
    return "This sign-in link expired. Tap Continue with Google to start again.";
  }

  if (msg.toLowerCase().includes("timed out")) {
    return msg;
  }

  return msg || "Could not finish sign-in. Try again.";
}

function readAuthCallbackFromUrl() {
  const { error, errorCode, errorDescription } = authParamsFromUrl();

  // Only treat real OAuth errors as failures — ?code=... is a successful redirect, not an error.
  if (!error && !errorDescription) {
    return { error: null, errorCode: null };
  }

  return {
    error: friendlyAuthError(errorDescription || error, errorCode),
    errorCode
  };
}

function getOAuthCodeFromUrl() {
  return authParamsFromUrl().code;
}

function hasOAuthCallbackInUrl() {
  const url = new URL(window.location.href);
  const { code, error, errorDescription } = authParamsFromUrl(url);
  return Boolean(code || error || errorDescription || url.hash.includes("access_token"));
}

function withTimeout(promise, ms, message = "Request timed out") {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    })
  ]);
}

function stripAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  const { code, error, errorDescription } = authParamsFromUrl(url);
  const hadAuthParams =
    Boolean(code || error || errorDescription) ||
    url.hash.includes("access_token") ||
    url.hash.includes("error=");

  if (!hadAuthParams) return;

  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  if (
    url.hash.includes("access_token") ||
    url.hash.includes("error=") ||
    url.hash.includes("error_code=")
  ) {
    url.hash = "";
  }
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}

const state = {
  data: loadLocalData(),
  selectedId: null,
  editingRestaurantId: null,
  editingDishId: null,
  sort: "recent",
  pendingPhoto: "",
  pendingPhotoFile: null,
  session: null,
  remoteReady: false,
  canEdit: false,
  loading: false,
  syncError: null,
  lastSyncedAt: null,
  approvedUsers: [],
  pendingApprovals: [],
  checkingAccess: false,
  lookupLocations: [],
  lookupCuisines: [],
  lookupPlaylists: [],
  editorDisplayNames: {},
  panelView: "list",
  playlistFilter: "all",
  managingPlaylistName: null
};

let initialLoadDone = false;
let mapInstance = null;
let mapMarkers = [];
let authBootDone = false;
let remoteLoadInFlight = false;
let realtimeChannel = null;
let toastTimer = null;
let playlistLongPressTimer = null;
let suppressPlaylistChipClick = false;

const els = {
  restaurantList: document.querySelector("#restaurantList"),
  detailPanel: document.querySelector("#detailPanel"),
  searchInput: document.querySelector("#searchInput"),
  locationFilter: document.querySelector("#locationFilter"),
  cuisineFilter: document.querySelector("#cuisineFilter"),
  priceFilter: document.querySelector("#priceFilter"),
  ratingFilter: document.querySelector("#ratingFilter"),
  playlistSwitcher: document.querySelector("#playlistSwitcher"),
  playlistFilterHint: document.querySelector("#playlistFilterHint"),
  playlistBarTip: document.querySelector("#playlistBarTip"),
  playlistManageButton: document.querySelector("#playlistManageButton"),
  playlistManageModal: document.querySelector("#playlistManageModal"),
  playlistManageForm: document.querySelector("#playlistManageForm"),
  playlistManageEyebrow: document.querySelector("#playlistManageEyebrow"),
  playlistManageTitle: document.querySelector("#playlistManageTitle"),
  playlistRenameInput: document.querySelector("#playlistRenameInput"),
  playlistManageNote: document.querySelector("#playlistManageNote"),
  deletePlaylistButton: document.querySelector("#deletePlaylistButton"),
  closePlaylistManageModal: document.querySelector("#closePlaylistManageModal"),
  cancelPlaylistManageButton: document.querySelector("#cancelPlaylistManageButton"),
  restaurantCount: document.querySelector("#restaurantCount"),
  dishCount: document.querySelector("#dishCount"),
  avgRating: document.querySelector("#avgRating"),
  syncPanel: document.querySelector("#syncPanel"),
  syncPanelToggle: document.querySelector("#syncPanelToggle"),
  syncPanelBody: document.querySelector("#syncPanelBody"),
  syncStatus: document.querySelector("#syncStatus"),
  syncDetail: document.querySelector("#syncDetail"),
  ownerActions: document.querySelector("#ownerActions"),
  googleSignInButton: document.querySelector("#googleSignInButton"),
  authDivider: document.querySelector("#authDivider"),
  authForm: document.querySelector("#authForm"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  signOutButton: document.querySelector("#signOutButton"),
  restaurantModal: document.querySelector("#restaurantModal"),
  restaurantForm: document.querySelector("#restaurantForm"),
  modalEyebrow: document.querySelector("#modalEyebrow"),
  modalTitle: document.querySelector("#modalTitle"),
  nameInput: document.querySelector("#nameInput"),
  locationSelect: document.querySelector("#locationSelect"),
  locationInput: document.querySelector("#locationInput"),
  cuisineSelect: document.querySelector("#cuisineSelect"),
  cuisineInput: document.querySelector("#cuisineInput"),
  playlistPicker: document.querySelector("#playlistPicker"),
  playlistInput: document.querySelector("#playlistInput"),
  priceInput: document.querySelector("#priceInput"),
  ratingInput: document.querySelector("#ratingInput"),
  mapsInput: document.querySelector("#mapsInput"),
  notesInput: document.querySelector("#notesInput"),
  visitedInput: document.querySelector("#visitedInput"),
  deleteRestaurantButton: document.querySelector("#deleteRestaurantButton"),
  mobileAuthBar: document.querySelector("#mobileAuthBar"),
  mobileSignInButton: document.querySelector("#mobileSignInButton"),
  dishModal: document.querySelector("#dishModal"),
  dishForm: document.querySelector("#dishForm"),
  dishModalEyebrow: document.querySelector("#dishModalEyebrow"),
  dishModalTitle: document.querySelector("#dishModalTitle"),
  dishNameInput: document.querySelector("#dishNameInput"),
  dishRatingInput: document.querySelector("#dishRatingInput"),
  dishLikedByInput: document.querySelector("#dishLikedByInput"),
  dishPhotoInput: document.querySelector("#dishPhotoInput"),
  dishNotesInput: document.querySelector("#dishNotesInput"),
  photoPreview: document.querySelector("#photoPreview"),
  deleteDishButton: document.querySelector("#deleteDishButton"),
  photoLightbox: document.querySelector("#photoLightbox"),
  lightboxImage: document.querySelector("#lightboxImage"),
  closePhotoLightbox: document.querySelector("#closePhotoLightbox"),
  importInput: document.querySelector("#importInput"),
  themeToggleBtn: document.querySelector("#themeToggleBtn"),
  syncRetryButton: document.querySelector("#syncRetryButton"),
  adminPanel: document.querySelector("#adminPanel"),
  pendingList: document.querySelector("#pendingList"),
  approvedList: document.querySelector("#approvedList"),
  approveForm: document.querySelector("#approveForm"),
  approveEmail: document.querySelector("#approveEmail"),
  approveNote: document.querySelector("#approveNote"),
  addWaitingEmailButton: document.querySelector("#addWaitingEmailButton"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsModal: document.querySelector("#settingsModal"),
  closeSettingsModal: document.querySelector("#closeSettingsModal"),
  filterButton: document.querySelector("#filterButton"),
  filterBadge: document.querySelector("#filterBadge"),
  filterSheet: document.querySelector("#filterSheet"),
  closeFilterSheet: document.querySelector("#closeFilterSheet"),
  sortFilter: document.querySelector("#sortFilter"),
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
  applyFiltersButton: document.querySelector("#applyFiltersButton"),
  listCountValue: document.querySelector("#listCountValue"),
  ratingStarsRow: document.querySelector("#ratingStarsRow"),
  ratingReadout: document.querySelector("#ratingReadout"),
  ratingClear: document.querySelector("#ratingClear"),
  dishRatingStarsRow: document.querySelector("#dishRatingStarsRow"),
  dishRatingReadout: document.querySelector("#dishRatingReadout"),
  visitedPicker: document.querySelector("#visitedPicker"),
  likedByPicker: document.querySelector("#likedByPicker"),
  toast: document.querySelector("#toast"),
  mapPanel: document.querySelector("#mapPanel"),
  listLayout: document.querySelector("#listLayout"),
  restaurantMap: document.querySelector("#restaurantMap"),
  mapHint: document.querySelector("#mapHint")
};

state.selectedId = readPlaceFromUrl() ?? state.data[0]?.id ?? null;
loadFilterPrefs();

function loadLocalData() {
  const key = canUseSupabase ? CLOUD_CACHE_KEY : STORAGE_KEY;
  const stored = localStorage.getItem(key);
  if (!stored) return canUseSupabase ? [] : seedData;

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : (canUseSupabase ? [] : seedData);
  } catch {
    return canUseSupabase ? [] : seedData;
  }
}

function saveLocalData() {
  const key = canUseSupabase ? CLOUD_CACHE_KEY : STORAGE_KEY;
  localStorage.setItem(key, JSON.stringify(state.data));
}

function setSync(message, detail) {
  els.syncStatus.textContent = message;
  els.syncDetail.textContent = detail;
}

function setSyncPanelExpanded(open, persist = true) {
  if (!els.syncPanel || !els.syncPanelToggle) return;

  els.syncPanel.classList.toggle("sync-panel--expanded", open);
  els.syncPanel.classList.toggle("sync-panel--collapsed", !open);
  els.syncPanelToggle.setAttribute("aria-expanded", String(open));
  if (els.syncPanelBody) {
    els.syncPanelBody.hidden = !open;
  }

  if (persist) {
    localStorage.setItem(SYNC_PANEL_OPEN_KEY, open ? "1" : "0");
  }
}

function initSyncPanel() {
  if (!els.syncPanelToggle || !els.syncPanelBody) return;

  const saved = localStorage.getItem(SYNC_PANEL_OPEN_KEY);
  setSyncPanelExpanded(saved === "1", false);
}

function expandSyncPanel() {
  setSyncPanelExpanded(true);
}

function openSettings({ expandSync = false, focusEmail = false } = {}) {
  if (expandSync) expandSyncPanel();
  if (els.settingsModal && !els.settingsModal.open) {
    els.settingsModal.showModal();
  }
  if (focusEmail && els.emailInput && !els.emailInput.closest("[hidden]")) {
    requestAnimationFrame(() => els.emailInput.focus());
  }
}

function requireEditor() {
  if (!canUseSupabase) return true;

  if (!state.session) {
    setSync("Sign in needed", "Viewing is public. Sign in to request editing access.");
    openSettings({ expandSync: true, focusEmail: true });
    return false;
  }

  if (!state.canEdit) {
    setSync(
      "Waiting for approval",
      "You are signed in. The owner will see your email under Pending approval — you can browse until approved."
    );
    return false;
  }

  return true;
}

function isSuperuser() {
  return state.session?.user?.email?.toLowerCase() === SUPERUSER_EMAIL;
}

function uniqueValues(key) {
  return [...new Set(state.data.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

// Playlists are stored as an array per restaurant, so collect names across all of them.
function dataPlaylistNames() {
  const names = new Set();
  for (const restaurant of state.data) {
    (restaurant.playlists ?? []).forEach((name) => name && names.add(name));
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function lookupListFor(key) {
  if (key === "location") return state.lookupLocations;
  if (key === "cuisine") return state.lookupCuisines;
  if (key === "playlist") return state.lookupPlaylists;
  return [];
}

function mergedLookupOptions(key) {
  const fromLog = lookupListFor(key);
  const fromData = key === "playlist" ? dataPlaylistNames() : uniqueValues(key);
  return [...new Set([...fromLog, ...fromData])].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function parseMapsCoordinates(mapsUrl) {
  if (!mapsUrl) return null;
  const url = String(mapsUrl);
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
  return null;
}

async function loadLookups() {
  if (!client) {
    state.lookupLocations = uniqueValues("location");
    state.lookupCuisines = uniqueValues("cuisine");
    state.lookupPlaylists = dataPlaylistNames();
    renderPlaylistFilter();
    return;
  }

  const [locationsResult, cuisinesResult, playlistsResult] = await Promise.all([
    client.from("locations").select("name").order("name"),
    client.from("cuisines").select("name").order("name"),
    client.from("playlists").select("name").order("name")
  ]);

  const locationNames = (locationsResult.data ?? []).map((row) => row.name);
  const cuisineNames = (cuisinesResult.data ?? []).map((row) => row.name);
  const playlistNames = playlistsResult.error ? [] : (playlistsResult.data ?? []).map((row) => row.name);
  if (playlistsResult.error) {
    console.warn("playlists load failed", playlistsResult.error.message);
  }

  state.lookupLocations = [...new Set([...locationNames, ...uniqueValues("location")])].sort((a, b) =>
    a.localeCompare(b)
  );
  state.lookupCuisines = [...new Set([...cuisineNames, ...uniqueValues("cuisine")])].sort((a, b) =>
    a.localeCompare(b)
  );
  state.lookupPlaylists = [...new Set([...playlistNames, ...dataPlaylistNames()])].sort((a, b) =>
    a.localeCompare(b)
  );
  renderPlaylistFilter();
}

async function registerLookupValues(location, cuisine, playlists = []) {
  if (!client || !state.canEdit) return;

  const tasks = [];
  if (location?.trim()) {
    tasks.push(client.from("locations").upsert({ name: location.trim() }, { onConflict: "name" }));
  }
  if (cuisine?.trim()) {
    tasks.push(client.from("cuisines").upsert({ name: cuisine.trim() }, { onConflict: "name" }));
  }
  const playlistNames = (Array.isArray(playlists) ? playlists : [playlists])
    .map((name) => String(name ?? "").trim())
    .filter(Boolean);
  for (const name of playlistNames) {
    tasks.push(client.from("playlists").upsert({ name }, { onConflict: "name" }));
  }
  if (tasks.length) await Promise.all(tasks);
  await loadLookups();
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function ratingWidth(rating) {
  return `${Math.max(0, Math.min(Number(rating) || 0, 5)) * 20}%`;
}

// Identity used to attribute a rating. In cloud mode this is the signed-in user;
// in local-only mode (no Supabase) we fall back to a single local identity.
function currentRaterIdentity() {
  const email = editorEmail();
  if (email) return { email, name: editorDisplayName() || emailLocalPart(email) };
  return { email: "you", name: "You" };
}

function restaurantRatings(restaurant) {
  return Array.isArray(restaurant?.ratings) ? restaurant.ratings : [];
}

// Average of everyone's individual ratings, or null when nobody has rated yet.
function averageRating(restaurant) {
  const ratings = restaurantRatings(restaurant);
  if (!ratings.length) return null;
  const sum = ratings.reduce((total, entry) => total + Number(entry.rating || 0), 0);
  return sum / ratings.length;
}

function formatRating(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "";
  const num = Number(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

// The current user's own rating for a restaurant, or null if they haven't rated it.
function myRatingFor(restaurant) {
  const { email } = currentRaterIdentity();
  const mine = restaurantRatings(restaurant).find(
    (entry) => entry.email.toLowerCase() === email.toLowerCase()
  );
  return mine ? Number(mine.rating) : null;
}

function ratingLabelFor(entry) {
  const resolved = resolveUpdatedByLabel(entry.name || entry.email);
  return resolved || entry.name || emailLocalPart(entry.email) || "Someone";
}

// ----- Interactive star pickers (restaurant + dish) -----
// Tap or slide on the track; snaps to half stars (0.5–5). Restaurant allows "none".
let restaurantStarPicker = null;
let dishStarPicker = null;

function paintStarsFill(fillEl, value) {
  if (!fillEl) return;
  const pct = value === null ? 0 : Math.max(0, Math.min(value, 5)) * 20;
  fillEl.style.width = `${pct}%`;
}

function pickerCurrentValue(picker) {
  const raw = picker.input?.value;
  if (picker.allowNone && (raw === "none" || raw === "" || raw == null)) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function ratingFromPointerEvent(track, event) {
  if (!track) return null;
  const rect = track.getBoundingClientRect();
  if (rect.width <= 0) return null;
  const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
  const step = Math.max(1, Math.min(10, Math.ceil((x / rect.width) * 10)));
  return step * 0.5;
}

function pickerReadoutText(picker, value) {
  if (value === null) return picker.allowNone ? "No rating" : `${formatRating(picker.fallbackValue)} / 5`;
  return `${formatRating(value)} / 5`;
}

function setPickerValue(picker, value) {
  if (!picker?.input) return;
  const normalized =
    value === null || value === undefined || value === "none"
      ? picker.allowNone
        ? null
        : picker.fallbackValue
      : Number(value);
  picker.input.value = normalized === null ? "none" : String(normalized);
  paintStarsFill(picker.fillEl, normalized);
  if (picker.readout) picker.readout.textContent = pickerReadoutText(picker, normalized);
  if (picker.clearButton) picker.clearButton.hidden = normalized === null;
  if (picker.track) {
    picker.track.setAttribute("aria-valuenow", normalized === null ? "0" : String(normalized));
    picker.track.setAttribute(
      "aria-valuetext",
      normalized === null ? "No rating" : `${formatRating(normalized)} out of 5`
    );
  }
}

function previewPickerFromPointer(picker, event) {
  const value = ratingFromPointerEvent(picker.track, event);
  if (value === null) return;
  paintStarsFill(picker.fillEl, value);
  if (picker.readout) picker.readout.textContent = `${formatRating(value)} / 5`;
}

function endPickerDrag(picker, event) {
  const { track } = picker;
  if (!track) return;
  picker.dragging = false;
  track.classList.remove("is-dragging");
  if (track.hasPointerCapture(event.pointerId)) {
    track.releasePointerCapture(event.pointerId);
  }
  const value = ratingFromPointerEvent(track, event);
  if (value !== null) setPickerValue(picker, value);
  else setPickerValue(picker, pickerCurrentValue(picker));
}

function wireStarPicker(picker) {
  const { track } = picker;
  if (!track || track.dataset.starInputReady === "1") return;
  track.dataset.starInputReady = "1";
  picker.fillEl = track.querySelector(".stars-fill");

  track.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    picker.dragging = true;
    track.classList.add("is-dragging");
    track.setPointerCapture(event.pointerId);
    previewPickerFromPointer(picker, event);
  });

  track.addEventListener("pointermove", (event) => {
    const dragging = picker.dragging || track.hasPointerCapture(event.pointerId);
    if (dragging) {
      previewPickerFromPointer(picker, event);
      return;
    }
    if (event.pointerType === "touch") return;
    previewPickerFromPointer(picker, event);
  });

  track.addEventListener("pointerup", (event) => endPickerDrag(picker, event));
  track.addEventListener("pointercancel", (event) => endPickerDrag(picker, event));
  track.addEventListener("pointerleave", () => {
    if (picker.dragging) return;
    setPickerValue(picker, pickerCurrentValue(picker));
  });

  track.addEventListener("keydown", (event) => {
    const current = pickerCurrentValue(picker) ?? 0;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setPickerValue(picker, Math.min(5, current + 0.5));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = current - 0.5;
      if (picker.allowNone && next < 0.5) setPickerValue(picker, null);
      else setPickerValue(picker, Math.max(0.5, next));
    } else if (event.key === "Home" || event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      setPickerValue(picker, picker.allowNone ? null : 0.5);
    } else if (event.key === "End") {
      event.preventDefault();
      setPickerValue(picker, 5);
    }
  });

  picker.clearButton?.addEventListener("click", () => setPickerValue(picker, null));
}

function buildStarInputs() {
  restaurantStarPicker = {
    track: els.ratingStarsRow,
    input: els.ratingInput,
    readout: els.ratingReadout,
    clearButton: els.ratingClear,
    allowNone: true,
    fallbackValue: 4,
    dragging: false,
    fillEl: null
  };
  dishStarPicker = {
    track: els.dishRatingStarsRow,
    input: els.dishRatingInput,
    readout: els.dishRatingReadout,
    clearButton: null,
    allowNone: false,
    fallbackValue: 4,
    dragging: false,
    fillEl: null
  };
  wireStarPicker(restaurantStarPicker);
  wireStarPicker(dishStarPicker);
}

function setRatingValue(value) {
  setPickerValue(restaurantStarPicker, value);
}

function setDishRatingValue(value) {
  setPickerValue(dishStarPicker, value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const PILL_ICONS = {
  location:
    '<svg class="pill-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5c0 4.1 5 11 5 11s5-6.9 5-11a5 5 0 0 0-5-5zm0 7.25A2.25 2.25 0 1 1 12 4.5a2.25 2.25 0 0 1 0 4.75z"/></svg>',
  cuisine:
    '<svg class="pill-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 9V2H9v7H7V2H5v7c0 2.21 1.79 4 4 4v9h2v-9c2.21 0 4-1.79 4-4zm9 0V2h-2v7h-2V2h-2v7c0 2.21 1.79 4 4 4v9h2v-9c2.21 0 4-1.79 4-4z"/></svg>',
  price:
    '<svg class="pill-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.91c-1.65-.37-2.86-1.61-2.95-3.1h2.08c.08 1.05.93 1.9 2.07 1.9s2.01-.86 2.01-1.91c0-1.07-.77-1.76-2.03-1.98l-1.48-.23c-2.15-.34-3.3-1.48-3.3-3.16 0-1.8 1.28-3.04 3.03-3.28V4h2.67v1.95c1.29.25 2.24 1.18 2.4 2.39h-2.07c-.11-.72-.68-1.26-1.56-1.26-.98 0-1.58.65-1.58 1.58 0 .91.65 1.57 2.05 1.77l1.48.23c2.18.34 3.29 1.48 3.29 3.18-.01 1.95-1.4 3.21-3.16 3.51z"/></svg>',
  dishes:
    '<svg class="pill-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm10 0h-2V2h-2v7h-2V2h-2v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C21.34 12.84 23 11.12 23 9V2h-2v7z"/></svg>',
  playlist:
    '<svg class="pill-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zm13.5-6.5 1.41 1.41L16 13.83V22h-2v-8.17l-3.91 3.91-1.41-1.41L13 11.17V2h2v7.17l3.5-3.67z"/></svg>'
};

function metaPill(kind, text) {
  const label = String(text ?? "").trim();
  if (!label) return "";
  const icon = PILL_ICONS[kind] ?? "";
  return `<span class="pill ${kind}"><span class="pill-inner">${icon}<span class="pill-label">${escapeHtml(label)}</span></span></span>`;
}

function splitPeople(value) {
  return parsePeopleList(value);
}

function readPlaceFromUrl() {
  const id = new URL(window.location.href).searchParams.get("place");
  return id || null;
}

function updatePlaceUrl(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("place", id);
  else url.searchParams.delete("place");
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}

function getShareUrl(restaurantId) {
  const url = new URL(window.location.href);
  url.searchParams.set("place", restaurantId);
  return url.toString();
}

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.hidden = false;
  els.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove("visible");
    setTimeout(() => {
      els.toast.hidden = true;
    }, 260);
  }, 2800);
}

function saveFilterPrefs() {
  localStorage.setItem(
    FILTER_PREFS_KEY,
    JSON.stringify({
      search: els.searchInput.value,
      location: els.locationFilter.value,
      cuisine: els.cuisineFilter.value,
      price: els.priceFilter.value,
      rating: els.ratingFilter.value,
      playlist: state.playlistFilter,
      sort: state.sort,
      view: state.panelView
    })
  );
}

function loadFilterPrefs() {
  try {
    const raw = localStorage.getItem(FILTER_PREFS_KEY);
    if (!raw) return;
    const prefs = JSON.parse(raw);
    if (prefs.search != null) els.searchInput.value = prefs.search;
    if (prefs.location) els.locationFilter.value = prefs.location;
    if (prefs.cuisine) els.cuisineFilter.value = prefs.cuisine;
    if (prefs.price) els.priceFilter.value = prefs.price;
    if (prefs.rating != null) els.ratingFilter.value = prefs.rating;
    if (prefs.playlist) state.playlistFilter = prefs.playlist;
    if (prefs.sort) state.sort = prefs.sort;
    if (prefs.view === "map" || prefs.view === "list") state.panelView = prefs.view;
    if (els.sortFilter) els.sortFilter.value = state.sort;
    document.querySelectorAll("[data-sort]").forEach((button) => {
      button.classList.toggle("active", button.dataset.sort === state.sort);
    });
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === state.panelView);
    });
  } catch {
    // Ignore corrupt prefs.
  }
}

// Count active (non-default) filters for the Filter button badge.
function activeFilterCount() {
  let count = 0;
  if (els.locationFilter && els.locationFilter.value && els.locationFilter.value !== "all") count += 1;
  if (els.cuisineFilter && els.cuisineFilter.value && els.cuisineFilter.value !== "all") count += 1;
  if (els.priceFilter && els.priceFilter.value && els.priceFilter.value !== "all") count += 1;
  if (els.ratingFilter && els.ratingFilter.value && els.ratingFilter.value !== "0") count += 1;
  if (state.sort && state.sort !== "recent") count += 1;
  return count;
}

function updateFilterBadge() {
  if (!els.filterBadge) return;
  const count = activeFilterCount();
  if (count > 0) {
    els.filterBadge.textContent = String(count);
    els.filterBadge.hidden = false;
  } else {
    els.filterBadge.hidden = true;
  }
}

function getKnownPeople() {
  const names = new Set();
  for (const restaurant of state.data) {
    (restaurant.visited ?? []).forEach((name) => names.add(name));
    for (const dish of restaurant.dishes ?? []) {
      (dish.likedBy ?? []).forEach((name) => names.add(name));
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function getKnownPlaylists() {
  return mergedLookupOptions("playlist");
}

function syncChipHiddenInput(picker, hiddenInput) {
  const names = [...picker.querySelectorAll(".picker-chip.active")].map((chip) => chip.dataset.name);
  hiddenInput.value = names.join(", ");
}

function makeChip(name, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `chip-button picker-chip${active ? " active" : ""}`;
  button.dataset.name = name;
  button.textContent = name;
  return button;
}

// Generic chip multi-select used by both the "Visited by" people picker and the
// playlist picker. Builds the chips once with real DOM nodes; toggling later only
// flips a class on the tapped chip instead of rebuilding innerHTML. The old
// rebuild-on-click approach reflowed the list under the user's finger, so a single
// tap could land on a neighbouring chip and select extras. One delegated listener
// also avoids stacking handlers.
function renderChipMultiSelect(container, selected, knownNames, hiddenInput, addPlaceholder) {
  if (!container || !hiddenInput) return;

  const selectedSet = new Set((selected ?? []).filter(Boolean));
  const known = new Set(knownNames ?? []);
  selectedSet.forEach((name) => known.add(name));
  const options = [...known].sort((a, b) => a.localeCompare(b));

  const picker = document.createElement("div");
  picker.className = "chip-picker";
  options.forEach((name) => picker.appendChild(makeChip(name, selectedSet.has(name))));

  const addInput = document.createElement("input");
  addInput.className = "people-add-input";
  addInput.type = "text";
  addInput.placeholder = addPlaceholder;
  addInput.autocomplete = "off";
  picker.appendChild(addInput);

  container.replaceChildren(picker);
  syncChipHiddenInput(picker, hiddenInput);

  picker.addEventListener("click", (event) => {
    const chip = event.target.closest(".picker-chip");
    if (!chip || !picker.contains(chip)) return;
    chip.classList.toggle("active");
    syncChipHiddenInput(picker, hiddenInput);
  });

  addInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const name = addInput.value.trim();
    if (!name) return;

    const existing = [...picker.querySelectorAll(".picker-chip")].find(
      (chip) => chip.dataset.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      existing.classList.add("active");
    } else {
      picker.insertBefore(makeChip(name, true), addInput);
    }
    addInput.value = "";
    syncChipHiddenInput(picker, hiddenInput);
  });
}

function renderPeoplePicker(container, selected, hiddenInput) {
  renderChipMultiSelect(container, selected, getKnownPeople(), hiddenInput, "Add name, Enter");
}

function renderPlaylistPicker(container, selected, hiddenInput) {
  renderChipMultiSelect(container, selected, getKnownPlaylists(), hiddenInput, "Add playlist, Enter");
}

function toMillis(value) {
  if (!value) return Date.now();
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}

async function compressImage(file, maxDimension = 1200, quality = 0.8) {
  if (!file || !file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // Preserve base name but normalize extension to jpg since we are encoding as JPEG
          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now()
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      resolve(file);
    };
  });
}

function currentRestaurant() {
  return state.data.find((restaurant) => restaurant.id === state.selectedId) ?? state.data[0] ?? null;
}

function restaurantToRow(restaurant) {
  const row = {
    name: restaurant.name,
    location: restaurant.location,
    cuisine: restaurant.cuisine,
    playlists: restaurant.playlists ?? [],
    // Keep the legacy single column in sync (first playlist) for older cached clients.
    playlist: (restaurant.playlists ?? [])[0] ?? "",
    price: restaurant.price,
    maps: restaurant.maps,
    notes: restaurant.notes,
    visited: restaurant.visited ?? [],
    updated_at: new Date().toISOString()
  };
  const by = editorDisplayName();
  if (by) row.updated_by = by;
  return row;
}

// Upsert or clear the signed-in user's own rating for a restaurant.
// value is a number (0.5–5) to set, or null/"none" to remove their rating.
async function saveMyRatingRemote(restaurantId, value) {
  if (!client) return;
  const { email, name } = currentRaterIdentity();
  if (!email) return;

  if (value === null || value === undefined || value === "none" || value === "") {
    const { error } = await client
      .from("restaurant_ratings")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("rater_email", email);
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from("restaurant_ratings")
    .upsert(
      { restaurant_id: restaurantId, rater_email: email, rater_name: name, rating: Number(value) },
      { onConflict: "restaurant_id,rater_email" }
    );
  if (error) throw error;
}

// Owner-only: remove any user's rating for a restaurant (moderation).
async function removeRating(email) {
  const restaurant = currentRestaurant();
  const target = String(email ?? "").toLowerCase();
  if (!restaurant || !target || !isSuperuser()) return;

  const entry = restaurantRatings(restaurant).find((item) => item.email.toLowerCase() === target);
  const label = entry ? ratingLabelFor(entry) : target;
  if (!confirm(`Remove ${label}'s rating for ${restaurant.name}?`)) return;

  try {
    if (state.remoteReady) {
      const { error } = await client
        .from("restaurant_ratings")
        .delete()
        .eq("restaurant_id", restaurant.id)
        .eq("rater_email", target);
      if (error) throw error;
      await loadRemoteData();
    } else {
      restaurant.ratings = restaurantRatings(restaurant).filter(
        (item) => item.email.toLowerCase() !== target
      );
      saveLocalData();
      render();
    }
  } catch (error) {
    alert(error.message);
  }
}

// Local-only mode equivalent: mutate the in-memory ratings array.
function applyMyRatingLocal(restaurant, value) {
  const { email, name } = currentRaterIdentity();
  const others = restaurantRatings(restaurant).filter(
    (entry) => entry.email.toLowerCase() !== email.toLowerCase()
  );
  if (value === null || value === undefined || value === "none" || value === "") {
    restaurant.ratings = others;
  } else {
    restaurant.ratings = [...others, { email, name, rating: Number(value), updatedAt: Date.now() }].sort(
      (a, b) => b.rating - a.rating
    );
  }
}

function dishToRow(dish, restaurantId, photoPath = dish.photoPath ?? "") {
  const row = {
    restaurant_id: restaurantId,
    name: dish.name,
    rating: Number(dish.rating),
    liked_by: dish.likedBy ?? [],
    notes: dish.notes,
    photo_path: photoPath,
    updated_at: new Date().toISOString()
  };
  const by = editorDisplayName();
  if (by) row.updated_by = by;
  return row;
}

function restaurantPhotoToRow(restaurantId, photoPath) {
  return {
    restaurant_id: restaurantId,
    photo_path: photoPath
  };
}

function publicPhotoUrl(path) {
  if (!client || !path) return "";
  return client.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function loadRemoteData(options = {}) {
  if (remoteLoadInFlight) return;
  remoteLoadInFlight = true;

  const { reason } = options;
  const isFirstLoad = state.data.length === 0;
  if (isFirstLoad) {
    state.loading = true;
    render();
  } else {
    if (state.session) {
      setSync("Syncing...", "Fetching latest data from Cloud...");
    }
  }

  try {
    const { data, error } = await client
      .from("restaurants")
      .select("id,name,location,cuisine,playlist,playlists,price,rating,maps,notes,visited,updated_at,updated_by,restaurant_ratings(rater_email,rater_name,rating,updated_at),restaurant_photos(id,photo_path,created_at),dishes(id,name,rating,liked_by,notes,photo_path,updated_at,updated_by)")
      .order("updated_at", { ascending: false });

    if (error) {
      state.syncError = error.message;
      setSync("Cloud error", error.message);
      state.loading = false;
      render();
      return;
    }

    const parsedData = await Promise.all(
      data.map(async (restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        location: restaurant.location,
        cuisine: restaurant.cuisine,
        playlists:
          Array.isArray(restaurant.playlists) && restaurant.playlists.length
            ? restaurant.playlists.filter(Boolean)
            : restaurant.playlist
              ? [restaurant.playlist]
              : [],
        price: restaurant.price,
        ratings: (restaurant.restaurant_ratings ?? [])
          .map((entry) => ({
            email: (entry.rater_email ?? "").toLowerCase(),
            name: entry.rater_name ?? "",
            rating: Number(entry.rating),
            updatedAt: toMillis(entry.updated_at)
          }))
          .sort((a, b) => b.rating - a.rating),
        maps: restaurant.maps ?? "",
        notes: restaurant.notes ?? "",
        visited: restaurant.visited ?? [],
        updatedBy: restaurant.updated_by ?? "",
        updatedAt: toMillis(restaurant.updated_at),
        photos: (restaurant.restaurant_photos ?? [])
          .sort((a, b) => toMillis(b.created_at) - toMillis(a.created_at))
          .map((photo) => ({
            id: photo.id,
            photoPath: photo.photo_path ?? "",
            photo: publicPhotoUrl(photo.photo_path),
            createdAt: toMillis(photo.created_at)
          })),
        dishes: await Promise.all(
          (restaurant.dishes ?? [])
            .sort((a, b) => toMillis(b.updated_at) - toMillis(a.updated_at))
            .map(async (dish) => ({
              id: dish.id,
              name: dish.name,
              rating: Number(dish.rating),
              likedBy: dish.liked_by ?? [],
              notes: dish.notes ?? "",
              photoPath: dish.photo_path ?? "",
              photo: publicPhotoUrl(dish.photo_path),
              updatedBy: dish.updated_by ?? "",
              updatedAt: toMillis(dish.updated_at)
            }))
        )
      }))
    );

    state.data = parsedData;
    saveLocalData();

    const urlPlace = readPlaceFromUrl();
    if (urlPlace && state.data.some((item) => item.id === urlPlace)) {
      state.selectedId = urlPlace;
    } else {
      state.selectedId = state.data.some((item) => item.id === state.selectedId) ? state.selectedId : state.data[0]?.id ?? null;
    }
    state.loading = false;
    state.remoteReady = true;
    state.syncError = null;
    state.lastSyncedAt = Date.now();
    if (reason === "realtime") showToast("Log updated");
    await Promise.all([loadLookups(), loadEditorProfiles()]);
    render();
    if (isSuperuser()) loadAdminData();
  } catch (err) {
    state.syncError = err.message || "Network error";
    setSync("Sync failed", `${state.syncError} Tap sync panel to retry.`);
    state.loading = false;
    render();
  } finally {
    remoteLoadInFlight = false;
  }
}

async function uploadDishPhoto(file, existingPath = "") {
  if (!client || !state.session || !file) return existingPath;

  const compressed = await compressImage(file);
  const extension = compressed.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${state.session.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, compressed, {
    cacheControl: "31536000",
    upsert: false
  });

  if (error) throw error;

  if (existingPath) {
    await client.storage.from(PHOTO_BUCKET).remove([existingPath]);
  }

  return path;
}

async function uploadRestaurantPhoto(file) {
  if (!client || !state.session || !file) return "";

  const compressed = await compressImage(file);
  const extension = compressed.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${state.session.user.id}/restaurants/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, compressed, {
    cacheControl: "31536000",
    upsert: false
  });

  if (error) throw error;
  return path;
}

async function saveRestaurantRemote(payload, existingId) {
  if (existingId) {
    const { error } = await client.from("restaurants").update(payload).eq("id", existingId);
    if (error) throw error;
    return existingId;
  }

  const { data, error } = await client.from("restaurants").insert(payload).select("id").single();
  if (error) throw error;
  return data.id;
}

async function saveDishRemote(restaurant, payload, existingDish) {
  const photoPath = await uploadDishPhoto(state.pendingPhotoFile, existingDish?.photoPath ?? "");
  const row = dishToRow(payload, restaurant.id, photoPath);

  if (existingDish) {
    const { error } = await client.from("dishes").update(row).eq("id", existingDish.id);
    if (error) throw error;
    return;
  }

  const { error } = await client.from("dishes").insert(row);
  if (error) throw error;
}

async function saveRestaurantPhotosRemote(restaurant, files) {
  const rows = [];

  for (const file of files) {
    const photoPath = await uploadRestaurantPhoto(file);
    rows.push(restaurantPhotoToRow(restaurant.id, photoPath));
  }

  if (!rows.length) return;

  const { error } = await client.from("restaurant_photos").insert(rows);
  if (error) throw error;
}

function filteredRestaurants() {
  const query = els.searchInput.value.trim().toLowerCase();
  const location = els.locationFilter.value;
  const cuisine = els.cuisineFilter.value;
  const price = els.priceFilter.value;
  const minRating = Number(els.ratingFilter.value);
  const playlist = state.playlistFilter ?? "all";

  const filtered = state.data.filter((restaurant) => {
    const dishText = restaurant.dishes.map((dish) => `${dish.name} ${dish.notes} ${(dish.likedBy ?? []).join(" ")}`).join(" ");
    const visitedText = (restaurant.visited ?? []).join(" ");
    const playlistsValue = (restaurant.playlists ?? []).filter(Boolean);
    const searchText =
      `${restaurant.name} ${restaurant.location} ${restaurant.cuisine} ${playlistsValue.join(" ")} ${restaurant.notes} ${visitedText} ${dishText}`.toLowerCase();
    const playlistMatch =
      playlist === "all" ||
      (playlist === "__none__" ? playlistsValue.length === 0 : playlistsValue.includes(playlist));
    return (
      (!query || searchText.includes(query)) &&
      playlistMatch &&
      (location === "all" || restaurant.location === location) &&
      (cuisine === "all" || restaurant.cuisine === cuisine) &&
      (price === "all" || restaurant.price === price) &&
      // Unrated places only pass when no minimum is set ("Any rating").
      (minRating <= 0 || (averageRating(restaurant) ?? -1) >= minRating)
    );
  });

  return filtered.sort((a, b) => {
    if (state.sort === "rating") return (averageRating(b) ?? -1) - (averageRating(a) ?? -1);
    if (state.sort === "name") return a.name.localeCompare(b.name);
    return Number(b.updatedAt) - Number(a.updatedAt);
  });
}

function setPanelView(view) {
  state.panelView = view === "map" ? "map" : "list";
  localStorage.setItem("plate-log-view-v1", state.panelView);

  if (els.mapPanel) els.mapPanel.hidden = state.panelView !== "map";
  if (els.listLayout) els.listLayout.hidden = state.panelView === "map";

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.panelView);
  });

  if (state.panelView === "map") {
    renderMapView();
  } else {
    renderList();
  }
}

function renderMapView() {
  if (!els.restaurantMap || !window.L) return;

  const restaurants = filteredRestaurants().filter((r) => parseMapsCoordinates(r.maps));
  const withCoords = restaurants
    .map((r) => ({ restaurant: r, coords: parseMapsCoordinates(r.maps) }))
    .filter((item) => item.coords);

  if (els.mapHint) {
    const missing = filteredRestaurants().length - withCoords.length;
    els.mapHint.textContent =
      withCoords.length === 0
        ? "No places with map coordinates yet. Add a Google Maps link when editing a restaurant."
        : `${withCoords.length} on map${missing > 0 ? ` · ${missing} without a parseable Maps URL` : ""}`;
  }

  if (!mapInstance) {
    mapInstance = window.L.map(els.restaurantMap, { scrollWheelZoom: true }).setView([30.0444, 31.2357], 11);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(mapInstance);
  }

  mapMarkers.forEach((marker) => mapInstance.removeLayer(marker));
  mapMarkers = [];

  withCoords.forEach(({ restaurant, coords }) => {
    const marker = window.L.marker([coords.lat, coords.lng]).addTo(mapInstance);
    marker.bindPopup(`<strong>${escapeHtml(restaurant.name)}</strong><br>${escapeHtml(restaurant.location)}`);
    marker.on("click", () => {
      state.selectedId = restaurant.id;
      updatePlaceUrl(restaurant.id);
      setPanelView("list");
      render();
      if (window.innerWidth <= 980) {
        els.detailPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    mapMarkers.push(marker);
  });

  if (withCoords.length) {
    const bounds = window.L.latLngBounds(withCoords.map((item) => [item.coords.lat, item.coords.lng]));
    mapInstance.fitBounds(bounds.pad(0.15));
  }

  setTimeout(() => mapInstance?.invalidateSize(), 100);
}

function playlistCounts() {
  const counts = { all: state.data.length, __none__: 0 };
  for (const restaurant of state.data) {
    const names = (restaurant.playlists ?? []).filter(Boolean);
    if (!names.length) counts.__none__ += 1;
    else names.forEach((name) => (counts[name] = (counts[name] ?? 0) + 1));
  }
  return counts;
}

let lastCenteredPlaylist = null;

function scrollActivePlaylistChipIntoView(smooth = true) {
  const strip = els.playlistSwitcher;
  const active = strip?.querySelector(".playlist-chip.active");
  if (!strip || !active) return;
  // Scroll the strip horizontally only. Using element.scrollIntoView() here would also scroll
  // every ancestor (including the page), yanking the whole view to the top when the bar is
  // above the viewport. Setting scrollLeft keeps the page position untouched.
  const target = active.offsetLeft - (strip.clientWidth - active.clientWidth) / 2;
  strip.scrollTo({ left: Math.max(0, target), behavior: smooth ? "smooth" : "auto" });
}

function isEditablePlaylist(value) {
  return Boolean(value && value !== "all" && value !== "__none__");
}

function playlistPlaceCount(name) {
  return state.data.filter((restaurant) => (restaurant.playlists ?? []).includes(name)).length;
}

function updatePlaylistManageControls() {
  const canManage = (state.canEdit || !canUseSupabase) && isEditablePlaylist(state.playlistFilter);
  if (els.playlistManageButton) {
    els.playlistManageButton.hidden = !canManage;
  }
  if (els.playlistBarTip) {
    els.playlistBarTip.hidden = !(state.canEdit || !canUseSupabase);
  }
}

function openPlaylistManageModal(name) {
  if (!requireEditor()) return;
  if (!isEditablePlaylist(name)) return;

  state.managingPlaylistName = name;
  const count = playlistPlaceCount(name);

  if (els.playlistManageEyebrow) els.playlistManageEyebrow.textContent = "Manage playlist";
  if (els.playlistManageTitle) els.playlistManageTitle.textContent = name;
  if (els.playlistRenameInput) {
    els.playlistRenameInput.value = name;
    els.playlistRenameInput.select();
  }
  if (els.playlistManageNote) {
    els.playlistManageNote.textContent =
      count === 1 ? "1 place uses this playlist." : `${count} places use this playlist.`;
  }

  els.playlistManageModal?.showModal();
  els.playlistRenameInput?.focus();
}

function closePlaylistManageModal() {
  els.playlistManageModal?.close();
  els.playlistManageForm?.reset();
  state.managingPlaylistName = null;
}

async function syncPlaylistLookup(oldName, newName = "") {
  if (!client || !state.canEdit) return;

  if (oldName?.trim()) {
    await client.from("playlists").delete().eq("name", oldName.trim());
  }
  if (newName?.trim()) {
    await client.from("playlists").upsert({ name: newName.trim() }, { onConflict: "name" });
  }
}

async function renamePlaylist(oldName, newName) {
  const fromName = oldName.trim();
  const toName = newName.trim();
  if (!fromName || !toName) throw new Error("Playlist name is required.");
  if (fromName === toName) return;

  const existing = mergedLookupOptions("playlist");
  if (existing.includes(toName) && toName !== fromName) {
    throw new Error(`"${toName}" already exists. Pick a different name.`);
  }

  const count = playlistPlaceCount(fromName);
  // Replace fromName with toName inside each restaurant's playlists array (dedupe).
  const nextPlaylistsFor = (restaurant) => {
    const next = (restaurant.playlists ?? []).map((name) => (name === fromName ? toName : name));
    return [...new Set(next.filter(Boolean))];
  };
  const by = editorDisplayName();

  if (state.remoteReady) {
    const affected = state.data.filter((restaurant) => (restaurant.playlists ?? []).includes(fromName));
    await Promise.all(
      affected.map((restaurant) => {
        const patch = { playlists: nextPlaylistsFor(restaurant), updated_at: new Date().toISOString() };
        patch.playlist = patch.playlists[0] ?? "";
        if (by) patch.updated_by = by;
        return client.from("restaurants").update(patch).eq("id", restaurant.id);
      })
    );
    await syncPlaylistLookup(fromName, toName);
    await loadRemoteData();
  } else {
    for (const restaurant of state.data) {
      if ((restaurant.playlists ?? []).includes(fromName)) {
        restaurant.playlists = nextPlaylistsFor(restaurant);
        restaurant.updatedAt = Date.now();
      }
    }
    saveLocalData();
    state.lookupPlaylists = dataPlaylistNames();
  }

  if (state.playlistFilter === fromName) {
    state.playlistFilter = toName;
    saveFilterPrefs();
  }

  await loadLookups();
  closePlaylistManageModal();
  render();
  showToast(count === 1 ? `Renamed playlist (${count} place)` : `Renamed playlist (${count} places)`);
}

async function deletePlaylist(name) {
  const playlistName = name.trim();
  if (!playlistName) return;

  const count = playlistPlaceCount(playlistName);
  const message =
    count === 0
      ? `Delete "${playlistName}"?`
      : count === 1
        ? `Delete "${playlistName}"? The place in it will move to Unsorted.`
        : `Delete "${playlistName}"? ${count} places will move to Unsorted.`;
  if (!confirm(message)) return;

  const by = editorDisplayName();
  const withoutName = (restaurant) => (restaurant.playlists ?? []).filter((name) => name !== playlistName);

  if (state.remoteReady) {
    const affected = state.data.filter((restaurant) => (restaurant.playlists ?? []).includes(playlistName));
    await Promise.all(
      affected.map((restaurant) => {
        const next = withoutName(restaurant);
        const patch = { playlists: next, playlist: next[0] ?? "", updated_at: new Date().toISOString() };
        if (by) patch.updated_by = by;
        return client.from("restaurants").update(patch).eq("id", restaurant.id);
      })
    );
    await syncPlaylistLookup(playlistName);
    await loadRemoteData();
  } else {
    for (const restaurant of state.data) {
      if ((restaurant.playlists ?? []).includes(playlistName)) {
        restaurant.playlists = withoutName(restaurant);
        restaurant.updatedAt = Date.now();
      }
    }
    saveLocalData();
    state.lookupPlaylists = dataPlaylistNames();
  }

  if (state.playlistFilter === playlistName) {
    state.playlistFilter = "all";
    saveFilterPrefs();
  }

  await loadLookups();
  closePlaylistManageModal();
  render();
  showToast(`Deleted "${playlistName}"`);
}

function setPlaylistFilter(value) {
  state.playlistFilter = value || "all";
  saveFilterPrefs();
  render();
}

function renderPlaylistFilter() {
  if (!els.playlistSwitcher) return;

  const selected = state.playlistFilter || "all";
  const options = mergedLookupOptions("playlist");
  const counts = playlistCounts();
  const hasUncategorized = counts.__none__ > 0;

  const chips = [
    { value: "all", label: "All places", count: counts.all },
    ...options.map((value) => ({ value, label: value, count: counts[value] ?? 0 })),
    ...(hasUncategorized ? [{ value: "__none__", label: "Unsorted", count: counts.__none__ }] : [])
  ];

  const validValues = new Set(chips.map((chip) => chip.value));
  if (!validValues.has(selected)) {
    state.playlistFilter = "all";
  }

  els.playlistSwitcher.innerHTML = chips
    .map(({ value, label, count }) => {
      const isActive = state.playlistFilter === value;
      return `
        <button
          class="playlist-chip ${isActive ? "active" : ""}"
          type="button"
          role="tab"
          aria-selected="${isActive}"
          data-playlist="${escapeHtml(value)}"
        >
          <span class="playlist-chip-label">${escapeHtml(label)}</span>
          <span class="playlist-chip-count">${count}</span>
        </button>`;
    })
    .join("");

  const activeChip = chips.find((chip) => chip.value === state.playlistFilter) ?? chips[0];
  if (els.playlistFilterHint) {
    els.playlistFilterHint.textContent = activeChip ? `${activeChip.count} places` : "";
  }

  // Only recentre the strip when the active playlist actually changed, never on every render
  // (e.g. realtime refreshes or resizes), so the page never moves on its own.
  if (lastCenteredPlaylist !== state.playlistFilter) {
    lastCenteredPlaylist = state.playlistFilter;
    scrollActivePlaylistChipIntoView(false);
  }
  updatePlaylistManageControls();
}

function renderFilters() {
  renderPlaylistFilter();
  const locationOptions = mergedLookupOptions("location");
  const cuisineOptions = mergedLookupOptions("cuisine");
  const selectedLocation = els.locationFilter.value || "all";
  const selectedCuisine = els.cuisineFilter.value || "all";

  els.locationFilter.innerHTML = `<option value="all">All locations</option>${locationOptions
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("")}`;
  els.cuisineFilter.innerHTML = `<option value="all">All cuisines</option>${cuisineOptions
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("")}`;

  els.locationFilter.value = locationOptions.includes(selectedLocation) ? selectedLocation : "all";
  els.cuisineFilter.value = cuisineOptions.includes(selectedCuisine) ? selectedCuisine : "all";

  renderRestaurantOptionSelect(els.locationSelect, locationOptions, "Select location");
  renderRestaurantOptionSelect(els.cuisineSelect, cuisineOptions, "Select cuisine");
}

function optionPlaceholder(key) {
  if (key === "location") return "Select location";
  if (key === "cuisine") return "Select cuisine";
  return "Select playlist";
}

function renderRestaurantOptionSelect(select, options, placeholder, allowEmpty = false) {
  const current = select.value;
  select.innerHTML = [
    allowEmpty ? `<option value="">No playlist</option>` : `<option value="" disabled>${placeholder}</option>`,
    ...options.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
    `<option value="__new">+ Add new...</option>`
  ].join("");
  if (allowEmpty && !current) {
    select.value = "";
  } else {
    select.value = options.includes(current) || current === "__new" ? current : allowEmpty ? "" : "";
  }
}

function getRestaurantOption(select, input) {
  if (select.value === "__new") return input.value.trim();
  return select.value.trim();
}

function setRestaurantOption(select, input, key, value) {
  const options = mergedLookupOptions(key);
  const allowEmpty = key === "playlist";
  renderRestaurantOptionSelect(select, options, optionPlaceholder(key), allowEmpty);

  if (!value) {
    select.value = allowEmpty ? "" : "";
    input.value = "";
    input.hidden = true;
    input.required = false;
    return;
  }

  if (value && options.includes(value)) {
    select.value = value;
    input.value = "";
    input.hidden = true;
    input.required = false;
    return;
  }

  select.value = "__new";
  input.value = value ?? "";
  input.hidden = false;
  input.required = allowEmpty ? false : true;
}

function activePlaylistFilterValue() {
  const value = state.playlistFilter ?? "all";
  return value !== "all" && value !== "__none__" ? value : "";
}

function toggleCustomRestaurantOption(select, input) {
  const isCustom = select.value === "__new";
  input.hidden = !isCustom;
  input.required = isCustom;
  if (!isCustom) {
    input.value = "";
    return;
  }
  input.focus();
}

function renderSummary() {
  const dishes = state.data.flatMap((restaurant) => restaurant.dishes);
  const rated = state.data
    .map((restaurant) => averageRating(restaurant))
    .filter((value) => value !== null);
  const avg = rated.length ? rated.reduce((sum, value) => sum + value, 0) / rated.length : null;

  els.restaurantCount.textContent = state.data.length;
  els.dishCount.textContent = dishes.length;
  els.avgRating.textContent = avg === null ? "–" : avg.toFixed(1);
}

function renderAuth() {
  els.authForm.hidden = !canUseSupabase || Boolean(state.session);
  els.googleSignInButton.hidden = !canUseSupabase || Boolean(state.session);
  els.authDivider.hidden = !canUseSupabase || Boolean(state.session);
  els.signOutButton.hidden = !canUseSupabase || !state.session;
  els.ownerActions.hidden = !isSuperuser();
  document.querySelector("#quickAddButton").textContent = !canUseSupabase || state.canEdit ? "+ Add place" : "Sign in to edit";
  updatePlaylistManageControls();

  const showMobileAuth = canUseSupabase && !state.session && window.innerWidth <= 680;
  if (els.mobileAuthBar) {
    els.mobileAuthBar.hidden = !showMobileAuth;
  }

  if (!canUseSupabase) {
    setSync("Local only", "Cloud sync will turn on after Supabase config is deployed.");
    return;
  }

  if (!navigator.onLine) {
    const cachedAt = state.lastSyncedAt
      ? new Date(state.lastSyncedAt).toLocaleString()
      : "unknown time";
    setSync("Offline Mode", `Viewing cached data from ${cachedAt}. Sync resumes when online.`);
    return;
  }

  if (els.syncRetryButton) {
    els.syncRetryButton.hidden = !state.syncError || state.loading;
  }

  if (els.adminPanel) {
    els.adminPanel.hidden = !isSuperuser();
  }

  if (state.syncError && !state.loading) {
    setSync("Sync failed", state.syncError);
    return;
  }

  if (!state.session) {
    setSync("Public view", "Anyone can view. Sign in with an approved account to edit.");
    return;
  }

  if (state.checkingAccess) {
    setSync("Signing in", "Checking edit access…");
    return;
  }

  if (!state.canEdit) {
    setSync(
      "Waiting for approval",
      `${state.session.user.email} is signed in. The owner will see your request in Pending approval — you can keep browsing until approved.`
    );
    return;
  }

  if (!state.loading) {
    setSync("Approved editor", state.session.user.email);
  }
}

function renderList() {
  if (state.panelView === "map") {
    renderMapView();
    return;
  }

  const restaurants = filteredRestaurants();

  if (!restaurants.some((restaurant) => restaurant.id === state.selectedId)) {
    state.selectedId = restaurants[0]?.id ?? state.data[0]?.id ?? null;
  }

  if (state.loading) {
    els.restaurantList.innerHTML = Array.from({ length: 4 }).map(() => `
      <div class="restaurant-row" style="pointer-events: none; border-color: var(--line); display: flex; align-items: center; justify-content: space-between; gap: 12px; opacity: 0.7;">
        <div class="restaurant-main" style="width: 100%;">
          <div class="skeleton skeleton-text title" style="width: 60%; height: 18px; margin-bottom: 8px;"></div>
          <div class="meta-row" style="display: flex; gap: 8px; margin-top: 8px;">
            <div class="skeleton" style="width: 60px; height: 22px; border-radius: 999px;"></div>
            <div class="skeleton" style="width: 70px; height: 22px; border-radius: 999px;"></div>
            <div class="skeleton" style="width: 35px; height: 22px; border-radius: 999px;"></div>
          </div>
        </div>
        <div class="skeleton skeleton-badge" style="width: 46px; height: 42px; border-radius: 14px; flex-shrink: 0;"></div>
      </div>
    `).join("");
    return;
  }

  if (!state.data.length) {
    const hint = canUseSupabase && !state.session
      ? "Sign in with an approved account to add the first place."
      : canUseSupabase && state.session && !state.canEdit
        ? "Waiting for edit approval before you can add places."
        : "Add your first restaurant to start the shared log.";
    els.restaurantList.innerHTML = `<div class="empty-state">${hint}</div>`;
    return;
  }

  if (!restaurants.length) {
    els.restaurantList.innerHTML = `<div class="empty-state">No places match those filters. Try clearing search or filters.</div>`;
    return;
  }

  els.restaurantList.innerHTML = restaurants
    .map(
      (restaurant) => `
        <button class="restaurant-row ${restaurant.id === state.selectedId ? "active" : ""}" type="button" data-id="${restaurant.id}">
          <div class="restaurant-main">
            <h3>${escapeHtml(restaurant.name)}</h3>
            <div class="meta-row">
              ${metaPill("location", restaurant.location)}
              ${metaPill("cuisine", restaurant.cuisine)}
              ${(restaurant.playlists ?? []).map((name) => metaPill("playlist", name)).join("")}
              ${metaPill("price", restaurant.price)}
              ${restaurant.dishes?.length ? metaPill("dishes", `${restaurant.dishes.length} dish${restaurant.dishes.length === 1 ? "" : "es"}`) : ""}
            </div>
          </div>
          ${(() => {
            const avg = averageRating(restaurant);
            const count = restaurantRatings(restaurant).length;
            if (avg === null) {
              return `<div class="rating-badge rating-badge--none" aria-label="No rating yet">
            <span class="rating-badge-value">–</span>
            <span class="rating-badge-sub" aria-hidden="true">NR</span>
          </div>`;
            }
            return `<div class="rating-badge" aria-label="Average rating ${formatRating(avg)} out of 5 from ${count} ${count === 1 ? "person" : "people"}">
            <span class="rating-badge-star" aria-hidden="true">★</span>
            <span class="rating-badge-value">${formatRating(avg)}</span>
            <span class="rating-badge-sub" aria-hidden="true">${count}</span>
          </div>`;
          })()}
        </button>`
    )
    .join("");
}

function renderRatingsBreakdown(restaurant) {
  const ratings = restaurantRatings(restaurant);
  if (!ratings.length) {
    return `
    <div class="ratings-breakdown">
      <div class="section-heading"><h3>Individual ratings</h3></div>
      <p class="empty-state">No one has rated this place yet. ${
        state.canEdit || !canUseSupabase ? "Open Edit to add your rating." : "Sign in as an editor to rate it."
      }</p>
    </div>`;
  }

  const { email: myEmail } = currentRaterIdentity();
  const canModerate = isSuperuser();
  const rows = ratings
    .map((entry) => {
      const isMine = entry.email.toLowerCase() === myEmail.toLowerCase();
      const removeBtn = canModerate
        ? `<button class="rating-remove" type="button" data-action="remove-rating" data-email="${escapeHtml(entry.email)}" aria-label="Remove ${escapeHtml(ratingLabelFor(entry))}'s rating" title="Remove this rating"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><line x1="7" y1="7" x2="17" y2="17"></line><line x1="17" y1="7" x2="7" y2="17"></line></svg></button>`
        : "";
      return `
      <li class="rating-row${isMine ? " rating-row--mine" : ""}">
        <span class="rating-row-name">${escapeHtml(ratingLabelFor(entry))}${isMine ? ' <span class="rating-row-you">you</span>' : ""}</span>
        <span class="rating-row-score">
          ${starsMarkup(entry.rating)}
          <strong>${formatRating(entry.rating)}</strong>
          ${removeBtn}
        </span>
      </li>`;
    })
    .join("");

  return `
    <div class="ratings-breakdown">
      <div class="section-heading"><h3>Individual ratings</h3></div>
      <ul class="ratings-list">${rows}</ul>
    </div>`;
}

// Read-only star display. Uses a filled-star overlay clipped to a width %,
// so decimals (e.g. 3.5) render as a precise partial star with no missing glyphs.
function starsMarkup(rating) {
  const pct = Math.max(0, Math.min(Number(rating) || 0, 5)) * 20;
  return `<span class="stars" aria-hidden="true"><span class="stars-empty">★★★★★</span><span class="stars-fill" style="width:${pct}%"><span class="stars-glyph">★★★★★</span></span></span>`;
}

function renderDetail() {
  const restaurant = currentRestaurant();

  if (state.loading) {
    els.detailPanel.innerHTML = `
      <div class="skeleton-detail-placeholder" style="display: flex; flex-direction: column; gap: 24px; opacity: 0.75;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; width: 100%;">
          <div style="flex: 1;">
            <div class="skeleton" style="width: 80px; height: 14px; margin-bottom: 10px;"></div>
            <div class="skeleton" style="width: 85%; height: 42px; border-radius: 8px;"></div>
          </div>
          <div class="skeleton" style="width: 84px; height: 38px; border-radius: 12px; flex-shrink: 0;"></div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="skeleton" style="height: 84px; border-radius: 16px;"></div>
          <div class="skeleton" style="height: 84px; border-radius: 16px;"></div>
        </div>
        
        <div class="skeleton" style="height: 64px; border-radius: 16px; width: 100%;"></div>
        
        <div style="margin-top: 14px;">
          <div class="skeleton" style="width: 140px; height: 22px; margin-bottom: 14px;"></div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div class="skeleton" style="aspect-ratio: 1.2; border-radius: 16px;"></div>
            <div class="skeleton" style="aspect-ratio: 1.2; border-radius: 16px;"></div>
            <div class="skeleton" style="aspect-ratio: 1.2; border-radius: 16px;"></div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (!restaurant) {
    els.detailPanel.innerHTML = `<div class="empty-state">Select a place from the list, or add one if you can edit.</div>`;
    return;
  }

  const mapsLink = restaurant.maps
    ? `<a class="secondary-action map-action" href="${escapeHtml(restaurant.maps)}" target="_blank" rel="noreferrer">Open in Maps</a>`
    : "";

  const updatedLine = restaurant.updatedBy
    ? `<p class="updated-by-line">Last updated by ${escapeHtml(resolveUpdatedByLabel(restaurant.updatedBy))}</p>`
    : "";

  els.detailPanel.innerHTML = `
    <div class="detail-title">
      <div>
        <p class="eyebrow">${escapeHtml(restaurant.cuisine)}</p>
        <h2>${escapeHtml(restaurant.name)}</h2>
        <div class="tag-row">
          <span class="pill location">${escapeHtml(restaurant.location)}</span>
          ${(restaurant.playlists ?? []).map((name) => `<span class="pill playlist">${escapeHtml(name)}</span>`).join("")}
          <span class="pill price">${escapeHtml(restaurant.price)}</span>
          ${(restaurant.visited ?? []).map((person) => `<span class="pill cuisine">${escapeHtml(person)}</span>`).join("")}
        </div>
      </div>
      <div class="detail-actions">
        ${mapsLink}
        <button class="secondary-action" type="button" data-action="share-place">Share</button>
        ${state.canEdit || !canUseSupabase ? `<button class="secondary-action" type="button" data-action="edit-restaurant">Edit</button>` : ""}
      </div>
    </div>

    ${updatedLine}

    <div class="detail-grid">
      <div class="info-tile">
        <span>Average rating</span>
        ${(() => {
          const avg = averageRating(restaurant);
          const count = restaurantRatings(restaurant).length;
          if (avg === null) {
            return `<strong class="rating-none-text">No rating yet</strong>
        <div class="rating-line"><i style="width:0%"></i></div>`;
          }
          return `<strong>${formatRating(avg)} / 5 <small class="rating-count">· ${count} ${count === 1 ? "rating" : "ratings"}</small></strong>
        <div class="rating-line"><i style="width:${ratingWidth(avg)}"></i></div>`;
        })()}
      </div>
      <div class="info-tile">
        <span>Dishes logged</span>
        <strong>${restaurant.dishes.length}</strong>
        <div class="rating-line"><i style="width:${Math.min(restaurant.dishes.length * 18, 100)}%"></i></div>
      </div>
    </div>

    ${renderRatingsBreakdown(restaurant)}

    ${restaurant.notes ? `<p class="notes">${escapeHtml(restaurant.notes)}</p>` : ""}

    <div class="section-heading">
      <h3>Photos</h3>
      ${state.canEdit || !canUseSupabase ? `
        <label class="primary-action compact upload-action">
          Add photos
          <input id="restaurantPhotoInput" type="file" accept="image/*" multiple />
        </label>
      ` : ""}
    </div>

    <div class="restaurant-photo-grid">
      ${
        (restaurant.photos ?? []).length
          ? restaurant.photos.map((photo) => renderRestaurantPhoto(photo)).join("")
          : `<div class="empty-state">No restaurant photos yet.</div>`
      }
    </div>

    <div class="section-heading">
      <h3>Dishes</h3>
      ${state.canEdit || !canUseSupabase ? `<button class="primary-action compact" type="button" data-action="add-dish">Add dish</button>` : ""}
    </div>

    <div class="dish-grid">
      ${
        restaurant.dishes.length
          ? restaurant.dishes.map((dish) => renderDish(dish)).join("")
          : `<div class="empty-state">No dishes yet. Add the plates you ordered, photos, and ratings.</div>`
      }
    </div>
  `;
}

function renderRestaurantPhoto(photo) {
  return `
    <figure class="restaurant-photo-card">
      <img src="${escapeHtml(photo.photo)}" alt="Restaurant food photo" loading="lazy" data-action="open-photo" data-photo-src="${escapeHtml(photo.photo)}" />
      ${state.canEdit || !canUseSupabase ? `<button class="photo-delete-action" type="button" data-action="delete-restaurant-photo" data-photo-id="${photo.id}">Remove</button>` : ""}
    </figure>
  `;
}

function renderDish(dish) {
  const photo = dish.photo
    ? `<img class="dish-photo" src="${dish.photo}" alt="${escapeHtml(dish.name)}" data-action="open-photo" data-photo-src="${escapeHtml(dish.photo)}" />`
    : `<div class="dish-photo dish-placeholder">Photo</div>`;

  return `
    <article class="dish-card">
      ${photo}
      <div class="dish-body">
        <div class="dish-top">
          <h3>${escapeHtml(dish.name)}</h3>
          ${state.canEdit || !canUseSupabase ? `<button class="tiny-action" type="button" data-action="edit-dish" data-dish-id="${dish.id}">Edit</button>` : ""}
        </div>
        <div>
          <strong>${escapeHtml(dish.rating)} / 5</strong>
          <div class="rating-line"><i style="width:${ratingWidth(dish.rating)}"></i></div>
        </div>
        <div class="dish-meta">
          ${(dish.likedBy ?? []).map((person) => `<span class="pill location">${escapeHtml(person)}</span>`).join("")}
        </div>
        ${dish.notes ? `<p class="muted">${escapeHtml(dish.notes)}</p>` : ""}
      </div>
    </article>
  `;
}

function render() {
  renderFilters();
  renderSummary();
  renderAuth();
  updateFilterBadge();
  if (els.listCountValue) els.listCountValue.textContent = String(filteredRestaurants().length);
  if (els.mapPanel) els.mapPanel.hidden = state.panelView !== "map";
  if (els.listLayout) els.listLayout.hidden = state.panelView === "map";
  renderList();
  if (state.panelView !== "map") renderDetail();
}

function openRestaurantModal(id = null) {
  if (!requireEditor()) return;

  const restaurant = state.data.find((item) => item.id === id);
  state.editingRestaurantId = id;

  els.modalEyebrow.textContent = restaurant ? "Edit place" : "New place";
  els.modalTitle.textContent = restaurant ? "Edit restaurant" : "Add restaurant";
  els.nameInput.value = restaurant?.name ?? "";
  setRestaurantOption(els.locationSelect, els.locationInput, "location", restaurant?.location ?? "");
  setRestaurantOption(els.cuisineSelect, els.cuisineInput, "cuisine", restaurant?.cuisine ?? "");
  const activeFilterPlaylist = activePlaylistFilterValue();
  const defaultPlaylists = restaurant
    ? restaurant.playlists ?? []
    : activeFilterPlaylist
      ? [activeFilterPlaylist]
      : [];
  els.playlistInput.value = defaultPlaylists.join(", ");
  renderPlaylistPicker(els.playlistPicker, defaultPlaylists, els.playlistInput);
  els.priceInput.value = restaurant?.price ?? "$$";
  setRatingValue(restaurant ? myRatingFor(restaurant) : null);
  els.mapsInput.value = restaurant?.maps ?? "";
  els.notesInput.value = restaurant?.notes ?? "";
  const visited = restaurant?.visited ?? [];
  els.visitedInput.value = visited.join(", ");
  renderPeoplePicker(els.visitedPicker, visited, els.visitedInput);
  els.deleteRestaurantButton.hidden = !restaurant;
  els.restaurantModal.showModal();
  els.nameInput.focus();
}

function closeRestaurantModal() {
  els.restaurantModal.close();
  els.restaurantForm.reset();
  state.editingRestaurantId = null;
}

async function saveRestaurant(event) {
  event.preventDefault();
  const existing = state.data.find((item) => item.id === state.editingRestaurantId);
  const ratingValue = els.ratingInput.value === "none" ? null : Number(els.ratingInput.value);
  const payload = {
    name: els.nameInput.value.trim(),
    location: getRestaurantOption(els.locationSelect, els.locationInput),
    cuisine: getRestaurantOption(els.cuisineSelect, els.cuisineInput),
    playlists: parsePeopleList(els.playlistInput.value),
    price: els.priceInput.value,
    maps: normalizeUrl(els.mapsInput.value),
    notes: els.notesInput.value.trim(),
    visited: parseVisited(els.visitedInput.value),
    updatedAt: Date.now()
  };

  try {
    if (state.remoteReady) {
      const id = await saveRestaurantRemote(restaurantToRow(payload), existing?.id);
      await saveMyRatingRemote(id, ratingValue);
      state.selectedId = id;
      await loadRemoteData();
    } else if (existing) {
      Object.assign(existing, payload);
      applyMyRatingLocal(existing, ratingValue);
      saveLocalData();
    } else {
      const restaurant = {
        id: crypto.randomUUID(),
        ...payload,
        ratings: [],
        photos: [],
        dishes: []
      };
      applyMyRatingLocal(restaurant, ratingValue);
      state.data.unshift(restaurant);
      state.selectedId = restaurant.id;
      saveLocalData();
    }

    await registerLookupValues(payload.location, payload.cuisine, payload.playlists);
    closeRestaurantModal();
    render();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteRestaurant() {
  if (!state.editingRestaurantId) return;

  try {
    if (state.remoteReady) {
      const { error } = await client.from("restaurants").delete().eq("id", state.editingRestaurantId);
      if (error) throw error;
      closeRestaurantModal();
      await loadRemoteData();
      return;
    }

    state.data = state.data.filter((restaurant) => restaurant.id !== state.editingRestaurantId);
    state.selectedId = state.data[0]?.id ?? null;
    saveLocalData();
    closeRestaurantModal();
    render();
  } catch (error) {
    alert(error.message);
  }
}

function openDishModal(id = null) {
  if (!requireEditor()) return;

  const restaurant = currentRestaurant();
  const dish = restaurant?.dishes.find((item) => item.id === id);
  state.editingDishId = id;
  state.pendingPhoto = dish?.photo ?? "";
  state.pendingPhotoFile = null;

  els.dishModalEyebrow.textContent = restaurant?.name ?? "Dish";
  els.dishModalTitle.textContent = dish ? "Edit dish" : "Add dish";
  els.dishNameInput.value = dish?.name ?? "";
  setDishRatingValue(dish?.rating ?? 4);
  const likedBy = dish?.likedBy ?? [];
  els.dishLikedByInput.value = likedBy.join(", ");
  renderPeoplePicker(els.likedByPicker, likedBy, els.dishLikedByInput);
  els.dishNotesInput.value = dish?.notes ?? "";
  els.dishPhotoInput.value = "";
  els.deleteDishButton.hidden = !dish;
  renderPhotoPreview();
  els.dishModal.showModal();
  els.dishNameInput.focus();
}

function closeDishModal() {
  els.dishModal.close();
  els.dishForm.reset();
  state.editingDishId = null;
  state.pendingPhoto = "";
  state.pendingPhotoFile = null;
}

function renderPhotoPreview() {
  els.photoPreview.innerHTML = state.pendingPhoto ? `<img src="${state.pendingPhoto}" alt="Dish preview" />` : "";
}

function openPhotoLightbox(src) {
  if (!src) return;
  els.lightboxImage.src = src;
  els.photoLightbox.showModal();
}

function closePhotoLightbox() {
  els.photoLightbox.close();
  els.lightboxImage.removeAttribute("src");
}

async function saveDish(event) {
  event.preventDefault();
  const restaurant = currentRestaurant();
  if (!restaurant) return;

  const existing = restaurant.dishes.find((item) => item.id === state.editingDishId);
  const payload = {
    name: els.dishNameInput.value.trim(),
    rating: Number(els.dishRatingInput.value),
    likedBy: splitPeople(els.dishLikedByInput.value),
    notes: els.dishNotesInput.value.trim(),
    photo: state.pendingPhoto,
    photoPath: existing?.photoPath ?? ""
  };

  try {
    if (state.remoteReady) {
      await saveDishRemote(restaurant, payload, existing);
      closeDishModal();
      await loadRemoteData();
      return;
    }

    if (existing) {
      Object.assign(existing, payload);
    } else {
      restaurant.dishes.unshift({ id: crypto.randomUUID(), ...payload });
    }

    restaurant.updatedAt = Date.now();
    saveLocalData();
    closeDishModal();
    render();
  } catch (error) {
    alert(error.message);
  }
}

async function addRestaurantPhotos(files) {
  if (!files.length || !requireEditor()) return;

  const restaurant = currentRestaurant();
  if (!restaurant) return;

  try {
    if (state.remoteReady) {
      await saveRestaurantPhotosRemote(restaurant, files);
      await loadRemoteData();
      return;
    }

    const photos = await Promise.all(
      files.map(async (file) => {
        const compressed = await compressImage(file);
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: crypto.randomUUID(),
              photo: String(reader.result),
              photoPath: "",
              createdAt: Date.now()
            });
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(compressed);
        });
      })
    );

    restaurant.photos = [...photos, ...(restaurant.photos ?? [])];
    restaurant.updatedAt = Date.now();
    saveLocalData();
    render();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteRestaurantPhoto(photoId) {
  if (!requireEditor()) return;

  const restaurant = currentRestaurant();
  const photo = restaurant?.photos?.find((item) => item.id === photoId);
  if (!restaurant || !photo) return;

  try {
    if (state.remoteReady) {
      const { error } = await client.from("restaurant_photos").delete().eq("id", photoId);
      if (error) throw error;
      if (photo.photoPath) await client.storage.from(PHOTO_BUCKET).remove([photo.photoPath]);
      await loadRemoteData();
      return;
    }

    restaurant.photos = (restaurant.photos ?? []).filter((item) => item.id !== photoId);
    restaurant.updatedAt = Date.now();
    saveLocalData();
    render();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteDish() {
  const restaurant = currentRestaurant();
  if (!restaurant || !state.editingDishId) return;

  try {
    if (state.remoteReady) {
      const dish = restaurant.dishes.find((item) => item.id === state.editingDishId);
      const { error } = await client.from("dishes").delete().eq("id", state.editingDishId);
      if (error) throw error;
      if (dish?.photoPath) await client.storage.from(PHOTO_BUCKET).remove([dish.photoPath]);
      closeDishModal();
      await loadRemoteData();
      return;
    }

    restaurant.dishes = restaurant.dishes.filter((dish) => dish.id !== state.editingDishId);
    restaurant.updatedAt = Date.now();
    saveLocalData();
    closeDishModal();
    render();
  } catch (error) {
    alert(error.message);
  }
}

function exportData() {
  if (!isSuperuser()) {
    alert("Only the owner account can export FoodLog data.");
    return;
  }

  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plate-log-export.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function dataUrlToFile(dataUrl, filename = "import.jpg") {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

async function importDishToRemote(restaurantId, dish) {
  let photoPath = dish.photoPath ?? "";
  if (dish.photo?.startsWith("data:")) {
    const file = await dataUrlToFile(dish.photo, `${dish.name || "dish"}.jpg`);
    photoPath = await uploadDishPhoto(file);
  }
  const row = dishToRow({ ...dish, photoPath }, restaurantId, photoPath);
  const { error } = await client.from("dishes").insert(row);
  if (error) throw error;
}

async function importRestaurantPhotoToRemote(restaurantId, photo) {
  if (!photo.photo?.startsWith("data:")) return;
  const file = await dataUrlToFile(photo.photo, "gallery.jpg");
  const photoPath = await uploadRestaurantPhoto(file);
  const { error } = await client.from("restaurant_photos").insert(restaurantPhotoToRow(restaurantId, photoPath));
  if (error) throw error;
}

async function importToSupabase(restaurants) {
  setSync("Importing", "Uploading restaurants to the shared cloud log...");
  for (const restaurant of restaurants) {
    const restaurantId = await saveRestaurantRemote(restaurantToRow(restaurant));
    for (const photo of restaurant.photos ?? []) {
      await importRestaurantPhotoToRemote(restaurantId, photo);
    }
    for (const dish of restaurant.dishes ?? []) {
      await importDishToRemote(restaurantId, dish);
    }
  }
}

function sessionIdentity(session) {
  const meta = session?.user?.user_metadata ?? {};
  return {
    email: session.user.email.toLowerCase(),
    displayName: meta.full_name || meta.name || meta.display_name || "",
    provider: session.user.app_metadata?.provider || session.user.identities?.[0]?.provider || ""
  };
}

async function loadEditorProfiles() {
  if (!client) {
    state.editorDisplayNames = {};
    return;
  }

  const { data, error } = await client.from("editor_profiles").select("email,display_name");

  if (error) {
    console.warn("editor_profiles load failed", error.message);
    state.editorDisplayNames = {};
    return;
  }

  state.editorDisplayNames = Object.fromEntries(
    (data ?? [])
      .filter((row) => row.display_name?.trim())
      .map((row) => [row.email.toLowerCase(), row.display_name.trim()])
  );
}

async function upsertEditorProfile(session) {
  if (!client || !session?.user?.email) return;

  const { email, displayName } = sessionIdentity(session);
  const name = displayName.trim();
  if (!name) return;

  const { error } = await client.from("editor_profiles").upsert(
    { email, display_name: name },
    { onConflict: "email" }
  );

  if (error) {
    console.warn("editor_profiles upsert failed", error.message);
    return;
  }

  state.editorDisplayNames[email] = name;
}

async function registerPendingApproval(session) {
  if (!client || !session?.user?.email || isSuperuser()) return;

  const { email, displayName, provider } = sessionIdentity(session);
  const lastSeenAt = new Date().toISOString();
  const row = {
    email,
    display_name: displayName,
    provider,
    last_seen_at: lastSeenAt
  };

  const { data: existing, error: readError } = await client
    .from("pending_approvals")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (readError) {
    console.warn("pending_approvals read failed", readError.message);
    return;
  }

  const write = existing
    ? await client.from("pending_approvals").update(row).eq("email", email)
    : await client.from("pending_approvals").insert(row);

  if (write.error) {
    console.warn("pending_approvals write failed", write.error.message);
  }

  await upsertEditorProfile(session);
}

async function clearPendingApproval(email) {
  if (!client || !email) return;
  await client.from("pending_approvals").delete().eq("email", email.toLowerCase());
}

async function loadAdminData() {
  if (!client || !isSuperuser()) return;

  await loadEditorProfiles();

  const [approvedResult, pendingResult] = await Promise.all([
    client.from("approved_users").select("email,note,created_at").order("created_at", { ascending: true }),
    client.from("pending_approvals").select("email,display_name,provider,requested_at,last_seen_at").order("requested_at", { ascending: false })
  ]);

  if (approvedResult.error || pendingResult.error) {
    setSync("Admin error", approvedResult.error?.message || pendingResult.error?.message);
    return;
  }

  state.approvedUsers = approvedResult.data ?? [];
  state.pendingApprovals = pendingResult.data ?? [];
  renderAdminPanel();
}

function renderAdminPanel() {
  renderPendingApprovals();
  renderApprovedUsers();
}

function renderPendingApprovals() {
  if (!els.pendingList) return;

  if (!state.pendingApprovals.length) {
    els.pendingList.innerHTML = `<li class="muted">No one waiting. New sign-up attempts appear here automatically (even if Google did not finish on their phone).</li>`;
    return;
  }

  els.pendingList.innerHTML = state.pendingApprovals
    .map((row) => {
      const provider = row.provider ? ` · ${escapeHtml(row.provider)}` : "";
      const name = row.display_name ? `${escapeHtml(row.display_name)} · ` : "";
      return `
        <li>
          <span>${name}${escapeHtml(row.email)}${provider}</span>
          <div class="pending-actions">
            <button class="tiny-action" type="button" data-approve-pending="${escapeHtml(row.email)}">Approve</button>
            <button class="tiny-action" type="button" data-deny-pending="${escapeHtml(row.email)}">Deny</button>
          </div>
        </li>`;
    })
    .join("");
}

function renderApprovedUsers() {
  if (!els.approvedList) return;

  if (!state.approvedUsers.length) {
    els.approvedList.innerHTML = `<li class="muted">No approved editors yet.</li>`;
    return;
  }

  els.approvedList.innerHTML = state.approvedUsers
    .map((row) => {
      const isOwner = row.email.toLowerCase() === SUPERUSER_EMAIL;
      const displayName = state.editorDisplayNames[row.email.toLowerCase()];
      const identity = displayName
        ? `<strong>${escapeHtml(displayName)}</strong> <span class="muted">${escapeHtml(row.email)}</span>`
        : `<span>${escapeHtml(row.email)}</span>`;
      return `
        <li>
          <span>${identity}${row.note ? ` · ${escapeHtml(row.note)}` : ""}</span>
          ${
            isOwner
              ? ""
              : `<button class="tiny-action" type="button" data-revoke="${escapeHtml(row.email)}">Remove</button>`
          }
        </li>`;
    })
    .join("");
}

async function grantEditorAccess(email, note = "Approved from Plate Log") {
  const normalized = email.trim().toLowerCase();

  if (client) {
    const { data: pending } = await client
      .from("pending_approvals")
      .select("display_name")
      .eq("email", normalized)
      .maybeSingle();

    if (pending?.display_name?.trim()) {
      await client.from("editor_profiles").upsert(
        { email: normalized, display_name: pending.display_name.trim() },
        { onConflict: "email" }
      );
      state.editorDisplayNames[normalized] = pending.display_name.trim();
    }
  }

  const { error } = await client.from("approved_users").upsert({ email: normalized, note }, { onConflict: "email" });
  if (error) throw error;
  await clearPendingApproval(normalized);
}

async function addToWaitingList() {
  if (!isSuperuser()) return;

  const email = els.approveEmail.value.trim().toLowerCase();
  if (!email) {
    alert("Enter an email to add to the waiting list.");
    return;
  }

  const note = els.approveNote.value.trim();
  const { error } = await client.from("pending_approvals").upsert(
    {
      email,
      display_name: note || "",
      provider: "manual",
      last_seen_at: new Date().toISOString()
    },
    { onConflict: "email" }
  );

  if (error) {
    alert(error.message);
    return;
  }

  els.approveForm.reset();
  await loadAdminData();
  showToast(`${email} added to waiting list`);
}

async function approveUser(event) {
  event.preventDefault();
  if (!isSuperuser()) return;

  const email = els.approveEmail.value.trim().toLowerCase();
  if (!email) {
    alert("Enter an email to pre-approve, or use Approve on a pending request below.");
    return;
  }

  const note = els.approveNote.value.trim() || "Pre-approved by owner";

  try {
    await grantEditorAccess(email, note);
    els.approveForm.reset();
    await loadAdminData();
    showToast(`${email} can now edit`);
  } catch (error) {
    alert(error.message);
  }
}

async function approvePending(email) {
  if (!isSuperuser()) return;

  try {
    await grantEditorAccess(email, "Approved after sign-in request");
    await loadAdminData();
    showToast(`${email} approved`);
  } catch (error) {
    alert(error.message);
  }
}

async function denyPending(email) {
  if (!isSuperuser()) return;
  if (!confirm(`Deny access for ${email}? They can sign in again to request later.`)) return;

  const { error } = await client.from("pending_approvals").delete().eq("email", email.toLowerCase());

  if (error) {
    alert(error.message);
    return;
  }

  await loadAdminData();
  showToast(`${email} denied`);
}

async function revokeUser(email) {
  if (!isSuperuser()) return;
  if (!confirm(`Remove edit access for ${email}?`)) return;

  const { error } = await client.from("approved_users").delete().eq("email", email.toLowerCase());

  if (error) {
    alert(error.message);
    return;
  }

  await loadAdminData();
  showToast(`${email} removed`);
}

function importData(file) {
  if (!isSuperuser()) {
    alert("Only the owner account can import FoodLog data.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed)) throw new Error("Import must be an array");

      const uploadToCloud =
        canUseSupabase &&
        state.canEdit &&
        confirm("Import this file into the shared cloud log? Choose Cancel to import locally only.");

      if (uploadToCloud) {
        await importToSupabase(parsed);
        await loadRemoteData();
        return;
      }

      state.data = parsed;
      state.selectedId = state.data[0]?.id ?? null;
      saveLocalData();
      render();
    } catch (error) {
      alert(error?.message || "That file does not look like a Plate Log export.");
    }
  };
  reader.readAsText(file);
}

async function signIn(event) {
  event.preventDefault();
  if (!client) return;

  const email = els.emailInput.value.trim().toLowerCase();
  const password = els.passwordInput.value;
  setSync("Signing in", `Checking ${email}...`);
  const { error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  setSync("Signed in", `Checking edit approval for ${email}.`);
  els.authForm.reset();
}

async function signInWithGoogle() {
  if (!client) return;

  setSync("Opening Google", "Sign in with Google. If you are new, the owner will see your email to approve.");
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthRedirectUrl(),
      queryParams: {
        prompt: "select_account"
      }
    }
  });

  if (error) {
    alert(error.message);
  }
}

async function signOut() {
  if (!client) return;

  setSync("Signing out", "Clearing your session...");
  const { error } = await client.auth.signOut();

  if (error) {
    setSync("Sign out failed", error.message);
    return;
  }

  await refreshAccess(null);
  await loadRemoteData();
}

async function refreshAccess(session) {
  state.session = session;
  state.canEdit = false;
  state.checkingAccess = Boolean(session?.user?.email);

  if (!client || !session?.user?.email) {
    state.checkingAccess = false;
    state.pendingApprovals = [];
    render();
    return;
  }

  render();

  const email = session.user.email.toLowerCase();
  const { data, error } = await client.from("approved_users").select("email").eq("email", email).maybeSingle();

  state.checkingAccess = false;

  if (error) {
    setSync("Approval check failed", error.message);
    render();
    return;
  }

  if (data) {
    state.canEdit = true;
    void clearPendingApproval(email);
    void upsertEditorProfile(session);
  } else {
    state.canEdit = false;
    void registerPendingApproval(session);
  }

  render();
  if (isSuperuser()) void loadAdminData();
}

async function establishSession() {
  const { code, error, errorCode, errorDescription } = authParamsFromUrl();

  if (error || errorDescription) {
    throw new Error(friendlyAuthError(errorDescription || error, errorCode));
  }

  if (code) {
    // detectSessionInUrl exchanges the PKCE code when getSession runs (code must still be in the URL).
    const { data, error: sessionError } = await withTimeout(
      client.auth.getSession(),
      20000,
      "Google sign-in timed out. Please try again."
    );
    if (sessionError) throw sessionError;
    if (data.session) return data.session;

    throw new Error(
      "Google sign-in did not complete. Tap Continue with Google again in this browser (same tab, not a shared link)."
    );
  }

  const { data, error: sessionError } = await withTimeout(
    client.auth.getSession(),
    8000,
    "Could not restore your session."
  );
  if (sessionError) throw sessionError;
  return data.session;
}

function queueAuthEvent(event, session) {
  // Never await Supabase auth calls inside onAuthStateChange — it can deadlock getSession.
  setTimeout(() => {
    void handleAuthEvent(event, session);
  }, 0);
}

async function handleAuthEvent(event, session) {
  if (!authBootDone) return;

  if (event === "SIGNED_OUT") {
    await refreshAccess(null);
    if (initialLoadDone) void loadRemoteData();
    return;
  }

  if (event === "INITIAL_SESSION") return;

  await refreshAccess(session);

  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    void loadRemoteData();
  }
}

function startRealtimeSync() {
  if (!client || realtimeChannel) return;

  realtimeChannel = client
    .channel("plate-log-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "restaurants" },
      () => {
        if (!state.loading) loadRemoteData({ reason: "realtime" });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "dishes" },
      () => {
        if (!state.loading) loadRemoteData({ reason: "realtime" });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "restaurant_photos" },
      () => {
        if (!state.loading) loadRemoteData({ reason: "realtime" });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "restaurant_ratings" },
      () => {
        if (!state.loading) loadRemoteData({ reason: "realtime" });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pending_approvals" },
      () => {
        if (isSuperuser()) loadAdminData();
      }
    )
    .subscribe();
}

async function boot() {
  const { error: urlAuthError } = readAuthCallbackFromUrl();
  const finishingOAuth = hasOAuthCallbackInUrl();

  render();
  if (urlAuthError) {
    setSync("Google sign-in failed", urlAuthError);
    stripAuthParamsFromUrl();
  } else if (finishingOAuth && canUseSupabase) {
    setSync("Signing in", "Finishing Google sign-in…");
  }

  if (!canUseSupabase) {
    return;
  }

  client.auth.onAuthStateChange((event, session) => {
    queueAuthEvent(event, session);
  });

  try {
    if (urlAuthError) {
      authBootDone = true;
      return;
    }

    const session = await establishSession();
    stripAuthParamsFromUrl();

    await refreshAccess(session);
    authBootDone = true;

    if (!initialLoadDone) {
      initialLoadDone = true;
      void loadRemoteData();
    }

    startRealtimeSync();
  } catch (error) {
    stripAuthParamsFromUrl();
    authBootDone = true;
    setSync("Sign-in failed", friendlySessionError(error));
    render();
  }
}

document.querySelector("#quickAddButton").addEventListener("click", () => openRestaurantModal());
document.querySelector("#exportButton").addEventListener("click", exportData);
document.querySelector("#closeRestaurantModal").addEventListener("click", closeRestaurantModal);
document.querySelector("#cancelRestaurantButton").addEventListener("click", closeRestaurantModal);
document.querySelector("#deleteRestaurantButton").addEventListener("click", deleteRestaurant);
els.themeToggleBtn.addEventListener("click", toggleTheme);
document.querySelector("#closeDishModal").addEventListener("click", closeDishModal);
document.querySelector("#cancelDishButton").addEventListener("click", closeDishModal);
document.querySelector("#deleteDishButton").addEventListener("click", deleteDish);
els.authForm.addEventListener("submit", signIn);
els.googleSignInButton.addEventListener("click", signInWithGoogle);
els.signOutButton.addEventListener("click", signOut);
els.syncPanelToggle?.addEventListener("click", () => {
  const open = !els.syncPanel?.classList.contains("sync-panel--expanded");
  setSyncPanelExpanded(open);
});
els.mobileSignInButton?.addEventListener("click", () => {
  openSettings({ expandSync: true, focusEmail: true });
});
let lastLayoutWidth = window.innerWidth;
let resizeRenderTimer = null;
window.addEventListener("resize", () => {
  // Mobile browsers fire "resize" whenever the URL bar shows/hides while scrolling — that only
  // changes the height. Re-rendering on those events rebuilt the list mid-scroll and made the
  // page jump. Only re-render when the width actually changes, and debounce to stay smooth.
  if (window.innerWidth === lastLayoutWidth) return;
  lastLayoutWidth = window.innerWidth;
  clearTimeout(resizeRenderTimer);
  resizeRenderTimer = setTimeout(render, 150);
});

buildStarInputs();
els.restaurantForm.addEventListener("submit", saveRestaurant);
els.restaurantForm.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") event.preventDefault();
});
els.dishForm.addEventListener("submit", saveDish);
els.dishForm.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") event.preventDefault();
});
els.locationSelect.addEventListener("change", () => toggleCustomRestaurantOption(els.locationSelect, els.locationInput));
els.cuisineSelect.addEventListener("change", () => toggleCustomRestaurantOption(els.cuisineSelect, els.cuisineInput));
els.playlistManageButton?.addEventListener("click", () => {
  if (isEditablePlaylist(state.playlistFilter)) {
    openPlaylistManageModal(state.playlistFilter);
  }
});

els.playlistManageForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const oldName = state.managingPlaylistName;
  if (!oldName) return;
  try {
    await renamePlaylist(oldName, els.playlistRenameInput.value);
  } catch (error) {
    alert(error.message);
  }
});

els.deletePlaylistButton?.addEventListener("click", async () => {
  const name = state.managingPlaylistName;
  if (!name) return;
  try {
    await deletePlaylist(name);
  } catch (error) {
    alert(error.message);
  }
});

els.closePlaylistManageModal?.addEventListener("click", closePlaylistManageModal);
els.cancelPlaylistManageButton?.addEventListener("click", closePlaylistManageModal);

els.playlistSwitcher?.addEventListener("pointerdown", (event) => {
  const chip = event.target.closest("[data-playlist]");
  if (!chip || !(state.canEdit || !canUseSupabase)) return;
  if (!isEditablePlaylist(chip.dataset.playlist)) return;

  clearTimeout(playlistLongPressTimer);
  playlistLongPressTimer = setTimeout(() => {
    suppressPlaylistChipClick = true;
    openPlaylistManageModal(chip.dataset.playlist);
    playlistLongPressTimer = null;
  }, 520);
});

els.playlistSwitcher?.addEventListener("pointerup", () => {
  clearTimeout(playlistLongPressTimer);
  playlistLongPressTimer = null;
});

els.playlistSwitcher?.addEventListener("pointercancel", () => {
  clearTimeout(playlistLongPressTimer);
  playlistLongPressTimer = null;
});

els.playlistSwitcher?.addEventListener("pointerleave", (event) => {
  if (event.target.closest("[data-playlist]")) {
    clearTimeout(playlistLongPressTimer);
    playlistLongPressTimer = null;
  }
});

els.playlistSwitcher?.addEventListener("click", (event) => {
  if (suppressPlaylistChipClick) {
    suppressPlaylistChipClick = false;
    return;
  }
  const chip = event.target.closest("[data-playlist]");
  if (!chip) return;
  if (chip.dataset.playlist === state.playlistFilter) return;
  setPlaylistFilter(chip.dataset.playlist);
  requestAnimationFrame(() => scrollActivePlaylistChipIntoView(true));
  lastCenteredPlaylist = state.playlistFilter;
});

[els.locationFilter, els.cuisineFilter, els.priceFilter, els.ratingFilter].forEach((input) => {
  input.addEventListener("input", () => {
    saveFilterPrefs();
    render();
  });
});

// Debounce the free-text search so typing doesn't rebuild the whole list on every keystroke.
let searchDebounceTimer = null;
els.searchInput?.addEventListener("input", () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    saveFilterPrefs();
    render();
  }, 160);
});

document.querySelectorAll("[data-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    state.sort = button.dataset.sort;
    document.querySelectorAll("[data-sort]").forEach((item) => item.classList.toggle("active", item === button));
    saveFilterPrefs();
    render();
  });
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    setPanelView(button.dataset.view);
    saveFilterPrefs();
  });
});

els.sortFilter?.addEventListener("change", () => {
  state.sort = els.sortFilter.value;
  document.querySelectorAll("[data-sort]").forEach((item) => item.classList.toggle("active", item.dataset.sort === state.sort));
  saveFilterPrefs();
  render();
});

// Settings dialog (sync / admin / data tools).
els.settingsButton?.addEventListener("click", () => openSettings({ expandSync: true }));
els.closeSettingsModal?.addEventListener("click", () => els.settingsModal?.close());
els.settingsModal?.addEventListener("click", (event) => {
  // Clicking the dim backdrop (the dialog element itself) closes it.
  if (event.target === els.settingsModal) els.settingsModal.close();
});

// Filter bottom sheet.
function openFilterSheet() {
  if (els.sortFilter) els.sortFilter.value = state.sort;
  if (els.filterSheet && !els.filterSheet.open) els.filterSheet.showModal();
}
function closeFilterSheet() {
  els.filterSheet?.close();
}
els.filterButton?.addEventListener("click", openFilterSheet);
els.closeFilterSheet?.addEventListener("click", closeFilterSheet);
els.applyFiltersButton?.addEventListener("click", () => {
  saveFilterPrefs();
  render();
  closeFilterSheet();
});
els.clearFiltersButton?.addEventListener("click", () => {
  if (els.locationFilter) els.locationFilter.value = "all";
  if (els.cuisineFilter) els.cuisineFilter.value = "all";
  if (els.priceFilter) els.priceFilter.value = "all";
  if (els.ratingFilter) els.ratingFilter.value = "0";
  state.sort = "recent";
  if (els.sortFilter) els.sortFilter.value = "recent";
  saveFilterPrefs();
  render();
});
els.filterSheet?.addEventListener("click", (event) => {
  if (event.target === els.filterSheet) closeFilterSheet();
});

els.syncRetryButton?.addEventListener("click", () => {
  state.syncError = null;
  loadRemoteData();
});

els.approveForm?.addEventListener("submit", approveUser);
els.addWaitingEmailButton?.addEventListener("click", addToWaitingList);
els.pendingList?.addEventListener("click", (event) => {
  const approveEmail = event.target.dataset.approvePending;
  const denyEmail = event.target.dataset.denyPending;
  if (approveEmail) approvePending(approveEmail);
  if (denyEmail) denyPending(denyEmail);
});
els.approvedList?.addEventListener("click", (event) => {
  const email = event.target.dataset.revoke;
  if (email) revokeUser(email);
});

els.restaurantList.addEventListener("click", (event) => {
  const row = event.target.closest(".restaurant-row");
  if (!row) return;
  state.selectedId = row.dataset.id;
  updatePlaceUrl(state.selectedId);
  render();
  if (window.innerWidth <= 980) {
    els.detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

els.detailPanel.addEventListener("click", (event) => {
  // Resolve the actioned element via closest() so clicks on child nodes
  // (e.g. an inline <svg> inside a button) still carry the right dataset.
  const target = event.target.closest("[data-action]");
  const action = target?.dataset.action;
  if (action === "share-place") {
    const restaurant = currentRestaurant();
    if (!restaurant) return;
    const url = getShareUrl(restaurant.id);
    navigator.clipboard?.writeText(url).then(
      () => showToast("Link copied"),
      () => prompt("Copy this link:", url)
    );
  }
  if (action === "edit-restaurant") openRestaurantModal(currentRestaurant()?.id);
  if (action === "add-dish") openDishModal();
  if (action === "edit-dish") openDishModal(target.dataset.dishId);
  if (action === "delete-restaurant-photo") deleteRestaurantPhoto(target.dataset.photoId);
  if (action === "open-photo") openPhotoLightbox(target.dataset.photoSrc);
  if (action === "remove-rating") removeRating(target.dataset.email);
});

els.detailPanel.addEventListener("change", (event) => {
  if (event.target.id !== "restaurantPhotoInput") return;
  addRestaurantPhotos(Array.from(event.target.files ?? []));
  event.target.value = "";
});

els.dishPhotoInput.addEventListener("change", async () => {
  const file = els.dishPhotoInput.files[0];
  if (!file) return;
  const compressed = await compressImage(file);
  state.pendingPhotoFile = compressed;
  const reader = new FileReader();
  reader.onload = () => {
    state.pendingPhoto = String(reader.result);
    renderPhotoPreview();
  };
  reader.readAsDataURL(compressed);
});

els.closePhotoLightbox.addEventListener("click", closePhotoLightbox);
els.photoLightbox.addEventListener("click", (event) => {
  if (event.target === els.photoLightbox) closePhotoLightbox();
});

els.importInput.addEventListener("change", () => {
  const file = els.importInput.files[0];
  if (file) importData(file);
  els.importInput.value = "";
});

window.addEventListener("online", () => {
  if (canUseSupabase) {
    loadRemoteData();
  } else {
    render();
  }
});
window.addEventListener("offline", () => {
  render();
});

initSyncPanel();
boot();
