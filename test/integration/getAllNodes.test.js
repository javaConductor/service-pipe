const request = require('supertest');
const assert = require('assert');
const {app} = require('../../server');
const {whileLoggedIn} = require("../testHelper");
const PUBLIC_USER = require("../../src/misc").Constants.PUBLIC_USER;

describe('GET /node', () => {
    let server = null;
    before(() => {
        server = app.listen(3000);
    })
    after(() => {
        server.close();
        server = null;
    })

    it('should fetch all nodes with no user using helper', async () => {
        return new Promise(async (resolve, reject) => {
            return whileLoggedIn(server, async (app, owner_user, token) => {
                const authHeader = `Bearer ${token}`;

                const pResponse = request(app)
                    .get('/node')
                    .set('Authorization', authHeader)
                    .expect(200)
                    .expect('Content-Type', /json/)

                // console.log(`Get all pipelines w/ no owner: ${JSON.stringify(getPipelinesResponse.body)}`);

                pResponse.then(getNodesResponse => {
                    console.log(` getPipelinesResponse : ${JSON.stringify((getNodesResponse._body))}`)

                    assert.ok(getNodesResponse.body.length > 0); // OK

                    for (const node of getNodesResponse.body) {
                        assert.ok(node.owner_user === owner_user || node.owner_user === PUBLIC_USER,
                            `node should have user '${PUBLIC_USER}' or '${node.owner_user}'`);
                    }

                    resolve(getNodesResponse.body)
                    return getNodesResponse
                })
                pResponse.catch(err => {
                    console.error(`error: ${err}`)
                    assert.fail(err)
                    reject(err)
                });
                return pResponse;
            })
        })

    })

})
