import { Response } from 'express';
import { getPool } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { verifyCurrentUserPassword } from './authController';

interface DeleteSummary {
  payments: number;
  reminder_logs: number;
  reports: number;
  customers: number; // cascades remaining payments/reminder_logs tied to these customers
}

/**
 * Deletes application data created within an inclusive From Date -> To Date
 * window. Requires the logged-in user's password as confirmation before
 * anything is permanently removed.
 *
 * No database schema changes are made by this feature - it only issues
 * DELETE statements against the existing tables created in config/db.ts.
 */
export async function deleteDataByDateRange(req: AuthRequest, res: Response) {
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
    const passwordOk = await verifyCurrentUserPassword(req.user.username, password);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Incorrect password. Data was not deleted.' });
    }

    const pool = getPool();
    const connection = await pool.getConnection();
    const summary: DeleteSummary = { payments: 0, reminder_logs: 0, reports: 0, customers: 0 };

    try {
      await connection.beginTransaction();

      // 1. Payments made within the date range (independent of which
      //    customer they belong to).
      const [paymentsResult]: any = await connection.query(
        'DELETE FROM payments WHERE payment_date >= ? AND payment_date <= ?',
        [fromDate, toDate]
      );
      summary.payments = paymentsResult.affectedRows || 0;

      // 2. Reminder logs sent within the date range.
      const [remindersResult]: any = await connection.query(
        'DELETE FROM reminder_logs WHERE DATE(sent_at) >= ? AND DATE(sent_at) <= ?',
        [fromDate, toDate]
      );
      summary.reminder_logs = remindersResult.affectedRows || 0;

      // 3. Generated reports within the date range.
      const [reportsResult]: any = await connection.query(
        'DELETE FROM reports WHERE DATE(generated_at) >= ? AND DATE(generated_at) <= ?',
        [fromDate, toDate]
      );
      summary.reports = reportsResult.affectedRows || 0;

      // 4. Customers created within the date range. The FOREIGN KEY ... ON
      //    DELETE CASCADE constraints on `payments` and `reminder_logs`
      //    automatically remove any remaining ledger/payment/reminder rows
      //    tied to these customers (e.g. payments made before fromDate for
      //    a customer added inside the range).
      const [customersResult]: any = await connection.query(
        'DELETE FROM customers WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?',
        [fromDate, toDate]
      );
      summary.customers = customersResult.affectedRows || 0;

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    res.json({
      message: 'Selected application data has been permanently deleted.',
      fromDate,
      toDate,
      deleted: summary
    });
  } catch (error: any) {
    console.error('Delete data by date range error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
