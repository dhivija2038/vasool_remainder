"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.getMe = getMe;
exports.verifyCurrentUserPassword = verifyCurrentUserPassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../config/db");
async function login(req, res) {
    // Accept either `email` (preferred) or legacy `username` field from the client.
    const email = req.body.email || req.body.username;
    const { password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        const pool = (0, db_1.getPool)();
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [email.trim().toLowerCase()]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const user = users[0];
        const isMatch = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const secret = process.env.JWT_SECRET || 'vasool_shop_owner_secret_jwt_key_2026_safe';
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, owner_name: user.owner_name }, secret, { expiresIn: '30d' });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                owner_name: user.owner_name,
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
async function getMe(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    res.json({ user: req.user });
}
/**
 * Verifies a plain-text password against the currently logged-in user's
 * stored password hash. Used to confirm sensitive/destructive actions
 * (e.g. bulk data deletion) before they are executed.
 */
async function verifyCurrentUserPassword(username, password) {
    if (!username || !password)
        return false;
    const pool = (0, db_1.getPool)();
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0)
        return false;
    return bcrypt_1.default.compare(password, users[0].password_hash);
}
