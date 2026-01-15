const User = require('../models/user');

class AuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await User.findByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Simple password check (in production, use hashed passwords)
      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Set session
      req.session.userId = user.id;
      req.session.userEmail = user.email;

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        user: userWithoutPassword,
        message: 'Login successful'
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ success: true, message: 'Logout successful' });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getCurrentUser(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await User.findById(req.session.userId);

      if (!user) {
        req.session.destroy();
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async register(req, res) {
    try {
      const { name, email, password, sex, age } = req.body;

      // Validation
      if (!name || !email || !password || !sex || !age) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Check if email already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Create user
      const user = await User.create(name, email, password, sex, parseInt(age));

      // Set session
      req.session.userId = user.id;
      req.session.userEmail = user.email;

      res.status(201).json({
        success: true,
        user,
        message: 'Registration successful'
      });

    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async saveInterests(req, res) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { interestIds } = req.body;

      if (!interestIds || !Array.isArray(interestIds)) {
        return res.status(400).json({ error: 'Interest IDs are required' });
      }

      await User.addInterests(req.session.userId, interestIds);

      res.json({
        success: true,
        message: 'Interests saved successfully'
      });

    } catch (error) {
      console.error('Save interests error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = AuthController;