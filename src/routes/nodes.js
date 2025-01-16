const express = require('express');
const router = express.Router();
const pipelineController = require('../controllers/pipeline');
const validator = require("../model/validator")

const validateDoc = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};
const inspect = require( "util").inspect;
const mwDebug   = (req, res, next) => {
    console.log("route:debug ->"+inspect( req ));
    next();
}

router.get('/',  mwDebug, pipelineController.getAllNodes);
router.get('/:uuid', mwDebug, pipelineController.getNodeByUUID);
router.post('/', validateDoc(validator.nodeSchema), pipelineController.saveNode);

module.exports = router;
