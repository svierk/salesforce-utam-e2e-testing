public with sharing class CredentialDashboardController {

    @AuraEnabled(cacheable=true)
    public static List<CredentialWrapper> getUserCredentials(Id portalUserId) {

        if(portalUserId == null) {
            throw new AuraHandledException('User context missing.');
        }

        List<Credential_Access__c> accessRecords = [

            SELECT
                Id,
                Access_Level__c,
                Credential__c,
                Credential__r.Name,
                Credential__r.Org_Type__c,
                Credential__r.Org_Login_Username__c,
                Credential__r.Org_Login_Password__c,
                Credential__r.Owner_User__c

            FROM Credential_Access__c

            WHERE Portal_User__c = :portalUserId

            ORDER BY Credential__r.Name

        ];

        List<CredentialWrapper> results = new List<CredentialWrapper>();

        for(Credential_Access__c record : accessRecords) {

            CredentialWrapper wrapper = new CredentialWrapper();

            wrapper.credentialId = record.Credential__c;
            wrapper.projectName = record.Credential__r.Name;
            wrapper.orgType = record.Credential__r.Org_Type__c;
            wrapper.orgUsername = record.Credential__r.Org_Login_Username__c;
            wrapper.orgPassword = '••••••••';
            wrapper.accessLevel = record.Access_Level__c;
            wrapper.ownerId = record.Credential__r.Owner_User__c;

            results.add(wrapper);
        }

        return results;
    }

    @AuraEnabled(cacheable=true)
    public static List<SelectOptionWrapper> getPortalUsers(Id portalUserId) {

        List<SelectOptionWrapper> users =
            new List<SelectOptionWrapper>();

        for(Portal_User__c user :

            [SELECT Id, Name FROM Portal_User__c WHERE Id != :portalUserId]

        ) {

            users.add(

                new SelectOptionWrapper(

                    user.Id,

                    user.Name

                )

            );

        }

        return users;
    }

    @AuraEnabled(cacheable=true)
    public static String getPortalUserDisplayName(Id portalUserId) {

        if(portalUserId == null) {

            throw new AuraHandledException('User context missing.');

        }

        Portal_User__c user = [

            SELECT Name
            FROM Portal_User__c
            WHERE Id = :portalUserId
            LIMIT 1

        ];

        return user.Name;

    }

    public class SelectOptionWrapper {

        @AuraEnabled public String label;

        @AuraEnabled public String value;

        public SelectOptionWrapper(

            String value,

            String label

        ) {

            this.label = label;

            this.value = value;

        }

    }

    @AuraEnabled
    public static String revealPassword(

        Id credentialId,
        Id portalUserId

    ) {

        List<Credential_Access__c> accessCheck = [

            SELECT Id

            FROM Credential_Access__c

            WHERE Credential__c = :credentialId
            AND Portal_User__c = :portalUserId

            LIMIT 1

        ];

        if(accessCheck.isEmpty()) {

            throw new AuraHandledException(
                'Unauthorized access attempt.'
            );

        }

        Project_Org_Credential__c credential = [

            SELECT Org_Login_Password__c

            FROM Project_Org_Credential__c

            WHERE Id = :credentialId

            LIMIT 1

        ];

        return credential.Org_Login_Password__c;

    }


    public class CredentialWrapper {

        @AuraEnabled public Id credentialId;
        @AuraEnabled public String projectName;
        @AuraEnabled public String orgType;
        @AuraEnabled public String orgUsername;
        @AuraEnabled public String orgPassword;
        @AuraEnabled public String accessLevel;
        @AuraEnabled public Id ownerId;

    }

}