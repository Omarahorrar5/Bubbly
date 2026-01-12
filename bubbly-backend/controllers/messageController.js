const Message = require('../models/message');
const Bubble = require('../models/bubble');

class MessageController {
  static async sendMessage(req, res) {
    try {
      const userId = req.session.userId;
      const { bubbleId } = req.params;
      const { content } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Message content is required' });
      }
      
      // Check if user is a member of the bubble
      const isMember = await Bubble.isMember(userId, bubbleId);
      if (!isMember) {
        return res.status(403).json({ error: 'You are not a member of this bubble' });
      }
      
      const message = await Message.create({
        bubbleId,
        senderId: userId,
        content: content.trim()
      });
      
      res.status(201).json({
        success: true,
        message,
        message: 'Message sent successfully'
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
  
  static async getBubbleMessages(req, res) {
    try {
      const userId = req.session.userId;
      const { bubbleId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if user is a member of the bubble
      const isMember = await Bubble.isMember(userId, bubbleId);
      if (!isMember) {
        return res.status(403).json({ error: 'You are not a member of this bubble' });
      }
      
      const messages = await Message.findByBubbleId(bubbleId);
      
      res.json({ messages });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }
  
  static async getRecentMessages(req, res) {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const messages = await Message.getRecentMessages(userId, 20);
      
      res.json({ messages });
    } catch (error) {
      console.error('Get recent messages error:', error);
      res.status(500).json({ error: 'Failed to fetch recent messages' });
    }
  }
}

module.exports = MessageController;