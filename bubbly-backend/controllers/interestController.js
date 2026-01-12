const Interest = require('../models/interest');

class InterestController {
  static async getAllInterests(req, res) {
    try {
      const interests = await Interest.findAll();
      res.json({ interests });
    } catch (error) {
      console.error('Get interests error:', error);
      res.status(500).json({ error: 'Failed to fetch interests' });
    }
  }
  
  static async getCategories(req, res) {
    try {
      const categories = await Interest.getCategories();
      res.json({ categories });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
  
  static async getInterestsByCategory(req, res) {
    try {
      const { category } = req.params;
      const interests = await Interest.findByCategory(category);
      res.json({ interests });
    } catch (error) {
      console.error('Get interests by category error:', error);
      res.status(500).json({ error: 'Failed to fetch interests' });
    }
  }
}

module.exports = InterestController;