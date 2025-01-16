const dataRepo = require("../db/data-repo");
const PipelineRequest = require("../pipelineRequest");


module.exports = {

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    getAllPipelines: (req, res, next) => {
        dataRepo.getAllPipelines().then(([err, pipelines]) => {
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
        dataRepo.getPipelineByUUID(uuid).then(([err, pipeline]) => {
            if (err) return next(err);
            if (!pipeline) {
                res.status(404).send(JSON.stringify({error: `Pipeline ${uuid} not found.`}));
            } else {
                res.json(pipeline);
            }
        }).catch((err) => {
            console.log("controller:getPipelineByUUID:error ->" + JSON.stringify(err));
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
        dataRepo.savePipeline(pipeline)
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
    getAllNodes: (req, res, next) => {
        dataRepo.getAllNodes().then(([err, nodes]) => {
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
        dataRepo.getNodeByUUID(uuid).then(([err, node]) => {

            if (err) {
                console.log("controler:getNodeByUUID:error ->" + JSON.stringify(err));
                next(err);
            } else if (!node) {
                res.status(404).send(JSON.stringify({error: `Node ${uuid} not found.`}));
            } else {
                console.log("controler:getNodeByUUID->" + JSON.stringify(node));
                res.json(node);
            }
        }).catch((err) => {
            console.log("controler:getNodeByUUID:error ->" + JSON.stringify(err));
            next(err);
            //res.status(500).json({error: err});
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
        dataRepo.saveNode(node)
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
     * Response:  [results, uuid, history, errorObj]
     */
    executePipeline: (req, res, next) => {
        const uuid = req.params.uuid;

        dataRepo.getPipelineByUUID(uuid).then(([err, pipeline]) => {
            if (err) return next(err);

            /// check pipelineRequest.username/apiKey in middleware
            const initialData = req.body;
            const pr = new PipelineRequest(pipeline, initialData);
            console.log(`POST /pipeline/:uuid/execute: pipelineRequest: ${JSON.stringify(pr)}`);
            pr.start().then(([results, history, err]) => {
                if (err) {
                    console.log(`POST /pipeline/:uuid/execute: Error: ${JSON.stringify(err)}`);
                    console.log(`POST /pipeline/:uuid/execute: History: ${JSON.stringify(history, null, 2)}`);
                    const errorObj = {
                        message: `[${pr.pipeline.name}]:${pr.pipeline.uuid}: ${err.toString()}`,
                        log: history
                    };
                    const errResponse = [null, uuid, history, errorObj];
                    return res.status(500).json(errResponse);
                }

                //TODO Store the execution History

                return res.json([results, uuid, history]);
            }, (e) => {
                const msg = `Execution error ${e.toString()}:\n${e.stack}\n${pr.pipeline}`;
                console.log(msg);
                return res.status(500).send(msg)
            })

        }).catch((err) => {
            console.log("controller:getPipelineByUUID:error ->" + JSON.stringify(err));
            next(err);
        });
    }
}
