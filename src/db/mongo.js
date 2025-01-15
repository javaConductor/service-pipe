require('dotenv').config();
const {MongoClient} = require( 'mongodb');

const dbUsername = process.env.MONGODB_USERNAME;
const dbPassword = process.env.MONGODB_PASSWORD;
// const apiKey = process.env.API_KEY;

/*
 uri: mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@lessons-cluster.gs5vn.mongodb.net/
 */

var connectionURL = `mongodb+srv://${dbUsername}:${dbPassword}@lessons-cluster.gs5vn.mongodb.net/service-pipe`;

 console.log('Connect string: ' + connectionURL);

var theDb = null;

async function getDatabase() {
    if (theDb == null){
        return  MongoClient.connect(connectionURL, function (err, db) {
            if (err) throw err;
            console.log("Database created!");
            theDb = db;
            return db;
        });
    }else {
        return ( async () => {
            return theDb
        })();
    }

}
module.exports = {getDatabase};
