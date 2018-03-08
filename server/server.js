const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const graphqlHTTP = require('express-graphql');

const schema = require('./model/schema.js');

//Set test data
// const testData = require('./model/testData.js');
// testData();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../client/public')));
app.use('/graphql', graphqlHTTP({ schema, graphiql: true }));

app.get('/', (req, res) => res.send('hi'));

app.listen(3000);
console.log('listening on 3000');

module.exports = app;
