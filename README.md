# CodeBD

**CodeBD** is a full-stack competitive programming and problem-solving platform where users can practice programming problems, participate in contests, track submissions, bookmark problems, and manage their profiles.

The project is being built using **HTML, CSS, JavaScript, Node.js, Express.js, and PostgreSQL**.

---

## 📸 Screenshots

<p align="center">
  <img src="screenshots/ss1.jng" width="100%" alt="CodeBD Screenshot 1">
  <!-- <img src="screenshots/ss2.png" width="48%" alt="CodeBD Screenshot 2"> -->
</p>

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
```

### 2. Enter the Project Directory

```bash
cd CodeBD
```

### 3. Install Dependencies

```bash
npm install
```

---

## 🔧 Environment Variables

Create a `.env` file in the root directory.

Example:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=codebd
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

---

## ▶️ Running the Project

```bash
node app.js
```

Then open:

```text
http://localhost:3000
```

---

## 🚀 Features

### 🔐 Authentication

* User registration
* User login
* Password hashing
* JWT-based authentication
* Protected routes
* User logout

### 👤 User Profile

* View user profile
* Display username
* Display email
* User-specific information

### 🧩 Problems

* Browse programming problems
* View individual problems
* Problem difficulty levels
* Problem tags

### 🔖 Bookmarks

* Bookmark problems
* View bookmarked problems
* Remove bookmarked problems

### 💻 Submissions

* Submit solutions to problems
* Store submitted code
* Store programming language
* Track submission verdict
* Track submission time

### 🏆 Contests

* Programming contests
* Contest problem sets
* Problem labels such as `A`, `B`, `C`
* Problem points
* Contest participation
* Score
* Penalty
* Solved count
* Ranking

> 🚧 CodeBD is currently under active development. Some features listed above are planned and may not yet be fully implemented.

---

## 🛠️ Tech Stack

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL

### Authentication & Security

* JSON Web Token (JWT)
* bcrypt / bcryptjs
* Environment variables

---

## 📁 Project Structure

```text
CodeBD/
│
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── problemController.js
│   └── ...
│
├── models/
│   ├── userModel.js
│   ├── problemModel.js
│   └── ...
│
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── problemRoutes.js
│   └── ...
│
├── middleware/
│   ├── authMiddleware.js
│   └── ...
│
├── public/
│   ├── css/
│   ├── js/
│   └── ...
│
├── views/
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   └── ...
│
├── screenshots/
│   ├── ss1.png
│   └── ss2.png
│
├── config/
│   └── db.js
│
├── .env
├── .gitignore
├── app.js
├── package.json
└── README.md
```

> The project structure may change as CodeBD grows.

---

## 🗄️ Database Design

The main entities used in CodeBD include:

* **User**
* **Problem**
* **Submission**
* **Contest**
* **Solution**
* **Tag**

### Main Relationships

```text
User ─── Submission ─── Problem

Problem ─── Tag

Contest ─── Problem

User ─── Contest

Problem ─── Solution
```

### Contest Problem

A contest can contain multiple problems, and a problem can belong to multiple contests.

The contest-problem relationship can contain information such as:

* Problem label (`A`, `B`, `C`, ...)
* Points
* Problem order

### Contest Participation

A user can participate in multiple contests.

Participation information can include:

* Rank
* Score
* Penalty
* Solved count


---

## 🔐 Authentication Flow

CodeBD uses JWT-based authentication.

```text
User Registration
       ↓
Password Hashing
       ↓
User Stored in PostgreSQL
       ↓
User Login
       ↓
Credentials Verified
       ↓
JWT Generated
       ↓
Token Sent to Client
       ↓
Protected Routes Verify Token
       ↓
Authenticated Access
```

This allows protected pages and API endpoints to be accessed only by authenticated users.

---

## 🏗️ Backend Architecture

The backend follows an MVC-inspired architecture.

```text
Client Request
      ↓
Route
      ↓
Middleware
      ↓
Controller
      ↓
Model
      ↓
PostgreSQL
      ↓
Response
```

### Routes

Routes determine which controller should handle an incoming request.

### Middleware

Middleware handles tasks such as:

* Authentication
* Token verification
* Request validation

### Controllers

Controllers contain the main application logic.

### Models

Models communicate with the PostgreSQL database.

This separation keeps the project organized, scalable, and easier to maintain.

---

## 🗺️ Development Roadmap

### Core Setup

* [x] Project setup
* [x] Express server
* [x] PostgreSQL integration
* [x] MVC structure
* [x] Environment variables

### Authentication

* [x] User registration
* [x] User login
* [x] Password hashing
* [x] JWT authentication
* [x] Protected routes
* [x] Logout

### User System

* [x] User profile page
* [ ] Profile editing
* [ ] User statistics

### Problem System

* [ ] Problem management
* [ ] Problem details
* [ ] Difficulty filtering
* [ ] Tag filtering
* [ ] Problem search

### Bookmark System

* [ ] Add bookmarks
* [ ] View bookmarks
* [ ] Remove bookmarks

### Submission System

* [ ] Submit code
* [ ] Submission history
* [ ] Verdict system
* [ ] Online code judging

### Contest System

* [ ] Create contests
* [ ] Contest problem sets
* [ ] Contest participation
* [ ] Score calculation
* [ ] Penalty calculation
* [ ] Contest rankings

### Future Improvements

* [ ] Problem solutions
* [ ] Admin dashboard
* [ ] Better responsive UI
* [ ] User statistics
* [ ] Leaderboard
* [ ] Deployment

---

## 🎯 Project Goal

The goal of CodeBD is to build a complete competitive programming platform while learning and applying real-world full-stack development concepts.

The project focuses on topics such as:

* REST APIs
* CRUD operations
* Authentication
* Authorization
* JWT
* Password security
* Express middleware
* MVC architecture
* PostgreSQL
* Relational database design
* Frontend/backend communication
* Contest management
* Submission management
* Scalable project structure

---

## 🌱 Current Status

CodeBD is currently under development.

The authentication system and basic user profile functionality are being built first. More features will gradually be added as development continues.

---

## 🤝 Contributing

CodeBD is currently a personal learning project, but suggestions and improvements are welcome.

To contribute:

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b feature/new-feature
```

3. Make your changes.

4. Commit your changes.

```bash
git commit -m "Add new feature"
```

5. Push the branch.

```bash
git push origin feature/new-feature
```

6. Open a Pull Request.

---

## 📜 License

This project is currently intended for educational purposes.

A formal open-source license may be added in the future.

---

## 👨‍💻 Author

**Jubayer Talukder**

Computer Science student and competitive programming enthusiast.

---

## ⭐ Support

If you find CodeBD interesting, consider giving the repository a ⭐.

---

<p align="center">
  <strong>Built with ❤️ while learning full-stack development and competitive programming.</strong>
</p>
