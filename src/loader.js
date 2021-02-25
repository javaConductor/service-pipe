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

  _defaultNodeFolder() {
    return `${os.homedir()}/.service-pipe/nodes`;
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
    return this.nodeRepo.saveNode(node);
  }

  savePipeline(pipeline) {
    return this.pipelineRepo.savePipeline(pipeline);
  }

}

module.exports = Loader;
