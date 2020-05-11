'use strict';

const test = require('ava');

const bidExtractor = require('./../../extractors/bid');
const fixtures = require('./../fixtures');

test('extractBid extracts year from lots award decision date', async (t) => {
  const rawBid = await fixtures.build('rawBid');
  const year = 2015;
  const rawLot = await fixtures.build('rawLot', {
    awardDecisionDate: `${year}-02-12`,
  });
  t.is(
    bidExtractor.extractBid(rawBid, {}, rawLot).xYear,
    year,
  );
});

test('extractBid extracts sources from award notice publications', async (t) => {
  const publication = await fixtures.build('rawContractAwardNotice');
  const rawBid = await fixtures.build('rawBid');
  const rawTender = await fixtures.build('rawTender', {
    publications: [publication],
  });
  t.deepEqual(
    bidExtractor.extractBid(rawBid, rawTender, {}).sources,
    [publication.humanReadableUrl],
  );
});

test('extractBid returns expty set of sources if there is no publication', async (t) => {
  const rawBid = await fixtures.build('rawBid');
  const rawTender = await fixtures.build('rawTender', {
    publications: [],
  });
  t.deepEqual(
    bidExtractor.extractBid(rawBid, rawTender, {}).sources,
    [],
  );
});
