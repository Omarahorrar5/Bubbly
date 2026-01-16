# XGBoost Bubble Recommendation Feature

## Overview

This document describes the machine learning-based recommendation system added to Bubbly. The system uses **XGBoost** (Extreme Gradient Boosting) to predict which bubbles a user will be interested in, based on interest overlap and user behavior patterns.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Home.jsx                                                    │    │
│  │  - Toggle: "Suggested" / "All"                               │    │
│  │  - Calls recommendationsAPI.getSuggested() for ML recs       │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Node.js :3000)                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  routes/recommendationRoutes.js                              │    │
│  │  - GET /api/recommendations → getRecommendations             │    │
│  │  - POST /api/recommendations/train → trainModel              │    │
│  │  - GET /api/recommendations/health → getHealth               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  controllers/recommendationController.js                     │    │
│  │  - Calls ML service for predictions                          │    │
│  │  - Fallback to interest-based ranking if ML unavailable      │    │
│  │  - Excludes owned and joined bubbles                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       ML SERVICE (Flask :5001)                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ml/recommendation_service.py                                │    │
│  │  - /train: Train XGBoost model on closed bubbles             │    │
│  │  - /predict: Score open bubbles for user                     │    │
│  │  - /health: Check if model is loaded                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ml/model.pkl                                                │    │
│  │  - Serialized XGBoost model + interest IDs                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files Added

| File | Purpose |
|------|---------|
| `bubbly-backend/ml/recommendation_service.py` | Flask ML service with XGBoost training and prediction |
| `bubbly-backend/ml/requirements.txt` | Python dependencies (xgboost, flask, pandas, etc.) |
| `bubbly-backend/ml/model.pkl` | Trained model (generated after training) |
| `bubbly-backend/controllers/recommendationController.js` | Backend controller for recommendations |
| `bubbly-backend/routes/recommendationRoutes.js` | API routes for recommendations |

---

## XGBoost Model Details

### Training Data Source
- **Closed bubbles**: Historical data where we know which users joined
- Each training sample is a (user, bubble) pair
- Label: 1 if user joined, 0 otherwise

### Feature Engineering

8 features per user-bubble pair:

| # | Feature | Description | Example |
|---|---------|-------------|---------|
| 1 | `jaccard` | Jaccard similarity of interests | 0.42 |
| 2 | `common_interests` | Count of shared interests | 3 |
| 3 | `user_interest_count` | User's total interests | 5 |
| 4 | `bubble_interest_count` | Bubble's total interests | 4 |
| 5 | `user_age` | User's age | 25 |
| 6 | `member_count` | Current bubble members | 7 |
| 7 | `fill_rate` | member_count / max_members | 0.7 |
| 8 | `days_old` | Bubble age in days | 14 |

### Model Configuration

```python
model = xgb.XGBClassifier(
    n_estimators=100,          # Number of boosting rounds
    max_depth=6,               # Maximum tree depth
    learning_rate=0.1,         # Step size shrinkage
    scale_pos_weight=ratio,    # Handle class imbalance
    eval_metric='logloss'      # Binary cross-entropy
)
```

### Training Process

```python
# 1. Generate training data from closed bubbles
X, y = generate_training_data()

# 2. Split for validation
X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2)

# 3. Train model
model.fit(X_train, y_train)

# 4. Evaluate
accuracy = accuracy_score(y_val, model.predict(X_val))
auc = roc_auc_score(y_val, model.predict_proba(X_val)[:, 1])

# 5. Save model
pickle.dump({'model': model, 'all_interest_ids': all_interest_ids}, f)
```

---

## API Endpoints

### GET /api/recommendations
Returns top 15 recommended bubbles for the authenticated user.

**Response:**
```json
{
  "bubbles": [
    {
      "id": "uuid",
      "title": "Photography Club",
      "owner_name": "John",
      "member_count": 5,
      "interests": ["photography", "art"]
    }
  ]
}
```

### POST /api/recommendations/train
Triggers model training (admin endpoint).

**Response:**
```json
{
  "success": true,
  "message": "Model training completed"
}
```

### GET /api/recommendations/health
Checks ML service status.

**Response:**
```json
{
  "status": "healthy",
  "mlService": {
    "status": "healthy",
    "model_loaded": true
  }
}
```

---

## Prediction Flow

1. **User clicks "Suggested"** on the frontend
2. **Frontend** calls `GET /api/recommendations`
3. **Backend** checks user session, calls ML service
4. **ML Service** for each open bubble:
   - Skips if user owns bubble
   - Skips if user already joined
   - Computes 8 features
   - Gets probability score from XGBoost
5. **ML Service** sorts by score, returns top 15 bubble IDs
6. **Backend** fetches bubble details from DB
7. **Frontend** displays bubbles on map

---

## Filtering Logic

Suggested bubbles **exclude**:
- ✗ Bubbles the user **owns**
- ✗ Bubbles the user **already joined**
- ✗ Bubbles beyond the **top 15** recommendations

---

## Fallback Mechanism

When ML service is unavailable, the backend uses **interest-based ranking**:

1. Get user's interests
2. Get each bubble's interests
3. Count overlapping interests
4. Sort by overlap count (descending)
5. Return top 15

---

## Running the ML Service

### Prerequisites
```bash
cd bubbly-backend/ml
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### Start Service
```bash
python recommendation_service.py
```

Service runs on `http://localhost:5001` with hot-reload enabled.

### Train Model
```bash
curl -X POST http://localhost:5001/train
```

Or via backend:
```bash
curl -X POST http://localhost:3000/api/recommendations/train
```

---
