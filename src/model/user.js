class User {

    constructor(userProps) {
        this.username = userProps.username;
        this.password = userProps.password;
        this.role = userProps.role;
        this.mfaSecret = userProps.mfaSecret;
        this.registeredAt = userProps.registeredAt;
        this._id = userProps._id;
    }

}

module.exports = User;
