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

    const pRegister = request(app)
        .post('/register')
        .send(registration)
        .expect(201)
        .expect('Content-Type', /json/)

    pRegister.then(response => {
        assert.equal(response.body.username, registration.username, 'Username should be ' + registration.username);
        console.log(`Registered username: ${response.body.username}`);

        const pLogin = request(app)
            .post('/login')
            .send(theLogin)
            .expect(200)
            .expect('Content-Type', /json/)
        pLogin.then(loginResponse => {
            assert.ok(loginResponse.body.token, 'No token returned');
            // console.log(`Login: ${registration.username}`);
            console.log(`Login successful: ${JSON.stringify(loginResponse.body)}`);

            const accessToken = loginResponse.body.token
            // call the testFunction
            const pTestFn = testFunction(app, theLogin.username, accessToken)
            pTestFn.then(async (testFnResponse) => {
                const authHeader = `Bearer ${accessToken}`;

                /// logout
                const pLogout = request(app)
                    .post('/logout')
                    .set('Authorization', authHeader)
                    .expect(200)

                pLogout.then((logoutResponse) => {
                    console.log(`logout successful: ${JSON.stringify(logoutResponse.body)}`);
                    /// remove user
                    const pRemoveUser = dataRepo.removeUser(theLogin.username)
                    // pRemoveUser.then((removeUserResponse) => {
                    //     return removeUserResponse;
                    // })
                    pRemoveUser.catch((errRemoveUser) => {
                        return Promise.reject(errRemoveUser);
                    })
                    return pRemoveUser;
                })
                pLogout.catch((errLogout) => {
                    console.error(`logout Error: ${errLogout}`);
                    assert.fail(errLogout)
                    return Promise.reject(errLogout);
                });

                return pLogout;
            })
            pTestFn.catch((errTestFn) => {
                console.error(`testFunction Error: ${errTestFn}`);
                assert.fail(errTestFn)
                return Promise.reject(errTestFn);
            })

            return pTestFn;
        });
        pLogin.catch(err => {
            console.error(`login Error: ${err}`);
            throw err
//            return Promise.reject(err);
        })
        return pLogin

    })
    pRegister.catch((errRegister) => {
        console.error(`register Error: ${errRegister}`);
        return Promise.reject(errRegister)
    });
    return pRegister;
}

module.exports = {whileLoggedIn};
