const dbRepo = require("../db/data-repo");
const PipelineExecutor = require("../processors/pipelineExecutor");
const PipelineExecution = require("../model/PipelineExecution");
const {v4: uuidV4} = require("uuid");
const {HttpStatusCode} = require("axios");
let PUBLIC_USER = "$public";
const canAccessPipeline = (pipeline, username, userRole) => (userRole === 'admin' ? true : pipeline.owner_user === username || pipeline.owner_user === PUBLIC_USER)
const canAccessNode = (node, username, userRole) => (userRole === 'admin' ? true : node.owner_user === username || node.owner_user === PUBLIC_USER)

module.exports = {
    /**
     *
     * @param req
     * @param res
     * @param next
     */
    getAllPipelines: (req, res, next) => {
        // const user = req.user;
        const {id: userId, role: userRole, username} = req.user;

        dbRepo.getAllPipelines(username).then(([err, pipelines]) => {
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
    getPipelineByUUID: async (req, res, next) => {
        const uuid = req.params.uuid;
        if (!uuid) {
            return res.status(HttpStatusCode.BadRequest).send('pipeline UUID missing from request.');
        }
        const {id: userId, role: userRole, username} = req.user;

        try {
            const [err, pipeline] = await dbRepo.getPipelineByUUID(uuid, user)

            if (err) return next(err);
            if (!pipeline) {
                res.status(404).send(JSON.stringify({error: `Pipeline ${uuid} not found.`}));
            } else {
                if (!canAccessPipeline(pipeline, username, userRole)) {
                    return res.status(HttpStatusCode.Unauthorized).send('User ' + username + ' has no access to this pipeline.');
                }
                res.json(pipeline);
            }
        } catch (err) {
            console.warn("controller:getPipelineByUUID:error ->" + JSON.stringify(err));
            next(err);
        }
    },

    /**
     *
     * @param req
     * @param res
     */
    savePipeline: (req, res) => {
        const pipeline = req.body;

        if (!pipeline) {
            return res.status(HttpStatusCode.BadRequest).send('Pipeline missing from request.');
        }
        const isNew = !pipeline._id
        const {id: userId, role: userRole, username} = req.user;

        if (!pipeline.owner_user) {
            pipeline.owner_user = username
        } else if (!canAccessPipeline(pipeline, username, userRole)) {
            return res.status(HttpStatusCode.Unauthorized).send('User ' + username + ' has no access to this pipeline.');
        }

        try {
            const [err, savedPipeline] = dbRepo.savePipeline(pipeline)
            if (!err) {
                console.log(`${isNew ? 'Created' : 'Updated'} pipeline ${savedPipeline.uuid} `)
            } else {
                console.warn(`Error ${isNew ? 'Creating' : 'Updating'} pipeline ${pipeline.uuid}: ${err} `)
            }
            res.json([err, err ? undefined : savedPipeline]);
        } catch (err) {
            res.status(500).json(err);
        }
    },

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    removePipeline: async (req, res, next) => {
        const uuid = req.params.uuid;
        if (!uuid) {
            return res.status(HttpStatusCode.BadRequest).send('pipeline UUID missing from request.');
        }
        const {id: userId, role: userRole, username} = req.user;

        const [err, pipeline] = await dbRepo.getPipelineByUUID(uuid)
        if (err) return next(err);
        if (!pipeline) {
            res.status(404).send(JSON.stringify({error: `Pipeline ${uuid} not found.`}));
        }
        if (!canAccessPipeline(pipeline, username, userRole)) {
            return res.status(HttpStatusCode.Unauthorized).send('User ' + username + ' has no access to this pipeline.');
        }

        dbRepo.removePipeline(uuid).then(([err]) => {
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
        const {id: userId, role: userRole, username} = req.user;

        dbRepo.getAllNodes(username).then(([err, nodes]) => {
            if (err) return next(err);
            res.json(nodes);
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
    getNodeByUUID: async (req, res, next) => {
        const nodeUUID = req.params.uuid;
        if (!nodeUUID) {
            return res.status(HttpStatusCode.BadRequest).send('node UUID missing from request.');
        }

        const {id: userId, role: userRole, username} = req.user;
        try {

            const [err, node] = dbRepo.getNodeByUUID(nodeUUID)

            if (err) {
                console.log("controller:getNodeByUUID:error ->" + JSON.stringify(err));
                next(err);
            } else if (!node) {
                res.status(404).send(JSON.stringify({error: `Node ${nodeUUID} not found.`}));
            } else {
                if (!canAccessNode(node, username, userRole)) {
                    return res.status(HttpStatusCode.Unauthorized).send('User ' + node.owner_user + ' has no access to this node.');
                }
                console.debug("controller:getNodeByUUID->" + JSON.stringify(node));
                res.json(node);
            }
        } catch (err) {
            console.log("controller:getNodeByUUID:error ->" + JSON.stringify(err));
            next(err);
        }
    },

    /**
     *
     * @param req
     * @param res
     * @param next
     */
    removeNode: async (req, res, next) => {
        const uuid = req.params.uuid;
        if (!uuid) {
            return res.status(HttpStatusCode.BadRequest).send('node UUID missing from request.');
        }
        const {id: userId, role: userRole, username} = req.user;
        const [err, node] = await dbRepo.getNodeByUUID(uuid)
        if (err) return next(err);
        if (!node) {
            return res.status(404).send(JSON.stringify({error: `Node ${uuid} not found.`}));
        }
        if (!canAccessPipeline(node, username, userRole)) {
            return res.status(HttpStatusCode.Unauthorized).send('User ' + username + ' has no access to this node.');
        }

        dbRepo.removeNode(uuid).then(([err]) => {
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
     *
     * Response: err, savedData
     */
    saveNode: async (req, res, next) => {
        const node = req.body;
        if (!node) {
            return res.status(HttpStatusCode.BadRequest).send('node missing from request.');
        }

        if (!node.uuid || !node.name) {
            res.status(400).send(JSON.stringify({error: `Node name and uuid required`}));
        }

        const {id: userId, role: userRole, username} = req.user;
        if (!canAccessNode(node, username, userRole)) {
            //if(pipeline.owner_user !== username)
            return res.status(HttpStatusCode.Unauthorized).send('User ' + node.owner_user + ' has no access to this node.');
        }
        try {
            const [err, savedNode] = dbRepo.saveNode(node)
            if (err) return next(err);
            res.json(savedNode);
        } catch (err) {
            res.status(500).send(JSON.stringify({error: `${err}`}));
        }
    },

    /**
     *
     * @param req
     * @param res
     *
     * Response:  {
     *  error: "",
     *  results: {},
     *  "pipeline-uuid": uuid
     *  "pipeline-execution-id": uuid
     *  trace: []
     *  });
     */
    executePipeline: async (req, res) => {
        const pipelineUUID = req.params.uuid;
        if (!pipelineUUID) {
            return res.status(HttpStatusCode.BadRequest).send('pipeline UUID missing from request.');
        }
        const sendTrace = (req.query.trace === "true")
        const initialData = req.body || {}

        const {id: userId, role: userRole, username} = req.user;
        const [err, pipeline] = await dbRepo.getPipelineByUUID(pipelineUUID)
        if (!pipeline) {
            res.status(404).send(JSON.stringify({error: `Pipeline ${pipelineUUID} not found.`}));
        }
        if (err) {
            console.warn(`POST /pipeline/:uuid/execute: Error: ${JSON.stringify(err)}`);
            const message = `${req.params.uuid}: ${JSON.stringify(err)}`;

            const errResponse = {
                error: message,
            };
            return res.status(500).json(errResponse);
        }
        if (!canAccessNode(pipeline, username, userRole)) {
            return res.status(HttpStatusCode.Unauthorized).send('User ' + username + ' has no access to this node.');
        }

        console.log(`controller:executePipeline: ${pipelineUUID}:${sendTrace}`)
        const pipelineExecutor = new PipelineExecutor();
        const pipelineExecution = new PipelineExecution({
            userId: 'guest',
            pipelineExecutionId: uuidV4(),
            pipelineId: pipelineUUID
        })
        const {getTrace} = pipelineExecution.trace
        pipelineExecutor.executePipeline(pipelineUUID, initialData, pipelineExecution)
            .then(([error, pipelineUUID, results]) => {
                if (error) {
                    console.warn(`POST /pipeline/:uuid/execute: Error: ${JSON.stringify(error)}`);
                    const message = `${req.params.uuid}: ${JSON.stringify(error)}`;
                    return res.json({error: message, "pipeline-uuid": req.params.uuid, trace: getTrace()})
                }

                return res.json({
                    error: null,
                    results,
                    "pipeline-uuid": pipelineUUID,
                    "pipeline-execution-id": pipelineExecution.pipelineExecutionId,
                    trace: sendTrace ? getTrace() : undefined
                });
            }).catch((error) => {
            console.warn(`POST /pipeline/:uuid/execute: Error: ${JSON.stringify(error)}`);
            const message = `${req.params.uuid}: ${JSON.stringify(error)}`;

            const errResponse = {
                error: message,
                'pipeline-uuid': req.params.uuid,
                "pipeline-execution-id": pipelineExecution.pipelineExecutionId,
                trace: getTrace()
            };
            return res.status(500).json(errResponse);
        });
    },

    /**
     *
     * @param req
     * @param res
     *
     * Response:  {
     *  error: "",
     *  results: {},
     *  "pipeline-uuid": uuid
     *  "pipeline-execution-id": uuid
     *  "stepIndex": int

     *  trace: []
     *  });
     */
    executePipelineStep: async (req, res) => {
        const pipelineUUID = req.params.uuid;
        if (!pipelineUUID) {
            return res.status(HttpStatusCode.BadRequest).send('pipeline UUID missing from request.');
        }
        const stepIndex = req.params.stepIndex;
        if (!stepIndex) {
            return res.status(HttpStatusCode.BadRequest).send('stepIndex missing from request.');
        }
        const sendTrace = (req.query.trace === "true")
        const initialData = req.body || {}
        console.log(`controller:executePipelineStep: ${pipelineUUID}:${stepIndex}:${sendTrace}`)

        const {id: userId, role: userRole, username} = req.user;
        const [err, pipeline] = await dbRepo.getPipelineByUUID(pipelineUUID)

        if (err) {
            console.warn(`POST /pipeline/:uuid/execute: Error: ${JSON.stringify(err)}`);
            const message = `${req.params.uuid}: ${JSON.stringify(err)}`;

            const errResponse = {
                error: message,
            };
            return res.status(500).json(errResponse);
        }
        if (!canAccessNode(pipeline, username, userRole)) {
            return res.status(HttpStatusCode.Unauthorized).send('User ' + username + ' has no access to this pipeline.');
        }

        const pipelineExecutor = new PipelineExecutor();
        const pipelineExecution = new PipelineExecution({
            userId: 'guest',
            pipelineExecutionId: uuidV4(),
            pipelineId: pipelineUUID
        })

        const {getTrace} = pipelineExecution.trace
        pipelineExecutor.executePipelineStep(pipelineUUID, stepIndex, initialData, pipelineExecution)
            .then(([error, results]) => {
                if (error) {
                    console.warn(`POST /pipeline/uuid/execute/stepIndex: Error: ${JSON.stringify(error)}`);
                    const message = `${pipelineUUID}: ${JSON.stringify(error)}`;

                    return res.json({error: message, "pipeline-uuid": req.params.uuid, trace: getTrace()})
                    //return res.status(500).json(errResponse);
                }

                return res.json({
                    error: null,
                    results: results,
                    "pipeline-uuid": pipelineUUID,
                    "pipeline-execution-id": pipelineExecution.pipelineExecutionId,
                    stepIndex,
                    trace: sendTrace ? getTrace() : undefined
                });
            }).catch((error) => {
            console.warn(`POST /pipeline/:uuid/execute: Error: ${JSON.stringify(error)}`);
            const message = `${pipelineUUID}: ${JSON.stringify(error)}`;

            const errResponse = {
                error: message,
                'pipeline-uuid': pipelineUUID,
                "pipeline-execution-id": pipelineExecution.pipelineExecutionId,
                trace: getTrace()
            };
            return res.status(500).json(errResponse);

        });
    },
}
