const fs = require('fs');
const Pipeline = require('./model/pipeline');

class Loader {

    constructor(nodeLoader = require("./nodes").default) {
        this.nodeLoader = nodeLoader;
        this.nodes = this.nodeLoader.loadNodes();
    }


    getNodes(){
        return this.nodes;
    }
    loadPipeline(pipelineFilename) {
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
                if (step.nodeName) {
                    //console.info(`Step: [${step.name}] Searching for node [${step.nodeName}] for nodes ${JSON.stringify(this.nodes.availableNodes())}`);
                    const node = this.nodes.getNode(step.nodeName);
                    if (!node) {
                        throw  new Error(`File: [${pipelineFilename}] Node [${step.nodeName}] not found in step [${step.name}]`)
                    }
                    step.node = node;
                }
                if (!step.node) {
                    throw  new Error(`File: [${pipelineFilename}] Step: [${step.name}] missing node.`);
                }
                if (!step.nodeName) {
                    step.nodeName = step.node.name;
                }
                steps = [...steps, step];
            }
            const pipelineInfo = {...pipelineData, steps};
            //console.log(`Loaded pipeline ${JSON.stringify( pipeline,null,2)}`);
            return new Pipeline(pipelineInfo);
        } catch (e) {
            throw new Error(`Error loading pipeline. File: [${pipelineFilename}]: ${e}`);
        }
    }
}

module.exports = Loader;
