import {
  MAX_DECISION_VOTES,
  activeRecords,
  addDecisionCandidate,
  applyGoogleMapsDetails,
  closeDecisionSession,
  createDecisionSession,
  decisionVoteSummary,
  findSimilarDishes,
  findRestaurantDuplicates,
  findSimilarRestaurants,
  parseGoogleMapsUrl,
  mergePendingRestaurants,
  reopenDecisionSession,
  restaurantNeedsDetails,
  restoreRecord,
  toggleDecisionVote,
  trashRecord,
  validateImportPayload
} from "./lib/foodlog-core.js";

const STORAGE_KEY = "plate-log-data-v1";
const CLOUD_CACHE_KEY = "plate-log-cloud-cache-v1";
const DECISION_STORAGE_KEY = "foodlog-decision-sessions-v1";
const TRASH_STORAGE_KEY = "foodlog-trash-v1";
const ACTIVITY_STORAGE_KEY = "foodlog-activity-v1";
const PHOTO_BUCKET = "plate-photos";
const PRODUCTION_URL = "https://food.danyhanna.uk";
const PRODUCTION_PROJECT_REF = "lmkkmzpwsdhlpjugrwjr";
const SUPERUSER_EMAIL = "danielhanna0001@gmail.com";
const FILTER_PREFS_KEY = "plate-log-filters-v1";
const SYNC_PANEL_OPEN_KEY = "plate-log-sync-open-v1";
const RESTAURANT_DRAFT_KEY = "foodlog-restaurant-capture-draft-v1";
const DISH_DRAFT_PREFIX = "foodlog-dish-capture-draft-v1:";
const SHARED_CAPTURE_KEY = "foodlog-shared-restaurant-capture-v1";
const RECENT_CAPTURE_CHOICES_KEY = "foodlog-recent-capture-choices-v1";

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

function recentCaptureChoices() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_CAPTURE_CHOICES_KEY) ?? "{}");
    return {
      location: Array.isArray(parsed.location) ? parsed.location : [],
      cuisine: Array.isArray(parsed.cuisine) ? parsed.cuisine : []
    };
  } catch {
    return { location: [], cuisine: [] };
  }
}

function recordRecentCaptureChoice(key, value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || !["location", "cuisine"].includes(key)) return;
  const recent = recentCaptureChoices();
  recent[key] = [
    normalized,
    ...recent[key].filter((item) => item.toLowerCase() !== normalized.toLowerCase())
  ].slice(0, 5);
  localStorage.setItem(RECENT_CAPTURE_CHOICES_KEY, JSON.stringify(recent));
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
  if (themeMeta) themeMeta.setAttribute("content", isDark ? "#111512" : "#174A3B");
  updateThemeControl();
}

function updateThemeControl() {
  if (!els?.themeToggleBtn) return;
  const isDark = document.documentElement.classList.contains("dark-theme");
  els.themeToggleBtn.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
  els.themeToggleBtn.setAttribute("aria-pressed", String(isDark));
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
    dishes: [{ id: crypto.randomUUID(), name: "Bibimbap", ratings: [{ email: "you", name: "You", rating: 4, notes: "", updatedAt: Date.now() }], likedBy: ["Mina"], photo: "", photoPath: "" }]
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
    dishes: [{ id: crypto.randomUUID(), name: "Hand pulled noodles", ratings: [{ email: "you", name: "You", rating: 5, notes: "Worth crossing town for.", updatedAt: Date.now() }], likedBy: ["Dany"], photo: "", photoPath: "" }]
  }
];

const config = window.PLATE_LOG_CONFIG ?? {};
const pointsAtProduction = String(config.supabaseUrl ?? "").includes(PRODUCTION_PROJECT_REF);
const productionConfigBlocked = pointsAtProduction && window.location.origin !== PRODUCTION_URL;
const canUseSupabase = Boolean(
  config.supabaseUrl &&
  config.supabasePublishableKey &&
  window.supabase &&
  !productionConfigBlocked
);
if (productionConfigBlocked) {
  console.error("FoodLog blocked production Supabase credentials outside the production origin.");
}
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

function captureSharedRestaurantFromUrl() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("capture") !== "restaurant") return;
  const title = url.searchParams.get("shared_title") ?? "";
  const text = url.searchParams.get("shared_text") ?? "";
  const sharedUrl = url.searchParams.get("shared_url") ?? "";
  const combined = [sharedUrl, text].join(" ");
  const maps = combined.match(/https:\/\/(?:maps\.app\.goo\.gl|goo\.gl|(?:www\.|maps\.)?google\.com\/maps)\/?\S*/i)?.[0] ?? "";
  const name = /google maps/i.test(title) ? "" : title.trim();
  sessionStorage.setItem(SHARED_CAPTURE_KEY, JSON.stringify({ name, maps }));
  ["capture", "shared_title", "shared_text", "shared_url"].forEach((key) => {
    url.searchParams.delete(key);
  });
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
}

function pendingSharedRestaurant() {
  try {
    const value = JSON.parse(sessionStorage.getItem(SHARED_CAPTURE_KEY) ?? "null");
    return value && typeof value === "object" ? value : null;
  } catch {
    sessionStorage.removeItem(SHARED_CAPTURE_KEY);
    return null;
  }
}

function maybeOpenSharedRestaurant() {
  const shared = pendingSharedRestaurant();
  if (!shared || els.restaurantModal.open) return;
  if (canUseSupabase && (!state.session || !state.canEdit)) return;
  openRestaurantModal(null, shared);
  sessionStorage.removeItem(SHARED_CAPTURE_KEY);
  if (shared.maps) {
    els.mapsResolveStatus.textContent = "Google Maps link received from your phone. Check it when you are ready.";
  }
}

captureSharedRestaurantFromUrl();

const state = {
  data: loadLocalData(),
  decisionSessions: loadLocalDecisionSessions(),
  selectedId: null,
  selectedDecisionSessionId: null,
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
  activeSurface: "places",
  mobileDetailOpen: false,
  playlistFilter: "all",
  managingPlaylistName: null,
  decisionRemoteReady: false,
  decisionLoading: false,
  trashItems: [],
  localTrash: loadLocalTrash(),
  localActivity: loadLocalActivity(),
  pendingImport: null,
  restaurantDuplicateMatches: [],
  dishDuplicateMatches: [],
  mapsResolution: null,
  originalDishPhoto: "",
  lastSavedRestaurantId: null,
  submitting: new Set()
};

let initialLoadDone = false;
let mapInstance = null;
let mapMarkers = [];
let leafletLoadPromise = null;
let authBootDone = false;
let remoteLoadInFlight = false;
let remoteReloadQueued = false;
let realtimeChannel = null;
let toastTimer = null;
let playlistLongPressTimer = null;
let suppressPlaylistChipClick = false;
let restaurantLongPressTimer = null;
let suppressRestaurantRowClick = false;
let restaurantLongPressOrigin = null;
let placeActionRestaurantId = null;
let dishLongPressTimer = null;
let dishLongPressOrigin = null;
let dishReviewsDishId = null;
let dishReviewDishId = null;
let mobileListScrollY = 0;
let detailSwipeGesture = null;
let suppressDetailPanelClick = false;
let duplicateWarningTimer = null;
let duplicateWarningSignature = "";
let dishDuplicateWarningTimer = null;
let dishDuplicateWarningSignature = "";
const dirtyForms = new Set();
const RESTAURANT_LONG_PRESS_MS = 520;
const RESTAURANT_LONG_PRESS_MOVE_PX = 10;
const DISH_REVIEWS_PREVIEW_LIMIT = 2;
const DETAIL_SWIPE_AXIS_PX = 10;
const DETAIL_SWIPE_VELOCITY_PX_MS = 0.42;
const DETAIL_SWIPE_SETTLE_MS = 180;
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS_INTEGRITY = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
const LEAFLET_JS_INTEGRITY = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";

function loadLocalDecisionSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DECISION_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalDecisionSessions() {
  localStorage.setItem(DECISION_STORAGE_KEY, JSON.stringify(state.decisionSessions));
}

function readLocalCollection(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLocalTrash() {
  return readLocalCollection(TRASH_STORAGE_KEY);
}

function loadLocalActivity() {
  return readLocalCollection(ACTIVITY_STORAGE_KEY);
}

function saveLocalTrash() {
  localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(state.localTrash));
}

function recordLocalActivity(action, entityType, entityId, details = {}) {
  state.localActivity.unshift({
    id: crypto.randomUUID(),
    action,
    entityType,
    entityId: String(entityId ?? ""),
    actor: currentRaterIdentity().email,
    details,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(state.localActivity.slice(0, 1000)));
}

function setFormPending(form, pending, message = "") {
  if (!form) return;
  form.setAttribute("aria-busy", String(pending));
  form.querySelectorAll('button[type="submit"], button[data-request-action]').forEach((button) => {
    button.disabled = pending;
  });
  let status = form.querySelector(".form-status");
  if (!status) {
    status = document.createElement("p");
    status.className = "form-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    form.append(status);
  }
  status.textContent = message;
  status.classList.toggle("form-status--error", Boolean(message) && !pending);
}

async function withSubmission(key, form, task) {
  if (state.submitting.has(key)) return null;
  state.submitting.add(key);
  setFormPending(form, true, "Saving…");
  let completionMessage = "Saved.";
  try {
    return await task();
  } catch (error) {
    completionMessage = error?.message || "Could not save. Your draft is still here.";
    throw error;
  } finally {
    state.submitting.delete(key);
    setFormPending(form, false, completionMessage);
  }
}

const els = {
  restaurantList: document.querySelector("#restaurantList"),
  detailPanel: document.querySelector("#detailPanel"),
  quickAddButton: document.querySelector("#quickAddButton"),
  searchInput: document.querySelector("#searchInput"),
  locationFilter: document.querySelector("#locationFilter"),
  cuisineFilter: document.querySelector("#cuisineFilter"),
  priceFilter: document.querySelector("#priceFilter"),
  ratingFilter: document.querySelector("#ratingFilter"),
  playlistSwitcher: document.querySelector("#playlistSwitcher"),
  playlistFilterHint: document.querySelector("#playlistFilterHint"),
  playlistShowAllButton: document.querySelector("#playlistShowAllButton"),
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
  restaurantDuplicateWarning: document.querySelector("#restaurantDuplicateWarning"),
  restaurantDuplicateList: document.querySelector("#restaurantDuplicateList"),
  restaurantDuplicateOverride: document.querySelector("#restaurantDuplicateOverride"),
  restaurantErrorSummary: document.querySelector("#restaurantErrorSummary"),
  restaurantDraftStatus: document.querySelector("#restaurantDraftStatus"),
  restaurantIntentFieldset: document.querySelector("#restaurantIntentFieldset"),
  planDetails: document.querySelector("#planDetails"),
  visitDetails: document.querySelector("#visitDetails"),
  restaurantDangerDetails: document.querySelector("#restaurantDangerDetails"),
  restaurantWantToGo: document.querySelector("#restaurantWantToGo"),
  restaurantSuccess: document.querySelector("#restaurantSuccess"),
  restaurantSuccessTitle: document.querySelector("#restaurantSuccessTitle"),
  restaurantSuccessMessage: document.querySelector("#restaurantSuccessMessage"),
  restaurantEditorBody: document.querySelector("#restaurantEditorBody"),
  restaurantModalActions: document.querySelector("#restaurantModalActions"),
  discardRestaurantDraft: document.querySelector("#discardRestaurantDraft"),
  saveRestaurantButton: document.querySelector("#saveRestaurantButton"),
  successAddDish: document.querySelector("#successAddDish"),
  successAddPhotos: document.querySelector("#successAddPhotos"),
  successDone: document.querySelector("#successDone"),
  locationSelect: document.querySelector("#locationSelect"),
  locationInput: document.querySelector("#locationInput"),
  cuisineSelect: document.querySelector("#cuisineSelect"),
  cuisineInput: document.querySelector("#cuisineInput"),
  playlistPicker: document.querySelector("#playlistPicker"),
  playlistInput: document.querySelector("#playlistInput"),
  priceInput: document.querySelector("#priceInput"),
  ratingInput: document.querySelector("#ratingInput"),
  mapsInput: document.querySelector("#mapsInput"),
  resolveMapsButton: document.querySelector("#resolveMapsButton"),
  mapsResolveStatus: document.querySelector("#mapsResolveStatus"),
  mapsResolvePreview: document.querySelector("#mapsResolvePreview"),
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
  dishErrorSummary: document.querySelector("#dishErrorSummary"),
  dishDraftStatus: document.querySelector("#dishDraftStatus"),
  dishDuplicateWarning: document.querySelector("#dishDuplicateWarning"),
  dishDuplicateList: document.querySelector("#dishDuplicateList"),
  dishDuplicateOverride: document.querySelector("#dishDuplicateOverride"),
  dishRatingInput: document.querySelector("#dishRatingInput"),
  dishLikedByInput: document.querySelector("#dishLikedByInput"),
  dishPhotoInput: document.querySelector("#dishPhotoInput"),
  dishCameraInput: document.querySelector("#dishCameraInput"),
  dishNotesInput: document.querySelector("#dishNotesInput"),
  photoPreview: document.querySelector("#photoPreview"),
  deleteDishButton: document.querySelector("#deleteDishButton"),
  dishDangerDetails: document.querySelector("#dishDangerDetails"),
  discardDishDraft: document.querySelector("#discardDishDraft"),
  saveDishAndAnotherButton: document.querySelector("#saveDishAndAnotherButton"),
  dishReviewModal: document.querySelector("#dishReviewModal"),
  dishReviewForm: document.querySelector("#dishReviewForm"),
  dishReviewEyebrow: document.querySelector("#dishReviewEyebrow"),
  dishReviewTitle: document.querySelector("#dishReviewTitle"),
  dishReviewIdentity: document.querySelector("#dishReviewIdentity"),
  dishReviewErrorSummary: document.querySelector("#dishReviewErrorSummary"),
  dishReviewRatingInput: document.querySelector("#dishReviewRatingInput"),
  dishReviewNotesInput: document.querySelector("#dishReviewNotesInput"),
  trashMyDishReview: document.querySelector("#trashMyDishReview"),
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
  listActionTip: document.querySelector("#listActionTip"),
  pickerPanel: document.querySelector("#pickerPanel"),
  newDecisionButton: document.querySelector("#newDecisionButton"),
  decisionSessionList: document.querySelector("#decisionSessionList"),
  decisionShortlist: document.querySelector("#decisionShortlist"),
  decisionSummary: document.querySelector("#decisionSummary"),
  decisionModal: document.querySelector("#decisionModal"),
  decisionForm: document.querySelector("#decisionForm"),
  decisionTitleInput: document.querySelector("#decisionTitleInput"),
  decisionPlannedAtInput: document.querySelector("#decisionPlannedAtInput"),
  decisionNotesInput: document.querySelector("#decisionNotesInput"),
  closeDecisionModal: document.querySelector("#closeDecisionModal"),
  cancelDecisionButton: document.querySelector("#cancelDecisionButton"),
  trashButton: document.querySelector("#trashButton"),
  trashModal: document.querySelector("#trashModal"),
  closeTrashModal: document.querySelector("#closeTrashModal"),
  trashList: document.querySelector("#trashList"),
  importPreviewModal: document.querySelector("#importPreviewModal"),
  importPreviewBody: document.querySelector("#importPreviewBody"),
  closeImportPreviewModal: document.querySelector("#closeImportPreviewModal"),
  cancelImportButton: document.querySelector("#cancelImportButton"),
  confirmImportButton: document.querySelector("#confirmImportButton"),
  placeActionSheet: document.querySelector("#placeActionSheet"),
  placeActionTitle: document.querySelector("#placeActionTitle"),
  placeActionWantToGo: document.querySelector("#placeActionWantToGo"),
  placeActionWantToGoLabel: document.querySelector("#placeActionWantToGoLabel"),
  closePlaceActionSheet: document.querySelector("#closePlaceActionSheet"),
  dishReviewsSheet: document.querySelector("#dishReviewsSheet"),
  dishReviewsTitle: document.querySelector("#dishReviewsTitle"),
  dishReviewsBody: document.querySelector("#dishReviewsBody"),
  closeDishReviewsSheet: document.querySelector("#closeDishReviewsSheet"),
  dishReviewsWriteButton: document.querySelector("#dishReviewsWriteButton"),
  ratingStarsRow: document.querySelector("#ratingStarsRow"),
  ratingReadout: document.querySelector("#ratingReadout"),
  ratingClear: document.querySelector("#ratingClear"),
  dishRatingStarsRow: document.querySelector("#dishRatingStarsRow"),
  dishRatingReadout: document.querySelector("#dishRatingReadout"),
  dishRatingClear: document.querySelector("#dishRatingClear"),
  dishReviewStarsRow: document.querySelector("#dishReviewStarsRow"),
  dishReviewRatingReadout: document.querySelector("#dishReviewRatingReadout"),
  dishReviewRatingClear: document.querySelector("#dishReviewRatingClear"),
  visitedPicker: document.querySelector("#visitedPicker"),
  likedByPicker: document.querySelector("#likedByPicker"),
  toast: document.querySelector("#toast"),
  mapPanel: document.querySelector("#mapPanel"),
  listLayout: document.querySelector("#listLayout"),
  restaurantMap: document.querySelector("#restaurantMap"),
  mapHint: document.querySelector("#mapHint"),
  retryMapButton: document.querySelector("#retryMapButton")
};

const initialUrlPlace = readPlaceFromUrl();
state.selectedId = initialUrlPlace ?? activeRecords(state.data)[0]?.id ?? null;
state.mobileDetailOpen = Boolean(initialUrlPlace);
state.selectedDecisionSessionId = state.decisionSessions[0]?.id ?? null;
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
  return [...new Set(activeRecords(state.data).map((item) => item[key]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

// Playlists are stored as an array per restaurant, so collect names across all of them.
function dataPlaylistNames() {
  const names = new Set();
  for (const restaurant of activeRecords(state.data)) {
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
    client.from("playlists").select("name").is("deleted_at", null).order("name")
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
  recordRecentCaptureChoice("location", location);
  recordRecentCaptureChoice("cuisine", cuisine);
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
  return activeRecords(Array.isArray(restaurant?.ratings) ? restaurant.ratings : []);
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

function dishRatings(dish) {
  return activeRecords(Array.isArray(dish?.ratings) ? dish.ratings : []);
}

function averageDishRating(dish) {
  const ratings = dishRatings(dish);
  if (!ratings.length) return null;
  const sum = ratings.reduce((total, entry) => total + Number(entry.rating || 0), 0);
  return sum / ratings.length;
}

function myDishRatingFor(dish) {
  const mine = myDishReviewEntry(dish);
  return mine ? Number(mine.rating) : null;
}

function myDishReviewFor(dish) {
  return myDishReviewEntry(dish)?.notes ?? "";
}

function myDishReviewEntry(dish) {
  const { email } = currentRaterIdentity();
  return dishRatings(dish).find((entry) => entry.email.toLowerCase() === email.toLowerCase()) ?? null;
}

function isWantToGoVisible() {
  return state.canEdit || !canUseSupabase;
}

function isWantToGo(restaurant) {
  return restaurant?.wantToGo === true;
}

function wantToGoMarkHtml() {
  return `<span class="want-to-go-mark" aria-hidden="true" title="Want to go"><svg viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg></span>`;
}

function wantToGoRowActionHtml(restaurant) {
  const marked = isWantToGo(restaurant);
  const actionLabel = marked
    ? `Remove ${restaurant.name} from Want to go`
    : `Mark ${restaurant.name} as Want to go`;
  return `<button class="row-action row-action--want ${marked ? "is-active" : ""}" type="button" data-action="toggle-want" data-restaurant-id="${restaurant.id}" aria-label="${escapeHtml(actionLabel)}" aria-pressed="${String(marked)}" title="${marked ? "Want to go — tap to remove" : "Mark as Want to go"}">${marked ? wantToGoMarkHtml() : "Want to go"}</button>`;
}

function ratingLabelFor(entry) {
  const resolved = resolveUpdatedByLabel(entry.name || entry.email);
  return resolved || entry.name || emailLocalPart(entry.email) || "Someone";
}

// ----- Interactive star pickers (restaurant, dish editor, and direct dish review) -----
// Tap or slide on the track; snaps to half stars (0.5–5). Restaurant allows "none".
let restaurantStarPicker = null;
let dishStarPicker = null;
let dishReviewStarPicker = null;

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
    clearButton: els.dishRatingClear,
    allowNone: true,
    fallbackValue: 4,
    dragging: false,
    fillEl: null
  };
  dishReviewStarPicker = {
    track: els.dishReviewStarsRow,
    input: els.dishReviewRatingInput,
    readout: els.dishReviewRatingReadout,
    clearButton: els.dishReviewRatingClear,
    allowNone: true,
    fallbackValue: 4,
    dragging: false,
    fillEl: null
  };
  wireStarPicker(restaurantStarPicker);
  wireStarPicker(dishStarPicker);
  wireStarPicker(dishReviewStarPicker);
}

function setRatingValue(value) {
  setPickerValue(restaurantStarPicker, value);
}

function setDishRatingValue(value) {
  setPickerValue(dishStarPicker, value);
}

function setDishReviewRatingValue(value) {
  setPickerValue(dishReviewStarPicker, value);
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

function updateBrowseUrl() {
  const url = new URL(window.location.href);
  const values = {
    q: els.searchInput.value.trim(),
    location: els.locationFilter.value === "all" ? "" : els.locationFilter.value,
    cuisine: els.cuisineFilter.value === "all" ? "" : els.cuisineFilter.value,
    price: els.priceFilter.value === "all" ? "" : els.priceFilter.value,
    rating: els.ratingFilter.value === "0" ? "" : els.ratingFilter.value,
    playlist: state.playlistFilter === "all" ? "" : state.playlistFilter,
    sort: state.sort === "recent" ? "" : state.sort,
    view: state.activeSurface === "places" ? "" : state.activeSurface,
    session: state.activeSurface === "pick" ? state.selectedDecisionSessionId ?? "" : ""
  };
  Object.entries(values).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  });
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
  updateBrowseUrl();
}

function loadFilterPrefs() {
  try {
    const raw = localStorage.getItem(FILTER_PREFS_KEY);
    const prefs = raw ? JSON.parse(raw) : {};
    const params = new URL(window.location.href).searchParams;
    if (params.has("q")) prefs.search = params.get("q");
    if (params.has("location")) prefs.location = params.get("location");
    if (params.has("cuisine")) prefs.cuisine = params.get("cuisine");
    if (params.has("price")) prefs.price = params.get("price");
    if (params.has("rating")) prefs.rating = params.get("rating");
    if (params.has("playlist")) prefs.playlist = params.get("playlist");
    if (params.has("sort")) prefs.sort = params.get("sort");
    if (params.has("view")) state.activeSurface = params.get("view");
    if (params.has("session")) state.selectedDecisionSessionId = params.get("session");
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
  hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
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
  return restaurantById(state.selectedId) ?? activeRecords(state.data)[0] ?? null;
}

function restaurantById(id) {
  return activeRecords(state.data).find((restaurant) => restaurant.id === id) ?? null;
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
      .update({ deleted_at: new Date().toISOString(), deleted_by: email })
      .eq("restaurant_id", restaurantId)
      .eq("rater_email", email)
      .is("deleted_at", null);
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from("restaurant_ratings")
    .upsert(
      {
        restaurant_id: restaurantId,
        rater_email: email,
        rater_name: name,
        rating: Number(value),
        deleted_at: null,
        deleted_by: null
      },
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
        .update({ deleted_at: new Date().toISOString(), deleted_by: editorEmail() })
        .eq("restaurant_id", restaurant.id)
        .eq("rater_email", target)
        .is("deleted_at", null);
      if (error) throw error;
      await loadRemoteData();
    } else {
      restaurant.ratings = (restaurant.ratings ?? []).map((item) =>
        item.email.toLowerCase() === target
          ? trashRecord(item, currentRaterIdentity().email)
          : item
      );
      recordLocalActivity("trash", "restaurant_rating", `${restaurant.id}:${target}`);
      saveLocalData();
      render();
    }
  } catch (error) {
    showToast(`Could not remove rating: ${error.message}`);
  }
}

async function saveMyDishRatingRemote(dishId, rating, notes = "") {
  if (!client) return;
  const { email, name } = currentRaterIdentity();
  if (!email) return;

  if (rating === null || rating === undefined || rating === "none" || rating === "") {
    const { error } = await client
      .from("dish_ratings")
      .update({ deleted_at: new Date().toISOString(), deleted_by: email })
      .eq("dish_id", dishId)
      .eq("rater_email", email)
      .is("deleted_at", null);
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from("dish_ratings")
    .upsert(
      {
        dish_id: dishId,
        rater_email: email,
        rater_name: name,
        rating: Number(rating),
        notes: String(notes ?? "").trim(),
        deleted_at: null,
        deleted_by: null
      },
      { onConflict: "dish_id,rater_email" }
    );
  if (error) throw error;
}

async function removeDishRating(dishId, email) {
  const restaurant = currentRestaurant();
  const target = String(email ?? "").toLowerCase();
  const dish = restaurant?.dishes.find((item) => item.id === dishId);
  if (!dish || !target || !isSuperuser()) return;

  const entry = dishRatings(dish).find((item) => item.email.toLowerCase() === target);
  const label = entry ? ratingLabelFor(entry) : target;
  if (!confirm(`Remove ${label}'s review for ${dish.name}?`)) return;

  try {
    if (state.remoteReady) {
      const { error } = await client
        .from("dish_ratings")
        .update({ deleted_at: new Date().toISOString(), deleted_by: editorEmail() })
        .eq("dish_id", dishId)
        .eq("rater_email", target)
        .is("deleted_at", null);
      if (error) throw error;
      closeDishReviewsSheet();
      await loadRemoteData();
    } else {
      dish.ratings = (dish.ratings ?? []).map((item) =>
        item.email.toLowerCase() === target
          ? trashRecord(item, currentRaterIdentity().email)
          : item
      );
      recordLocalActivity("trash", "dish_rating", `${dishId}:${target}`);
      closeDishReviewsSheet();
      saveLocalData();
      render();
    }
  } catch (error) {
    showToast(`Could not remove review: ${error.message}`);
  }
}

function applyMyDishRatingLocal(dish, rating, notes = "") {
  const { email, name } = currentRaterIdentity();
  const allRatings = Array.isArray(dish.ratings) ? dish.ratings : [];
  const existing = allRatings.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  const others = allRatings.filter((entry) => entry.email.toLowerCase() !== email.toLowerCase());
  if (rating === null || rating === undefined || rating === "none" || rating === "") {
    dish.ratings = existing ? [...others, trashRecord(existing, email)] : others;
  } else {
    dish.ratings = [
      ...others,
      {
        ...restoreRecord(existing ?? {}),
        email,
        name,
        rating: Number(rating),
        notes: String(notes ?? "").trim(),
        updatedAt: Date.now()
      }
    ].sort((a, b) => b.rating - a.rating);
  }
}

// Local-only mode equivalent: mutate the in-memory ratings array.
function applyMyRatingLocal(restaurant, value) {
  const { email, name } = currentRaterIdentity();
  const allRatings = Array.isArray(restaurant.ratings) ? restaurant.ratings : [];
  const existing = allRatings.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  const others = allRatings.filter(
    (entry) => entry.email.toLowerCase() !== email.toLowerCase()
  );
  if (value === null || value === undefined || value === "none" || value === "") {
    restaurant.ratings = existing ? [...others, trashRecord(existing, email)] : others;
  } else {
    restaurant.ratings = [...others, { ...restoreRecord(existing ?? {}), email, name, rating: Number(value), updatedAt: Date.now() }].sort(
      (a, b) => b.rating - a.rating
    );
  }
}

async function saveWantToGoRemote(restaurantId, want) {
  if (!client) return;
  const email = editorEmail();
  if (!email) return;

  if (!want) {
    const { error } = await client
      .from("restaurant_want_to_go")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("user_email", email);
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from("restaurant_want_to_go")
    .upsert({ restaurant_id: restaurantId, user_email: email }, { onConflict: "restaurant_id,user_email" });
  if (error) throw error;
}

function applyWantToGoLocal(restaurant, want) {
  const wasSaved = Boolean(restaurant.wantToGo);
  restaurant.wantToGo = Boolean(want);
  const currentCount = Number(restaurant.wantToGoCount ?? (wasSaved ? 1 : 0));
  restaurant.wantToGoCount = Math.max(0, currentCount + (want && !wasSaved ? 1 : !want && wasSaved ? -1 : 0));
}

async function setWantToGo(restaurantId, want) {
  const restaurant = restaurantById(restaurantId);
  if (!restaurant || !isWantToGoVisible()) return;

  try {
    if (state.remoteReady && canUseSupabase) {
      await saveWantToGoRemote(restaurant.id, want);
      applyWantToGoLocal(restaurant, want);
      render();
      showToast(want ? "Marked as Want to go" : "Removed Want to go");
      void loadRemoteData();
    } else {
      applyWantToGoLocal(restaurant, want);
      saveLocalData();
      render();
      showToast(want ? "Marked as Want to go" : "Removed Want to go");
    }
  } catch (error) {
    showToast(`Want to go was not updated: ${error.message}`);
  }
}

async function toggleWantToGo(restaurantId) {
  const id = restaurantId ?? currentRestaurant()?.id;
  const restaurant = restaurantById(id);
  if (!restaurant) return;
  await setWantToGo(id, !isWantToGo(restaurant));
}

function closePlaceActionSheet() {
  placeActionRestaurantId = null;
  els.placeActionSheet?.close();
}

function openPlaceActionMenu(restaurantId) {
  if (!isWantToGoVisible()) return;
  const restaurant = restaurantById(restaurantId);
  if (!restaurant) return;

  placeActionRestaurantId = restaurantId;
  if (els.placeActionTitle) els.placeActionTitle.textContent = restaurant.name;
  const marked = isWantToGo(restaurant);
  if (els.placeActionWantToGoLabel) {
    els.placeActionWantToGoLabel.textContent = marked ? "Remove Want to go" : "Mark as Want to go";
  }
  if (els.placeActionWantToGo) {
    els.placeActionWantToGo.classList.toggle("is-active", marked);
    els.placeActionWantToGo.setAttribute("aria-pressed", String(marked));
  }
  els.placeActionSheet?.showModal();
  navigator.vibrate?.(12);
}

function clearRestaurantLongPress() {
  clearTimeout(restaurantLongPressTimer);
  restaurantLongPressTimer = null;
  restaurantLongPressOrigin = null;
  document.querySelectorAll(".restaurant-row.is-holding").forEach((row) => row.classList.remove("is-holding"));
}

function startRestaurantLongPress(row, event) {
  if (!isWantToGoVisible()) return;
  clearRestaurantLongPress();
  restaurantLongPressOrigin = { x: event.clientX, y: event.clientY, row, pointerId: event.pointerId };
  row.classList.add("is-holding");
  restaurantLongPressTimer = setTimeout(() => {
    suppressRestaurantRowClick = true;
    openPlaceActionMenu(row.dataset.id);
    clearRestaurantLongPress();
  }, RESTAURANT_LONG_PRESS_MS);
}

function moveCancelsRestaurantLongPress(event) {
  if (!restaurantLongPressOrigin) return false;
  const dx = event.clientX - restaurantLongPressOrigin.x;
  const dy = event.clientY - restaurantLongPressOrigin.y;
  return Math.hypot(dx, dy) > RESTAURANT_LONG_PRESS_MOVE_PX;
}

function dishById(dishId) {
  return activeRecords(currentRestaurant()?.dishes ?? []).find((item) => item.id === dishId) ?? null;
}

function closeDishReviewsSheet() {
  dishReviewsDishId = null;
  els.dishReviewsSheet?.close();
}

function openDishReviewsSheet(dishId) {
  const dish = dishById(dishId);
  if (!dish || !dishRatings(dish).length) return;

  dishReviewsDishId = dishId;
  const count = dishRatings(dish).length;
  if (els.dishReviewsTitle) {
    els.dishReviewsTitle.textContent = `${dish.name} · ${count} ${count === 1 ? "review" : "reviews"}`;
  }
  if (els.dishReviewsBody) {
    els.dishReviewsBody.innerHTML = renderDishRatingsFullList(dish);
  }
  if (els.dishReviewsWriteButton) {
    const canReview = state.canEdit || !canUseSupabase;
    els.dishReviewsWriteButton.hidden = !canReview;
    els.dishReviewsWriteButton.textContent = myDishReviewEntry(dish) ? "Edit your review" : "Add your review";
  }
  els.dishReviewsSheet?.showModal();
  navigator.vibrate?.(12);
}

function closeDishReviewModal() {
  dishReviewDishId = null;
  dirtyForms.delete(els.dishReviewForm);
  els.dishReviewForm?.reset();
  clearFormValidation(els.dishReviewForm, els.dishReviewErrorSummary);
  setFormPending(els.dishReviewForm, false, "");
  els.dishReviewModal?.close();
}

function openDishReviewModal(dishId) {
  if (!requireEditor()) return;
  const dish = dishById(dishId);
  if (!dish) return;

  const mine = myDishReviewEntry(dish);
  const identity = currentRaterIdentity();
  dishReviewDishId = dishId;
  if (els.dishReviewsSheet?.open) closeDishReviewsSheet();
  if (els.dishReviewEyebrow) els.dishReviewEyebrow.textContent = dish.name;
  if (els.dishReviewTitle) els.dishReviewTitle.textContent = mine ? "Edit your review" : "Add your review";
  if (els.dishReviewIdentity) {
    els.dishReviewIdentity.textContent = `Posting as ${identity.name}. Your rating stays separate from everyone else’s.`;
  }
  setDishReviewRatingValue(mine ? Number(mine.rating) : null);
  if (els.dishReviewNotesInput) els.dishReviewNotesInput.value = mine?.notes ?? "";
  if (els.trashMyDishReview) els.trashMyDishReview.hidden = !mine;
  clearFormValidation(els.dishReviewForm, els.dishReviewErrorSummary);
  setFormPending(els.dishReviewForm, false, "");
  els.dishReviewModal?.showModal();
  requestAnimationFrame(() => els.dishReviewStarsRow?.focus());
}

async function saveDishReview(event) {
  event.preventDefault();
  clearFormValidation(els.dishReviewForm, els.dishReviewErrorSummary);
  const dish = dishById(dishReviewDishId);
  if (!dish) {
    els.dishReviewErrorSummary.innerHTML = "<strong>Could not find this dish</strong><p>Close this window, reopen the dish, and try again.</p>";
    els.dishReviewErrorSummary.hidden = false;
    return;
  }

  const ratingValue = els.dishReviewRatingInput.value === "none"
    ? null
    : Number(els.dishReviewRatingInput.value);
  if (ratingValue === null) {
    els.dishReviewErrorSummary.innerHTML = "<strong>Choose a rating</strong><p>Select at least half a star before saving your review.</p>";
    els.dishReviewErrorSummary.hidden = false;
    els.dishReviewErrorSummary.focus();
    return;
  }

  const notes = els.dishReviewNotesInput.value.trim();
  const existing = myDishReviewEntry(dish);
  try {
    await withSubmission("dish-review", els.dishReviewForm, async () => {
      if (state.remoteReady) {
        await saveMyDishRatingRemote(dish.id, ratingValue, notes);
        await loadRemoteData();
        const cachedDish = dishById(dish.id) ?? dish;
        applyMyDishRatingLocal(cachedDish, ratingValue, notes);
        saveLocalData();
        render();
      } else {
        applyMyDishRatingLocal(dish, ratingValue, notes);
        const { email } = currentRaterIdentity();
        recordLocalActivity(existing ? "edit" : "create", "dish_rating", `${dish.id}:${email}`, { dishId: dish.id });
        saveLocalData();
        render();
      }
      closeDishReviewModal();
      showToast(existing ? "Your review was updated" : "Your review was added");
    });
  } catch (error) {
    console.error("Dish review save failed", error);
    els.dishReviewErrorSummary.innerHTML = `<strong>Could not save your review</strong><p>${escapeHtml(error.message)}</p>`;
    els.dishReviewErrorSummary.hidden = false;
    els.dishReviewErrorSummary.focus();
  }
}

async function trashMyDishReview() {
  const dish = dishById(dishReviewDishId);
  const mine = myDishReviewEntry(dish);
  if (!dish || !mine) return;
  if (!confirm(`Move your review for ${dish.name} to Trash? You can restore it later.`)) return;

  try {
    await withSubmission("dish-review", els.dishReviewForm, async () => {
      if (state.remoteReady) {
        await saveMyDishRatingRemote(dish.id, null);
        await loadRemoteData();
        const cachedDish = dishById(dish.id) ?? dish;
        applyMyDishRatingLocal(cachedDish, null);
        saveLocalData();
        render();
      } else {
        applyMyDishRatingLocal(dish, null);
        recordLocalActivity("trash", "dish_rating", `${dish.id}:${mine.email}`, { dishId: dish.id });
        saveLocalData();
        render();
      }
      closeDishReviewModal();
      showToast("Your review was moved to Trash");
    });
  } catch (error) {
    console.error("Dish review trash failed", error);
    els.dishReviewErrorSummary.innerHTML = `<strong>Could not move your review to Trash</strong><p>${escapeHtml(error.message)}</p>`;
    els.dishReviewErrorSummary.hidden = false;
    els.dishReviewErrorSummary.focus();
  }
}

function clearDishLongPress() {
  clearTimeout(dishLongPressTimer);
  dishLongPressTimer = null;
  dishLongPressOrigin = null;
  document.querySelectorAll(".dish-card.is-holding").forEach((card) => card.classList.remove("is-holding"));
}

function startDishLongPress(card, event) {
  if (!card.dataset.hasReviews) return;
  if (event.target.closest("[data-action]")) return;
  clearDishLongPress();
  dishLongPressOrigin = { x: event.clientX, y: event.clientY, card, pointerId: event.pointerId };
  card.classList.add("is-holding");
  dishLongPressTimer = setTimeout(() => {
    openDishReviewsSheet(card.dataset.dishId);
    clearDishLongPress();
  }, RESTAURANT_LONG_PRESS_MS);
}

function moveCancelsDishLongPress(event) {
  if (!dishLongPressOrigin) return false;
  const dx = event.clientX - dishLongPressOrigin.x;
  const dy = event.clientY - dishLongPressOrigin.y;
  return Math.hypot(dx, dy) > RESTAURANT_LONG_PRESS_MOVE_PX;
}

function resetDetailSwipeStyles() {
  els.detailPanel.classList.remove("is-swipe-dragging", "is-swipe-settling");
  els.detailPanel.style.removeProperty("transform");
  els.detailPanel.style.removeProperty("opacity");
}

function closeMobileDetail({ restoreFocus = true } = {}) {
  if (!state.mobileDetailOpen) return;
  detailSwipeGesture = null;
  resetDetailSwipeStyles();
  state.mobileDetailOpen = false;
  updatePlaceUrl(null);
  render();
  requestAnimationFrame(() => {
    window.scrollTo({ top: mobileListScrollY, behavior: "auto" });
    if (!restoreFocus) return;
    els.restaurantList
      .querySelector(`[data-id="${CSS.escape(state.selectedId ?? "")}"]`)
      ?.focus({ preventScroll: true });
  });
}

function startDetailSwipe(event) {
  if (
    !state.mobileDetailOpen
    || window.innerWidth > 980
    || event.button !== 0
    || event.isPrimary === false
    || !["touch", "pen"].includes(event.pointerType)
    || event.target.closest("button, a, input, select, textarea, [contenteditable='true']")
  ) {
    return;
  }

  detailSwipeGesture = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startTime: performance.now(),
    axis: null,
    deltaX: 0
  };
}

function moveDetailSwipe(event) {
  if (!detailSwipeGesture || event.pointerId !== detailSwipeGesture.pointerId) return;

  const rawX = event.clientX - detailSwipeGesture.startX;
  const rawY = event.clientY - detailSwipeGesture.startY;
  if (!detailSwipeGesture.axis) {
    if (Math.hypot(rawX, rawY) < DETAIL_SWIPE_AXIS_PX) return;
    detailSwipeGesture.axis = Math.abs(rawX) > Math.abs(rawY) * 1.15 ? "horizontal" : "vertical";
    if (detailSwipeGesture.axis === "vertical") return;
    clearDishLongPress();
    suppressDetailPanelClick = true;
    els.detailPanel.classList.add("is-swipe-dragging");
    try {
      els.detailPanel.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers manage touch capture themselves; the gesture can continue without it.
    }
  }

  if (detailSwipeGesture.axis !== "horizontal") return;
  const deltaX = rawX >= 0 ? rawX : Math.max(-10, rawX * 0.08);
  detailSwipeGesture.deltaX = deltaX;
  const progress = Math.min(Math.max(deltaX, 0) / Math.max(window.innerWidth, 1), 1);
  els.detailPanel.style.transform = `translate3d(${deltaX}px, 0, 0)`;
  els.detailPanel.style.opacity = String(1 - progress * 0.12);
  if (event.cancelable) event.preventDefault();
}

function finishDetailSwipe(event, cancelled = false) {
  if (!detailSwipeGesture || event.pointerId !== detailSwipeGesture.pointerId) return;

  const gesture = detailSwipeGesture;
  detailSwipeGesture = null;
  if (gesture.axis !== "horizontal") {
    resetDetailSwipeStyles();
    return;
  }

  const elapsed = Math.max(performance.now() - gesture.startTime, 1);
  const velocity = gesture.deltaX / elapsed;
  const distanceThreshold = Math.min(140, Math.max(88, window.innerWidth * 0.26));
  const shouldClose = !cancelled
    && (gesture.deltaX >= distanceThreshold || (gesture.deltaX >= 32 && velocity >= DETAIL_SWIPE_VELOCITY_PX_MS));

  els.detailPanel.classList.remove("is-swipe-dragging");
  els.detailPanel.classList.add("is-swipe-settling");

  if (shouldClose) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      closeMobileDetail({ restoreFocus: false });
    } else {
      els.detailPanel.style.transform = "translate3d(calc(100vw + 24px), 0, 0)";
      els.detailPanel.style.opacity = "0.88";
      window.setTimeout(() => closeMobileDetail({ restoreFocus: false }), DETAIL_SWIPE_SETTLE_MS);
    }
  } else {
    els.detailPanel.style.transform = "translate3d(0, 0, 0)";
    els.detailPanel.style.opacity = "1";
    window.setTimeout(resetDetailSwipeStyles, DETAIL_SWIPE_SETTLE_MS);
  }

  window.setTimeout(() => {
    suppressDetailPanelClick = false;
  }, DETAIL_SWIPE_SETTLE_MS + 40);
}

function truncateText(value, maxLength = 72) {
  const text = String(value ?? "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function dishToRow(dish, restaurantId, photoPath = dish.photoPath ?? "") {
  const row = {
    restaurant_id: restaurantId,
    name: dish.name,
    rating: 0,
    liked_by: dish.likedBy ?? [],
    notes: "",
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
  if (!client) return;
  if (remoteLoadInFlight) {
    remoteReloadQueued = true;
    return;
  }
  remoteLoadInFlight = true;

  const { reason } = options;
  const isFirstLoad = state.data.length === 0;
  if (isFirstLoad) {
    state.loading = true;
    render();
  } else {
    if (state.session) {
      setSync("Syncing…", "Fetching latest data from Cloud…");
    }
  }

  try {
    const localSnapshot = state.data;
    const [restaurantsResult, myWantResult, wantTotalsResult] = await Promise.all([
      client
        .from("restaurants")
        .select("id,name,location,cuisine,playlist,playlists,price,rating,maps,notes,visited,cover_photo_id,updated_at,updated_by,deleted_at,restaurant_ratings(rater_email,rater_name,rating,updated_at,deleted_at),restaurant_photos!restaurant_photos_restaurant_id_fkey(id,photo_path,created_at,deleted_at),dishes(id,name,rating,liked_by,notes,photo_path,updated_at,updated_by,deleted_at,dish_ratings(rater_email,rater_name,rating,notes,updated_at,deleted_at))")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false }),
      editorEmail()
        ? client.from("restaurant_want_to_go").select("restaurant_id").eq("user_email", editorEmail())
        : Promise.resolve({ data: [], error: null }),
      client.rpc("get_want_to_go_totals")
    ]);
    const { data, error } = restaurantsResult;
    const relatedError = myWantResult.error || wantTotalsResult.error;

    if (error || relatedError) {
      const message = (error || relatedError).message;
      state.syncError = message;
      setSync("Cloud error", message);
      state.loading = false;
      render();
      return;
    }

    const myWantIds = new Set((myWantResult.data ?? []).map((entry) => entry.restaurant_id));
    const wantTotals = new Map(
      (wantTotalsResult.data ?? []).map((entry) => [entry.restaurant_id, Number(entry.want_to_go_count)])
    );
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
        wantToGo: myWantIds.has(restaurant.id),
        wantToGoCount: wantTotals.get(restaurant.id) ?? 0,
        ratings: (restaurant.restaurant_ratings ?? [])
          .filter((entry) => !entry.deleted_at)
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
          .filter((photo) => !photo.deleted_at)
          .sort((a, b) => toMillis(b.created_at) - toMillis(a.created_at))
          .map((photo) => ({
            id: photo.id,
            photoPath: photo.photo_path ?? "",
            photo: publicPhotoUrl(photo.photo_path),
            createdAt: toMillis(photo.created_at),
            isCover: photo.id === restaurant.cover_photo_id
          })),
        dishes: await Promise.all(
          (restaurant.dishes ?? [])
            .filter((dish) => !dish.deleted_at)
            .sort((a, b) => toMillis(b.updated_at) - toMillis(a.updated_at))
            .map(async (dish) => ({
              id: dish.id,
              name: dish.name,
              ratings: (dish.dish_ratings ?? [])
                .filter((entry) => !entry.deleted_at)
                .map((entry) => ({
                  email: (entry.rater_email ?? "").toLowerCase(),
                  name: entry.rater_name ?? "",
                  rating: Number(entry.rating),
                  notes: entry.notes ?? "",
                  updatedAt: toMillis(entry.updated_at)
                }))
                .sort((a, b) => b.rating - a.rating),
              likedBy: dish.liked_by ?? [],
              photoPath: dish.photo_path ?? "",
              photo: publicPhotoUrl(dish.photo_path),
              updatedBy: dish.updated_by ?? "",
              updatedAt: toMillis(dish.updated_at)
            }))
        )
      }))
    );

    const merged = mergePendingRestaurants(localSnapshot, parsedData);
    state.data = merged.restaurants;
    saveLocalData();

    const urlPlace = readPlaceFromUrl();
    if (urlPlace && state.data.some((item) => item.id === urlPlace)) {
      state.selectedId = urlPlace;
    } else {
      state.selectedId = activeRecords(state.data).some((item) => item.id === state.selectedId) ? state.selectedId : activeRecords(state.data)[0]?.id ?? null;
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
    if (remoteReloadQueued) {
      remoteReloadQueued = false;
      queueMicrotask(() => void loadRemoteData({ reason: "realtime" }));
    }
  }
}

function queueRemoteLoad(reason = "realtime") {
  if (!client) return;
  if (remoteLoadInFlight) {
    remoteReloadQueued = true;
    return;
  }
  void loadRemoteData({ reason });
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

async function saveRestaurantRemote(payload, existingId, ratingValue) {
  const { data, error } = await client.rpc("save_restaurant_with_rating", {
    p_restaurant: payload,
    p_rating: ratingValue,
    p_restaurant_id: existingId ?? null
  });
  if (error) throw error;
  return data;
}

async function saveRestaurantCaptureRemote(payload, ratingValue, wantToGo) {
  const { data, error } = await client.rpc("save_restaurant_capture", {
    p_restaurant: payload,
    p_rating: ratingValue,
    p_want_to_go: wantToGo
  });
  if (error) throw error;
  return data;
}

async function saveDishRemote(restaurant, payload, existingDish, ratingValue, reviewNotes) {
  const previousPath = existingDish?.photoPath ?? "";
  const photoPath = await uploadDishPhoto(state.pendingPhotoFile, previousPath);
  const newlyUploadedPath = state.pendingPhotoFile && photoPath !== previousPath ? photoPath : "";
  const row = dishToRow(payload, restaurant.id, photoPath);

  try {
    const { data, error } = await client.rpc("save_dish_with_rating", {
      p_restaurant_id: restaurant.id,
      p_dish: row,
      p_rating: ratingValue,
      p_review_notes: reviewNotes,
      p_dish_id: existingDish?.id ?? null
    });
    if (error) throw error;
    return data;
  } catch (error) {
    if (newlyUploadedPath) {
      const cleanup = await client.storage.from(PHOTO_BUCKET).remove([newlyUploadedPath]);
      if (cleanup.error) console.warn("Could not remove newly uploaded orphan file", cleanup.error.message);
    }
    throw error;
  }
}

async function saveRestaurantPhotosRemote(restaurant, files) {
  const rows = [];

  for (const file of files) {
    const photoPath = await uploadRestaurantPhoto(file);
    rows.push(restaurantPhotoToRow(restaurant.id, photoPath));
  }

  if (!rows.length) return;

  const { error } = await client.from("restaurant_photos").insert(rows);
  if (error) {
    const paths = rows.map((row) => row.photo_path).filter(Boolean);
    if (paths.length) {
      const cleanup = await client.storage.from(PHOTO_BUCKET).remove(paths);
      if (cleanup.error) console.warn("Could not remove newly uploaded orphan files", cleanup.error.message);
    }
    throw error;
  }
}

function filteredRestaurants() {
  const query = els.searchInput.value.trim().toLowerCase();
  const location = els.locationFilter.value;
  const cuisine = els.cuisineFilter.value;
  const price = els.priceFilter.value;
  const minRating = Number(els.ratingFilter.value);
  const playlist = state.playlistFilter ?? "all";

  const filtered = activeRecords(state.data).filter((restaurant) => {
    const dishes = activeRecords(Array.isArray(restaurant.dishes) ? restaurant.dishes : []);
    const dishText = dishes
      .map(
        (dish) =>
          `${dish.name} ${(dish.likedBy ?? []).join(" ")} ${dishRatings(dish)
            .map((entry) => `${entry.name} ${entry.notes}`)
            .join(" ")}`
      )
      .join(" ");
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
  state.activeSurface = state.panelView === "map" ? "map" : "places";
  localStorage.setItem("plate-log-view-v1", state.panelView);

  if (els.mapPanel) els.mapPanel.hidden = state.panelView !== "map";
  if (els.listLayout) els.listLayout.hidden = state.panelView === "map";

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.panelView);
  });

  if (state.panelView === "map") {
    void renderMapView();
  } else {
    renderList();
  }
  updateBrowseUrl();
}

function loadLeafletAsset(tagName, attributes) {
  return new Promise((resolve, reject) => {
    const asset = document.createElement(tagName);
    Object.entries(attributes).forEach(([name, value]) => asset.setAttribute(name, value));
    asset.dataset.leafletAsset = "true";
    asset.addEventListener("load", resolve, { once: true });
    asset.addEventListener("error", () => reject(new Error("Map assets could not be loaded.")), { once: true });
    document.head.append(asset);
  });
}

function ensureLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = loadLeafletAsset("link", {
    rel: "stylesheet",
    href: LEAFLET_CSS_URL,
    integrity: LEAFLET_CSS_INTEGRITY,
    crossorigin: ""
  })
    .then(() => loadLeafletAsset("script", {
      src: LEAFLET_JS_URL,
      integrity: LEAFLET_JS_INTEGRITY,
      crossorigin: ""
    }))
    .then(() => {
      if (!window.L) throw new Error("Map library did not initialize.");
      return window.L;
    })
    .catch((error) => {
      document.querySelectorAll('[data-leaflet-asset="true"]').forEach((asset) => asset.remove());
      leafletLoadPromise = null;
      throw error;
    });

  return leafletLoadPromise;
}

async function renderMapView() {
  if (!els.restaurantMap) return;

  if (!window.L) {
    els.restaurantMap.setAttribute("aria-busy", "true");
    if (els.mapHint) els.mapHint.textContent = "Loading the map…";
    if (els.retryMapButton) els.retryMapButton.hidden = true;
    try {
      await ensureLeaflet();
    } catch {
      els.restaurantMap.setAttribute("aria-busy", "false");
      if (els.mapHint) els.mapHint.textContent = "The map could not load. Check your connection, then try again.";
      if (els.retryMapButton) els.retryMapButton.hidden = false;
      return;
    }
  }

  if (els.mapPanel?.hidden) return;
  els.restaurantMap.setAttribute("aria-busy", "false");
  if (els.retryMapButton) els.retryMapButton.hidden = true;

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
  const active = activeRecords(state.data);
  const counts = { all: active.length, __none__: 0 };
  for (const restaurant of active) {
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
  return activeRecords(state.data).filter((restaurant) => (restaurant.playlists ?? []).includes(name)).length;
}

function clearNarrowingBrowseFilters() {
  els.searchInput.value = "";
  els.locationFilter.value = "all";
  els.cuisineFilter.value = "all";
  els.priceFilter.value = "all";
  els.ratingFilter.value = "0";
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
  dirtyForms.delete(els.playlistManageForm);
  state.managingPlaylistName = null;
}

async function syncPlaylistLookup(oldName, newName = "", memberRestaurantIds = []) {
  if (!client || !state.canEdit) return;

  if (oldName?.trim()) {
    const { error } = await client
      .from("playlists")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: editorEmail(),
        member_restaurant_ids: memberRestaurantIds
      })
      .eq("name", oldName.trim())
      .is("deleted_at", null);
    if (error) throw error;
  }
  if (newName?.trim()) {
    const { error } = await client
      .from("playlists")
      .upsert(
        { name: newName.trim(), deleted_at: null, deleted_by: null },
        { onConflict: "name" }
      );
    if (error) throw error;
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
  if (state.remoteReady) {
    const { error } = await client.rpc("rename_foodlog_playlist", {
      p_from: fromName,
      p_to: toName
    });
    if (error) throw error;
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
      ? `Move "${playlistName}" to Trash?`
      : count === 1
        ? `Move "${playlistName}" to Trash? The place will appear as Unsorted until the playlist is restored.`
        : `Move "${playlistName}" to Trash? ${count} places will appear as Unsorted until it is restored.`;
  if (!confirm(message)) return;

  const withoutName = (restaurant) => (restaurant.playlists ?? []).filter((name) => name !== playlistName);

  if (state.remoteReady) {
    const { error } = await client.rpc("trash_foodlog_playlist", { p_name: playlistName });
    if (error) throw error;
    await loadRemoteData();
  } else {
    const affected = state.data
      .filter((restaurant) => (restaurant.playlists ?? []).includes(playlistName))
      .map((restaurant) => ({ id: restaurant.id, playlists: [...restaurant.playlists] }));
    for (const restaurant of state.data) {
      if ((restaurant.playlists ?? []).includes(playlistName)) {
        restaurant.playlists = withoutName(restaurant);
        restaurant.updatedAt = Date.now();
      }
    }
    state.localTrash.unshift({
      id: crypto.randomUUID(),
      type: "playlist",
      name: playlistName,
      affected,
      deletedAt: new Date().toISOString(),
      deletedBy: currentRaterIdentity().email
    });
    saveLocalTrash();
    recordLocalActivity("trash", "playlist", playlistName, { affectedCount: affected.length });
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
  showToast(`Moved "${playlistName}" to Trash`);
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
  const visibleCount = filteredRestaurants().length;
  const totalCount = activeChip?.count ?? 0;
  const isNarrowed = visibleCount < totalCount;
  if (els.playlistFilterHint) {
    els.playlistFilterHint.textContent = activeChip
      ? isNarrowed
        ? `${visibleCount} of ${totalCount} places`
        : `${totalCount} places`
      : "";
  }
  if (els.playlistShowAllButton) {
    els.playlistShowAllButton.hidden = !isNarrowed;
    els.playlistShowAllButton.textContent = isNarrowed ? `Show all ${totalCount}` : "";
    els.playlistShowAllButton.setAttribute(
      "aria-label",
      state.playlistFilter === "all"
        ? `Clear search and filters to show all ${totalCount} places`
        : `Clear search and filters to show all ${totalCount} places in ${activeChip?.label ?? "this playlist"}`
    );
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
  renderPlaylistFilter();
}

function optionPlaceholder(key) {
  if (key === "location") return "Select location";
  if (key === "cuisine") return "Select cuisine";
  return "Select playlist";
}

function renderRestaurantOptionSelect(select, options, placeholder, allowEmpty = false) {
  if (select.matches("input[list]")) {
    const list = document.querySelector(`#${select.getAttribute("list")}`);
    const key = select.id === "locationSelect" ? "location" : "cuisine";
    const recent = recentCaptureChoices()[key];
    const orderedOptions = [
      ...recent.filter((value) => options.includes(value)),
      ...options.filter((value) => !recent.includes(value))
    ];
    if (list) {
      list.innerHTML = orderedOptions
        .map((value) => `<option value="${escapeHtml(value)}"></option>`)
        .join("");
    }
    select.placeholder = placeholder;
    return;
  }
  const current = select.value;
  select.innerHTML = [
    allowEmpty ? `<option value="">No playlist</option>` : `<option value="" disabled>${placeholder}</option>`,
    ...options.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
    `<option value="__new">+ Add new…</option>`
  ].join("");
  if (allowEmpty && !current) {
    select.value = "";
  } else {
    select.value = options.includes(current) || current === "__new" ? current : allowEmpty ? "" : "";
  }
}

function getRestaurantOption(select, input) {
  if (select.matches("input[list]")) return select.value.trim();
  if (select.value === "__new") return input.value.trim();
  return select.value.trim();
}

function setRestaurantOption(select, input, key, value) {
  const options = mergedLookupOptions(key);
  const allowEmpty = key === "playlist";
  renderRestaurantOptionSelect(select, options, optionPlaceholder(key), allowEmpty);

  if (select.matches("input[list]")) {
    select.value = value ?? "";
    input.value = "";
    input.hidden = true;
    input.required = false;
    return;
  }

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
  if (select.matches("input[list]")) return;
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
  const restaurants = activeRecords(state.data);
  const dishes = restaurants.flatMap((restaurant) => activeRecords(restaurant.dishes));
  const rated = restaurants
    .map((restaurant) => averageRating(restaurant))
    .filter((value) => value !== null);
  const avg = rated.length ? rated.reduce((sum, value) => sum + value, 0) / rated.length : null;

  els.restaurantCount.textContent = restaurants.length;
  els.dishCount.textContent = dishes.length;
  els.avgRating.textContent = avg === null ? "Not rated" : avg.toFixed(1);
}

function renderAuth() {
  els.authForm.hidden = !canUseSupabase || Boolean(state.session);
  els.googleSignInButton.hidden = !canUseSupabase || Boolean(state.session);
  els.authDivider.hidden = !canUseSupabase || Boolean(state.session);
  els.signOutButton.hidden = !canUseSupabase || !state.session;
  els.ownerActions.hidden = !isSuperuser();
  const canAddPlace = !canUseSupabase || state.canEdit;
  if (els.quickAddButton) {
    const accessibleLabel = canAddPlace ? "Add place" : "Add place — sign in to edit";
    els.quickAddButton.setAttribute("aria-label", accessibleLabel);
    els.quickAddButton.title = accessibleLabel;
    els.quickAddButton.dataset.requiresSignIn = String(!canAddPlace);
  }
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
    const pendingCount = state.data.filter((restaurant) => restaurant.pendingSync).length;
    if (pendingCount) {
      setSync(
        "Cloud connected · review needed",
        `${pendingCount} ${pendingCount === 1 ? "place is" : "places are"} still saved only on this device. Open ${pendingCount === 1 ? "it" : "each one"}, choose Edit, and Save after reviewing any duplicate warning.`
      );
    } else {
      setSync("Approved editor", state.session.user.email);
    }
  }
}

function renderList() {
  if (state.panelView === "map") {
    void renderMapView();
    return;
  }

  els.restaurantList.setAttribute("aria-busy", String(state.loading));

  const restaurants = filteredRestaurants();

  if (!restaurants.some((restaurant) => restaurant.id === state.selectedId)) {
    state.selectedId = restaurants[0]?.id ?? activeRecords(state.data)[0]?.id ?? null;
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
        <article class="restaurant-row ${restaurant.id === state.selectedId ? "active" : ""}" role="button" tabindex="0" data-id="${restaurant.id}" aria-label="${escapeHtml(restaurant.name)}${isWantToGo(restaurant) ? ", Want to go" : ""}">
          ${restaurantTicketMedia(restaurant)}
          <div class="restaurant-main">
            <div class="restaurant-name-line">
              <h3>${escapeHtml(restaurant.name)}</h3>
              ${restaurantNeedsDetails(restaurant) ? '<span class="needs-details-badge">Needs details</span>' : ""}
              ${restaurant.pendingSync ? '<span class="pending-sync-badge">Unsynced</span>' : ""}
            </div>
            <div class="meta-row">
              ${metaPill("location", restaurant.location)}
              ${metaPill("cuisine", restaurant.cuisine)}
              ${(restaurant.playlists ?? []).map((name) => metaPill("playlist", name)).join("")}
              ${metaPill("price", restaurant.price)}
              ${activeRecords(restaurant.dishes ?? []).length ? metaPill("dishes", `${activeRecords(restaurant.dishes ?? []).length} dish${activeRecords(restaurant.dishes ?? []).length === 1 ? "" : "es"}`) : ""}
            </div>
          </div>
          <div class="restaurant-row-end">
            ${isWantToGoVisible() ? wantToGoRowActionHtml(restaurant) : isWantToGo(restaurant) ? wantToGoMarkHtml() : ""}
            ${state.canEdit || !canUseSupabase ? `<button class="row-action" type="button" data-action="manage-place-playlists" data-restaurant-id="${restaurant.id}">Playlists</button>` : ""}
            ${(() => {
            const avg = averageRating(restaurant);
            const count = restaurantRatings(restaurant).length;
            if (avg === null) {
              return `<div class="rating-badge rating-badge--none" aria-label="No rating yet">
            <span class="rating-badge-value">–</span>
            <span class="rating-badge-sub">Not rated</span>
          </div>`;
            }
            return `<div class="rating-badge" aria-label="Average rating ${formatRating(avg)} out of 5 from ${count} ${count === 1 ? "person" : "people"}">
            <span class="rating-badge-star" aria-hidden="true">★</span>
            <span class="rating-badge-value">${formatRating(avg)}</span>
            <span class="rating-badge-sub" aria-hidden="true">${count}</span>
          </div>`;
          })()}
          </div>
        </article>`
    )
    .join("");
}

function restaurantTicketMedia(restaurant) {
  const media = restaurantPrimaryMedia(restaurant);
  if (media) {
    return `<div class="restaurant-ticket-media"><img src="${escapeHtml(media.src)}" alt="" width="128" height="128" loading="lazy" decoding="async" /></div>`;
  }
  const initials = restaurantInitials(restaurant);
  return `<div class="restaurant-ticket-media restaurant-ticket-placeholder" aria-hidden="true">${escapeHtml(initials)}</div>`;
}

function restaurantPrimaryMedia(restaurant) {
  const restaurantPhotos = activeRecords(restaurant.photos ?? []);
  const restaurantPhoto = restaurantPhotos.find((photo) => photo.isCover) ?? restaurantPhotos[0];
  if (restaurantPhoto?.photo) {
    return {
      src: restaurantPhoto.photo,
      source: "restaurant"
    };
  }

  const dish = activeRecords(restaurant.dishes ?? []).find((entry) => entry.photo);
  if (dish?.photo) {
    return {
      src: dish.photo,
      source: "dish"
    };
  }

  return null;
}

function restaurantInitials(restaurant) {
  return String(restaurant.name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "TN";
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
  const pendingSyncNotice = restaurant.pendingSync
    ? `<div class="pending-sync-notice" role="status">
        <strong>Saved only on this device</strong>
        <span>Open Edit and Save to send it to the shared log. FoodLog will check for similar places first.</span>
      </div>`
    : "";

  const activeDishes = activeRecords(restaurant.dishes ?? []);
  const activePhotos = activeRecords(restaurant.photos ?? []);
  const primaryMedia = restaurantPrimaryMedia(restaurant);
  const detailHeroMedia = primaryMedia
    ? `<img src="${escapeHtml(primaryMedia.src)}" alt="${escapeHtml(restaurant.name)} main restaurant photo" width="1280" height="720" decoding="async" fetchpriority="high" />`
    : `<div class="detail-hero-placeholder" aria-hidden="true"><span>${escapeHtml(restaurantInitials(restaurant))}</span></div>`;

  els.detailPanel.innerHTML = `
    <div class="detail-hero${primaryMedia ? "" : " detail-hero--placeholder"}">
      ${detailHeroMedia}
      <div class="detail-mobile-nav">
        <button class="detail-back-action" type="button" data-action="back-to-list" aria-label="Back to places">
          <span class="detail-back-icon" aria-hidden="true">←</span>
          <span>Back to places</span>
        </button>
        <span class="detail-swipe-hint" aria-hidden="true">Swipe right to go back</span>
      </div>
    </div>
    <div class="detail-title">
      <div>
        <p class="eyebrow">${escapeHtml(restaurant.cuisine || "Shared dining note")}</p>
        <div class="detail-name-row">
          <h2>${escapeHtml(restaurant.name)}</h2>
          ${isWantToGo(restaurant) ? wantToGoMarkHtml() : ""}
        </div>
        <div class="tag-row">
          ${restaurant.location
            ? `<span class="pill location">${escapeHtml(restaurant.location)}</span>`
            : state.canEdit || !canUseSupabase
              ? '<button class="inline-detail-action" type="button" data-action="edit-restaurant">+ Add location</button>'
              : '<span class="pill location">Location not added</span>'}
          ${restaurant.cuisine
            ? ""
            : state.canEdit || !canUseSupabase
              ? '<button class="inline-detail-action" type="button" data-action="edit-restaurant">+ Add cuisine</button>'
              : '<span class="pill cuisine">Cuisine not added</span>'}
          ${(restaurant.playlists ?? []).map((name) => `<span class="pill playlist">${escapeHtml(name)}</span>`).join("")}
          <span class="pill price">${escapeHtml(restaurant.price)}</span>
          ${(restaurant.visited ?? []).map((person) => `<span class="pill cuisine">${escapeHtml(person)}</span>`).join("")}
        </div>
      </div>
      <div class="detail-actions">
        ${mapsLink}
        ${isWantToGoVisible() ? `<button class="secondary-action ${isWantToGo(restaurant) ? "is-active" : ""}" type="button" data-action="toggle-want" data-restaurant-id="${restaurant.id}" aria-pressed="${String(isWantToGo(restaurant))}">${isWantToGo(restaurant) ? "Want to go ✓" : "Want to go"}</button>` : ""}
        <button class="secondary-action" type="button" data-action="share-place">Share</button>
        ${state.canEdit || !canUseSupabase ? `<button class="secondary-action" type="button" data-action="manage-place-playlists">Playlists</button>` : ""}
        ${state.canEdit || !canUseSupabase ? `<button class="secondary-action" type="button" data-action="edit-restaurant">Edit</button>` : ""}
      </div>
    </div>

    ${pendingSyncNotice}
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
        <strong>${activeDishes.length}</strong>
        <div class="rating-line"><i style="width:${Math.min(activeDishes.length * 18, 100)}%"></i></div>
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
    ${
      (state.canEdit || !canUseSupabase) && activePhotos.length
        ? `<p class="photo-section-hint">Choose the main photo shown in the restaurant list.</p>`
        : ""
    }

    <div class="restaurant-photo-grid">
      ${
        activePhotos.length
          ? activePhotos.map((photo) => renderRestaurantPhoto(photo)).join("")
          : `<div class="empty-state">No restaurant photos yet.</div>`
      }
    </div>

    <div class="section-heading">
      <h3>Dishes</h3>
      ${state.canEdit || !canUseSupabase ? `<button class="primary-action compact" type="button" data-action="add-dish">Add dish</button>` : ""}
    </div>

    <div class="dish-grid">
      ${
        activeDishes.length
          ? activeDishes.map((dish) => renderDish(dish)).join("")
          : `<div class="empty-state">No dishes yet. Add the plates you ordered, photos, and ratings.</div>`
      }
    </div>
  `;
}

function renderRestaurantPhoto(photo) {
  const canEditPhotos = state.canEdit || !canUseSupabase;
  const coverPhotoPending = state.submitting.has("restaurant-cover-photo");
  return `
    <figure class="restaurant-photo-card${photo.isCover ? " is-cover" : ""}">
      <img src="${escapeHtml(photo.photo)}" alt="Restaurant food photo" loading="lazy" decoding="async" width="640" height="480" data-action="open-photo" data-photo-src="${escapeHtml(photo.photo)}" />
      ${photo.isCover ? `<span class="photo-cover-badge">Main photo</span>` : ""}
      ${
        canEditPhotos && !photo.isCover
          ? `<button class="photo-cover-action" type="button" data-action="set-cover-photo" data-photo-id="${photo.id}"${coverPhotoPending ? " disabled" : ""}>${coverPhotoPending ? "Updating…" : "Use as main"}</button>`
          : ""
      }
      ${canEditPhotos ? `<button class="photo-delete-action" type="button" data-action="delete-restaurant-photo" data-photo-id="${photo.id}">Move to Trash</button>` : ""}
    </figure>
  `;
}

function renderDish(dish) {
  const photo = dish.photo
    ? `<img class="dish-photo" src="${dish.photo}" alt="${escapeHtml(dish.name)}" loading="lazy" decoding="async" width="640" height="480" data-action="open-photo" data-photo-src="${escapeHtml(dish.photo)}" />`
    : `<div class="dish-photo dish-placeholder">Photo</div>`;
  const avg = averageDishRating(dish);
  const count = dishRatings(dish).length;
  const canReview = state.canEdit || !canUseSupabase;
  const hasMyReview = Boolean(myDishReviewEntry(dish));
  const avgHtml =
    avg === null
      ? `<strong class="rating-none-text">No ratings yet</strong>
          <div class="rating-line"><i style="width:0%"></i></div>`
      : `<strong>${formatRating(avg)} / 5 <small class="rating-count">· ${count} ${count === 1 ? "review" : "reviews"}</small></strong>
          <div class="rating-line"><i style="width:${ratingWidth(avg)}"></i></div>`;

  return `
    <article class="dish-card${count ? " has-reviews" : ""}" data-dish-id="${dish.id}"${count ? ' data-has-reviews="true"' : ""}>
      ${photo}
      <div class="dish-body">
        <div class="dish-top">
          <h3>${escapeHtml(dish.name)}</h3>
          ${state.canEdit || !canUseSupabase ? `<button class="tiny-action" type="button" data-action="edit-dish" data-dish-id="${dish.id}">Edit</button>` : ""}
        </div>
        <div>${avgHtml}</div>
        ${renderDishRatingsPreview(dish)}
        <div class="dish-review-actions-inline">
          ${canReview ? `<button class="secondary-action dish-review-compose-action" type="button" data-action="write-dish-review" data-dish-id="${dish.id}">${hasMyReview ? "Edit your review" : "Add your review"}</button>` : ""}
          ${count ? `<button class="tiny-action dish-review-action" type="button" data-action="open-dish-reviews" data-dish-id="${dish.id}">Read ${count === 1 ? "review" : `all ${count} reviews`}</button>` : ""}
        </div>
        <div class="dish-meta">
          ${(dish.likedBy ?? []).map((person) => `<span class="pill location">${escapeHtml(person)}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderDishRatingsPreview(dish) {
  const ratings = dishRatings(dish);
  if (!ratings.length) {
    return `<p class="dish-ratings-empty muted">${
      state.canEdit || !canUseSupabase ? "No reviews yet. Add yours without changing the dish." : "No reviews yet."
    }</p>`;
  }

  const { email: myEmail } = currentRaterIdentity();
  const preview = ratings.slice(0, DISH_REVIEWS_PREVIEW_LIMIT);
  const extra = ratings.length - preview.length;
  const rows = preview
    .map((entry) => {
      const isMine = entry.email.toLowerCase() === myEmail.toLowerCase();
      return `
      <li class="dish-rating-preview-row${isMine ? " dish-rating-preview-row--mine" : ""}">
        <span class="dish-rating-preview-name">${escapeHtml(ratingLabelFor(entry))}${isMine ? ' <span class="rating-row-you">you</span>' : ""}</span>
        <span class="dish-rating-preview-score">${starsMarkup(entry.rating)}<strong>${formatRating(entry.rating)}</strong></span>
        ${entry.notes ? `<span class="dish-rating-preview-snippet muted">${escapeHtml(truncateText(entry.notes))}</span>` : ""}
      </li>`;
    })
    .join("");

  const hint =
    ratings.length === 1
      ? "Long-press is also available as a shortcut."
      : extra > 0
        ? `${extra} more ${extra === 1 ? "review" : "reviews"} available.`
        : "Long-press is also available as a shortcut.";

  return `
    <div class="dish-reviews-preview">
      <ul class="dish-ratings-preview">${rows}</ul>
      <p class="dish-reviews-hint muted">${hint}</p>
    </div>`;
}

function renderDishRatingsFullList(dish) {
  const ratings = dishRatings(dish);
  if (!ratings.length) {
    return `<p class="dish-ratings-empty muted">No reviews yet.</p>`;
  }

  const { email: myEmail } = currentRaterIdentity();
  const canModerate = isSuperuser();
  const rows = ratings
    .map((entry) => {
      const isMine = entry.email.toLowerCase() === myEmail.toLowerCase();
      const removeBtn = canModerate
        ? `<button class="rating-remove" type="button" data-action="remove-dish-rating" data-dish-id="${escapeHtml(dish.id)}" data-email="${escapeHtml(entry.email)}" aria-label="Remove ${escapeHtml(ratingLabelFor(entry))}'s review" title="Remove this review"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><line x1="7" y1="7" x2="17" y2="17"></line><line x1="17" y1="7" x2="7" y2="17"></line></svg></button>`
        : "";
      return `
      <li class="dish-rating-row${isMine ? " dish-rating-row--mine" : ""}">
        <div class="dish-rating-row-head">
          <span class="dish-rating-row-name">${escapeHtml(ratingLabelFor(entry))}${isMine ? ' <span class="rating-row-you">you</span>' : ""}</span>
          <span class="dish-rating-row-score">
            ${starsMarkup(entry.rating)}
            <strong>${formatRating(entry.rating)}</strong>
            ${removeBtn}
          </span>
        </div>
        ${entry.notes ? `<p class="dish-rating-review muted">${escapeHtml(entry.notes)}</p>` : ""}
      </li>`;
    })
    .join("");

  return `<ul class="dish-ratings-list dish-ratings-list--full">${rows}</ul>`;
}

function selectedDecisionSession() {
  return state.decisionSessions.find((session) => session.id === state.selectedDecisionSessionId) ?? state.decisionSessions[0] ?? null;
}

async function loadDecisionSessions() {
  if (!state.remoteReady || !client) {
    state.decisionSessions = loadLocalDecisionSessions();
    state.selectedDecisionSessionId = state.decisionSessions.some((session) => session.id === state.selectedDecisionSessionId)
      ? state.selectedDecisionSessionId
      : state.decisionSessions[0]?.id ?? null;
    return;
  }
  state.decisionLoading = true;
  renderPicker();
  // Anonymous and unapproved visitors can read aggregate vote totals, but must
  // never receive voter identities. Only approved editors may request the
  // nested decision_votes rows used to toggle their own votes.
  const voteRelation = state.canEdit
    ? ",decision_votes(id,restaurant_id,voter_email,created_at)"
    : "";
  const [sessionsResult, totalsResult] = await Promise.all([
    client
      .from("decision_sessions")
      .select(`id,title,notes,planned_at,status,created_by,selected_restaurant_id,decided_at,created_at,updated_at,decision_candidates(id,restaurant_id,added_by,created_at)${voteRelation}`)
      .order("updated_at", { ascending: false }),
    client.rpc("get_decision_vote_totals")
  ]);
  const { data, error } = sessionsResult;
  state.decisionLoading = false;
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205" || /decision_sessions/i.test(error.message)) {
      state.decisionRemoteReady = false;
      state.decisionSessions = [];
      renderPicker("The picker schema is ready locally and will become available on the staging database after the migration is approved.");
      return;
    }
    renderPicker(error.message);
    return;
  }
  state.decisionRemoteReady = true;
  const totalsBySession = new Map();
  for (const entry of totalsResult.data ?? []) {
    if (!totalsBySession.has(entry.session_id)) totalsBySession.set(entry.session_id, []);
    totalsBySession.get(entry.session_id).push({
      restaurantId: entry.restaurant_id,
      voteCount: Number(entry.vote_count)
    });
  }
  state.decisionSessions = (data ?? []).map((session) => ({
    id: session.id,
    title: session.title,
    notes: session.notes ?? "",
    plannedAt: session.planned_at,
    status: session.status,
    createdBy: session.created_by,
    selectedRestaurantId: session.selected_restaurant_id,
    decidedAt: session.decided_at,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    candidates: (session.decision_candidates ?? []).map((entry) => entry.restaurant_id),
    votes: (session.decision_votes ?? []).map((entry) => ({
      id: entry.id,
      restaurantId: entry.restaurant_id,
      voterEmail: entry.voter_email,
      createdAt: entry.created_at
    })),
    voteTotals: totalsBySession.get(session.id) ?? []
  }));
  state.selectedDecisionSessionId = state.decisionSessions.some((session) => session.id === state.selectedDecisionSessionId)
    ? state.selectedDecisionSessionId
    : state.decisionSessions[0]?.id ?? null;
  renderPicker();
}

function pickerIdentity() {
  return editorEmail() || "you";
}

function pickerVoteSummary(session) {
  if (Array.isArray(session?.voteTotals) && session.voteTotals.length) {
    const totals = new Map(session.candidates.map((id) => [id, 0]));
    session.voteTotals.forEach((entry) => {
      if (totals.has(entry.restaurantId)) totals.set(entry.restaurantId, entry.voteCount);
    });
    return [...totals.entries()]
      .map(([restaurantId, voteCount]) => ({ restaurantId, voteCount }))
      .sort((a, b) => b.voteCount - a.voteCount || a.restaurantId.localeCompare(b.restaurantId));
  }
  return decisionVoteSummary(session);
}

function canControlDecision(session) {
  return Boolean(session && (isSuperuser() || session.createdBy?.toLowerCase() === pickerIdentity().toLowerCase()));
}

function restaurantComparison(restaurant) {
  const ratings = restaurantRatings(restaurant);
  return [
    restaurant.cuisine,
    restaurant.location,
    restaurant.price,
    averageRating(restaurant) === null ? "Not rated" : `${formatRating(averageRating(restaurant))} avg`,
    `${restaurant.wantToGoCount ?? (restaurant.wantToGo ? 1 : 0)} want to go`,
    `${activeRecords(restaurant.dishes ?? []).length} dishes`,
    `${ratings.length} friend ${ratings.length === 1 ? "rating" : "ratings"}`
  ];
}

function renderPicker(errorMessage = "") {
  if (!els.decisionSessionList || !els.decisionShortlist || !els.decisionSummary) return;
  if (state.decisionLoading) {
    els.decisionSessionList.innerHTML = '<div class="empty-state">Loading sessions…</div>';
    els.decisionShortlist.innerHTML = '<div class="empty-state">Preparing shortlist…</div>';
    els.decisionSummary.innerHTML = "";
    return;
  }
  if (errorMessage) {
    els.decisionSessionList.innerHTML = `<div class="empty-state">${escapeHtml(errorMessage)}</div>`;
  } else if (!state.decisionSessions.length) {
    els.decisionSessionList.innerHTML = '<div class="empty-state">No decisions yet. Start one for your next meal.</div>';
  } else {
    els.decisionSessionList.innerHTML = state.decisionSessions.map((session) => `
      <button class="decision-session-button ${session.id === state.selectedDecisionSessionId ? "active" : ""}" type="button" data-decision-session="${session.id}">
        <strong>${escapeHtml(session.title)}</strong>
        <span>${session.status === "closed" ? "Closed" : `${session.candidates.length} places`}</span>
      </button>
    `).join("");
  }

  const session = selectedDecisionSession();
  if (!session) {
    els.decisionShortlist.innerHTML = '<div class="empty-state">Create a session, then add places from the journal.</div>';
    els.decisionSummary.innerHTML = '<div class="empty-state">Votes and the final result will appear here.</div>';
    return;
  }

  const summary = pickerVoteSummary(session);
  const myVotes = new Set(session.votes.filter((vote) => vote.voterEmail.toLowerCase() === pickerIdentity().toLowerCase()).map((vote) => vote.restaurantId));
  const candidates = session.candidates.map((id) => restaurantById(id)).filter(Boolean);
  const available = activeRecords(state.data).filter((restaurant) => !session.candidates.includes(restaurant.id));
  const controlsAllowed = session.status === "open" && (state.canEdit || !canUseSupabase);
  els.decisionShortlist.innerHTML = `
    <div class="decision-session-heading">
      <div><span class="eyebrow">${session.status}</span><h3>${escapeHtml(session.title)}</h3></div>
      ${session.plannedAt ? `<time datetime="${escapeHtml(session.plannedAt)}">${new Date(session.plannedAt).toLocaleString()}</time>` : ""}
    </div>
    ${session.notes ? `<p class="notes">${escapeHtml(session.notes)}</p>` : ""}
    ${controlsAllowed && available.length ? `
      <label class="candidate-add-field">Add a place
        <select id="decisionCandidateSelect">
          <option value="">Choose from the journal</option>
          ${available.map((restaurant) => `<option value="${restaurant.id}">${escapeHtml(restaurant.name)} · ${escapeHtml(restaurant.location)}</option>`).join("")}
        </select>
      </label>
      <button class="secondary-action compact" type="button" data-picker-action="add-candidate">Add to shortlist</button>
    ` : ""}
    <div class="candidate-list">
      ${candidates.length ? candidates.map((restaurant) => {
        const votes = summary.find((entry) => entry.restaurantId === restaurant.id)?.voteCount ?? 0;
        return `<article class="candidate-card ${session.selectedRestaurantId === restaurant.id ? "is-selected" : ""}">
          <div>
            <span class="eyebrow">${escapeHtml(restaurant.cuisine)}</span>
            <h3>${escapeHtml(restaurant.name)}</h3>
            <p>${restaurantComparison(restaurant).map(escapeHtml).join(" · ")}</p>
          </div>
          <div class="candidate-actions">
            <button class="tiny-action" type="button" data-picker-action="open-place" data-restaurant-id="${restaurant.id}">View place</button>
            ${controlsAllowed ? `<button class="vote-button ${myVotes.has(restaurant.id) ? "active" : ""}" type="button" data-picker-action="vote" data-restaurant-id="${restaurant.id}" aria-pressed="${String(myVotes.has(restaurant.id))}">${myVotes.has(restaurant.id) ? "Voted" : "Vote"} · ${votes}</button>` : `<strong>${votes} ${votes === 1 ? "vote" : "votes"}</strong>`}
          </div>
        </article>`;
      }).join("") : '<div class="empty-state">No places shortlisted yet.</div>'}
    </div>
  `;

  const result = restaurantById(session.selectedRestaurantId);
  els.decisionSummary.innerHTML = `
    <span class="eyebrow">${session.status === "closed" ? "Decision made" : "Live tally"}</span>
    ${result ? `<div class="decision-result"><h3>${escapeHtml(result.name)}</h3><p>${escapeHtml(result.location)} · ${escapeHtml(result.cuisine)}</p><button class="primary-action compact" type="button" data-picker-action="open-place" data-restaurant-id="${result.id}">Open result</button></div>` : ""}
    <ol class="vote-summary">${summary.map((entry) => {
      const restaurant = restaurantById(entry.restaurantId);
      return `<li><span>${escapeHtml(restaurant?.name ?? "Unavailable place")}</span><strong>${entry.voteCount}</strong></li>`;
    }).join("")}</ol>
    ${canControlDecision(session) ? session.status === "open"
      ? '<button class="primary-action compact" type="button" data-picker-action="close-session">Close and pick</button>'
      : '<button class="secondary-action compact" type="button" data-picker-action="reopen-session">Reopen session</button>' : ""}
  `;
}

async function createDecisionFromForm(event) {
  event.preventDefault();
  if (!requireEditor() || !els.decisionForm.reportValidity()) return;
  try {
    await withSubmission("decision", els.decisionForm, async () => {
      if (state.remoteReady && client) {
        const { data, error } = await client.from("decision_sessions").insert({
          title: els.decisionTitleInput.value.trim(),
          notes: els.decisionNotesInput.value.trim(),
          planned_at: els.decisionPlannedAtInput.value || null,
          created_by: editorEmail()
        }).select("id").single();
        if (error) throw error;
        state.selectedDecisionSessionId = data.id;
        await loadDecisionSessions();
      } else {
        const session = createDecisionSession({
          title: els.decisionTitleInput.value,
          notes: els.decisionNotesInput.value,
          plannedAt: els.decisionPlannedAtInput.value || null,
          createdBy: pickerIdentity()
        });
        state.decisionSessions.unshift(session);
        state.selectedDecisionSessionId = session.id;
        saveLocalDecisionSessions();
        recordLocalActivity("create", "decision_session", session.id);
      }
      els.decisionModal.close();
      els.decisionForm.reset();
      dirtyForms.delete(els.decisionForm);
      updateBrowseUrl();
      renderPicker();
      showToast("Decision session created");
    });
  } catch (error) {
    console.error("Decision session create failed", error);
  }
}

async function mutateDecision(action, restaurantId = "") {
  const session = selectedDecisionSession();
  if (!session || !requireEditor()) return;
  try {
    if (state.remoteReady && client) {
      if (action === "add-candidate") {
        const { error } = await client.from("decision_candidates").insert({
          session_id: session.id,
          restaurant_id: restaurantId,
          added_by: editorEmail()
        });
        if (error) throw error;
      }
      if (action === "vote") {
        const existing = session.votes.find((vote) => vote.restaurantId === restaurantId && vote.voterEmail.toLowerCase() === editorEmail());
        if (existing) {
          const { error } = await client.from("decision_votes").update({ deleted_at: new Date().toISOString(), deleted_by: editorEmail() }).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await client.from("decision_votes").insert({
            session_id: session.id,
            restaurant_id: restaurantId,
            voter_email: editorEmail()
          });
          if (error) throw error;
        }
      }
      if (action === "close-session") {
        const { error } = await client.rpc("close_decision_session", { p_session_id: session.id });
        if (error) throw error;
      }
      if (action === "reopen-session") {
        const { error } = await client.rpc("reopen_decision_session", { p_session_id: session.id });
        if (error) throw error;
      }
      await loadDecisionSessions();
    } else {
      const index = state.decisionSessions.findIndex((entry) => entry.id === session.id);
      let next = session;
      if (action === "add-candidate") next = addDecisionCandidate(session, restaurantId);
      if (action === "vote") next = toggleDecisionVote(session, restaurantId, pickerIdentity());
      if (action === "close-session") next = closeDecisionSession(session);
      if (action === "reopen-session") next = reopenDecisionSession(session);
      state.decisionSessions[index] = next;
      saveLocalDecisionSessions();
      recordLocalActivity(action === "vote" ? "update" : action === "add-candidate" ? "update" : action === "close-session" ? "update" : "restore", "decision_session", session.id, { restaurantId });
      renderPicker();
    }
    showToast(action === "vote" ? "Vote updated" : action === "close-session" ? "Decision closed" : action === "reopen-session" ? "Session reopened" : "Place added");
  } catch (error) {
    showToast(error.message);
  }
}

function setActiveSurface(surface) {
  state.activeSurface = ["places", "map", "pick"].includes(surface) ? surface : "places";
  state.panelView = state.activeSurface === "map" ? "map" : "list";
  state.mobileDetailOpen = false;
  document.querySelectorAll("[data-nav]").forEach((button) => {
    const active = button.dataset.nav === state.activeSurface;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  saveFilterPrefs();
  render();
  if (state.activeSurface === "pick") void loadDecisionSessions();
}

function render() {
  renderFilters();
  renderSummary();
  renderAuth();
  updateFilterBadge();
  if (els.listCountValue) els.listCountValue.textContent = String(filteredRestaurants().length);
  if (els.listActionTip) els.listActionTip.hidden = !isWantToGoVisible() || state.panelView === "map";
  const showPlaces = state.activeSurface === "places";
  const showMap = state.activeSurface === "map";
  const showPicker = state.activeSurface === "pick";
  const focusedMobileDetail = showPlaces && state.mobileDetailOpen && window.innerWidth <= 980;
  document.body.classList.toggle("mobile-detail-view", focusedMobileDetail);
  document.querySelector(".hero-panel")?.toggleAttribute("hidden", !showPlaces);
  document.querySelector(".list-header")?.toggleAttribute("hidden", !showPlaces);
  if (els.pickerPanel) els.pickerPanel.hidden = !showPicker;
  if (els.mapPanel) els.mapPanel.hidden = !showMap;
  if (els.listLayout) {
    els.listLayout.hidden = !showPlaces;
    els.listLayout.classList.toggle("mobile-detail-open", state.mobileDetailOpen);
  }
  if (showPlaces) {
    renderList();
    renderDetail();
  }
  if (showMap) void renderMapView();
  if (showPicker) renderPicker();
  if (els.trashButton) els.trashButton.hidden = !(state.canEdit || !canUseSupabase);
  updateThemeControl();
}

function restaurantFormIdentity() {
  return {
    name: els.nameInput.value.trim(),
    location: getRestaurantOption(els.locationSelect, els.locationInput),
    cuisine: getRestaurantOption(els.cuisineSelect, els.cuisineInput)
  };
}

function duplicateMatchDescription(match) {
  const parts = [
    match.restaurant.location,
    match.restaurant.cuisine,
    match.exactName ? "Same name" : "Similar name"
  ].filter(Boolean);
  return parts.join(" · ");
}

function renderRestaurantDuplicateWarning(matches = null) {
  const candidate = restaurantFormIdentity();
  const signature = JSON.stringify([
    candidate.name,
    candidate.location,
    state.editingRestaurantId
  ]);
  const signatureChanged = signature !== duplicateWarningSignature;
  if (signatureChanged) {
    els.restaurantDuplicateOverride.checked = false;
  }
  duplicateWarningSignature = signature;

  const resolvedMatches = matches ?? findSimilarRestaurants(candidate, state.data, {
    excludeId: state.editingRestaurantId
  });
  state.restaurantDuplicateMatches = resolvedMatches;
  els.restaurantDuplicateWarning.hidden = !resolvedMatches.length;
  if (!resolvedMatches.length) {
    els.restaurantDuplicateList.innerHTML = "";
    return resolvedMatches;
  }

  els.restaurantDuplicateList.innerHTML = resolvedMatches.map((match) => `
    <li class="duplicate-match">
      <div>
        <strong>${escapeHtml(match.restaurant.name)}</strong>
        <span>${escapeHtml(duplicateMatchDescription(match))}</span>
        ${match.restaurant.pendingSync ? '<span class="pending-sync-inline">Unsynced on this device</span>' : ""}
      </div>
      <button
        class="secondary-action compact"
        type="button"
        data-duplicate-open-id="${escapeHtml(match.restaurant.id)}"
      >Open existing</button>
    </li>
  `).join("");
  return resolvedMatches;
}

function scheduleRestaurantDuplicateCheck() {
  clearTimeout(duplicateWarningTimer);
  duplicateWarningTimer = setTimeout(() => {
    renderRestaurantDuplicateWarning();
  }, 120);
}

async function authoritativeRestaurantDuplicateMatches(candidate, excludeId) {
  let restaurants = state.data;
  if (canUseSupabase && client && navigator.onLine) {
    const { data, error } = await client
      .from("restaurants")
      .select("id,name,location,cuisine,deleted_at")
      .is("deleted_at", null);
    if (error) {
      throw new Error(`Could not check the shared log for duplicates. ${error.message} Your draft is still here.`);
    }
    restaurants = [
      ...(data ?? []),
      ...state.data.filter((restaurant) => restaurant.pendingSync)
    ];
  }
  return findSimilarRestaurants(candidate, restaurants, { excludeId });
}

function restaurantIntentValue() {
  return els.restaurantForm.querySelector('input[name="restaurantIntent"]:checked')?.value ?? "want";
}

function setRestaurantPrice(value = "$$") {
  const price = ["$", "$$", "$$$", "$$$$"].includes(value) ? value : "$$";
  els.priceInput.value = price;
  els.restaurantForm.querySelectorAll('input[name="restaurantPrice"]').forEach((input) => {
    input.checked = input.value === price;
  });
}

function adjustRating(picker, delta) {
  const current = picker.input.value === "none" ? null : Number(picker.input.value);
  if (current === null && delta < 0) return;
  setPickerValue(picker, Math.max(0.5, Math.min(5, (current ?? 0) + delta)));
}

function setRestaurantIntent(intent, { resetWantToGo = false } = {}) {
  const value = intent === "visited" ? "visited" : "want";
  const radio = els.restaurantForm.querySelector(`input[name="restaurantIntent"][value="${value}"]`);
  if (radio) radio.checked = true;
  if (!state.editingRestaurantId) {
    if (resetWantToGo) els.restaurantWantToGo.checked = value === "want";
    if (value === "visited") els.visitDetails.open = true;
  }
}

function restaurantDraftPayload() {
  return {
    name: els.nameInput.value,
    location: getRestaurantOption(els.locationSelect, els.locationInput),
    cuisine: getRestaurantOption(els.cuisineSelect, els.cuisineInput),
    playlists: parsePeopleList(els.playlistInput.value),
    price: els.priceInput.value,
    rating: els.ratingInput.value,
    maps: els.mapsInput.value,
    notes: els.notesInput.value,
    visited: parseVisited(els.visitedInput.value),
    intent: restaurantIntentValue(),
    wantToGo: els.restaurantWantToGo.checked,
    planOpen: els.planDetails.open,
    visitOpen: els.visitDetails.open,
    savedAt: Date.now()
  };
}

function saveRestaurantDraft() {
  if (state.editingRestaurantId || !els.restaurantModal.open) return;
  const draft = restaurantDraftPayload();
  const hasContent = Boolean(
    draft.name.trim() ||
    draft.location ||
    draft.cuisine ||
    draft.maps.trim() ||
    draft.notes.trim() ||
    draft.visited.length ||
    draft.playlists.length
  );
  if (hasContent) sessionStorage.setItem(RESTAURANT_DRAFT_KEY, JSON.stringify(draft));
}

function clearRestaurantDraft() {
  sessionStorage.removeItem(RESTAURANT_DRAFT_KEY);
  els.restaurantDraftStatus.hidden = true;
}

function readRestaurantDraft() {
  try {
    const value = JSON.parse(sessionStorage.getItem(RESTAURANT_DRAFT_KEY) ?? "null");
    return value && typeof value === "object" ? value : null;
  } catch {
    sessionStorage.removeItem(RESTAURANT_DRAFT_KEY);
    return null;
  }
}

function showFormValidation(form, summary, fallbackMessage) {
  const firstInvalid = form.querySelector(":invalid");
  if (!firstInvalid) {
    summary.hidden = true;
    return true;
  }
  summary.innerHTML = `<strong>Check this field</strong><p>${escapeHtml(firstInvalid.validationMessage || fallbackMessage)}</p>`;
  summary.hidden = false;
  summary.focus();
  firstInvalid.setAttribute("aria-invalid", "true");
  requestAnimationFrame(() => firstInvalid.focus({ preventScroll: false }));
  return false;
}

function clearFormValidation(form, summary) {
  summary.hidden = true;
  summary.innerHTML = "";
  form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute("aria-invalid"));
}

function resetMapsResolution() {
  state.mapsResolution = null;
  els.mapsResolvePreview.hidden = true;
  els.mapsResolvePreview.innerHTML = "";
  els.mapsResolveStatus.textContent = "";
}

function renderMapsResolutionPreview(result) {
  state.mapsResolution = result;
  const details = [
    result.placeName ? `<li><strong>Name</strong><span>${escapeHtml(result.placeName)}</span></li>` : "",
    Number.isFinite(result.latitude) && Number.isFinite(result.longitude)
      ? `<li><strong>Coordinates</strong><span>${result.latitude.toFixed(5)}, ${result.longitude.toFixed(5)}</span></li>`
      : ""
  ].filter(Boolean).join("");
  els.mapsResolvePreview.innerHTML = `
    <strong>Link details found</strong>
    ${details ? `<ul>${details}</ul>` : "<p>The Google Maps link is valid. No extra place details were embedded in it.</p>"}
    <p>Only empty fields will be filled.</p>
    <div>
      <button class="primary-action compact" type="button" data-maps-action="apply">Apply details</button>
      <button class="text-action" type="button" data-maps-action="ignore">Keep what I typed</button>
    </div>
  `;
  els.mapsResolvePreview.hidden = false;
}

async function resolveMapsLink() {
  const value = els.mapsInput.value.trim();
  resetMapsResolution();
  if (!value) {
    els.mapsResolveStatus.textContent = "Paste a Google Maps link first.";
    els.mapsInput.focus();
    return;
  }
  const direct = parseGoogleMapsUrl(value);
  els.resolveMapsButton.disabled = true;
  els.resolveMapsButton.textContent = "Checking…";
  els.mapsResolveStatus.textContent = "Checking this Google Maps link…";
  try {
    let result = direct;
    if (!result || result.source === "google-short-link") {
      const response = await fetch("/api/maps/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: value })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "This link could not be resolved.");
      result = body;
    }
    els.mapsInput.value = result.finalUrl ?? value;
    els.mapsResolveStatus.textContent = "Google Maps link checked.";
    renderMapsResolutionPreview(result);
    saveRestaurantDraft();
  } catch (error) {
    els.mapsResolveStatus.textContent = `${error.message} The link is still saved, so you can continue manually.`;
  } finally {
    els.resolveMapsButton.disabled = false;
    els.resolveMapsButton.textContent = "Check link";
  }
}

function applyMapsResolution() {
  const result = state.mapsResolution;
  if (!result) return;
  const next = applyGoogleMapsDetails(
    { name: els.nameInput.value, maps: els.mapsInput.value },
    result
  );
  const applied = [];
  if (!els.nameInput.value.trim() && next.name) {
    els.nameInput.value = next.name;
    applied.push("restaurant name");
  }
  els.mapsInput.value = next.maps;
  els.mapsResolveStatus.textContent = applied.length
    ? `Added ${applied.join(" and ")}. Existing answers were left unchanged.`
    : "Your existing answers were left unchanged.";
  els.mapsResolvePreview.hidden = true;
  scheduleRestaurantDuplicateCheck();
  saveRestaurantDraft();
}

function showRestaurantSuccess(savedOnlyOnDevice) {
  els.restaurantEditorBody.hidden = true;
  els.restaurantModalActions.hidden = true;
  els.restaurantSuccess.hidden = false;
  els.restaurantSuccessTitle.textContent = savedOnlyOnDevice
    ? "Saved on this device"
    : "What would you like to do next?";
  els.restaurantSuccessMessage.textContent = savedOnlyOnDevice
    ? "It will stay clearly marked until you review and sync it when Cloud reconnects."
    : "Keep building the journal while this place is fresh in your mind.";
  els.successAddDish.focus();
}

function openRestaurantModal(id = null, options = {}) {
  if (!requireEditor()) return;

  const restaurant = state.data.find((item) => item.id === id);
  state.editingRestaurantId = id;
  state.lastSavedRestaurantId = null;
  els.restaurantEditorBody.hidden = false;
  els.restaurantModalActions.hidden = false;
  els.restaurantSuccess.hidden = true;
  clearFormValidation(els.restaurantForm, els.restaurantErrorSummary);
  resetMapsResolution();

  const draft = !restaurant ? readRestaurantDraft() : null;
  const initial = draft ?? {};
  els.modalEyebrow.textContent = restaurant ? "Edit place" : "New place";
  els.modalTitle.textContent = restaurant ? "Edit restaurant" : "Add restaurant";
  els.nameInput.value = restaurant
    ? restaurant.name ?? ""
    : initial.name || options.name || "";
  setRestaurantOption(
    els.locationSelect,
    els.locationInput,
    "location",
    restaurant?.location ?? initial.location ?? ""
  );
  setRestaurantOption(
    els.cuisineSelect,
    els.cuisineInput,
    "cuisine",
    restaurant?.cuisine ?? initial.cuisine ?? ""
  );
  const activeFilterPlaylist = activePlaylistFilterValue();
  const defaultPlaylists = restaurant
    ? restaurant.playlists ?? []
    : initial.playlists ?? (activeFilterPlaylist ? [activeFilterPlaylist] : []);
  els.playlistInput.value = defaultPlaylists.join(", ");
  renderPlaylistPicker(els.playlistPicker, defaultPlaylists, els.playlistInput);
  setRestaurantPrice(restaurant?.price ?? initial.price ?? "$$");
  setRatingValue(
    restaurant
      ? myRatingFor(restaurant)
      : initial.rating && initial.rating !== "none"
        ? Number(initial.rating)
        : null
  );
  els.mapsInput.value = restaurant
    ? restaurant.maps ?? ""
    : initial.maps || options.maps || "";
  els.notesInput.value = restaurant?.notes ?? initial.notes ?? "";
  const visited = restaurant?.visited ?? initial.visited ?? [];
  els.visitedInput.value = visited.join(", ");
  renderPeoplePicker(els.visitedPicker, visited, els.visitedInput);

  els.restaurantIntentFieldset.hidden = Boolean(restaurant);
  setRestaurantIntent(initial.intent ?? "want", { resetWantToGo: !draft });
  els.restaurantWantToGo.checked = restaurant
    ? isWantToGo(restaurant)
    : draft
      ? Boolean(initial.wantToGo)
      : true;
  els.planDetails.open = restaurant ? true : initial.planOpen !== false;
  els.visitDetails.open = restaurant ? true : Boolean(initial.visitOpen || initial.intent === "visited");
  els.restaurantDangerDetails.hidden = !restaurant;
  els.discardRestaurantDraft.hidden = Boolean(restaurant) || !draft;
  els.restaurantDraftStatus.hidden = !draft;
  els.restaurantDraftStatus.textContent = draft
    ? "Draft restored. Photos must be selected again after a refresh."
    : "";

  duplicateWarningSignature = "";
  els.restaurantDuplicateOverride.checked = false;
  setFormPending(els.restaurantForm, false, "");
  renderRestaurantDuplicateWarning();
  els.restaurantModal.showModal();
  if (window.innerWidth > 680) requestAnimationFrame(() => els.nameInput.focus());
}

function closeRestaurantModal({ clearDraft = false } = {}) {
  if (!clearDraft && !state.editingRestaurantId && els.restaurantSuccess.hidden) {
    saveRestaurantDraft();
  }
  if (clearDraft) clearRestaurantDraft();
  els.restaurantModal.close();
  els.restaurantForm.reset();
  clearTimeout(duplicateWarningTimer);
  duplicateWarningSignature = "";
  state.restaurantDuplicateMatches = [];
  els.restaurantDuplicateWarning.hidden = true;
  els.restaurantDuplicateList.innerHTML = "";
  els.restaurantDuplicateOverride.checked = false;
  clearFormValidation(els.restaurantForm, els.restaurantErrorSummary);
  resetMapsResolution();
  setFormPending(els.restaurantForm, false, "");
  dirtyForms.delete(els.restaurantForm);
  state.editingRestaurantId = null;
}

async function saveRestaurant(event) {
  event.preventDefault();
  clearFormValidation(els.restaurantForm, els.restaurantErrorSummary);
  if (!showFormValidation(els.restaurantForm, els.restaurantErrorSummary, "Restaurant name is required.")) return;
  const existing = state.data.find((item) => item.id === state.editingRestaurantId);
  const ratingValue = els.ratingInput.value === "none" ? null : Number(els.ratingInput.value);
  const wantToGo = !existing && els.restaurantWantToGo.checked;
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
    await withSubmission("restaurant", els.restaurantForm, async () => {
      const duplicateMatches = await authoritativeRestaurantDuplicateMatches(
        payload,
        state.editingRestaurantId
      );
      renderRestaurantDuplicateWarning(duplicateMatches);
      if (duplicateMatches.length && !els.restaurantDuplicateOverride.checked) {
        els.restaurantDuplicateWarning.focus();
        throw new Error("Review the possible duplicate below, then open the existing place or confirm that this is separate.");
      }

      let savedOnlyOnDevice = false;
      const canAttemptCloudSave = Boolean(
        canUseSupabase &&
        client &&
        state.session &&
        state.canEdit &&
        navigator.onLine
      );
      if (canAttemptCloudSave) {
        const pendingMode = existing?.pendingSyncMode;
        const remoteExistingId = existing?.pendingSync && pendingMode !== "edit"
          ? null
          : existing?.id;
        const id = existing
          ? await saveRestaurantRemote(restaurantToRow(payload), remoteExistingId, ratingValue)
          : await saveRestaurantCaptureRemote(restaurantToRow(payload), ratingValue, wantToGo);
        if (existing?.pendingSync) {
          state.data = state.data.filter((restaurant) => restaurant.id !== existing.id);
          saveLocalData();
        }
        state.selectedId = id;
        state.lastSavedRestaurantId = id;
        await loadRemoteData();
        const cachedAfterSave = state.data.find((restaurant) => restaurant.id === id);
        if (cachedAfterSave) {
          Object.assign(cachedAfterSave, payload);
          applyMyRatingLocal(cachedAfterSave, ratingValue);
          saveLocalData();
        } else {
          const cachedRestaurant = {
            id,
            ...payload,
            ratings: [],
            photos: [],
            dishes: [],
            wantToGo,
            wantToGoCount: wantToGo ? 1 : 0
          };
          applyMyRatingLocal(cachedRestaurant, ratingValue);
          state.data.unshift(cachedRestaurant);
          saveLocalData();
        }
      } else if (existing) {
        Object.assign(existing, payload, canUseSupabase ? {
          pendingSync: true,
          pendingSyncMode: existing.pendingSyncMode === "create" ? "create" : "edit"
        } : {});
        applyMyRatingLocal(existing, ratingValue);
        state.lastSavedRestaurantId = existing.id;
        saveLocalData();
        savedOnlyOnDevice = canUseSupabase;
      } else {
        const restaurant = {
          id: crypto.randomUUID(),
          ...payload,
          ratings: [],
          photos: [],
          dishes: [],
          wantToGo,
          wantToGoCount: wantToGo ? 1 : 0,
          ...(canUseSupabase ? { pendingSync: true, pendingSyncMode: "create" } : {})
        };
        applyMyRatingLocal(restaurant, ratingValue);
        state.data.unshift(restaurant);
        state.selectedId = restaurant.id;
        state.lastSavedRestaurantId = restaurant.id;
        recordLocalActivity("create", "restaurant", restaurant.id, { intent: restaurantIntentValue(), wantToGo });
        saveLocalData();
        savedOnlyOnDevice = canUseSupabase;
      }

      try {
        await registerLookupValues(payload.location, payload.cuisine, payload.playlists);
      } catch (lookupError) {
        console.warn("Place saved, but lookup choices could not refresh", lookupError.message);
      }
      if (existing && !canAttemptCloudSave) recordLocalActivity("edit", "restaurant", existing.id);
      clearRestaurantDraft();
      render();
      if (existing) {
        closeRestaurantModal({ clearDraft: true });
        showToast("Place updated");
      } else {
        dirtyForms.delete(els.restaurantForm);
        showRestaurantSuccess(savedOnlyOnDevice);
      }
    });
  } catch (error) {
    console.error("Restaurant save failed", error);
    els.restaurantErrorSummary.innerHTML = `<strong>Could not save this place</strong><p>${escapeHtml(error.message)}</p>`;
    els.restaurantErrorSummary.hidden = false;
  }
}

async function deleteRestaurant() {
  if (!state.editingRestaurantId) return;
  const restaurant = state.data.find((item) => item.id === state.editingRestaurantId);
  if (!restaurant) return;
  if (!confirm(`Move "${restaurant.name}" and its dishes, photos, and reviews to Trash? Nothing will be permanently deleted.`)) return;

  try {
    if (state.remoteReady) {
      const { error } = await client
        .from("restaurants")
        .update({ deleted_at: new Date().toISOString(), deleted_by: editorEmail() })
        .eq("id", state.editingRestaurantId)
        .is("deleted_at", null);
      if (error) throw error;
      closeRestaurantModal();
      await loadRemoteData();
      showToast("Place moved to Trash");
      return;
    }

    Object.assign(restaurant, trashRecord(restaurant, currentRaterIdentity().email));
    recordLocalActivity("trash", "restaurant", restaurant.id);
    state.selectedId = activeRecords(state.data)[0]?.id ?? null;
    saveLocalData();
    closeRestaurantModal();
    render();
    showToast("Place moved to Trash");
  } catch (error) {
    showToast(`Could not move place to Trash: ${error.message}`);
  }
}

function dishDraftKey() {
  return `${DISH_DRAFT_PREFIX}${currentRestaurant()?.id ?? "unknown"}`;
}

function dishDraftPayload() {
  return {
    name: els.dishNameInput.value,
    rating: els.dishRatingInput.value,
    likedBy: splitPeople(els.dishLikedByInput.value),
    notes: els.dishNotesInput.value,
    hadPhoto: Boolean(state.pendingPhotoFile),
    savedAt: Date.now()
  };
}

function saveDishDraft() {
  if (state.editingDishId || !els.dishModal.open) return;
  const draft = dishDraftPayload();
  const hasContent = Boolean(
    draft.name.trim() ||
    draft.rating !== "none" ||
    draft.likedBy.length ||
    draft.notes.trim() ||
    draft.hadPhoto
  );
  if (hasContent) sessionStorage.setItem(dishDraftKey(), JSON.stringify(draft));
}

function readDishDraft() {
  try {
    const value = JSON.parse(sessionStorage.getItem(dishDraftKey()) ?? "null");
    return value && typeof value === "object" ? value : null;
  } catch {
    sessionStorage.removeItem(dishDraftKey());
    return null;
  }
}

function clearDishDraft() {
  sessionStorage.removeItem(dishDraftKey());
  els.dishDraftStatus.hidden = true;
}

function renderDishDuplicateWarning(matches = null) {
  const signature = JSON.stringify([els.dishNameInput.value.trim(), state.editingDishId]);
  if (signature !== dishDuplicateWarningSignature) els.dishDuplicateOverride.checked = false;
  dishDuplicateWarningSignature = signature;
  const restaurant = currentRestaurant();
  const resolved = matches ?? findSimilarDishes(
    els.dishNameInput.value,
    restaurant?.dishes ?? [],
    { excludeId: state.editingDishId }
  );
  state.dishDuplicateMatches = resolved;
  els.dishDuplicateWarning.hidden = !resolved.length;
  els.dishDuplicateList.innerHTML = resolved.map((match) => `
    <li class="duplicate-match">
      <div>
        <strong>${escapeHtml(match.dish.name)}</strong>
        <span>${match.exactName ? "Same name" : "Similar name"}</span>
      </div>
      <button class="secondary-action compact" type="button" data-dish-duplicate-open-id="${escapeHtml(match.dish.id)}">Open existing</button>
    </li>
  `).join("");
  return resolved;
}

function scheduleDishDuplicateCheck() {
  clearTimeout(dishDuplicateWarningTimer);
  dishDuplicateWarningTimer = setTimeout(renderDishDuplicateWarning, 120);
}

async function authoritativeDishDuplicateMatches(restaurantId, candidateName, excludeId) {
  let dishes = currentRestaurant()?.dishes ?? [];
  if (canUseSupabase && client && navigator.onLine) {
    const { data, error } = await client
      .from("dishes")
      .select("id,name,deleted_at")
      .eq("restaurant_id", restaurantId)
      .is("deleted_at", null);
    if (error) throw new Error(`Could not check this restaurant for duplicate dishes. ${error.message}`);
    dishes = data ?? [];
  }
  return findSimilarDishes(candidateName, dishes, { excludeId });
}

function resetDishFields({ keepStatus = false } = {}) {
  els.dishNameInput.value = "";
  setDishRatingValue(null);
  els.dishLikedByInput.value = "";
  renderPeoplePicker(els.likedByPicker, [], els.dishLikedByInput);
  els.dishNotesInput.value = "";
  els.dishPhotoInput.value = "";
  els.dishCameraInput.value = "";
  state.pendingPhoto = "";
  state.pendingPhotoFile = null;
  state.originalDishPhoto = "";
  dishDuplicateWarningSignature = "";
  state.dishDuplicateMatches = [];
  els.dishDuplicateWarning.hidden = true;
  els.dishDuplicateList.innerHTML = "";
  els.dishDuplicateOverride.checked = false;
  clearFormValidation(els.dishForm, els.dishErrorSummary);
  renderPhotoPreview();
  if (!keepStatus) els.dishDraftStatus.hidden = true;
}

function openDishModal(id = null) {
  if (!requireEditor()) return;

  const restaurant = currentRestaurant();
  const dish = restaurant?.dishes.find((item) => item.id === id);
  state.editingDishId = id;
  const draft = !dish ? readDishDraft() : null;
  state.pendingPhoto = dish?.photo ?? "";
  state.originalDishPhoto = dish?.photo ?? "";
  state.pendingPhotoFile = null;

  els.dishModalEyebrow.textContent = restaurant?.name ?? "Dish";
  els.dishModalTitle.textContent = dish ? "Edit dish" : "Add dish";
  els.dishNameInput.value = dish?.name ?? draft?.name ?? "";
  setDishRatingValue(
    dish
      ? myDishRatingFor(dish)
      : draft?.rating && draft.rating !== "none"
        ? Number(draft.rating)
        : null
  );
  const likedBy = dish?.likedBy ?? draft?.likedBy ?? [];
  els.dishLikedByInput.value = likedBy.join(", ");
  renderPeoplePicker(els.likedByPicker, likedBy, els.dishLikedByInput);
  els.dishNotesInput.value = dish ? myDishReviewFor(dish) : draft?.notes ?? "";
  els.dishPhotoInput.value = "";
  els.dishCameraInput.value = "";
  els.dishDangerDetails.hidden = !dish;
  els.discardDishDraft.hidden = Boolean(dish) || !draft;
  els.dishDraftStatus.hidden = !draft;
  els.dishDraftStatus.textContent = draft?.hadPhoto
    ? "Draft restored. Please choose the photo again after the refresh."
    : draft
      ? "Draft restored."
      : "";
  clearFormValidation(els.dishForm, els.dishErrorSummary);
  setFormPending(els.dishForm, false, "");
  dishDuplicateWarningSignature = "";
  els.dishDuplicateOverride.checked = false;
  renderDishDuplicateWarning();
  renderPhotoPreview();
  els.dishModal.showModal();
  if (window.innerWidth > 680) requestAnimationFrame(() => els.dishNameInput.focus());
}

function closeDishModal({ clearDraft = false } = {}) {
  if (!clearDraft && !state.editingDishId) saveDishDraft();
  if (clearDraft) clearDishDraft();
  els.dishModal.close();
  els.dishForm.reset();
  clearTimeout(dishDuplicateWarningTimer);
  dirtyForms.delete(els.dishForm);
  state.editingDishId = null;
  state.pendingPhoto = "";
  state.originalDishPhoto = "";
  state.pendingPhotoFile = null;
  dishDuplicateWarningSignature = "";
  state.dishDuplicateMatches = [];
  clearFormValidation(els.dishForm, els.dishErrorSummary);
  setFormPending(els.dishForm, false, "");
}

function renderPhotoPreview() {
  if (!state.pendingPhoto) {
    els.photoPreview.innerHTML = `<p class="photo-empty-state">No photo selected yet.</p>`;
    return;
  }
  const canRemoveSelection = Boolean(state.pendingPhotoFile);
  els.photoPreview.innerHTML = `
    <figure>
      <img src="${state.pendingPhoto}" alt="Dish photo preview" width="640" height="480" />
      <figcaption>
        <button class="secondary-action compact" type="button" data-photo-action="change">Change</button>
        ${canRemoveSelection ? '<button class="text-action" type="button" data-photo-action="remove">Remove selection</button>' : ""}
      </figcaption>
    </figure>
  `;
}

async function handleDishPhotoFile(file) {
  if (!file) return;
  const compressed = await compressImage(file);
  state.pendingPhotoFile = compressed;
  const reader = new FileReader();
  reader.onload = () => {
    state.pendingPhoto = String(reader.result);
    renderPhotoPreview();
    saveDishDraft();
  };
  reader.readAsDataURL(compressed);
}

function openPhotoLightbox(src) {
  if (!src) return;
  els.lightboxImage.src = src;
  els.photoLightbox.showModal();
}

function closePhotoLightbox() {
  els.photoLightbox.close();
}

async function saveDish(event) {
  event.preventDefault();
  clearFormValidation(els.dishForm, els.dishErrorSummary);
  if (!showFormValidation(els.dishForm, els.dishErrorSummary, "Dish name is required.")) return;
  const restaurant = currentRestaurant();
  if (!restaurant) return;

  const saveMode = event.submitter?.dataset.saveMode === "another" ? "another" : "done";
  const existing = restaurant.dishes.find((item) => item.id === state.editingDishId);
  const ratingValue = els.dishRatingInput.value === "none" ? null : Number(els.dishRatingInput.value);
  const reviewNotes = els.dishNotesInput.value.trim();
  const payload = {
    name: els.dishNameInput.value.trim(),
    likedBy: splitPeople(els.dishLikedByInput.value),
    photo: state.pendingPhoto,
    photoPath: existing?.photoPath ?? ""
  };

  try {
    await withSubmission("dish", els.dishForm, async () => {
    const duplicateMatches = await authoritativeDishDuplicateMatches(
      restaurant.id,
      payload.name,
      state.editingDishId
    );
    renderDishDuplicateWarning(duplicateMatches);
    if (duplicateMatches.length && !els.dishDuplicateOverride.checked) {
      els.dishDuplicateWarning.focus();
      throw new Error("Review the similar dish, then open it or confirm that this is separate.");
    }

    if (state.remoteReady) {
      const savedDishId = await saveDishRemote(restaurant, payload, existing, ratingValue, reviewNotes);
      await loadRemoteData();
      const cachedRestaurant = state.data.find((item) => item.id === restaurant.id) ?? restaurant;
      cachedRestaurant.dishes ??= [];
      let cachedDish = cachedRestaurant.dishes.find((item) => item.id === savedDishId);
      if (!cachedDish) {
        cachedDish = {
          id: savedDishId,
          ...payload,
          ratings: []
        };
        cachedRestaurant.dishes.unshift(cachedDish);
      } else {
        Object.assign(cachedDish, payload);
      }
      applyMyDishRatingLocal(cachedDish, ratingValue, reviewNotes);
      cachedRestaurant.updatedAt = Date.now();
      saveLocalData();
      clearDishDraft();
      if (!existing && saveMode === "another") {
        resetDishFields({ keepStatus: true });
        els.dishDraftStatus.hidden = false;
        els.dishDraftStatus.textContent = "Dish saved. Add another for the same restaurant.";
        dirtyForms.delete(els.dishForm);
        if (window.innerWidth > 680) els.dishNameInput.focus();
      } else {
        closeDishModal({ clearDraft: true });
      }
      showToast(existing ? "Dish updated" : "Dish added");
      return;
    }

    if (existing) {
      Object.assign(existing, payload);
      applyMyDishRatingLocal(existing, ratingValue, reviewNotes);
    } else {
      const dish = { id: crypto.randomUUID(), ...payload, ratings: [] };
      applyMyDishRatingLocal(dish, ratingValue, reviewNotes);
      restaurant.dishes.unshift(dish);
      recordLocalActivity("create", "dish", dish.id, { restaurantId: restaurant.id });
    }

    if (existing) recordLocalActivity("edit", "dish", existing.id, { restaurantId: restaurant.id });
    restaurant.updatedAt = Date.now();
    saveLocalData();
    render();
    clearDishDraft();
    if (!existing && saveMode === "another") {
      resetDishFields({ keepStatus: true });
      els.dishDraftStatus.hidden = false;
      els.dishDraftStatus.textContent = "Dish saved. Add another for the same restaurant.";
      dirtyForms.delete(els.dishForm);
      if (window.innerWidth > 680) els.dishNameInput.focus();
    } else {
      closeDishModal({ clearDraft: true });
    }
    showToast(existing ? "Dish updated" : "Dish added");
    });
  } catch (error) {
    console.error("Dish save failed", error);
    els.dishErrorSummary.innerHTML = `<strong>Could not save this dish</strong><p>${escapeHtml(error.message)}</p>`;
    els.dishErrorSummary.hidden = false;
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
    showToast(`Photo upload failed: ${error.message}`);
  }
}

async function setRestaurantCoverPhoto(photoId) {
  if (!requireEditor()) return;

  const submissionKey = "restaurant-cover-photo";
  if (state.submitting.has(submissionKey)) return;

  const restaurant = currentRestaurant();
  const photo = activeRecords(restaurant?.photos ?? []).find((item) => item.id === photoId);
  if (!restaurant || !photo || photo.isCover) return;

  state.submitting.add(submissionKey);
  render();
  try {
    if (state.remoteReady) {
      const { error } = await client.rpc("set_restaurant_cover_photo", {
        p_restaurant_id: restaurant.id,
        p_photo_id: photoId
      });
      if (error) throw error;
      await loadRemoteData();
      showToast("Main restaurant photo updated");
      return;
    }

    restaurant.photos = (restaurant.photos ?? []).map((item) => ({
      ...item,
      isCover: item.id === photoId
    }));
    recordLocalActivity("edit", "restaurant", restaurant.id, { coverPhotoId: photoId });
    restaurant.updatedAt = Date.now();
    saveLocalData();
    render();
    showToast("Main restaurant photo updated");
  } catch (error) {
    showToast(`Could not update the main photo: ${error.message}`);
  } finally {
    state.submitting.delete(submissionKey);
    render();
  }
}

async function deleteRestaurantPhoto(photoId) {
  if (!requireEditor()) return;

  const restaurant = currentRestaurant();
  const photo = restaurant?.photos?.find((item) => item.id === photoId);
  if (!restaurant || !photo) return;
  if (!confirm("Move this photo to Trash? The stored image will be retained indefinitely.")) return;

  try {
    if (state.remoteReady) {
      const { error } = await client
        .from("restaurant_photos")
        .update({ deleted_at: new Date().toISOString(), deleted_by: editorEmail() })
        .eq("id", photoId)
        .is("deleted_at", null);
      if (error) throw error;
      await loadRemoteData();
      showToast("Photo moved to Trash");
      return;
    }

    restaurant.photos = (restaurant.photos ?? []).map((item) =>
      item.id === photoId
        ? { ...trashRecord(item, currentRaterIdentity().email), isCover: false }
        : item
    );
    recordLocalActivity("trash", "restaurant_photo", photoId, { restaurantId: restaurant.id });
    restaurant.updatedAt = Date.now();
    saveLocalData();
    render();
    showToast("Photo moved to Trash");
  } catch (error) {
    showToast(`Could not move photo to Trash: ${error.message}`);
  }
}

async function deleteDish() {
  const restaurant = currentRestaurant();
  if (!restaurant || !state.editingDishId) return;
  const dish = restaurant.dishes.find((item) => item.id === state.editingDishId);
  if (!dish) return;
  if (!confirm(`Move "${dish.name}" and its reviews to Trash? Its stored photo will be retained.`)) return;

  try {
    if (state.remoteReady) {
      const { error } = await client
        .from("dishes")
        .update({ deleted_at: new Date().toISOString(), deleted_by: editorEmail() })
        .eq("id", state.editingDishId)
        .is("deleted_at", null);
      if (error) throw error;
      closeDishModal();
      await loadRemoteData();
      showToast("Dish moved to Trash");
      return;
    }

    restaurant.dishes = restaurant.dishes.map((item) =>
      item.id === state.editingDishId ? trashRecord(item, currentRaterIdentity().email) : item
    );
    recordLocalActivity("trash", "dish", dish.id, { restaurantId: restaurant.id });
    restaurant.updatedAt = Date.now();
    saveLocalData();
    closeDishModal();
    render();
    showToast("Dish moved to Trash");
  } catch (error) {
    showToast(`Could not move dish to Trash: ${error.message}`);
  }
}

function collectLocalTrashItems() {
  const items = [...state.localTrash];
  for (const restaurant of state.data) {
    if (!restaurant?.deletedAt) {
      for (const dish of restaurant.dishes ?? []) {
        if (dish.deletedAt) {
          items.push({ id: dish.id, type: "dish", name: dish.name, parentId: restaurant.id, deletedAt: dish.deletedAt, deletedBy: dish.deletedBy });
        }
        for (const rating of dish.ratings ?? []) {
          if (rating.deletedAt) items.push({
            id: `${dish.id}:${rating.email}`,
            type: "dish_rating",
            name: `${ratingLabelFor(rating)} · ${dish.name}`,
            parentId: restaurant.id,
            dishId: dish.id,
            email: rating.email,
            deletedAt: rating.deletedAt,
            deletedBy: rating.deletedBy
          });
        }
      }
      for (const photo of restaurant.photos ?? []) {
        if (photo.deletedAt) items.push({
          id: photo.id,
          type: "restaurant_photo",
          name: `Photo from ${restaurant.name}`,
          parentId: restaurant.id,
          deletedAt: photo.deletedAt,
          deletedBy: photo.deletedBy
        });
      }
      for (const rating of restaurant.ratings ?? []) {
        if (rating.deletedAt) items.push({
          id: `${restaurant.id}:${rating.email}`,
          type: "restaurant_rating",
          name: `${ratingLabelFor(rating)} · ${restaurant.name}`,
          parentId: restaurant.id,
          email: rating.email,
          deletedAt: rating.deletedAt,
          deletedBy: rating.deletedBy
        });
      }
    }
    if (restaurant.deletedAt) {
      items.push({
        id: restaurant.id,
        type: "restaurant",
        name: restaurant.name,
        deletedAt: restaurant.deletedAt,
        deletedBy: restaurant.deletedBy
      });
    }
  }
  return items.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
}

async function loadTrashItems() {
  if (!state.remoteReady || !client) {
    state.trashItems = collectLocalTrashItems();
    return;
  }
  const queries = await Promise.all([
    client.from("restaurants").select("id,name,deleted_at,deleted_by").not("deleted_at", "is", null),
    client.from("dishes").select("id,name,restaurant_id,deleted_at,deleted_by").not("deleted_at", "is", null),
    client.from("restaurant_photos").select("id,restaurant_id,deleted_at,deleted_by").not("deleted_at", "is", null),
    client.from("restaurant_ratings").select("restaurant_id,rater_email,rater_name,deleted_at,deleted_by").not("deleted_at", "is", null),
    client.from("dish_ratings").select("dish_id,rater_email,rater_name,deleted_at,deleted_by").not("deleted_at", "is", null),
    client.from("playlists").select("name,member_restaurant_ids,deleted_at,deleted_by").not("deleted_at", "is", null)
  ]);
  const firstError = queries.find((result) => result.error)?.error;
  if (firstError) throw firstError;
  const [restaurants, dishes, photos, restaurantRatingsRows, dishRatingsRows, playlists] = queries.map((result) => result.data ?? []);
  state.trashItems = [
    ...restaurants.map((row) => ({ id: row.id, type: "restaurant", name: row.name, deletedAt: row.deleted_at, deletedBy: row.deleted_by })),
    ...dishes.map((row) => ({ id: row.id, type: "dish", name: row.name, parentId: row.restaurant_id, deletedAt: row.deleted_at, deletedBy: row.deleted_by })),
    ...photos.map((row) => ({ id: row.id, type: "restaurant_photo", name: "Restaurant photo", parentId: row.restaurant_id, deletedAt: row.deleted_at, deletedBy: row.deleted_by })),
    ...restaurantRatingsRows.map((row) => ({ id: `${row.restaurant_id}:${row.rater_email}`, type: "restaurant_rating", name: `${row.rater_name || emailLocalPart(row.rater_email)}’s restaurant rating`, parentId: row.restaurant_id, email: row.rater_email, deletedAt: row.deleted_at, deletedBy: row.deleted_by })),
    ...dishRatingsRows.map((row) => ({ id: `${row.dish_id}:${row.rater_email}`, type: "dish_rating", name: `${row.rater_name || emailLocalPart(row.rater_email)}’s dish review`, dishId: row.dish_id, email: row.rater_email, deletedAt: row.deleted_at, deletedBy: row.deleted_by })),
    ...playlists.map((row) => ({ id: row.name, type: "playlist", name: row.name, memberRestaurantIds: row.member_restaurant_ids ?? [], deletedAt: row.deleted_at, deletedBy: row.deleted_by }))
  ].sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
}

function renderTrash() {
  if (!els.trashList) return;
  if (!state.trashItems.length) {
    els.trashList.innerHTML = '<div class="empty-state">Trash is empty.</div>';
    return;
  }
  els.trashList.innerHTML = state.trashItems.map((item) => `
    <article class="trash-item">
      <div>
        <span class="eyebrow">${escapeHtml(item.type.replaceAll("_", " "))}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${item.deletedAt ? new Date(item.deletedAt).toLocaleString() : ""}</small>
      </div>
      <button class="secondary-action compact" type="button" data-restore-type="${escapeHtml(item.type)}" data-restore-id="${escapeHtml(item.id)}">Restore</button>
    </article>
  `).join("");
}

async function openTrash() {
  if (!requireEditor()) return;
  els.trashList.innerHTML = '<div class="empty-state">Loading recoverable items…</div>';
  els.trashModal.showModal();
  try {
    await loadTrashItems();
    renderTrash();
  } catch (error) {
    els.trashList.innerHTML = `<div class="empty-state">Could not load Trash: ${escapeHtml(error.message)}</div>`;
  }
}

async function restoreTrashItem(type, id) {
  const item = state.trashItems.find((entry) => entry.type === type && String(entry.id) === String(id));
  if (!item) return;
  try {
    if (state.remoteReady) {
      if (type === "playlist") {
        const { error } = await client.rpc("restore_foodlog_playlist", { p_name: item.name });
        if (error) throw error;
      } else if (type === "restaurant_rating") {
        const { error } = await client.from("restaurant_ratings").update({ deleted_at: null, deleted_by: null }).eq("restaurant_id", item.parentId).eq("rater_email", item.email);
        if (error) throw error;
      } else if (type === "dish_rating") {
        const { error } = await client.from("dish_ratings").update({ deleted_at: null, deleted_by: null }).eq("dish_id", item.dishId).eq("rater_email", item.email);
        if (error) throw error;
      } else {
        const table = { restaurant: "restaurants", dish: "dishes", restaurant_photo: "restaurant_photos" }[type];
        const { error } = await client.from(table).update({ deleted_at: null, deleted_by: null }).eq("id", item.id);
        if (error) throw error;
      }
      await loadRemoteData();
    } else if (type === "playlist") {
      for (const snapshot of item.affected ?? []) {
        const restaurant = state.data.find((entry) => entry.id === snapshot.id);
        if (restaurant) restaurant.playlists = [...snapshot.playlists];
      }
      state.localTrash = state.localTrash.filter((entry) => entry.id !== item.id);
      saveLocalTrash();
      recordLocalActivity("restore", "playlist", item.name);
      saveLocalData();
    } else {
      const restaurant = state.data.find((entry) => entry.id === (type === "restaurant" ? item.id : item.parentId));
      if (type === "restaurant" && restaurant) Object.assign(restaurant, restoreRecord(restaurant));
      if (type === "dish") {
        const dish = restaurant?.dishes.find((entry) => entry.id === item.id);
        if (dish) Object.assign(dish, restoreRecord(dish));
      }
      if (type === "restaurant_photo") {
        const photo = restaurant?.photos?.find((entry) => entry.id === item.id);
        if (photo) Object.assign(photo, restoreRecord(photo));
      }
      if (type === "restaurant_rating") {
        const rating = restaurant?.ratings?.find((entry) => entry.email === item.email);
        if (rating) Object.assign(rating, restoreRecord(rating));
      }
      if (type === "dish_rating") {
        const dish = restaurant?.dishes?.find((entry) => entry.id === item.dishId);
        const rating = dish?.ratings.find((entry) => entry.email === item.email);
        if (rating) Object.assign(rating, restoreRecord(rating));
      }
      recordLocalActivity("restore", type, item.id);
      saveLocalData();
    }
    await loadTrashItems();
    renderTrash();
    render();
    showToast("Restored");
  } catch (error) {
    showToast(`Restore failed: ${error.message}`);
  }
}

function exportData() {
  if (!isSuperuser()) {
    showToast("Only the owner account can export FoodLog data.");
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
  const { data, error } = await client.from("dishes").insert(row).select("id").single();
  if (error) throw error;

  const legacyRatings = Array.isArray(dish.ratings)
    ? dish.ratings
    : dish.rating >= 0.5
      ? [{ rating: dish.rating, notes: dish.notes ?? "" }]
      : [];
  const { email } = currentRaterIdentity();
  const mine =
    legacyRatings.find((entry) => entry.email?.toLowerCase() === email.toLowerCase()) ?? legacyRatings[0];
  if (mine && Number(mine.rating) >= 0.5) {
    await saveMyDishRatingRemote(data.id, Number(mine.rating), mine.notes ?? "");
  }
}

async function importRestaurantPhotoToRemote(restaurantId, photo) {
  if (!photo.photo?.startsWith("data:")) return;
  const file = await dataUrlToFile(photo.photo, "gallery.jpg");
  const photoPath = await uploadRestaurantPhoto(file);
  const { error } = await client.from("restaurant_photos").insert(restaurantPhotoToRow(restaurantId, photoPath));
  if (error) throw error;
}

async function importToSupabase(restaurants) {
  const batchId = crypto.randomUUID();
  const uploadedPaths = [];
  const prepared = structuredClone(restaurants);
  setSync("Preparing import", "Uploading referenced photos before the database transaction…");
  try {
    for (const restaurant of prepared) {
      restaurant.photos = Array.isArray(restaurant.photos) ? restaurant.photos : [];
      restaurant.dishes = Array.isArray(restaurant.dishes) ? restaurant.dishes : [];
      for (const photo of restaurant.photos) {
        if (photo.photo?.startsWith("data:")) {
          const file = await dataUrlToFile(photo.photo, "gallery.jpg");
          photo.photoPath = await uploadRestaurantPhoto(file);
          uploadedPaths.push(photo.photoPath);
        }
        delete photo.photo;
      }
      for (const dish of restaurant.dishes) {
        if (dish.photo?.startsWith("data:")) {
          const file = await dataUrlToFile(dish.photo, `${dish.name || "dish"}.jpg`);
          dish.photoPath = await uploadDishPhoto(file);
          uploadedPaths.push(dish.photoPath);
        }
        delete dish.photo;
      }
    }
    setSync("Importing", "Writing the checked batch in one database transaction…");
    const { data, error } = await client.rpc("import_foodlog_batch", {
      p_batch_id: batchId,
      p_payload: prepared
    });
    if (error) throw error;
    recordLocalActivity("create", "import_batch", batchId, { restaurantCount: restaurants.length });
    return { batchId, importedCount: Number(data ?? restaurants.length) };
  } catch (error) {
    if (uploadedPaths.length) {
      const cleanup = await client.storage.from(PHOTO_BUCKET).remove(uploadedPaths);
      if (cleanup.error) console.warn("Import orphan cleanup failed", cleanup.error.message);
    }
    throw error;
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
    setFormPending(els.approveForm, false, "Enter an email to add to the waiting list.");
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
    setFormPending(els.approveForm, false, error.message);
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
    setFormPending(els.approveForm, false, "Enter an email to pre-approve, or use Approve below.");
    return;
  }

  const note = els.approveNote.value.trim() || "Pre-approved by owner";

  try {
    await grantEditorAccess(email, note);
    els.approveForm.reset();
    await loadAdminData();
    showToast(`${email} can now edit`);
  } catch (error) {
    setFormPending(els.approveForm, false, error.message);
  }
}

async function approvePending(email) {
  if (!isSuperuser()) return;

  try {
    await grantEditorAccess(email, "Approved after sign-in request");
    await loadAdminData();
    showToast(`${email} approved`);
  } catch (error) {
    showToast(`Approval failed: ${error.message}`);
  }
}

async function denyPending(email) {
  if (!isSuperuser()) return;
  if (!confirm(`Deny access for ${email}? They can sign in again to request later.`)) return;

  const { error } = await client.from("pending_approvals").delete().eq("email", email.toLowerCase());

  if (error) {
    showToast(`Could not deny access: ${error.message}`);
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
    showToast(`Could not remove access: ${error.message}`);
    return;
  }

  await loadAdminData();
  showToast(`${email} removed`);
}

function importData(file) {
  if (!isSuperuser()) {
    showToast("Only the owner account can import FoodLog data.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const validation = validateImportPayload(parsed);
      const duplicates = Array.isArray(parsed) ? findRestaurantDuplicates(parsed, activeRecords(state.data)) : [];
      state.pendingImport = { restaurants: parsed, validation, duplicates };
      const destinationOptions = canUseSupabase && state.canEdit
        ? `<label class="import-choice"><input type="radio" name="importDestination" value="cloud" checked /> Add to the shared staging/cloud log transactionally</label>
           <label class="import-choice"><input type="radio" name="importDestination" value="local-merge" /> Merge into this browser only</label>
           <label class="import-choice"><input type="radio" name="importDestination" value="local-replace" /> Replace this browser’s local log (existing import behavior)</label>`
        : `<label class="import-choice"><input type="radio" name="importDestination" value="local-merge" checked /> Merge into this browser</label>
           <label class="import-choice"><input type="radio" name="importDestination" value="local-replace" /> Replace this browser’s local log (existing import behavior)</label>`;
      els.importPreviewBody.innerHTML = `
        <div class="import-summary">
          <strong>${Array.isArray(parsed) ? parsed.length : 0} restaurants</strong>
          <span>${validation.errors.length} validation ${validation.errors.length === 1 ? "issue" : "issues"}</span>
          <span>${duplicates.length} possible ${duplicates.length === 1 ? "duplicate" : "duplicates"}</span>
        </div>
        ${validation.errors.length ? `<div class="import-errors" role="alert"><h3>Fix these issues first</h3><ul>${validation.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul></div>` : ""}
        ${duplicates.length ? `<div class="import-duplicates"><h3>Possible duplicates</h3><ul>${duplicates.map((duplicate) => `<li>${escapeHtml(duplicate.name)} · ${escapeHtml(duplicate.location)}</li>`).join("")}</ul><label class="import-choice"><input id="importAcknowledgeDuplicates" type="checkbox" /> I reviewed these duplicates and want to continue.</label></div>` : ""}
        <fieldset><legend>Import destination</legend>${destinationOptions}</fieldset>
      `;
      els.confirmImportButton.disabled = !validation.valid;
      els.importPreviewModal.showModal();
    } catch (error) {
      state.pendingImport = null;
      showToast(error?.message || "That file does not look like a FoodLog export.");
    }
  };
  reader.readAsText(file);
}

async function confirmImport() {
  const pending = state.pendingImport;
  if (!pending?.validation.valid) return;
  if (pending.duplicates.length && !document.querySelector("#importAcknowledgeDuplicates")?.checked) {
    showToast("Review and acknowledge the possible duplicates first.");
    return;
  }
  const destination = document.querySelector('input[name="importDestination"]:checked')?.value;
  if (!destination) return;
  els.confirmImportButton.disabled = true;
  els.confirmImportButton.setAttribute("aria-busy", "true");
  try {
    if (destination === "cloud") {
      await importToSupabase(pending.restaurants);
      await loadRemoteData();
    } else if (destination === "local-replace") {
      state.data = structuredClone(pending.restaurants);
      state.selectedId = activeRecords(state.data)[0]?.id ?? null;
      saveLocalData();
      recordLocalActivity("update", "local_import", "replace", { restaurantCount: state.data.length });
    } else {
      const existingIds = new Set(state.data.map((restaurant) => restaurant.id));
      const incoming = structuredClone(pending.restaurants).map((restaurant) => ({
        ...restaurant,
        id: restaurant.id && !existingIds.has(restaurant.id) ? restaurant.id : crypto.randomUUID()
      }));
      state.data = [...incoming, ...state.data];
      state.selectedId = incoming[0]?.id ?? state.selectedId;
      saveLocalData();
      recordLocalActivity("create", "local_import", crypto.randomUUID(), { restaurantCount: incoming.length });
    }
    state.pendingImport = null;
    els.importPreviewModal.close();
    render();
    showToast("Import completed");
  } catch (error) {
    showToast(`Import failed: ${error.message}`);
  } finally {
    els.confirmImportButton.disabled = false;
    els.confirmImportButton.removeAttribute("aria-busy");
  }
}

async function signIn(event) {
  event.preventDefault();
  if (!client) return;

  const email = els.emailInput.value.trim().toLowerCase();
  const password = els.passwordInput.value;
  setSync("Signing in", `Checking ${email}…`);
  const { error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setFormPending(els.authForm, false, error.message);
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
    setFormPending(els.authForm, false, error.message);
  }
}

async function signOut() {
  if (!client) return;

  setSync("Signing out", "Clearing your session…");
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
  maybeOpenSharedRestaurant();

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
      () => queueRemoteLoad()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "dishes" },
      () => queueRemoteLoad()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "restaurant_photos" },
      () => queueRemoteLoad()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "restaurant_ratings" },
      () => queueRemoteLoad()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "restaurant_want_to_go" },
      () => queueRemoteLoad()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "dish_ratings" },
      () => queueRemoteLoad()
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
    maybeOpenSharedRestaurant();
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
    maybeOpenSharedRestaurant();

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
document.querySelector("#closeDishReviewModal")?.addEventListener("click", closeDishReviewModal);
document.querySelector("#cancelDishReviewModal")?.addEventListener("click", closeDishReviewModal);
els.dishReviewForm?.addEventListener("submit", saveDishReview);
els.trashMyDishReview?.addEventListener("click", trashMyDishReview);
document.querySelectorAll("[data-nav]").forEach((button) => {
  button.addEventListener("click", () => setActiveSurface(button.dataset.nav));
});
els.newDecisionButton?.addEventListener("click", () => {
  if (!requireEditor()) return;
  els.decisionModal.showModal();
  els.decisionTitleInput.focus();
});
els.decisionForm?.addEventListener("submit", createDecisionFromForm);
els.closeDecisionModal?.addEventListener("click", () => els.decisionModal.close());
els.cancelDecisionButton?.addEventListener("click", () => els.decisionModal.close());
els.decisionSessionList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-decision-session]");
  if (!button) return;
  state.selectedDecisionSessionId = button.dataset.decisionSession;
  updateBrowseUrl();
  renderPicker();
});
els.pickerPanel?.addEventListener("click", (event) => {
  const target = event.target.closest("[data-picker-action]");
  if (!target) return;
  const action = target.dataset.pickerAction;
  if (action === "open-place") {
    state.selectedId = target.dataset.restaurantId;
    updatePlaceUrl(state.selectedId);
    setActiveSurface("places");
    state.mobileDetailOpen = window.innerWidth <= 980;
    render();
    return;
  }
  if (action === "add-candidate") {
    const restaurantId = document.querySelector("#decisionCandidateSelect")?.value;
    if (restaurantId) void mutateDecision(action, restaurantId);
    return;
  }
  void mutateDecision(action, target.dataset.restaurantId);
});
els.trashButton?.addEventListener("click", openTrash);
els.closeTrashModal?.addEventListener("click", () => els.trashModal.close());
els.trashModal?.addEventListener("click", (event) => {
  if (event.target === els.trashModal) {
    els.trashModal.close();
    return;
  }
  const restore = event.target.closest("[data-restore-type]");
  if (restore) void restoreTrashItem(restore.dataset.restoreType, restore.dataset.restoreId);
});
els.closeImportPreviewModal?.addEventListener("click", () => els.importPreviewModal.close());
els.cancelImportButton?.addEventListener("click", () => {
  state.pendingImport = null;
  els.importPreviewModal.close();
});
els.confirmImportButton?.addEventListener("click", confirmImport);
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
els.retryMapButton?.addEventListener("click", () => {
  if (els.mapHint) els.mapHint.textContent = "Loading the map…";
  els.retryMapButton.hidden = true;
  void renderMapView();
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
[els.restaurantForm, els.dishForm, els.dishReviewForm, els.decisionForm, els.playlistManageForm].forEach((form) => {
  form?.addEventListener("input", () => dirtyForms.add(form));
});
window.addEventListener("beforeunload", (event) => {
  if (!dirtyForms.size) return;
  event.preventDefault();
  event.returnValue = "";
});
els.restaurantForm.addEventListener("submit", saveRestaurant);
els.restaurantForm.addEventListener("input", () => {
  clearFormValidation(els.restaurantForm, els.restaurantErrorSummary);
  saveRestaurantDraft();
});
els.restaurantForm.addEventListener("change", saveRestaurantDraft);
els.restaurantForm.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") event.preventDefault();
});
els.nameInput.addEventListener("input", scheduleRestaurantDuplicateCheck);
els.locationSelect.addEventListener("input", scheduleRestaurantDuplicateCheck);
els.locationInput.addEventListener("input", scheduleRestaurantDuplicateCheck);
els.restaurantDuplicateList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-duplicate-open-id]");
  if (!button) return;
  const restaurantId = button.dataset.duplicateOpenId;
  const restaurant = state.data.find((item) => item.id === restaurantId);
  if (!restaurant) {
    showToast("Refresh the log, then open the existing place");
    return;
  }
  closeRestaurantModal();
  mobileListScrollY = window.scrollY;
  state.selectedId = restaurantId;
  state.mobileDetailOpen = window.innerWidth <= 980;
  updatePlaceUrl(restaurantId);
  render();
  if (window.innerWidth <= 980) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
      els.detailPanel.focus({ preventScroll: true });
    });
  }
});
els.dishForm.addEventListener("submit", saveDish);
els.dishForm.addEventListener("input", () => {
  clearFormValidation(els.dishForm, els.dishErrorSummary);
  saveDishDraft();
});
els.dishForm.addEventListener("change", saveDishDraft);
els.dishForm.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") event.preventDefault();
});
els.dishReviewForm?.addEventListener("input", () => {
  clearFormValidation(els.dishReviewForm, els.dishReviewErrorSummary);
});
els.dishNameInput.addEventListener("input", scheduleDishDuplicateCheck);
els.dishDuplicateList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-dish-duplicate-open-id]");
  if (!button) return;
  const id = button.dataset.dishDuplicateOpenId;
  closeDishModal();
  openDishModal(id);
});
els.locationSelect.addEventListener("change", () => {
  toggleCustomRestaurantOption(els.locationSelect, els.locationInput);
  scheduleRestaurantDuplicateCheck();
});
els.cuisineSelect.addEventListener("change", () => toggleCustomRestaurantOption(els.cuisineSelect, els.cuisineInput));
els.restaurantForm.querySelectorAll('input[name="restaurantIntent"]').forEach((input) => {
  input.addEventListener("change", () => {
    setRestaurantIntent(input.value, { resetWantToGo: true });
    saveRestaurantDraft();
  });
});
els.restaurantForm.querySelectorAll('input[name="restaurantPrice"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) els.priceInput.value = input.value;
    saveRestaurantDraft();
  });
});
document.querySelector("#ratingDecrease")?.addEventListener("click", () => adjustRating(restaurantStarPicker, -0.5));
document.querySelector("#ratingIncrease")?.addEventListener("click", () => adjustRating(restaurantStarPicker, 0.5));
document.querySelector("#dishRatingDecrease")?.addEventListener("click", () => adjustRating(dishStarPicker, -0.5));
document.querySelector("#dishRatingIncrease")?.addEventListener("click", () => adjustRating(dishStarPicker, 0.5));
document.querySelector("#dishReviewRatingDecrease")?.addEventListener("click", () => adjustRating(dishReviewStarPicker, -0.5));
document.querySelector("#dishReviewRatingIncrease")?.addEventListener("click", () => adjustRating(dishReviewStarPicker, 0.5));
els.resolveMapsButton?.addEventListener("click", resolveMapsLink);
els.mapsResolvePreview?.addEventListener("click", (event) => {
  const action = event.target.closest("[data-maps-action]")?.dataset.mapsAction;
  if (action === "apply") applyMapsResolution();
  if (action === "ignore") {
    els.mapsResolvePreview.hidden = true;
    els.mapsResolveStatus.textContent = "Kept your current answers.";
  }
});
els.discardRestaurantDraft?.addEventListener("click", () => {
  clearRestaurantDraft();
  closeRestaurantModal({ clearDraft: true });
  openRestaurantModal();
});
els.discardDishDraft?.addEventListener("click", () => {
  clearDishDraft();
  resetDishFields();
  els.discardDishDraft.hidden = true;
  els.dishNameInput.focus();
});
els.successAddDish?.addEventListener("click", () => {
  const id = state.lastSavedRestaurantId;
  closeRestaurantModal({ clearDraft: true });
  if (!id) return;
  state.selectedId = id;
  render();
  openDishModal();
});
els.successAddPhotos?.addEventListener("click", () => {
  const id = state.lastSavedRestaurantId;
  closeRestaurantModal({ clearDraft: true });
  if (!id) return;
  state.selectedId = id;
  render();
  requestAnimationFrame(() => document.querySelector("#restaurantPhotoInput")?.click());
});
els.successDone?.addEventListener("click", () => {
  closeRestaurantModal({ clearDraft: true });
  render();
});
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
    setFormPending(els.playlistManageForm, false, error.message);
  }
});

els.deletePlaylistButton?.addEventListener("click", async () => {
  const name = state.managingPlaylistName;
  if (!name) return;
  try {
    await deletePlaylist(name);
  } catch (error) {
    setFormPending(els.playlistManageForm, false, error.message);
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
els.playlistShowAllButton?.addEventListener("click", () => {
  const playlistName = state.playlistFilter;
  const totalCount = playlistCounts()[playlistName] ?? playlistCounts().all;
  clearNarrowingBrowseFilters();
  saveFilterPrefs();
  render();
  showToast(
    playlistName === "all"
      ? `Showing all ${totalCount} places`
      : `Showing all ${totalCount} places in ${playlistName === "__none__" ? "Unsorted" : playlistName}`
  );
});

[els.locationFilter, els.cuisineFilter, els.priceFilter, els.ratingFilter].forEach((input) => {
  input.addEventListener("input", () => {
    updateFilterBadge();
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
  clearNarrowingBrowseFilters();
  state.sort = "recent";
  if (els.sortFilter) els.sortFilter.value = "recent";
  saveFilterPrefs();
  render();
});
els.filterSheet?.addEventListener("click", (event) => {
  if (event.target === els.filterSheet) closeFilterSheet();
});

els.closePlaceActionSheet?.addEventListener("click", closePlaceActionSheet);
els.placeActionSheet?.addEventListener("click", (event) => {
  if (event.target === els.placeActionSheet) closePlaceActionSheet();
});
els.closeDishReviewsSheet?.addEventListener("click", closeDishReviewsSheet);
els.dishReviewsWriteButton?.addEventListener("click", () => {
  if (dishReviewsDishId) openDishReviewModal(dishReviewsDishId);
});
els.dishReviewsSheet?.addEventListener("click", (event) => {
  if (event.target === els.dishReviewsSheet) {
    closeDishReviewsSheet();
    return;
  }
  const target = event.target.closest("[data-action]");
  if (target?.dataset.action === "remove-dish-rating") {
    removeDishRating(target.dataset.dishId, target.dataset.email);
  }
});
els.dishReviewModal?.addEventListener("click", (event) => {
  if (event.target === els.dishReviewModal) closeDishReviewModal();
});
els.dishReviewModal?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDishReviewModal();
});

els.detailPanel.addEventListener("pointerdown", (event) => {
  const card = event.target.closest(".dish-card[data-has-reviews]");
  if (!card || event.button !== 0) return;
  startDishLongPress(card, event);
});
els.detailPanel.addEventListener("pointerdown", startDetailSwipe);

els.detailPanel.addEventListener("pointermove", (event) => {
  if (!dishLongPressOrigin || event.pointerId !== dishLongPressOrigin.pointerId) return;
  if (moveCancelsDishLongPress(event)) clearDishLongPress();
});
els.detailPanel.addEventListener("pointermove", moveDetailSwipe);

els.detailPanel.addEventListener("pointerup", (event) => {
  if (dishLongPressOrigin?.pointerId === event.pointerId) clearDishLongPress();
});
els.detailPanel.addEventListener("pointerup", (event) => finishDetailSwipe(event));

els.detailPanel.addEventListener("pointercancel", (event) => {
  if (dishLongPressOrigin?.pointerId === event.pointerId) clearDishLongPress();
});
els.detailPanel.addEventListener("pointercancel", (event) => finishDetailSwipe(event, true));

els.detailPanel.addEventListener("contextmenu", (event) => {
  const card = event.target.closest(".dish-card[data-has-reviews]");
  if (!card || event.target.closest("[data-action]")) return;
  event.preventDefault();
  openDishReviewsSheet(card.dataset.dishId);
});

els.placeActionWantToGo?.addEventListener("click", async () => {
  const id = placeActionRestaurantId;
  if (!id) return;
  const restaurant = restaurantById(id);
  if (!restaurant) return;
  closePlaceActionSheet();
  await setWantToGo(id, !isWantToGo(restaurant));
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

els.restaurantList.addEventListener("pointerdown", (event) => {
  const row = event.target.closest(".restaurant-row");
  if (!row || event.button !== 0) return;
  startRestaurantLongPress(row, event);
});

els.restaurantList.addEventListener("pointermove", (event) => {
  if (!restaurantLongPressOrigin || event.pointerId !== restaurantLongPressOrigin.pointerId) return;
  if (moveCancelsRestaurantLongPress(event)) clearRestaurantLongPress();
});

els.restaurantList.addEventListener("pointerup", (event) => {
  if (restaurantLongPressOrigin?.pointerId === event.pointerId) clearRestaurantLongPress();
});

els.restaurantList.addEventListener("pointercancel", (event) => {
  if (restaurantLongPressOrigin?.pointerId === event.pointerId) clearRestaurantLongPress();
});

els.restaurantList.addEventListener("contextmenu", (event) => {
  const row = event.target.closest(".restaurant-row");
  if (!row || !isWantToGoVisible()) return;
  event.preventDefault();
  suppressRestaurantRowClick = true;
  openPlaceActionMenu(row.dataset.id);
});

els.restaurantList.addEventListener("click", (event) => {
  if (suppressRestaurantRowClick) {
    suppressRestaurantRowClick = false;
    return;
  }
  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget?.dataset.action === "toggle-want") {
    void toggleWantToGo(actionTarget.dataset.restaurantId);
    return;
  }
  if (actionTarget?.dataset.action === "manage-place-playlists") {
    openRestaurantModal(actionTarget.dataset.restaurantId);
    return;
  }
  const row = event.target.closest(".restaurant-row");
  if (!row) return;
  mobileListScrollY = window.scrollY;
  state.selectedId = row.dataset.id;
  state.mobileDetailOpen = window.innerWidth <= 980;
  updatePlaceUrl(state.selectedId);
  render();
  if (window.innerWidth <= 980) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
      els.detailPanel.focus({ preventScroll: true });
    });
  }
});
els.restaurantList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (event.target.closest("[data-action]")) return;
  const row = event.target.closest(".restaurant-row");
  if (!row) return;
  event.preventDefault();
  row.click();
});

els.detailPanel.addEventListener("click", (event) => {
  if (suppressDetailPanelClick) {
    suppressDetailPanelClick = false;
    return;
  }
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
  if (action === "back-to-list") {
    closeMobileDetail();
  }
  if (action === "toggle-want") void toggleWantToGo(target.dataset.restaurantId);
  if (action === "manage-place-playlists") openRestaurantModal(currentRestaurant()?.id);
  if (action === "add-dish") openDishModal();
  if (action === "edit-dish") openDishModal(target.dataset.dishId);
  if (action === "write-dish-review") openDishReviewModal(target.dataset.dishId);
  if (action === "open-dish-reviews") openDishReviewsSheet(target.dataset.dishId);
  if (action === "set-cover-photo") void setRestaurantCoverPhoto(target.dataset.photoId);
  if (action === "delete-restaurant-photo") deleteRestaurantPhoto(target.dataset.photoId);
  if (action === "open-photo") openPhotoLightbox(target.dataset.photoSrc);
  if (action === "remove-rating") removeRating(target.dataset.email);
  if (action === "remove-dish-rating") removeDishRating(target.dataset.dishId, target.dataset.email);
});

els.detailPanel.addEventListener("change", (event) => {
  if (event.target.id !== "restaurantPhotoInput") return;
  addRestaurantPhotos(Array.from(event.target.files ?? []));
  event.target.value = "";
});

els.dishPhotoInput.addEventListener("change", () => {
  void handleDishPhotoFile(els.dishPhotoInput.files[0]);
});
els.dishCameraInput.addEventListener("change", () => {
  void handleDishPhotoFile(els.dishCameraInput.files[0]);
});
els.photoPreview.addEventListener("click", (event) => {
  const action = event.target.closest("[data-photo-action]")?.dataset.photoAction;
  if (action === "change") {
    els.dishPhotoInput.click();
    return;
  }
  if (action === "remove") {
    state.pendingPhoto = state.originalDishPhoto;
    state.pendingPhotoFile = null;
    els.dishPhotoInput.value = "";
    els.dishCameraInput.value = "";
    renderPhotoPreview();
    saveDishDraft();
  }
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
