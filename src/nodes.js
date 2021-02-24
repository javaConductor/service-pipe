const fs = require('fs');
const glob = require("glob");
const os = require('os');
const PipelineNode = require('./model/pipelineNode');
const NODE_FILE_EXTENSION = 'node.json';

class Nodes {
  constructor(nodeFolder = this._defaultNodeFolder()) {
    this.nodesFolder = nodeFolder;
    this.nodeMap = {};
    this.loadNodes();
  }

  _defaultNodeFolder() {
    return `${os.homedir()}/.service-pipe/nodes`;
  }

  saveNode(node) {
    console.log(`saveNode: ${JSON.stringify(node, null, 2)}`);
    const filename = `${node.uuid}.${NODE_FILE_EXTENSION}`;
    try {
      fs.writeFileSync(`${this.nodesFolder}/${filename}`,
        JSON.stringify(node, null, 2));
      this.nodeMap = {...this.nodeMap, [node.uuid]: node};
      return [node];
    } catch (e) {
      return [null, e];
    }
  }

  loadNodeFile(nodeFile) {
    const jsonText = fs.readFileSync(`${nodeFile}`, 'utf8');
    const nodeData = JSON.parse(jsonText);
    return new PipelineNode(nodeData)
  }

  loadNode(nodeUUID) {
    return this.loadNodeFile(`${this.nodesFolder}/${nodeUUID}.${NODE_FILE_EXTENSION}`);
  }

  loadNodes() {
    if (!this.nodesFolder) {
      throw new Error('[nodesFolder] missing from service-pipe.yml');
    }
    const nodeFiles = glob.sync(`*.${NODE_FILE_EXTENSION}`, {cwd: this.nodesFolder});
    let nodes = {};
    for (const idx in nodeFiles) {
      const nodeFile = nodeFiles[idx];

      // const jsonText = fs.readFileSync(`${this.nodesFolder}/${nodeFile}`, 'utf8');
      const loadedNode = this.loadNodeFile(`${this.nodesFolder}/${nodeFile}`);
      //const nodeData = JSON.parse(jsonText);
      nodes = {...nodes, [loadedNode.uuid]: loadedNode};

      if (loadedNode.uuid)
        try {
          console.log(`Loaded node: ${loadedNode.name}(${loadedNode.uuid})`);
          nodes = {...nodes, [loadedNode.uuid]: loadedNode};
        } catch (e) {
          console.warn(`Error in node file [${nodeFile}]:\n${e}`);
        }
    }
    console.log(`loaded: ${JSON.stringify(nodes)}`);
    this.nodeMap = {...this.nodeMap, ...nodes};

    return this.nodeMap;
  }

  /**
   *
   * @returns {{uuid:{Pipe}}}
   */
  getNodes() {
    if (!this.nodeMap || Object.keys(this.nodeMap).length === 0)
      this.loadNodes();
    return this.nodeMap;
  }

  getNode(nodeUUID) {
    return nodeUUID ? this.loadNode(nodeUUID) : null;
//    return this.nodeMap[nodeUUID];
  }


  removeNode(nodeUUID) {
    const nodeFilename = `${this.nodesFolder}/${nodeUUID}.${NODE_FILE_EXTENSION}`;

    fs.access(nodeFilename, (err) => {
      if (!err) {
        try {
          fs.unlinkSync(nodeFilename);
        } catch (e) {
          return `Could not remove node at ${nodeFilename}: ${e.toString()}`;
        }
        delete this.nodeMap[nodeUUID];
      }
    });
    return null;
  }

  getNodeByName(nodeName) {
    return Object.values(this.nodeMap).find((node) => {
      return node.name === nodeName;
    });
  }
}

Nodes.default = new Nodes();

module.exports = Nodes;
