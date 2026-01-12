const { query } = require('../utils/database');

class Interest {
  static async findAll() {
    const result = await query('SELECT * FROM interests ORDER BY category, name');
    return result.rows;
  }

  static async findByCategory(category) {
    const result = await query(
      'SELECT * FROM interests WHERE category = $1 ORDER BY name',
      [category]
    );
    return result.rows;
  }

  static async findByIds(ids) {
    if (ids.length === 0) return [];
    const result = await query(
      `SELECT * FROM interests WHERE id IN (${ids.map((_, i) => `$${i + 1}`).join(',')})`,
      ids
    );
    return result.rows;
  }

  static async getCategories() {
    const result = await query(
      'SELECT DISTINCT category FROM interests ORDER BY category'
    );
    return result.rows.map(row => row.category);
  }
}

module.exports = Interest;