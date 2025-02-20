const misc = require("../misc");
const PipelineStep = require("./pipe");
const axios = require("axios");
const validator = require('./validator')

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
                if (!nodeAuthentication || !nodeAuthentication.token) {
                    throw new Error(`Bad configuration: Authentication type is ${authentificationTypes.Token} 
                    but no token config was found.`);
                }

                authHeaders = {Authorization: "Bearer " + nodeAuthentication.token}
                return {...headers, ...authHeaders};
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
     * @param pipelineExecution
     * @returns {Promise<[error, data]>}
     */
    async execute(step, requestData, pipelineExecution) {
        const {addTrace} = pipelineExecution.trace;

        /// Add node data to requestData
        requestData = {...this.nodeData, ...requestData}

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
            state: PipelineStep.StepStates.NODE_ACCESS,
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
            addTrace({
                step: step.name,
                nodeName: this.name,
                nodeURL: url,
                nodeHeaders: headers,
                timestamp: Date.now(),
                state: PipelineStep.StepStates.NODE_COMPLETE,
                message: "Node completed successfully.",
                nodeResponse: response.data
            });
            return [null, response.data]
        }).catch((axiosError) => {
            return [this.handleAxiosError(axiosError, step.name, this.name, url, this.method, pipelineExecution)]
        })
    }

    handleAxiosError(axiosError, stepName, nodeName, url, method, pipelineExecution) {
        const {addTrace} = pipelineExecution.trace;

        if (axiosError.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            // console.log(axiosError.response.data);
            // console.log(axiosError.response.status);
            // console.log(axiosError.response.headers);
            switch (axiosError.response.status) {

                case 404: {
                    addTrace({
                        step: stepName,
                        nodeName: nodeName,
                        nodeUrl: url,
                        timestamp: Date.now(),
                        message: `Resource not found.`,
                        error: `${axiosError.message}\n${JSON.stringify(axiosError.stack, null, 2)}`,
                        statusCode: axiosError.response.status,
                    });
                    const responseErr = `Node target: [${method}:${url}] Not Found`;
                    console.warn(responseErr);
                    return responseErr;
                }
                case 500: {
                    addTrace({
                        step: stepName,
                        nodeName: nodeName,
                        nodeUrl: url,
                        timestamp: Date.now(),
                        message: `Error in resource.`,
                        error: `${axiosError.message}`,
                        statusCode: axiosError.response.status,
                    });
                    let responseErr = `Node: [${nodeName}]: ${axiosError.message}`;
                    console.warn(responseErr);
                    return responseErr;
                }
                default:
                    const responseErr = `Error contacting node url: [${method}:${url}]: Status: ${axiosError.response.status}`;
                    addTrace({
                        step: stepName,
                        nodeName: nodeName,

                        nodeUrl: url,
                        timestamp: Date.now(),
                        message: `${responseErr}]`,
                        error: `${axiosError.message}`,
                        statusCode: axiosError.response.status,
                    });

                    console.warn(`PipelineNode.execute(): Step:${stepName}: Error -> ${responseErr}:${axiosError.message}`);
                    return responseErr;
            }
        } else if (axiosError.code) {
            // console.log(axiosError.code);

            switch (axiosError.code) {
                case "ECONNREFUSED": {
                    addTrace({
                        step: stepName,
                        nodeName: nodeName,
                        nodeUrl: url,
                        timestamp: Date.now(),
                        message: `${axiosError.message}`,
                        error: "ECONNREFUSED",
                    });

                    const responseErr = `Node target: [${method}:${url}] ECONNREFUSED`;
                    console.warn(responseErr);
                    return responseErr;
                }
            }
        } else {
            // Something happened in setting up the request that triggered an Error
            const responseErr = `Error contacting node url: [${method}:${url}]: ${axiosError.message}`;
            console.log('Error', responseErr);
            return responseErr;
        }

    }

}

module.exports = PipelineNode;
