const misc = require("../misc");
const PipelineStep = require("./pipe");
const axios = require("axios");
const uuid = require('uuid').v4;
const validator = require('./validator')
const {addTrace, getTrace} = require('../trace')
const authenticationTypes = require("./authenticationTypes");

class PipelineNode {

    toString() {
        return `[${this.name}](${this.url}):${this.uuid}`;
    }

    constructor(nodeProps) {

        const {err, warning, value} = validator.validateNodeDoc(nodeProps)
        Object.assign(this, value);
    }


    addAuthenticationHeaderValues(headers,
                                  nodeAuthenticationType,
                                  nodeAuthentication) {
        let authHeaders = {};
        switch (nodeAuthenticationType) {
            case authenticationTypes.Basic:
                /// Add auth headers if any
                if (!nodeAuthentication || !nodeAuthentication.basic) {
                    throw new Error(`Bad configuration: Authentication type is ${authentificationTypes.Basic} 
                    but no Basic Authentication config was found.`);
                }

                authHeaders = {Authorization: this.basicAuthHeader(nodeAuthentication.basic.username, nodeAuthentication.basic.password)};
                return {...headers, ...authHeaders};

            case authenticationTypes.Token: {
                return headers;
            }

            case authenticationTypes.None: {
                return headers;
            }
        }

        /// Add auth headers if any
        if (!nodeAuthentication) return headers;

        if (nodeAuthentication.basic) {
            authHeaders = {Authorization: this.basicAuthHeader(nodeAuthentication.basic.username, nodeAuthentication.basic.password)};
        }

        return {...headers, ...authHeaders};
    }

    basicAuthHeader(user, password) {
        const token = user + ":" + password;
        let buff = Buffer.from(token);
        let hash = buff.toString('base64');
        return "Basic " + hash;
    }

    /**
     *
     * @param step
     * @param requestData
     * @returns {Promise<[error, data]>}
     */
    async execute(step, requestData) {

        /// create the URL from the step
        const url = misc.interpolate(this.url, requestData)

        /*
         * Create the Header entries from the step data
         * Interpolate headers using the realData
         */
        let headers = {};
        for (const headerName in this.headers) {
            headers[headerName] = misc.interpolate(this.headers[headerName], requestData)
        }

        ///////////////////// Update History /////////////////////
        addTrace({
            step: step.name,
            nodeName: this.name,
            nodeURL: url,
            nodeHeaders: headers,
            timestamp: Date.now(),
            state: PipelineStep.StepStates.IN_PROGRESS,
            message: "Initiate request.",
            data: requestData
        });

        ///////////////////// Add authentication headers /////////////////////
        headers = this.addAuthenticationHeaderValues(
            headers,
            this.authenticationType,
            this.authentication
        )
        console.debug(`node.execute():requestData:${step.name}:${url}: payload -> ${JSON.stringify(requestData)}\n`);

        ///////////////////// Make the HTTP CALL /////////////////////
        ///////////////////// Make the HTTP CALL /////////////////////
        ///////////////////// Make the HTTP CALL /////////////////////
        return axios({
            method: step.node.method,
            url: url,
            data: requestData,
            config: {headers: {'Content-Type': this.contentType, ...headers}}
        }).then((response) => {
                console.debug(`PipelineNode.execute(): Step:${step.name} -> response:${JSON.stringify(response.data)}\n`);
                return [null, response.data]
            },
            (error) => {
                if (error.response) {
                    if (error.response.status === 404) {
                        addTrace({
                            step: step.name,
                            nodeName: this.name,
                            nodeUrl: url,
                            timestamp: Date.now(),
                            message: `Resource not found.`,
                            error: `${error.message}\n${JSON.stringify(error.stack, null, 2)}`,
                            statusCode: error.response.status,
                        });
                        const errMsg = `Node target: [${step.node.url}] Not Found`;
                        console.warn(errMsg);
                        return [errMsg];
                    }

                    if (error.response.status === 500) {
                        addTrace({
                            step: step.name,
                            nodeName: step.node.name,
                            nodeUrl: url,
                            timestamp: Date.now(),
                            message: `Error in resource.`,
                            error: `${error.message}\n${JSON.stringify(error.stack, null, 2)}`,
                            statusCode: error.response.status,
                        });
                        const errMsg = `Node: [${step.node.name}]: ${error.message}`;
                        console.warn(errMsg);
                        return [errMsg];
                    }

                    const errMsg = `Error contacting node url: [${this.method}:${url}]: ${error.message}`;
                    addTrace({
                        step: step.name,
                        nodeName: step.node.name,
                        nodeUrl: url,
                        timestamp: Date.now(),
                        message: `${errMsg}]`,
                        error: `${error.message}\n${JSON.stringify(error.stack, null, 2)}`,
                        statusCode: error.response.status,
                    });

                    console.warn(`PipelineNode.execute(): Step:${step.name}: Error -> ${errMsg}`);
                    return [error, {...data}];
                }
                console.warn(`PipelineNode.execute(): Step:${step.name}: Error -> ${JSON.stringify(error)}`);
                return [error, {...data}]
            })

    }

}

module.exports = PipelineNode;
