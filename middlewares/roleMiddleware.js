function authorizeRole(...allowedRoles) {
    return (req, res, next) => {

        // authMiddleware should already set req.user
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Forbidden: You do not have permission"
            });
        }

        next();
    };
}

module.exports = authorizeRole;