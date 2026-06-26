"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
const db_1 = require("../config/db");
async function getSettings(req, res) {
    try {
        const pool = (0, db_1.getPool)();
        const [rows] = await pool.query('SELECT * FROM settings LIMIT 1');
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Settings not found' });
        }
        const settingsObj = rows[0];
        // Parse JSON columns if stored as strings
        try {
            if (typeof settingsObj.fine_rules === 'string') {
                settingsObj.fine_rules = JSON.parse(settingsObj.fine_rules);
            }
            if (typeof settingsObj.reminder_rules === 'string') {
                settingsObj.reminder_rules = JSON.parse(settingsObj.reminder_rules);
            }
        }
        catch (e) {
            console.error('JSON parsing warning for settings:', e);
        }
        res.json(settingsObj);
    }
    catch (error) {
        console.error('getSettings error:', error);
        res.status(500).json({ message: 'Error retrieving settings', error: error.message });
    }
}
async function updateSettings(req, res) {
    const { business_name, owner_name, business_phone, business_email, business_address, upi_id, whatsapp_number, fine_rules, reminder_rules } = req.body;
    try {
        const pool = (0, db_1.getPool)();
        const [rows] = await pool.query('SELECT id FROM settings LIMIT 1');
        const fineRulesStr = typeof fine_rules === 'object' ? JSON.stringify(fine_rules) : fine_rules;
        const reminderRulesStr = typeof reminder_rules === 'object' ? JSON.stringify(reminder_rules) : reminder_rules;
        if (rows.length === 0) {
            // Insert if empty
            await pool.query(`INSERT INTO settings (business_name, owner_name, business_phone, business_email, business_address, upi_id, whatsapp_number, fine_rules, reminder_rules) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [business_name, owner_name, business_phone, business_email, business_address, upi_id, whatsapp_number, fineRulesStr, reminderRulesStr]);
        }
        else {
            // Update existing
            const settingsId = rows[0].id;
            await pool.query(`UPDATE settings 
         SET business_name = ?, owner_name = ?, business_phone = ?, business_email = ?, business_address = ?, upi_id = ?, whatsapp_number = ?, fine_rules = ?, reminder_rules = ?
         WHERE id = ?`, [business_name, owner_name, business_phone, business_email, business_address, upi_id, whatsapp_number, fineRulesStr, reminderRulesStr, settingsId]);
        }
        res.json({ message: 'Settings updated successfully' });
    }
    catch (error) {
        console.error('updateSettings error:', error);
        res.status(500).json({ message: 'Error updating settings', error: error.message });
    }
}
