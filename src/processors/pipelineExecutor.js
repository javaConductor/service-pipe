const dataRepo = require("../db/data-repo");
const PipelineRequest = require("../pipelineRequest");
const dbRepo = require("../db/data-repo");
const PipelineNode = require('../model/pipelineNode')

class PipelineExecutor {

    /**
     *
     * @param uuid
     * @param initialData
     * @returns {Promise<[error, pipelineUUID, results]>}
     */
    async executePipeline(uuid, initialData) {

        async function addPipelineNodes(pipeline) {
            const pList = [];

            pipeline.steps.forEach((step) => {
                const nodeUUID = step.nodeUUID;
                const p = dbRepo.getNodeByUUID(nodeUUID)
                    .then(([err, node]) => {
                        if (err) {
                            throw err;
                        }
                        console.debug(`addPipelineNodes:Node: ${JSON.stringify(node)}`);
                        step.node = new PipelineNode(node);
                    })
                    .catch((err) => {
                        console.debug(`addPipelineNodes:err: ${JSON.stringify(err)}`);
                        throw err;
                    })
                pList.push(p);
            });
            return Promise.all(pList);
        }

        return dataRepo.getPipelineByUUID(uuid).then(([err, pipeline]) => {
            const re = async (err) => {
                return [err, uuid, []];
            };
            if (err) return re(err);

            // this adds the node objects to the stepsx
            return addPipelineNodes(pipeline).then((p) => {
                const pr = new PipelineRequest(pipeline, initialData);
                console.debug(`PipelineExecutor.executePipeline: pipelineRequest: ${JSON.stringify(pr)}\n`);
                return pr.start().then(([err, results]) => {
                    if (err) {
                        console.warn(`pipelineExecutor:getPipelineByUUID: Error: ${JSON.stringify(err)}`);
                        // console.log(`pipelineExecutor:getPipelineByUUID: History: ${JSON.stringify(history, null, 2)}`);
                        const errMsg = `[${pr.pipeline.name}]:${pr.pipeline.uuid}: ${err.toString()}`;
                        return [errMsg, uuid];
                    }

                    //TODO Store the execution History
                    return [null, uuid, results];

                }, (e) => {
                    const msg = `pipelineExecutor:getPipelineByUUID:Execution error ${e.toString()}:\n${e.stack}`;
                    console.log(msg);
                    return [msg, uuid];
                })
            }).catch((e) => {
                return [e, uuid];
            });
        }).catch((err) => {
            console.log("pipelineExecutor:getPipelineByUUID:error ->" + JSON.stringify(err));
            return [err, uuid];
        });
    }
}

module.exports = PipelineExecutor;
