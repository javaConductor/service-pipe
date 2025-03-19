const request = require('supertest');
const assert = require('assert');
const {app} = require('../../server');
const dataRepo = require('../../src/db/data-repo');

describe('GET /pipeline', () => {
    it('should fetch all pipelines with no user', async () => {

        return new Promise(async (resolve, reject) => {

            const testUser = {
                username: 'javaconductor.' + Date.now(),
                password: '9555589'
            }

            try {
                const regResponse = await request(app)
                    .post('/register')
                    .send(testUser)
                    .expect(201)
                    .expect('Content-Type', /json/)

                assert.equal(regResponse.body.username, testUser.username, 'Username should be ' + testUser.username);
                console.log(`Registered: ${testUser.username} -> ${JSON.stringify(regResponse.body)}`);
            } catch (e) {
                reject(e)
            }

            let token
            /// login to get token

            try {
                const loginResponse = await request(app)
                    .post('/login')
                    .send(testUser)
                    .expect(200)
                    .expect('Content-Type', /json/)

                assert('token' in loginResponse.body)
                // assert.notEqual(loginResponse.body.token, '', 'No token returned');
                console.log(`Login: ${testUser.username} -> ${loginResponse.body.token}`);
                token = loginResponse.body.token;
            } catch (e) {
                reject(e)
            }

            const authHeader = `Bearer ${token}`;

            try {
                const getPipelinesResponse = await request(app)
                    .get('/pipeline')
                    .set('Authorization', authHeader)
                    .expect(200)
                    .expect('Content-Type', /json/)

                assert.ok(getPipelinesResponse.body.length > 0); // OK
                // console.log(`Get all pipelines w/ no owner: ${JSON.stringify(getPipelinesResponse.body)}`);
            } catch (err) {
                reject(err)
            }

            try {
                await dataRepo.removeUser(testUser.username)
                resolve();

            } catch (e) {
                reject(e)
            }

        })

    });
});
