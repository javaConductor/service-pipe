
///////////////////////////////////////////////////////
////////////////  Security middleware  ////////////////
///////////////////////////////////////////////////////
const jwt = require("jsonwebtoken");
const userService = require("../services/userService");
const authenticateToken = (req, res, next) => {
    // if (!securedEndPoint(req.url)) {
    //     return next();
    // }
    console.log(`authenticateToken: url:[${req.url}]: headers:${JSON.stringify(req.headers)}`);

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send('No token provided');
    try {
        jwt.verify(token, userService.SECRET_KEY, (err, user) => {
            if (err) return res.status(403).send('Invalid token');
            req.user = user;
            next();
        });
    } catch (e) {
        return res.status(403).send('Forbidden');
    }
};

const authorizeRole =  (req, res, next) => {
    // if (!securedEndPoint(req.url)) {
    //     return next();
    // }
    // if (!req.user || !roles.includes(req.user.role))
    //     return res.status(403).send('Forbidden');

    return next();
}

const securedEndPoint = (url) => {
    switch (url) {
        case '/':
        case '/login':
        case '/register':
            return false;
        default:
            return true;
    }
}

module.exports = {authenticateToken,authorizeRole}