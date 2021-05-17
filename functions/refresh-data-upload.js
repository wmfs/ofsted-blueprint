const csvparse = require('csv-parse')
const fs = require('fs')

function readCsv (csvFile, rows) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFile)
      .pipe(csvparse({ columns: true }))
      .on('data', row => {
        const missingProperties = []

        if (!row['URN'])  missingProperties.push('URN')
        if (!row['EstablishmentName'])  missingProperties.push('EstablishmentName')
        if (!row['UPRN'])  missingProperties.push('UPRN')
        if (!row['OfstedRating (name)'])  missingProperties.push('OfstedRating (name)')

        if (missingProperties.length === 0) {
          rows.push({
            urn: row['URN'], // Column A: URN
            uprn: row['EstablishmentName'], // Column E: EstablishmentName
            establishmentName: row['UPRN'], // Column DZ: UPRN
            ofstedRating: row['OfstedRating (name)'] // Column DW: OfstedRating (name)
          })
        }
      })
      .on('error', reject)
      .on('end', resolve)
  })
}

function addUploadStatus (log) {
  const {
    totalRejected,
    totalRows
  } = log

  log.uploadGood = ''
  log.uploadWarning = ''
  log.uploadError = ''

  if (totalRejected > 0) {
    log.uploadError = `${totalRejected} rows failed`
  } else if (totalRows === 0) {
    log.uploadWarning = `0 rows to be uploaded`
  } else {
    log.uploadGood = `${totalRows} rows to be uploaded`
  }
}

async function processFile ({ serverFilename, clientFilename }) {
  const importLog = {
    serverFilename,
    clientFilename,
    startTime: new Date()
  }

  const rows = []
  // const rejected = []

  await readCsv(serverFilename, rows)

  importLog.totalRows = rows.length
  importLog.rows = rows
  // importLog.rejected = rejected
  // importLog.totalRejected = rejected.length

  addUploadStatus(importLog)

  return importLog
}

module.exports = function () {
  return async function refreshDataUpload (event) {
    const {
      serverFilename,
      clientFilename
    } = event.body.upload

    try {
      return processFile({ serverFilename, clientFilename })
    } catch (err) {
      return {
        uploadGood: '',
        uploadWarning: '',
        uploadError: `Could not process file upload: ${err.message}`
      }
    }
  }
}