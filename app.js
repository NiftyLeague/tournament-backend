var express = require('express');
var morgan = require('morgan');

const logger = require('./logger');

var indexRouter = require('./routes/index');
var tournamentRouter = require('./routes/tournament');
var roundRouter = require('./routes/round');
var playerRouter = require('./routes/player');

const db = require('./dbConnection');
db.init().then(() => {
  console.log ("Connected to DB");
});

var app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/', indexRouter);
app.use('/tournament', tournamentRouter);
app.use('/round', roundRouter);
app.use('/player', playerRouter);

// error handler
app.use ((req, res, next) => {
  logger.error({ message: 'Route not found' });
  res.status(404).json ({ message: 'Route not found' }).end();
});
app.use((err, req, res, next) => {
  logger.error({ message: JSON.stringify(err), err });
  res.status(err.status || 500).json ({ success: false, message: JSON.stringify(err), err }).end();
});

module.exports = app;
