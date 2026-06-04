# Bubbly - Social Bubble Application

Bubbly is a multi-tier social network web application designed to help users locate, create, and join local "bubbles" (interest-based community groups) on an interactive map. Recommendations are personalized using an integrated XGBoost machine learning model.

The project is built on a modern containerized microservices architecture, provisioned with Terraform on AWS, and deployed automatically via a GitHub Actions CI/CD pipeline.

---

## 🏗️ System Architecture

```
                    ┌──────────────────────────────┐
                    │      React Frontend (S3)     │
                    └──────────────┬───────────────┘
                                   │ HTTPS / REST
                                   ▼
                    ┌──────────────────────────────┐
                    │ Application Load Balancer    │
                    └──────────────┬───────────────┘
                                   │ HTTP (Port 80 -> 3000)
                                   ▼
                    ┌──────────────────────────────┐
                    │   ECS Fargate Task (Node.js) │
                    └──────────────┬───────────────┘
                                   │ Private Subnet
                                   ▼
            ┌──────────────────────┴──────────────────────┐
            │                                             │
            ▼ (Port 5432)                                 ▼ (Port 5001)
┌──────────────────────┐                       ┌──────────────────────┐
│  RDS PostgreSQL DB   │                       │  ML Service (Flask)  │
│  (Private Subnets)   │                       │  (XGBoost Model)     │
└──────────────────────┘                       └──────────────────────┘
```

### Component Details
1. **Frontend**: React application built with Vite and Leaflet maps, hosted as a static website on Amazon S3.
2. **Backend**: Express (Node.js) REST API managing user authentication, map operations, messaging, and database operations.
3. **ML Service**: Python (Flask) service loaded with an XGBoost Classifier that processes user interests and histories to generate personalized bubble suggestions.
4. **Database**: Managed RDS PostgreSQL instance for relational storage.

---

## 🤖 XGBoost Recommendation System

Bubbly features a personalized group recommendation engine powered by an **XGBoost** (Extreme Gradient Boosting) model. The system predicts which active bubbles a user is most likely to join.

### 1. System Architecture & Flow
* **ML Microservice**: A Python Flask microservice defined in [recommendation_service.py](file:///c:/Users/Abdelghafor/dev/Bubbly/bubbly-backend/ml/recommendation_service.py) running on port `5001`. It uses `xgboost` to train a binary classifier (`XGBClassifier`) and save the model file as `model.pkl`.
* **Express Backend**: The Express controller [recommendationController.js](file:///c:/Users/Abdelghafor/dev/Bubbly/bubbly-backend/controllers/recommendationController.js) calls the ML microservice endpoints. It exposes the user recommendations at the public route `GET /api/recommendations`.
* **Frontend**: The React client fetches personalized bubble suggestions when the user selects the **"Suggested"** filter on the map interface.

### 2. Feature Engineering
Each user-bubble candidate pair is scored using 8 engineered features:
* **`jaccard`**: Jaccard similarity index of user and bubble interests.
* **`common_interests`**: Total count of interests shared between the user and the bubble.
* **`user_interest_count`**: Total number of interests in the user's profile.
* **`bubble_interest_count`**: Total number of interests tagged on the bubble.
* **`user_age`**: The user's age.
* **`member_count`**: The current number of joined members in the bubble.
* **`fill_rate`**: The current member count divided by the bubble's maximum capacity.
* **`days_old`**: Number of days since the bubble was created.

### 3. Model Training & Class Imbalance
* The model is trained on historical data from **closed bubbles**, treating user-bubble joins as positive labels (`1`) and non-joins as negative labels (`0`).
* To address the training label class imbalance (where non-joins heavily outweigh joins), the training pipeline dynamically calculates a `scale_pos_weight` ratio (negative count / positive count) to weight positive instances higher during fitting.

### 4. Microservice Integration & Fallback
* **Normal Flow**: The Express backend makes an internal HTTP `POST` request to the ML service's `/predict` endpoint, which returns the top 15 recommended bubble IDs.
* **Fallback Flow**: If the ML service is down, times out (after 5 seconds), or training is incomplete, the backend automatically calls [RecommendationController.getInterestBasedRecommendations](file:///c:/Users/Abdelghafor/dev/Bubbly/bubbly-backend/controllers/recommendationController.js#L81) to rank open bubbles using a direct PostgreSQL interest-overlap count query, ensuring uninterrupted application service.

### 5. API Endpoints
* `GET /api/recommendations` - Returns top 15 recommended bubbles for the active user.
* `POST /api/recommendations/train` - Triggers model re-training on historical closed bubbles (Admin only).
* `GET /api/recommendations/health` - Performs service health checks.

---

## 🌐 AWS Infrastructure (Terraform)

All resources are provisioned as Code using Terraform. The cloud architecture is highly secured, utilizing isolated private subnets.

```
+-----------------------------------------------------------------------------------+
| AWS Cloud (us-east-1)                                                             |
|                                                                                   |
| +-------------------------------------------------------------------------------+ |
| | Custom VPC (10.0.0.0/16)                                                      | |
| |                                                                               | |
| |  +-------------------------------------------------------------------------+  | |
| |  | Public Subnets (10.0.1.0/24, 10.0.2.0/24)                               |  | |
| |  |   [ Internet Gateway ] <---> [ Application Load Balancer (ALB) ]        |  | |
| |  |                              [ NAT Gateway ]                            |  | |
| |  +-------------------------------------------------------------------------+  | |
| |                                     |                                         | |
| |                                     v                                         | |
| |  +-------------------------------------------------------------------------+  | |
| |  | Private Subnets (10.0.10.0/24, 10.0.11.0/24)                            |  | |
| |  |   [ ECS Fargate Containers (Node.js App) ]                              |  | |
| |  +-------------------------------------------------------------------------+  | |
| |                                     |                                         | |
| |                                     v                                         | |
| |  +-------------------------------------------------------------------------+  | |
| |  | Private Database Subnets (10.0.20.0/24, 10.0.21.0/24)                   |  | |
| |  |   [ RDS PostgreSQL Database (SSL Enforced) ]                            |  | |
| |  +-------------------------------------------------------------------------+  | |
| +-------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

### Infrastructure Security
* **Network Isolation**: The RDS database has `publicly_accessible = false` and resides in isolated subnets with no public IP.
* **Security Groups**: 
  * The ALB accepts public HTTP traffic on port 80.
  * ECS Fargate tasks accept traffic *only* from the ALB Security Group on port 3000.
  * RDS PostgreSQL accepts connections *only* from Fargate tasks on port 5432.
  * Outbound traffic from private subnets (e.g. to pull Docker images or connect to GitHub) is routed securely through a NAT Gateway.

---

## 🚀 DevOps CI/CD Pipeline

We use GitHub Actions ([.github/workflows/ci-cd.yml](file:///.github/workflows/ci-cd.yml)) to run automated checks and deployments on every push to the `main` branch.

```
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │  Git Push /  ├────>│ Lint & Test  ├────>│ Build & Sync ├────>│ Build & Push │
 │  PR to main  │     │ (Node.js)    │     │ React (S3)   │     │ Docker (ECR) │
 └──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                       │
                                                                       ▼
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────┴───────┐
 │ Live Site    │     │ ECS Service  │     │ Render Task  │     │ Download Task│
 │ Updated!     │<────│ Redeployed   │<────│ Definition   │<────│ Def (ECS)    │
 └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Pipeline Jobs
1. **Lint & Test**: Checks code quality for frontend and backend using ESLint and runs package validation tests under Node.js v22.
2. **Frontend Deployment**: Compiles the React build with production variables and syncs assets directly to the S3 bucket (`aws s3 sync`).
3. **Docker Build & Push**: Builds the backend image, tags it with the GitHub SHA, and pushes it to Amazon Elastic Container Registry (ECR).
4. **ECS Task Deployment**:
   * Downloads the active ECS Fargate task definition dynamically.
   * Renders the updated container image tag (`bubbly-backend:latest`).
   * deploys the new task definition revision to ECS Fargate, waiting for the services to stabilize.

---

## 💻 Local Development Setup

### Backend & ML Service Setup

1. **Configure Environment Variables**:
   Create a [bubbly-backend/.env](file:///c:/Users/Abdelghafor/dev/Bubbly/bubbly-backend/.env) file:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your_password
   SESSION_SECRET=your_session_secret
   NODE_ENV=development
   ```

2. **Initialize Database**:
   Ensure PostgreSQL is running locally, then initialize the database tables and seed sample data:
   ```bash
   cd bubbly-backend
   npm install
   npm run db:setup
   ```

3. **Start the Microservices**:
   Run using Docker Compose:
   ```bash
   docker-compose up --build
   ```
   Or start services manually:
   * **Backend**: `npm run dev` in `bubbly-backend` (port 3000)
   * **ML Service**: `python recommendation_service.py` in `bubbly-backend/ml` (port 5001)

### Frontend Setup

1. **Install and Run**:
   ```bash
   cd bubbly-frontend
   npm install
   npm run dev
   ```
   The client will boot on `http://localhost:5173`.

---

## 🔄 Database Migration to AWS RDS

Database setup in AWS utilizes a secure container-based migration:
* On initialization, Fargate executes [db-migrate.js](file:///c:/Users/Abdelghafor/dev/Bubbly/bubbly-backend/utils/db-migrate.js) which loads a packaged SQL dump file into the RDS instance.
* All database schema files use idempotent constraints (`CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`) to prevent collision errors during future deployments.
