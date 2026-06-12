const express = require('express');
const { load, save, nextId } = require('../db');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

function userMap(data) {
  const map = {};
  data.users.forEach(u => { map[u.id] = u; });
  return map;
}

function enrichPost(p, data, users) {
  const author = users[p.author_id];
  const commentCount = data.comments.filter(c => c.post_id === p.id).length;
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    created_at: p.created_at,
    updated_at: p.updated_at,
    author_id: p.author_id,
    author_name: author ? author.username : 'Unknown',
    comment_count: commentCount
  };
}

// Get all posts (with author info and comment count)
router.get('/', optionalAuth, (req, res) => {
  const data = load();
  const users = userMap(data);
  const posts = [...data.posts]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(p => enrichPost(p, data, users));
  res.json(posts);
});

// Get single post with comments
router.get('/:id', (req, res) => {
  const data = load();
  const users = userMap(data);
  const id = parseInt(req.params.id);
  const post = data.posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const comments = data.comments
    .filter(c => c.post_id === id)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map(c => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      author_id: c.author_id,
      author_name: users[c.author_id] ? users[c.author_id].username : 'Unknown'
    }));

  res.json({ ...enrichPost(post, data, users), comments });
});

// Create post
router.post('/', auth, (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  const data = load();
  const id = nextId(data, 'posts');
  const now = new Date().toISOString();
  const post = { id, title, content, author_id: req.user.id, created_at: now, updated_at: now };
  data.posts.push(post);
  save(data);

  const users = userMap(data);
  res.status(201).json(enrichPost(post, data, users));
});

// Update post
router.put('/:id', auth, (req, res) => {
  const { title, content } = req.body;
  const data = load();
  const id = parseInt(req.params.id);
  const post = data.posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.author_id !== req.user.id) return res.status(403).json({ error: 'Not authorized to edit this post' });

  if (title) post.title = title;
  if (content) post.content = content;
  post.updated_at = new Date().toISOString();
  save(data);

  const users = userMap(data);
  res.json(enrichPost(post, data, users));
});

// Delete post
router.delete('/:id', auth, (req, res) => {
  const data = load();
  const id = parseInt(req.params.id);
  const post = data.posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.author_id !== req.user.id) return res.status(403).json({ error: 'Not authorized to delete this post' });

  data.posts = data.posts.filter(p => p.id !== id);
  data.comments = data.comments.filter(c => c.post_id !== id);
  save(data);

  res.json({ message: 'Post deleted successfully' });
});

// Add comment to post
router.post('/:id/comments', auth, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment content is required' });

  const data = load();
  const postId = parseInt(req.params.id);
  const post = data.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const id = nextId(data, 'comments');
  const comment = { id, post_id: postId, author_id: req.user.id, content, created_at: new Date().toISOString() };
  data.comments.push(comment);
  save(data);

  const users = userMap(data);
  res.status(201).json({
    id: comment.id,
    content: comment.content,
    created_at: comment.created_at,
    author_id: comment.author_id,
    author_name: users[comment.author_id] ? users[comment.author_id].username : 'Unknown'
  });
});

// Delete comment
router.delete('/:postId/comments/:commentId', auth, (req, res) => {
  const data = load();
  const commentId = parseInt(req.params.commentId);
  const postId = parseInt(req.params.postId);
  const comment = data.comments.find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const post = data.posts.find(p => p.id === postId);

  // Allow deletion if user is comment author OR post author
  if (comment.author_id !== req.user.id && (!post || post.author_id !== req.user.id)) {
    return res.status(403).json({ error: 'Not authorized to delete this comment' });
  }

  data.comments = data.comments.filter(c => c.id !== commentId);
  save(data);

  res.json({ message: 'Comment deleted successfully' });
});

module.exports = router;
