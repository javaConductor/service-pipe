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
    return next();
};

const inspect = require("util").inspect;
const mwDebug = (req, res, next) => {
    console.debug(`route:debug ${req.method} [${req.url}]: -> ${inspect(req.headers)}`);
    return next();
}

router.get('/',
    mwDebug,
    authenticateToken,
    authorizeRole,
    pipelineController.getAllNodes);
router.get('/:uuid',
    mwDebug,
    authenticateToken,
    authorizeRole,
    pipelineController.getNodeByUUID);
router.post('/',
    validateDoc(validator.nodeSchema),
    authenticateToken,
    authorizeRole,
    pipelineController.saveNode);
router.delete('/:uuid',
    authenticateToken,
    authorizeRole,
    pipelineController.removeNode);

module.exports = router;
