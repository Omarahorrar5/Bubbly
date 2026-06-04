-- Bubbly PostgreSQL Database Schema

-- Enable UUID extension if we want it, though we are using SERIAL ids
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    sex VARCHAR(50) NOT NULL,
    age INTEGER NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bubbles Table
CREATE TABLE IF NOT EXISTS bubbles (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    visibility VARCHAR(50) DEFAULT 'public',
    max_members INTEGER DEFAULT 10,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bubble Members Table
CREATE TABLE IF NOT EXISTS bubble_members (
    bubble_id INTEGER REFERENCES bubbles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- 'owner', 'member'
    status VARCHAR(50) DEFAULT 'joined', -- 'joined', 'left'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (bubble_id, user_id)
);

-- 4. Friendships Table
CREATE TABLE IF NOT EXISTS friendships (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id),
    CONSTRAINT chk_friendship_self CHECK (user_id <> friend_id)
);

-- 5. Interests Table
CREATE TABLE IF NOT EXISTS interests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL
);

-- 6. User Interests Table
CREATE TABLE IF NOT EXISTS user_interests (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    interest_id INTEGER REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, interest_id)
);

-- 7. Bubble Interests Table
CREATE TABLE IF NOT EXISTS bubble_interests (
    bubble_id INTEGER REFERENCES bubbles(id) ON DELETE CASCADE,
    interest_id INTEGER REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (bubble_id, interest_id)
);

-- 8. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    bubble_id INTEGER REFERENCES bubbles(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. User-Bubble Interactions Table (for recommendation system tracking)
CREATE TABLE IF NOT EXISTS user_bubble_interactions (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    bubble_id INTEGER REFERENCES bubbles(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'join', 'view', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, bubble_id, action)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bubbles_status ON bubbles(status);
CREATE INDEX IF NOT EXISTS idx_bubble_members_user ON bubble_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_bubble ON messages(bubble_id);
CREATE INDEX IF NOT EXISTS idx_user_bubble_interactions_user_bubble ON user_bubble_interactions(user_id, bubble_id);

-- Seed Interests data
INSERT INTO interests (name, category) VALUES
  -- Sports
  ('Football', 'Sports'),
  ('Basketball', 'Sports'),
  ('Tennis', 'Sports'),
  ('Swimming', 'Sports'),
  ('Running', 'Sports'),
  ('Cycling', 'Sports'),
  ('Gym & Fitness', 'Sports'),
  -- Music
  ('Pop Music', 'Music'),
  ('Rock Music', 'Music'),
  ('Hip Hop', 'Music'),
  ('Jazz', 'Music'),
  ('Electronic Music', 'Music'),
  ('Classical Music', 'Music'),
  -- Gaming
  ('PC Gaming', 'Gaming'),
  ('Console Gaming', 'Gaming'),
  ('Board Games', 'Gaming'),
  ('RPGs', 'Gaming'),
  ('FPS Games', 'Gaming'),
  ('Strategy Games', 'Gaming'),
  -- Creative
  ('Painting', 'Creative'),
  ('Drawing', 'Creative'),
  ('Writing', 'Creative'),
  ('Photography', 'Creative'),
  ('Cooking', 'Creative'),
  ('Baking', 'Creative'),
  ('DIY & Crafting', 'Creative'),
  -- Tech
  ('Coding', 'Tech'),
  ('Artificial Intelligence', 'Tech'),
  ('Robotics', 'Tech'),
  ('Web Development', 'Tech'),
  ('Mobile Apps', 'Tech'),
  -- Lifestyle
  ('Traveling', 'Lifestyle'),
  ('Hiking', 'Lifestyle'),
  ('Reading', 'Lifestyle'),
  ('Gardening', 'Lifestyle'),
  ('Yoga', 'Lifestyle'),
  ('Meditating', 'Lifestyle')
ON CONFLICT (name) DO NOTHING;



