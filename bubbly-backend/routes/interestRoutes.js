const express = require('express');
const router = express.Router();
const InterestController = require('../controllers/interestController');

// Get all interests
router.get('/', InterestController.getAllInterests);

// Get all categories
router.get('/categories', InterestController.getCategories);

// Get interests by category
router.get('/category/:category', InterestController.getInterestsByCategory);

module.exports = router;