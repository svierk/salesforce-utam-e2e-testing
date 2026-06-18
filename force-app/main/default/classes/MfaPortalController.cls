public with sharing class MfaPortalController {
 
    // One-way SHA-256 Hashing for password security

    private static String generateHash(String password) {

        return EncodingUtil.base64Encode(Crypto.generateDigest('SHA-256', Blob.valueOf(password)));

    }
 
    // THE FIX: Manually building the Branded URI to bypass Salesforce defaults

    private static String buildBrandedUri(String secret, String username) {

    String issuer = 'User_Portal';

    // Clean the username for the URL

    String label = username.replaceAll(' ', '_');
 
    // Step 1: Create the TOTP identity string

    String authData = 'otpauth://totp/' + issuer + ':' + label + 

                     '?secret=' + secret + '&issuer=' + issuer;
 
    // Step 2: Use the modern QR Server API (More reliable than Google Charts)

    // Documentation: https://goqr.me/api/

    return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + 

            EncodingUtil.urlEncode(authData, 'UTF-8');

}
 
 
    // @AuraEnabled

    // public static Map<String, Object> handlePortalEntry(String username, String password) {

    //     List<Portal_User__c> users = [SELECT Id, Password_Hash__c, MFA_Secret__c, Is_MFA_Enabled__c 

    //                                   FROM Portal_User__c 

    //                                   WHERE Username__c = :username LIMIT 1];
 
    //     Map<String, Object> res = new Map<String, Object>{ 'username' => username };
 
    //     // SCENARIO 1: NEW USER or MFA SETUP REQUIRED

    //     if (users.isEmpty() || !users[0].Is_MFA_Enabled__c) {

    //         // Get the Secret from Salesforce engine

    //         Map<String, String> mfa = Auth.SessionManagement.getQrCode();

    //         String rawSecret = mfa.get('secret'); 

    //         res.put('state', users.isEmpty() ? 'SIGNUP' : 'MFA_SETUP');

    //         // CRITICAL CHANGE: We ignore the Salesforce 'qrCodeUrl' and build OUR OWN

    //         res.put('qrCodeUrl', buildBrandedUri(rawSecret, username));

    //         res.put('tempSecret', rawSecret);

    //         if(!users.isEmpty()) res.put('userId', users[0].Id);

    //         return res;

    //     }
 
    //     // SCENARIO 2: EXISTING USER (Verify Password)

    //     Portal_User__c user = users[0];

    //     if (user.Password_Hash__c != generateHash(password)) {

    //         throw new AuraHandledException('Unauthorized: Check your credentials.');

    //     }
 
    //     res.put('state', 'LOGIN_VERIFY');

    //     res.put('tempSecret', user.MFA_Secret__c);

    //     res.put('userId', user.Id);

    //     return res;

    // }

    @AuraEnabled
    public static Map<String, Object> handlePortalEntry(String username, String password) {

        List<Portal_User__c> users = [
            SELECT Id, Password_Hash__c, MFA_Secret__c, Is_MFA_Enabled__c, Is_First_Login__c
            FROM Portal_User__c
            WHERE Username__c = :username
            LIMIT 1
        ];

        if (users.isEmpty()) {
            throw new AuraHandledException('User not found. Contact administrator.');
        }

        Portal_User__c user = users[0];

        // Validate password
        if (user.Password_Hash__c != generateHash(password)) {
            throw new AuraHandledException('Unauthorized: Check your credentials.');
        }

        Map<String, Object> res = new Map<String, Object>{
            'username' => username,
            'userId' => user.Id
        };

        // STEP 1: FIRST LOGIN → RESET PASSWORD
        if (user.Is_First_Login__c) {

            res.put('state', 'RESET_PASSWORD');
            return res;

        }

        // STEP 2: MFA NOT ENABLED → QR SETUP
        if (!user.Is_MFA_Enabled__c) {

            Map<String, String> mfa = Auth.SessionManagement.getQrCode();

            String rawSecret = mfa.get('secret');

            res.put('state', 'MFA_SETUP');
            res.put('qrCodeUrl', buildBrandedUri(rawSecret, username));
            res.put('tempSecret', rawSecret);

            return res;
        }

        // STEP 3: NORMAL LOGIN → OTP VERIFY

        res.put('state', 'LOGIN_VERIFY');
        res.put('tempSecret', user.MFA_Secret__c);

        return res;
    }
 
    @AuraEnabled
    public static Map<String, Object> finalizePortalAccess(String state,String username,String password,String otp,String secret) {

        Map<String, Object> response = new Map<String, Object>();

        // RESET PASSWORD FLOW

        if (state == 'RESET_PASSWORD') {

            Portal_User__c user = [
                SELECT Id,Username__c
                FROM Portal_User__c
                WHERE Username__c = :username
                LIMIT 1
            ];

            user.Password_Hash__c = generateHash(password);
            user.Is_First_Login__c = false;

            update user;

            Map<String, String> mfa =
                Auth.SessionManagement.getQrCode();

            String rawSecret = mfa.get('secret');

            response.put(
                'qrCodeUrl',
                buildBrandedUri(rawSecret, username)
            );

            response.put(
                'tempSecret',
                rawSecret
            );

            return response;
        }

        // EXISTING OTP FLOW

        Boolean isValid =
            Auth.SessionManagement.validateTotpTokenForKey(secret, otp, 'Portal');

        if (isValid) {

            if (state == 'MFA_SETUP') {

                Portal_User__c user = [
                    SELECT Id
                    FROM Portal_User__c
                    WHERE Username__c = :username
                    LIMIT 1
                ];

                user.MFA_Secret__c = secret;
                user.Is_MFA_Enabled__c = true;

                update user;
            }
        }

        response.put('success', isValid);

        return response;
    }

}