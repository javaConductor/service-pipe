require('dotenv').config();// load environment vars
const {MongoClient} = require('mongodb');
const {createInvalidArgumentTypeError} = require("mocha/lib/errors");

const dbUsername = process.env.MONGODB_USERNAME;
const dbPassword = process.env.MONGODB_PASSWORD;
// const apiKey = process.env.API_KEY;
const CURRENT_DB = "local";

/*
 uri: mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@lessons-cluster.gs5vn.mongodb.net/
 */

var connectionURL = getConnectionURL();

console.debug('Connect string: ' + connectionURL);

var theDb = null;

async function getDatabase() {
    if (theDb == null) {
        //console.log(`getDatabase(): connecting to DB @${connectionURL}`)

        try {
            return MongoClient.connect(connectionURL)
                .then(async (db) => {
                    console.debug("getDatabase(): Database created!");
                    theDb = db;
                    db.db().collections().then((collections) => {
                        collections.forEach((col) => {
                            console.debug("getDatabase(): Collection ->" + (col.collectionName));
                        })
                    });

                    await db.db().collection("nodes")
                        .createIndex({uuid: 1}, (err, result) => {
                            if (err) {
                                console.error('getDatabase(): Error creating index on [uuid]:', err);
                                return;
                            }
                            console.debug('getDatabase(): Index created successfully:', result);
                        });

                    await db.db().collection("pipelines")
                        .createIndex({uuid: 1}, (err, result) => {
                            if (err) {
                                console.error('getDatabase(): Error creating index on [uuid]:', err);
                                return;
                            }
                            console.debug('getDatabase(): Index created successfully:', result);
                        });

                    await db.db().collection("users")
                        .createIndex({"username": 1}, {unique: true})

                    return db;
                })
                .catch((err) => {
                    console.error(`getDatabase(): Error connected to database at [${connectionURL}]: ${err}`);
                    throw err;
                })
        } catch (err) {
            console.error(`getDatabase(): Error connecting to database at [${connectionURL}]: ${err}`);
            throw err;
        }

    } else {
        return (async () => {
            //console.log(`getDatabase(): Connected to database at [${connectionURL}]: ${theDb.options.dbName}`);
            return theDb
        })();
    }
}

function getConnectionURL() {

    if (process.env.MONGO_URL) {
        return process.env.MONGO_URL;
    }

    var connectionURL = `mongodb+srv://${dbUsername}:${dbPassword}@lessons-cluster.gs5vn.mongodb.net/service-pipe`;

    switch (CURRENT_DB || 'local') {
        case 'local':
            connectionURL = `mongodb://localhost:27017/service-pipe`;
            break;
        case 'atlas-cluster':
            connectionURL = `mongodb+srv://${dbUsername}:${dbPassword}@lessons-cluster.gs5vn.mongodb.net/service-pipe`;
            break;
        case 'node-chef':
            connectionURL = `mongodb+srv://${dbUsername}:${dbPassword}@db-service-pipe-26710.nodechef.com:5363/service-pipe`;
            break;
    }

    return connectionURL;
}

module.exports = {getDatabase};
