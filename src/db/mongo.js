require('dotenv').config();// load environment vars
const {MongoClient} = require('mongodb');

const dbUsername = process.env.MONGODB_USERNAME;
const dbPassword = process.env.MONGODB_PASSWORD;
// const apiKey = process.env.API_KEY;
const CURRENT_DB = "local";

/*
 uri: mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@lessons-cluster.gs5vn.mongodb.net/
 */

var connectionURL = getConnectionURL();

console.log('Connect string: ' + connectionURL);

var theDb = null;

async function getDatabase() {
    if (theDb == null) {
        return MongoClient.connect(connectionURL, function (err, db) {
            if (err) throw err;
            console.log("Database created!");
            theDb = db;
            db.db().collections().then((collections) => {
                collections.forEach((col) => {
                    console.log("getDatabase() Collection ->" + JSON.stringify(col));
                })
                });

            return db;
        });
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
