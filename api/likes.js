import fs from 'fs';
import path from 'path';

const LIKES_FILE = path.join(process.cwd(), 'data', 'likes.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read likes data
function readLikes() {
  ensureDataDir();
  if (!fs.existsSync(LIKES_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(LIKES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading likes file:', error);
    return {};
  }
}

// Write likes data
function writeLikes(likes) {
  ensureDataDir();
  try {
    fs.writeFileSync(LIKES_FILE, JSON.stringify(likes, null, 2));
  } catch (error) {
    console.error('Error writing likes file:', error);
  }
}

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Return all likes
    const likes = readLikes();
    res.status(200).json(likes);
    return;
  }

  if (req.method === 'POST') {
    try {
      const { postId, action, userId } = req.body;
      
      if (!postId || !action) {
        return res.status(400).json({ error: 'Missing postId or action' });
      }

      const likes = readLikes();
      
      if (!likes[postId]) {
        likes[postId] = { count: 0, likedBy: [] };
      }

      // Generate a simple user ID if not provided (based on IP or random)
      const currentUserId = userId || req.headers['x-forwarded-for'] || 'anonymous';

      if (action === 'like') {
        // Only increment if this user hasn't liked it before
        if (!likes[postId].likedBy.includes(currentUserId)) {
          likes[postId].count += 1;
          likes[postId].likedBy.push(currentUserId);
        }
      } else if (action === 'unlike') {
        // Only decrement if this user has liked it before
        const userIndex = likes[postId].likedBy.indexOf(currentUserId);
        if (userIndex > -1) {
          likes[postId].count = Math.max(0, likes[postId].count - 1);
          likes[postId].likedBy.splice(userIndex, 1);
        }
      }

      writeLikes(likes);
      
      res.status(200).json({ 
        success: true, 
        postId, 
        count: likes[postId].count,
        liked: likes[postId].likedBy.includes(currentUserId)
      });
    } catch (error) {
      console.error('Error handling like:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
} 