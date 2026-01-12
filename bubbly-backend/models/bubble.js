const { query } = require('../utils/database');

class Bubble {
  static async create({
    ownerId,
    title,
    visibility = 'public',
    maxMembers,
    latitude,
    longitude,
    status = 'open'
  }) {
    const result = await query(
      `INSERT INTO bubbles (owner_id, title, visibility, max_members, latitude, longitude, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [ownerId, title, visibility, maxMembers, latitude, longitude, status]
    );

    const bubble = result.rows[0];

    // Add owner as member
    await query(
      `INSERT INTO bubble_members (bubble_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'joined')`,
      [bubble.id, ownerId]
    );

    return bubble;
  }

  static async findById(id) {
    const result = await query(`
      SELECT b.*, u.name as owner_name
      FROM bubbles b
      JOIN users u ON b.owner_id = u.id
      WHERE b.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async findAll({ status, userId } = {}) {
    let whereClause = '';
    let params = [];

    if (status) {
      whereClause = 'WHERE b.status = $1';
      params.push(status);
    }

    // If userId is provided, check if user has joined the bubble
    if (userId && !status) {
      whereClause = `WHERE EXISTS (
        SELECT 1 FROM bubble_members 
        WHERE bubble_id = b.id AND user_id = $1 AND status = 'joined'
      )`;
      params.push(userId);
    } else if (userId && status) {
      whereClause = `WHERE b.status = $1 AND EXISTS (
        SELECT 1 FROM bubble_members 
        WHERE bubble_id = b.id AND user_id = $2 AND status = 'joined'
      )`;
      params.push(status, userId);
    }

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
      ${whereClause}
      GROUP BY b.id, u.name
      ORDER BY b.created_at DESC
    `, params);

    return result.rows;
  }

  static async findOpenBubbles() {
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
      GROUP BY b.id, u.name
      ORDER BY b.created_at DESC
    `);
    return result.rows;
  }

  static async findClosedBubbles() {
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
      WHERE b.status = 'closed'
      GROUP BY b.id, u.name
      ORDER BY b.created_at DESC
    `);
    return result.rows;
  }

  static async joinBubble(userId, bubbleId) {
    // Check if already joined
    const existing = await query(
      'SELECT * FROM bubble_members WHERE user_id = $1 AND bubble_id = $2',
      [userId, bubbleId]
    );

    if (existing.rows.length > 0) {
      // Update status to joined
      await query(
        `UPDATE bubble_members 
         SET status = 'joined', joined_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND bubble_id = $2`,
        [userId, bubbleId]
      );
    } else {
      // Add as member
      await query(
        `INSERT INTO bubble_members (bubble_id, user_id, role, status)
         VALUES ($1, $2, 'member', 'joined')`,
        [bubbleId, userId]
      );
    }

    // Record interaction
    await query(
      `INSERT INTO user_bubble_interactions (user_id, bubble_id, action)
       VALUES ($1, $2, 'join')
       ON CONFLICT (user_id, bubble_id, action) DO NOTHING`,
      [userId, bubbleId]
    );

    // Also record view if not already
    await query(
      `INSERT INTO user_bubble_interactions (user_id, bubble_id, action)
       VALUES ($1, $2, 'view')
       ON CONFLICT (user_id, bubble_id, action) DO NOTHING`,
      [userId, bubbleId]
    );

    return true;
  }

  static async leaveBubble(userId, bubbleId) {
    await query(
      `UPDATE bubble_members 
       SET status = 'left'
       WHERE user_id = $1 AND bubble_id = $2`,
      [userId, bubbleId]
    );
    return true;
  }

  static async getMembers(bubbleId) {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.sex, u.age, bm.role, bm.joined_at
      FROM bubble_members bm
      JOIN users u ON bm.user_id = u.id
      WHERE bm.bubble_id = $1 AND bm.status = 'joined'
      ORDER BY 
        CASE WHEN bm.role = 'owner' THEN 1 ELSE 2 END,
        bm.joined_at
    `, [bubbleId]);
    return result.rows;
  }

  static async addInterests(bubbleId, interestIds) {
    for (const interestId of interestIds) {
      await query(
        `INSERT INTO bubble_interests (bubble_id, interest_id)
         VALUES ($1, $2)
         ON CONFLICT (bubble_id, interest_id) DO NOTHING`,
        [bubbleId, interestId]
      );
    }
    return true;
  }

  static async getInterests(bubbleId) {
    const result = await query(`
      SELECT i.*
      FROM bubble_interests bi
      JOIN interests i ON bi.interest_id = i.id
      WHERE bi.bubble_id = $1
    `, [bubbleId]);
    return result.rows;
  }

  static async updateStatus(bubbleId, status) {
    const result = await query(
      'UPDATE bubbles SET status = $1 WHERE id = $2 RETURNING *',
      [status, bubbleId]
    );
    return result.rows[0];
  }

  static async isMember(userId, bubbleId) {
    const result = await query(
      `SELECT * FROM bubble_members 
       WHERE user_id = $1 AND bubble_id = $2 AND status = 'joined'`,
      [userId, bubbleId]
    );
    return result.rows.length > 0;
  }
}

module.exports = Bubble;