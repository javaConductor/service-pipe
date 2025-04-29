const mongo = require('./mongo');
const User = require('../model/user');
const PUBLIC_USER = require("../../src/misc").Constants.PUBLIC_USER;

const getAllUsers = async (userFn) => {
    try {
        const db = await mongo.getDatabase();
        const coll = db.db().collection("users");
        const rows = await coll.find().toArray();
        console.debug(`getAllUsers() -> + ${(rows.length)} rows.`);

        const users = rows.map((row) => {
            return new User(row)
        })
        if (userFn) {
            userFn([null, users])
        } else
            return [null, users];
    } catch (err) {
        console.debug(err);

        if (userFn) {
            userFn([err])
        } else
            return [err];
    }
}

const saveUser = async (userDoc) => {
    try {

        const db = await mongo.getDatabase();
        const coll = db.db().collection("users");
        //console.log("saveUser: saveOrUpdate: " + JSON.stringify(noId, null, 2));

        const result = await (userDoc._id
            ? coll.updateOne({_id: userDoc._id}, {"$set": userDoc})
            : coll.insertOne(userDoc));

        userDoc._id = result.insertedId;
        console.debug("saveUser: result: " + JSON.stringify(result));
        return [null, userDoc];
    } catch (err) {
        console.log(err);
        return [err];
    }

};

const getUser = async (username) => {
    try {
        const db = await mongo.getDatabase();
        const coll = db.db().collection("users");
        const result = await coll.findOne({username})

        console.debug("getUser: result: " + JSON.stringify(result));
        return [null, result];
    } catch (err) {
        console.log(err);
        return [err];
    }
};

const removeUser = async (username) => {
    return mongo.getDatabase()
        .then((db) => {
            const coll = db.db().collection("users");
            coll.deleteOne({"username": username})
                .then((result) => {
                    console.log(`removeUser -> ${JSON.stringify(result)}`);
                    return result.deletedCount === 0 ? ["No user deleted."] : [];
                })
                .catch((err) => {
                    console.debug(`removeUser:err -> ${err}`);
                    return [err];
                })
        })
        .catch((err) => {
            console.debug(`removeUser:err -> ${err}`);
            return [err];
        })
};

const getAllNodes = (username) => {
    return mongo.getDatabase()
        .then((db) => {
            const coll = db.db().collection("nodes");
            //TODO Add 'owner_id' to pipeline and node collections
            const userIdMatchOrNoId = username ? {
                '$or': [
                    {owner_user: username},
                    {owner_user: PUBLIC_USER}
                ]
            } : {}

            return coll.find(
                userIdMatchOrNoId
            ).toArray().then((rows) => {
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

const getAllPipelines = (username) => {
    return mongo.getDatabase()
        .then((db) => {
            const coll = db.db().collection("pipelines");
            //TODO Add 'owner_id' to pipeline and node collections
            const userIdMatchOrNoId = username ? {
                '$or': [
                    {owner_user: username},
                    {owner_user: PUBLIC_USER}
                ]
            } : {owner_user: PUBLIC_USER}

            return coll.find(
                userIdMatchOrNoId
            ).toArray().then((rows) => {
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
    getAllNodes,
    getAllPipelines,
    getNodeByUUID,
    getPipelineByUUID,
    savePipeline,
    saveNode,
    removePipeline,
    removeNode,
    getAllUsers, getUser, saveUser, removeUser
};

