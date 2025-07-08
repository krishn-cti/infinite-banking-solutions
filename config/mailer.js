import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import ejs from "ejs";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

export const sendVerificationEmail = async (req, email, password, token) => {
    const verificationLink = `${req.protocol}://${req.get('host')}/api/verify/${token}`;

    const templatePath = path.join(__dirname, "../views/verify-email.ejs");

    const template = fs.readFileSync(templatePath, "utf8");

    const emailHtml = ejs.render(template, {
        verificationLink,
        email,
        password
    });

    const mailOptions = {
        from: `"No Reply" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Accept Invitation",
        html: emailHtml
    };

    return transporter.sendMail(mailOptions);
};
