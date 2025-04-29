const jwt = require("jsonwebtoken");
const {HttpStatusCode} = require("axios");
const bcrypt = require("bcrypt");
const User = require("../model/user");
const rateLimit = require("express-rate-limit");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const cors = require("cors");
const userService = require("../services/userService");
const fn = (app) => {
    // CORS
    const corsOptions = {
        // origin: 'http://example.com',
        optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    }
    app.use(cors(corsOptions));

    ///////////////////////////////////////////////////////
    ////////////////  Security middleware  ////////////////
    ///////////////////////////////////////////////////////

    const {authenticateToken, authorizeRole} = require('./middleware');

    ///////////////////////////////////////////////////////
    //////////////////// Auth routes   ////////////////////
    ///////////////////////////////////////////////////////
    app.post('/register', async (req, res) => {
        console.log(`POST: /register`);

        if (!req.body) {
            return res.status(HttpStatusCode.BadRequest).send('Bad request. No body.');
        }

        const {username, password, role} = req.body;
        if (!username || !password) {
            return res.status(HttpStatusCode.BadRequest).send('Bad request. No credentials.');
        }

        const [e, userExists] = await userService.userExists(username)
        if (e)
            return res.status(HttpStatusCode.ServiceUnavailable).send('Database error.');

        if (userExists) return res.status(400).send('User exists');
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            registeredAt: Date.now(),
            password: hashedPassword,
            role: role || 'user',
            mfaSecret: null
        });

        try {
            const [err, savedUser] = await userService.saveUser(user);
            if (err) return res.status(500).send(`${JSON.stringify(err)}`);

            const {username, role} = savedUser;
            res.status(HttpStatusCode.Created).json({username, role});
        } catch (e) {
            res.status(500).json(JSON.stringify(e, null, 2));
        }
    });

    app.post('/login',
        rateLimit({windowMs: 15 * 60 * 1000, max: 5}),
        async (req, res) => {
            const {username, password} = req.body;
            const [err, user] = await userService.getUser(username);
            if (err) {
                return res.status(HttpStatusCode.ServiceUnavailable).send('Database error.');
            }
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(401).send('Invalid credentials');
            }
            if (user.mfaSecret) {
                const tempToken = jwt.sign(
                    {id: user._id, mfaPending: true},
                    userService.SECRET_KEY,
                    {expiresIn: '5m'});
                return res.json({tempToken, mfaRequired: true});
            }


            const token = jwt.sign(
                {id: user._id, role: user.role, username: user.username},
                userService.SECRET_KEY,
                {expiresIn: '1h'});


            const refreshToken = jwt.sign(
                {id: user._id, role: user.role, username: user.username},
                userService.SECRET_KEY,
                {expiresIn: '1d'});


//        .cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'strict' })
            // Assigning refresh token in http-only cookie
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                sameSite: 'None',
                secure: true,
                maxAge: 24 * 60 * 60 * 1000
            });

            res.json({token});
        });

    app.post('/logout',
        authenticateToken,
        async (req, res) => {
            const token = '.'
            // Remove refresh token in http-only cookie
            res.cookie('refreshToken', '', {});

            res.json({token});
        });

    app.post('/mfa/setup', authenticateToken, async (req, res) => {
        if (!req.user) return res.status(HttpStatusCode.BadRequest).send('No user in request');
        const [e, user] = await userService.getUser(req.user.username) // Object.values(users).find(u => u._id === req.user._id);
        if (e) return res.status(HttpStatusCode.InternalServerError).send('Failed to get user: ' + req.user.username + ': ' + e);
        if (user.mfaSecret) return res.status(400).send('MFA already enabled');
        const secret = speakeasy.generateSecret({name: 'MyPipelineApp'});
        user.mfaSecret = secret.base32;
        qrcode.toDataURL(secret.otpauth_url, (err, dataUrl) => {
            if (err) return res.status(500).send('Error generating QR code');
            res.json({qrCode: dataUrl, secret: secret.base32});
        });
    });

    app.post('/mfa/verify', authenticateToken, async (req, res) => {
        if (!req.user.mfaPending) return res.status(403).send('MFA not pending');
        const {token} = req.body;
        if (!req.user) return res.status(HttpStatusCode.BadRequest).send('No user in request');
        const [e, user] = await userService.getUser(req.user.username) // Object.values(users).find(u => u._id === req.user._id);
        if (e) return res.status(HttpStatusCode.InternalServerError).send('Failed to get user: ' + req.user.username + ': ' + e);
        if (!user) return res.status(HttpStatusCode.BadRequest).send('No such user: ' + req.user.username);
//        const user = Object.values(users).find(u => u._id === req.user._id);
        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: 'base32',
            token,
            window: 1,
        });
        if (verified) {
            const fullToken = jwt.sign(
                {id: user._id, role: user.role},
                userService.SECRET_KEY,
                {expiresIn: '1h'});
            res.json({token: fullToken});
        } else {
            res.status(401).send('Invalid MFA code');
        }
    });

    return (app)
}
module.exports = (app) => {
    return fn(app);
}
