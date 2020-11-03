const fs = require('fs');
const glob = require("glob");
const os = require('os');
const PipelineNode = require('./model/pipelineNode');

class Nodes {

    constructor(nodeFolder) {
        this.nodesFolder = nodeFolder || this._defaultNodeFolder();
        this.nodes = [];
        this.loadNodes();
    }

    _defaultNodeFolder(){
        return `${os.homedir()}/.service-pipe/nodes`;
    }

    loadNodes() {
        if (!this.nodesFolder) {
            throw new Error('[nodesFolder] missing from service-pipe.yml');
        }
        const nodeFiles = glob.sync(`*.node.json`, {cwd: this.nodesFolder});
        this.nodes = [];
        for (const idx in nodeFiles) {
            const nodeFile = nodeFiles[idx];
            const jsonText = fs.readFileSync(`${this.nodesFolder}/${nodeFile}`, 'utf8');
            const nodeData = JSON.parse(jsonText);
            try {
                console.log(`Loaded node: ${nodeData.name}`);
                this.nodes = [...this.nodes, new PipelineNode(nodeData)];
            } catch (e) {
                console.warn(`Error in node file [${nodeFile}]: ${e}`);
            }
        }
        return {...this.nodes};
    }

    getNode(nodeName) {
        return this.nodes.find((node) => (node.name === nodeName));
    }

    availableNodes() {
        return this.nodes.map((node) => (node.name));
    }

}

Nodes.default = (new Nodes());

module.exports = Nodes;
