Basic schema and data formats for the QuickBooks Online Accounting API
The QuickBooks Online Accounting API is based on the REST framework. Here’s a quick guide for relevant REST features, operations, formats, and attributes.

General REST API info
What is REST?
Common REST naming conventions
Base URLs for the QuickBooks Online Accounting API
See our current baseURLs.

URI formats for operations
Operation	URI
Create and update	POST baseURL/v3/company/realmId/resourceName
Read (single-entity)	GET baseURL/v3/company/realmId/resourceName/entityID
Read (multi-entity)	GET baseURL/v3/company/realmId/query?query=selectStmt
Delete	POST baseURL/v3/company/realmId/resourceName?operation=delete
URI component definitions
Component	Description
baseURL	Initial path to the URI. The Base URL section contains the list of available paths.
resourceName	The name of the API entity you’re performing the operation for (such as a customer, invoice, or transaction).
entityID	The ID identifying the specific instance of the API entity.
Common request header fields
These are the common HTTP header fields for requests.

Field name	Description	Required
Accept	
The acceptable content-type for server responses. Used for operations that return a response body. Use application/json fo most API interactions. In a few cases, you can also use application/pdf to return some transaction entities in PDF format.

Individual entity references in the API Explorer note the supported content types.

Optional
Accept-Encoding	
The desired content-coding in the response. This is set by the request library in use if that library supports compression. In most cases, you should set a parameter in your network library indicating you want responses to be compressed, rather than setting the header manually.

This can significantly improve the perceived performance of your app, and dramatically reduces the size of response data.

Optional
Authorization	
The authentication credentials for HTTP authentication. This header is required for all requests. It represents the end-user’s permission to let your app share access to their QuickBooks Online company data.

Learn how to implement OAuth 2.0 and create this value.

Required
Content-Length	Length of the message (without the headers) according to RFC 2616. This header is used for POST operations.	Optional
Content-Type	The MIME type of the request body. This header is used for POST operations. Use application/json for all API interactions.	Required for POST operations
Host	The domain name of the server for the request. This is set by the request library in use. See Base URLs for valid values.	Optional
Example POST request


 1
 2
 3
 4
 5
 6
 7
 8
 9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
POST /v3/company/12345678/invoice HTTP/1.1
Host: quickbooks.api.intuit.com
Accept: application/json
Content-Type: application/json
Authorization: Bearer eyJlbmMiOiJ**************xPfzFFw
Host: quickbooks.api.intuit.com

{
   "Line": [
      {
         "Amount": 100.00,
         "DetailType": "SalesItemLineDetail",
         "SalesItemLineDetail": {
            "ItemRef": {
               "value": "1",
               "name": "Services"
            }
         }
      }
   ],
   "CustomerRef": {
      "value": "1"
   }
}
Common server response header fields
These are common HTTP header fields for responses from our servers.

Field name	Description
Cache-Control	Specifies directives that must be obeyed by all caching mechanisms along the request-response chain.
Connection	Control options for the current connection and list of hop-by-hop response fields.
Content-Type	Defines the MIME type of the response.
Date	Gives the date and time for service responses. Defined by RFC 7131 date/time format.
Expires	Gives the date/time when the response is considered stale.
intuit_tid	Indicates errors or issues. Tip: If you see this value in the response, log it. It will help our support team quickly identify the issue.
Keep-Alive	Indicates if the HTTPS channel can be kept “alive” (open) to improve performance on subsequent requests. This is managed by the underlying networking library of the language.
QBO-Version	Specifies the version of our services that processed the request.
Server	Specifies the server handling the request. Tip: If there’s ever an issue, our support staff can quickly determine whether there are issues with a specific server.
Strict-Transport-Security	A HSTS Policy informing the HTTP client how long to cache the HTTPS only policy, and whether this policy applies to subdomains.
Transfer-Encoding	Specifies the encoding used to safely transfer the API response data to the app making the API call for the given entity. Current methods: chunked, compress, deflate, gzip, identity.
Vary	Tells downstream proxies how to match future request headers. This decides if the cached response can be used, rather than requesting a fresh one from the origin server.
Via	Informs the client if the response was sent through any proxies.
Example response


 1
 2
 3
 4
 5
 6
 7
 8
 9
10
11
12
13
14
15
16
17
18
19
20
21
Cache-Control: max-age=0, no-cache, no-store, must-revalidate, private
Connection: keep-alive
Content-Type: application/json;charset=UTF-8
Date: Thu, 07 Jan 2016 17:19:22 GMT
Expires: 0
intuit_tid: gw-756b01cf-3fe0-4414-a2a2-321dd2287b7b
Keep-Alive: timeout=5
QBO-Version: 1512.462
Server: nginx/1.8.0
Strict-Transport-Security: max-age=15552000
Transfer-Encoding: chunked
Vary: Accept-Encoding
Via: 1.1 ipp-gateway-ap05

{
 "Invoice": {
...

 },
 "time": "2016-01-07T09:19:21.923-08:00"
}
Common IDs, data fields, and resources
Here are detailed definitions of common IDs and data fields used throughout our API.

Updating read-only attributes
Any value supplied in a read-only attribute is transient and will be silently overwritten by QuickBooks data services. No error is returned. Learn more about updating read-only attributes.

Character encoding
US versions of QuickBooks Online support ISO-8859-1 (extended ASCII) character encoding.

Non-US versions of QuickBooks Online support UTF-8 character encoding.

Timestamps and time zones
The basic format is: <date>T<time><UTC offset>

Timestamps returned in QuickBooks Online Accounting API response payloads and webhooks notifications are in DateTime format. This conforms to the iCal date/time format, as defined in RFC 2445.

Field name	Description
date	The UTC date follows the format *YYYY-MM-DD.
time	The UTC time follows the format HH:MM:SS.
UTC offset	The UTC offset to apply for time zone correction follows the format +/-HH:MM.
Here’s an example timestamp:

2025-02-24T10:33:39-07:00

This represents 03:33:39 on 24 February 2025, in a time zone west of UTC by 07:00 hours.

API call limits and throttles
Important

Apps that are in the Builder tier of the Intuit App Partner Program have an included limit of 500,000 CorePlus API calls per workspace per month. API calls beyond that limit will be throttled and an HTTP 429 error will be returned. For details see this article.
Server	QuickBooks Online API endpoints	Batch endpoint
Sandbox servers	
500 requests per minute per realm ID.
10 requests per second, per realm ID and app.
40 emails per day per Realm.
Recommended maximum number of payloads in a single batch request is 30.
Throttled at 40 Batch requests per minute, per realm ID and app.
120 Batch requests per minute per realm ID.
Production servers	
500 requests per minute per realm ID.
10 requests per second, per realm ID and app.
Recommended maximum number of payloads in a single batch request is 30.
Throttled at 40 Batch requests per minute, per realm ID and app.
120 Batch requests per minute per realm ID.
If your app accesses endpoints other than QuickBooks Online, there is a combined limit of 800 requests per minute, per realm ID and app.
You’ll see HTTP Status Code 429 when throttling occurs. If you see this, wait 60 seconds before retrying the request.
Any requests that take longer than 120 seconds to execute will time out. Keep this in mind when determining how many payloads to include in a single batch request.
The maximum number of entities returned in a query response is 1000. To handle more than 1000, use pagination to fetch the entities in chunks.
Each transaction (except Journal Entry) can contain a maximum of 10,000 line items.
Each transaction (except Journal Entry) can be linked to a maximum of 10,000 transactions (includes transaction-level and line-level links).
Each transaction (except Journal Entry) can contain a maximum of 10,000 attachments.
Note: Requests are performed in a mutli-threaded environment. There may be timing issues leading to unexpected results.
Minor versions and XML schema definitions (XSDs)
The current version of the QuickBooks Online Accounting API supports minor versions.

This lets you access incremental changes and continue using specific versions of API entities so you don’t break existing apps. Here’s how to access minor versions.