public with sharing class PortalMFAController {
 
    // Helper to hash password for comparison

    private static String getHashedPassword(String password) {

        return EncodingUtil.base64Encode(Crypto.generateDigest('SHA-256', Blob.valueOf(password)));

    }
 
    @AuraEnabled

    public static Map<String, Object> authenticateStepOne(String username, String password) {

        // 1. Find User & Check Hashed Password

        String hashedInput = getHashedPassword(password);

        List<External_Authenticator__c> users = [SELECT Id, Secret_Key__c, Password__c FROM External_Authenticator__c WHERE External_User_Id__c = :username LIMIT 1];
 
        if (users.isEmpty() || users[0].Password__c != hashedInput) {

            throw new AuraHandledException('Invalid Username or Password');

        }
 
        External_Authenticator__c user = users[0];

        Map<String, Object> result = new Map<String, Object>{'userId' => user.Id};
 
        // 2. Check if they need to setup MFA for the first time

        if (String.isBlank(user.Secret_Key__c)) {

            Map<String, String> mfaData = Auth.SessionManagement.getQrCode();

            user.Secret_Key__c = mfaData.get('secret');

            update user;

            result.put('needsSetup', true);

            result.put('qrCodeUrl', mfaData.get('qrCodeUrl'));

        } else {

            result.put('needsSetup', false);

        }
 
        return result;

    }
 
    @AuraEnabled

    public static Boolean verifyOTP(Id userId, String otpCode) {

        External_Authenticator__c user = [SELECT Secret_Key__c FROM External_Authenticator__c WHERE Id = :userId LIMIT 1];

        // Use the 'Key' method since this isn't a standard Salesforce User

        return Auth.SessionManagement.validateTotpTokenForKey(

            user.Secret_Key__c, 

            otpCode, 

            'Custom App Login'

        );

    }

}