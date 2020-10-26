const StepProcessor = require('./stepProcessor');
const axios = require("axios");
const extractor = require("../extractor");
const misc = require('../misc');

class ForEachProcessor extends StepProcessor {
    constructor(processorProps) {
        super(processorProps);
        if (!processorProps.steps || processorProps.steps.length === 0) {
            throw new Error("ForEachProcessor: steps is missing or empty.");
        }
        this.steps = processorProps.steps;
        this.dataProperty = processorProps.dataProperty;
    }

    canProcess(step) {
        return step.stepType === PipelineStep.StepTypes.STEP_FOREACH;
    }

    async processStep(pipeline, step, data) {

        if (!processorProps.steps || processorProps.steps.length === 0) {
            throw new Error("ForEachProcessor: steps is missing or empty.");
        }
        this.steps = processorProps.steps;


        ///// if data property not empty check if the dataProperty exits in the data


        /// return as array in the data

        throw new Error('This method must be overloaded:processStep.');
    }
}

module.exports = ForEachProcessor;
