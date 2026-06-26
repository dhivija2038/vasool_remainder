"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCollectionReport = getCollectionReport;
exports.getDueReport = getDueReport;
exports.getOverdueReport = getOverdueReport;
exports.getLedgerReport = getLedgerReport;
exports.logReportGeneration = logReportGeneration;
const db_1 = require("../config/db");
const customerController_1 = require("./customerController");
// Helper to calculate fine for a customer based on settings fine rules
async function calculateCustomerFine(customerId, connection) {
    // Get customer due date and status
    const [customers] = await connection.query('SELECT due_date, remaining_due, status FROM customers WHERE id = ?', [customerId]);
    if (customers.length === 0)
        return { fine: 0, daysOverdue: 0 };
    const { due_date, remaining_due, status } = customers[0];
    if (status !== 'Overdue' || remaining_due <= 0 || !due_date) {
        return { fine: 0, daysOverdue: 0 };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(due_date);
    dueDateObj.setHours(0, 0, 0, 0);
    if (today <= dueDateObj) {
        return { fine: 0, daysOverdue: 0 };
    }
    const diffTime = Math.abs(today.getTime() - dueDateObj.getTime());
    const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    // Get settings
    const [settings] = await connection.query('SELECT fine_rules FROM settings LIMIT 1');
    if (settings.length === 0 || !settings[0].fine_rules) {
        return { fine: 0, daysOverdue };
    }
    try {
        const rules = JSON.parse(settings[0].fine_rules); // e.g. [{"days":5,"amount":50},{"days":10,"amount":150}]
        if (!Array.isArray(rules) || rules.length === 0) {
            return { fine: 0, daysOverdue };
        }
        // Sort rules by days descending to match the highest applicable threshold
        const sortedRules = [...rules].sort((a, b) => b.days - a.days);
        const matchedRule = sortedRules.find(r => daysOverdue >= r.days);
        const fine = matchedRule ? Number(matchedRule.amount) : 0;
        return { fine, daysOverdue };
    }
    catch (e) {
        console.error('Error parsing fine rules:', e);
        return { fine: 0, daysOverdue };
    }
}
async function getCollectionReport(req, res) {
    const { date_from, date_to } = req.query;
    if (!date_from || !date_to) {
        return res.status(400).json({ message: 'date_from and date_to parameters are required' });
    }
    try {
        const pool = (0, db_1.getPool)();
        const [rows] = await pool.query(`SELECT p.*, c.customer_name, c.mobile_number 
       FROM payments p 
       JOIN customers c ON p.customer_id = c.id 
       WHERE p.payment_date >= ? AND p.payment_date <= ? 
       ORDER BY p.payment_date DESC`, [date_from, date_to]);
        res.json(rows);
    }
    catch (error) {
        console.error('getCollectionReport error:', error);
        res.status(500).json({ message: 'Error retrieving collection report', error: error.message });
    }
}
async function getDueReport(req, res) {
    const { date_from, date_to } = req.query;
    if (!date_from || !date_to) {
        return res.status(400).json({ message: 'date_from and date_to parameters are required' });
    }
    try {
        const pool = (0, db_1.getPool)();
        await (0, customerController_1.syncCustomerStatuses)(pool);
        const [rows] = await pool.query(`SELECT * FROM customers 
       WHERE remaining_due > 0 AND due_date >= ? AND due_date <= ? 
       ORDER BY due_date ASC`, [date_from, date_to]);
        res.json(rows);
    }
    catch (error) {
        console.error('getDueReport error:', error);
        res.status(500).json({ message: 'Error retrieving due report', error: error.message });
    }
}
async function getOverdueReport(req, res) {
    const { date_from, date_to } = req.query;
    try {
        const pool = (0, db_1.getPool)();
        await (0, customerController_1.syncCustomerStatuses)(pool);
        let query = "SELECT * FROM customers WHERE status = 'Overdue'";
        const params = [];
        if (date_from && date_to) {
            query += ' AND due_date >= ? AND due_date <= ?';
            params.push(date_from, date_to);
        }
        query += ' ORDER BY due_date ASC';
        const [rows] = await pool.query(query, params);
        res.json(rows);
    }
    catch (error) {
        console.error('getOverdueReport error:', error);
        res.status(500).json({ message: 'Error retrieving overdue report', error: error.message });
    }
}
async function getLedgerReport(req, res) {
    const { customerId } = req.params;
    const pool = (0, db_1.getPool)();
    try {
        await (0, customerController_1.syncCustomerStatuses)(pool);
        // 1. Get customer info
        const [customers] = await pool.query('SELECT * FROM customers WHERE id = ?', [customerId]);
        if (customers.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const customer = customers[0];
        // 2. Get payment history
        const [payments] = await pool.query('SELECT * FROM payments WHERE customer_id = ? ORDER BY payment_date ASC, id ASC', [customerId]);
        // 3. Calculate fine
        const { fine, daysOverdue } = await calculateCustomerFine(Number(customerId), pool);
        const finalPayable = Number(customer.remaining_due) + fine;
        res.json({
            customer,
            payments,
            fine,
            daysOverdue,
            finalPayable
        });
    }
    catch (error) {
        console.error('getLedgerReport error:', error);
        res.status(500).json({ message: 'Error retrieving ledger report', error: error.message });
    }
}
async function logReportGeneration(req, res) {
    const { report_type, date_from, date_to } = req.body;
    if (!report_type) {
        return res.status(400).json({ message: 'Report type is required' });
    }
    try {
        const pool = (0, db_1.getPool)();
        await pool.query('INSERT INTO reports (report_type, date_from, date_to) VALUES (?, ?, ?)', [report_type, date_from || null, date_to || null]);
        res.status(201).json({ message: 'Report generation logged successfully' });
    }
    catch (error) {
        console.error('logReportGeneration error:', error);
        res.status(500).json({ message: 'Error logging report generation', error: error.message });
    }
}
