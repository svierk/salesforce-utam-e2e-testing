trigger PortalUserPasswordTrigger on Portal_User__c (before insert,before update) {

    if(Trigger.isBefore) {
        if(Trigger.isInsert) {
             PortalUserTriggerHandler.handleBeforeInsert(Trigger.new);
        }

        if(Trigger.isUpdate) {
            PortalUserTriggerHandler.handleBeforeUpdate(Trigger.new,Trigger.oldMap);
        }
    }

}