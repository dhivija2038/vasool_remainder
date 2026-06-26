import { Response } from 'express';
import { getPool } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export async function getReminderLogs(req: AuthRequest, res: Response) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT r.*, c.customer_name, c.mobile_number 
       FROM reminder_logs r 
       JOIN customers c ON r.customer_id = c.id 
       ORDER BY r.sent_at DESC`
    );
    res.json(rows);
  } catch (error: any) {
    console.error('getReminderLogs error:', error);
    res.status(500).json({ message: 'Error retrieving reminder logs', error: error.message });
  }
}

export async function createReminderLog(req: AuthRequest, res: Response) {
  const { customer_id, message, status, type } = req.body;

  if (!customer_id || !message || !status || !type) {
    return res.status(400).json({ message: 'Customer ID, message, status, and type are required' });
  }

  try {
    const pool = getPool();
    await pool.query(
      'INSERT INTO reminder_logs (customer_id, message, status, type) VALUES (?, ?, ?, ?)',
      [customer_id, message, status, type]
    );
    res.status(201).json({ message: 'Reminder log recorded successfully' });
  } catch (error: any) {
    console.error('createReminderLog error:', error);
    res.status(500).json({ message: 'Error recording reminder log', error: error.message });
  }
}
