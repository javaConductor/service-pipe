const trace = require("../trace");

class PipelineExecution {
    constructor(props) {

        if (!props.userId || props.userId.trim().length === 0) {
            throw new Error("userId is required ")
        }

        if (!props.pipelineExecutionId || props.pipelineExecutionId.trim().length === 0) {
            throw new Error("pipelineExecutionId is required ")
        }

        if (!props.pipelineId || props.pipelineId.trim().length === 0) {
            throw new Error("pipelineId is required ")
        }

        this.userId = props.userId;
        this.pipelineExecutionId = props.pipelineExecutionId;
        this.pipelineId = props.pipelineId;
        this.trace = props.trace || trace(this.pipelineExecutionId);
    }

}
module.exports = PipelineExecution