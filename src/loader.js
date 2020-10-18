const config = require('../src/config');
const fs = require('fs');
const glob = require("glob")

class Loader {

    loadNodes( ){
        if (!config.nodeFolder){
            throw new Error('[nodeFolder] missing from mash.yml');
        }

        const nodeFiles = glob.sync(`*.node.json`,{cwd : config.nodeFolder});
        let nodes = [];
        for ( const idx in nodeFiles){
            const nodeFile =  nodeFiles[idx];
            const jsonText = fs.readFileSync(nodeFile, 'utf8');
            const nodeData = JSON.parse(jsonText);
            nodes = [...nodes, new PipelineNode(nodeData)];
        }
        return nodes;
    }

}