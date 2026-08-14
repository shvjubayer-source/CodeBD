const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
    console.log("inside auth middleware");
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "Token required"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Token required"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;
        console.log("auth successful");
        next();
        
    } catch (err) {
        console.log("auth failed");
        return res.status(401).json({
            message: "Invalid or expired token, Login first"
        });

    }
}

module.exports = authenticate;