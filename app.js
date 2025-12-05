// ====== CONFIG ======
const BACKEND_URL = "https://echonet-backend-nlc7.onrender.com"; // change later to your Render URL
const API = `${BACKEND_URL}/api`;

let authToken = localStorage.getItem("echonet_token") || null;
let currentUser = null;

// ====== DOM ELEMENTS ======
const userControls = document.getElementById("userControls");
const authModal = document.getElementById("authModal");
const closeAuthModalBtn = document.getElementById("closeAuthModal");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authError = document.getElementById("authError");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");

const feedEl = document.getElementById("feed");
const profileCard = document.getElementById("profileCard");
const createPostCard = document.getElementById("createPostCard");
const searchInput = document.getElementById("searchInput");
const toastEl = document.getElementById("toast");

// ====== UTILS ======
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), 2500);
}

function openAuthModal(mode = "login") {
  authModal.classList.remove("hidden");
  authError.textContent = "";
  if (mode === "register") {
    loginTab.classList.remove("active");
    registerTab.classList.add("active");
    loginForm.classList.remove("active");
    registerForm.classList.add("active");
  } else {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.classList.add("active");
    registerForm.classList.remove("active");
  }
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem("echonet_token", token);
  } else {
    localStorage.removeItem("echonet_token");
  }
}

// ====== API CALLS ======
async function apiRequest(path, options = {}) {
  const headers = options.headers || {};
  headers["Content-Type"] = "application/json";
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ====== AUTH LOGIC ======
async function fetchCurrentUser() {
  if (!authToken) {
    currentUser = null;
    renderUserControls();
    renderProfileCard();
    renderCreatePostCard();
    return;
  }
  try {
    const user = await apiRequest("/me", { method: "GET" });
    currentUser = user;
  } catch (err) {
    console.error(err);
    setAuthToken(null);
    currentUser = null;
  }
  renderUserControls();
  renderProfileCard();
  renderCreatePostCard();
}

async function handleLogin() {
  const usernameOrEmail = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!usernameOrEmail || !password) {
    authError.textContent = "Please fill in all fields.";
    return;
  }

  try {
    const data = await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify({ username_or_email: usernameOrEmail, password }),
    });
    setAuthToken(data.token);
    currentUser = data.user;
    closeAuthModal();
    renderUserControls();
    renderProfileCard();
    renderCreatePostCard();
    loadFeed();
    showToast("Logged in");
  } catch (err) {
    authError.textContent = err.message;
  }
}

async function handleRegister() {
  const username = document.getElementById("regUsername").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const displayName = document.getElementById("regDisplayName").value.trim();
  const password = document.getElementById("regPassword").value;

  if (!username || !email || !displayName || !password) {
    authError.textContent = "Please fill in all fields.";
    return;
  }

  try {
    const data = await apiRequest("/register", {
      method: "POST",
      body: JSON.stringify({ username, email, display_name: displayName, password }),
    });
    setAuthToken(data.token);
    currentUser = data.user;
    closeAuthModal();
    renderUserControls();
    renderProfileCard();
    renderCreatePostCard();
    loadFeed();
    showToast("Account created");
  } catch (err) {
    authError.textContent = err.message;
  }
}

// ====== FEED ======
async function loadFeed() {
  feedEl.innerHTML = `<p class="muted center">Loading feed...</p>`;
  try {
    const posts = await apiRequest("/feed", { method: "GET" });
    if (!posts.length) {
      feedEl.innerHTML = `<p class="muted center">No posts yet. Be the first to create one!</p>`;
      return;
    }
    feedEl.innerHTML = "";
    posts.forEach((p) => {
      const postEl = renderPost(p);
      feedEl.appendChild(postEl);
    });
  } catch (err) {
    feedEl.innerHTML = `<p class="muted center">Failed to load feed: ${err.message}</p>`;
  }
}

function renderPost(post) {
  const wrapper = document.createElement("article");
  wrapper.className = "post";

  const isVideo =
    post.media_url &&
    (post.media_url.endsWith(".mp4") ||
      post.media_url.endsWith(".webm") ||
      post.media_url.includes("mp4"));

  wrapper.innerHTML = `
    <div class="post-inner">
      <div class="post-media-wrapper">
        ${
          post.media_url
            ? isVideo
              ? `<video src="${post.media_url}" muted loop playsinline></video>`
              : `<img src="${post.media_url}" alt="Media" />`
            : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">No media</div>`
        }
        <div class="post-overlay">
          <div class="post-author">
            <div class="post-author-avatar" style="background-image:url('${
              post.author.avatar_url || ""
            }');"></div>
            <div class="post-author-names">
              <span class="post-author-display">${post.author.display_name}</span>
              <span class="post-author-username">@${post.author.username}</span>
            </div>
          </div>
          <div class="post-content-text">${post.content || ""}</div>
        </div>
      </div>
      <div class="post-actions">
        <div class="action-btn">
          <div class="action-icon">❤️</div>
          <span>Like</span>
        </div>
        <div class="action-btn">
          <div class="action-icon">💬</div>
          <span>Comment</span>
        </div>
        <div class="action-btn">
          <div class="action-icon">↗</div>
          <span>Share</span>
        </div>
      </div>
    </div>
  `;

  // Autoplay when in view
  const video = wrapper.querySelector("video");
  if (video) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 }
    );
    observer.observe(video);
  }

  return wrapper;
}

// ====== PROFILE / CREATE POST UI ======
function renderUserControls() {
  userControls.innerHTML = "";
  if (!currentUser) {
    const loginBtn = document.createElement("button");
    loginBtn.className = "secondary-btn";
    loginBtn.textContent = "Log in";
    loginBtn.onclick = () => openAuthModal("login");

    const registerBtn = document.createElement("button");
    registerBtn.className = "primary-btn";
    registerBtn.textContent = "Sign up";
    registerBtn.onclick = () => openAuthModal("register");

    userControls.appendChild(loginBtn);
    userControls.appendChild(registerBtn);
  } else {
    const avatarBtn = document.createElement("button");
    avatarBtn.className = "text-btn";
    avatarBtn.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:6px;">
        <span style="width:26px;height:26px;border-radius:50%;background-size:cover;background-position:center;border:1px solid rgba(255,255,255,0.4);background-image:url('${
          currentUser.avatar_url || ""
        }');"></span>
        <span>@${currentUser.username}</span>
      </span>
    `;
    avatarBtn.onclick = () => showToast("Profile editing is in the left panel.");

    const logoutBtn = document.createElement("button");
    logoutBtn.className = "secondary-btn";
    logoutBtn.textContent = "Log out";
    logoutBtn.onclick = () => {
      setAuthToken(null);
      currentUser = null;
      renderUserControls();
      renderProfileCard();
      renderCreatePostCard();
      showToast("Logged out");
    };

    userControls.appendChild(avatarBtn);
    userControls.appendChild(logoutBtn);
  }
}

function renderProfileCard() {
  if (!currentUser) {
    profileCard.innerHTML = `<p class="muted">Log in to see and edit your profile.</p>`;
    return;
  }

  profileCard.innerHTML = `
    <div class="profile-header">
      <div class="profile-banner" style="background-image:url('${
        currentUser.banner_url || ""
      }');"></div>
      <div class="profile-avatar" style="background-image:url('${
        currentUser.avatar_url || ""
      }');"></div>
    </div>
    <div class="profile-main">
      <h2>${currentUser.display_name}</h2>
      <div class="username">@${currentUser.username}</div>
      <p class="profile-bio">${currentUser.bio || "No bio yet."}</p>
      <button id="editProfileBtn" class="secondary-btn" style="margin-top:8px;">Edit profile</button>
    </div>
  `;

  document
    .getElementById("editProfileBtn")
    .addEventListener("click", openProfileEditor);
}

function renderCreatePostCard() {
  if (!currentUser) {
    createPostCard.innerHTML = "";
    return;
  }

  createPostCard.innerHTML = `
    <h3>Create post</h3>
    <textarea id="postContent" rows="2" placeholder="Say something..."></textarea>
    <input id="postMediaUrl" type="text" placeholder="Media URL (image or video, optional)" />
    <div class="create-post-footer">
      <span class="muted">Use .mp4 links for TikTok-style video.</span>
      <button id="submitPostBtn" class="primary-btn">Post</button>
    </div>
  `;

  document
    .getElementById("submitPostBtn")
    .addEventListener("click", handleCreatePost);
}

async function handleCreatePost() {
  const content = document.getElementById("postContent").value.trim();
  const mediaUrl = document.getElementById("postMediaUrl").value.trim();

  if (!content && !mediaUrl) {
    showToast("Add some text or a media URL.");
    return;
  }

  try {
    await apiRequest("/posts", {
      method: "POST",
      body: JSON.stringify({ content, media_url: mediaUrl }),
    });
    document.getElementById("postContent").value = "";
    document.getElementById("postMediaUrl").value = "";
    showToast("Posted");
    loadFeed();
  } catch (err) {
    showToast(err.message);
  }
}

// Very simple profile edit (local only for now; backend endpoints can be added later)
function openProfileEditor() {
  if (!currentUser) return;
  const bio = prompt("Bio:", currentUser.bio || "");
  if (bio === null) return;
  currentUser.bio = bio;
  renderProfileCard();
  showToast("Bio updated (local only – can wire to backend later).");
}

// ====== EVENT LISTENERS ======
loginTab.addEventListener("click", () => openAuthModal("login"));
registerTab.addEventListener("click", () => openAuthModal("register"));
closeAuthModalBtn.addEventListener("click", closeAuthModal);

loginBtn.addEventListener("click", handleLogin);
registerBtn.addEventListener("click", handleRegister);

authModal.addEventListener("click", (e) => {
  if (e.target === authModal) closeAuthModal();
});

// Simple search placeholder
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    showToast("Search is cosmetic for now – backend search can be added.");
  }
});

// ====== INIT ======
(async function init() {
  await fetchCurrentUser();
  await loadFeed();
})();
