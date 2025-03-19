const request = require('supertest');
const assert = require('assert');

/**
 *
 * @param app
 * @param testFunction ( app, username, accessToken ) => {}
 * @returns {Promise<any>}
 */
function whileLoggedIn(
    app,
    testFunction // (app, username, accessToken)
) {

    assert.ok(app)
    assert.ok(typeof testFunction === 'function');

    const registration = {
        username: 'javaconductor.' + Date.now(),
        password: '9555589'
    }
    const theLogin = {
        username: registration.username,
        password: '9555589'
    }

    return request(app)
        .post('/register')
        .send(registration)
        .expect(201)
        .expect('Content-Type', /json/)
        .then(response => {
            assert.equal(response.body.username, registration.username, 'Username should be ' + registration.username);
            console.log(`Registered username: ${response.body.username}`);

            return request(app)
                .post('/login')
                .send(theLogin)
                .expect(200)
                .expect('Content-Type', /json/)
                .then(response => {
                    assert.ok(response.body.token, 'No token returned');
                    console.log(`Login: ${registration.username}`);

                    // call the testFunction
                    const p = testFunction(app, theLogin.username, response.body.token)

                    p.then(async (response) => {
                        const authHeader = `Bearer ${response.body.token}`;

                        /// logout
                        const logoutResponse = await request(app)
                            .post('/logout')
                            .set('Authorization', authHeader)
                            .expect(200)

                        /// remove user
                        return await dataRepo.removeUser(theLogin.username)

                    })

                    p.catch((err) => {
                        assert.fail(err)
                        return Promise.reject(err);
                    })

                    return p;
                });
        }).catch((err) => {
            return Promise.reject(err)
        });

}

module.exports = {whileLoggedIn};
