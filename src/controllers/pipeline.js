const dbRepo = require("../db/data-repo");
const PipelineRequest = require("../pipelineRequest");
const PipelineExecutor = require("../processors/pipelineExecutor");
const {addTrace, getTrace} = require('../trace')

module.exports = {

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    getAllPipelines: (req, res, next) => {
        dbRepo.getAllPipelines().then(([err, pipelines]) => {
            if (err) return next(err);
            res.json(pipelines);
        }).catch((err) => {
            next(err);
            // res.status(500).json({error: err});
        });

    },

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    getPipelineByUUID: (req, res, next) => {
        const uuid = req.params.uuid;
        dbRepo.getPipelineByUUID(uuid).then(([err, pipeline]) => {
            if (err) return next(err);
            if (!pipeline) {
                res.status(404).send(JSON.stringify({error: `Pipeline ${uuid} not found.`}));
            } else {
                res.json(pipeline);
            }
        }).catch((err) => {
            console.warn("controller:getPipelineByUUID:error ->" + JSON.stringify(err));
            next(err);
        });
    },

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    savePipeline: (req, res, next) => {
        const pipeline = req.body;
        if (!pipeline.uuid || !pipeline.name) {
            res.status(400).send(JSON.stringify({error: `Pipeline name and uuid required`}));
        }
        dbRepo.savePipeline(pipeline)
            .then(([err, savedPipeline]) => {
                if (err) return next(err);
                res.json(savedPipeline);
            })
            .catch((err) => {
                res.status(500).send(JSON.stringify({error: `${err}`}));
            });
    },

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    removePipeline: (req, res, next) => {
        const uuid = req.params.uuid;
        dbRepo.removePipeline(uuid).then(([err, nodes]) => {
            //if (err) return next(err);
            res.json([err, uuid]);
        }).catch((err) => {
            next(err);
        });
    },

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    getAllNodes: (req, res, next) => {
        dbRepo.getAllNodes().then(([err, nodes]) => {
            if (err) return next(err);
            res.json(nodes);
        }).catch((err) => {
            next(err);
            // res.status(500).json({error: err});
        });

    },

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    getNodeByUUID: (req, res, next) => {
        const uuid = req.params.uuid;
        dbRepo.getNodeByUUID(uuid).then(([err, node]) => {

            if (err) {
                console.log("controller:getNodeByUUID:error ->" + JSON.stringify(err));
                next(err);
            } else if (!node) {
                res.status(404).send(JSON.stringify({error: `Node ${uuid} not found.`}));
            } else {
                console.debug("controller:getNodeByUUID->" + JSON.stringify(node));
                res.json(node);
            }
        }).catch((err) => {
            console.log("controller:getNodeByUUID:error ->" + JSON.stringify(err));
            next(err);
            //res.status(500).json({error: err});
        });
    },

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    removeNode: (req, res, next) => {
        const uuid = req.params.uuid;
        dbRepo.removeNode(uuid).then(([err, nodes]) => {
            //if (err) return next(err);
            res.json([err, uuid]);
        }).catch((err) => {
            next(err);
            // res.status(500).json({error: err});
        });
    },

    /**
     *
     * @param req
     * @param res
     * @param next
     *
     * Response: err, savedData
     */
    saveNode: (req, res, next) => {
        const node = req.body;
        if (!node.uuid || !node.name) {
            res.status(400).send(JSON.stringify({error: `Node name and uuid required`}));
        }
        dbRepo.saveNode(node)
            .then(([err, savedNode]) => {
                if (err) return next(err);
                res.json(savedNode);
            })
            .catch((err) => {
                res.status(500).send(JSON.stringify({error: `${err}`}));
            });
    },

    /**
     *
     * @param req
     * @param res
     * @param next
     *
     * Response:  {
     *  error: "",
     *  results: {},
     *  "pipeline-uuid": uuid
     *  trace: []
     *  });
     */
    executePipeline: (req, res, next) => {
        const uuid = req.params.uuid;
        const sendTrace = (req.query.trace === "true")

        console.debug(`controller:executePipeline: ${uuid}:${sendTrace}`)
        const pipelineExecutor = new PipelineExecutor();
        pipelineExecutor.executePipeline(req.params.uuid, {})
            .then(([error, pipelineUUID, results]) => {
                if (error) {
                    console.warn(`POST /pipeline/:uuid/execute: Error: ${JSON.stringify(error)}`);
                    // console.log(`POST /pipeline/:uuid/execute: History: ${JSON.stringify(history, null, 2)}`);
                    const message = `${req.params.uuid}: ${JSON.stringify(error)}`;

                    const errResponse = {
                        error: message,
                        'pipeline-uuid': req.params.uuid,
                        trace: getTrace()
                    };
                    return res.status(500).json(errResponse);
                }

                return res.json({
                    error: null,
                    results: results,
                    "pipeline-uuid": uuid,
                    trace: sendTrace ? getTrace() : undefined
                });
            }).catch((error) => {
            console.warn(`POST /pipeline/:uuid/execute: Error: ${JSON.stringify(error)}`);
            const message = `${req.params.uuid}: ${JSON.stringify(error)}`;

            const errResponse = {
                error: message,
                'pipeline-uuid': req.params.uuid,
                trace: getTrace()
            };
            return res.status(500).json(errResponse);
        });
    }
}
