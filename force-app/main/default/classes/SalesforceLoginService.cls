public with sharing class SalesforceLoginService {

    @AuraEnabled
    public static String loginToOrg(
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
                'Unauthorized access.'
            );
        }

        Project_Org_Credential__c credential = [

            SELECT
                Org_Login_Username__c,
                Org_Login_Password__c,
                Security_Token__c,
                Org_Type__c

            FROM Project_Org_Credential__c

            WHERE Id = :credentialId

            LIMIT 1
        ];

        String loginUrl;

        if(credential.Org_Type__c == 'Sandbox') {

            loginUrl =
                'https://test.salesforce.com/services/Soap/u/60.0';

        } else {

            loginUrl =
                'https://login.salesforce.com/services/Soap/u/60.0';
        }

        String passwordWithToken =
            credential.Org_Login_Password__c;

        if(String.isNotBlank(credential.Security_Token__c)) {

            passwordWithToken +=
                credential.Security_Token__c;
        }

        String soapBody =
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' +
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
        'xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">' +
        '<env:Body>' +
        '<n1:login xmlns:n1="urn:partner.soap.sforce.com">' +
        '<n1:username>' +
        credential.Org_Login_Username__c +
        '</n1:username>' +
        '<n1:password>' +
        passwordWithToken +
        '</n1:password>' +
        '</n1:login>' +
        '</env:Body>' +
        '</env:Envelope>';

        HttpRequest req = new HttpRequest();

        req.setEndpoint(loginUrl);

        req.setMethod('POST');

        req.setHeader(
            'Content-Type',
            'text/xml; charset=UTF-8'
        );

        req.setHeader(
            'SOAPAction',
            'login'
        );

        req.setBody(soapBody);

        Http http = new Http();

        HttpResponse res = http.send(req);

        if(res.getStatusCode() != 200) {

            throw new AuraHandledException(
                'Login failed.'+ res.getBody()
            );
        }
         
        Dom.Document doc = new Dom.Document();

        doc.load(res.getBody());

        Dom.XmlNode envelope =
            doc.getRootElement();

        Dom.XmlNode body =
            envelope.getChildElement(
                'Body',
                'http://schemas.xmlsoap.org/soap/envelope/'
            );

        Dom.XmlNode loginResponse =
            body.getChildElement(
                'loginResponse',
                'urn:partner.soap.sforce.com'
            );

        Dom.XmlNode result =
            loginResponse.getChildElement(
                'result',
                'urn:partner.soap.sforce.com'
            );

        String sessionId;
        String serverUrl;

        for(Dom.XmlNode child : result.getChildElements()) {

            if(child.getName() == 'sessionId') {

                sessionId = child.getText();
            }

            if(child.getName() == 'serverUrl') {

                serverUrl = child.getText();
            }
        }

        if(String.isBlank(sessionId)) {

            throw new AuraHandledException(
                'Session ID not returned.'
            );
        }

        String baseUrl =
            serverUrl.substringBefore('/services');

        String frontdoorUrl =
            baseUrl +
            '/secur/frontdoor.jsp?sid=' +
            EncodingUtil.urlEncode(
                sessionId,
                'UTF-8'
            );

        return frontdoorUrl;
    }
}