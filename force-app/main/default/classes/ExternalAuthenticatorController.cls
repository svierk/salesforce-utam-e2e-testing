public with sharing class ExternalAuthenticatorController {

    @AuraEnabled
    public static Boolean isUserRegistered(String externalUserId) {

        List<External_Authenticator__c> records =
        [
            SELECT Id
            FROM External_Authenticator__c
            WHERE External_User_Id__c = :externalUserId
            LIMIT 1
        ];

        return records.size() > 0;
    }


    @AuraEnabled
    public static String generateSecret() {

        final String chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

        String secret = '';

        for(Integer i = 0; i < 16; i++) {

            Integer rand =
            Math.mod(
                Math.abs(Crypto.getRandomInteger()),
                chars.length()
            );

            secret += chars.substring(rand, rand+1);

        }

        return secret;

    }

    private static Blob base32Decode(String input) {

        final String base32chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

        input = input.replace('=', '').toUpperCase();

        List<Integer> bytes = new List<Integer>();

        Integer buffer = 0;
        Integer bitsLeft = 0;

        for(Integer i = 0; i < input.length(); i++) {

            Integer val =
            base32chars.indexOf(
                input.substring(i, i+1)
            );

            if(val < 0) continue;

            buffer = (buffer << 5) | val;
            bitsLeft += 5;

            if(bitsLeft >= 8) {

                bytes.add(
                    (buffer >> (bitsLeft - 8)) & 255
                );

                bitsLeft -= 8;

            }

        }

        Blob result = Blob.valueOf('');

        for(Integer b : bytes) {

            result =
            Blob.valueOf(result.toString() + String.fromCharArray(new List<Integer>{b}));

        }

        return result;

    }


    @AuraEnabled
    public static String generateQRCode(
        String secret,
        String externalUserId
    ) {

        String issuer = 'SalesforcePOC';

        String otpURL =
        'otpauth://totp/' +
        issuer + ':' +
        externalUserId +
        '?secret=' +
        secret +
        '&issuer=' +
        issuer;

        return
        'https://quickchart.io/qr?text=' +
        EncodingUtil.urlEncode(otpURL,'UTF-8');

    }


    @AuraEnabled
    public static void saveSecret(
        String secret,
        String externalUserId
    ) {

        External_Authenticator__c record =
        new External_Authenticator__c();

        record.External_User_Id__c = externalUserId;
        record.Secret_Key__c = secret;
        record.Is_Active__c = true;

        insert record;

    }


    @AuraEnabled
    public static Boolean verifyCode(
        String externalUserId,
        String userCode
    ) {

        External_Authenticator__c record =
        [
            SELECT Secret_Key__c
            FROM External_Authenticator__c
            WHERE External_User_Id__c = :externalUserId
            LIMIT 1
        ];

        String secret = record.Secret_Key__c;

        Long currentStep =
        DateTime.now().getTime() / 30000;

        // check previous, current, next timestep

        for(Integer i = -1; i <= 1; i++) {

            String generatedOTP =
            generateOTPForStep(
                secret,
                currentStep + i
            );

            if(generatedOTP == userCode) {

                return true;

            }

        }

        return false;

    }


    private static Integer hexCharToInt(String hexChar) {

        String chars = '0123456789abcdef';

        return chars.indexOf(
            hexChar.toLowerCase()
        );

    }

    private static Blob longToBytes(Long value) {

        List<Integer> byteList = new List<Integer>();

        Long temp = value;

        for(Integer i = 0; i < 8; i++) {

            byteList.add(0);

        }

        for(Integer i = 7; i >= 0; i--) {

            byteList[i] = Integer.valueOf(Math.mod(temp, 256));

            temp = temp / 256;

        }

        return Blob.valueOf(String.fromCharArray(byteList));

    }


    private static String generateOTPForStep(
        String secret,
        Long timestep
    ) {

        Blob key = base32Decode(secret);
        Blob timeBlob = longToBytes(timestep);

        Blob mac =
        Crypto.generateMac(
            'HmacSHA1',
            timeBlob,
            key
        );

        String hash =
        EncodingUtil.convertToHex(mac);

        Integer offset =
        hexCharToInt(
            hash.substring(hash.length()-1)
        );

        String truncatedHash =
        hash.substring(offset*2, offset*2+8);

        Integer binary =
        Math.abs(truncatedHash.hashCode());

        Integer otp =
        Math.mod(binary,1000000);

        return String.valueOf(otp).leftPad(6,'0');

    }

}