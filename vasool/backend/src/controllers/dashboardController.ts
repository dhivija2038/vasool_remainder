import { Response } from 'express';
import { getPool } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { syncCustomerStatuses } from './customerController';

export async function getDashboardStats(req: AuthRequest, res: Response) {
  try {
    const pool = getPool();
    // Run status sync first to ensure calculations are correct
    await syncCustomerStatuses(pool);

    // 1. Total Customers
    const [totalCustRows] = await pool.query<any[]>('SELECT COUNT(*) as count FROM customers');
    const totalCustomers = totalCustRows[0]?.count || 0;

    // 2. Outstanding Amount
    const [outstandingRows] = await pool.query<any[]>('SELECT SUM(remaining_due) as total FROM customers');
    const outstandingAmount = Number(outstandingRows[0]?.total || 0);

    // 3. Collected Today
    const [collectedTodayRows] = await pool.query<any[]>(
      'SELECT SUM(payment_amount) as total FROM payments WHERE payment_date = CURDATE()'
    );
    const collectedToday = Number(collectedTodayRows[0]?.total || 0);

    // 4. Collected This Month
    const [collectedMonthRows] = await pool.query<any[]>(
      'SELECT SUM(payment_amount) as total FROM payments WHERE YEAR(payment_date) = YEAR(CURDATE()) AND MONTH(payment_date) = MONTH(CURDATE())'
    );
    const collectedThisMonth = Number(collectedMonthRows[0]?.total || 0);

    // 5. Due Today
    const [dueTodayRows] = await pool.query<any[]>(
      'SELECT SUM(remaining_due) as total FROM customers WHERE due_date = CURDATE() AND remaining_due > 0'
    );
    const dueToday = Number(dueTodayRows[0]?.total || 0);

    // 6. Upcoming (7 Days)
    const [upcoming7DaysRows] = await pool.query<any[]>(
      `SELECT SUM(remaining_due) as total FROM customers 
       WHERE due_date > CURDATE() AND due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND remaining_due > 0`
    );
    const upcoming7Days = Number(upcoming7DaysRows[0]?.total || 0);

    // 7. Overdue Customers count
    const [overdueRows] = await pool.query<any[]>("SELECT COUNT(*) as count FROM customers WHERE status = 'Overdue'");
    const overdueCustomers = overdueRows[0]?.count || 0;

    res.json({
      totalCustomers,
      outstandingAmount,
      collectedToday,
      collectedThisMonth,
      dueToday,
      upcoming7Days,
      overdueCustomers
    });
  } catch (error: any) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ message: 'Error retrieving dashboard stats', error: error.message });
  }
}

export async function getDashboardCharts(req: AuthRequest, res: Response) {
  try {
    const pool = getPool();
    await syncCustomerStatuses(pool);

    // 1. Due Status Grouping
    const [statusRows] = await pool.query<any[]>(
      'SELECT status, COUNT(*) as count, SUM(remaining_due) as total_due FROM customers GROUP BY status'
    );

    // 2. Upcoming Dues (Next 7 Days)
    const [upcomingDuesRows] = await pool.query<any[]>(
      `SELECT due_date, SUM(remaining_due) as total_due FROM customers 
       WHERE due_date >= CURDATE() AND due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND remaining_due > 0 
       GROUP BY due_date ORDER BY due_date ASC`
    );

    // 3. Recent Customers (Top 5)
    const [recentCustomers] = await pool.query(
      'SELECT * FROM customers ORDER BY created_at DESC LIMIT 5'
    );

    // 4. Overdue Customers (Top 5 by remaining due)
    const [overdueCustomers] = await pool.query(
      "SELECT * FROM customers WHERE status = 'Overdue' ORDER BY remaining_due DESC LIMIT 5"
    );

    res.json({
      statusDistribution: statusRows,
      upcomingDuesTimeline: upcomingDuesRows,
      recentCustomers,
      overdueCustomers
    });
  } catch (error: any) {
    console.error('getDashboardCharts error:', error);
    res.status(500).json({ message: 'Error retrieving dashboard chart data', error: error.message });
  }
}
