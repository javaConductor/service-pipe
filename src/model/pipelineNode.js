const uuid = require('uuid').v4;

class PipelineNode {

  toString() {
    return `[${this.name}](${this.url}):${this.uuid}`;
  }

  constructor(nodeProps) {
    if (!nodeProps.uuid) {
      this.uuid = uuid();
//        throw Error(`pipeline node requires uuid.`)
    } else {
      this.uuid = nodeProps.uuid;
    }

    this.name = nodeProps.name;
    this.url = nodeProps.url;
    this.method = nodeProps.method;
    this.headers = nodeProps.headers;
    this.nodeData = nodeProps.nodeData;
    this.payload = nodeProps.payload;
    this.contentType = nodeProps.contentType;
    this.errorIndicators = nodeProps.errorIndicators;
    this.errorMessages = nodeProps.errorMessages;
    this.authentication = nodeProps.authentication;
  }
}

module.exports = PipelineNode;
