const { createClient } = require("@libsql/client");  
const bcrypt = require("bcryptjs");  
  
const db = createClient({  
  url: process.env.TURSO_DATABASE_URL,  
  authToken: process.env.TURSO_AUTH_TOKEN,  
});  
  
async function dbAll(sql, args = []) {  
  const result = await db.execute({ sql, args });  
  return result.rows;  
}  
  
async function dbGet(sql, args = []) {  
  const result = await db.execute({ sql, args });  
  return result.rows[0] || null;  
}  
  
async function dbRun(sql, args = []) {  
  const result = await db.execute({ sql, args });  
  return { lastInsertRowid: Number(result.lastInsertRowid), changes: result.rowsAffected };  
}  
  
async function initDb() {  
  const statements = [  
    `CREATE TABLE IF NOT EXISTS users (  
      id INTEGER PRIMARY KEY AUTOINCREMENT,  
      username TEXT UNIQUE NOT NULL,  
      password TEXT NOT NULL,  
      avatar TEXT DEFAULT NULL,  
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP  
    )`,  
    `CREATE TABLE IF NOT EXISTS groups_table (  
      id INTEGER PRIMARY KEY AUTOINCREMENT,  
      name TEXT NOT NULL,  
      description TEXT DEFAULT '',  
      creator_id INTEGER NOT NULL,  
      avatar TEXT DEFAULT NULL,  
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
      FOREIGN KEY (creator_id) REFERENCES users(id)  
    )`,  
    `CREATE TABLE IF NOT EXISTS group_members (  
      id INTEGER PRIMARY KEY AUTOINCREMENT,  
      group_id INTEGER NOT NULL,  
      user_id INTEGER NOT NULL,  
      role TEXT DEFAULT 'member',  
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
      FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,  
      FOREIGN KEY (user_id) REFERENCES users(id),  
      UNIQUE(group_id, user_id)  
    )`,  
    `CREATE TABLE IF NOT EXISTS join_requests (  
      id INTEGER PRIMARY KEY AUTOINCREMENT,  
      group_id INTEGER NOT NULL,  
      user_id INTEGER NOT NULL,  
      status TEXT DEFAULT 'pending',  
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
      FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,  
      FOREIGN KEY (user_id) REFERENCES users(id),  
      UNIQUE(group_id, user_id)  
    )`,  
    `CREATE TABLE IF NOT EXISTS messages (  
      id INTEGER PRIMARY KEY AUTOINCREMENT,  
      group_id INTEGER NOT NULL,  
      user_id INTEGER NOT NULL,  
      content TEXT DEFAULT '',  
      type TEXT DEFAULT 'text',  
      file_url TEXT DEFAULT NULL,  
      file_name TEXT DEFAULT NULL,  
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  
      FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,  
      FOREIGN KEY (user_id) REFERENCES users(id)  
    )`,  
    `CREATE TABLE IF NOT EXISTS admin_settings (  
      id INTEGER PRIMARY KEY AUTOINCREMENT,  
      key TEXT UNIQUE NOT NULL,  
      value TEXT NOT NULL  
    )`  
  ];  
  
  for (const sql of statements) {  
    await db.execute(sql);  
  }  
  
  const adminPw = await dbGet("SELECT * FROM admin_settings WHERE key = 'admin_password'");  
  if (!adminPw) {  
    const hashed = bcrypt.hashSync("123456789", 10);  
    await dbRun("INSERT INTO admin_settings (key, value) VALUES (?, ?)", ["admin_password", hashed]);  
  }  
}  
  
module.exports = { db, dbAll, dbGet, dbRun, initDb };
