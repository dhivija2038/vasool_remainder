"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDataByDateRange = deleteDataByDateRange;
const db_1 = require("../config/db");
const authController_1 = require("./authController");
/**
 * Deletes application data created within an inclusive From Date -> To Date
 * window. Requires the logged-in user's password as confirmation before
 * anything is permanently removed.
 *
 * No database schema changes are made by this feature - it only issues
 * DELETE statements against the existing tables created in config/db.ts.
 */
async function deleteDataByDateRange(req, res) {
    const { fromDate, toDate, password } = req.body;
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!fromDate || !toDate) {
        return res.status(400).json({ message: 'fromDate and toDate are required' });
    }
    if (!password) {
        return res.status(400).json({ message: 'Password confirmation is required to delete data' });
    }
    if (new Date(fromDate) > new Date(toDate)) {
        return res.status(400).json({ message: 'fromDate cannot be after toDate' });
    }
    try {
        const passwordOk = await (0, authController_1.verifyCurrentUserPassword)(req.user.username, password);
        if (!passwordOk) {
            return res.status(401).json({ message: 'Incorrect password. Data was not deleted.' });
        }
        const pool = (0, db_1.getPool)();
        const connection = await pool.getConnection();
        const summary = { payments: 0, reminder_logs: 0, reports: 0, customers: 0 };
        try {
            await connection.beginTransaction();
            // 1. Payments made within the date range (independent of which
            //    customer they belong to).
            const [paymentsResult] = await connection.query('DELETE FROM payments WHERE payment_date >= ? AND payment_date <= ?', [fromDate, toDate]);
            summary.payments = paymentsResult.affectedRows || 0;
            // 2. Reminder logs sent within the date range.
            const [remindersResult] = await connection.query('DELETE FROM reminder_logs WHERE DATE(sent_at) >= ? AND DATE(sent_at) <= ?', [fromDate, toDate]);
            summary.reminder_logs = remindersResult.affectedRows || 0;
            // 3. Generated reports within the date range.
            const [reportsResult] = await connection.query('DELETE FROM reports WHERE DATE(generated_at) >= ? AND DATE(generated_at) <= ?', [fromDate, toDate]);
            summary.reports = reportsResult.affectedRows || 0;
            // 4. Customers created within the date range. The FOREIGN KEY ... ON
            //    DELETE CASCADE constraints on `payments` and `reminder_logs`
            //    automatically remove any remaining ledger/payment/reminder rows
            //    tied to these customers (e.g. payments made before fromDate for
            //    a customer added inside the range).
            const [customersResult] = await connection.query('DELETE FROM customers WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?', [fromDate, toDate]);
            summary.customers = customersResult.affectedRows || 0;
            await connection.commit();
        }
        catch (err) {
            await connection.rollback();
            throw err;
        }
        finally {
            connection.release();
        }
        res.json({
            message: 'Selected application data has been permanently deleted.',
            fromDate,
            toDate,
            deleted: summary
        });
    }
    catch (error) {
        console.error('Delete data by date range error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
