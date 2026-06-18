public with sharing class WebArticleRecommendationAction {

    public class Request {
        @InvocableVariable(
            required=true
            label='User Question'
            description='The full question asked by the user.'
        )
        public String userQuestion;
    }

    public class Response {
        @InvocableVariable(
            label='Recommended Articles'
            description='Recommended web article links based on the user question.'
        )
        public String recommendedArticles;
    }

    @InvocableMethod(
        label='Find Web Recommended Articles'
        description='Searches Wikipedia articles based on the user question and returns recommended article links.'
    )
    public static List<Response> findArticles(List<Request> requests) {

        List<Response> responses = new List<Response>();

        for (Request reqItem : requests) {

            Response res = new Response();

            try {
                String originalQuestion = String.isBlank(reqItem.userQuestion)
                    ? 'help'
                    : reqItem.userQuestion;

                System.debug('Original Question: ' + originalQuestion);

                String searchQuery = buildSearchQuery(originalQuestion);

                System.debug('Final Search Query: ' + searchQuery);

                List<Object> wikiResult = searchWikipedia(searchQuery);

                List<Object> titles = (List<Object>) wikiResult[1];
                List<Object> descriptions = (List<Object>) wikiResult[2];
                List<Object> urls = (List<Object>) wikiResult[3];

                if (titles.isEmpty()) {

                    String fallbackQuery = getFallbackKeyword(searchQuery);

                    System.debug('Fallback Search Query: ' + fallbackQuery);

                    if (!String.isBlank(fallbackQuery) && fallbackQuery != searchQuery) {
                        wikiResult = searchWikipedia(fallbackQuery);

                        titles = (List<Object>) wikiResult[1];
                        descriptions = (List<Object>) wikiResult[2];
                        urls = (List<Object>) wikiResult[3];
                    }
                }

                if (titles.isEmpty()) {
                    res.recommendedArticles =
                        'I could not find any recommended articles for this question. ' +
                        'Try asking with simpler keywords like password, login, account security, or authentication.';
                } else {
                    String output = 'Here are some recommended articles that may help:\n\n';

                    for (Integer i = 0; i < titles.size(); i++) {
                        output += (i + 1) + '. ' + String.valueOf(titles[i]) + '\n';

                        if (
                            descriptions.size() > i &&
                            !String.isBlank(String.valueOf(descriptions[i]))
                        ) {
                            output += 'Why this helps: ' + String.valueOf(descriptions[i]) + '\n';
                        }

                        if (urls.size() > i) {
                            output += 'URL: ' + String.valueOf(urls[i]) + '\n';
                        }

                        output += '\n';
                    }

                    res.recommendedArticles = output;
                }

            } catch (Exception ex) {
                res.recommendedArticles =
                    'Something went wrong while searching recommended articles: ' +
                    ex.getMessage();

                System.debug('Exception Message: ' + ex.getMessage());
                System.debug('Exception Line Number: ' + ex.getLineNumber());
            }

            responses.add(res);
        }

        return responses;
    }

    private static String buildSearchQuery(String question) {

        String cleanedQuestion = question.toLowerCase();

        cleanedQuestion = cleanedQuestion.replace('?', ' ');
        cleanedQuestion = cleanedQuestion.replace('.', ' ');
        cleanedQuestion = cleanedQuestion.replace(',', ' ');
        cleanedQuestion = cleanedQuestion.replace('!', ' ');

        List<String> stopWords = new List<String>{
            'how', 'can', 'could', 'would', 'should', 'do', 'does', 'did',
            'i', 'me', 'my', 'we', 'our', 'you', 'your',
            'is', 'are', 'was', 'were', 'am', 'be', 'been',
            'the', 'a', 'an', 'to', 'for', 'of', 'in', 'on', 'with',
            'please', 'tell', 'explain', 'what', 'when', 'where', 'why'
        };

        List<String> finalWords = new List<String>();

        for (String word : cleanedQuestion.split('\\s+')) {
            word = word.trim();

            if (
                word.length() > 2 &&
                !stopWords.contains(word)
            ) {
                finalWords.add(word);
            }
        }

        if (finalWords.isEmpty()) {
            return question;
        }

        Integer maxWords = Math.min(4, finalWords.size());

        List<String> limitedWords = new List<String>();

        for (Integer i = 0; i < maxWords; i++) {
            limitedWords.add(finalWords[i]);
        }

        return String.join(limitedWords, ' ');
    }

    private static String getFallbackKeyword(String searchQuery) {

        if (String.isBlank(searchQuery)) {
            return 'help';
        }

        List<String> words = searchQuery.split('\\s+');

        if (words.isEmpty()) {
            return searchQuery;
        }

        return words[words.size() - 1];
    }

    private static List<Object> searchWikipedia(String searchQuery) {

        String encodedQuery = EncodingUtil.urlEncode(searchQuery, 'UTF-8');

        String endpoint =
            'https://en.wikipedia.org/w/api.php' +
            '?action=opensearch' +
            '&search=' + encodedQuery +
            '&limit=5' +
            '&namespace=0' +
            '&format=json';

        System.debug('Wikipedia Endpoint: ' + endpoint);

        HttpRequest httpReq = new HttpRequest();
        httpReq.setEndpoint(endpoint);
        httpReq.setMethod('GET');
        httpReq.setTimeout(120000);

        Http http = new Http();
        HttpResponse httpRes = http.send(httpReq);

        System.debug('Wikipedia Status Code: ' + httpRes.getStatusCode());
        System.debug('Wikipedia Raw Response: ' + httpRes.getBody());

        if (httpRes.getStatusCode() != 200) {
            throw new CalloutException(
                'Wikipedia API returned status code: ' + httpRes.getStatusCode()
            );
        }

        return (List<Object>) JSON.deserializeUntyped(httpRes.getBody());
    }
}