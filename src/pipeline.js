
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
        if (!props.status) {
            this.status = Pipeline.Status.New;
        }

        this.name = props.name;
        this.nodes = props.nodes || {};
        this.steps = props.steps; //[]];
        this.status = props.status;//'Active'
    }
}

Pipeline.Status = { New: 'New', Active: 'Active'}

module.exports = Pipeline;
