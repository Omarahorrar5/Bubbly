const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');

// Send message to a bubble (requires auth)
router.post('/:bubbleId', requireAuth, MessageController.sendMessage);

// Get messages from a bubble (requires auth)
router.get('/:bubbleId', requireAuth, MessageController.getBubbleMessages);

// Get recent messages from user's bubbles (requires auth)
router.get('/', requireAuth, MessageController.getRecentMessages);

module.exports = router;