const STORAGE_KEY = "plate-log-data-v1";
const PHOTO_BUCKET = "plate-photos";

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
    dishes: [{ id: crypto.randomUUID(), name: "Hand pulled noodles", rating: 5, likedBy: ["Dany"], notes: "Worth crossing town for.", photo: "", photoPath: "" }]
  }
];

const config = window.PLATE_LOG_CONFIG ?? {};
const canUseSupabase = Boolean(config.supabaseUrl && config.supabasePublishableKey && window.supabase);
const client = canUseSupabase ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey) : null;

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
  loading: false
};

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
  authForm: document.querySelector("#authForm"),
  emailInput: document.querySelector("#emailInput"),
  signOutButton: document.querySelector("#signOutButton"),
  restaurantModal: document.querySelector("#restaurantModal"),
  restaurantForm: document.querySelector("#restaurantForm"),
  modalEyebrow: document.querySelector("#modalEyebrow"),
  modalTitle: document.querySelector("#modalTitle"),
  nameInput: document.querySelector("#nameInput"),
  locationInput: document.querySelector("#locationInput"),
  cuisineInput: document.querySelector("#cuisineInput"),
  priceInput: document.querySelector("#priceInput"),
  ratingInput: document.querySelector("#ratingInput"),
  mapsInput: document.querySelector("#mapsInput"),
  notesInput: document.querySelector("#notesInput"),
  deleteRestaurantButton: document.querySelector("#deleteRestaurantButton"),
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
  importInput: document.querySelector("#importInput")
};

state.selectedId = state.data[0]?.id ?? null;

function loadLocalData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return seedData;

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : seedData;
  } catch {
    return seedData;
  }
}

function saveLocalData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
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
    setSync("Waiting for approval", "You are signed in, but this account is not approved to edit yet.");
    return false;
  }

  return true;
}

function uniqueValues(key) {
  return [...new Set(state.data.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
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
  return value
    .split(",")
    .map((person) => person.trim())
    .filter(Boolean);
}

function toMillis(value) {
  if (!value) return Date.now();
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}

function currentRestaurant() {
  return state.data.find((restaurant) => restaurant.id === state.selectedId) ?? state.data[0] ?? null;
}

function restaurantToRow(restaurant) {
  return {
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
}

function dishToRow(dish, restaurantId, photoPath = dish.photoPath ?? "") {
  return {
    restaurant_id: restaurantId,
    name: dish.name,
    rating: Number(dish.rating),
    liked_by: dish.likedBy ?? [],
    notes: dish.notes,
    photo_path: photoPath,
    updated_at: new Date().toISOString()
  };
}

function publicPhotoUrl(path) {
  if (!client || !path) return "";
  return client.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function loadRemoteData() {
  state.loading = true;
  render();

  const { data, error } = await client
    .from("restaurants")
    .select("id,name,location,cuisine,price,rating,maps,notes,visited,updated_at,dishes(id,name,rating,liked_by,notes,photo_path,updated_at)")
    .order("updated_at", { ascending: false });

  if (error) {
    setSync("Cloud error", error.message);
    state.loading = false;
    render();
    return;
  }

  state.data = await Promise.all(
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
      updatedAt: toMillis(restaurant.updated_at),
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
            updatedAt: toMillis(dish.updated_at)
          }))
      )
    }))
  );

  state.selectedId = state.data.some((item) => item.id === state.selectedId) ? state.selectedId : state.data[0]?.id ?? null;
  state.loading = false;
  state.remoteReady = true;
  render();
}

async function uploadDishPhoto(file, existingPath = "") {
  if (!client || !state.session || !file) return existingPath;

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${state.session.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false
  });

  if (error) throw error;

  if (existingPath) {
    await client.storage.from(PHOTO_BUCKET).remove([existingPath]);
  }

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

  document.querySelector("#locationOptions").innerHTML = locationOptions.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
  document.querySelector("#cuisineOptions").innerHTML = cuisineOptions.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
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
  els.signOutButton.hidden = !canUseSupabase || !state.session;
  document.querySelector("#quickAddButton").textContent = !canUseSupabase || state.canEdit ? "+ Add place" : "Sign in to edit";
  document.querySelector("#mobileAddButton").textContent = !canUseSupabase || state.canEdit ? "+" : "Lock";

  if (!canUseSupabase) {
    setSync("Local only", "Cloud sync will turn on after Supabase config is deployed.");
    return;
  }

  if (!state.session) {
    setSync("Public view", "Anyone can view. Sign in to edit once approved.");
    return;
  }

  if (!state.canEdit) {
    setSync("Waiting for approval", `${state.session.user.email} can view, but cannot edit yet.`);
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
    els.restaurantList.innerHTML = `<div class="empty-state">Loading your food log...</div>`;
    return;
  }

  if (!restaurants.length) {
    els.restaurantList.innerHTML = `<div class="empty-state">No places match those filters.</div>`;
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
    els.detailPanel.innerHTML = `<div class="empty-state">Getting everything from Supabase...</div>`;
    return;
  }

  if (!restaurant) {
    els.detailPanel.innerHTML = `<div class="empty-state">Add your first restaurant to start building the log.</div>`;
    return;
  }

  const mapsLink = restaurant.maps
    ? `<a class="secondary-action" href="${escapeHtml(restaurant.maps)}" target="_blank" rel="noreferrer">Map</a>`
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
        ${state.canEdit || !canUseSupabase ? `<button class="secondary-action" type="button" data-action="edit-restaurant">Edit</button>` : ""}
      </div>
    </div>

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

function renderDish(dish) {
  const photo = dish.photo
    ? `<img class="dish-photo" src="${dish.photo}" alt="${escapeHtml(dish.name)}" />`
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
  els.locationInput.value = restaurant?.location ?? "";
  els.cuisineInput.value = restaurant?.cuisine ?? "";
  els.priceInput.value = restaurant?.price ?? "$$";
  els.ratingInput.value = restaurant?.rating ?? 4;
  els.mapsInput.value = restaurant?.maps ?? "";
  els.notesInput.value = restaurant?.notes ?? "";
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
    location: els.locationInput.value.trim(),
    cuisine: els.cuisineInput.value.trim(),
    price: els.priceInput.value,
    rating: Number(els.ratingInput.value),
    maps: els.mapsInput.value.trim(),
    notes: els.notesInput.value.trim(),
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
        visited: [],
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
  els.dishLikedByInput.value = dish?.likedBy.join(", ") ?? "";
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
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plate-log-export.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed)) throw new Error("Import must be an array");
      state.data = parsed;
      state.selectedId = state.data[0]?.id ?? null;
      saveLocalData();
      render();
    } catch {
      alert("That file does not look like a Plate Log export.");
    }
  };
  reader.readAsText(file);
}

async function signIn(event) {
  event.preventDefault();
  if (!client) return;

  const email = els.emailInput.value.trim();
  setSync("Sending login link", `Sending a magic link to ${email}...`);
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  if (error) {
    alert(error.message);
    return;
  }

  setSync("Check your email", `A login link was sent to ${email}.`);
  els.authForm.reset();
}

async function signOut() {
  if (!client) return;
  await client.auth.signOut();
  state.session = null;
  state.canEdit = false;
  await loadRemoteData();
}

async function refreshAccess(session) {
  state.session = session;
  state.canEdit = false;

  if (!client || !session?.user?.email) return;

  const email = session.user.email.toLowerCase();
  const { data, error } = await client.from("approved_users").select("email").eq("email", email).maybeSingle();

  if (error) {
    setSync("Approval check failed", error.message);
    return;
  }

  state.canEdit = Boolean(data);
  render();
}

async function boot() {
  if (!canUseSupabase) {
    render();
    return;
  }

  const { data } = await client.auth.getSession();
  await refreshAccess(data.session);

  client.auth.onAuthStateChange(async (_event, session) => {
    await refreshAccess(session);
    await loadRemoteData();
  });

  await loadRemoteData();
}

document.querySelector("#quickAddButton").addEventListener("click", () => openRestaurantModal());
document.querySelector("#mobileAddButton").addEventListener("click", () => openRestaurantModal());
document.querySelector("#exportButton").addEventListener("click", exportData);
document.querySelector("#closeRestaurantModal").addEventListener("click", closeRestaurantModal);
document.querySelector("#cancelRestaurantButton").addEventListener("click", closeRestaurantModal);
document.querySelector("#deleteRestaurantButton").addEventListener("click", deleteRestaurant);
document.querySelector("#closeDishModal").addEventListener("click", closeDishModal);
document.querySelector("#cancelDishButton").addEventListener("click", closeDishModal);
document.querySelector("#deleteDishButton").addEventListener("click", deleteDish);
els.authForm.addEventListener("submit", signIn);
els.signOutButton.addEventListener("click", signOut);

els.restaurantForm.addEventListener("submit", saveRestaurant);
els.dishForm.addEventListener("submit", saveDish);

[els.searchInput, els.locationFilter, els.cuisineFilter, els.priceFilter, els.ratingFilter].forEach((input) => {
  input.addEventListener("input", render);
});

document.querySelectorAll("[data-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    state.sort = button.dataset.sort;
    document.querySelectorAll("[data-sort]").forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

els.restaurantList.addEventListener("click", (event) => {
  const row = event.target.closest(".restaurant-row");
  if (!row) return;
  state.selectedId = row.dataset.id;
  render();
  if (window.innerWidth <= 980) {
    els.detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

els.detailPanel.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  if (action === "edit-restaurant") openRestaurantModal(currentRestaurant()?.id);
  if (action === "add-dish") openDishModal();
  if (action === "edit-dish") openDishModal(event.target.dataset.dishId);
});

els.dishPhotoInput.addEventListener("change", () => {
  const file = els.dishPhotoInput.files[0];
  if (!file) return;
  state.pendingPhotoFile = file;
  const reader = new FileReader();
  reader.onload = () => {
    state.pendingPhoto = String(reader.result);
    renderPhotoPreview();
  };
  reader.readAsDataURL(file);
});

els.importInput.addEventListener("change", () => {
  const file = els.importInput.files[0];
  if (file) importData(file);
  els.importInput.value = "";
});

boot();
