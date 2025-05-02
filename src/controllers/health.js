const jwt = require("jsonwebtoken");
const {HttpStatusCode} = require("axios");
const bcrypt = require("bcrypt");
const User = require("../model/user");
const rateLimit = require("express-rate-limit");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const cors = require("cors");
const userService = require("../services/userService");
const {validUsername} = require("../misc");
const os = require('os');
const hostname = os.hostname();
const mongo = require("../db/mongo")
const {MongoClient} = require("mongodb");

async function checkConnection(client) {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        // console.log('Is MongoDB connected?', client.isConnected());
        return [null, true];
    } catch (e) {
        console.error(e);
        return [JSON.stringify(e), false];
    } finally {
        await client.close();
    }
}
const fn = async (app) => {

    ///////////////////////////////////////////////////////
    //////////////////// Auth routes   ////////////////////
    ///////////////////////////////////////////////////////
    app.get('/health', async (req, res) => {
        console.log(`${req.method}: ${req.originalUrl}`);

        let dbConnectionStatus;
        const client = new MongoClient(mongo.connectionString);
        const [err,canConnect] = await checkConnection(client);

        if (!canConnect) {
            dbConnectionStatus = `Database cannot be accessed [${err}!`
        }else {
            dbConnectionStatus = "Database is accessible!"
        }

        // check hostname, db connection
        const response = {
            appServer: hostname,
            dbServer: mongo.dbServer,
            dbStatus: dbConnectionStatus,
            available: canConnect
        }
        try {
            res.status(HttpStatusCode.Ok).json(response);
        } catch (e) {
            console.log(`${req.method}: ${req.originalUrl}: ${e.message}`);
            res.status(500).json(JSON.stringify(e, null, 2));
        }
    });

    return (app)
}
module.exports = (app) => {
    return fn(app);
}
