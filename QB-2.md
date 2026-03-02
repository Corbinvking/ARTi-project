Basic ID and field definitions for the QuickBooks Online Accounting API
Here are common IDs and data fields you may see during development. These appear frequently for various features and implementations.

Common fields
appID (also known as App ID) : The unique identifier for an app you created on the Intuit Developer Portal. To find an app’s ID, sign in to the developer portal. Then select the Dashboard link in the toolbar.
clientID (also known as client ID) : A unique string that publically identifies an app using OAuth2.0. It’s used by clients (i.e. users) connecting to apps.
clientSecret (also known as client secret) : A randomized string that privately identifies an app using OAuth2.0. The value is only known by the app, it’s developer, and our authorization services.
realmID (also known as companyID) : An ID that identifies an individual QuickBooks Online company. Users commonly have multiple QuickBooks Online companies. The realmID identifies each one. Many users know this as a “company ID.” It’s this same value as the realm ID.
Permalink : The URL for your app’s page on the QuickBooks App Store. For example: https://apps.intuit.com/AccountingApp.
Common IDs
Realm ID
This identifies a unique, individual QuickBooks Online company file. We assign realm IDs when QuickBooks Online users create their company file.

Tip: Realm IDs and company IDs are the same number.

Realm IDs are specified in the URI of every API request. Here’s an example:


1
baseURL/company/1234/account
In this case, the realm ID is 1234.

At runtime, apps can retrieve realm IDs in the few ways:

From the ID token generated when users sign in with OpenID Connect. Learn more about verifying the ID token.
From the realmId parameter on the redirect URL passed during the OAuth 2.0 authorization request. Learn more about authorization requests.

Entity ID
This identifies individual instances of API entities such as an account, charge, or estimate. We assign this value to the entityID field.

To call entities by their entity ID, use the read operation and specify the entity ID in the URL. Use the following format and treat entity IDs as strings: baseURL/company/<realmId>/entityName/entityID.

Here’s an example:


1
baseURL/company/1234/customer/2123
In this case, the entity ID for this Customer entity is 2123.


Request ID
This identifies specific HTTP requests sent from apps to our servers. Request IDs let apps correlate requests and responses.

Request IDs are especially useful in cases where apps need to resend requests due to a dropped connection, or didn’t receive a response from the server.

We strongly recommend you use request IDs for requests that write, modify, or delete data. This guarantees idempotence. If our service receives another request with the same request ID, instead of performing the operation again or returning an error, it can recognize and send the same response for the original request. This prevents duplication.

Use query parameter requestid in the URI of requests to specify request IDs.

Here are a few things to keep in mind:

The request ID your app specifies must be unique for all requests for a given QuickBooks Online company file (as specified by the realm ID).
The request ID can have a maximum of 50 characters for all operations, except for batch operations.
For batch operations, the requestid can have a maximum of 36 characters. For each batch ID, only 10 characters are allowed when the request ID is also specified.
For a batch request, both the request ID and batch ID must be the same as the original request ID and batch ID in order for the request to be unique. If you pass the same request ID but different batch IDs, they will be considered to be different requests when retried.
To avoid duplication, your app is responsible for generating unique request IDs. We recommend using a library such as java.util.UUID or .NET System.GUID to generate these values.
This example scenario demonstrates why request IDs are important:

An app sends a request to create an invoice. It specifies “4957” for the request ID like this: baseURL/company/1234/invoice?requestid=4957
Our service processes the request and sends a response.
The app loses its connection and doesn’t receive a response.
The app sends the same request again, specifying the same content and request ID.
Our server already has the requestid. It can determine that the subsequent request is the same.
Our server sends the same response as in step 2.
The app receives the response and verifies it contains no errors.

If the app hadn’t specified a request ID, the server would create a duplicate invoice with a new entity ID.


Resource name
This is the name of the API entity, such as the account, customer, payments, or invoice entities. Learn more about QuickBooks Online Accounting API resources and entities.