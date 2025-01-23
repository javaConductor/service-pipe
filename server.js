const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");


// if (process.env.DEBUG){
//     process.env.DEBUG = eval(process.env.DEBUG);
// }else{
//     process.env.DEBUG = false;
// }
const DEBUG = false;
if (!process.env.DEBUG){
    console.debug = () => {

    }
}
/// Routes
const pipelineRoutes = require('./src/routes/pipelines') ;
const nodeRoutes = require('./src/routes/nodes') ;

const corsOptions = {
    // origin: 'http://example.com',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
app.use(cors(corsOptions));

const options = {
    setHeaders: function (res, path, stat) {
        res.set('Access-Control-Allow-Origin', "*")
    }
};

const checkTokenMiddleware = function (req, res, next) {
/// get the x-access-token header

}

app.use(express.static('public', options))

// parse requests of content-type - application/json
app.use(bodyParser.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}));

app.use('/pipeline', pipelineRoutes);
app.use('/node', nodeRoutes);

// simple route
app.get("/", (req, res) => {
    res.json({message: "Welcome to service-pipe application."});
});

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});

