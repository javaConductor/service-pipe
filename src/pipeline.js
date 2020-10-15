class Pipeline {

    constructor(props) {

        if (!props.name || props.name.trim().length === 0) {
            throw new Error("Pipeline name is required ")
        }
        if (props.nodes.length === 0) {
            throw new Error("Pipeline nodes are required ")

        }
        if (props.steps.length === 0) {
            throw new Error("Pipeline steps are required ")
        }

        this.name = props.name;
        this.nodes = props.nodes || {};
        this.steps = props.steps; //{};

    }

     createRequest(initialData) {
        const pipelineRequest = new Pi
     }



}