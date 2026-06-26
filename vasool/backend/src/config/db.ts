import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE
} = process.env;

let pool: mysql.Pool;

async function createTables() {
  const connection = await pool.getConnection();
  try {
    // 1. Users Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 2. Customers Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        mobile_number VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        product_name VARCHAR(255),
        product_category VARCHAR(255),
        purchase_date DATE,
        due_date DATE,
        total_amount DECIMAL(10, 2) NOT NULL,
        amount_paid DECIMAL(10, 2) DEFAULT 0.00,
        remaining_due DECIMAL(10, 2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'Upcoming',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_due_date (due_date)
      ) ENGINE=InnoDB;
    `);

    // 3. Payments Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        payment_amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50),
        payment_date DATE,
        reference_number VARCHAR(100),
        remarks TEXT,
        INDEX idx_customer_payments (customer_id),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 4. Reminder Logs Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reminder_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        message TEXT,
        status VARCHAR(50),
        type VARCHAR(50),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer_reminders (customer_id),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 5. Settings Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        business_name VARCHAR(255),
        owner_name VARCHAR(255),
        business_phone VARCHAR(20),
        business_email VARCHAR(255),
        business_address TEXT,
        upi_id VARCHAR(255),
        whatsapp_number VARCHAR(20),
        fine_rules TEXT,
        reminder_rules TEXT
      ) ENGINE=InnoDB;
    `);

    // 6. Reports Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_type VARCHAR(50),
        date_from DATE,
        date_to DATE,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

  } finally {
    connection.release();
  }
}

async function seedData() {
  const connection = await pool.getConnection();
  try {
    // Seed/ensure the single authorised admin account
    const FIXED_EMAIL = 'vasool2026@gmail.com';
    const FIXED_PASSWORD = 'srinivas@2026';

    const [existingFixedUser] = await connection.query<any[]>(
      'SELECT * FROM users WHERE username = ?',
      [FIXED_EMAIL]
    );

    if (existingFixedUser.length === 0) {
      // If an old default/legacy admin account exists, repurpose it instead of
      // creating a duplicate row (keeps the same users table, same architecture).
      const [legacyAdmin] = await connection.query<any[]>(
        'SELECT * FROM users WHERE username = ?',
        ['admin']
      );

      const hash = await bcrypt.hash(FIXED_PASSWORD, 10);

      if (legacyAdmin.length > 0) {
        await connection.query(
          'UPDATE users SET username = ?, password_hash = ?, owner_name = ? WHERE id = ?',
          [FIXED_EMAIL, hash, 'Shop Owner', legacyAdmin[0].id]
        );
        console.log(`Updated legacy admin account to fixed login: ${FIXED_EMAIL}`);
      } else {
        await connection.query(
          'INSERT INTO users (username, password_hash, owner_name) VALUES (?, ?, ?)',
          [FIXED_EMAIL, hash, 'Shop Owner']
        );
        console.log(`Seeded fixed admin user: ${FIXED_EMAIL}`);
      }
    } else {
      // Make sure the password always matches the required fixed password,
      // in case it was changed previously.
      const isMatch = await bcrypt.compare(FIXED_PASSWORD, existingFixedUser[0].password_hash);
      if (!isMatch) {
        const hash = await bcrypt.hash(FIXED_PASSWORD, 10);
        await connection.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, existingFixedUser[0].id]);
        console.log('Synced fixed admin password.');
      }
    }

    // Seed default settings
    const [settings] = await connection.query<any[]>('SELECT * FROM settings LIMIT 1');
    if (settings.length === 0) {
      const defaultFineRules = JSON.stringify([
        { days: 5, amount: 50 },
        { days: 10, amount: 150 }
      ]);
      const defaultReminderRules = JSON.stringify({
        sevenDaysBefore: true,
        threeDaysBefore: true,
        oneDayBefore: true,
        onDueDate: true,
        overdue: true
      });
      await connection.query(`
        INSERT INTO settings (
          business_name, owner_name, business_phone, business_email, 
          business_address, upi_id, whatsapp_number, fine_rules, reminder_rules
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'Vasool Enterprises',
        'Shop Owner',
        '9876543210',
        'contact@vasool.com',
        '123, Bazaar Street, Main Market',
        'vasool@upi',
        '9876543210',
        defaultFineRules,
        defaultReminderRules
      ]);
      console.log('Seeded default settings');
    }
  } finally {
    connection.release();
  }
}

export async function initDB() {
  // Connect without database initially to create it
  const connection = await mysql.createConnection({
    host: MYSQL_HOST || 'localhost',
    port: Number(MYSQL_PORT || 3306),
    user: MYSQL_USER || 'root',
    password: MYSQL_PASSWORD || 'Dhivija@2038'
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE || 'vasool'}\`;`);
  await connection.end();

  // Re-establish connection pool with database
  pool = mysql.createPool({
    host: MYSQL_HOST || 'localhost',
    port: Number(MYSQL_PORT || 3306),
    user: MYSQL_USER || 'root',
    password: MYSQL_PASSWORD || 'Dhivija@2038',
    database: MYSQL_DATABASE || 'vasool',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  await createTables();
  await seedData();
}

export function getPool(): mysql.Pool {
  if (!pool) {
    throw new Error('Database pool has not been initialized.');
  }
  return pool;
}
