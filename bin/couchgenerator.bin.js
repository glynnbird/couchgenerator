#!/usr/bin/env node

const argv = require('yargs')
  .option('url', {
    alias: 'u',
    describe: 'the URL of the CouchDB instance',
    default: process.env.COUCH_URL ? process.env.COUCH_URL : undefined,
    demandOption: !process.env.COUCH_URL
  })
  .option('database', {
    alias: ['db', 'd'],
    describe: 'the CouchDB database name',
    default: process.env.COUCH_DATABASE ? process.env.COUCH_DATABASE : undefined,
    demandOption: !process.env.COUCH_DATABASE
  })
  .option('template', {
    alias: 't',
    describe: 'the path to the document template',
    default: process.env.COUCH_DOC_TEMPLATE ? process.env.COUCH_DOC_TEMPLATE : null,
    demandOption: false
  })
  .argv

const couchgenerator = require('../index.js')
couchgenerator({
  url: argv.url,
  db: argv.database,
  template: argv.template
})
