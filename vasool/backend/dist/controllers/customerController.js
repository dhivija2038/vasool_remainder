"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncCustomerStatuses = syncCustomerStatuses;
exports.getCustomers = getCustomers;
exports.getCustomerById = getCustomerById;
exports.createCustomer = createCustomer;
exports.updateCustomer = updateCustomer;
exports.deleteCustomer = deleteCustomer;
const db_1 = require("../config/db");
// Sync customer statuses based on current date, due date, and payment history
async function syncCustomerStatuses(connection) {
    // 1. Paid: remaining_due <= 0
    await connection.query(`
    UPDATE customers 
    SET status = 'Paid' 
    WHERE remaining_due <= 0 AND status != 'Paid'
  `);
    // 2. Overdue: remaining_due > 0 AND due_date < CURRENT_DATE
    await connection.query(`
    UPDATE customers 
    SET status = 'Overdue' 
    WHERE remaining_due > 0 AND due_date < CURDATE() AND status != 'Overdue'
  `);
    // 3. Partial: remaining_due > 0 AND amount_paid > 0 AND due_date >= CURRENT_DATE
    await connection.query(`
    UPDATE customers 
    SET status = 'Partial' 
    WHERE remaining_due > 0 AND amount_paid > 0 AND due_date >= CURDATE() AND status != 'Partial'
  `);
    // 4. Upcoming: remaining_due > 0 AND amount_paid = 0 AND due_date >= CURRENT_DATE
    await connection.query(`
    UPDATE customers 
    SET status = 'Upcoming' 
    WHERE remaining_due > 0 AND amount_paid = 0 AND due_date >= CURDATE() AND status != 'Upcoming'
  `);
}
async function getCustomers(req, res) {
    try {
        const pool = (0, db_1.getPool)();
        await syncCustomerStatuses(pool);
        const { search, status, sortBy, order } = req.query;
        let query = 'SELECT * FROM customers WHERE 1=1';
        const params = [];
        if (search) {
            query += ' AND (customer_name LIKE ? OR mobile_number LIKE ? OR product_name LIKE ? OR product_category LIKE ?)';
            const searchWild = `%${search}%`;
            params.push(searchWild, searchWild, searchWild, searchWild);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        const allowedSortFields = ['customer_name', 'due_date', 'remaining_due', 'total_amount', 'purchase_date'];
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;
        const [rows] = await pool.query(query, params);
        res.json(rows);
    }
    catch (error) {
        console.error('getCustomers error:', error);
        res.status(500).json({ message: 'Error retrieving customers', error: error.message });
    }
}
async function getCustomerById(req, res) {
    const { id } = req.params;
    try {
        const pool = (0, db_1.getPool)();
        await syncCustomerStatuses(pool);
        const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(rows[0]);
    }
    catch (error) {
        console.error('getCustomerById error:', error);
        res.status(500).json({ message: 'Error retrieving customer', error: error.message });
    }
}
async function createCustomer(req, res) {
    const { customer_name, mobile_number, email, product_name, product_category, purchase_date, due_date, total_amount, amount_paid } = req.body;
    if (!customer_name || !mobile_number || total_amount === undefined) {
        return res.status(400).json({ message: 'Customer name, mobile number, and total amount are required' });
    }
    const amtPaid = Number(amount_paid || 0);
    const totAmt = Number(total_amount);
    const remDue = totAmt - amtPaid;
    // Determine status initial state
    let status = 'Upcoming';
    if (remDue <= 0) {
        status = 'Paid';
    }
    else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDateObj = new Date(due_date);
        dueDateObj.setHours(0, 0, 0, 0);
        if (dueDateObj < today) {
            status = 'Overdue';
        }
        else if (amtPaid > 0) {
            status = 'Partial';
        }
    }
    const pool = (0, db_1.getPool)();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // 1. Insert customer
        const [result] = await connection.query(`INSERT INTO customers 
       (customer_name, mobile_number, email, product_name, product_category, purchase_date, due_date, total_amount, amount_paid, remaining_due, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [customer_name, mobile_number, email || null, product_name || null, product_category || null, purchase_date || null, due_date || null, totAmt, amtPaid, remDue, status]);
        const customerId = result.insertId;
        // 2. If amount_paid > 0, log a payment
        if (amtPaid > 0) {
            await connection.query(`INSERT INTO payments (customer_id, payment_amount, payment_method, payment_date, reference_number, remarks) 
         VALUES (?, ?, ?, ?, ?, ?)`, [customerId, amtPaid, 'Cash', purchase_date || new Date().toISOString().split('T')[0], 'INITIAL', 'Initial payment upon setup']);
        }
        await connection.commit();
        res.status(201).json({ message: 'Customer created successfully', customerId });
    }
    catch (error) {
        await connection.rollback();
        console.error('createCustomer error:', error);
        res.status(500).json({ message: 'Error creating customer', error: error.message });
    }
    finally {
        connection.release();
    }
}
async function updateCustomer(req, res) {
    const { id } = req.params;
    const { customer_name, mobile_number, email, product_name, product_category, purchase_date, due_date, total_amount, amount_paid } = req.body;
    if (!customer_name || !mobile_number || total_amount === undefined) {
        return res.status(400).json({ message: 'Customer name, mobile number, and total amount are required' });
    }
    const pool = (0, db_1.getPool)();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Fetch existing customer to see if amount_paid changed and adjust remaining_due
        const [existing] = await connection.query('SELECT * FROM customers WHERE id = ?', [id]);
        if (existing.length === 0) {
            connection.release();
            return res.status(404).json({ message: 'Customer not found' });
        }
        const currentCustomer = existing[0];
        const totAmt = Number(total_amount);
        // Check payment history sum to override amount_paid, or let the user explicitly edit amount_paid?
        // Wait, the prompt says "remaining_due must automatically update whenever payment is recorded."
        // If the owner edits a customer and changes amount_paid, let's update it. But wait, if they record payments via the Payment API, that will add to payments table and automatically adjust amount_paid.
        // If they edit details on this form, let's keep it consistent:
        // If amount_paid is modified in the customer edit form, what happens? Let's check:
        // Usually, the amount_paid is the sum of payments. We can update payments, or update customer directly.
        // Let's recalculate remaining_due = total_amount - amount_paid.
        const amtPaid = Number(amount_paid !== undefined ? amount_paid : currentCustomer.amount_paid);
        const remDue = totAmt - amtPaid;
        let status = 'Upcoming';
        if (remDue <= 0) {
            status = 'Paid';
        }
        else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDateObj = new Date(due_date);
            dueDateObj.setHours(0, 0, 0, 0);
            if (dueDateObj < today) {
                status = 'Overdue';
            }
            else if (amtPaid > 0) {
                status = 'Partial';
            }
        }
        await connection.query(`UPDATE customers 
       SET customer_name = ?, mobile_number = ?, email = ?, product_name = ?, product_category = ?, purchase_date = ?, due_date = ?, total_amount = ?, amount_paid = ?, remaining_due = ?, status = ?
       WHERE id = ?`, [customer_name, mobile_number, email || null, product_name || null, product_category || null, purchase_date || null, due_date || null, totAmt, amtPaid, remDue, status, id]);
        await connection.commit();
        res.json({ message: 'Customer updated successfully' });
    }
    catch (error) {
        await connection.rollback();
        console.error('updateCustomer error:', error);
        res.status(500).json({ message: 'Error updating customer', error: error.message });
    }
    finally {
        connection.release();
    }
}
async function deleteCustomer(req, res) {
    const { id } = req.params;
    try {
        const pool = (0, db_1.getPool)();
        const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json({ message: 'Customer deleted successfully' });
    }
    catch (error) {
        console.error('deleteCustomer error:', error);
        res.status(500).json({ message: 'Error deleting customer', error: error.message });
    }
}
