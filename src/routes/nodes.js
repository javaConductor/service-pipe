const express = require('express');
const router = express.Router();
const pipelineController = require('../controllers/pipeline');
const validator = require("../model/validator")

const validateDoc = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    req.body = value;
    console.log(`validateDoc:error -> ${error}\n${JSON.stringify(req.body, null, 2)}`);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

const inspect = require( "util").inspect;
const mwDebug   = (req, res, next) => {
    console.log("route:debug ->"+inspect( req.rawHeaders ));
    next();
}

router.get('/',  mwDebug, pipelineController.getAllNodes);
router.get('/:uuid', mwDebug, pipelineController.getNodeByUUID);
router.post('/', validateDoc(validator.nodeSchema), pipelineController.saveNode);
router.delete('/:uuid', pipelineController.removeNode);

module.exports = router;
