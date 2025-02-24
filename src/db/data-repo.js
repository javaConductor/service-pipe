const mongo = require('./mongo');

const getAllNodes = () => {
    return mongo.getDatabase()
        .then((db) => {
            const coll = db.db().collection("nodes");
            return coll.find().toArray().then((rows) => {
                // log the rows
                console.debug(`getAllNodes() -> + ${(rows.length)} rows.`);
                return [null, rows];
            });
        })
        .catch((err) => {
            console.warn(err);
            return [err];
        });
};


const getAllPipelines = () => {
    return mongo.getDatabase()
        .then((db) => {
            const coll = db.db().collection("pipelines");
            return coll.find().toArray().then((rows) => {
                // log the rows
                console.debug(`getAllPipelines() -> + ${(rows.length)} rows.`);
                return [null, rows];
            });
        })
        .catch((err) => {
            console.debug(err);
            return [err];
        });
}

const getNodeByUUID = async (nodeUUID) => {
    console.debug("getNodeByUUID uuid: " + nodeUUID);

    return mongo.getDatabase()
        .then((db) => {

            const coll = db.db().collection("nodes");
            return coll.findOne({"uuid": nodeUUID}).then((row) => {
                // log the rows
                console.debug(`getNodeByUUID(${nodeUUID})-> ${JSON.stringify(row)}`);
                return [null, row];
            });
        })
        .catch((err) => {
            console.log(err);
            return [err];
        });
};

const getPipelineByUUID = (pipelineUUID) => {
    console.debug("getPipelineByUUID uuid: " + pipelineUUID);

    return mongo.getDatabase()
        .then((db) => {

            const coll = db.db().collection("pipelines");
            return coll.findOne({"uuid": pipelineUUID})
                .then((row) => {
                    // log the row
                    console.debug(`getPipelineByUUID(${pipelineUUID})-> ${JSON.stringify(row)}`);
                    return [null, row];
                })
                .catch((err) => {
                    console.log(err);
                    return [err];
                });
        })
        .catch((err) => {
            console.log(err);
            return [err];
        });
};

const savePipeline = (pipelineDoc) => {
    return mongo.getDatabase()
        .then((db) => {
            const coll = db.db().collection("pipelines");
            const noId = {...pipelineDoc};
            delete noId._id;

            //console.log("savePipeline: saveOrUpdate: " + JSON.stringify(noId, null, 2));

            return (pipelineDoc._id

                ? coll.updateOne({uuid: pipelineDoc.uuid}, {"$set": noId})
                : coll.insertOne(pipelineDoc))
                .then((result) => {
                    pipelineDoc._id = result.insertedId;
                    console.debug("savePipeline: result: " + JSON.stringify(result));

                    return [null, pipelineDoc];
                })
                .catch((err) => {
                    console.log(err);
                    return [err];
                });
        })
        .catch((err) => {
            throw [err];
        })
};

const removePipeline = (uuid) => {
    return mongo.getDatabase()
        .then((db) => {
            const coll = db.db().collection("pipelines");
            coll.deleteOne({"uuid": uuid})
                .then((result) => {
                    console.debug(`removePipeline:err -> ${result}`);
                    return [null, uuid];
                })
                .catch((err) => {
                    console.debug(`removePipeline:err -> ${err}`);
                    return [err];
                })
        })
        .catch((err) => {
            return [err];
        })
};

const createNode = (nodeDoc) => {
    return mongo.getDatabase()

        .then((db) => {

            const coll = db.db().collection("nodes");
            return coll.insertOne(nodeDoc)
                .then((result) => {
                    console.log("createNode result: " + JSON.stringify(result));
                    return [null, nodeDoc];
                })
                .catch((err) => {
                    console.debug(`createNode:err -> ${err}`);

                    return [err];
                });
        })
        .catch((err) => {
            console.debug(`createNode:err -> ${err}`);
            return [err];
        })
};

const saveNode = (nodeDoc) => {
    if (!nodeDoc._id) {
        return createNode(nodeDoc);
    }
    return mongo.getDatabase()
        .then((db) => {
            const coll = db.db().collection("nodes");
            const theId = nodeDoc._id // save the _id
            delete nodeDoc._id
            return coll.updateOne({uuid: nodeDoc.uuid}, {"$set": {...nodeDoc}})
                .then((result) => {
                    console.log("saveNode result: " + JSON.stringify(result));
                    return [null, {...nodeDoc, _id: theId}];
                })
                .catch((err) => {
                    console.debug(`saveNode:err -> ${err}`);
                    return [err];
                });
        })
        .catch((err) => {
            console.debug(`saveNode:err -> ${err}`);
            return [err];
        })
};

const removeNode = (uuid) => {
    return mongo.getDatabase()
        .then((db) => {
            const coll = db.db().collection("nodes");
            coll.deleteOne({"uuid": uuid})
                .then((result) => {
                    console.debug(`removeNode -> ${result}`);
                    return [null, uuid];
                })
                .catch((err) => {
                    console.debug(`removeNode:err -> ${err}`);
                    return [err];
                })
        })
        .catch((err) => {
            console.debug(`removeNode:err -> ${err}`);
            return [err];
        })
};

module.exports = {
    "getAllNodes": getAllNodes,
    "getAllPipelines": getAllPipelines,
    "getNodeByUUID": getNodeByUUID,
    "getPipelineByUUID": getPipelineByUUID,
    "savePipeline": savePipeline,
    "saveNode": saveNode,
    removePipeline,
    removeNode
};

