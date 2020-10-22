class PipelineStep {
    constructor(props) {
        if (!props.name || props.name.trim().length === 0) {
            throw new Error("PipelineStep name is required ")
        }
        this.name = props.name;
        this.node = props.node;
        this.nodeName = props.nodeName;
        this.params = props.params;
        this.data = props.data;
        this.extract = props.extract;
        this.stepType = props.stepType || PipelineStep.StepTypes.HTTP_JSON;
    }
}

PipelineStep.StepTypes = {
    HTTP_JSON: 'http.json',
    HTTP_TEXT: 'http.text'
};

module.exports = PipelineStep;
