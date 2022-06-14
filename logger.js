const { env, logToken } = require('./config');
const logger = env === 'local' ? console : require ('logzio-nodejs').createLogger ({
  token: logToken,
  protocol: 'https',
  host: 'listener.logz.io',
  port: '8071',
  type: 'game'
});
module.exports = {
    log: (logObj) => logger.log(Object.assign({ env, level: 'info' }, logObj)),
    error: (logObj) => logger.log(Object.assign(logObj, { env, level: 'error' })),
    info: (logObj) => logger.log(Object.assign(logObj, { env, level: 'info' })),
    debug: (logObj) => logger.log(Object.assign(logObj, { env, level: 'debug' })),
    dump: (logObj) => logger.log(Object.assign(logObj, { env, level: 'dump' })),
};