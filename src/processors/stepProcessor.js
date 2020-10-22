class StepProcessor{
    constructor(processorProps) {
        this.stepType = PipelineStep.StepTypes.HTTP_JSON;
    }

    canProcess(step){
        throw new Error('This method must be overloaded:canProcess.');
    }

    async processStep(pipeline, step, data){
        throw new Error('This method must be overloaded:processStep.');
    }
}
StepProcessor.processors = [];
//StepProcessor.getProcessor = (step) => (processorManager.getStepProcessor(step));

module.exports = StepProcessor;