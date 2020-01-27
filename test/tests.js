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

  it('should startup tymly', function (done) {
    tymly.boot(
      {
        pluginPaths: [
          require.resolve('@wmfs/tymly-pg-plugin'),
          path.resolve(__dirname, '../node_modules/@wmfs/tymly-test-helpers/plugins/allow-everything-rbac-plugin')
        ],
        blueprintPaths: [
          path.resolve(__dirname, './../')
        ],
        config: {}
      },
      function (err, tymlyServices) {
        expect(err).to.eql(null)
        tymlyService = tymlyServices.tymly
        statebox = tymlyServices.statebox
        client = tymlyServices.storage.client
        done()
      }
    )
  })

  it('should execute importingCsvFiles', function (done) {
    statebox.startExecution(
      {
        sourceDir: path.resolve(__dirname, './fixtures/input')
      },
      STATE_MACHINE_NAME,
      {
        sendResponse: 'COMPLETE'
      },
      function (err, executionDescription) {
        expect(err).to.eql(null)
        expect(executionDescription.status).to.eql('SUCCEEDED')
        expect(executionDescription.currentStateName).to.equal('ImportingCsvFiles')
        done()
      }
    )
  })

  it('Should be the correct data in the database', function (done) {
    client.query(
      'select urn, uprn, establishment_name, ofsted_rating from ofsted.ofsted order by urn;',
      function (err, result) {
        if (err) {
          done(err)
        } else {
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
          done()
        }
      }
    )
  })

  it('Should remove the data in the database', function (done) {
    client.query(
      'drop table ofsted.ofsted cascade;',
      function (err, result) {
        if (err) {
          done(err)
        } else {
          expect(result.rows).to.eql([])
          done()
        }
      }
    )
  })

  it('should shutdown Tymly', async () => {
    await tymlyService.shutdown()
  })
})
