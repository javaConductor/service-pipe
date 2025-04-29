const request = require('supertest');
const assert = require('assert');
const dataRepo = require("../src/db/data-repo");
const userService = require("../src/services/userService");
const Pipeline = require("../src/model/pipeline");
const {v4:uuidV4} = require("uuid");
const PipelineNode = require("../src/model/pipelineNode");

/**
 *
 * @param app
 * @param testFunction ( app, username, accessToken ) => {}
 * @param options {role:''}
 * @returns {Promise<any>}
 */
function whileLoggedIn(
    app,
    testFunction, // (app, username, accessToken)
    options={}
) {

    assert.ok(app)
    assert.ok(typeof testFunction === 'function');

    const registration = {
        username: 'javaconductor.' + Date.now(),
        password: '9555589',
        role: options.role ? options.role : undefined,
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

                pLogout.then(async (logoutResponse) => {
                    console.log(`logout successful: ${JSON.stringify(logoutResponse.body)}`);
                    /// remove user
                    const pRemoveUser = userService.removeUser(theLogin.username)
                    pRemoveUser.then(([err]) => {
                        if (err) {
                            const msg = `Error deleting user ${theLogin.username}: ${err}`;
                            console.warn(msg);
                            return Promise.reject(msg);
                        }
                        return true
                    })
                    pRemoveUser.catch((errRemoveUser) => {
                        const msg = `Error deleting user ${theLogin.username}: ${errRemoveUser}`;
                        console.warn(msg);
                        return Promise.reject(msg);
                    })
                    return pRemoveUser;
                })
                pLogout.catch((errLogout) => {
                    console.error(`Logout Error: user:${theLogin.username}: ${errLogout}`);
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

const defaultPipeline = {
    name: `testPipeline.${Date.now()}`,
    uuid: uuidV4(),
    contentType: "application/json",
    transformModules: {
        before: {
            name: '',
            stepFnSrc: ''
        },
        after: {
            name: '',
            stepFnSrc: ''
        }
    },
    extract: [],
    inputExtract: [],
    steps: [],
    status: "New"
}


const createTestPipeline = (props) => {
    if (typeof props !== 'object') {
        throw new Error(`Expected object, got ${typeof props}`);
    }
    return new Pipeline({...defaultPipeline, ...props});
};

const defaultNode = {
    name: "",
    accessType: "HTTP",
    contentType: "application/json",
    headers: {},
    payload: {},
    nodeData: {},
    authenticationType: 'none',
    authentication: {basic: {}, token: {}, aim: {}},
    errorIndicators: [],
    errorMessages: [],
};

const createTestNode = (nodeProps, returnValue) => {
    const fn = async (step, requestData, pipelineExecution) => [null, returnValue]
    return new PipelineNode({...defaultNode, ...nodeProps}, fn)
}

const defaultStep = () => {
    return {
        name: "",
        nodeUUID: uuidV4(),
        data: {},
        extract: [],
        inputExtract: [],
        aggregateStep: false,
        aggregation: {}
    }
};

const createTestStep = (stepProps, returnValue) => {

    const step = {...defaultStep(), ...stepProps}
    if(!step.node) {
        const node = createTestNode({uuid: step.nodeUUID}, returnValue)
        step.node = node
    }
    return step;
}

module.exports = {whileLoggedIn, createTestPipeline, createTestNode, createTestStep};
