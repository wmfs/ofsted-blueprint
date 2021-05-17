const csvparse = require('csv-parse')
const fs = require('fs')

function readCsv (csvFile, importLog) {
  return new Promise((resolve, reject) => {
    let idx = 1

    fs.createReadStream(csvFile)
      .pipe(csvparse({ columns: true }))
      .on('data', row => {
        idx++

        const requiredProperties = [
          ['URN', 'urn'],
          ['UPRN', 'uprn'],
          ['EstablishmentName', 'establishmentName'],
          ['OfstedRating (name)', 'ofstedRating']
        ]

        const missingProperties = []

        if (!row['URN'])  missingProperties.push('URN')
        if (!row['EstablishmentName'])  missingProperties.push('EstablishmentName')
        if (!row['UPRN'])  missingProperties.push('UPRN')
        if (!row['OfstedRating (name)'])  missingProperties.push('OfstedRating (name)')

        if (missingProperties.length === 0) {
          importLog.totalRows++
          importLog.rows.push({
            urn: row['URN'], // Column A: URN
            uprn: row['UPRN'], // Column DZ: UPRN
            establishmentName: row['EstablishmentName'], // Column E: EstablishmentName
            ofstedRating: row['OfstedRating (name)'] // Column DW: OfstedRating (name)
          })
        } else {
          importLog.totalRejected++
          importLog.rejected.push({ idx, missingProperties })
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

  if (totalRows === 0) {
    log.uploadError = `0 rows to be uploaded.`
  } else if (totalRejected > 0) {
    log.uploadWarning = `${totalRows} rows to be uploaded but ${totalRejected} rows were rejected (see below).`
  } else {
    log.uploadGood = `${totalRows} rows to be uploaded.`
  }
}

async function processFile ({ serverFilename, clientFilename }) {
  const importLog = {
    serverFilename,
    clientFilename,
    startTime: new Date(),
    rows: [],
    rejected: [],
    totalRows: 0,
    totalRejected: 0
  }

  await readCsv(serverFilename, importLog)

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