const config = require('../src/config');
const fs = require('fs');
const glob = require("glob")
const PipelineNode = require('./pipelineNode');
class Nodes {

    constructor( nodeFolder ) {
        this.nodesFolder = nodeFolder || config.nodesFolder;
        this.nodes = [];
        this.loadNodes();
    }

    loadNodes( ){
        if (!this.nodesFolder){
            throw new Error('[nodesFolder] missing from mash.yml');
        }
        const nodeFiles = glob.sync(`*.node.json`,{cwd : this.nodesFolder});
        this.nodes = [];
        for ( const idx in nodeFiles){
            const nodeFile =  nodeFiles[idx];
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

    getNode(nodeName){
        return this.nodes.find((node) => (node.name === nodeName));
    }

    availableNodes(){
        return this.nodes.map((node) => (node.name));
    }

}

Nodes.default =  (new Nodes());

module.exports = Nodes;
