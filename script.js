(() => {
  "use strict";

  const STORAGE_KEYS = {
    events: "chapter-co-events-v1",
    saved: "chapter-co-saved-v1"
  };
  const ALLOWED_TYPES = new Set(["author", "book-club", "workshop", "community"]);
  const $ = (selector, root = document) => root.querySelector(selector);
  const grid = $("#event-grid");
  const loading = $("#loading-state");
  const emptyState = $("#empty-state");
  const searchInput = $("#search-input");
  const categoryFilter = $("#category-filter");
  const dateFilter = $("#date-filter");
  const resultsSummary = $("#results-summary");
  const countNumber = $("#event-count-number");
  const form = $("#event-form");
  const formFeedback = $("#form-feedback");
  const submitButton = $("#submit-event");
  const cancelEditButton = $("#cancel-edit-button");
  const toast = $("#toast");
  const formTitle = $(".form-header h3");
  const formEyebrow = $(".form-header .eyebrow");
  let allEvents = [];
  let savedIds = new Set();
  let toastTimer = 0;
  let pendingUndo = null;
  let editingId = null;
  let storageAvailable = true;

  const seedEvents = [
    {
      id: "seed-01",
      title: "An Evening with the Author",
      type: "author",
      bookstore: "The Paper Lantern",
      location: "Old Town",
      date: dateOffset(2),
      time: "18:30",
      description: "A warm conversation about the stories behind the pages, the writing ritual, and finding inspiration in everyday life.",
      featured: "A",
      seeded: true
    },
    {
      id: "seed-02",
      title: "The Sunday Reading Room",
      type: "book-club",
      bookstore: "Common Ground Books",
      location: "Riverside",
      date: dateOffset(4),
      time: "11:00",
      description: "Bring the book you cannot stop thinking about. Share a favourite passage, listen to other readers, and leave with your next read.",
      featured: "B",
      seeded: true
    },
    {
      id: "seed-03",
      title: "Make a Tiny Zine",
      type: "workshop",
      bookstore: "The Reading Nook",
      location: "Arts District",
      date: dateOffset(6),
      time: "15:00",
      description: "A hands-on afternoon of folding, drawing, and storytelling. All materials are provided, and beginners are very welcome.",
      featured: "✳",
      seeded: true
    },
    {
      id: "seed-04",
      title: "Poetry After Hours",
      type: "community",
      bookstore: "The Paper Lantern",
      location: "Old Town",
      date: dateOffset(9),
      time: "19:00",
      description: "An open-mic gathering for poems in progress, favourite lines, and new voices. Listening quietly is just as welcome as reading.",
      featured: "“",
      seeded: true
    },
    {
      id: "seed-05",
      title: "Mystery Readers' Circle",
      type: "book-club",
      bookstore: "Ink & Elsewhere",
      location: "Market Quarter",
      date: dateOffset(13),
      time: "17:30",
      description: "Trade theories, discuss unreliable narrators, and try to solve the case before the final chapter gives it all away.",
      featured: "?",
      seeded: true
    },
    {
      id: "seed-06",
      title: "A Beginner's Guide to Journaling",
      type: "workshop",
      bookstore: "Common Ground Books",
      location: "Riverside",
      date: dateOffset(20),
      time: "10:30",
      description: "Make space for your thoughts with gentle prompts and practical ideas. Bring a notebook, or simply bring your curiosity.",
      featured: "✎",
      seeded: true
    }
  ];

  function dateOffset(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  // Normalize and strip markup/control characters before text enters application state. Rendering uses textContent, never user-controlled innerHTML.
  function safeText(value, maxLength = 300) {
    return String(value ?? "")
      .normalize("NFKC")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, maxLength);
  }

  function isRealDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function validEvent(event) {
    return Boolean(event && typeof event === "object" &&
      typeof event.id === "string" && event.id.length > 0 &&
      typeof event.title === "string" && event.title.length >= 2 && event.title.length <= 80 &&
      ALLOWED_TYPES.has(event.type) &&
      typeof event.bookstore === "string" && event.bookstore.length >= 2 && event.bookstore.length <= 80 &&
      typeof event.location === "string" && event.location.length >= 2 && event.location.length <= 100 &&
      isRealDate(event.date) &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(event.time) &&
      typeof event.description === "string" && event.description.length >= 10 && event.description.length <= 300);
  }

  function normalizeEvent(event) {
    return {
      id: safeText(event.id, 100),
      title: safeText(event.title, 80),
      type: event.type,
      bookstore: safeText(event.bookstore, 80),
      location: safeText(event.location, 100),
      date: event.date,
      time: event.time,
      description: safeText(event.description, 300),
      featured: iconFor(event.type),
      seeded: Boolean(event.seeded)
    };
  }

  function readStoredEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.events);
      if (raw === null) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("Stored event data is not a list.");
      return parsed.filter(validEvent).map(normalizeEvent);
    } catch (error) {
      storageAvailable = false;
      console.warn("[Events] Saved event data could not be read. Sample events loaded instead.", error);
      showToast("Saved data could not be read. The sample calendar is shown; avoid saving until storage is checked.");
      return null;
    }
  }

  function persistEvents() {
    try {
      localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(allEvents));
      storageAvailable = true;
      return true;
    } catch (error) {
      storageAvailable = false;
      console.warn("[Events] Browser storage is unavailable; changes are session-only.", error);
      showToast("Browser storage is unavailable. Changes may not persist after refresh.");
      return false;
    }
  }

  function readSavedIds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.saved) || "[]");
      return Array.isArray(parsed) ? parsed.filter(id => typeof id === "string") : [];
    } catch {
      return [];
    }
  }

  function persistSavedIds() {
    try { localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify([...savedIds])); }
    catch (error) {
      console.warn("[Events] Favourites could not be saved.", error);
      showToast("Your saved-event preference could not be stored in this browser.");
    }
  }

  function analytics(action) {
    console.info(`[Analytics] User interacted with Independent Bookstore Events Page — ${action}`);
  }

  function showToast(message, undoAction = null) {
    window.clearTimeout(toastTimer);
    pendingUndo = undoAction;
    toast.replaceChildren();
    const text = document.createElement("span");
    text.textContent = message;
    toast.append(text);
    if (undoAction) {
      const undo = document.createElement("button");
      undo.type = "button";
      undo.className = "toast-undo";
      undo.textContent = "Undo";
      undo.addEventListener("click", () => {
        const action = pendingUndo;
        pendingUndo = null;
        if (action) action();
        toast.hidden = true;
      });
      toast.append(undo);
    }
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
      pendingUndo = null;
    }, 6000);
  }

  function categoryName(type) {
    return ({ author: "Author talk", "book-club": "Book club", workshop: "Workshop", community: "Community" })[type] || "Community";
  }

  function formatDate(dateString, options = { weekday: "short", month: "short", day: "numeric" }) {
    const [year, month, day] = String(dateString).split("-").map(Number);
    const date = new Date(year, month - 1, day, 12);
    if (Number.isNaN(date.getTime())) return "Date to be confirmed";
    return new Intl.DateTimeFormat("en", options).format(date);
  }

  function formatTime(timeString) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(timeString))) return "Time to be confirmed";
    const [hour, minute] = timeString.split(":").map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
  }

  function iconFor(type) {
    return ({ author: "A", "book-club": "B", workshop: "✳", community: "“" })[type] || "C";
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makeAction(label, className, handler, ariaLabel) {
    const button = createElement("button", className, label);
    button.type = "button";
    button.setAttribute("aria-label", ariaLabel);
    button.addEventListener("click", handler);
    return button;
  }

  function buildEventCard(event, index) {
    const article = createElement("article", "event-card");
    article.dataset.eventId = event.id;
    const visual = createElement("div", `card-visual visual-${(index % 6) + 1}`);
    visual.setAttribute("aria-hidden", "true");
    visual.append(createElement("span", "category-label", categoryName(event.type)));
    visual.append(createElement("span", "card-symbol", iconFor(event.type)));

    const body = createElement("div", "card-body");
    const date = createElement("div", "card-date");
    date.append(createElement("span", "date-dot"));
    date.append(document.createTextNode(`${formatDate(event.date)} · ${formatTime(event.time)}`));
    const title = createElement("h3", "", event.title);
    const description = createElement("p", "card-description", event.description);
    const meta = createElement("div", "card-meta");
    const venue = createElement("span");
    venue.append(createElement("b", "", "⌂"), document.createTextNode(`${event.bookstore} · ${event.location}`));
    const type = createElement("span");
    type.append(createElement("b", "", "↗"), document.createTextNode(categoryName(event.type)));
    meta.append(venue, type);

    const actions = createElement("div", "card-actions");
    const details = makeAction("View details ↗", "details-button", () => {
      analytics("event details opened");
      showToast(`${event.title} — ${formatDate(event.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at ${formatTime(event.time)}. Contact ${event.bookstore} to confirm details.`);
    }, `View details for ${event.title}`);

    const save = makeAction(savedIds.has(event.id) ? "♥ Saved" : "♡ Save", "save-button", () => toggleSaved(event.id),
      `${savedIds.has(event.id) ? "Unsave" : "Save"} ${event.title}`);
    save.setAttribute("aria-pressed", String(savedIds.has(event.id)));

    const manage = createElement("div", "event-manage-actions");
    if (window.chapterCoCanManageEvents === true) {
      const edit = makeAction("Edit", "edit-event-button", () => startEdit(event.id), `Edit ${event.title}`);
      const remove = makeAction("Delete", "delete-event-button", () => deleteEvent(event.id), `Delete ${event.title}`);
      manage.append(edit, remove);
    }
    actions.append(details, save);
    body.append(date, title, description, meta, actions);
    if (window.chapterCoCanManageEvents === true) body.append(manage);
    article.append(visual, body);
    return article;
  }

  function getFilteredEvents() {
    const query = safeText(searchInput.value, 100).toLocaleLowerCase();
    const category = categoryFilter.value;
    const dateRange = dateFilter.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    if (dateRange === "week") maxDate.setDate(maxDate.getDate() + 7);
    if (dateRange === "month") maxDate.setDate(maxDate.getDate() + 30);

    return allEvents.filter(event => {
      const searchable = [event.title, event.bookstore, event.location, event.description, categoryName(event.type)].join(" ").toLocaleLowerCase();
      if (query && !searchable.includes(query)) return false;
      if (category !== "all" && event.type !== category) return false;
      if (dateRange !== "all") {
        const [year, month, day] = event.date.split("-").map(Number);
        const eventDate = new Date(year, month - 1, day);
        if (eventDate < today || eventDate > maxDate) return false;
      }
      return true;
    }).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  }

  function renderEvents() {
    const filtered = getFilteredEvents();
    grid.replaceChildren();
    filtered.forEach((event, index) => grid.append(buildEventCard(event, index)));
    grid.hidden = filtered.length === 0;
    emptyState.hidden = filtered.length !== 0;
    countNumber.textContent = String(filtered.length).padStart(2, "0");
    resultsSummary.textContent = filtered.length === 0
      ? "No matching events. Try changing your search or filters."
      : `Showing ${filtered.length} ${filtered.length === 1 ? "event" : "events"}`;
    grid.setAttribute("aria-busy", "false");
  }

  function showLoading(message = "Saving your changes…") {
    loading.hidden = false;
    const label = loading.querySelector("span:last-child");
    if (label) label.textContent = message;
    grid.setAttribute("aria-busy", "true");
  }

  function hideLoading() {
    loading.hidden = true;
    renderEvents();
  }

  function loadEvents() {
    showLoading("Loading the event calendar…");
    grid.hidden = true;
    window.setTimeout(() => {
      const stored = readStoredEvents();
      allEvents = stored === null ? seedEvents.map(normalizeEvent) : stored;
      savedIds = new Set(readSavedIds());
      hideLoading();
    }, 250);
  }

  function toggleSaved(id) {
    if (savedIds.has(id)) savedIds.delete(id);
    else savedIds.add(id);
    persistSavedIds();
    analytics("event saved state changed");
    renderEvents();
    showToast(savedIds.has(id) ? "Event saved to your favourites." : "Event removed from your favourites.");
  }

  function clearErrors() {
    form.querySelectorAll("[aria-invalid='true']").forEach(field => {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    });
    form.querySelectorAll(".field-error").forEach(error => { error.textContent = ""; });
    formFeedback.textContent = "";
  }

  function setError(field, message, errorId) {
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", errorId);
    const error = document.getElementById(errorId);
    if (error) error.textContent = message;
  }

  function validateForm(data) {
    const rules = [
      { field: $("#event-title"), value: data.title, id: "title-error", message: "Enter a title of 2–80 characters.", valid: value => value.length >= 2 && value.length <= 80 },
      { field: $("#event-type"), value: data.type, id: "type-error", message: "Choose an event type.", valid: value => ALLOWED_TYPES.has(value) },
      { field: $("#bookstore-name"), value: data.bookstore, id: "bookstore-error", message: "Enter a bookstore name of 2–80 characters.", valid: value => value.length >= 2 && value.length <= 80 },
      { field: $("#event-location"), value: data.location, id: "location-error", message: "Enter a location of 2–100 characters.", valid: value => value.length >= 2 && value.length <= 100 },
      { field: $("#event-date"), value: data.date, id: "date-error", message: "Choose today or a future date.", valid: value => isRealDate(value) && value >= dateOffset(0) },
      { field: $("#event-time"), value: data.time, id: "time-error", message: "Choose a valid start time.", valid: value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value) },
      { field: $("#event-description"), value: data.description, id: "description-error", message: "Write a description of 10–300 characters.", valid: value => value.length >= 10 && value.length <= 300 }
    ];
    let firstInvalid = null;
    rules.forEach(rule => {
      if (!rule.valid(rule.value)) {
        setError(rule.field, rule.message, rule.id);
        if (!firstInvalid) firstInvalid = rule.field;
      } else {
        rule.field.removeAttribute("aria-invalid");
        rule.field.removeAttribute("aria-describedby");
        document.getElementById(rule.id).textContent = "";
      }
    });
    if (firstInvalid) {
      firstInvalid.focus();
      formFeedback.style.color = "var(--error)";
      formFeedback.textContent = "Please correct the highlighted fields and try again.";
      return false;
    }
    return true;
  }

  function readFormData() {
    return {
      title: safeText($("#event-title").value, 80),
      type: $("#event-type").value,
      bookstore: safeText($("#bookstore-name").value, 80),
      location: safeText($("#event-location").value, 100),
      date: $("#event-date").value,
      time: $("#event-time").value,
      description: safeText($("#event-description").value, 300)
    };
  }

  function setFormMode(mode, event = null) {
    editingId = mode === "edit" && event ? event.id : null;
    if (formTitle) formTitle.textContent = editingId ? "Edit event details" : "Create an event";
    if (formEyebrow) formEyebrow.textContent = editingId ? "UPDATE EVENT" : "EVENT MANAGEMENT";
    submitButton.replaceChildren(document.createTextNode(editingId ? "Save changes " : "Save event "));
    submitButton.append(createElement("span", "", "→"));
    submitButton.disabled = false;
    cancelEditButton.hidden = !editingId;
    if (event) {
      $("#event-title").value = event.title;
      $("#event-type").value = event.type;
      $("#bookstore-name").value = event.bookstore;
      $("#event-location").value = event.location;
      $("#event-date").value = event.date;
      $("#event-time").value = event.time;
      $("#event-description").value = event.description;
    } else {
      form.reset();
    }
    clearErrors();
  }

  function startEdit(id) {
    const event = allEvents.find(item => item.id === id);
    if (!event) {
      showToast("That event could not be found. Refresh the calendar and try again.");
      return;
    }
    setFormMode("edit", event);
    analytics("event edit started");
    $("#host").scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => $("#event-title").focus(), 350);
  }

  function deleteEvent(id) {
    const index = allEvents.findIndex(item => item.id === id);
    if (index < 0) return;
    const event = allEvents[index];
    const confirmed = window.confirm(`Delete "${event.title}"?\n\nThis removes the event from this browser's calendar. You can undo this action for a few seconds.`);
    if (!confirmed) return;

    allEvents.splice(index, 1);
    savedIds.delete(id);
    persistEvents();
    persistSavedIds();
    analytics("event deleted");
    if (editingId === id) setFormMode("create");
    renderEvents();
    showToast(`Deleted “${event.title}”.`, () => {
      allEvents.splice(Math.min(index, allEvents.length), 0, event);
      persistEvents();
      renderEvents();
      analytics("event deletion undone");
      showToast("Event restored.");
    });
  }

  function submitEvent(event) {
    event.preventDefault();
    clearErrors();
    const data = readFormData();
    if (!validateForm(data)) {
      analytics("event form validation failed");
      return;
    }

    const isEditing = Boolean(editingId);
    const existing = isEditing ? allEvents.find(item => item.id === editingId) : null;
    if (isEditing && !existing) {
      showToast("The event no longer exists. Refresh and try again.");
      setFormMode("create");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = isEditing ? "Saving changes…" : "Creating event…";
    showLoading(isEditing ? "Updating the event…" : "Adding the event…");

    window.setTimeout(() => {
      if (isEditing) {
        const index = allEvents.findIndex(item => item.id === editingId);
        allEvents[index] = { ...existing, ...data, featured: iconFor(data.type) };
      } else {
        allEvents.push({ ...data, id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, featured: iconFor(data.type), seeded: false });
      }
      const persisted = persistEvents();
      searchInput.value = "";
      categoryFilter.value = "all";
      dateFilter.value = "all";
      setFormMode("create");
      formFeedback.style.color = "var(--success)";
      formFeedback.textContent = persisted
        ? (isEditing ? "Event updated and saved in this browser." : "Event created and saved in this browser.")
        : (isEditing ? "Event updated for this session only; browser storage is unavailable." : "Event created for this session only; browser storage is unavailable.");
      submitButton.disabled = false;
      hideLoading();
      analytics(isEditing ? "event updated" : "event created");
      showToast(isEditing ? "Event updated successfully." : "Event created successfully.");
      $("#events").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  }

  function resetFilters() {
    searchInput.value = "";
    categoryFilter.value = "all";
    dateFilter.value = "all";
    renderEvents();
    analytics("event filters reset");
  }

  function setupMobileNav() {
    const toggle = $("#menu-toggle");
    const nav = $("#primary-nav");
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
    }));
  }

  function setupRevealAnimations() {
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    const targets = document.querySelectorAll(".section-heading, .event-card, .manifesto-inner, .host-copy, .event-form, .trust-strip > div");
    targets.forEach(element => element.classList.add("reveal-on-scroll"));
    document.documentElement.classList.add("reveal-ready");
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -28px 0px" });
    targets.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
      observer.observe(element);
    });
  }

  function init() {
    $("#current-year").textContent = String(new Date().getFullYear());
    $("#event-date").min = dateOffset(0);
    form.addEventListener("submit", submitEvent);
    cancelEditButton.addEventListener("click", () => {
      setFormMode("create");
      showToast("Edit cancelled. No changes were saved.");
    });
    $("#new-event-button").addEventListener("click", () => {
      setFormMode("create");
      $("#host").scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => $("#event-title").focus(), 350);
      analytics("new event action selected");
    });
    let searchAnalyticsTimer = 0;
    searchInput.addEventListener("input", () => {
      renderEvents();
      window.clearTimeout(searchAnalyticsTimer);
      searchAnalyticsTimer = window.setTimeout(() => analytics("event search completed"), 400);
    });
    categoryFilter.addEventListener("change", () => { renderEvents(); analytics("event category filter changed"); });
    dateFilter.addEventListener("change", () => { renderEvents(); analytics("event date filter changed"); });
    $("#reset-filters").addEventListener("click", resetFilters);
    $("#empty-reset").addEventListener("click", resetFilters);
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (event.key === "Escape" && editingId) {
        setFormMode("create");
        showToast("Edit cancelled.");
      }
    });
    setupMobileNav();
    function updateConnectionStatus() {
    const banner = $("#connection-status");
    if (!banner) return;
    if (navigator.onLine) {
      banner.hidden = true;
      banner.textContent = "";
    } else {
      banner.textContent = "You are offline. This demo uses browser-local data; event changes may remain on this device only. Online publishing and shared updates are unavailable.";
      banner.hidden = false;
      analytics("offline connection detected");
    }
  }
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
  updateConnectionStatus();

  loadEvents();
    setupRevealAnimations();
  }

  window.chapterCoCanManageEvents = false;
  window.chapterCoGetEvents = () => allEvents.map(event => ({ ...event }));
  window.chapterCoRenderEvents = renderEvents;
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEYS.events) {
      const stored = readStoredEvents();
      if (stored !== null) allEvents = stored;
      renderEvents();
      console.info("[Analytics] User interacted with Independent Bookstore Events Page — events refreshed from another tab");
    }
    if (event.key === STORAGE_KEYS.saved) {
      savedIds = new Set(readSavedIds());
      renderEvents();
    }
  });
  init();
})();


/* Workspace authentication and staff administration — local demo only. */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const authGate = $("#auth-gate");
  const workspace = $("#workspace-shell");
  const mainContent = $("#main-content");
  const loginForm = $("#login-form");
  const loginId = $("#login-id");
  const loginPassword = $("#login-password");
  const loginError = $("#login-error");
  const staffPanel = $("#staff-admin-panel");
  const staffList = $("#staff-list");
  const staffForm = $("#staff-form");
  const staffStatus = $("#staff-form-status");
  const STORAGE = { admin: "chapter-co-demo-admin-v2", staff: "chapter-co-demo-staff-v2", session: "chapter-co-demo-session-v2", theme: "chapter-co-theme-v1" };
  const PBKDF2_ITERATIONS = 180000;

  async function hashPassword(password, saltHex) {
    if (!window.crypto?.subtle || !window.crypto?.getRandomValues) {
      throw new Error("Secure password hashing requires HTTPS or localhost in a modern browser.");
    }
    const salt = saltHex ? hexToBytes(saltHex) : window.crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256);
    return { salt: bytesToHex(salt), hash: bytesToHex(new Uint8Array(bits)), iterations: PBKDF2_ITERATIONS };
  }
  function bytesToHex(bytes) { return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join(""); }
  function hexToBytes(hex) { return new Uint8Array((hex.match(/.{2}/g) || []).map(byte => parseInt(byte, 16))); }
  function constantTimeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
    let difference = 0;
    for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return difference === 0;
  }
  function readAdmin() {
    try {
      const item = JSON.parse(localStorage.getItem(STORAGE.admin) || "null");
      return item && typeof item.id === "string" && typeof item.salt === "string" && typeof item.hash === "string" ? item : null;
    } catch { return null; }
  }
  function isFirstRun() { return !readAdmin(); }
  let chosenRole = "admin";
  let currentUser = null;
  let staffAccounts = [];

  function readStaff() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE.staff) || "[]");
      return Array.isArray(data) ? data.filter(item => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.salt === "string" && typeof item.hash === "string") : [];
    } catch { return []; }
  }
  function writeStaff() {
    try { localStorage.setItem(STORAGE.staff, JSON.stringify(staffAccounts)); return true; }
    catch { return false; }
  }
  function setRole(role) {
    chosenRole = role;
    document.querySelectorAll(".role-tab").forEach(button => {
      const active = button.dataset.role === role;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $("#login-id").labels[0].textContent = role === "admin" ? "Admin ID" : "Staff ID";
    $("#demo-credentials").hidden = role !== "admin";
    const firstRun = role === "admin" && isFirstRun();
    $("#admin-setup-heading").textContent = firstRun ? "First-time administrator setup" : "Administrator sign-in";
    $("#admin-setup-copy").textContent = firstRun
      ? "Choose an administrator ID and a strong password to initialize this browser's demo workspace. Use at least 12 characters."
      : "Enter the administrator credentials you created for this browser.";
    loginPassword.autocomplete = firstRun ? "new-password" : "current-password";
    loginPassword.minLength = firstRun ? 12 : 1;
    loginId.placeholder = role === "admin" ? (firstRun ? "Create admin ID" : "Enter admin ID") : "Enter staff ID";
    loginPassword.value = "";
    loginError.hidden = true;
    loginError.textContent = "";
  }
  function setView(isLoggedIn) {
    authGate.hidden = true;
    workspace.hidden = !isLoggedIn;
    mainContent.hidden = false;
    // The supplied TRD does not require authentication. Keep event management directly accessible in this static POC.
    window.chapterCoCanManageEvents = true;
    const hostForm = $("#host");
    const newEventButton = $("#new-event-button");
    const exportButton = $("#export-events-button");
    if (hostForm) hostForm.hidden = !window.chapterCoCanManageEvents;
    if (newEventButton) newEventButton.hidden = !window.chapterCoCanManageEvents;
    if (exportButton) exportButton.hidden = !window.chapterCoCanManageEvents;
    window.chapterCoRenderEvents?.();
    const siteHeader = $(".site-header");
    if (siteHeader) siteHeader.hidden = false;
    if (isLoggedIn) {
      $("#current-role-chip").textContent = currentUser.role.toUpperCase();
      $("#current-user-name").textContent = currentUser.name;
      $("#user-avatar").textContent = currentUser.name.slice(0, 1).toUpperCase();
      $("#workspace-heading").textContent = `Welcome, ${currentUser.name.split(" ")[0]}.`;
      $("#workspace-date").textContent = new Intl.DateTimeFormat("en", { weekday:"long", month:"long", day:"numeric", year:"numeric" }).format(new Date());
      const isAdmin = currentUser.role === "admin";
      $("#staff-tab").hidden = !isAdmin;
      $("#staff-tab").setAttribute("aria-hidden", String(!isAdmin));
      if (!isAdmin) {
        staffPanel.hidden = true;
        document.querySelector('[data-workspace-tab="events"]').classList.add("is-active");
      }
    }
  }
  async function authenticate(event) {
    event.preventDefault();
    loginError.hidden = true;
    loginError.textContent = "";
    [loginId, loginPassword].forEach(field => field.removeAttribute("aria-invalid"));
    $("#login-id-error").textContent = "";
    $("#login-password-error").textContent = "";
    const id = loginId.value.trim().normalize("NFKC").slice(0, 32);
    const password = loginPassword.value;
    const firstRun = chosenRole === "admin" && isFirstRun();
    if (!id || !password || (firstRun && password.length < 12)) {
      if (!id) { loginId.setAttribute("aria-invalid", "true"); $("#login-id-error").textContent = "Enter an administrator or staff ID."; }
      if (!password || (firstRun && password.length < 12)) {
        loginPassword.setAttribute("aria-invalid", "true");
        $("#login-password-error").textContent = firstRun ? "Choose a password of at least 12 characters." : "Enter your password.";
      }
      loginError.textContent = "Please correct the highlighted fields.";
      loginError.hidden = false;
      (!id ? loginId : loginPassword).focus();
      console.info("[Analytics] User interacted with Independent Bookstore Events Page — sign-in validation failed");
      return;
    }
    const submit = loginForm.querySelector('[type="submit"]');
    const originalSubmit = submit.innerHTML;
    submit.disabled = true;
    submit.textContent = firstRun ? "Setting up administrator…" : "Checking credentials…";
    try {
      if (chosenRole === "admin" && firstRun) {
        if (!/^[a-zA-Z0-9._-]{3,32}$/.test(id)) throw new Error("Use 3–32 letters, numbers, dots, underscores, or hyphens for the administrator ID.");
        const derived = await hashPassword(password);
        const admin = { id, salt: derived.salt, hash: derived.hash, iterations: derived.iterations, name: "Workspace Admin", createdAt: new Date().toISOString() };
        localStorage.setItem(STORAGE.admin, JSON.stringify(admin));
        currentUser = { id, name: admin.name, role: "admin" };
        console.info("[Analytics] User interacted with Independent Bookstore Events Page — administrator initialized");
      } else if (chosenRole === "admin") {
        const admin = readAdmin();
        if (admin && admin.id.toLowerCase() === id.toLowerCase()) {
          const derived = await hashPassword(password, admin.salt);
          if (constantTimeEqual(derived.hash, admin.hash)) currentUser = { id: admin.id, name: admin.name || "Workspace Admin", role: "admin" };
        }
      } else {
        const staff = staffAccounts.find(item => item.id.toLowerCase() === id.toLowerCase() && !item.disabled);
        if (staff) {
          const derived = await hashPassword(password, staff.salt);
          if (constantTimeEqual(derived.hash, staff.hash)) currentUser = { id: staff.id, name: staff.name, role: "staff" };
        }
      }
      if (!currentUser) {
        loginId.setAttribute("aria-invalid", "true");
        loginPassword.setAttribute("aria-invalid", "true");
        $("#login-id-error").textContent = "Check the ID and try again.";
        $("#login-password-error").textContent = "Check the password and try again.";
        loginError.textContent = "We couldn't verify those credentials. Check them or ask the administrator for help.";
        loginError.hidden = false;
        console.warn("[Analytics] Workspace sign-in failed");
        return;
      }
      try { sessionStorage.setItem(STORAGE.session, JSON.stringify({ id: currentUser.id, role: currentUser.role, name: currentUser.name })); } catch { showAuthNotice("Session storage is blocked. Keep this tab open while using the demo."); }
      setView(true);
      renderStaff();
      console.info(`[Analytics] User interacted with Independent Bookstore Events Page — ${currentUser.role} signed in`);
    } catch (error) {
      loginError.textContent = error?.message || "Could not initialize sign-in. Check that browser storage is available.";
      loginError.hidden = false;
      console.error("[Workspace] Authentication setup failed.", error);
    } finally {
      submit.disabled = false;
      submit.innerHTML = originalSubmit;
    }
  }
  function showAuthNotice(message) {
    loginError.textContent = message;
    loginError.hidden = false;
  }
  function escapeForText(value) {
    return String(value ?? "").normalize("NFKC")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .replace(/[<>]/g, "").trim();
  }
  function renderStaff() {
    if (currentUser?.role !== "admin") return;
    staffList.replaceChildren();
    $("#staff-count").textContent = `${staffAccounts.length} ${staffAccounts.length === 1 ? "staff member" : "staff members"}`;
    if (!staffAccounts.length) {
      const empty = document.createElement("p");
      empty.className = "staff-empty";
      empty.textContent = "No staff accounts yet. Create the first account using the form.";
      staffList.append(empty);
      return;
    }
    staffAccounts.forEach(account => {
      const row = document.createElement("div");
      row.className = "staff-row";
      const person = document.createElement("div");
      person.className = "staff-person";
      const avatar = document.createElement("span");
      avatar.className = "staff-avatar";
      avatar.textContent = account.name.slice(0,1).toUpperCase();
      avatar.setAttribute("aria-hidden", "true");
      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = account.name;
      const id = document.createElement("small");
      id.textContent = `Staff ID: ${account.id}`;
      details.append(name,id);
      person.append(avatar,details);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "staff-remove";
      remove.textContent = "Delete account";
      remove.setAttribute("aria-label", `Delete staff account ${account.name}`);
      remove.addEventListener("click", () => {
        if (!window.confirm(`Delete staff account "${account.name}" (${account.id})? They will no longer be able to sign in on this browser.`)) return;
        staffAccounts = staffAccounts.filter(item => item.id !== account.id);
        writeStaff();
        renderStaff();
        staffStatus.textContent = `Deleted staff account ${account.id}.`;
        console.info("[Analytics] User interacted with Independent Bookstore Events Page — staff account deleted");
      });
      row.append(person,remove);
      staffList.append(row);
    });
  }
  async function createStaff(event) {
    event.preventDefault();
    staffStatus.textContent = "";
    const name = escapeForText($("#staff-name").value).slice(0,60);
    const id = escapeForText($("#staff-id").value).slice(0,32);
    const password = $("#staff-password").value;
    const idPattern = /^[a-zA-Z0-9._-]{3,32}$/;
    let firstInvalid = null;
    const errors = [
      [$("#staff-name"), $("#staff-name-error"), name.length >= 2, "Enter a name of at least 2 characters."],
      [$("#staff-id"), $("#staff-id-error"), idPattern.test(id), "Use 3–32 letters, numbers, dots, underscores, or hyphens."],
      [$("#staff-password"), $("#staff-password-error"), password.length >= 12, "Use a temporary password of at least 12 characters."]
    ];
    errors.forEach(([field, errorEl, valid, message]) => {
      field.setAttribute("aria-invalid", String(!valid));
      errorEl.textContent = valid ? "" : message;
      if (!valid && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) { firstInvalid.focus(); return; }
    if (staffAccounts.some(item => item.id.toLowerCase() === id.toLowerCase())) {
      $("#staff-id-error").textContent = "That staff ID already exists.";
      $("#staff-id").setAttribute("aria-invalid", "true");
      $("#staff-id").focus();
      return;
    }
    const createButton = staffForm.querySelector('[type="submit"]');
    createButton.disabled = true;
    try {
      const derived = await hashPassword(password);
      staffAccounts.push({ id, name, salt: derived.salt, hash: derived.hash, iterations: derived.iterations, disabled: false, createdAt: new Date().toISOString() });
      if (!writeStaff()) {
        staffAccounts.pop();
        staffStatus.textContent = "Could not save this account. Browser storage may be disabled or full.";
        return;
      }
      staffForm.reset();
      errors.forEach(([field]) => field.removeAttribute("aria-invalid"));
      renderStaff();
      staffStatus.textContent = `Created ${id}. Share the staff ID and temporary password securely. This static demo stores a salted password hash locally but is not secure production authentication.`;
      console.info("[Analytics] User interacted with Independent Bookstore Events Page — staff account created");
    } catch (error) {
      staffStatus.textContent = error?.message || "Could not securely create this account.";
      console.error("[Workspace] Staff account creation failed.", error);
    } finally {
      createButton.disabled = false;
    }
  }
  function showWorkspaceTab(tab) {
    document.querySelectorAll(".workspace-tab").forEach(button => {
      const active = button.dataset.workspaceTab === tab;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    staffPanel.hidden = tab !== "staff" || currentUser?.role !== "admin";
    const events = $("#events");
    if (events) events.hidden = tab === "staff";
    const host = $("#host");
    if (host) host.hidden = tab === "staff";
    if (tab === "events" && events) events.scrollIntoView({ behavior:"smooth", block:"start" });
    if (tab === "staff") staffPanel.scrollIntoView({ behavior:"smooth", block:"start" });
  }
  function applyTheme(theme) {
    const dark = theme === "dark";
    document.body.classList.toggle("dark-mode", dark);
    const button = $("#theme-toggle");
    if (button) {
      button.setAttribute("aria-pressed", String(dark));
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      const icon = button.querySelector(".theme-icon");
      const label = button.querySelector(".theme-label");
      if (icon) icon.textContent = dark ? "☀" : "☾";
      if (label) label.textContent = dark ? "Light mode" : "Dark mode";
    }
    try { localStorage.setItem(STORAGE.theme, theme); } catch {}
  }
  function initTheme() {
    let theme = "light";
    try { theme = localStorage.getItem(STORAGE.theme) || "light"; } catch {}
    applyTheme(theme);
    $("#theme-toggle")?.addEventListener("click", () => {
      applyTheme(document.body.classList.contains("dark-mode") ? "light" : "dark");
      console.info("[Analytics] User interacted with Independent Bookstore Events Page — theme changed");
    });
  }
  function downloadFile(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportRows() {
    const events = Array.isArray(window.chapterCoGetEvents?.()) ? window.chapterCoGetEvents() : [];
    return events.map(event => ({
      Title: event.title,
      Category: event.type,
      Bookstore: event.bookstore,
      Location: event.location,
      Date: event.date,
      Time: event.time,
      Description: event.description
    }));
  }
  function exportAs(format) {
    const rows = exportRows();
    if (!rows.length) {
      window.alert("There are no events to export.");
      return;
    }
    const filename = `chapter-co-events-${new Date().toISOString().slice(0,10)}`;
    if (format === "csv" || format === "xls") {
      const headers = Object.keys(rows[0]);
      const csv = [headers, ...rows.map(row => headers.map(header => row[header]))]
        .map(row => row.map(value => {
          let safe = String(value ?? "");
          // Prevent spreadsheet formula injection in text cells.
          if (/^[=+\-@\t\r]/.test(safe)) safe = `'${safe}`;
          return `"${safe.replace(/"/g, '""')}"`;
        }).join(",")).join("\r\n");
      if (format === "csv") {
        downloadFile("\uFEFF" + csv, "text/csv;charset=utf-8", `${filename}.csv`);
      } else {
        // Excel opens SpreadsheetML/HTML tables in .xls; no external library is needed.
        const spreadsheetSafe = value => {
          let safe = String(value ?? "");
          if (/^[=+\-@\t\r]/.test(safe)) safe = `'${safe}`;
          return safe;
        };
        const htmlRows = [headers, ...rows.map(row => headers.map(header => row[header]))].map(row =>
          `<tr>${row.map(value => `<td>${spreadsheetSafe(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}</td>`).join("")}</tr>`
        ).join("");
        const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${htmlRows}</table></body></html>`;
        downloadFile("\uFEFF" + workbook, "application/vnd.ms-excel;charset=utf-8", `${filename}.xls`);
      }
      console.info(`[Analytics] User interacted with Independent Bookstore Events Page — ${format.toUpperCase()} export`);
      showToast(`Your ${format.toUpperCase()}-compatible event file is ready.`);
    } else if (format === "pdf") {
      const printable = window.open("", "_blank");
      if (!printable) {
        window.alert("Your browser blocked the print window. Allow pop-ups for this page, then try PDF export again.");
        return;
      }
      const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      printable.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Chapter &amp; Co. Events</title><style>
      body{font:12px Arial,sans-serif;color:#222;margin:32px}h1{font:28px Georgia,serif}p{color:#666}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{border:1px solid #ddd;padding:9px;text-align:left;vertical-align:top}th{background:#ece9e1}tr{break-inside:avoid}@page{size:A4 landscape;margin:12mm}
      </style></head><body><h1>Chapter &amp; Co. — Events Calendar</h1><p>Exported ${esc(new Date().toLocaleString())} · ${rows.length} events</p><table><thead><tr>${Object.keys(rows[0]).map(key=>`<th>${esc(key)}</th>`).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${Object.values(row).map(value=>`<td>${esc(value)}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
      printable.document.close();
      console.info("[Analytics] User interacted with Independent Bookstore Events Page — PDF print export");
    }
    $("#export-menu").hidden = true;
    $("#export-events-button").setAttribute("aria-expanded", "false");
  }
  function initExports() {
    const button = $("#export-events-button");
    const menu = $("#export-menu");
    button?.addEventListener("click", () => {
      const willOpen = menu.hidden;
      console.info("[Analytics] User interacted with Independent Bookstore Events Page — export menu toggled");
      menu.hidden = !willOpen;
      button.setAttribute("aria-expanded", String(willOpen));
    });
    menu?.querySelectorAll("[data-export]").forEach(item => item.addEventListener("click", () => exportAs(item.dataset.export)));
    document.addEventListener("click", event => {
      if (!event.target.closest(".export-menu-wrap")) {
        menu.hidden = true;
        button.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.querySelectorAll(".role-tab").forEach(button => button.addEventListener("click", () => setRole(button.dataset.role)));
  loginForm?.addEventListener("submit", authenticate);
  $("#toggle-password")?.addEventListener("click", event => {
    const button = event.currentTarget;
    const input = $("#login-password");
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    button.textContent = visible ? "Hide" : "Show";
    button.setAttribute("aria-label", visible ? "Hide password" : "Show password");
  });
  staffForm?.addEventListener("submit", createStaff);
  $("#signout-button")?.addEventListener("click", () => {
    currentUser = null;
    try { sessionStorage.removeItem(STORAGE.session); } catch {}
    setView(false);
    openDestination("home");
    loginForm.reset();
    setRole("admin");
    console.info("[Analytics] User interacted with Independent Bookstore Events Page — signed out");
  });
  document.querySelectorAll(".workspace-tab").forEach(button => button.addEventListener("click", () => {
    showWorkspaceTab(button.dataset.workspaceTab);
    console.info(`[Analytics] User interacted with Independent Bookstore Events Page — workspace ${button.dataset.workspaceTab} tab opened`);
  }));
  initTheme();
  initExports();
  staffAccounts = readStaff();
  setRole("admin");
  setView(false);
  authGate.hidden = true;
  workspace.hidden = true;
  mainContent.hidden = false;
})();


  const loginButton = $("#nav-login-button");
  loginButton?.addEventListener("click", () => {
    console.info("[Analytics] User interacted with Independent Bookstore Events Page — login portal opened");
    authGate.hidden = false;
    workspace.hidden = true;
    mainContent.hidden = true;
    authGate.scrollIntoView({ behavior:"smooth", block:"start" });
    $("#login-id")?.focus();
  });
  document.querySelectorAll("[data-page]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      console.info(`[Analytics] User interacted with Independent Bookstore Events Page — ${link.dataset.page} page opened`);
      openDestination(link.dataset.page);
    });
  });
  document.querySelectorAll(".destination-back").forEach(button => button.addEventListener("click", () => openDestination("home")));
  function openDestination(page) {
    const auth = $("#auth-gate");
    const workspace = $("#workspace-shell");
    const main = $("#main-content");
    const destinations = ["about","contact","privacy"].map(name => $(`#${name}-page`));
    auth.hidden = true;
    workspace.hidden = true;
    main.hidden = page !== "home";
    destinations.forEach(section => { if (section) section.hidden = true; });
    if (page !== "home") {
      const target = $(`#${page}-page`);
      if (target) target.hidden = false;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function safeContactText(value, maxLength) {
    return String(value ?? "").normalize("NFKC").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/[<>]/g, "").trim().slice(0, maxLength);
  }
  $("#contact-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const name = safeContactText($("#contact-name").value, 80);
    const email = $("#contact-email").value.trim().slice(0, 120);
    const message = safeContactText($("#contact-message").value, 1000);
    const status = $("#contact-status");
    const contactRules = [
      [$("#contact-name"), $("#contact-name-error"), name.length >= 2, "Enter a name of at least 2 characters."],
      [$("#contact-email"), $("#contact-email-error"), /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "Enter a valid email address."],
      [$("#contact-message"), $("#contact-message-error"), message.length >= 10, "Enter a message of at least 10 characters."]
    ];
    let firstInvalidContact = null;
    contactRules.forEach(([field, errorEl, valid, messageText]) => {
      field.setAttribute("aria-invalid", String(!valid));
      errorEl.textContent = valid ? "" : messageText;
      if (!valid && !firstInvalidContact) firstInvalidContact = field;
    });
    if (firstInvalidContact) {
      status.textContent = "Please correct the highlighted fields and try again.";
      status.style.color = "var(--error)";
      firstInvalidContact.focus();
      console.info("[Analytics] User interacted with Independent Bookstore Events Page — contact form validation failed");
      return;
    }
    contactRules.forEach(([field]) => field.removeAttribute("aria-invalid"));
    status.textContent = "Your message is ready. This demo does not send it automatically; connect a backend or email service to enable delivery.";
    status.style.color = "var(--success)";
    console.info("[Analytics] User interacted with Independent Bookstore Events Page — contact form validated");
    // Avoid opening an email client unexpectedly; explicitly state no message was sent.
  });

// Cache the static app shell on HTTPS deployments so repeat visits survive flaky connectivity.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(error => {
      console.warn("[Offline support] App-shell caching could not be enabled in this browser.", error);
    });
  });
}
