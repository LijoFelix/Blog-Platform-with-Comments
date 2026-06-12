// ============ Inkwell Frontend ============
const API = '/api';

const state = {
  token: localStorage.getItem('inkwell_token') || null,
  user: JSON.parse(localStorage.getItem('inkwell_user') || 'null'),
};

const app = document.getElementById('app');
const navLinks = document.getElementById('nav-links');

// ---------- Helpers ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function timeAgo(dateStr) {
  const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function initials(name) {
  return name.slice(0, 2).toUpperCase();
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(API + path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function setAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('inkwell_token', token);
  localStorage.setItem('inkwell_user', JSON.stringify(user));
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('inkwell_token');
  localStorage.removeItem('inkwell_user');
  navigate('login');
}

// ---------- Router ----------
function navigate(route) {
  window.location.hash = route;
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);

function currentRoute() {
  const hash = window.location.hash.slice(1) || 'home';
  const [route, param] = hash.split('/');
  return { route, param };
}

// ---------- Nav ----------
function renderNav() {
  if (state.user) {
    navLinks.innerHTML = `
      <a href="#home">Home</a>
      <a href="#new-post">Write</a>
      <span style="color:var(--text-dim); font-size:14px;">Hi, <strong style="color:var(--text)">${escapeHtml(state.user.username)}</strong></span>
      <button class="btn btn-sm" id="logout-btn">Logout</button>
    `;
    document.getElementById('logout-btn').onclick = logout;
  } else {
    navLinks.innerHTML = `
      <a href="#home">Home</a>
      <a href="#login">Login</a>
      <a href="#register">Register</a>
    `;
  }
}

// ---------- Main Render ----------
async function render() {
  renderNav();
  const { route, param } = currentRoute();

  if (route === 'home') return renderHome();
  if (route === 'login') return renderLogin();
  if (route === 'register') return renderRegister();
  if (route === 'new-post') return renderEditor();
  if (route === 'edit-post') return renderEditor(param);
  if (route === 'post') return renderPostDetail(param);

  renderHome();
}

// ---------- Home: Post Feed ----------
async function renderHome() {
  app.innerHTML = `
    <div class="page-header">
      <div>
        <h1>The Feed</h1>
        <p class="subtitle">Fresh thoughts from the Inkwell community</p>
      </div>
      ${state.user ? `<button class="btn btn-primary" onclick="navigate('new-post')">✏️ New Post</button>` : ''}
    </div>
    <div id="posts-list"><div class="spinner"></div></div>
  `;

  try {
    const posts = await api('/posts');
    const list = document.getElementById('posts-list');
    if (posts.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="icon">📭</div>
          <p>No posts yet. ${state.user ? 'Be the first to share something!' : 'Login to start writing.'}</p>
        </div>`;
      return;
    }
    list.innerHTML = posts.map(postCardHtml).join('');
  } catch (e) {
    document.getElementById('posts-list').innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
  }
}

function postCardHtml(p) {
  const excerpt = p.content.length > 280 ? p.content.slice(0, 280) + '…' : p.content;
  const isAuthor = state.user && state.user.id === p.author_id;
  return `
    <div class="post-card">
      <h2 onclick="navigate('post/${p.id}')">${escapeHtml(p.title)}</h2>
      <div class="post-meta">
        <div class="avatar">${initials(p.author_name)}</div>
        <span>${escapeHtml(p.author_name)}</span>
        <span class="dot">•</span>
        <span>${timeAgo(p.created_at)}</span>
        <span class="dot">•</span>
        <span class="tag">💬 ${p.comment_count}</span>
      </div>
      <p class="post-excerpt">${escapeHtml(excerpt)}</p>
      <div class="post-actions">
        <button class="btn btn-sm" onclick="navigate('post/${p.id}')">Read more →</button>
        ${isAuthor ? `
          <button class="btn btn-sm" onclick="navigate('edit-post/${p.id}')">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deletePost(${p.id})">Delete</button>
        ` : ''}
      </div>
    </div>
  `;
}

async function deletePost(id) {
  if (!confirm('Delete this post permanently?')) return;
  try {
    await api(`/posts/${id}`, { method: 'DELETE' });
    renderHome();
  } catch (e) {
    alert(e.message);
  }
}

// ---------- Post Detail ----------
async function renderPostDetail(id) {
  app.innerHTML = `<div class="spinner"></div>`;
  try {
    const post = await api(`/posts/${id}`);
    const isAuthor = state.user && state.user.id === post.author_id;

    app.innerHTML = `
      <a class="back-link" href="#home">← Back to feed</a>
      <div class="card post-detail">
        <div class="post-meta">
          <div class="avatar">${initials(post.author_name)}</div>
          <span>${escapeHtml(post.author_name)}</span>
          <span class="dot">•</span>
          <span>${timeAgo(post.created_at)}</span>
          ${post.updated_at !== post.created_at ? '<span class="dot">•</span><span>edited</span>' : ''}
        </div>
        <h1>${escapeHtml(post.title)}</h1>
        <div class="content">${escapeHtml(post.content)}</div>
        ${isAuthor ? `
          <div class="post-actions">
            <button class="btn btn-sm" onclick="navigate('edit-post/${post.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id})">Delete</button>
          </div>
        ` : ''}

        <hr class="divider" />

        <h3>💬 Comments (${post.comments.length})</h3>
        <div id="comments-list">
          ${post.comments.length === 0
            ? '<p style="color:var(--text-dim); font-size:14px;">No comments yet. Start the conversation!</p>'
            : post.comments.map(c => commentHtml(c, post)).join('')}
        </div>

        ${state.user ? `
          <div class="comment-form">
            <div class="avatar">${initials(state.user.username)}</div>
            <div style="flex:1;">
              <textarea id="comment-input" placeholder="Add a comment..."></textarea>
              <div style="margin-top:8px;">
                <button class="btn btn-primary btn-sm" onclick="postComment(${post.id})">Post Comment</button>
              </div>
              <div id="comment-error"></div>
            </div>
          </div>
        ` : `
          <p style="margin-top:20px; color:var(--text-dim); font-size:14px;">
            <a href="#login">Login</a> to leave a comment.
          </p>
        `}
      </div>
    `;
  } catch (e) {
    app.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
  }
}

function commentHtml(c, post) {
  const canDelete = state.user && (state.user.id === c.author_id || state.user.id === post.author_id);
  return `
    <div class="comment">
      <div class="avatar">${initials(c.author_name)}</div>
      <div class="comment-body">
        <div class="comment-head">
          <span class="comment-author">${escapeHtml(c.author_name)}</span>
          <span class="comment-time">${timeAgo(c.created_at)}</span>
        </div>
        <div class="comment-text">${escapeHtml(c.content)}</div>
        ${canDelete ? `<button class="btn btn-sm btn-danger" style="margin-top:8px;" onclick="deleteComment(${post.id}, ${c.id})">Delete</button>` : ''}
      </div>
    </div>
  `;
}

async function postComment(postId) {
  const input = document.getElementById('comment-input');
  const content = input.value.trim();
  const errBox = document.getElementById('comment-error');
  errBox.innerHTML = '';
  if (!content) return;
  try {
    await api(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) });
    input.value = '';
    renderPostDetail(postId);
  } catch (e) {
    errBox.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
  }
}

async function deleteComment(postId, commentId) {
  if (!confirm('Delete this comment?')) return;
  try {
    await api(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
    renderPostDetail(postId);
  } catch (e) {
    alert(e.message);
  }
}

// ---------- Editor (create / edit) ----------
async function renderEditor(id) {
  if (!state.user) return navigate('login');

  let post = { title: '', content: '' };
  if (id) {
    try {
      post = await api(`/posts/${id}`);
      if (post.author_id !== state.user.id) {
        app.innerHTML = `<div class="alert alert-error">You are not authorized to edit this post.</div>`;
        return;
      }
    } catch (e) {
      app.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
      return;
    }
  }

  app.innerHTML = `
    <div class="page-header">
      <h1>${id ? '✏️ Edit Post' : '📝 New Post'}</h1>
    </div>
    <div class="card">
      <div id="editor-error"></div>
      <div class="form-group">
        <label>Title</label>
        <input id="post-title" type="text" placeholder="Give your post a title..." value="${escapeHtml(post.title)}" />
      </div>
      <div class="form-group">
        <label>Content</label>
        <textarea id="post-content" rows="10" placeholder="Write your story...">${escapeHtml(post.content)}</textarea>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-primary" id="save-btn">${id ? 'Save Changes' : 'Publish Post'}</button>
        <button class="btn" onclick="navigate('home')">Cancel</button>
      </div>
    </div>
  `;

  document.getElementById('save-btn').onclick = async () => {
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const errBox = document.getElementById('editor-error');
    errBox.innerHTML = '';

    if (!title || !content) {
      errBox.innerHTML = `<div class="alert alert-error">Title and content are required.</div>`;
      return;
    }

    try {
      if (id) {
        await api(`/posts/${id}`, { method: 'PUT', body: JSON.stringify({ title, content }) });
        navigate(`post/${id}`);
      } else {
        const newPost = await api('/posts', { method: 'POST', body: JSON.stringify({ title, content }) });
        navigate(`post/${newPost.id}`);
      }
    } catch (e) {
      errBox.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
    }
  };
}

// ---------- Auth Pages ----------
function renderLogin() {
  if (state.user) return navigate('home');
  app.innerHTML = `
    <div class="card auth-card">
      <h2>Welcome back 👋</h2>
      <div id="auth-error"></div>
      <div class="form-group">
        <label>Username or Email</label>
        <input id="login-username" type="text" placeholder="yourname" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input id="login-password" type="password" placeholder="••••••••" />
      </div>
      <button class="btn btn-primary btn-block" id="login-btn">Login</button>
      <p class="auth-switch">Don't have an account? <a href="#register">Register here</a></p>
    </div>
  `;

  const submit = async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('auth-error');
    errBox.innerHTML = '';
    if (!username || !password) {
      errBox.innerHTML = `<div class="alert alert-error">Please fill in all fields.</div>`;
      return;
    }
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      setAuth(data.token, data.user);
      navigate('home');
    } catch (e) {
      errBox.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
    }
  };

  document.getElementById('login-btn').onclick = submit;
  document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
}

function renderRegister() {
  if (state.user) return navigate('home');
  app.innerHTML = `
    <div class="card auth-card">
      <h2>Join Inkwell ✨</h2>
      <div id="auth-error"></div>
      <div class="form-group">
        <label>Username</label>
        <input id="reg-username" type="text" placeholder="yourname" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input id="reg-email" type="email" placeholder="you@example.com" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input id="reg-password" type="password" placeholder="At least 6 characters" />
      </div>
      <button class="btn btn-primary btn-block" id="reg-btn">Create Account</button>
      <p class="auth-switch">Already have an account? <a href="#login">Login here</a></p>
    </div>
  `;

  document.getElementById('reg-btn').onclick = async () => {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errBox = document.getElementById('auth-error');
    errBox.innerHTML = '';

    if (!username || !email || !password) {
      errBox.innerHTML = `<div class="alert alert-error">Please fill in all fields.</div>`;
      return;
    }

    try {
      const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
      setAuth(data.token, data.user);
      navigate('home');
    } catch (e) {
      errBox.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
    }
  };
}

// Expose functions used by inline handlers
window.navigate = navigate;
window.deletePost = deletePost;
window.postComment = postComment;
window.deleteComment = deleteComment;
