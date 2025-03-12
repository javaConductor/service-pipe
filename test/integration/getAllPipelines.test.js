const request = require('supertest');
const assert = require('assert');
const {app} = require('../../server');

describe('GET /pipeline', () => {
    it('should fetch all pipelines with no user', async (doneFn) => {

        const testUser = {
            username: 'javaconductor.'+Date.now(),
            password: '9555589'
        }

        try {
            const regResponse = await request(app)
                .post('/register')
                .send(testUser)
                .expect(201)
                .expect('Content-Type', /json/)

            console.log(`Registered: ${testUser.username} -> ${JSON.stringify(regResponse.body)}`);
        } catch (e) {
            doneFn(e)
        }

        let token
        /// login to get token

        try {
            const loginResponse = await request(app)
                .post('/login')
                .send(testUser)
                .expect(200)
                .expect('Content-Type', /json/)

            assert.notEqual(loginResponse.body.token, '', 'No token returned');
            console.log(`Login: ${testUser.username} -> ${loginResponse.body.token}`);
            token = loginResponse.body.token;
        } catch (e) {
            doneFn(e)
        }

        const authHeader = `Bearer ${token}`;

        try {
            const getPipelinesResponse = await request(app)
                .get('/pipeline')
                .set('Authorization', authHeader)

                .expect(200)
                .expect('Content-Type', /json/)

            console.log(`Get all pipelines w/ no owner: ${JSON.stringify(getPipelinesResponse.body)}`);
            return doneFn()

        } catch (err) {
            doneFn(err)
        }

    });
});

//
// describe('POST /login', () => {
//     it('should login the new user', (doneFn) => {
//
//         const registration = {
//             username: 'javaconductor'+Date.now(),
//             password: '9555589'
//         }
//         const theLogin = {
//             username: registration.username,
//             password: '9555589'
//         }
//
//         request(app)
//             .post('/register')
//             .send(registration)
//             .expect(201)
//             .expect('Content-Type', /json/)
//             .then(response => {
//                 assert.equal(response.body.username, registration.username, 'Username should be '+registration.username);
//                 console.log(`Registered username: ${response.body.username}`);
//                 doneFn()
//             }).catch((err) => {
//             doneFn(err)
//         });
//
//         request(app)
//             .post('/login')
//             .send(registration)
//             .expect(200)
//             .expect('Content-Type', /json/)
//             .then(response => {
//                 assert.notEqual(response.body.token, '', 'No token returned');
//                 console.log(`Login: ${ registration.username} -> ${response.body.token}`);
//                 doneFn()
//             });
//
//
//
//
//
//     });
// });