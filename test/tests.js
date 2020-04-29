/* eslint-env mocha */

'use strict'

const chai = require('chai')
const expect = chai.expect
const path = require('path')
const tymly = require('@wmfs/tymly')
const process = require('process')

describe('Ofsted tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)

  const STATE_MACHINE_NAME = 'ofsted_refreshFromCsvFile_1_0'

  let tymlyService
  let statebox
  let client

  before(function () {
    if (process.env.PG_CONNECTION_STRING && !/^postgres:\/\/[^:]+:[^@]+@(?:localhost|127\.0\.0\.1).*$/.test(process.env.PG_CONNECTION_STRING)) {
      console.log(`Skipping tests due to unsafe PG_CONNECTION_STRING value (${process.env.PG_CONNECTION_STRING})`)
      this.skip()
    }
  })

  it('startup tymly', async () => {
    const tymlyServices = await tymly.boot(
      {
        pluginPaths: [
          require.resolve('@wmfs/tymly-pg-plugin'),
          path.resolve(__dirname, '../node_modules/@wmfs/tymly-test-helpers/plugins/allow-everything-rbac-plugin')
        ],
        blueprintPaths: [
          path.resolve(__dirname, './../')
        ],
        config: {}
      }
    )

    tymlyService = tymlyServices.tymly
    statebox = tymlyServices.statebox
    client = tymlyServices.storage.client
  })

  it('execute importingCsvFiles', async () => {
    const executionDescription = await statebox.startExecution(
      {
        sourceDir: path.resolve(__dirname, './fixtures/input')
      },
      STATE_MACHINE_NAME,
      {
        sendResponse: 'COMPLETE'
      }
    )

    expect(executionDescription.status).to.eql('SUCCEEDED')
    expect(executionDescription.currentStateName).to.equal('ImportingCsvFiles')
  })

  it('verify data in table', async () => {
    const result = await client.query(
      'select urn, uprn, establishment_name, ofsted_rating from ofsted.ofsted order by urn;'
    )

    expect(result.rows).to.eql(
      [
        {
          urn: '20043',
          uprn: '100071486317',
          establishment_name: 'Adderley Children\'s Centre',
          ofsted_rating: 'Good'
        },
        {
          urn: '20049',
          uprn: '',
          establishment_name: 'Merrishaw Albert Bradbeer Children\'s Centre',
          ofsted_rating: 'Bad'
        },
        {
          urn: '20064',
          uprn: '10003595720',
          establishment_name: 'The All Saints Children\'s Centre',
          ofsted_rating: 'OK'
        }
      ]
    )
  })

  it('remove data from table', async () => {
    const result = await client.query(
      'drop table ofsted.ofsted cascade;'
    )

    expect(result.rows).to.eql([])
  })

  after('shutdown Tymly', async () => {
    await tymlyService.shutdown()
  })
})
