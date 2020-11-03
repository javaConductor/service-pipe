const StepProcessor = require('./stepProcessor');
const PipelineStep = require('../model/pipe');
const axios = require("axios");
const extractor = require("../extractor");
const misc = require('../misc');
const jsonTypes = require('../model/jsonTypes');
const jmespath = require("jmespath");
const AggregationExtraction = require('./aggregateExtraction');

class HttpJSONProcessor extends StepProcessor {

  constructor(processorProps) {
    super(processorProps);
    this.stepType = PipelineStep.StepTypes.HTTP_JSON;
    this.processStep = this.processStep.bind(this);
    this.aggregateStep = this.aggregateStep.bind(this);
    this.basicAuthHeader = this.basicAuthHeader.bind(this);
  }

  canProcess(step) {
    //TODO working as default
    return !step.node.contentType || step.node.contentType === "application/json";
  }

  async aggregateStep(pipeline, step, data) {
    if (step.parallelStep)
      return this.aggregateParallelStep(pipeline, step, data);

    const realData = {...step.node.nodeData, ...(step.data || {}), ...data};

    const pipelineName = pipeline.name;
    /// get the dataArrayProperty
    const dataArrayKey = step.aggregation.dataArrayProperty;
    const dataOutputKey = step.aggregation.outputArrayProperty;
    const aggregateExtract = step.aggregation.aggregateExtract;

    let stepTrace = [];
    let value = realData[dataArrayKey];

    if (!jsonTypes.validate("array:", value)) {
      stepTrace = [...stepTrace, {
        pipeline: pipelineName,
        step: step.name,
        nodeName: step.node.name,
        timestamp: Date.now(),
        state: PipelineStep.StepStates.DATA_ERROR,
        message: `Error in data.`,
        error: `Field [${dataArrayKey}] is not an array.`
      }];
      return [data, stepTrace, `Field [${dataArrayKey}] is not an array.`];
    }

    let cnt = 0;
    const aggExtractor = new AggregationExtraction(step.aggregation.aggExtractionType);
    for (const idx in value) {
      ++cnt;
      const aggData = aggExtractor.createAggregationData(value[idx], aggregateExtract);
      console.log(`Passing element ${JSON.stringify(aggData, null, 2)}`);
      /// Process an element in the array passing the aggData and the normal data.
      const [results, sequenceHistory, err] = await this.processStep(pipeline, step, {...realData, ...aggData});
      if (err) {
        stepTrace = [...stepTrace, ...sequenceHistory, {
          pipeline: pipelineName,
          step: step.name,
          nodeName: step.node.name,
          timestamp: Date.now(),
          message: err,
          state: PipelineStep.StepStates.ERROR,
          data: {...realData, ...results},
          index: cnt
        }];
        return [{...realData, ...results}, stepTrace, err];
      }

      aggExtractor.accumulateExtractionResults(results);
      stepTrace = [...stepTrace, ...sequenceHistory];
    }

    const finalAggData = aggExtractor.getExtractionResults(dataOutputKey);

    stepTrace = [...stepTrace, {
      pipeline: pipelineName,
      step: step.name,
      nodeName: step.node.name,
      timestamp: Date.now(),
      state: PipelineStep.StepStates.STEP_COMPLETE,
      message: `Completed aggregate step.`,
      data: finalAggData,
      count: cnt,
    }];

    return [finalAggData, stepTrace];
  }

  async aggregateParallelStep(pipeline, step, data) {
    const realData = {...step.node.nodeData, ...(step.data || {}), ...data};

    const pipelineName = pipeline.name;
    /// get the dataArrayProperty
    const dataArrayKey = step.aggregation.dataArrayProperty;
    const dataOutputKey = step.aggregation.outputArrayProperty;
    const aggregateExtract = step.aggregation.aggregateExtract;

    let stepTrace = [];
    let value = realData[dataArrayKey];

    if (!jsonTypes.validate("array:", value)) {
      stepTrace = [...stepTrace, {
        pipeline: pipelineName,
        step: step.name,
        nodeName: step.node.name,
        timestamp: Date.now(),
        state: PipelineStep.StepStates.DATA_ERROR,
        message: `Error in data.`,
        error: `Field [${dataArrayKey}] is not an array.`
      }];
      return [data, stepTrace, `Field [${dataArrayKey}] is not an array.`];
    }

    let cnt = 0;
    const aggExtractor = new AggregationExtraction(step.aggregation.aggExtractionType);
    let promises = [];
    for (const idx in value) {
      ++cnt;
      const aggData = aggExtractor.createAggregationData(value[idx], aggregateExtract);
      console.log(`Passing element ${JSON.stringify(aggData, null, 2)}`);
      /// Create promise for list element
      const p = this.processStep(pipeline, step, {...realData, ...aggData});
      promises = [...promises, p];
    }

    await Promise.all(promises).then((list) => {
      for (const idx in list) {
        const [results, sequenceHistory, err] = list[idx];
        if (err) {
          stepTrace = [...stepTrace, ...sequenceHistory, {
            pipeline: pipelineName,
            step: step.name,
            nodeName: step.node.name,
            timestamp: Date.now(),
            message: err,
            state: PipelineStep.StepStates.ERROR,
            data: {...realData, ...results},
            index: idx
          }];
          return [{...realData, ...results}, stepTrace, err];
        }
        aggExtractor.accumulateExtractionResults(results);
        stepTrace = [...stepTrace, ...sequenceHistory];
      }

    }).catch((err) => {
      stepTrace = [...stepTrace, {
        pipeline: pipelineName,
        step: step.name,
        nodeName: step.node.name,
        timestamp: Date.now(),
        message: err,
        state: PipelineStep.StepStates.ERROR
      }];
      return [undefined, stepTrace, err];
    })

    const finalAggData = aggExtractor.getExtractionResults(dataOutputKey);

    stepTrace = [...stepTrace, {
      pipeline: pipelineName,
      step: step.name,
      nodeName: step.node.name,
      timestamp: Date.now(),
      state: PipelineStep.StepStates.STEP_COMPLETE,
      message: `Completed aggregate parallel step.`,
      data: finalAggData,
      count: cnt,
    }];

    return [finalAggData, stepTrace];
  }

  async processStep(pipeline, step, data) {
    const pipelineName = pipeline.name;
    let stepTrace = [];
    try {
      /// use the data from the node in the step to make the HTTP call
      const realData = {...step.node.nodeData, ...(step.data || {}), ...data};

      console.log(`processStep: ${pipeline.toString()} -> ${step.name} -> ${JSON.stringify(realData)}`);
      /// create the URL from the step
      const url = misc.interpolate(step.node.url, realData)

      /// create the Header entries from the step data
      let headers = {};
      for (const headerName in step.node.headers) {
        headers[headerName] = misc.interpolate(step.node.headers[headerName], realData)
      }
      let [payload, err] = this.aggregatePayload(step.node.payload, realData);
      if (err) {
        stepTrace = [...stepTrace, {
          pipeline: pipelineName,
          step: step.name,
          nodeName: step.node.name,
          nodeUrl: url,
          state: PipelineStep.StepStates.DATA_ERROR,
          timestamp: Date.now(),
          message: `${err}`,
          error: err
        }];
        return [data, stepTrace, err]
      }

      stepTrace = [...stepTrace, {
        pipeline: pipelineName,
        step: step.name,
        nodeName: step.node.name,
        nodeURL: url,
        nodeHeaders: headers,
        timestamp: Date.now(),
        state: PipelineStep.StepStates.IN_PROGRESS,
        message: "Initiate request.",
        data: payload
      }];

      let authHeaders = {};
      /// Add auth headers if any
      if (step.node.authentication && step.node.authentication.basic) {
        authHeaders = {Authorization: this.basicAuthHeader(step.node.authentication.basic.username, step.node.authentication.basic.password)};
      }

      ///  Make the CALL
      return axios({
        method: step.node.method,
        url: url,
        data: payload,
        config: {headers: {'Content-Type': step.node.contentType, ...headers, ...authHeaders}}
      }).then((response) => {
        stepTrace = [...stepTrace, {
          pipeline: pipelineName,
          step: step.name,
          nodeName: step.node.name,
          timestamp: Date.now(),
          state: PipelineStep.StepStates.IN_PROGRESS,
          message: "Request complete.",
          data: response.data,
          statusCode: response.status
        }];
        let responseData = response.data;
        /// If extractions are to be done
        if (misc.hasKeys(step.extract)) {
          /// if the first and only value is a datatype designation(string:,object:,array:)
          // alone then
          // validate the type and assignn it the data as [key]
          if (Object.keys(step.extract).length === 1) {
            const name = Object.keys(step.extract)[0];
            const value = step.extract[name];
            if (jsonTypes.isType(value)) {
              if (!jsonTypes.validate(value, responseData) && responseData) {
                const errMsg = `Type [${typeof responseData}] does not match extract designation [${value}]`;
                stepTrace = [...stepTrace, {
                  pipeline: pipelineName,
                  step: step.name,
                  nodeName: step.node.name,
                  nodeUrl: url,
                  timestamp: Date.now(),
                  message: `Extract datatype mismatch`,
                  error: errMsg
                }];
                return [responseData, stepTrace, errMsg]
              } else {
                return [{[name]: responseData}, stepTrace];
              }
            }
          }

          /// extract data
          const [newData, err] = extractor.extract(
            pipeline.contentType || step.node.contentType, response.data, step.extract);
          if (err) {
            stepTrace = [...stepTrace, {
              pipeline: pipelineName,
              step: step.name,
              nodeName: step.node.name,
              timestamp: Date.now(),
              message: `Error extracting data. keys: ${JSON.stringify(Object.keys(step.extract))}`,
              data: response.data,
              state: PipelineStep.StepStates.ERROR,
              statusCode: response.status
            }];
            return [{...data, ...response.data}, stepTrace, err];
          }
          responseData = newData;

          /// Check for error conditions
          if (misc.hasKeys(step.node.errorIndicators)) {
            for (const ind in step.node.errorIndicators) {
              if (response.data[ind]) {
                /// loop thru the errorMessages
                let messages = [];
                if (misc.hasKeys(step.node.errorMessages)) {
                  for (const key in step.node.errorMessages) {
                    const msg = responseData[key];
                    if (msg && msg.length > 0) {
                      messages = [...messages, msg];
                    }
                  }
                }

                stepTrace = [...stepTrace, {
                  pipeline: pipelineName,
                  step: step.name,
                  nodeName: step.node.name,
                  timestamp: Date.now(),
                  message: `Error in response`,
                  data: response.data,
                  statusCode: response.status,
                  responseErrors: messages
                }];
                return [{...data, ...response.data}, stepTrace, messages.join(', ')];
              }
            }
          }
        }
        if (step.transformModules) {

          //loop thru the transforms
          let tData = responseData;
          for (const idx in step.transformModules.after) {
            const tMod = step.transformModules.after[idx];

            const [newData, err] = tMod.stepFn(pipeline, step, tData);
            if (err) {
              stepTrace = [...stepTrace, {
                pipeline: pipelineName,
                step: step.name,
                stepTransform: tMod.name,
                nodeName: step.node.name,
                nodeUrl: url,
                state: PipelineStep.StepStates.COMPUTE_ERROR,
                timestamp: Date.now(),
                message: `${err}`,
                error: err
              }];
              return [data, stepTrace, err]
            }
            tData = {...tData, ...newData};
          }
          responseData = tData;
        }
        return [responseData, stepTrace];

      }, (error) => {
        if (error.response) {
          if (error.response.status === 404) {
            stepTrace = [...stepTrace, {
              pipeline: pipelineName,
              step: step.name,
              nodeName: step.node.name,
              nodeUrl: url,
              timestamp: Date.now(),
              message: `Resource not found.`,
              error: `${error.message}\n${JSON.stringify(error.stack, null, 2)}`,
              statusCode: error.response.status,
            }];
            return [{...data}, stepTrace, `Node target: [${step.node.url}] Not Found`];
          }

          if (error.response.status === 500) {
            stepTrace = [...stepTrace, {
              pipeline: pipelineName,
              step: step.name,
              nodeName: step.node.name,
              nodeUrl: url,
              timestamp: Date.now(),
              message: `Error in resource.`,
              error: `${error.message}\n${JSON.stringify(error.stack, null, 2)}`,
              statusCode: error.response.status,
            }];
            return [{...data}, stepTrace, `Node: [${step.node.name}]: ${error.message}`];
          }
          const errMsg = `Error contacting node url: [${step.node.method}:${error.config.url}](${pipeline.toString()}): ${error.message}`;

          stepTrace = [...stepTrace, {
            pipeline: pipelineName,
            step: step.name,
            nodeName: step.node.name,
            nodeUrl: url,
            timestamp: Date.now(),
            message: `${errMsg}]`,
            error: `${error.message}\n${JSON.stringify(error.stack, null, 2)}`,
            statusCode: error.response.status,
          }];
          console.error(errMsg);
          return [{...data}, stepTrace, error];
        }
        return [{...data}, stepTrace, error]
      });
    } catch (e) {
      stepTrace = [...stepTrace, {
        pipeline: pipelineName,
        step: step.name,
        nodeName: step.node.name,
        timestamp: Date.now(),
        message: `Error contacting node [${step.node.name}]`,
        state: PipelineStep.StepStates.ERROR,
        error: `${e.message}\n${JSON.stringify(e.stack, null, 2)}`
      }];
      return [{...data}, stepTrace, e];
    }
  }

  basicAuthHeader(user, password) {
    const token = user + ":" + password;
    let buff = new Buffer(token);
    let hash = buff.toString('base64');
    return "Basic " + hash;
  }

  /**
   *
   * @param payload
   * @param realData
   * @returns {string[]|*[]|Object[]|{}[]}
   */
  aggregatePayload(payload, realData) {
    if (!payload || Object.keys(payload).length === 0)
      return [realData];

    let aggPayload = {};
    switch (typeof payload) {
      case "object": {
        // if its only one key and the value is only
        // a datatype then validate the type and return the data
        const keys = Object.keys(payload);
        if (keys.length === 1) {
          if (!jsonTypes.validate(jsonTypes.typeMap.Object, realData)) {
            return [undefined, `payload element: ${keys[0]}: Bad type: should be:${jsonTypes.typeMap.Object} but found ${typeof realData} `];
          }
          return [payload];
        }
        //loop thru the keys and interpolate each value
        for (const k in keys) {
          aggPayload = {...aggPayload, [keys[k]]: misc.interpolate(payload[keys[k]], realData)}
        }
        return [aggPayload];
      }
      case "string": {
        return [misc.interpolate(payload, realData)];
      }
      default: {
        return [payload];
      }
    }
  }

}

module.exports = HttpJSONProcessor;
