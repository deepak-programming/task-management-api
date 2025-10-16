# task-management-api


Setup Instructions
# 1. Clone the repository
git clone https://github.com/deepak-programming/task-management-api.git
cd task-management-api

# 2. Install dependencies
npm install

# 3. Configure environment variables

Create a .env file in the project root and fill in:

# env details
PORT=4000
MONGO_URI=mongodb+srv://deepak:password12345@cluster0.geqnx1f.mongodb.net/taskManagement?retryWrites=true&w=majority
JWT_ACCESS_SECRET='secret_key'
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m   # Access token short-lived
JWT_REFRESH_EXPIRES_IN=7d   # Refresh token long-lived

# 4. Run the application
npm run dev
or
npm start


The server will start at:
http://localhost:4000

# Database Schema (MongoDB)
User
{
  username: String,
  email: String,
  password: String (hashed)
}

Task
{
  user: ObjectId (ref: User),
  title: String,
  description: String,
  dueDate: Date,
  status: String, // ["Pending", "In_Progress", "Completed"]
  createdAt: Date,
  updatedAt: Date
}

# Authentication Flow

Register → create account

Login → receive JWT Access Token

Include JWT token in header for all protected routes:

Authorization: Bearer <your_token_here>






# API Endpoints (v1)
Auth Routes
POST /api/v1/auth/register

Register a new user.

Request Body

{
  "username": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass123"
}


➤ POST /api/v1/auth/login

Authenticate and get JWT token.

Request Body

{
  "email": "john@example.com",
  "password": "StrongPass123"
}


Task Routes (Protected — Require JWT)
➤ POST /api/v1/tasks

Create a task.

Request Body

{
  "title": "Complete project",
  "description": "Finish all endpoints before deadline",
  "dueDate": "2025-10-30T15:30:00Z",
  "status": "Pending"
}


➤ GET /api/v1/tasks?status=Pending&dueDate=2025-10-30

Retrieve all tasks with optional filters.

Query Params

status (optional): Pending / In_Progress / Completed

dueDate (optional): exact due date


➤ PUT /api/v1/tasks/:id

Update an existing task.

Request Body

{
  "title": "Update project plan",
  "status": "In_Progress"
}


➤ DELETE /api/v1/tasks/:id

Delete a task.


➤ GET /api/v1/tasks/getCount/:id?start=2025-10-01T00:00:00Z&end=2025-10-31T00:00:00Z

Get count of each task status within date range.


Error Handling
Code	Type	Example
400	Validation Error	{ "message": "Invalid date format" }
401	Unauthorized	{ "message": "Token missing or invalid" }
404	Not Found	{ "message": "Task not found" }
500	Server Error	{ "message": "Internal Server Error" }
