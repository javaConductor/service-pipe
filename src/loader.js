const config = require('../src/config');
const fs = require('fs');
const glob = require("glob")
const defaultNodes = require("./nodes").default;
const Pipeline = require('./pipeline');

class Loader {
    loadNodes() {
        if (!config.nodeFolder) {
            throw new Error('[nodeFolder] missing from mash.yml');
        }
        const nodeFiles = glob.sync(`*.node.json`, {cwd: config.nodeFolder});
        let nodes = [];
        for (const idx in nodeFiles) {
            const nodeFile = nodeFiles[idx];
            const jsonText = fs.readFileSync(nodeFile, 'utf8');
            const nodeData = JSON.parse(jsonText);
            nodes = [...nodes, new PipelineNode(nodeData)];
        }
        return nodes;
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
                let step = pipelineData.steps[n];
                if (step.nodeName) {
                    const node = defaultNodes.getNode(step.nodeName);
                    if (!node) {
                        throw  new Error(`File: [${pipelineFilename}] Node [${step.nodeName}] not found in step [${step.name}]`)
                    }
                    step.node = node;
                }
                if (!step.node){
                    throw  new Error(`File: [${pipelineFilename}] Step: [${step.name}] missing node.`);
                }
                if (!step.nodeName) {
                    step.nodeName = step.node.name;
                }
                steps = [...steps, step];
            }
            const pipelineInfo = {...pipelineData, steps};
            const pipeline = new Pipeline(pipelineInfo);
            //console.log(`Loaded pipeline ${JSON.stringify( pipeline,null,2)}`);
            return pipeline;
        } catch (e) {
            throw new Error(`Error loading pipeline. File: [${pipelineFilename}]: ${e}`);
        }
    }
}

module.exports = Loader;
