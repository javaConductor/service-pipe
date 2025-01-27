const express = require('express');
const router = express.Router();
const pipelineController = require('../controllers/pipeline');
const validator = require("../model/validator")

const validateDoc = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    console.log(`validateDoc:error -> ${error}\n${JSON.stringify(req.body, null, 2)}`);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

router.get('/', pipelineController.getAllPipelines);
router.get('/:uuid', pipelineController.getPipelineByUUID);
router.post('/',  validateDoc(validator.pipelineSchema), pipelineController.savePipeline);
router.post('/:uuid/execute', pipelineController.executePipeline);
router.delete('/:uuid', pipelineController.removePipeline);

module.exports = router;
