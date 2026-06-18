public with sharing class ProjectCredentialsService {

    @AuraEnabled
    public static Id createCredential(
        String projectName,
        String orgType,
        String orgUsername,
        String orgPassword,
        String ownerUserId,
        List<String> sharedUserIds
    ) {

        if(String.isBlank(projectName) ||
           String.isBlank(orgType) ||
           String.isBlank(orgUsername) ||
           String.isBlank(orgPassword) ||
           String.isBlank(ownerUserId)) {

            throw new AuraHandledException(
                'Missing required credential fields.'
            );
        }


        // STEP 1: Insert Credential Record

        Project_Org_Credential__c credential =
            new Project_Org_Credential__c(

                Name = projectName,
                Org_Type__c = orgType,
                Org_Login_Username__c = orgUsername,
                Org_Login_Password__c = orgPassword,
                Owner_User__c = ownerUserId
            );

        insert credential;


        // STEP 2: Prepare Access Records

        List<Credential_Access__c> accessRecords =
            new List<Credential_Access__c>();


        // OWNER ACCESS (Edit)

        accessRecords.add(

            new Credential_Access__c(

                Credential__c = credential.Id,
                Portal_User__c = ownerUserId,
                Access_Level__c = 'Edit'

            )

        );


        // SHARED USER ACCESS (Read)

        if(sharedUserIds != null && !sharedUserIds.isEmpty()) {

            for(String userId : sharedUserIds) {

                if(userId != ownerUserId) {

                    accessRecords.add(

                        new Credential_Access__c(

                            Credential__c = credential.Id,
                            Portal_User__c = userId,
                            Access_Level__c = 'Read'

                        )

                    );

                }

            }

        }


        // STEP 3: Insert Access Records

        insert accessRecords;


        // RETURN NEW RECORD ID

        return credential.Id;

    }


    @AuraEnabled
    public static List<Id> getSharedUsers(Id credentialId) {

        List<Credential_Access__c> records = [

            SELECT Portal_User__c

            FROM Credential_Access__c

            WHERE Credential__c = :credentialId

            AND Access_Level__c = 'Read'

        ];

        List<Id> userIds = new List<Id>();

        for(Credential_Access__c rec : records) {

            userIds.add(rec.Portal_User__c);

        }

        return userIds;

    }

    @AuraEnabled
    public static void updateCredential(

        Id credentialId,
        String projectName,
        String orgType,
        String orgUsername,
        String orgPassword,
        Id portalUserId

    ) {

        // Verify user has EDIT access

        List<Credential_Access__c> accessRecords = [

            SELECT Id

            FROM Credential_Access__c

            WHERE Credential__c = :credentialId
            AND Portal_User__c = :portalUserId
            AND Access_Level__c = 'Edit'

            LIMIT 1

        ];

        if(accessRecords.isEmpty()) {

            throw new AuraHandledException(
                'You do not have permission to edit this credential.'
            );

        }


        // Update credential safely

        Project_Org_Credential__c credential = [

            SELECT Id

            FROM Project_Org_Credential__c

            WHERE Id = :credentialId

            LIMIT 1

        ];

        credential.Name = projectName;

        credential.Org_Type__c = orgType;

        credential.Org_Login_Username__c = orgUsername;

        if(!String.isBlank(orgPassword)) {
            credential.Org_Login_Password__c = orgPassword;
        }

        update credential;

    }

    @AuraEnabled
    public static void updateCredentialSharing(

        Id credentialId,
        List<Id> selectedUsers,
        Id ownerUserId

    ) {

        // Get existing shared users

        List<Credential_Access__c> existingAccess = [

            SELECT Id, Portal_User__c

            FROM Credential_Access__c

            WHERE Credential__c = :credentialId

            AND Access_Level__c = 'Read'

        ];


        Set<Id> existingUserIds = new Set<Id>();

        for(Credential_Access__c access : existingAccess) {

            existingUserIds.add(access.Portal_User__c);

        }


        Set<Id> newUserIds = new Set<Id>(selectedUsers);


        // Identify users to REMOVE

        List<Credential_Access__c> accessToDelete =
            new List<Credential_Access__c>();


        for(Credential_Access__c access : existingAccess) {

            if(!newUserIds.contains(access.Portal_User__c)) {

                accessToDelete.add(access);

            }

        }


        if(!accessToDelete.isEmpty()) {

            delete accessToDelete;

        }


        // Identify users to ADD

        List<Credential_Access__c> accessToInsert =
            new List<Credential_Access__c>();


        for(Id userId : newUserIds) {

            if(!existingUserIds.contains(userId)) {

                accessToInsert.add(

                    new Credential_Access__c(

                        Credential__c = credentialId,
                        Portal_User__c = userId,
                        Access_Level__c = 'Read'

                    )

                );

            }

        }


        if(!accessToInsert.isEmpty()) {

            insert accessToInsert;

        }

    }

    @AuraEnabled
    public static void deleteCredential(
        Id credentialId,
        Id portalUserId
    ) {

        Credential_Access__c accessCheck = [

            SELECT Id
            FROM Credential_Access__c
            WHERE Credential__c = :credentialId
            AND Portal_User__c = :portalUserId
            AND Access_Level__c = 'Edit'
            LIMIT 1
        ];

        if(accessCheck == null) {

            throw new AuraHandledException(
                'No permission to delete'
            );

        }

        delete [

            SELECT Id
            FROM Project_Org_Credential__c
            WHERE Id = :credentialId
        ];

    }

}