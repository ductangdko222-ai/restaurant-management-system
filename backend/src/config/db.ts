import mysql from 'mysql2';
import { config } from 'dotenv';

config();
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'doantotnghiepvippromax',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+07:00'
});

const promisePool = pool.promise();
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Lỗi kết nối db', err.message);
        return;
    }
    console.log('Kết nối db thành công!');
    connection.release();
});

export default promisePool;