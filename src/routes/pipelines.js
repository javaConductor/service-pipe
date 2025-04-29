const express = require('express');
const router = express.Router();
const pipelineController = require('../controllers/pipeline');
const validator = require("../model/validator")
const {authenticateToken, authorizeRole} = require("../controllers/middleware");

const validateDoc = (schema) => (req, res, next) => {
    const {error, value} = schema.validate(req.body);
    req.body = value;
    console.debug(`validateDoc:error -> ${error}\n${JSON.stringify(req.body, null, 2)}`);
    if (error) {
        return res.status(400).json({error: error.details[0].message});
    }
    next();
};

router.get('/',
    authenticateToken,
    authorizeRole,
   pipelineController.getAllPipelines
);
router.get('/:uuid',
    authenticateToken,
    authorizeRole,
    pipelineController.getPipelineByUUID);
router.delete('/:uuid',
    authenticateToken,
    authorizeRole,
    pipelineController.removePipeline);
router.post('/',
    validateDoc(validator.pipelineSchema),
    authenticateToken,
    authorizeRole,
    pipelineController.savePipeline);
router.post('/:uuid/execute',
    authenticateToken,
    authorizeRole,
    pipelineController.executePipeline);
router.post('/:uuid/execute/:stepIndex',
    authenticateToken,
    authorizeRole,
    pipelineController.executePipelineStep);

module.exports = router;
