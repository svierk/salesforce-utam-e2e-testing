public with sharing class CustomMFAController {
 

 
    // One-way SHA-256 Hashing

    private static String generateHash(String password) {

        return EncodingUtil.base64Encode(Crypto.generateDigest('SHA-256', Blob.valueOf(password)));

    }
 
    @AuraEnabled

    public static Map<String, Object> initiateAuth(String username, String password) {

        // 1. Search for user

        List<Portal_User__c> users = [SELECT Id, Password_Hash__c, MFA_Secret__c, Is_MFA_Enabled__c 

                                      FROM Portal_User__c 

                                      WHERE Username__c = :username LIMIT 1];
 
        Map<String, Object> res = new Map<String, Object>{ 'username' => username };
 
        // 2. DISCOVERY LOGIC

        if (users.isEmpty()) {

            // NEW USER: Prepare Sign-Up

            Map<String, String> mfa = Auth.SessionManagement.getQrCode();

            res.put('state', 'SIGNUP');

            res.put('qrCodeUrl', mfa.get('qrCodeUrl'));

            res.put('tempSecret', mfa.get('secret'));

        } else {

            // EXISTING USER: Check Password

            Portal_User__c user = users[0];

            if (user.Password_Hash__c != generateHash(password)) {

                throw new AuraHandledException('Invalid Credentials');

            }

            res.put('userId', user.Id);

            if (!user.Is_MFA_Enabled__c) {

                // USER EXISTS BUT NO MFA: Force Setup

                Map<String, String> mfa = Auth.SessionManagement.getQrCode();

                res.put('state', 'SETUP');

                res.put('qrCodeUrl', mfa.get('qrCodeUrl'));

                res.put('tempSecret', mfa.get('secret'));

            } else {

                // RETURNING USER: Standard Verification

                res.put('state', 'VERIFY');

                res.put('tempSecret', user.MFA_Secret__c);

            }

        }

        return res;

    }
 
    @AuraEnabled

    public static Boolean completeAuth(String state, String username, String password, String otp, String secret) {

        // 3. VALIDATE OTP (The 30-Second Math Handshake)

        Boolean isValid = Auth.SessionManagement.validateTotpTokenForKey(secret, otp, 'Portal Login');

        if (!isValid) return false;
 
        // 4. DATABASE UPDATES

        if (state == 'SIGNUP') {

            insert new Portal_User__c(

                Username__c = username,

                Password_Hash__c = generateHash(password),

                MFA_Secret__c = secret,

                Is_MFA_Enabled__c = true

            );

        } else if (state == 'SETUP') {

            Portal_User__c user = [SELECT Id FROM Portal_User__c WHERE Username__c = :username LIMIT 1];

            user.MFA_Secret__c = secret;

            user.Is_MFA_Enabled__c = true;

            update user;

        }

        return true;

    }

}