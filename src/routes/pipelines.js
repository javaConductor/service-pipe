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

router.get('/', pipelineController.getAllPipelines);
router.get('/:uuid', pipelineController.getPipelineByUUID);
router.post('/',  validateDoc(validator.pipelineSchema), pipelineController.savePipeline);

module.exports = router;