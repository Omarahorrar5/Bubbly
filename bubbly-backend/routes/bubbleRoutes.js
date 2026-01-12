const express = require('express');
const router = express.Router();
const BubbleController = require('../controllers/bubbleController');
const { requireAuth } = require('../middleware/auth');

// Create a new bubble (requires auth)
router.post('/', requireAuth, BubbleController.createBubble);

// Get all bubbles (filter by status query param: ?status=open|closed)
router.get('/', BubbleController.getBubbles);

// Get user's bubbles (requires auth)
router.get('/my', requireAuth, BubbleController.getMyBubbles);

// Get open bubbles for AI suggestions
router.get('/open', BubbleController.getBubbles);

// Get closed bubbles for history
router.get('/closed', BubbleController.getBubbles);

// Get specific bubble
router.get('/:id', BubbleController.getBubble);

// Join a bubble (requires auth)
router.post('/:id/join', requireAuth, BubbleController.joinBubble);

// Leave a bubble (requires auth)
router.post('/:id/leave', requireAuth, BubbleController.leaveBubble);

// Close a bubble (requires auth, owner only)
router.post('/:id/close', requireAuth, BubbleController.closeBubble);

module.exports = router;