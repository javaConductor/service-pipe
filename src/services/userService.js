const dataRepo = require("../db/data-repo");
const dbRepo = require("../db/data-repo");

const userService = {
    getUsers: (async () => dataRepo.getAllUsers()),

    PUBLIC_USER: "$public",

    async getUser(username) {
        try {
            return dataRepo.getUser(username)
        } catch (e) {
            return [e]
        }
    },

    userExists: async (username) => {
        const [e, exists] = await userService.getUser(username);
        return [e, !!exists];
    },

    async saveUser(user) {
        try {
            const [err, savedUser] = await dbRepo.saveUser(user);
            return [err, savedUser];
        } catch (e) {
            return [e]
        }
    },
    async removeUser(username) {
        /// remove user
        const pRemoveUser = dbRepo.removeUser(username)
        //
        // pRemoveUser.then(([err]) => {
        //     if (err) {
        //         return Promise.reject(err);
        //     }
        //     return true;
        // })
        //
        // pRemoveUser.catch((errRemoveUser) => {
        //     return Promise.reject(errRemoveUser);
        // })

        return pRemoveUser;
    },

    SECRET_KEY: process.env.JWT_SECRET || 'dfovuihwefoihxcvlkhjnefiohzdvfihw'

}

module.exports = userService
