document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navMenu = document.querySelector("[data-nav-menu]");
  const feedback = document.getElementById("form-feedback");
  // Duplicate skills marquee items to create a seamless loop
  const marqueeTrack = document.querySelector(".skills-marquee-track");
  if (marqueeTrack && marqueeTrack.children.length) {
    marqueeTrack.innerHTML += marqueeTrack.innerHTML;
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      navMenu.classList.toggle("is-open", !expanded);
    });

    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const openModal = (targetId) => {
    const modal = document.getElementById(`${targetId}-modal`);
    if (!modal) return;
    modal.removeAttribute("hidden");
    document.body.classList.add("has-open-modal");
    const focusTarget = modal.querySelector("[data-modal-close]");
    if (focusTarget) {
      focusTarget.focus();
    }
  };

  const closeModal = (modal) => {
    modal.setAttribute("hidden", "");
    if (document.querySelectorAll("[data-modal]:not([hidden])").length === 0) {
      document.body.classList.remove("has-open-modal");
    }
  };

  document.querySelectorAll("[data-modal-target]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const targetId = trigger.getAttribute("data-modal-target");
      if (targetId) {
        openModal(targetId);
      }
    });
  });

  document.querySelectorAll("[data-modal-close]").forEach((closeBtn) => {
    closeBtn.addEventListener("click", () => {
      const modal = closeBtn.closest("[data-modal]");
      if (modal) {
        closeModal(modal);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document
        .querySelectorAll("[data-modal]:not([hidden])")
        .forEach((modal) => {
          closeModal(modal);
        });
    }
  });

  document.querySelectorAll("[data-modal]").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (event) => {
      const emailInput = contactForm.querySelector('input[type="email"]');
      if (!emailInput || !emailInput.value || !emailInput.checkValidity()) {
        event.preventDefault();
        if (feedback) {
          feedback.textContent =
            "Please enter a valid email address before sending your message.";
          feedback.hidden = false;
        }
        emailInput?.setAttribute("aria-invalid", "true");
        emailInput?.focus();
        return;
      }

      emailInput.removeAttribute("aria-invalid");
      const nameInput = contactForm.querySelector("#name");
      const messageInput = contactForm.querySelector("#message");
      const params = new URLSearchParams({
        subject: `Portfolio Contact · ${nameInput?.value || "New Inquiry"}`,
        body: `${messageInput?.value || ""}\n\n— ${
          nameInput?.value || "Anonymous"
        }`,
      });
      contactForm.setAttribute(
        "action",
        `mailto:churakantimanohar@gmail.com?${params.toString()}`
      );
      if (feedback) {
        feedback.textContent =
          "Your email client should now open with the drafted message.";
        feedback.hidden = false;
      }
    });
  }

  const yearSpan = document.getElementById("current-year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // Dynamically load GitHub projects into the Projects grid
  (async () => {
    const grid = document.querySelector(".projects-grid[data-gh-user]");
    if (!grid) return;

    const username = grid.getAttribute("data-gh-user");
    const max = parseInt(grid.getAttribute("data-gh-max") || "6", 10);
    if (!username) return;

    // Capture featured (pinned) projects to keep them at the top
    const featuredNodes = Array.from(grid.children).filter(
      (el) =>
        el.nodeType === 1 &&
        el.getAttribute &&
        el.getAttribute("data-featured") === "true"
    );
    const excludeSet = new Set(
      featuredNodes
        .map((el) => (el.getAttribute("data-repo") || "").toLowerCase())
        .filter(Boolean)
    );

    try {
      // Lightweight loading state while preserving featured
      const original = grid.innerHTML;
      grid.dataset.original = original;
      grid.innerHTML = `<article class="project-card">Loading GitHub projects…</article>`;

      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(
          username
        )}/repos?sort=updated&per_page=${Math.max(6, max)}`,
        {
          headers: { Accept: "application/vnd.github+json" },
        }
      );
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      const repos = await res.json();

      // Build a quick lookup map by lowercased repo name
      const repoByName = new Map();
      (Array.isArray(repos) ? repos : []).forEach((r) => {
        if (r && r.name) repoByName.set(String(r.name).toLowerCase(), r);
      });

      // Enrich featured nodes with GitHub link and badges
      const toBadge = (label) => `<span class="badge">${label}</span>`;
      const enrichedFeaturedEls = featuredNodes.map((node) => {
        const clone = node.cloneNode(true);
        const slug = (clone.getAttribute("data-repo") || "").toLowerCase();
        let repo = repoByName.get(slug) || null;
        if (!repo) {
          // Fallback: fuzzy match contains
          for (const r of repoByName.values()) {
            const n = String(r.name || "").toLowerCase();
            if (n.includes(slug) || slug.includes(n)) {
              repo = r;
              break;
            }
          }
        }

        if (repo) {
          // Tech stack badges from language + topics + stars
          const group = clone.querySelector(".badge-group");
          if (group) {
            // Only auto-fill if there are no manually provided badges
            if (!group.children.length) {
              const badges = [];
              if (repo.language) badges.push(toBadge(repo.language));
              if (Array.isArray(repo.topics)) {
                repo.topics.slice(0, 3).forEach((t) => badges.push(toBadge(t)));
              }
              if (
                typeof repo.stargazers_count === "number" &&
                repo.stargazers_count > 0
              ) {
                badges.push(toBadge(`★ ${repo.stargazers_count}`));
              }
              if (badges.length) group.innerHTML = badges.join("");
            }
          }

          // Ensure GitHub button exists and points to the repo
          const actions = clone.querySelector(".card-actions");
          if (actions) {
            const hasGitHub = Array.from(actions.querySelectorAll("a")).some(
              (a) => /github/i.test(a.textContent || "")
            );
            if (!hasGitHub && repo.html_url) {
              const a = document.createElement("a");
              a.className = "btn btn-outline";
              a.href = repo.html_url;
              a.target = "_blank";
              a.rel = "noreferrer";
              a.textContent = "GitHub";
              actions.prepend(a);
            }
          }
        }

        return clone;
      });

      const filtered = (Array.isArray(repos) ? repos : [])
        .filter((r) => !r.fork && !r.archived)
        .filter((r) => !excludeSet.has((r.name || "").toLowerCase()))
        .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
        .slice(0, max);

      const cards = filtered
        .map((repo) => {
          const name = repo.name || "Untitled";
          const desc = repo.description || "No description provided.";
          const lang = repo.language || "";
          const stars =
            typeof repo.stargazers_count === "number"
              ? repo.stargazers_count
              : 0;
          const homepage = (repo.homepage || "").trim();
          const topics = Array.isArray(repo.topics)
            ? repo.topics.slice(0, 3)
            : [];

          const badges = [];
          if (lang) badges.push(toBadge(lang));
          if (stars > 0) badges.push(toBadge(`★ ${stars}`));
          topics.forEach((t) => badges.push(toBadge(t)));

          const actions = [
            `<a class="btn btn-outline" href="${repo.html_url}" target="_blank" rel="noreferrer">GitHub</a>`,
          ];
          if (homepage) {
            const safeHome = homepage.startsWith("http")
              ? homepage
              : `https://${homepage}`;
            actions.push(
              `<a class="btn btn-outline" href="${safeHome}" target="_blank" rel="noreferrer">Live Demo</a>`
            );
          }

          return `
            <article class="project-card">
              <h3>${name}</h3>
              <p>${desc}</p>
              <div class="badge-group">${badges.join("")}</div>
              <div class="card-actions">${actions.join("")}</div>
            </article>
          `;
        })
        .join("");

      grid.innerHTML = `${enrichedFeaturedEls
        .map((el) => el.outerHTML)
        .join("")}${cards}`;
    } catch (err) {
      console.error(err);
      // Restore featured and original content on error
      if (grid.dataset.original) {
        grid.innerHTML = grid.dataset.original;
      }
    }
  })();
});

