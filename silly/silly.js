const express = require('express');
const bodyParser = require("body-parser");
const app = express()
const port = 3001

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/num_stats', (req, res) => {
    console.log(`Num stat links.`);
    res.json([
        "http://localhost:3001/sum",
        "http://localhost:3001/avg",
        "http://localhost:3001/min",
        "http://localhost:3001/max",
    ]);
});

app.post('/sum', (req, res) => {
    console.log(`${Date.now()} Summing ${JSON.stringify(req.body.numbers)}...`);
    const sum = req.body.numbers.reduce((sum, num) => (sum + num), 0)
    res.json({sum});
})

app.post('/avg', (req, res) => {
    console.log(`${Date.now()} Averaging ${JSON.stringify(req.body.numbers)}...`);
    const sum = req.body.numbers.reduce((sum, num) => (sum + num), 0)
    res.json({avg: sum === 0 ? 0 : sum / req.body.numbers.length});
})

app.post('/min', (req, res) => {
    console.log(`${Date.now()} Min ${JSON.stringify(req.body.numbers)}...`);
    const first = req.body.numbers[0];
    const min = req.body.numbers.reduce((min, num) => (num < min ? num : min), first);
    res.json({min});
});

app.post('/max', (req, res) => {
    console.log(`${Date.now()} Max ${JSON.stringify(req.body.numbers)}...`);
    const first = req.body.numbers[0];
    const max = req.body.numbers.reduce((max, num) => (num > max ? num : max), first);
    res.json({max});
});

app.listen(port, () => {
    console.log(`Silly app listening at http://localhost:${port}`)
})