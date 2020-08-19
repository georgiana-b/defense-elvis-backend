'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const config = require('../../config/default');
const networkWriters = require('../writers/network');
const bidSerializer = require('./bid');

function formatEdge(networkEdge) {
  const formattedEdge = _.pick(networkEdge, ['from', 'to', 'type', 'value']);
  formattedEdge.id = networkEdge.uuid;
  formatEdge.flags = {};
  formattedEdge.hidden = !networkEdge.active;
  return formattedEdge;
}

function formatContractsEdgeWithDetails(network, networkEdge) {
  const edge = _.pick(networkEdge, ['from', 'to', 'type', 'numberOfWinningBids', 'amountOfMoneyExchanged']);
  edge.id = networkEdge.uuid;
  const actorIDsQuery = `SELECT out.in('ActingAs').id as edgeBuyerIDs,
    in.in('ActingAs').id as edgeBidderIDs
    FROM NetworkEdge
    WHERE uuid=:edgeUUID;`;
  return config.db.query(
    actorIDsQuery,
    { params: { edgeUUID: networkEdge.uuid } },
  )
    .then((result) => {
      const detailsQuery = `SELECT list(price.netAmountEur) as priceList
          FROM Bid
          WHERE ${_.join(networkWriters.queryToBidFilters(network.query), ' AND ')}
          AND in('Awards').id in :edgeBuyerIDs
          AND in('Participates').id in :edgeBidderIDs
          AND isWinning=true;`;
      const params = Object.assign(
        {
          edgeBuyerIDs: result[0].edgeBuyerIDs,
          edgeBidderIDs: result[0].edgeBidderIDs,
        },
        network.query,
      );
      return config.db.query(detailsQuery, { params });
    })
    .then((result) => {
      const priceList = _.get(result[0], 'priceList', []);
      const numberOfAvailablePrices = priceList.length;
      edge.percentValuesMissing = 100 - ((numberOfAvailablePrices * 100) / networkEdge.numberOfWinningBids);
      return edge;
    });
}

function formatContractsEdgeBids(network, networkEdge, limit, page) {
  const skip = (page - 1) * limit;
  const actorIDsQuery = `SELECT out.in('ActingAs').id as edgeBuyerIDs,
    in.in('ActingAs').id as edgeBidderIDs
    FROM NetworkEdge
    WHERE uuid=:edgeUUID;`;
  return config.db.query(
    actorIDsQuery,
    { params: { edgeUUID: networkEdge.uuid } },
  )
    .then((result) => {
      const edgeBidsQuery = `SELECT *
        FROM Bid
        WHERE ${_.join(networkWriters.queryToBidFilters(network.query), ' AND ')}
        AND in('Awards').id in :edgeBuyerIDs
        AND in('Participates').id in :edgeBidderIDs
        AND isWinning=true
        LIMIT :limit
        SKIP :skip;`;
      const params = Object.assign(
        {
          edgeBuyerIDs: result[0].edgeBuyerIDs,
          edgeBidderIDs: result[0].edgeBidderIDs,
          limit,
          skip,
        },
        network.query,
      );
      return config.db.query( edgeBidsQuery, { params });
    })
    .then((bids) => Promise.map(bids, (bid) => bidSerializer.formatBidWithRelated(network, bid)));
}


module.exports = {
  formatEdge,
  formatContractsEdgeWithDetails,
  formatContractsEdgeBids,
};
