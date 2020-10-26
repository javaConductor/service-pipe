const AggregateExtraction = require('../processors/aggregateExtraction');

class PipelineStep {
    constructor(props) {
        if (!props.name || props.name.trim().length === 0) {
            throw new Error("PipelineStep name is required ")
        }
        this.name = props.name;

        if (!props.node && !props.nodeName) {
            throw new Error(`PipelineStep: node or nodeName is required.`);
        }
        this.node = props.node;
        this.nodeName = props.nodeName;

        this.aggregateStep = props.aggregateStep;
        if (this.aggregateStep) {
            //TODO move all the agg stuff to its own object (except aggregateStep)
            if (!props.dataArrayProperty) {
                throw new Error(`PipelineStep: dataArrayProperty is required.`);
            }
            this.dataArrayProperty = props.dataArrayProperty;

            if (!props.outputArrayProperty) {
                throw new Error(`PipelineStep: outputArrayProperty is required.`);
            }
            this.outputArrayProperty = props.outputArrayProperty;

            if (!props.aggregateExtract) {
                throw new Error(`PipelineStep: aggregateExtract is required.`);
            }
            this.aggregateExtract = props.aggregateExtract;

            this.aggExtractionType = props.aggregateExtract.aggExtractionType || AggregateExtraction.Types.AsNormal;
        }

        this.params = props.params;
        this.data = props.data;
        this.extract = props.extract || {};
        this.stepType = props.stepType || PipelineStep.StepTypes.HTTP_JSON;
    }
}

PipelineStep.StepTypes = {
    HTTP_JSON: 'http.json',
    HTTP_TEXT: 'http.text',
    STEP_FOREACH: 'step.forEach'
};

PipelineStep.StepStates = {
    INITIALIZATION: 'init',
    ERROR: 'error',
    COMMUNICATION_ERROR: 'error.communication',
    DATA_ERROR: 'error.data',
    IN_PROGRESS: 'in.progress',
    STEP_COMPLETE: 'step.complete',
    PIPELINE_COMPLETE: 'pipeline.complete',
    COMPLETE_WITH_ERRORS: 'complete.w.errors',
};

module.exports = PipelineStep;
