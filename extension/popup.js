document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const viewLogin = document.getElementById("loginView");
  const viewClipper = document.getElementById("clipperView");
  const viewSettings = document.getElementById("settingsView");

  const alertBox = document.getElementById("alertBox");
  const settingsBtn = document.getElementById("settingsBtn");
  const backBtn = document.getElementById("backBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const loginForm = document.getElementById("loginForm");
  const loginSubmitBtn = document.getElementById("loginSubmitBtn");

  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  const urlForm = document.getElementById("urlForm");
  const saveUrlBtn = document.getElementById("saveUrlBtn");
  const pageTitleEl = document.getElementById("pageTitle");
  const pageUrlEl = document.getElementById("pageUrl");

  const noteForm = document.getElementById("noteForm");
  const saveNoteBtn = document.getElementById("saveNoteBtn");
  const noteContent = document.getElementById("noteContent");

  // State
  let token = null;
  const baseUrl = "https://second-brain-backend-xqqh.onrender.com";
  let currentTab = null;

  // Initialize
  await loadState();

  // Load state from storage
  async function loadState() {
    const data = await chrome.storage.local.get([
      "kortexToken"
    ]);
    token = data.kortexToken || null;

    if (token) {
      showView(viewClipper);
      await loadCurrentTab();
    } else {
      showView(viewLogin);
    }
  }

  function showView(view) {
    viewLogin.classList.add("hidden");
    viewClipper.classList.add("hidden");
    viewSettings.classList.add("hidden");
    view.classList.remove("hidden");
    hideAlert();
  }

  function showAlert(message, type = "error") {
    alertBox.textContent = message;
    alertBox.className = `alert ${type}`;
    alertBox.classList.remove("hidden");
  }

  function hideAlert() {
    alertBox.classList.add("hidden");
  }

  async function loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab) {
        currentTab = tab;
        pageTitleEl.textContent = tab.title || "Untitled";
        pageTitleEl.title = tab.title;
        pageUrlEl.textContent = tab.url;
        pageUrlEl.title = tab.url;
      }
    } catch (e) {
      pageTitleEl.textContent = "Unable to get tab details";
    }
  }

  // Event Listeners
  settingsBtn.addEventListener("click", () => {
    showView(viewSettings);
  });

  backBtn.addEventListener("click", () => {
    if (token) {
      showView(viewClipper);
    } else {
      showView(viewLogin);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await chrome.storage.local.remove("kortexToken");
    token = null;
    showView(viewLogin);
  });

  // Tabs
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((c) => c.classList.add("hidden"));

      tab.classList.add("active");
      const targetId = tab.getAttribute("data-target");
      document.getElementById(targetId).classList.remove("hidden");
    });
  });

  // Login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const originalText = loginSubmitBtn.textContent;
    loginSubmitBtn.textContent = "Logging in...";
    loginSubmitBtn.disabled = true;

    try {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      token = data.token;
      await chrome.storage.local.set({ kortexToken: token });

      document.getElementById("email").value = "";
      document.getElementById("password").value = "";

      showView(viewClipper);
      await loadCurrentTab();
    } catch (err) {
      showAlert(err.message);
    } finally {
      loginSubmitBtn.textContent = originalText;
      loginSubmitBtn.disabled = false;
    }
  });

  // Save URL
  urlForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentTab) return;

    const originalText = saveUrlBtn.textContent;
    saveUrlBtn.textContent = "Saving...";
    saveUrlBtn.disabled = true;

    try {
      const res = await fetch(`${baseUrl}/api/v1/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: currentTab.url }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error(data.error || "Failed to save URL");
      }

      showAlert("URL saved to Kortex!", "success");
      setTimeout(hideAlert, 3000);
    } catch (err) {
      showAlert(err.message);
      if (err.message.includes("Session expired")) {
        await chrome.storage.local.remove("kortexToken");
        token = null;
        setTimeout(() => showView(viewLogin), 2000);
      }
    } finally {
      saveUrlBtn.textContent = originalText;
      saveUrlBtn.disabled = false;
    }
  });

  // Save Note
  noteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = noteContent.value.trim();
    if (!note) return;

    const originalText = saveNoteBtn.textContent;
    saveNoteBtn.textContent = "Saving...";
    saveNoteBtn.disabled = true;

    try {
      const res = await fetch(`${baseUrl}/api/v1/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error(data.error || "Failed to save Note");
      }

      showAlert("Note saved to Kortex!", "success");
      noteContent.value = "";
      setTimeout(hideAlert, 3000);
    } catch (err) {
      showAlert(err.message);
      if (err.message.includes("Session expired")) {
        await chrome.storage.local.remove("kortexToken");
        token = null;
        setTimeout(() => showView(viewLogin), 2000);
      }
    } finally {
      saveNoteBtn.textContent = originalText;
      saveNoteBtn.disabled = false;
    }
  });
});
