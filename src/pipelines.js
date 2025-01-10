const fs = require('fs');
//const pAZth = require('path');
const glob = require("glob");
const os = require('os');
const {v4: uuid} = require('uuid');
const defaultNodeRepo = require('./nodes').default;
const Pipeline = require('./model/pipeline');
const {sep} = require("node:path");

const PIPELINE_FILE_EXTENSION = 'ppln.json';

class Pipelines {

  constructor(pipelineFolder = null, nodeRepo = defaultNodeRepo) {
    this.nodeRepo = nodeRepo;
    //TODO remove the ending slash
    this.pipelineFolder = pipelineFolder || this._defaultPipelineFolder();
    //TODO remove the ending slash
    this.pipelines = this.loadPipelines();
  }

  loadPipelineFile(pipelineFilename) {
    if (!pipelineFilename) {
      throw new Error('Missing pipelineFilename');
    }
    try {
      const jsonText = fs.readFileSync(pipelineFilename, 'utf8');
      const pipelineData = JSON.parse(jsonText);
      // resolve the node names in steps
      let steps = [];
      for (const n in pipelineData.steps) {

        // noinspection JSUnfilteredForInLoop
        let step = pipelineData.steps[n];
        if (step.nodeUUID) {
          step.node = this.nodeRepo.getNode(step.nodeUUID);
        }
        if (!step.node && step.nodeName) {
          step.node = this.nodeRepo.getNodeByName(step.nodeName);
        }
        if (!step.node) {
          console.log(``)
          throw new Error(`File: [${pipelineFilename}] Step: [${step.name}] missing node.`);
        }
        step.nodeUUID = step.node.uuid;
        if (!step.nodeName) {
          step.nodeName = step.node.name;
        }
        steps = [...steps, step];
      }
      const pipelineInfo = {...pipelineData, steps};

      if (!pipelineInfo.uuid) {
        pipelineInfo.uuid = uuid();
      }
      return new Pipeline(pipelineInfo);
    } catch (e) {
      throw new Error(`Error loading pipeline. File: [${pipelineFilename}]: ${e}`);
    }
  }

  loadPipeline(pipelineUUID) {
    if (!pipelineUUID) {
      throw new Error('Missing pipelineUUID');
    }

    const pipelineFile = `${pipelineUUID}.${PIPELINE_FILE_EXTENSION}`
    return this.loadPipelineFile(
        `${this.pipelineFolder}${path.sep}${pipelineFile}`);
  }

  loadPipelines() {
    if (!this.pipelineFolder) {
      throw new Error('[pipelineFolder] missing from service-pipe.yml');
    }
    const pipelineFiles = glob.sync(`*.${PIPELINE_FILE_EXTENSION}`, {cwd: this.pipelineFolder});
    let pipelines = [];
    for (const idx in pipelineFiles) {
      const pipelineFile = pipelineFiles[idx];

      try {
        const pipeline = this.loadPipelineFile(
            `${this.pipelineFolder}${sep}${pipelineFile}`);
        console.log(`Loaded pipeline: ${pipeline.name}`);
        pipelines = [...pipelines, pipeline];
      } catch (e) {
        console.warn(`Error in pipeline file [${pipelineFile}]:\n${e}`);
      }
    }
    return pipelines;
  }

  getPipelines() {
    return this.pipelines;
  }

  getPipeline(pipelineUUID) {
    return this.pipelines.find((ppln) => (pipelineUUID === ppln.uuid));
  }

  getPipelineByName(pipelineName) {
    return this.pipelines.filter((ppln) => (pipelineName === ppln.name));
  }

  _defaultPipelineFolder() {
    return `${os.homedir()}/.service-pipe/pipelines`;
  }

  savePipeline(pipeline) {
    console.log(`savePipeline: ${JSON.stringify(pipeline, null, 2)}`)
    const filename = `${pipeline.uuid}.${PIPELINE_FILE_EXTENSION}`;
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
}

module.exports = Pipelines;
