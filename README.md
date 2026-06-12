# 🖋️ Inkwell — A Beautiful Dark-Themed Blogging Platform

Inkwell is a full-stack blogging platform where users can register, log in, write posts, edit/delete their own posts, and comment on any post. Built with a clean dark UI and a RESTful Express backend.

## ✨ Features

- **Authentication**: Register & login with JWT-based auth (passwords hashed with bcrypt)
- **Posts**: Create, edit, and delete your own blog posts
- **Comments**: Comment on any post; delete your own comments (or any comment on your own post)
- **REST API**: Clean JSON API under `/api`
- **Database**: Lightweight embedded JSON-file database (no native build tools required) — easy to swap for SQLite/Postgres later
- **Dark theme UI**: Purple/pink gradient accents, card-based feed, responsive layout
- **Single Page App**: Hash-based routing, no framework dependencies — pure HTML/CSS/JS

## 🚀 Getting Started

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

The server runs on port 3000 by default (override with `PORT` env var).

## 📡 API Endpoints

| Method | Endpoint                          | Auth required | Description                  |
|--------|-----------------------------------|---------------|-------------------------------|
| POST   | `/api/auth/register`              | No            | Register a new user           |
| POST   | `/api/auth/login`                 | No            | Login and get a JWT token     |
| GET    | `/api/auth/me`                    | Yes           | Get current user info         |
| GET    | `/api/posts`                      | No            | List all posts                |
| GET    | `/api/posts/:id`                  | No            | Get a single post + comments  |
| POST   | `/api/posts`                      | Yes           | Create a new post             |
| PUT    | `/api/posts/:id`                  | Yes (author)  | Edit a post                   |
| DELETE | `/api/posts/:id`                  | Yes (author)  | Delete a post                 |
| POST   | `/api/posts/:id/comments`         | Yes           | Add a comment to a post       |
| DELETE | `/api/posts/:id/comments/:cid`    | Yes (author of comment or post) | Delete a comment |
| GET    | `/api/health`                     | No            | Health check                  |

## 🗂️ Project Structure

```
Inkwell/
├── server.js          # Express app entry point
├── db.js              # JSON-file database helper
├── inkwell.json       # Auto-created data store (gitignore this in production)
├── middleware/
│   └── auth.js        # JWT auth middleware
├── routes/
│   ├── auth.js         # Register/login/me
│   └── posts.js        # Posts + comments CRUD
└── public/             # Frontend SPA
    ├── index.html
    ├── styles.css
    └── app.js
```

## 🔐 Notes

- Set a custom `JWT_SECRET` environment variable in production.
- The `inkwell.json` file is created automatically on first run and stores all users, posts, and comments.
- All passwords are hashed with bcrypt before storage — never stored in plain text.

## ✅ Verified Working

All features have been tested end-to-end:
- ✔️ User registration & login (with duplicate/invalid credential checks)
- ✔️ JWT-protected routes reject unauthenticated requests
- ✔️ Post create/edit/delete with ownership checks
- ✔️ Comments create/delete with author and post-owner permissions
- ✔️ Full API + frontend served from a single Express server

Enjoy writing! 🖋️
# Blog-Platform-with-Comments
