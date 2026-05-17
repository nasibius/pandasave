# PandaSave 🐼

PandaSave is a family-friendly web application designed to help parents manage their children's tasks and goals, and teach kids about saving and earning rewards. 

Built with modern web technologies, PandaSave provides separate dashboards for parents and children, real-time synchronization, and a fun minigame to encourage positive habits.

## 🌟 Features

### For Parents
- **Family Registration & PIN Lock**: Secure sign-up with email verification and a 4-digit PIN to lock parent controls.
- **Child Management**: Add multiple children to your family account.
- **Task Management**: Create tasks (chores, homework, etc.) with custom coin rewards. Approve or reject completed tasks.
- **Spending Limits**: Set daily or weekly spending limits for your children.
- **Real-time Sync**: Watch your family's dashboard update live as tasks are completed or approved.

### For Children
- **Child Dashboard**: A safe, specialized view just for kids.
- **Task Completion**: Kids can see their pending tasks and mark them as complete.
- **Savings Goals**: Set goals and allocate earned coins to reach them.
- **Minigame**: Play a fun memory game to earn a daily reward.

### For Admins
- **Admin Dashboard**: View platform-wide statistics like total families, tasks, and goals. 

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Framer Motion, Recharts
- **Backend**: Node.js, Express, Socket.io (WebSockets)
- **Database**: SQLite (via `better-sqlite3`)
- **Authentication**: JWT, bcrypt, Nodemailer

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository_url>
   cd pandasave-root
   ```

2. **Install dependencies**
   Install packages for both the backend and frontend at the root directory:
   ```bash
   npm install
   ```

3. **Environment Setup**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your values:
   - `EMAIL_USER` and `EMAIL_PASS`: Used for sending email verification and password reset links (e.g., a Gmail App Password).
   - `JWT_SECRET`: A secure random string for signing JWT tokens.
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: Credentials for the Admin dashboard.

4. **Start the Application**
   ```bash
   npm run dev
   ```
   This will start both the backend server and the frontend Vite proxy. By default, the application will be available at `http://localhost:3000`.

### Production Build

To build the frontend for production, run:
```bash
npm run build
```
Once built, you can start the production backend (which will serve the static `dist` files):
```bash
npm run start
```

## 🔐 Security Settings

- **Admin Route Isolation**: Admin routes are secured, and admin credentials reside strictly in server environment variables, eliminating the risk of client-side leakage.
- **Parent PIN Protection**: Children cannot access parent controls without entering the family 4-digit PIN.
- **Rate-Limiting**: Essential endpoints (login, register) are rate-limited to avoid brute-forcing.

## 👩‍💻 Contributors

Developed by students from BHOS (Baku Higher Oil School):
- Amil Alakbarov
- Amil Alasgarov
- Amin İsmayilli
- Mahammad Gulmammadov
- Nasib Suleymanov

---
*Created with ❤️ for teaching financial responsibility to the next generation.*
