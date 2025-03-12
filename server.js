const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const endPoints = require('express-list-endpoints');

const pipelineRoutes = require("./src/routes/pipelines");
const nodeRoutes = require("./src/routes/nodes");
require('dotenv').config();

if (!process.env.DEBUG) {
    console.debug = () => {
    }
}

const listEndpoints = (app) => {
    console.log(endPoints(app));
}

try {
    ///////////////////////////////////////////////////////
    /////////////////////  Body Parser ////////////////////
    ///////////////////////////////////////////////////////
    // parse requests of content-type - application/json
    app.use(bodyParser.json());
    // parse requests of content-type - application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({extended: true}));

    ///////////////////////////////////////////////////////
    //////////////////// Auth routes   ////////////////////
    ///////////////////////////////////////////////////////
    const security = require('./src/controllers/security')
    security(app);

    //////////////////////////////////////////////////////////////////
    //////////////////// Add necessary Middleware ////////////////////
    //////////////////////////////////////////////////////////////////
    // JSON
    app.use(express.json());

    const options = {
        setHeaders: function (res, path, stat) {
            res.set('Access-Control-Allow-Origin', "*")
        }
    }

    // use /public for static files
    app.use(express.static('public', options))

    ///////////////////////////////////////////////////////
    //////////////////////// Routes ///////////////////////
    ///////////////////////////////////////////////////////
    const pipelineRoutes = require('./src/routes/pipelines');
    const nodeRoutes = require('./src/routes/nodes');
    const {HttpStatusCode} = require("axios");

    app.use('/pipeline', pipelineRoutes);
    app.use('/node', nodeRoutes);

    //////////////////////////////////////////////////////////
    //////////////////////// Home Path ///////////////////////
    //////////////////////////////////////////////////////////
    app.get("/", (req, res) => {
        //throw "Who is doing this??"
        res.json({message: "Welcome to service-pipe application."});
    });

    //////////////////////////////////////////////////////////////////////////////
    //////////////////////// set port, listen for requests ///////////////////////
    //////////////////////////////////////////////////////////////////////////////
    const PORT = process.env.PORT || 8080;
    const server = app.listen(PORT, (h) => {
        listEndpoints(app)
        console.log(`Server is running on port ${PORT}.`);
    });
    server.on('error', (error) => {
        console.error('server.js: Error starting the server:', error);
    });

} catch (e) {
    console.error(`App could not start: ${e}`)
}

module.exports = {app, listEndpoints}
