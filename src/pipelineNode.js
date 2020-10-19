class PipelineNode {

    constructor(nodeProps) {
        this.id = nodeProps.id;
        this.name = nodeProps.name;
        this.url = nodeProps.url;
        this.method = nodeProps.method;
        this.headers = nodeProps.headers;
        this.nodeData = nodeProps.nodeData;
        this.payload = nodeProps.payload;
        this.contentType = nodeProps.contentType;
        this.steps = nodeProps.steps;
    }
}

module.exports = PipelineNode;
