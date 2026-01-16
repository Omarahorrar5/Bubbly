const fetch = require('node-fetch');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

class RecommendationController {
    /**
     * Get recommended bubbles for the authenticated user
     */
    static async getRecommendations(req, res) {
        try {
            const userId = req.session.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            let recommendedBubbleIds = [];

            try {
                // Call ML service for predictions
                const response = await fetch(`${ML_SERVICE_URL}/predict`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, limit: 15 }),
                    timeout: 5000
                });

                if (response.ok) {
                    const data = await response.json();
                    recommendedBubbleIds = data.recommended_bubble_ids || [];
                }
            } catch (mlError) {
                console.log('ML service unavailable, falling back to interest-based ranking');
                // Fallback handled below
            }

            // Fetch bubbles based on recommendations or fallback
            const Bubble = require('../models/bubble');
            const { query } = require('../utils/database');

            let bubbles;

            if (recommendedBubbleIds.length > 0) {
                // Fetch bubbles in the order recommended by ML model
                const result = await query(`
          SELECT 
            b.*,
            u.name as owner_name,
            COUNT(bm.user_id) as member_count,
            ARRAY_AGG(DISTINCT i.name) as interests
          FROM bubbles b
          LEFT JOIN users u ON b.owner_id = u.id
          LEFT JOIN bubble_members bm ON b.id = bm.bubble_id AND bm.status = 'joined'
          LEFT JOIN bubble_interests bi ON b.id = bi.bubble_id
          LEFT JOIN interests i ON bi.interest_id = i.id
          WHERE b.id = ANY($1) AND b.status = 'open'
          GROUP BY b.id, u.name
        `, [recommendedBubbleIds]);

                // Sort by the order from ML service
                const bubbleMap = {};
                result.rows.forEach(b => { bubbleMap[b.id] = b; });
                bubbles = recommendedBubbleIds
                    .filter(id => bubbleMap[id])
                    .map(id => bubbleMap[id]);
            } else {
                // Fallback: Get bubbles sorted by interest overlap
                bubbles = await RecommendationController.getInterestBasedRecommendations(userId);
            }

            res.json({ bubbles });
        } catch (error) {
            console.error('Get recommendations error:', error);
            res.status(500).json({ error: 'Failed to get recommendations' });
        }
    }

    /**
     * Fallback: Interest-based recommendations when ML service unavailable
     */
    static async getInterestBasedRecommendations(userId) {
        const { query } = require('../utils/database');

        // Get user's interests
        const userInterestsResult = await query(
            'SELECT interest_id FROM user_interests WHERE user_id = $1',
            [userId]
        );
        const userInterestIds = userInterestsResult.rows.map(r => r.interest_id);

        // Get bubbles the user has already joined
        const joinedBubblesResult = await query(
            'SELECT bubble_id FROM bubble_members WHERE user_id = $1 AND status = \'joined\'',
            [userId]
        );
        const joinedBubbleIds = joinedBubblesResult.rows.map(r => r.bubble_id);

        if (userInterestIds.length === 0) {
            // No interests - return recent bubbles excluding owned and joined, limited to 15
            const result = await query(`
        SELECT 
          b.*,
          u.name as owner_name,
          COUNT(bm.user_id) as member_count,
          ARRAY_AGG(DISTINCT i.name) as interests
        FROM bubbles b
        LEFT JOIN users u ON b.owner_id = u.id
        LEFT JOIN bubble_members bm ON b.id = bm.bubble_id AND bm.status = 'joined'
        LEFT JOIN bubble_interests bi ON b.id = bi.bubble_id
        LEFT JOIN interests i ON bi.interest_id = i.id
        WHERE b.status = 'open' 
          AND b.owner_id != $1
          AND NOT (b.id = ANY($2))
        GROUP BY b.id, u.name
        ORDER BY b.created_at DESC
        LIMIT 15
      `, [userId, joinedBubbleIds]);
            return result.rows;
        }

        // Get bubbles with interest overlap count, excluding owned and joined, limited to 15
        const result = await query(`
      SELECT 
        b.*,
        u.name as owner_name,
        COUNT(DISTINCT bm.user_id) as member_count,
        ARRAY_AGG(DISTINCT i.name) as interests,
        COUNT(DISTINCT CASE WHEN bi.interest_id = ANY($1) THEN bi.interest_id END) as overlap_count
      FROM bubbles b
      LEFT JOIN users u ON b.owner_id = u.id
      LEFT JOIN bubble_members bm ON b.id = bm.bubble_id AND bm.status = 'joined'
      LEFT JOIN bubble_interests bi ON b.id = bi.bubble_id
      LEFT JOIN interests i ON bi.interest_id = i.id
      WHERE b.status = 'open' 
        AND b.owner_id != $2
        AND NOT (b.id = ANY($3))
      GROUP BY b.id, u.name
      ORDER BY overlap_count DESC, b.created_at DESC
      LIMIT 15
    `, [userInterestIds, userId, joinedBubbleIds]);

        return result.rows;
    }

    /**
     * Trigger model training (admin endpoint)
     */
    static async trainModel(req, res) {
        try {
            const response = await fetch(`${ML_SERVICE_URL}/train`, {
                method: 'POST',
                timeout: 60000
            });

            const data = await response.json();

            if (response.ok) {
                res.json({ success: true, message: 'Model training completed' });
            } else {
                res.status(400).json({ error: data.message || 'Training failed' });
            }
        } catch (error) {
            console.error('Train model error:', error);
            res.status(503).json({ error: 'ML service unavailable' });
        }
    }

    /**
     * Check ML service health
     */
    static async getHealth(req, res) {
        try {
            const response = await fetch(`${ML_SERVICE_URL}/health`, {
                timeout: 2000
            });

            if (response.ok) {
                const data = await response.json();
                res.json({ status: 'healthy', mlService: data });
            } else {
                res.json({ status: 'degraded', mlService: 'unavailable' });
            }
        } catch (error) {
            res.json({ status: 'degraded', mlService: 'unavailable' });
        }
    }
}

module.exports = RecommendationController;
