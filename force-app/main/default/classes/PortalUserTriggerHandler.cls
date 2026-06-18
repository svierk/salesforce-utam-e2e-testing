public class PortalUserTriggerHandler {

    public static void handleBeforeInsert(List<Portal_User__c> newRecords) {
        processPasswordHashing(newRecords);
    }


    public static void handleBeforeUpdate(List<Portal_User__c> newRecords,Map<Id, Portal_User__c> oldMap) {
        processPasswordHashing(newRecords);
    }


    private static void processPasswordHashing(List<Portal_User__c> records) {

        for (Portal_User__c user : records)
        {

            if (String.isNotBlank(user.Temporary_Password__c))
            {

                user.Password_Hash__c =
                    generateHash(user.Temporary_Password__c);

                user.Temporary_Password__c = null;

                user.Is_First_Login__c = true;

            }

        }

    }


    private static String generateHash(String password) {

        return EncodingUtil.base64Encode(
            Crypto.generateDigest(
                'SHA-256',
                Blob.valueOf(password)
            )
        );

    }

}