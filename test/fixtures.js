'use strict';

const FactoryGirl = require('factory-girl');
const uuidv4 = require('uuid/v4');

const factory = FactoryGirl.factory;
factory.setAdapter(new FactoryGirl.ObjectAdapter());

factory.define('rawTender', Object, {
  id: () => uuidv4(),
  modified: '2017-06-08T11:55:43.525',
  country: 'NL',
  finalPrice: {
    currency: 'EUR',
    netAmount: 1212121212,
  },
});

factory.define('rawLot', Object, {
  lotNumber: factory.sequence((n) => n),
  awardDecisionDate: '2015-03-19',
  awardCriteria: [
    {
      name: 'Sanest',
      weight: 10,
    },
  ],
  status: 'awarded',
  addressOfImplementation: {
    rawAddress: 'Klausenburger',
  },
});


module.exports = factory;

