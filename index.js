module.exports = (function (Pipe, PipelineNode, Pipeline, PipelineRequest, Loader) {
  return {Pipe, PipelineNode, Pipeline, PipelineRequest, Loader};
})(require('./src/model/pipe'), require('./src/model/pipelineNode'),
  require('./src/model/pipelineNode'),
  require('./src/pipelineRequest'),
  require('./src/loader'),
);
