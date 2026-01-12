const { query } = require('../utils/database');

class Message {
  static async create({ bubbleId, senderId, content }) {
    const result = await query(
      `INSERT INTO messages (bubble_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [bubbleId, senderId, content]
    );
    return result.rows[0];
  }

  static async findByBubbleId(bubbleId) {
    const result = await query(`
      SELECT m.*, u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.bubble_id = $1
      ORDER BY m.created_at ASC
    `, [bubbleId]);
    return result.rows;
  }

  static async getRecentMessages(userId, limit = 20) {
    const result = await query(`
      SELECT m.*, u.name as sender_name, b.title as bubble_title
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      JOIN bubbles b ON m.bubble_id = b.id
      WHERE m.bubble_id IN (
        SELECT bubble_id FROM bubble_members 
        WHERE user_id = $1 AND status = 'joined'
      )
      ORDER BY m.created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }
}

module.exports = Message;