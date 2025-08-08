import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded());
app.use(cors());

// global variable for EJS
app.locals.BASE_URL = `${process.env.BASE_PATH}:${process.env.PORT}`;
app.set("view engine", "ejs");

// the views directory
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

import userRoutes from "./routes/user.js";
import caseRoutes from "./routes/case.js";

app.use("/api", userRoutes);
app.use("/api", caseRoutes);

app.get("/success", (req, res) => {
    res.render("success", { appPath: process.env.APP_PATH });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));