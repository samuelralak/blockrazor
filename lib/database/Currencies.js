import { Mongo } from 'meteor/mongo';
import { ActivityLog } from './ActivityLog.js';

export const Currencies = new Mongo.Collection('currencies');
export const PendingCurrencies = new Mongo.Collection('pendingcurrencies');
export const RejectedCurrencies = new Mongo.Collection('rejectedcurrencies');

if (Meteor.isServer) {
  import { UserData } from '../../server/serverdb/UserData.js';
  Meteor.methods({
    approveCurrency: function(currencyId) {
      if(UserData.findOne({_id: Meteor.user()._id}).moderator) {
          var original = PendingCurrencies.findOne({_id: currencyId});
          if (original.owner == Meteor.user()._id) {
            throw new Meteor.Error("Approving your own currency is no fun!")
          }
          var insert = _.extend(original, {
            approvedBy: Meteor.user()._id,
            approvedTime: new Date().getTime()
          })
          Currencies.insert(insert, function(error, result) {
            if (!error) {
              PendingCurrencies.remove(currencyId);
              ActivityLog.upsert({_id: original.owner}, { $addToSet: { message: {
              message: "I have approved " + original.currencyName + " and it's now listed!",
                time: new Date().getTime(),
                from: Meteor.user().username
              }}})
            }
          });
      }

    },
    rejectCurrency(name, id, owner, message, moderator) {
      if(UserData.findOne({_id: Meteor.user()._id}).moderator) {
      var original = PendingCurrencies.findOne({_id: id});
      var insert = _.extend(original, {
        rejectedReason: message,
        rejectedBy: moderator
      });
      RejectedCurrencies.insert(insert, function(error, result) {
        if(!error) {
          PendingCurrencies.remove({_id: id});
          ActivityLog.upsert({_id: owner}, { $addToSet: { message: {
            message: name + " was incomplete or incorrect and has not been approved. Please see your moderated list for more information.",
            time: new Date().getTime(),
            from: Meteor.user().username
          }}})
        }
      })
    }},

    setRejected(id, status) {
      PendingCurrencies.upsert({_id: id}, {
        $set: {rejected: status}
      })
    }
  });

  //import { UserData } from '../../server/serverdb/UserData.js';
  Meteor.publish('approvedcurrencies', function currenciesPublication() {
    return Currencies.find();
  });

  Meteor.publish('pendingcurrencies', function pending() {
    if(UserData.findOne({_id: Meteor.user()._id}).moderator) {
        return PendingCurrencies.find();
    } else {
      return PendingCurrencies.find({owner: Meteor.user()._id});
    }
  });
  Meteor.publish('rejectedcurrencies', function rejected() {
    if(UserData.findOne({_id: Meteor.user()._id}).moderator) {
        return RejectedCurrencies.find();
    } else {
      return RejectedCurrencies.find({owner: Meteor.user()._id});
    }
  });
  }