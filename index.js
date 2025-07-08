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
app.set("view engine", "ejs");

// Set the views directory
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

import userRoutes from "./routes/user.js";
import caseRoutes from "./routes/case.js";

app.use("/api", userRoutes);
app.use("/api", caseRoutes);

app.get("/success", (req, res) => {
    res.render("success");
});
// app.get("/reset-success", (req, res) => {
//     res.render("reset-success");
// });

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));