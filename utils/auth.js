import jwt from "jsonwebtoken";
import MSG from "../utils/message.js"

export const generateToken = (user) => {
    return jwt.sign({ id: user.id, role: user.role_name }, process.env.JWT_SECRET, {
        expiresIn: "1000d",
    });
};

export const verifyToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ message: MSG.ACCESS_DENIED });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({ message: MSG.INVALID_TOKEN });
    }
};