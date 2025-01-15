const Loader = require('../loader');
const PipelineNode = require('../model/pipelineNode');
const PipelineRequest = require('../pipelineRequest');
const nodesRepo = require('../nodes').default;
const express = require('express');
const bodyParser = require("body-parser");
const cors = require('cors');
const app = express()
const port = 9999
const loader = new Loader(
    "C:\\Users\\Administrator\\workspace\\service-pipe\\config\\pipelines",
    "C:\\Users\\Administrator\\workspace\\service-pipe\\config\\nodes");

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


var corsOptions = {
  // origin: 'http://example.com',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
app.use(cors(corsOptions));

const options = {
  setHeaders: function (res, path, stat) {
    res.set('Access-Control-Allow-Origin', "*")
  }
};

app.use(express.static('public', options))

app.get('/pipeline', (req, res) => {
  const pipelines = loader.getPipelines();
  res.set("Access-Control-Allow-Origin", "*");
  res.json(pipelines);
});

app.post('/pipeline', (req, res) => {
  const pipeline = req.body;
  if (!pipeline.uuid || !pipeline.name) {
    res.append("Access-Control-Allow-Origin", "*");
    res.status(400).send(JSON.stringify({error: `Pipeline name and uuid required`}));
  }
  try {
    const [savedPipeline, err] = loader.pipelineRepo.savePipeline(pipeline);
    res.json(savedPipeline);

  } catch (e) {
    res.status(500).send(JSON.stringify({error: `${e}`}));
  }

});

app.get('/pipeline/:uuid', (req, res) => {
  const uuid = req.params.uuid;
  const ppln = loader.pipelineRepo.getPipeline(uuid);
  res.json(ppln);
});

app.get('/node', (req, res) => {
  const nodes = Object.values(loader.nodeRepo.getNodes());
  res.set("Access-Control-Allow-Origin", "*");
  res.json(nodes);
});

app.post('/node', (req, res) => {
  const nodeInfo = req.body;
  console.log(`POST /node: ${JSON.stringify(req.body)}`);
  let node
  try {
    node = new PipelineNode(nodeInfo)
  } catch (e) {
    res.status(400).send(`Node data error: ${e.message}`);
  }

  try {
    const savedNode = nodesRepo.saveNode(node);
    res.json(savedNode);
  } catch (e) {
    res.status(500).send(`Error saving node: ${e.message}`);
  }

});

app.get('/node/:uuid', (req, res) => {
  const uuid = req.params.uuid;
  const node = nodesRepo.getNode(uuid);
  res.json(node);
});

app.delete('/node/:uuid', (req, res) => {
  const uuid = req.params.uuid;

  const msg = nodesRepo.removeNode(uuid);
  if (msg) {
    console.warn(`DELETE /node:${uuid}: ${msg}`);
    return res.status(500).send(`Error removing node: ${msg}`);
  }
  console.log(`DELETE /node:${uuid}: ok!`);

  res.json(uuid);
});

app.post('/pipeline/:uuid/execute', (req, res) => {
  const uuid = req.params.uuid;

  /// check pipelineRequest.username/apiKey in middleware
  const pr = new PipelineRequest(loader.pipelineRepo.getPipeline(uuid), (req.body));
  console.log(`POST /pipeline/:uuid/execute: pipelineRequest: ${JSON.stringify(pr)}`);
  pr.start().then(([results, history, err]) => {
    if (err) {
      console.log(`POST /pipeline/:uuid/execute: Error: ${JSON.stringify(err)}`);
      console.log(`POST /pipeline/:uuid/execute: History: ${JSON.stringify(history, null, 2)}`);
      const errorObj = {
        message: `[${pr.pipeline.name}]:${pr.pipeline.uuid} ` + err.toString(),
        log: history
      };
      return res.status(500).json(errorObj);
    }


    //console.log(`POST /pipeline/:uuid/execute: pipelineRequest: ${JSON.stringify(results)}`);

    return res.json({results, uuid});
  }, (e) => {
    const msg = `Execution error ${e.toString()}:\n${e.stack}\n${pr.pipeline}`;
    console.log(msg);
    return res.status(500).send(msg)
  })
});

app.listen(port, () => {
  console.log(`service-pipe listening at http://localhost:${port}`)
});
