const fs = require('fs');
const glob = require("glob");
const os = require('os');
const {v4: uuid} = require('uuid');
const NodeRepo = require('./nodes');
const PipelineRepo = require('./pipelines');
const defaultNodeRepo = NodeRepo.default;
const Pipeline = require('./model/pipeline');

const PIPELINE_FILE_EXTENSION = 'ppln.json';

class Loader {

  constructor(pipelineFolder, nodeFolder) {
    //TODO remove the ending slash
    this.nodeRepo = new NodeRepo(nodeFolder || this._defaultNodeFolder())
    this.pipelineRepo = new PipelineRepo(pipelineFolder || this._defaultPipelineFolder(), this.nodeRepo)
    //TODO remove the ending slash
  }

  getPipelines() {
    return this.pipelineRepo.loadPipelines();
  }

  getPipeline(pipelineUUID) {
    return this.pipelineRepo.loadPipeline(pipelineUUID)
  }

  _defaultPipelineFolder() {
    return `${os.homedir()}/.service-pipe/pipelines`;
  }


  saveNode(node) {
    console.log(`saveNode: ${JSON.stringify(node, null, 2)}`)
    const filename = `${node.uuid}.node.json`;
    try {
      fs.writeFileSync(`${this.nodesFolder}/${filename}`,
        JSON.stringify(node, null, 2));
      const newNodes = [...this.nodes.filter((n) => (n.uuid !== node.uuid)), node];
      this.nodes = newNodes;
      return [node];
    } catch (e) {
      return [null, e];
    }
  }

  savePipeline(pipeline) {
    console.log(`savePipeline: ${JSON.stringify(pipeline, null, 2)}`)
    const filename = `${pipeline.uuid}.ppln.json`;

    try {
      fs.writeFileSync(`${this.pipelineFolder}/${filename}`,
        JSON.stringify(pipeline, null, 2));
      const newPipelines = [...this.pipelines.filter((p) => (p.uuid !== pipeline.uuid)), pipeline];
      this.pipelines = newPipelines;
      return [pipeline];
    } catch (e) {
      return [null, e];
    }
  }


  savePipeline(pipeline) {
    return this.pipelineRepo.savePipeline(pipeline);
  }

}

module.exports = Loader;
