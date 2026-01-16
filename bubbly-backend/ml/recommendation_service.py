"""
XGBoost Bubble Recommendation Service

This service trains an XGBoost model to predict which bubbles a user will be interested in
based on interest overlap between users and bubbles.

Training data: Closed bubbles (historical data with known outcomes)
Validation data: Open bubbles
"""

import os
import pickle
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import psycopg2.extras
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'bubbly'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '')
}

# Model storage
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')
model = None
all_interest_ids = []


def get_db_connection():
    """Create a database connection."""
    return psycopg2.connect(**DB_CONFIG)


def fetch_all_interests():
    """Fetch all interest IDs from database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM interests ORDER BY id")
    interests = [row[0] for row in cursor.fetchall()]
    cursor.close()
    conn.close()
    return interests


def fetch_user_interests():
    """Fetch user interests as a dictionary {user_id: set of interest_ids}."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, interest_id FROM user_interests")
    
    user_interests = {}
    for user_id, interest_id in cursor.fetchall():
        if user_id not in user_interests:
            user_interests[user_id] = set()
        user_interests[user_id].add(interest_id)
    
    cursor.close()
    conn.close()
    return user_interests


def fetch_bubble_interests():
    """Fetch bubble interests as a dictionary {bubble_id: set of interest_ids}."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT bubble_id, interest_id FROM bubble_interests")
    
    bubble_interests = {}
    for bubble_id, interest_id in cursor.fetchall():
        if bubble_id not in bubble_interests:
            bubble_interests[bubble_id] = set()
        bubble_interests[bubble_id].add(interest_id)
    
    cursor.close()
    conn.close()
    return bubble_interests


def fetch_bubbles(status=None):
    """Fetch bubbles with optional status filter."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if status:
        cursor.execute("""
            SELECT id, owner_id, title, visibility, max_members, 
                   latitude, longitude, status, created_at,
                   (SELECT COUNT(*) FROM bubble_members WHERE bubble_id = bubbles.id AND status = 'joined') as member_count
            FROM bubbles 
            WHERE status = %s
        """, (status,))
    else:
        cursor.execute("""
            SELECT id, owner_id, title, visibility, max_members, 
                   latitude, longitude, status, created_at,
                   (SELECT COUNT(*) FROM bubble_members WHERE bubble_id = bubbles.id AND status = 'joined') as member_count
            FROM bubbles
        """)
    
    bubbles = [dict(row) for row in cursor.fetchall()]
    cursor.close()
    conn.close()
    return bubbles


def fetch_user_bubble_interactions():
    """Fetch user-bubble interactions (joins)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT user_id, bubble_id, action 
        FROM user_bubble_interactions 
        WHERE action = 'join'
    """)
    
    interactions = {}
    for user_id, bubble_id, action in cursor.fetchall():
        key = (user_id, bubble_id)
        interactions[key] = 1  # User joined this bubble
    
    cursor.close()
    conn.close()
    return interactions


def fetch_user_joined_bubbles(user_id):
    """Fetch bubble IDs that a user has already joined."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT bubble_id 
        FROM bubble_members 
        WHERE user_id = %s AND status = 'joined'
    """, (user_id,))
    
    joined_ids = set(row[0] for row in cursor.fetchall())
    cursor.close()
    conn.close()
    return joined_ids


def fetch_users():
    """Fetch all users."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cursor.execute("SELECT id, name, sex, age, created_at FROM users")
    users = [dict(row) for row in cursor.fetchall()]
    cursor.close()
    conn.close()
    return users


def compute_interest_overlap(user_interests_set, bubble_interests_set):
    """Compute Jaccard similarity between user and bubble interests."""
    if not user_interests_set or not bubble_interests_set:
        return 0.0
    
    intersection = len(user_interests_set & bubble_interests_set)
    union = len(user_interests_set | bubble_interests_set)
    
    if union == 0:
        return 0.0
    
    return intersection / union


def create_interest_vector(interest_set, all_interests):
    """Create a binary vector for interests."""
    return [1 if i in interest_set else 0 for i in all_interests]


def build_features(user_id, user_data, bubble, user_interests, bubble_interests, all_interests):
    """Build feature vector for a user-bubble pair."""
    user_interest_set = user_interests.get(user_id, set())
    bubble_interest_set = bubble_interests.get(bubble['id'], set())
    
    # Interest overlap features
    jaccard = compute_interest_overlap(user_interest_set, bubble_interest_set)
    common_interests = len(user_interest_set & bubble_interest_set)
    user_interest_count = len(user_interest_set)
    bubble_interest_count = len(bubble_interest_set)
    
    # User features
    user_age = user_data.get('age', 25) if user_data else 25
    
    # Bubble features
    member_count = bubble.get('member_count', 0)
    max_members = bubble.get('max_members', 10)
    fill_rate = member_count / max_members if max_members > 0 else 0
    
    # Days since bubble created
    created_at = bubble.get('created_at')
    if created_at:
        days_old = (datetime.now() - created_at.replace(tzinfo=None)).days
    else:
        days_old = 0
    
    features = [
        jaccard,                    # Interest similarity
        common_interests,           # Number of common interests
        user_interest_count,        # User's total interests
        bubble_interest_count,      # Bubble's total interests
        user_age,                   # User age
        member_count,               # Current members
        fill_rate,                  # How full the bubble is
        days_old,                   # Age of bubble in days
    ]
    
    return features


def generate_training_data():
    """Generate training data from closed bubbles."""
    global all_interest_ids
    
    print("Fetching data from database...")
    all_interest_ids = fetch_all_interests()
    users = fetch_users()
    user_interests = fetch_user_interests()
    bubble_interests = fetch_bubble_interests()
    closed_bubbles = fetch_bubbles('closed')
    interactions = fetch_user_bubble_interactions()
    
    print(f"Found {len(users)} users, {len(closed_bubbles)} closed bubbles")
    
    if len(closed_bubbles) == 0 or len(users) == 0:
        print("Not enough data for training")
        return None, None
    
    # Build user lookup
    user_lookup = {u['id']: u for u in users}
    
    X = []
    y = []
    
    for bubble in closed_bubbles:
        for user in users:
            user_id = user['id']
            
            # Skip if user is the owner
            if user_id == bubble['owner_id']:
                continue
            
            features = build_features(
                user_id, user, bubble, 
                user_interests, bubble_interests, all_interest_ids
            )
            
            # Label: 1 if user joined, 0 otherwise
            label = interactions.get((user_id, bubble['id']), 0)
            
            X.append(features)
            y.append(label)
    
    return np.array(X), np.array(y)


def train_model():
    """Train the XGBoost model."""
    global model, all_interest_ids
    
    X, y = generate_training_data()
    
    if X is None or len(X) == 0:
        print("No training data available")
        return False
    
    print(f"Training data shape: {X.shape}")
    print(f"Positive samples: {sum(y)}, Negative samples: {len(y) - sum(y)}")
    
    # Handle class imbalance
    pos_count = sum(y)
    neg_count = len(y) - pos_count
    scale_pos_weight = neg_count / pos_count if pos_count > 0 else 1
    
    # Split for validation
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if sum(y) > 1 else None
    )
    
    # Train XGBoost
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        use_label_encoder=False,
        eval_metric='logloss'
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_val)
    accuracy = accuracy_score(y_val, y_pred)
    
    try:
        y_proba = model.predict_proba(X_val)[:, 1]
        auc = roc_auc_score(y_val, y_proba)
        print(f"Validation Accuracy: {accuracy:.4f}, AUC: {auc:.4f}")
    except:
        print(f"Validation Accuracy: {accuracy:.4f}")
    
    # Save model
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump({
            'model': model,
            'all_interest_ids': all_interest_ids
        }, f)
    
    print(f"Model saved to {MODEL_PATH}")
    return True


def load_model():
    """Load the trained model from disk."""
    global model, all_interest_ids
    
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, 'rb') as f:
            data = pickle.load(f)
            model = data['model']
            all_interest_ids = data['all_interest_ids']
        print("Model loaded successfully")
        return True
    return False


def get_recommendations(user_id, limit=20):
    """Get bubble recommendations for a user."""
    global model, all_interest_ids
    
    if model is None:
        if not load_model():
            # Fallback to interest-based ranking
            return get_interest_based_recommendations(user_id, limit)
    
    # Fetch current data
    users = fetch_users()
    user_lookup = {u['id']: u for u in users}
    user_data = user_lookup.get(user_id)
    
    if not user_data:
        return []
    
    user_interests = fetch_user_interests()
    bubble_interests = fetch_bubble_interests()
    open_bubbles = fetch_bubbles('open')
    
    # Get bubbles the user has already joined
    joined_bubble_ids = fetch_user_joined_bubbles(user_id)
    
    if not open_bubbles:
        return []
    
    # Score each bubble
    scored_bubbles = []
    for bubble in open_bubbles:
        # Skip if user is owner
        if bubble['owner_id'] == user_id:
            continue
        
        # Skip if user has already joined this bubble
        if bubble['id'] in joined_bubble_ids:
            continue
        
        features = build_features(
            user_id, user_data, bubble,
            user_interests, bubble_interests, all_interest_ids
        )
        
        # Get prediction probability
        score = model.predict_proba([features])[0][1]
        
        scored_bubbles.append({
            'bubble': bubble,
            'score': float(score)
        })
    
    # Sort by score and return top recommendations
    scored_bubbles.sort(key=lambda x: x['score'], reverse=True)
    
    return [item['bubble']['id'] for item in scored_bubbles[:limit]]


def get_interest_based_recommendations(user_id, limit=20):
    """Fallback: Simple interest-based recommendations."""
    user_interests = fetch_user_interests()
    bubble_interests = fetch_bubble_interests()
    open_bubbles = fetch_bubbles('open')
    
    # Get bubbles the user has already joined
    joined_bubble_ids = fetch_user_joined_bubbles(user_id)
    
    user_interest_set = user_interests.get(user_id, set())
    
    scored_bubbles = []
    for bubble in open_bubbles:
        if bubble['owner_id'] == user_id:
            continue
        
        # Skip if user has already joined this bubble
        if bubble['id'] in joined_bubble_ids:
            continue
            
        bubble_interest_set = bubble_interests.get(bubble['id'], set())
        score = compute_interest_overlap(user_interest_set, bubble_interest_set)
        
        scored_bubbles.append({
            'bubble': bubble,
            'score': score
        })
    
    scored_bubbles.sort(key=lambda x: x['score'], reverse=True)
    return [item['bubble']['id'] for item in scored_bubbles[:limit]]


# Flask Routes

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'model_loaded': model is not None})


@app.route('/train', methods=['POST'])
def train():
    """Trigger model training."""
    try:
        success = train_model()
        if success:
            return jsonify({'status': 'success', 'message': 'Model trained successfully'})
        else:
            return jsonify({'status': 'error', 'message': 'Not enough data for training'}), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/predict', methods=['POST'])
def predict():
    """Get recommendations for a user."""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        limit = data.get('limit', 20)
        
        if not user_id:
            return jsonify({'status': 'error', 'message': 'user_id required'}), 400
        
        recommendations = get_recommendations(user_id, limit)
        
        return jsonify({
            'status': 'success',
            'user_id': user_id,
            'recommended_bubble_ids': recommendations
        })
    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


if __name__ == '__main__':
    print("Starting Bubble Recommendation Service...")
    
    # Try to load existing model
    if load_model():
        print("Loaded existing model")
    else:
        print("No existing model found. Train with POST /train")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
