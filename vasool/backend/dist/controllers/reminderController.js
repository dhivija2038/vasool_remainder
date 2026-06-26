"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReminderLogs = getReminderLogs;
exports.createReminderLog = createReminderLog;
const db_1 = require("../config/db");
async function getReminderLogs(req, res) {
    try {
        const pool = (0, db_1.getPool)();
        const [rows] = await pool.query(`SELECT r.*, c.customer_name, c.mobile_number 
       FROM reminder_logs r 
       JOIN customers c ON r.customer_id = c.id 
       ORDER BY r.sent_at DESC`);
        res.json(rows);
    }
    catch (error) {
        console.error('getReminderLogs error:', error);
        res.status(500).json({ message: 'Error retrieving reminder logs', error: error.message });
    }
}
async function createReminderLog(req, res) {
    const { customer_id, message, status, type } = req.body;
    if (!customer_id || !message || !status || !type) {
        return res.status(400).json({ message: 'Customer ID, message, status, and type are required' });
    }
    try {
        const pool = (0, db_1.getPool)();
        await pool.query('INSERT INTO reminder_logs (customer_id, message, status, type) VALUES (?, ?, ?, ?)', [customer_id, message, status, type]);
        res.status(201).json({ message: 'Reminder log recorded successfully' });
    }
    catch (error) {
        console.error('createReminderLog error:', error);
        res.status(500).json({ message: 'Error recording reminder log', error: error.message });
    }
}
