const STORAGE_KEY = "plate-log-data-v1";
const CLOUD_CACHE_KEY = "plate-log-cloud-cache-v1";
const PHOTO_BUCKET = "plate-photos";
const PRODUCTION_URL = "https://food.danyhanna.uk";
const SUPERUSER_EMAIL = "danielhanna0001@gmail.com";
const FILTER_PREFS_KEY = "plate-log-filters-v1";

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

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark-theme");
  localStorage.setItem("plate-log-theme", isDark ? "dark" : "light");
}

const seedData = [
  {
    id: crypto.randomUUID(),
    name: "Silkroad",
    location: "Maadi",
    cuisine: "Chinese",
    price: "$$",
    rating: 4.5,
    maps: "https://maps.app.goo.gl/",
    notes: "Reliable comfort order. Great for noodles and tofu skins.",
    visited: ["Dany", "Mina"],
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
    rating: 4,
    maps: "",
    notes: "Good for groups.",
    visited: ["Dany", "Mina", "Paul"],
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
    rating: 5,
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
  const url = new URL(window.location.href);
  const { code, error, errorCode, errorDescription } = authParamsFromUrl(url);
  const hasAuthParams =
    Boolean(code || error || errorDescription) ||
    url.hash.includes("access_token") ||
    url.hash.includes("error=");

  if (!hasAuthParams) return { error: null, errorCode: null };

  const message = friendlyAuthError(errorDescription || error, errorCode);
  return { error: message, errorCode };
}

function getOAuthCodeFromUrl() {
  return authParamsFromUrl().code;
}

function hasOAuthCallbackInUrl() {
  const url = new URL(window.location.href);
  const { code, error, errorDescription } = authParamsFromUrl(url);
  return Boolean(code || error || errorDescription);
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
  checkingAccess: false
};

let initialLoadDone = false;
let authBootDone = false;
let remoteLoadInFlight = false;
let realtimeChannel = null;
let toastTimer = null;

const els = {
  restaurantList: document.querySelector("#restaurantList"),
  detailPanel: document.querySelector("#detailPanel"),
  searchInput: document.querySelector("#searchInput"),
  locationFilter: document.querySelector("#locationFilter"),
  cuisineFilter: document.querySelector("#cuisineFilter"),
  priceFilter: document.querySelector("#priceFilter"),
  ratingFilter: document.querySelector("#ratingFilter"),
  restaurantCount: document.querySelector("#restaurantCount"),
  dishCount: document.querySelector("#dishCount"),
  avgRating: document.querySelector("#avgRating"),
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
  visitedPicker: document.querySelector("#visitedPicker"),
  likedByPicker: document.querySelector("#likedByPicker"),
  toast: document.querySelector("#toast")
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

function requireEditor() {
  if (!canUseSupabase) return true;

  if (!state.session) {
    setSync("Sign in needed", "Viewing is public. Sign in to request editing access.");
    els.emailInput.focus();
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

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function ratingWidth(rating) {
  return `${Math.max(0, Math.min(Number(rating) || 0, 5)) * 20}%`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
      sort: state.sort
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
    if (prefs.sort) state.sort = prefs.sort;
    document.querySelectorAll("[data-sort]").forEach((button) => {
      button.classList.toggle("active", button.dataset.sort === state.sort);
    });
  } catch {
    // Ignore corrupt prefs.
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

function renderPeoplePicker(container, selected, hiddenInput) {
  if (!container || !hiddenInput) return;

  const selectedSet = new Set(selected);
  const known = getKnownPeople();
  for (const name of selected) {
    if (name) known.push(name);
  }
  const options = [...new Set(known)].sort((a, b) => a.localeCompare(b));

  container.innerHTML = `
    <div class="chip-picker">
      ${options
        .map(
          (name) => `
        <button type="button" class="chip-button picker-chip ${selectedSet.has(name) ? "active" : ""}" data-name="${escapeHtml(name)}">
          ${escapeHtml(name)}
        </button>`
        )
        .join("")}
      <input class="people-add-input" type="text" placeholder="Add name, Enter" autocomplete="off" />
    </div>
  `;

  hiddenInput.value = [...selectedSet].join(", ");

  container.querySelectorAll(".picker-chip").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.name;
      if (selectedSet.has(name)) selectedSet.delete(name);
      else selectedSet.add(name);
      renderPeoplePicker(container, [...selectedSet], hiddenInput);
    });
  });

  const addInput = container.querySelector(".people-add-input");
  addInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const name = addInput.value.trim();
    if (!name) return;
    selectedSet.add(name);
    addInput.value = "";
    renderPeoplePicker(container, [...selectedSet], hiddenInput);
  });
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
    price: restaurant.price,
    rating: Number(restaurant.rating),
    maps: restaurant.maps,
    notes: restaurant.notes,
    visited: restaurant.visited ?? [],
    updated_at: new Date().toISOString()
  };
  const by = editorEmail();
  if (by) row.updated_by = by;
  return row;
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
  const by = editorEmail();
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
      .select("id,name,location,cuisine,price,rating,maps,notes,visited,updated_at,updated_by,restaurant_photos(id,photo_path,created_at),dishes(id,name,rating,liked_by,notes,photo_path,updated_at,updated_by)")
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
        price: restaurant.price,
        rating: Number(restaurant.rating),
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

  const filtered = state.data.filter((restaurant) => {
    const dishText = restaurant.dishes.map((dish) => `${dish.name} ${dish.notes}`).join(" ");
    const searchText = `${restaurant.name} ${restaurant.location} ${restaurant.cuisine} ${restaurant.notes} ${dishText}`.toLowerCase();
    return (
      (!query || searchText.includes(query)) &&
      (location === "all" || restaurant.location === location) &&
      (cuisine === "all" || restaurant.cuisine === cuisine) &&
      (price === "all" || restaurant.price === price) &&
      Number(restaurant.rating) >= minRating
    );
  });

  return filtered.sort((a, b) => {
    if (state.sort === "rating") return Number(b.rating) - Number(a.rating);
    if (state.sort === "name") return a.name.localeCompare(b.name);
    return Number(b.updatedAt) - Number(a.updatedAt);
  });
}

function renderFilters() {
  const locationOptions = uniqueValues("location");
  const cuisineOptions = uniqueValues("cuisine");
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

function renderRestaurantOptionSelect(select, options, placeholder) {
  const current = select.value;
  select.innerHTML = [
    `<option value="" disabled>${placeholder}</option>`,
    ...options.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
    `<option value="__new">+ Add new...</option>`
  ].join("");
  select.value = options.includes(current) || current === "__new" ? current : "";
}

function getRestaurantOption(select, input) {
  return select.value === "__new" ? input.value.trim() : select.value.trim();
}

function setRestaurantOption(select, input, key, value) {
  const options = uniqueValues(key);
  renderRestaurantOptionSelect(select, options, key === "location" ? "Select location" : "Select cuisine");

  if (!value) {
    select.value = "";
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
  input.required = true;
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
  const avg = state.data.length ? state.data.reduce((sum, item) => sum + Number(item.rating), 0) / state.data.length : 0;

  els.restaurantCount.textContent = state.data.length;
  els.dishCount.textContent = dishes.length;
  els.avgRating.textContent = avg ? avg.toFixed(1) : "0";
}

function renderAuth() {
  els.authForm.hidden = !canUseSupabase || Boolean(state.session);
  els.googleSignInButton.hidden = !canUseSupabase || Boolean(state.session);
  els.authDivider.hidden = !canUseSupabase || Boolean(state.session);
  els.signOutButton.hidden = !canUseSupabase || !state.session;
  els.ownerActions.hidden = !isSuperuser();
  document.querySelector("#quickAddButton").textContent = !canUseSupabase || state.canEdit ? "+ Add place" : "Sign in to edit";

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
              <span class="pill location">${escapeHtml(restaurant.location)}</span>
              <span class="pill cuisine">${escapeHtml(restaurant.cuisine)}</span>
              <span class="pill price">${escapeHtml(restaurant.price)}</span>
            </div>
          </div>
          <div class="rating-badge">${escapeHtml(restaurant.rating)}</div>
        </button>`
    )
    .join("");
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
    ? `<p class="updated-by-line">Last updated by ${escapeHtml(restaurant.updatedBy)}</p>`
    : "";

  els.detailPanel.innerHTML = `
    <div class="detail-title">
      <div>
        <p class="eyebrow">${escapeHtml(restaurant.cuisine)}</p>
        <h2>${escapeHtml(restaurant.name)}</h2>
        <div class="tag-row">
          <span class="pill location">${escapeHtml(restaurant.location)}</span>
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
        <span>Restaurant rating</span>
        <strong>${escapeHtml(restaurant.rating)} / 5</strong>
        <div class="rating-line"><i style="width:${ratingWidth(restaurant.rating)}"></i></div>
      </div>
      <div class="info-tile">
        <span>Dishes logged</span>
        <strong>${restaurant.dishes.length}</strong>
        <div class="rating-line"><i style="width:${Math.min(restaurant.dishes.length * 18, 100)}%"></i></div>
      </div>
    </div>

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
  renderList();
  renderDetail();
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
  els.priceInput.value = restaurant?.price ?? "$$";
  els.ratingInput.value = restaurant?.rating ?? 4;
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
  const payload = {
    name: els.nameInput.value.trim(),
    location: getRestaurantOption(els.locationSelect, els.locationInput),
    cuisine: getRestaurantOption(els.cuisineSelect, els.cuisineInput),
    price: els.priceInput.value,
    rating: Number(els.ratingInput.value),
    maps: normalizeUrl(els.mapsInput.value),
    notes: els.notesInput.value.trim(),
    visited: parseVisited(els.visitedInput.value),
    updatedAt: Date.now()
  };

  try {
    if (state.remoteReady) {
      const id = await saveRestaurantRemote(restaurantToRow(payload), existing?.id);
      state.selectedId = id;
      await loadRemoteData();
    } else if (existing) {
      Object.assign(existing, payload);
      saveLocalData();
    } else {
      const restaurant = {
        id: crypto.randomUUID(),
        ...payload,
        photos: [],
        dishes: []
      };
      state.data.unshift(restaurant);
      state.selectedId = restaurant.id;
      saveLocalData();
    }

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
  els.dishRatingInput.value = dish?.rating ?? 4;
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
    displayName: meta.full_name || meta.name || "",
    provider: session.user.app_metadata?.provider || session.user.identities?.[0]?.provider || ""
  };
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
}

async function clearPendingApproval(email) {
  if (!client || !email) return;
  await client.from("pending_approvals").delete().eq("email", email.toLowerCase());
}

async function loadAdminData() {
  if (!client || !isSuperuser()) return;

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
      return `
        <li>
          <span>${escapeHtml(row.email)}${row.note ? ` · ${escapeHtml(row.note)}` : ""}</span>
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
    // detectSessionInUrl exchanges the PKCE code on getSession (needs code still in URL).
    const { data, error: sessionError } = await withTimeout(
      client.auth.getSession(),
      20000,
      "Google sign-in timed out. Please try again."
    );
    if (sessionError) throw sessionError;
    if (data.session) return data.session;

    const { data: exchanged, error: exchangeError } = await withTimeout(
      client.auth.exchangeCodeForSession(code),
      12000,
      "Google sign-in timed out. Please try again."
    );
    if (exchangeError) throw exchangeError;
    if (exchanged.session) return exchanged.session;

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
els.mobileSignInButton?.addEventListener("click", () => {
  document.querySelector("#syncPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  els.emailInput?.focus();
});
window.addEventListener("resize", render);

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

[els.searchInput, els.locationFilter, els.cuisineFilter, els.priceFilter, els.ratingFilter].forEach((input) => {
  input.addEventListener("input", () => {
    saveFilterPrefs();
    render();
  });
});

document.querySelectorAll("[data-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    state.sort = button.dataset.sort;
    document.querySelectorAll("[data-sort]").forEach((item) => item.classList.toggle("active", item === button));
    saveFilterPrefs();
    render();
  });
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
  const action = event.target.dataset.action;
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
  if (action === "edit-dish") openDishModal(event.target.dataset.dishId);
  if (action === "delete-restaurant-photo") deleteRestaurantPhoto(event.target.dataset.photoId);
  if (action === "open-photo") openPhotoLightbox(event.target.dataset.photoSrc);
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

boot();
