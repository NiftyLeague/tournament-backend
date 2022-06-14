const mongoose = require ('mongoose');
const logger = require ('./logger');
const { host, optionStr } = require ('./config');

module.exports = {
    init: async () => {
      try {
        return await mongoose.connect(
          `mongodb+srv://${host}/?${optionStr ?? ''}`,
          {
            user: 'sahinAliyev',
            pass: '4fNrv2oIEiUejQzZ',
            dbName: 'pun-trials1',
            useNewUrlParser: true,
            useUnifiedTopology: true,
          });
      } catch (err) {
        console.log(err);
        logger.log({ level: 'error', message: JSON.stringify(err) });
      }
    },
  };