const userService = require("./userService");
let resources = {}

const initialize = async () => {
    console.log("appInitializer.initialize: Initializing user service");
    const mongo = require('../db/mongo')
    const db = await mongo.getDatabase();
    console.log("appInitializer.initialize: Initialized db");
    // if (err) throw err;
    const dataRepo =  require('../db/data-repo')
    console.log("appInitializer.initialize: Initialized dataRepo");
    const userService = require('./userService')
    const uSvc = await userService.init()
    console.log("appInitializer.initialize: Initialized userService");
    resources = {
        db,
        dataRepo,
        userService:  uSvc
    }
    console.log("appInitializer.initialize: Returning resources.");
    return resources;
}

module.exports = {initialize}
