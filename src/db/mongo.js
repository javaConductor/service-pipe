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
        return MongoClient.connect(connectionURL)
            .then((db) => {
                console.debug("Database created!");
                theDb = db;
                db.db().collections().then((collections) => {
                    collections.forEach((col) => {
                        console.debug("getDatabase() Collection ->" + (col.collectionName));
                    })
                });
                db.db().collection("nodes")
                    .createIndex({uuid: 1}, (err, result) => {
                        if (err) {
                            console.error('Error creating index on [uuid]:', err);
                            return;
                        }

                        console.debug('Index created successfully:', result);
                    });

                db.db().collection("pipelines")
                    .createIndex({uuid: 1}, (err, result) => {
                        if (err) {
                            console.error('Error creating index on [uuid]:', err);
                            return;
                        }

                        console.debug('Index created successfully:', result);
                    });

                return db;
            })
            .catch((err) => {
                console.error(`Error connected to database at [${connectionURL}]: ${err}`);
                throw err;
            })
    } else {
        return (async () => {
            return theDb
        })();
    }
}

function getConnectionURL() {
    var connectionURL = `mongodb+srv://${dbUsername}:${dbPassword}@lessons-cluster.gs5vn.mongodb.net/service-pipe`;

    switch (CURRENT_DB) {
        case 'local':
            connectionURL = `mongodb://localhost:27017/service-pipe`;
            break;
        case 'atlas-cluster':
            connectionURL = `mongodb+srv://${dbUsername}:${dbPassword}@lessons-cluster.gs5vn.mongodb.net/service-pipe`;
            break;
    }

    return connectionURL;
}

module.exports = {getDatabase};
