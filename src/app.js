const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const validator = require("./model/validator")

const PipelineNode = require("./model/pipelineNode");

const dataRepo = require("./db/data-repo");

var corsOptions = {
    // origin: 'http://example.com',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
app.use(cors(corsOptions));

const options = {
    setHeaders: function (res, path, stat) {
        res.set('Access-Control-Allow-Origin', "*")
    }
};

app.use(express.static('public', options))

// parse requests of content-type - application/json
app.use(bodyParser.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}));

// simple route
app.get("/", (req, res) => {
    res.json({message: "Welcome to service-pipe application."});
});

// get all pipelines from MongoDB
app.get("/pipelines", (req, res) => {

    dataRepo.getAllPipelines().then((pipelines) => {
        res.json(pipelines);
    }).catch((err) => {
        res.status(500).json({error: err});
    });
});

app.get('/pipeline/:uuid', (req, res) => {
    const uuid = req.params.uuid;
    dataRepo.getPipelineByUUID(uuid).then((pipelines) => {
        res.json(pipelines);
    }).catch((err) => {
        res.status(500).json({error: err});
    });
});

/**
 * Middleware to validate Pipeline Document
 * @param schema
 * @returns {(function(*, *, *): (*|undefined))|*}
 */
const validateDoc = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

app.post('/pipeline', validateDoc(validator.pipelineSchema), (req, res) => {
    const pipeline = req.body;
    if (!pipeline.uuid || !pipeline.name) {
        res.status(400).send(JSON.stringify({error: `Pipeline name and uuid required`}));
    }
    dataRepo.savePipeline(pipeline)
        .then((savedPipeline) => {
            res.json(savedPipeline);
        })
        .catch((err) => {
            res.status(500).send(JSON.stringify({error: `${err}`}));
        });
});

// get all nodes from MongoDB
app.get("/nodes", (req, res) => {

    dataRepo.getAllNodes().then((nodes) => {
        res.json(nodes);
    }).catch((err) => {
        res.status(500).json({error: err});
    });
});

app.get('/node/:uuid', (req, res) => {
    const uuid = req.params.uuid;
    dataRepo.getPipelineByUUID(uuid).then((node) => {
        res.json(node);
    }).catch((err) => {
        res.status(500).json({error: err});
    });
});



app.post('/node', validateDoc(validator.nodeSchema), (req, res) => {
    const nodeInfo = req.body;
    console.log(`POST /node: ${JSON.stringify(req.body)}`);
    let node
    try {
        node = new PipelineNode(nodeInfo)
    } catch (e) {
        res.status(400).send(`Node data error: ${e.message}`);
        return;
    }

    dataRepo.saveNode(node)
        .then((savedNode) => {
            res.json(savedNode);
        })
        .catch((err) => {
            res.status(500).send(JSON.stringify({error: `${err}`}));
        });

});

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});

