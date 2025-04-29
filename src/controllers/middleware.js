
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
        jwt.verify(token, userService.SECRET_KEY, (accessTokenError, accessUser) => {
            if (accessTokenError) {
                /// if token is not valid, check for valid refreshToken in cookie
                const refreshToken = req.cookies.get('refreshToken');
                if (!refreshToken) return res.status(401).send('No token provided');
                jwt.verify(refreshToken, userService.SECRET_KEY, (refreshTokenError, refreshUser) => {
                    if (refreshTokenError) return res.status(403).send('Invalid token');
                    /// Send a new accessToken in res
                    // 1) create new access token and
                    // 2) add it as header to response
                    req.headers.authorization = jwt.sign(
                        {id: refreshUser._id, role: refreshUser.role, username: refreshUser.username},
                        userService.SECRET_KEY,
                        {expiresIn: '1h'});
                    // make user available for request
                    req.user = refreshUser;
                    // complete the request
                    return next()
                })

                return res.status(403).send('Invalid token');
            }
            // make user available for request
            req.user = accessUser;
            next();
        });
    } catch (e) {
        return res.status(403).send('Forbidden');
    }
};

const authorizeRole =  (req, res, next) => {

    console.log(`authorizeRole: accessing resource: ${(req.originalUrl)}`);

    // if (!securedEndPoint(req.url)) {
    //     return next();
    // }
    if (!req.user)
        return res.status(403).send('Forbidden');

    if(req.user.role === 'admin'){
        req.isAdmin = true;
    }
    return next();
}

module.exports = {authenticateToken, authorizeRole}
