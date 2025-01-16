const dataRepo = require("../db/data-repo");


module.exports = {
    getAllPipelines: (req, res, next) => {
        dataRepo.getAllPipelines().then(([err,pipelines]) => {
            if (err) return next(err);
            res.json(pipelines);
        }).catch((err) => {
            next(err);
            // res.status(500).json({error: err});
        });

    },
    getPipelineByUUID: (req, res, next) => {
        const uuid = req.params.uuid;
        dataRepo.getPipelineByUUID(uuid).then(([err,pipeline]) => {
            if (err) return next(err);
            if (!pipeline) {
                res.status(404).send(JSON.stringify({error: `Pipeline ${uuid} not found.`}));
            } else {
                res.json(pipeline);
            }
        }).catch((err) => {
            console.log("controller:getPipelineByUUID:error ->"+JSON.stringify( err ));
            next(err);
        });
    },

    savePipeline: (req, res, next) => {
        const pipeline = req.body;
        if (!pipeline.uuid || !pipeline.name) {
            res.status(400).send(JSON.stringify({error: `Pipeline name and uuid required`}));
        }
        dataRepo.savePipeline(pipeline)
            .then(([err,savedPipeline]) => {
                if (err) return next(err);
                res.json(savedPipeline);
            })
            .catch((err) => {
                res.status(500).send(JSON.stringify({error: `${err}`}));
            });
    },



    getAllNodes: (req, res, next) => {
        dataRepo.getAllNodes().then(([err,nodes]) => {
            if (err) return next(err);
            res.json(nodes);
        }).catch((err) => {
            next(err);
            // res.status(500).json({error: err});
        });

    },

    getNodeByUUID: (req, res, next) => {
        const uuid = req.params.uuid;
        dataRepo.getNodeByUUID(uuid).then(([err,node]) => {

            if (err) {
                console.log("controler:getNodeByUUID:error ->" + JSON.stringify(err));
                next(err);
            } else if (!node) {
                res.status(404).send(JSON.stringify({error: `Node ${uuid} not found.`}));
            } else {
                console.log("controler:getNodeByUUID->"+JSON.stringify( node));
                res.json(node);
            }
        }).catch((err) => {
            console.log("controler:getNodeByUUID:error ->"+JSON.stringify( err ));
            next(err);
            //res.status(500).json({error: err});
        });
    },

    saveNode: (req, res, next) => {
        const node = req.body;
        if (!node.uuid || !node.name) {
            res.status(400).send(JSON.stringify({error: `Node name and uuid required`}));
        }
        dataRepo.saveNode(node)
            .then(([err,savedNode]) => {
                if (err) return next(err);
                res.json(savedNode);
            })
            .catch((err) => {
                res.status(500).send(JSON.stringify({error: `${err}`}));
            });
    },
}