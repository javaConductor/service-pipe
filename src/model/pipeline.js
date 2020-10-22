class Pipeline {

    constructor(props) {
        if (!props.name || props.name.trim().length === 0) {
            throw new Error("Pipeline name is required ")
        }
        if (props.steps.length === 0) {
            throw new Error("Pipeline steps are required ")
        }
        this.status = props.status || Pipeline.Status.New;
        this.extract = props.extract || {};
        this.name = props.name;
        this.steps = props.steps;
    }
}

Pipeline.Status = {New: 'New', Active: 'Active'}

module.exports = Pipeline;
