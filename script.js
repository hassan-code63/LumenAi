/* =========================================================
   Lumen — interactions
   Vanilla JS, no dependencies.
   ========================================================= */
(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /* ---------------- Loader ---------------- */
  const revealLoader = () => document.body.classList.add("loaded");
  window.addEventListener("load", revealLoader);
  // Safety net in case a font or asset stalls.
  window.setTimeout(revealLoader, 1600);

  /* ---------------- Sticky header & progress ---------------- */
  const header = $("#siteHeader");
  const progress = $("#scrollProgress");
  const toTop = $("#toTop");

  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    header.classList.toggle("is-scrolled", y > 8);
    toTop.classList.toggle("show", y > 520);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(100, (y / max) * 100) : 0;
    progress.style.width = pct + "%";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------------- Mobile navigation ---------------- */
  const menuToggle = $("#menuToggle");
  const nav = $("#primaryNav");

  const closeNav = () => {
    nav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  };

  menuToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  $$("a", nav).forEach((link) => link.addEventListener("click", closeNav));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });
  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("open")) return;
    if (nav.contains(e.target) || menuToggle.contains(e.target)) return;
    closeNav();
  });

  /* ---------------- Reveal on scroll ---------------- */
  const revealItems = $$(".reveal");
  const canObserve = "IntersectionObserver" in window;

  if (canObserve) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealItems.forEach((el) => observer.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add("in-view"));
  }

  // Stagger the model cards a little for a nicer entrance.
  $$(".model-card").forEach((card, i) => {
    card.style.transitionDelay = `${Math.min(i, 6) * 55}ms`;
  });

  /* ---------------- Count-up stats ---------------- */
  const stats = $$(".hero-stats dt");
  const animateNumber = (el) => {
    const target = parseInt(el.textContent, 10) || 0;
    if (target === 0) return;
    const duration = 1100;
    const start = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased).toString();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (canObserve && stats.length) {
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateNumber(entry.target);
          statObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    stats.forEach((el) => statObserver.observe(el));
  }

  /* ---------------- Toast ---------------- */
  const toastEl = $("#toast");
  let toastTimer;

  const toast = (message) => {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2600);
  };

  /* ---------------- Saved models ---------------- */
  const STORAGE_KEY = "lumen-saved-models";
  let saved = new Set();

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(stored)) saved = new Set(stored.filter((id) => typeof id === "string"));
  } catch (err) {
    saved = new Set();
  }

  const persistSaved = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(saved)));
    } catch (err) {
      /* Storage may be unavailable — saving is a bonus, not a requirement. */
    }
  };

  const savedCountEl = $("#savedCount");
  const updateSavedBadge = () => {
    const count = saved.size;
    savedCountEl.textContent = String(count);
    savedCountEl.hidden = count === 0;
  };

  /* ---------------- Filtering ---------------- */
  const cards = $$(".model-card");
  const searchInput = $("#modelSearch");
  const heroSearchForm = $("#heroSearchForm");
  const heroSearch = $("#heroSearch");
  const resultsCount = $("#resultsCount");
  const emptyState = $("#emptyState");
  const emptyTitle = $("#emptyTitle");
  const emptyText = $("#emptyText");
  const resetFilters = $("#resetFilters");
  const chips = $$(".chip", $("#filters"));

  const state = { filter: "all", query: "" };

  const applyFilters = () => {
    const q = state.query.trim().toLowerCase();
    let visible = 0;

    cards.forEach((card) => {
      const categories = (card.dataset.category || "").split(/\s+/);
      const haystack = (card.textContent + " " + (card.dataset.name || "")).toLowerCase();

      const matchesFilter =
        state.filter === "all" ||
        (state.filter === "saved" ? saved.has(card.dataset.id) : categories.includes(state.filter));
      const matchesQuery = q === "" || haystack.includes(q);

      const show = matchesFilter && matchesQuery;
      card.classList.toggle("is-hidden", !show);
      if (show) visible += 1;
    });

    resultsCount.textContent = String(visible);

    const isEmpty = visible === 0;
    emptyState.hidden = !isEmpty;

    if (isEmpty) {
      if (state.filter === "saved" && q === "") {
        emptyTitle.textContent = "No saved models yet";
        emptyText.textContent = "Tap the star on any card to keep it here for later.";
      } else {
        emptyTitle.textContent = "Nothing matches that";
        emptyText.textContent = "Try a different keyword or reset the filters to see the full collection.";
      }
    }
  };

  const setFilter = (filter) => {
    state.filter = filter;
    chips.forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.filter === filter);
    });
    applyFilters();
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => setFilter(chip.dataset.filter || "all"));
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    applyFilters();
  });

  heroSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = heroSearch.value;
    searchInput.value = heroSearch.value;
    setFilter("all");
    document.getElementById("models").scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => searchInput.focus({ preventScroll: true }), 650);
  });

  resetFilters.addEventListener("click", () => {
    heroSearch.value = "";
    searchInput.value = "";
    state.query = "";
    setFilter("all");
    toast("Filters reset — enjoy the full collection.");
  });

  /* ---------------- Save buttons ---------------- */
  $$(".save-btn", $("#modelGrid")).forEach((button) => {
    const card = button.closest(".model-card");
    const id = card.dataset.id;

    button.addEventListener("click", () => {
      const isSaved = saved.has(id);
      if (isSaved) {
        saved.delete(id);
      } else {
        saved.add(id);
      }

      button.setAttribute("aria-pressed", String(!isSaved));
      const label = $("h3", card)?.textContent?.trim() || "model";
      button.setAttribute("aria-label", `${isSaved ? "Save" : "Remove"} ${label}`);
      card.classList.toggle("is-saved", !isSaved);

      persistSaved();
      updateSavedBadge();
      toast(isSaved ? `${label} removed from saved` : `${label} saved for later`);

      if (state.filter === "saved") applyFilters();
    });
  });

  // Restore saved state on load.
  cards.forEach((card) => {
    const id = card.dataset.id;
    const button = $(".save-btn", card);
    if (!button) return;

    const isSaved = saved.has(id);
    button.setAttribute("aria-pressed", String(isSaved));
    card.classList.toggle("is-saved", isSaved);

    const label = $("h3", card)?.textContent?.trim() || "model";
    button.setAttribute("aria-label", `${isSaved ? "Remove" : "Save"} ${label}`);
  });
  updateSavedBadge();

  /* ---------------- Card links ---------------- */
  $$(".model-link").forEach((link) => {
    link.addEventListener("click", () => {
      const name = $("h3", link)?.textContent?.trim() || "the model";
      toast(`Opening ${name} in a new tab…`);
    });
  });

  /* ---------------- Card spotlight ---------------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    cards.forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });
    });
  }

  /* ---------------- FAQ accordion ---------------- */
  const faqItems = $$(".faq-item");

  faqItems.forEach((item) => {
    const question = $(".faq-question", item);

    question.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");

      faqItems.forEach((other) => {
        other.classList.remove("is-open");
        $(".faq-question", other)?.setAttribute("aria-expanded", "false");
      });

      if (!isOpen) {
        item.classList.add("is-open");
        question.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------------- Newsletter ---------------- */
  const newsForm = $("#newsForm");
  const newsEmail = $("#newsEmail");

  if (newsForm) {
    newsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = newsEmail.value.trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        toast("Please enter a valid email address.");
        newsEmail.focus();
        return;
      }

      toast("You're in — see you in the next letter.");
      newsForm.reset();
    });
  }

  /* ---------------- Footer year ---------------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------- Initial state ---------------- */
  applyFilters();
})();
