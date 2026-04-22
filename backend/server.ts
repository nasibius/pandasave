import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Server } from 'socket.io';
import http from 'http';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const JWT_SECRET = process.env.JWT_SECRET || 'pandasave-saas-core-secret';
const DB_PATH = process.env.DB_PATH || 'pandasave.db';
const db = new Database(DB_PATH);

// Enable WAL for concurrency
db.pragma('journal_mode = WAL');

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

const pinLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many failed PIN attempts, please try again after 10 minutes' }
});

try { db.exec('ALTER TABLE families ADD COLUMN emailVerified INTEGER DEFAULT 0'); } catch (e) { /* ignore if exists */ }
try { db.exec('ALTER TABLE families ADD COLUMN verificationToken TEXT'); } catch (e) { /* ignore if exists */ }

// Enhanced Multi-Tenant Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS families (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    parentPin TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    resetToken TEXT,
    resetTokenExpiry INTEGER,
    pinResetToken TEXT,
    pinResetTokenExpiry INTEGER,
    emailVerified INTEGER DEFAULT 0,
    verificationToken TEXT
  );
  
  CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    familyId TEXT NOT NULL,
    name TEXT NOT NULL,
    balance INTEGER DEFAULT 0,
    spendingLimitAmount INTEGER DEFAULT 0,
    spendingLimitPeriod TEXT,
    spentPeriodStart INTEGER,
    spentSoFar INTEGER DEFAULT 0,
    lastSavedDate INTEGER,
    quizRewardAmount INTEGER DEFAULT 2,
    FOREIGN KEY(familyId) REFERENCES families(id)
  );
  
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    familyId TEXT NOT NULL,
    childId TEXT NOT NULL,
    title TEXT NOT NULL,
    reward INTEGER NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY(familyId) REFERENCES families(id),
    FOREIGN KEY(childId) REFERENCES children(id)
  );
  
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    familyId TEXT NOT NULL,
    childId TEXT NOT NULL,
    title TEXT NOT NULL,
    targetAmount INTEGER NOT NULL,
    currentAmount INTEGER DEFAULT 0,
    emoji TEXT,
    FOREIGN KEY(familyId) REFERENCES families(id),
    FOREIGN KEY(childId) REFERENCES children(id)
  );

  CREATE TABLE IF NOT EXISTS completed_mini_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    childId TEXT NOT NULL,
    date INTEGER NOT NULL,
    FOREIGN KEY(childId) REFERENCES children(id)
  );
`);

// Database Migrations
try {
  db.prepare("ALTER TABLE families Add COLUMN emailVerified INTEGER DEFAULT 0").run();
} catch (e) {
  // Column likely already exists
}
try {
  db.prepare("ALTER TABLE families ADD COLUMN verificationToken TEXT").run();
} catch (e) {
  // Column likely already exists
}

// Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Missing access token' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired access token' });
    req.user = user;
    next();
  });
};

async function startServer() {
  const app = express();
  
  // Required for express-rate-limit to work correctly behind proxies (Render, Vercel etc)
  app.set('trust proxy', 1);

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });

  app.use(cors());
  app.use(express.json());

  // --- WEBSOCKETS ---
  io.on('connection', (socket) => {
    // Client authenticates to a room based on Family ID
    socket.on('join_family', (token) => {
       try {
         const user = jwt.verify(token, JWT_SECRET) as any;
         socket.join(user.familyId);
         console.log(`Socket joined family room: ${user.familyId}`);
       } catch (err) {
         console.error('Invalid socket token');
       }
    });
  });

  const notifyFamily = (familyId: string) => {
    io.to(familyId).emit('sync_update');
  };

  // --- AUTH ROUTES ---
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const { email, password, name, pin } = req.body;
    try {
      const familyId = 'fam_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      const hash = await bcrypt.hash(password, 10);
      const pinHash = await bcrypt.hash(pin, 10);
      const verificationToken = crypto.randomBytes(32).toString('hex');

      db.prepare('INSERT INTO families (id, name, email, passwordHash, parentPin, createdAt, emailVerified, verificationToken) VALUES (?, ?, ?, ?, ?, ?, 0, ?)')
        .run(familyId, name, email, hash, pinHash, Date.now(), verificationToken);

      const backendUrl = process.env.BACKEND_URL || process.env.APP_URL || 'http://localhost:3000';
      const verifyLink = `${backendUrl}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
      
      const mailOptions = {
        from: `"PandaSave" <${process.env.EMAIL_USER || 'noreply@pandasave.com'}>`,
        to: email,
        subject: 'Verify your PandaSave Account',
        html: `<p>Welcome to PandaSave!</p><p>Please verify your email address to complete your registration by clicking the link below:</p><p><a href="${verifyLink}">${verifyLink}</a></p>`
      };

      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
      } else {
         console.warn(`[Mock Email] Verification link for ${email}: ${verifyLink}`);
      }

      res.status(201).json({ success: true, message: 'Please check your email to verify your account.' });
    } catch (e: any) {
      console.error('Registration error details:', e);
      if (e.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'This email is already registered.' });
      }
      res.status(500).json({ error: 'Internal server error during registration.' });
    }
  });

  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { email, token } = req.query;
      const family = db.prepare('SELECT id, verificationToken FROM families WHERE email = ?').get(email) as any;

      if (!family || family.verificationToken !== token) {
        return res.status(400).send('Invalid verification link. Please check your email.');
      }

      db.prepare('UPDATE families SET emailVerified = 1, verificationToken = NULL WHERE id = ?').run(family.id);
      const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/?verified=true`);
    } catch (e) {
      console.error('Verification error:', e);
      res.status(500).send('Verification failed due to a server error.');
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      const family = db.prepare('SELECT * FROM families WHERE email = ?').get(email) as any;
      
      if (!family || !(await bcrypt.compare(password, family.passwordHash))) {
        return res.status(401).json({ error: 'The email or password you entered is incorrect.' });
      }

      if (family.emailVerified === 0) {
        return res.status(403).json({ error: 'Please verify your email before logging in. We sent a link to your inbox.' });
      }

      const token = jwt.sign({ familyId: family.id, email: family.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, familyId: family.id });
    } catch (e) {
      console.error('Login error:', e);
      res.status(500).json({ error: 'Internal server error during login.' });
    }
  });

  app.post('/api/auth/verify-pin', authenticateToken, pinLimiter, async (req: any, res: any) => {
    try {
      const { pin } = req.body;
      const family = db.prepare('SELECT parentPin FROM families WHERE id = ?').get(req.user.familyId) as any;
      
      if (!family || !(await bcrypt.compare(pin, family.parentPin))) {
        return res.status(401).json({ error: 'Incorrect PIN.' });
      }
      res.json({ success: true });
    } catch (e) {
      console.error('PIN verification error:', e);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

  app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      const family = db.prepare('SELECT id FROM families WHERE email = ?').get(email) as any;
      if (!family) {
        // Obfuscate whether email exists
        return res.json({ success: true, message: 'A reset link has been sent to your email if an account exists.' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour

      db.prepare('UPDATE families SET resetToken = ?, resetTokenExpiry = ? WHERE id = ?')
        .run(resetTokenHash, resetTokenExpiry, family.id);

      const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
      
      const mailOptions = {
        from: `"PandaSave" <${process.env.EMAIL_USER || 'noreply@pandasave.com'}>`,
        to: email,
        subject: 'PandaSave Password Reset',
        html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you did not request this, please ignore this email. The link will expire in 1 hour.</p>`
      };

      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}`);
      } else {
         console.warn(`[Mock Email] Password reset link for ${email}: ${resetLink}`);
      }

      res.json({ success: true, message: 'A reset link has been sent to your email if an account exists.' });
    } catch (e) {
      console.error('Forgot password error:', e);
      res.status(500).json({ error: 'Failed to process request.' });
    }
  });

  app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
    try {
      const { email, token, newPassword } = req.body;
      const family = db.prepare('SELECT id, resetToken, resetTokenExpiry FROM families WHERE email = ?').get(email) as any;
      
      if (!family || !family.resetToken || !family.resetTokenExpiry) {
        return res.status(400).json({ error: 'Invalid or expired reset token.' });
      }

      if (Date.now() > family.resetTokenExpiry) {
        return res.status(400).json({ error: 'Reset token has expired.' });
      }

      const isValidToken = await bcrypt.compare(token, family.resetToken);
      if (!isValidToken) {
        return res.status(400).json({ error: 'Invalid reset token.' });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      db.prepare('UPDATE families SET passwordHash = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?')
        .run(hash, family.id);

      res.json({ success: true, message: 'Password has been reset successfully.' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to reset password.' });
    }
  });

  app.post('/api/auth/forgot-pin', authenticateToken, authLimiter, async (req: any, res: any) => {
    try {
      const familyId = req.user.familyId;
      const family = db.prepare('SELECT email FROM families WHERE id = ?').get(familyId) as any;
      
      if (!family) {
        return res.status(404).json({ error: 'Family not found.' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      const resetTokenExpiry = Date.now() + 3600000; // 1 hour

      db.prepare('UPDATE families SET pinResetToken = ?, pinResetTokenExpiry = ? WHERE id = ?')
        .run(resetTokenHash, resetTokenExpiry, familyId);

      const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
      const resetLink = `${frontendUrl}/reset-pin?token=${resetToken}&familyId=${encodeURIComponent(familyId)}`;
      
      const mailOptions = {
        from: `"PandaSave" <${process.env.EMAIL_USER || 'noreply@pandasave.com'}>`,
        to: family.email,
        subject: 'PandaSave PIN Reset',
        html: `<p>You requested a PIN reset. Click the link below to reset your parent PIN:</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you did not request this, please ignore this email. The link will expire in 1 hour.</p>`
      };

      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail(mailOptions);
        console.log(`PIN reset email sent to ${family.email}`);
      } else {
         console.warn(`[Mock Email] PIN reset link for ${family.email}: ${resetLink}`);
      }

      res.json({ success: true, message: 'A PIN reset link has been sent to your registered email.' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to process request.' });
    }
  });

  app.post('/api/auth/reset-pin', authLimiter, async (req, res) => {
    try {
      const { familyId, token, newPin } = req.body;
      const family = db.prepare('SELECT id, pinResetToken, pinResetTokenExpiry FROM families WHERE id = ?').get(familyId) as any;
      
      if (!family || !family.pinResetToken || !family.pinResetTokenExpiry) {
        return res.status(400).json({ error: 'Invalid or expired reset token.' });
      }

      if (Date.now() > family.pinResetTokenExpiry) {
        return res.status(400).json({ error: 'Reset token has expired.' });
      }

      const isValidToken = await bcrypt.compare(token, family.pinResetToken);
      if (!isValidToken) {
        return res.status(400).json({ error: 'Invalid reset token.' });
      }

      const hash = await bcrypt.hash(newPin, 10);
      db.prepare('UPDATE families SET parentPin = ?, pinResetToken = NULL, pinResetTokenExpiry = NULL WHERE id = ?')
        .run(hash, family.id);

      res.json({ success: true, message: 'PIN has been reset successfully.' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to reset PIN.' });
    }
  });

  // --- MULTI-TENANT API ROUTES ---

  app.get('/api/sync', authenticateToken, (req: any, res: any) => {
    try {
      const familyId = req.user.familyId;
      
      const childrenList = db.prepare('SELECT id, name, balance, spendingLimitAmount, spendingLimitPeriod, spentPeriodStart, spentSoFar, lastSavedDate, quizRewardAmount FROM children WHERE familyId = ?').all(familyId);
      const tasks = db.prepare('SELECT * FROM tasks WHERE familyId = ?').all(familyId);
      const goals = db.prepare('SELECT * FROM goals WHERE familyId = ?').all(familyId);
      
      res.json({ children: childrenList, tasks, goals });
    } catch (e) {
      res.status(500).json({ error: 'Failed to sync data' });
    }
  });

  app.post('/api/children', authenticateToken, (req: any, res: any) => {
    try {
      const { name } = req.body;
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Child name is required' });
      }
      const childId = 'child_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5); // unique id
      db.prepare('INSERT INTO children (id, familyId, name) VALUES (?, ?, ?)')
        .run(childId, req.user.familyId, name.trim());
      notifyFamily(req.user.familyId);
      res.json({ success: true, childId });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to create child' });
    }
  });

  app.put('/api/children/:id', authenticateToken, (req: any, res: any) => {
    try {
      const { name } = req.body;
      const childId = req.params.id;
      const familyId = req.user.familyId;

      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Child name is required' });
      }

      const result = db.prepare('UPDATE children SET name = ? WHERE id = ? AND familyId = ?')
        .run(name.trim(), childId, familyId);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Child not found or unauthorized' });
      }

      notifyFamily(req.user.familyId);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to update child' });
    }
  });

  app.post('/api/tasks', authenticateToken, (req: any, res: any) => {
    try {
      const { id, title, reward, childId } = req.body;
      db.prepare('INSERT INTO tasks (id, familyId, childId, title, reward, status) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, req.user.familyId, childId, title, reward, 'pending');
      notifyFamily(req.user.familyId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  app.put('/api/tasks/:id', authenticateToken, (req: any, res: any) => {
    try {
      const { status } = req.body;
      const taskId = req.params.id;
      const familyId = req.user.familyId;

      // Verify task belongs to family
      const task = db.prepare('SELECT reward, childId FROM tasks WHERE id = ? AND familyId = ?').get(taskId, familyId) as any;
      if (!task) return res.status(404).json({ error: 'Task not found' });

      db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, taskId);
      
      if (status === 'approved') {
         db.prepare('UPDATE children SET balance = balance + ? WHERE id = ?').run(task.reward, task.childId);
      }
      
      notifyFamily(familyId);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  app.post('/api/goals', authenticateToken, (req: any, res: any) => {
     try {
       const { id, childId, title, targetAmount, emoji } = req.body;
       db.prepare('INSERT INTO goals (id, familyId, childId, title, targetAmount, currentAmount, emoji) VALUES (?, ?, ?, ?, ?, 0, ?)')
         .run(id, req.user.familyId, childId, title, targetAmount, emoji);
       notifyFamily(req.user.familyId);
       res.json({ success: true });
     } catch (e) {
       console.error(e);
       res.status(500).json({ error: 'Failed to create goal' });
     }
  });

  app.post('/api/goals/:id/feed', authenticateToken, (req: any, res: any) => {
     try {
       const { amount, childId } = req.body;
       const child = db.prepare('SELECT balance, spendingLimitAmount, spendingLimitPeriod, spentPeriodStart, spentSoFar FROM children WHERE id = ? AND familyId = ?').get(childId, req.user.familyId) as any;
       
       if (!child) return res.status(404).json({ error: 'Child not found' });
       if (child.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

       const now = Date.now();
       let newSpentSoFar = child.spentSoFar;
       let newSpentPeriodStart = child.spentPeriodStart || now;

       if (child.spendingLimitPeriod) {
          const msInPeriod = child.spendingLimitPeriod === 'daily' ? 86400000 : 86400000 * 7;
          if (now - newSpentPeriodStart > msInPeriod) {
             newSpentSoFar = 0;
             newSpentPeriodStart = now;
          }
          if (newSpentSoFar + amount > child.spendingLimitAmount && child.spendingLimitAmount > 0) {
             return res.status(400).json({ error: 'Spending limit reached' });
          }
          newSpentSoFar += amount;
       }

       const transaction = db.transaction(() => {
          db.prepare('UPDATE children SET balance = balance - ?, spentSoFar = ?, spentPeriodStart = ?, lastSavedDate = ? WHERE id = ?')
            .run(amount, newSpentSoFar, newSpentPeriodStart, now, childId);
          db.prepare('UPDATE goals SET currentAmount = currentAmount + ? WHERE id = ?')
            .run(amount, req.params.id);
       });
       transaction();

       notifyFamily(req.user.familyId);
       res.json({ success: true });
     } catch (e) {
       console.error(e);
       res.status(500).json({ error: 'Failed to feed goal' });
     }
  });

  app.post('/api/limits', authenticateToken, (req: any, res: any) => {
     try {
       const { childId, amount, period } = req.body;
       db.prepare('UPDATE children SET spendingLimitAmount = ?, spendingLimitPeriod = ?, spentSoFar = 0, spentPeriodStart = ? WHERE id = ? AND familyId = ?')
         .run(amount, period, Date.now(), childId, req.user.familyId);
       notifyFamily(req.user.familyId);
       res.json({ success: true });
     } catch (e) {
       console.error(e);
       res.status(500).json({ error: 'Failed to update limits' });
     }
  });

  app.post('/api/reward-amount', authenticateToken, (req: any, res: any) => {
     try {
       const { childId, amount } = req.body;
       db.prepare('UPDATE children SET quizRewardAmount = ? WHERE id = ? AND familyId = ?')
         .run(amount, childId, req.user.familyId);
       notifyFamily(req.user.familyId);
       res.json({ success: true });
     } catch (e) {
       console.error(e);
       res.status(500).json({ error: 'Failed to update reward amount' });
     }
  });

  app.post('/api/minigame', authenticateToken, (req: any, res: any) => {
     try {
       const { reward, childId } = req.body;
       
       const gamesPlayed = db.prepare('SELECT count(*) as count FROM completed_mini_games WHERE childId = ? AND date > ?')
         .get(childId, Date.now() - 86400000) as { count: number };
       
       if (gamesPlayed.count >= 3) {
          return res.status(400).json({ error: 'You played too many games today! Come back tomorrow.' });
       }

       db.prepare('INSERT INTO completed_mini_games (childId, date) VALUES (?, ?)').run(childId, Date.now());
       db.prepare('UPDATE children SET balance = balance + ? WHERE id = ?').run(reward, childId);
       
       notifyFamily(req.user.familyId);
       res.json({ success: true });
     } catch (e) {
       console.error(e);
       res.status(500).json({ error: 'Failed to process minigame reward' });
     }
  });

  const PORT = process.env.PORT || 3000;
  
  // Vite integration
  if (process.env.NODE_ENV !== "production" && !process.env.BACKEND_ONLY) {
    const vite = await createViteServer({
      root: path.resolve(__dirname, '../frontend'),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.BACKEND_ONLY) {
    const distPath = path.resolve(__dirname, '../frontend/dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
