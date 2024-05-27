const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

// pool is a connection of connections
const pool = mysql
  .createPool({
    host: process.env.HOST,
    user: process.env.MYSQL_USER,
    password: process.env.PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
  .promise();

async function getWhiteBoardFromRoomId(roomId) {
  try {
    const [rows] = await pool.query(
      `SELECT data FROM whiteboard WHERE roomid=?`,
      [roomId]
    );
    if (rows.length === 0) {
      throw new Error("Room ID not found");
    }
    return rows[0];
  } catch (error) {
    console.error("Error fetching whiteboard data:", error);
    throw error;
  }
}
async function updateWhiteBoardFromRoomId(roomId, userName, updatedData) {
  try {
    await insertWhiteBoard(roomId, userName, updatedData);
    await pool.query(
      `UPDATE whiteboard SET data = ?, updatedBy = ? WHERE roomid = ?`,
      [JSON.stringify(updatedData), userName, roomId]
    );
  } catch (error) {
    console.error("Error updating whiteboard data:", error);
    throw error;
  }
}

async function insertWhiteBoard(roomId, userName, updatedData) {
  try {
    const [rows] = await pool.query(`SELECT * FROM whiteboard WHERE roomid=?`, [
      roomId,
    ]);
    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO whiteboard (roomid, data, createdBy, updatedBy) VALUES (?, ?, ?, ?)`,
        [roomId, JSON.stringify(updatedData), userName, userName]
      );
    }
  } catch (error) {
    console.error("Error inserting whiteboard data:", error);
    throw error;
  }
}

// create table if does not exits
async function createWhiteBoardTableIfNotExists() {
  try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS whiteboard (
          id INT AUTO_INCREMENT,
          roomid INT NOT NULL,
          data LONGTEXT,
          createdBy VARCHAR(255),
          updatedBy VARCHAR(255),
          PRIMARY KEY (id)
        )
      `);
  } catch (error) {
    console.error("Error creating table:", error);
    throw error;
  }
}

module.exports = {
  getWhiteBoardFromRoomId,
  updateWhiteBoardFromRoomId,
  createWhiteBoardTableIfNotExists,
  pool,
};
