-- Enable pgcrypto for gen_random_uuid() function if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    sex VARCHAR(50),
    age INTEGER NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bubbles Table
CREATE TABLE IF NOT EXISTS bubbles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    visibility VARCHAR(50) DEFAULT 'public',
    max_members INTEGER DEFAULT 10,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bubble Members Table
CREATE TABLE IF NOT EXISTS bubble_members (
    bubble_id UUID REFERENCES bubbles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- owner, member
    status VARCHAR(50) DEFAULT 'joined', -- joined, left
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (bubble_id, user_id)
);

-- User Bubble Interactions Table (used for recommendations ML service)
CREATE TABLE IF NOT EXISTS user_bubble_interactions (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bubble_id UUID REFERENCES bubbles(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- e.g. 'join', 'view'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, bubble_id, action)
);

-- Interests Table
CREATE TABLE IF NOT EXISTS interests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(255) NOT NULL
);

-- User Interests Table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_interests (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interest_id INTEGER REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, interest_id)
);

-- Bubble Interests Table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS bubble_interests (
    bubble_id UUID REFERENCES bubbles(id) ON DELETE CASCADE,
    interest_id INTEGER REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (bubble_id, interest_id)
);

-- Messages Table (chat messages within bubbles)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bubble_id UUID REFERENCES bubbles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Friendships Table
CREATE TABLE IF NOT EXISTS friendships (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id)
);

-- Index user queries for auth and session
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index bubble members
CREATE INDEX IF NOT EXISTS idx_bubble_members_user ON bubble_members(user_id);
CREATE INDEX IF NOT EXISTS idx_bubble_members_bubble ON bubble_members(bubble_id);

-- Index messages by bubble
CREATE INDEX IF NOT EXISTS idx_messages_bubble ON messages(bubble_id);

-- Seed Interests Data
INSERT INTO interests (name, category) VALUES
-- Sports & Outdoors
('Football', 'Sports & Outdoors'),
('Basketball', 'Sports & Outdoors'),
('Hiking', 'Sports & Outdoors'),
('Running', 'Sports & Outdoors'),
('Cycling', 'Sports & Outdoors'),
('Swimming', 'Sports & Outdoors'),
('Yoga', 'Sports & Outdoors'),

-- Arts & Entertainment
('Music', 'Arts & Entertainment'),
('Movies', 'Arts & Entertainment'),
('Painting', 'Arts & Entertainment'),
('Photography', 'Arts & Entertainment'),
('Theatre', 'Arts & Entertainment'),
('Dance', 'Arts & Entertainment'),
('Writing', 'Arts & Entertainment'),

-- Technology & Gaming
('Video Games', 'Technology & Gaming'),
('Programming', 'Technology & Gaming'),
('AI & Robotics', 'Technology & Gaming'),
('Board Games', 'Technology & Gaming'),
('Gadgets & Tech', 'Technology & Gaming'),

-- Food & Drink
('Cooking', 'Food & Drink'),
('Baking', 'Food & Drink'),
('Wine Tasting', 'Food & Drink'),
('Coffee', 'Food & Drink'),
('Dining Out', 'Food & Drink'),
('Vegan Cooking', 'Food & Drink'),

-- Lifestyle & Learning
('Reading', 'Lifestyle & Learning'),
('Languages', 'Lifestyle & Learning'),
('Travel', 'Lifestyle & Learning'),
('Gardening', 'Lifestyle & Learning'),
('Fitness', 'Lifestyle & Learning')
ON CONFLICT (name) DO NOTHING;
