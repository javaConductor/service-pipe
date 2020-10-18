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
        //this.steps = props.steps; //[]];
        this.status = props.status;//'Active'
        /// resolve nodeNames
        this.steps = props.steps.map((step) => {
            if (!step.node) {
                if (!step.nodeName) {
                    throw new Error(`Node is missing from step: ${this.name}`);
                }
                const node = this.nodes.find((node) => {
                    return node.name === step.nodeName
                });
                if (!node) {
                    throw new Error(`Node [${step.nodeName}] not found for step [${step.name}]`);
                }
                step = {...step, node};
            }
            return step;
        });

    }
}

Pipeline.Status = {New: 'New', Active: 'Active'}

module.exports = Pipeline;
