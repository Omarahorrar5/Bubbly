const Bubble = require('../models/bubble');

class BubbleController {
  static async createBubble(req, res) {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const {
        title,
        visibility = 'public',
        maxMembers,
        latitude,
        longitude,
        interestIds = []
      } = req.body;

      // Validate required fields
      if (!title || !latitude || !longitude) {
        return res.status(400).json({
          error: 'Title, latitude, and longitude are required'
        });
      }

      const bubble = await Bubble.create({
        ownerId: userId,
        title,
        visibility,
        maxMembers: maxMembers || 10,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        status: 'open'
      });

      // Add interests if provided
      if (interestIds.length > 0) {
        await Bubble.addInterests(bubble.id, interestIds);
      }

      res.status(201).json({
        success: true,
        bubble,
        message: 'Bubble created successfully'
      });

    } catch (error) {
      console.error('Create bubble error:', error);
      res.status(500).json({ error: 'Failed to create bubble' });
    }
  }

  static async getBubbles(req, res) {
    try {
      const { status } = req.query;
      const userId = req.session.userId;

      let bubbles;

      if (status === 'open') {
        bubbles = await Bubble.findOpenBubbles();
      } else if (status === 'closed') {
        bubbles = await Bubble.findClosedBubbles();
      } else {
        // 'All' returns all bubbles regardless of status or user membership
        bubbles = await Bubble.findAll();
      }

      res.json({ bubbles });
    } catch (error) {
      console.error('Get bubbles error:', error);
      res.status(500).json({ error: 'Failed to fetch bubbles' });
    }
  }

  static async getBubble(req, res) {
    try {
      const { id } = req.params;
      const bubble = await Bubble.findById(id);

      if (!bubble) {
        return res.status(404).json({ error: 'Bubble not found' });
      }

      // Get additional details
      const [members, interests] = await Promise.all([
        Bubble.getMembers(id),
        Bubble.getInterests(id)
      ]);

      res.json({
        bubble: {
          ...bubble,
          members,
          interests
        }
      });
    } catch (error) {
      console.error('Get bubble error:', error);
      res.status(500).json({ error: 'Failed to fetch bubble' });
    }
  }

  static async joinBubble(req, res) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if bubble exists
      const bubble = await Bubble.findById(id);
      if (!bubble) {
        return res.status(404).json({ error: 'Bubble not found' });
      }

      // Check if bubble is open
      if (bubble.status !== 'open') {
        return res.status(400).json({ error: 'Bubble is not open for joining' });
      }

      // Check if bubble is full
      const members = await Bubble.getMembers(id);
      if (bubble.max_members && members.length >= bubble.max_members) {
        return res.status(400).json({ error: 'Bubble is full' });
      }

      await Bubble.joinBubble(userId, id);

      res.json({
        success: true,
        message: 'Successfully joined the bubble'
      });
    } catch (error) {
      console.error('Join bubble error:', error);
      res.status(500).json({ error: 'Failed to join bubble' });
    }
  }

  static async leaveBubble(req, res) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await Bubble.leaveBubble(userId, id);

      res.json({
        success: true,
        message: 'Successfully left the bubble'
      });
    } catch (error) {
      console.error('Leave bubble error:', error);
      res.status(500).json({ error: 'Failed to leave bubble' });
    }
  }

  static async getMyBubbles(req, res) {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get bubbles where user is a member
      const bubbles = await Bubble.findAll({ userId });

      res.json({ bubbles });
    } catch (error) {
      console.error('Get my bubbles error:', error);
      res.status(500).json({ error: 'Failed to fetch your bubbles' });
    }
  }

  static async closeBubble(req, res) {
    try {
      const userId = req.session.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const bubble = await Bubble.findById(id);

      if (!bubble) {
        return res.status(404).json({ error: 'Bubble not found' });
      }

      // Check if user is the owner
      if (bubble.owner_id !== userId) {
        return res.status(403).json({ error: 'Only the owner can close the bubble' });
      }

      const updatedBubble = await Bubble.updateStatus(id, 'closed');

      res.json({
        success: true,
        bubble: updatedBubble,
        message: 'Bubble closed successfully'
      });
    } catch (error) {
      console.error('Close bubble error:', error);
      res.status(500).json({ error: 'Failed to close bubble' });
    }
  }
}

module.exports = BubbleController;