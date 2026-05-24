import mysql from 'mysql2';
import { config } from 'dotenv';

config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'doantotnghiepvippromax',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+07:00',
    dateStrings: true,
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
    } : undefined
});

const promisePool = pool.promise();

const originalQuery = promisePool.query.bind(promisePool);
(promisePool as any).query = async function(sql: any, values?: any) {
    try {
        await originalQuery("SET time_zone = '+07:00'");
        return await originalQuery(sql, values);
    } catch (error) {
        console.error('Lỗi query:', error, { sql, values });
        throw error;
    }
};

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Lỗi kết nối db', err.message);
        return;
    }
    console.log('Kết nối db thành công!');
    connection.release();
});

export default promisePool;