const express = require('express');
const router = express.Router();
const RecommendationController = require('../controllers/recommendationController');

// Get personalized bubble recommendations for authenticated user
router.get('/', RecommendationController.getRecommendations);

// Trigger model training (could be protected as admin-only)
router.post('/train', RecommendationController.trainModel);

// Check ML service health
router.get('/health', RecommendationController.getHealth);

module.exports = router;
