"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentsByCustomer = getPaymentsByCustomer;
exports.createPayment = createPayment;
exports.deletePayment = deletePayment;
const db_1 = require("../config/db");
const customerController_1 = require("./customerController");
async function getPaymentsByCustomer(req, res) {
    const { customerId } = req.params;
    try {
        const pool = (0, db_1.getPool)();
        const [rows] = await pool.query('SELECT * FROM payments WHERE customer_id = ? ORDER BY payment_date DESC, id DESC', [customerId]);
        res.json(rows);
    }
    catch (error) {
        console.error('getPaymentsByCustomer error:', error);
        res.status(500).json({ message: 'Error retrieving payments', error: error.message });
    }
}
async function createPayment(req, res) {
    const { customer_id, payment_amount, payment_method, payment_date, reference_number, remarks } = req.body;
    if (!customer_id || !payment_amount) {
        return res.status(400).json({ message: 'Customer ID and payment amount are required' });
    }
    const amt = Number(payment_amount);
    if (amt <= 0) {
        return res.status(400).json({ message: 'Payment amount must be greater than zero' });
    }
    const pool = (0, db_1.getPool)();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // 1. Check if customer exists
        const [customers] = await connection.query('SELECT * FROM customers WHERE id = ?', [customer_id]);
        if (customers.length === 0) {
            connection.release();
            return res.status(404).json({ message: 'Customer not found' });
        }
        const customer = customers[0];
        // 2. Insert payment
        await connection.query(`INSERT INTO payments (customer_id, payment_amount, payment_method, payment_date, reference_number, remarks) 
       VALUES (?, ?, ?, ?, ?, ?)`, [customer_id, amt, payment_method || 'Cash', payment_date || new Date().toISOString().split('T')[0], reference_number || null, remarks || null]);
        // 3. Update customer
        const newAmountPaid = Number(customer.amount_paid) + amt;
        const newRemainingDue = Number(customer.total_amount) - newAmountPaid;
        await connection.query('UPDATE customers SET amount_paid = ?, remaining_due = ? WHERE id = ?', [newAmountPaid, newRemainingDue, customer_id]);
        // 4. Sync status
        await (0, customerController_1.syncCustomerStatuses)(connection);
        await connection.commit();
        res.status(201).json({ message: 'Payment recorded successfully' });
    }
    catch (error) {
        await connection.rollback();
        console.error('createPayment error:', error);
        res.status(500).json({ message: 'Error recording payment', error: error.message });
    }
    finally {
        connection.release();
    }
}
async function deletePayment(req, res) {
    const { id } = req.params;
    const pool = (0, db_1.getPool)();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // 1. Get payment details
        const [payments] = await connection.query('SELECT * FROM payments WHERE id = ?', [id]);
        if (payments.length === 0) {
            connection.release();
            return res.status(404).json({ message: 'Payment not found' });
        }
        const payment = payments[0];
        const { customer_id, payment_amount } = payment;
        // 2. Delete payment
        await connection.query('DELETE FROM payments WHERE id = ?', [id]);
        // 3. Get current customer details
        const [customers] = await connection.query('SELECT * FROM customers WHERE id = ?', [customer_id]);
        if (customers.length > 0) {
            const customer = customers[0];
            const newAmountPaid = Math.max(0, Number(customer.amount_paid) - Number(payment_amount));
            const newRemainingDue = Number(customer.total_amount) - newAmountPaid;
            await connection.query('UPDATE customers SET amount_paid = ?, remaining_due = ? WHERE id = ?', [newAmountPaid, newRemainingDue, customer_id]);
            // Sync status
            await (0, customerController_1.syncCustomerStatuses)(connection);
        }
        await connection.commit();
        res.json({ message: 'Payment deleted successfully' });
    }
    catch (error) {
        await connection.rollback();
        console.error('deletePayment error:', error);
        res.status(500).json({ message: 'Error deleting payment', error: error.message });
    }
    finally {
        connection.release();
    }
}
