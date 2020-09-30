'use strict';

const _ = require('lodash');

const config = require('../../config/default');
const clusterWriters = require('../writers/actor_cluster');
const networkWriters = require('../writers/network');
const tenderSerializer = require('../serializers/tender');
const codes = require('../helpers/codes');
const formatError = require('../helpers/errorFormatter');

function countTenders(req, res) {
  const swaggerParams = req.swagger.params.body.value;
  console.log(swaggerParams)
  const queryCriteria = [];
  const queryParams = {};
  if (swaggerParams.years) {
    queryCriteria.push('xYear in :years');
    queryParams.years = swaggerParams.years;
  }
  if (swaggerParams.cpvs) {
    queryCriteria.push("out('BidHasCPV').code in :cpvs");
    queryParams.cpvs = swaggerParams.cpvs;
  }
  if (swaggerParams.countries) {
    queryCriteria.push('xCountry in :countries');
    queryParams.countries = swaggerParams.countries;
  }
  const actorQueries = [];
  if (swaggerParams.buyers) {
    actorQueries.push("in('Awards').id in :buyers");
    queryParams.buyers = swaggerParams.buyers;
  }
  if (swaggerParams.bidders) {
    actorQueries.push("in('Participates').id in :bidders");
    queryParams.bidders = swaggerParams.bidders;
  }
  if (actorQueries.length) {
    queryCriteria.push(`(${_.join(actorQueries, ' OR ')})`);
  }
  const query = `SELECT count(*) as count
    FROM Bid
    ${queryCriteria.length ? ` WHERE ${_.join(queryCriteria, ' AND ')}` : ''}`;
  return config.db.query(query, { params: queryParams })
    .then((results) => res.status(codes.SUCCESS).json({
      count: results[0].count,
    }))
    .catch((err) => formatError(err, req, res));
}

function getNetworkTender(req, res) {
  const networkID = req.swagger.params.networkID.value;
  const tenderID = req.swagger.params.tenderID.value;
  return clusterWriters.retrieveNetwork(networkID)
    .then((network) =>
      retrieveNetworkTender(network, tenderID)
        .then((tender) => tenderSerializer.formatTenderWithRelated(network, tender)))
    .then((tender) => res.status(codes.SUCCESS).json({
      tender,
    }))
    .catch((err) => formatError(err, req, res));
}

function retrieveNetworkTender(network, tenderID) {
  return config.db.query(
    `SELECT *
      FROM Bid
      WHERE ${_.join(networkWriters.queryToBidFilters(network.query), ' AND ')}
      AND out('AppliedTo').in('Comprises').id=:tenderID
      AND isWinning=true;`,
    { params: Object.assign({}, network.query, { tenderID }) },
  ).then((bids) => {
    if (_.isEmpty(bids)) {
      throw new codes.BadRequestError(`Tender with \`id\` ${tenderID} has no bids that commply with the network query.`);
    }
    return config.db.select()
      .from('Tender')
      .where({ id: tenderID })
      .one()
      .then((tender) => {
        if (_.isUndefined(tender) === true) {
          throw new codes.NotFoundError(`Tender with \`id\` ${tenderID} was not found.`);
        }
        return tender;
      });
  });
}

function retrieveNetworkTender(network, tenderID) {
  return config.db.query(
    `SELECT *
      FROM Bid
      WHERE ${_.join(networkWriters.queryToBidFilters(network.query), ' AND ')}
      AND out('AppliedTo').in('Comprises').id=:tenderID
      AND isWinning=true;`,
    { params: Object.assign({}, network.query, { tenderID }) },
  ).then((bids) => {
    if (_.isEmpty(bids)) {
      throw new codes.BadRequestError(`Tender with \`id\` ${tenderID} has no bids that commply with the network query.`);
    }
    return config.db.select()
      .from('Tender')
      .where({ id: tenderID })
      .one()
      .then((tender) => {
        if (_.isUndefined(tender) === true) {
          throw new codes.NotFoundError(`Tender with \`id\` ${tenderID} was not found.`);
        }
        return tender;
      });
  });
}

module.exports = {
  getNetworkTender,
  retrieveNetworkTender,
  countTenders,
};
