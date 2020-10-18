class PipelineStep {
    constructor(props) {
        this.name = props.name;
        this.node = props.node;
        this.nodeName = props.nodeName;
        this.params = props.params;
        this.data = props.data;
        this.extract = props.extract;
    }
}

module.exports = PipelineStep;
