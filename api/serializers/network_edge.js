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
  const edge = _.pick(networkEdge, ['from', 'to', 'type', 'value', 'numberOfWinningBids', 'amountOfMoneyExchanged']);
  edge.id = networkEdge.uuid;
  // TODO: The problem is that for clusters there is no in('ActingAs') because they don't have a direct connection to the actors
  const actorIDsQuery = `SELECT out.in('ActingAs').id as edgeBuyerIDs,
    out.out('Includes').in('ActingAs').id as edgeClusterBuyerIDs,
    in.in('ActingAs').id as edgeBidderIDs,
    in.out('Includes').in('ActingAs').id as edgeClusterBidderIDs
    FROM NetworkEdge
    WHERE uuid=:edgeUUID;`;
  return config.db.query(
    actorIDsQuery,
    { params: { edgeUUID: networkEdge.uuid } },
  )
    .then((result) => {
      const buyerIDs = _.isEmpty(result[0].edgeClusterBuyerIDs) ? result[0].edgeBuyerIDs : result[0].edgeClusterBuyerIDs;
      const bidderIDs = _.isEmpty(result[0].edgeClusterBidderIDs) ? result[0].edgeBidderIDs : result[0].edgeClusterBidderIDs;
      const detailsQuery = `SELECT list(price.netAmountEur) as priceList
          FROM Bid
          WHERE ${_.join(networkWriters.queryToBidFilters(network.query), ' AND ')}
          AND in('Awards').id in :edgeBuyerIDs
          AND in('Participates').id in :edgeBidderIDs
          AND isWinning=true;`;
      const params = Object.assign(
        {
          edgeBuyerIDs: buyerIDs,
          edgeBidderIDs: bidderIDs,
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
    out.out('Includes').in('ActingAs').id as edgeClusterBuyerIDs,
    in.in('ActingAs').id as edgeBidderIDs,
    in.out('Includes').in('ActingAs').id as edgeClusterBidderIDs
    FROM NetworkEdge
    WHERE uuid=:edgeUUID;`;
  return config.db.query(
    actorIDsQuery,
    { params: { edgeUUID: networkEdge.uuid } },
  )
    .then((result) => {
      const buyerIDs = _.isEmpty(result[0].edgeClusterBuyerIDs) ? result[0].edgeBuyerIDs : result[0].edgeClusterBuyerIDs;
      const bidderIDs = _.isEmpty(result[0].edgeClusterBidderIDs) ? result[0].edgeBidderIDs : result[0].edgeClusterBidderIDs;
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
          edgeBuyerIDs: buyerIDs,
          edgeBidderIDs: bidderIDs,
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
