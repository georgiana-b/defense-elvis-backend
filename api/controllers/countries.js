'use strict';

const _ = require('lodash');
const codes = require('../helpers/codes');
const config = require('../../config/default');
const formatError = require('../helpers/errorFormatter');

function getTenderCountries(req, res) {
  const swaggerParams = _.pickBy(
    _.mapValues(req.swagger.params, 'value'),
    (val) => !(_.isUndefined(val)),
  );
  const queryCriteria = [];
  const queryParams = {};
  if (swaggerParams.cpvs) {
    queryCriteria.push("out('AppliedTo').in('Comprises').out('HasCPV').code in :cpvs");
    queryParams.cpvs = swaggerParams.cpvs;
  }
  if (swaggerParams.years) {
    queryCriteria.push('xYear in :years');
    queryParams.years = swaggerParams.years;
  }
  if (swaggerParams.buyers) {
    queryCriteria.push("in('Awards').id in :buyers");
    queryParams.buyers = swaggerParams.buyers;
  }
  if (swaggerParams.bidders) {
    queryCriteria.push("in('Participates').id in :bidders");
    queryParams.bidders = swaggerParams.bidders;
  }
  const query = `SELECT *
    FROM Country
    WHERE code in (
      SELECT distinct(xCountry) as countryCode
        FROM Bid
        ${queryCriteria.length ? ` WHERE ${_.join(queryCriteria, ' AND ')}` : ''}
    )`;
  return config.db.query(query, { params: queryParams })
    .then((results) => res.status(codes.SUCCESS).json({
      countries: _.map(results, (country) => formatCountry(country)),
    }))
    .catch((err) => formatError(err, req, res));
}

function formatCountry(country) {
  return _.pick(country, ['code', 'name']);
}

module.exports = {
  getTenderCountries,
  formatCountry,
};