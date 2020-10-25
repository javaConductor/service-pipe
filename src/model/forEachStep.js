const PipelineStep = require('./pipelineStep');

class ForEachStep extends PipelineStep {
    constructor(props) {
        super(props);
        this.stepType = PipelineStep.StepTypes.STEP_FOREACH;

        if (!props.dataArrayProperty){
            throw new Error(`ForEachStep: dataArrayProperty is required.`);
        }
        this.dataArrayProperty = props.dataArrayProperty;

        if (!props.outputArrayProperty){
            throw new Error(`ForEachStep: outputArrayProperty is required.`);
        }
        this.outputArrayProperty = props.outputArrayProperty;
        this.steps = props.steps;
    }
}

PipelineStep.StepTypes = {
    HTTP_JSON: 'http.json',
    HTTP_TEXT: 'http.text',
    STEP_FOREACH: 'step.forEach'
};

module.exports = PipelineStep;
