import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

let db;

function handleDisconnect() {
    db = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    db.connect((err) => {
        if (err) {
            console.error("DB connection error:", err.message);
            setTimeout(handleDisconnect, 2000); // Retry after 2 sec
        } else {
            console.log("Connected to MySQL database.");
        }
    });

    db.on("error", (err) => {
        console.error("DB error occurred:", err.message);
        if (err.code === "PROTOCOL_CONNECTION_LOST") {
            console.log("Reconnecting to MySQL...");
            handleDisconnect();
        } else {
            throw err;
        }
    });
}

handleDisconnect();

export default db;