const { query } = require('../utils/database');

class User {
  static async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query('SELECT id, name, email, sex, age, latitude, longitude, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async getBubbles(userId) {
    const result = await query(`
      SELECT b.* 
      FROM bubbles b
      JOIN bubble_members bm ON b.id = bm.bubble_id
      WHERE bm.user_id = $1 AND bm.status = 'joined'
    `, [userId]);
    return result.rows;
  }

  static async getFriends(userId) {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.sex, u.age
      FROM friendships f
      JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id)
      WHERE (f.user_id = $1 OR f.friend_id = $1) 
        AND u.id != $1
    `, [userId]);
    return result.rows;
  }

  static async create(name, email, password, sex, age) {
    const result = await query(
      `INSERT INTO users (name, email, password, sex, age, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id, name, email, sex, age, created_at`,
      [name, email, password, sex, age]
    );
    return result.rows[0];
  }

  static async addInterests(userId, interestIds) {
    if (!interestIds || interestIds.length === 0) return [];

    const values = interestIds.map((id, i) => `($1, $${i + 2})`).join(', ');
    const params = [userId, ...interestIds];

    await query(
      `INSERT INTO user_interests (user_id, interest_id) VALUES ${values}
       ON CONFLICT (user_id, interest_id) DO NOTHING`,
      params
    );
    return interestIds;
  }
}

module.exports = User;