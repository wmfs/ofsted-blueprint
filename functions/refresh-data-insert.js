module.exports = function () {
  return async function refreshDataInsert (event, env) {
    const {
      models,
      client
    } = env.bootedServices.storage

    const {
      ofsted_importLog: logModel
      // ofsted_ofsted: dataModel
    } = models

    const {
      rows,
      serverFilename,
      clientFilename,
      startTime,
      totalRows,
      totalRejected
    } = event

    const importLog = {
      serverFilename,
      clientFilename,
      startTime,
      totalRows,
      totalRejected
    }

    const script = ['TRUNCATE TABLE ofsted.ofsted;']

    for (const { urn, uprn, establishmentName, ofstedRating } of rows) {
      script.push(`INSERT INTO ofsted.ofsted (urn, uprn, establishment_name, ofsted_rating) VALUES (${urn}, '${uprn}', '${establishmentName}', '${ofstedRating}');`)
    }

    console.log(script)

    // await logModel.create(importLog)

    return event
  }
}