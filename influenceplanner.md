# Getting started



## Obtain an API Key

To use our API, you'll first need to obtain an API key. This key uniquely identifies you as a trusted partner, determines what resources you have access to, and is required for all requests made to our API.

Please reach out to us at [contact@singularityresearch.org](mailto:contact@singularityresearch.org) with some information about your project and/or integration needs. We'll respond promptly with your personal API key and any onboarding support you require.

We don't currently offer a self-service API key request process, and don't support integration into any **public** third-party applications.

## Read the Documentation

Take some time to review this documentation. Here, you'll find important information about authentication, available endpoints, usage limits, error handling, and best practices.

## Authentication

Once you have your API key, the first technical step is to familiarize yourself with the authentication process for your requests.

[Proceed to Authentication →](/access/authentication)


# Introduction



Welcome to the InfluencePlanner Partner API documentation!

This documentation is designed to help you understand the API and learn how to integrate it into your application as seamlessly as possible.

Should you have any questions, please contact us at [contact@singularityresearch.org](mailto:contact@singularityresearch.org).

<Callout title="AI Integration">
  The content of this documentation is also available in an LLM friendly format at [this URL](https://docs.influenceplanner.com/llms-full.txt).
</Callout>


# Authentication



## Overview

The InfluencePlanner Partner API is secured using an API key and Username pair, and associated with a specific set of permissions and resources.

<Callout title="Don't have a key yet?">
  Learn how to obtain an API key in the [Getting Started](/getting-started) section.
</Callout>

### Per-key permissions

Each API key is paired with a Username and uniquely assigned to a single user in our system. This means that your keypair will determine what resources you have access to, and what actions you can perform on them.

The system will also verify the Subscription status and feature set of the user associated with the API key, and determine access accordingly.

Every endpoint in the API is protected by this mechanism, and will return a `401 Unauthorized` response if the request is not authenticated, or a `402 Payment Required` response if the request is authenticated but the user does not have permission to access a given resource due to lacking the necessary subscription level.

### Key validity

API keys are valid for an indefinite period of time from the date of issuance, but can be revoked by us at any time without notice, if deemed necessary for security or compliance reasons.

<Callout title="Warning" type="warning">
  API keys are sensitive and should be stored securely, if compromised, your account and resources may be at risk. Never share it with anyone, and don't expose it in client-side code.

  If you suspect that your API key has been compromised, please contact us immediately at [contact@singularityresearch.org](mailto:contact@singularityresearch.org).
</Callout>

## Authenticate your requests

Include your username and API key in the HTTP Authorization header using the Basic authentication scheme. Concatenate your username and API key with a colon (`username:API_KEY`), then base64 encode only that value. The resulting header should look like:

```
Authorization: Basic <base64(username:API_KEY)>
```

### Example

For example, if your username is `alice` and your API key is `ip-1234`, you would base64 encode `alice:ip-1234`. The resulting header would be:

```
Authorization: Basic YWxpY2U6aXAtMTIzNA==
```

In a request:

```
curl -X GET "https://api.influenceplanner.com/partner/v1/network/members" -H "Authorization: Basic YWxpY2U6aXAtMTIzNA=="
```

## Error handling

The API will return the following error codes related to authentication:

* `400 Bad Request`: The request was malformed or otherwise invalid.
* `401 Unauthorized`: The request was not authenticated.
* `402 Payment Required`: The requrested resource is not available on your current subscription plan.
* `403 Forbidden`: The request is not allowed.

The relevant error states are discussed in more detail in the [Error handling](/partner-api/error-handling) section.

### Rate limiting

The API is rate limited to 30 requests per minute. If you exceed this limit, the API will return a `429 Too Many Requests` error.

More on this in the [Rate limiting](/partner-api/rate-limiting) section.


# Best practices



## API key security

API keys are sensitive information and should be stored securely:

* Never share your API key with any third parties
* Never expose it in client-side code
* Never store it in a public or shared location
* Never commit it to a version control system

If your API key is compromised, your account and resources may be at risk.

<Callout title="Warning" type="warning">
  If you suspect that your API key has been compromised, please contact us immediately at [contact@singularityresearch.org](mailto:contact@singularityresearch.org).
</Callout>

## Encryption

All communication between your application and the API must be encrypted using HTTPS (TLS/SSL) to protect data in transit from interception and tampering.

### Transport Layer Security (TLS)

* **Enforce HTTPS**: All API requests must use HTTPS endpoints. HTTP requests are not allowed.
* **TLS Version**: Use TLS 1.2 or higher. TLS 1.0 and 1.1 are deprecated and should be disabled in your HTTP client configuration.

### Client-side

* **Keep Libraries Updated**: Regularly update your HTTP client libraries to receive security patches and support for modern protocols.
* **API Key Protection**: Never send API keys in URLs or query parameters where they may be logged or exposed otherwise. We only support the `Authorization` header for authentication.

### Application Security

* **Server-Side Processing**: Process API keys and make API calls from your backend servers, not from client-side code (i.e. browsers).
* **Graceful Degradation**: Design your application to handle API failures gracefully without exposing potentially sensitive error details to end users.

By following these practices, you can help ensure that your data and credentials remain protected while interacting with the API.


# Error handling



The API returns HTTP responses on each request to indicate the success or otherwise of API requests. The codes listed below are often used, and the API may use others. Note that 4xx and 5xx responses may be returned for any request and clients should cater for them.

| Code | Description                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------- |
| 400  | Bad Request - the request was malformed or otherwise invalid.                                     |
| 401  | Unauthorized - the request was not authenticated.                                                 |
| 402  | Payment Required - the requrested resource is not available on your current subscription plan.    |
| 403  | Forbidden - the request is not allowed.                                                           |
| 404  | Not Found - the resource was not found.                                                           |
| 405  | Method Not Allowed - the resource does not accept the HTTP method.                                |
| 406  | Not Acceptable - the resource cannot return the client's required content type.                   |
| 429  | Too Many Requests - the client has reached or exceeded a rate limit, or the server is overloaded. |
| 5xx  | Server errors - something went wrong with our servers.                                            |

<Callout title="Retryable requests">
  Note that 5xx Server errors are most likely temporary, and any such requests should be retried at a later time.
</Callout>


# Overview



Our REST API is the core building block of the InfluencePlanner platform. The Partner API allows you to retrieve and update information from your own InfluencePLanner account, or to integrate InfluencePlanner into your private application/workflow. It's completely up to you and your custom use case.

## Versioning

The Patrner API is versioned. You can specify the version in the URL of your requests, for example:

```
curl -X GET "https://api.influenceplanner.com/partner/v1/network/members" -H "Authorization: Basic <base64(username:API_KEY)>"
```

When a new version is released, any previous versions are considered to be deprecated, and will be removed at some point in the future.

Generally speaking, you should always use the latest version of the API, as we will not guarantee backwards compatibility with older versions.

<Callout title="Current version">
  The current stable Patner API version is `v1`, available at the following base URL:  `https://api.influenceplanner.com/partner/v1/`.
</Callout>

### Unversioned changes

Some changes may need to be made across multiple versions and therefore are not considered to be released under any one version.

Should a change like this occur, we will document them here, indicating the affected version(s), and notify our partners as soon as possible.

## Encoding

Data is encoded as defined by JSON in [RFC4627](https://www.ietf.org/rfc/rfc4627.txt). The default encoding for API responses is UTF-8. Certain characters, such as emoji may be handled as surrogate unicode pairs (see section '2.5 Strings' of [RFC4627](https://www.ietf.org/rfc/rfc4627.txt)).

Some query parameters may need to be url encoded when sending - for example, the `searchTerm` parameter value used to search in your list of members should be encoded to support whitespaces and other special characters.

## Pagination

APIs for listing and searching resources offer offset-based pagination. This is available so that when you are requesting a large amount of data — like a list of your members — you can receive and process them in smaller chunks.

### How Offset-based pagination works

Endpoints supporting pagination accept a `limit` and an `offset` parameter. The `limit` parameter is used to specify the maximum number of items to return, and the `offset` parameter is used to specify the offset of the first item to return.

Both are optional, with the default values being `limit=25` and `offset=0`.

### Example

For example, if you want to return the first 50 members, you would set the `limit` to 50 and the `offset` to 0.

If you want to return the next 50 members, you would set the `limit` to 50 and the `offset` to 50.

### Paginated response properties

Additionally, paginated responses will include helpful properties to help you navigate through the pages of results:

* `totalElements`: The total number of elements in the collection.
* `totalPages`: The total number of pages in the collection.
* `size`: The number of elements in the current page.
* `first`: Whether this is the first page.
* `last`: Whether this is the last page.

## Compatibility

The API follows a "must ignore" processing model, where all clients are expected to ignore data fields they don't understand.

For example if a client saw the JSON as shown in this example:

```json
{
  "id": "123",
  "name": "John Doe",
  "unknown_key": "unknown_value"
}
```

and did not understand the `unknown_key` field, it must pretend the field wasn't there and will process the object as if it looked liked the object shown here:

```json
{
  "id": "123",
  "name": "John Doe"
}
```


# Rate limiting



## Overview

Our API observes *rate limits*, which means that we impose a maximum number of requests that your app can make per minute.
If your app exceeds this limit, we put it in a cooldown, where you must wait until the quota resets before you can make new requests again.

## Working with rate limits

Each API request comes back with three headers related specifically to rate limiting, giving you a complete snapshot of the current usage level:

| Header                  | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `X-RateLimit-Limit`     | The maximum number of requests you can make per minute.             |
| `X-RateLimit-Remaining` | The number of requests you have left before the cooldown starts.    |
| `X-RateLimit-Reset`     | A timestamp value indicating when the next 60-second period begins. |

The cooldown for the app kicks in if the total number of API requests in a given 60-second period exceeds the value of the `X-RateLimit-Limit` response header.

If you blow past this limit, the API stops processing any requests from your app for the remainder of the current 60-second period.
During this time, any request from your app results in HTTP status code `429 - Too Many Requests`.

### How many requests can I make per minute?

At the time of writing, the rate limit is set to 30 requests per minute, but you should always refer to the `X-RateLimit-Limit` response header for the most up-to-date information.

## Best practices

Generally speaking, for typical apps under typical conditions, hitting the rate limit should never happen or be extremely infrequent. Here are some practices to follow to avoid hitting the rate limit:

### Polling endpoints

In case you need to poll an endpoint for updates, you should apply reasonable delay between requests, and implement an exponential backoff retry strategy for failed requests.

### Caching

You should cache responses from the API whenever possible, and only update the cache when you have reason to believe the data has changed.

### Bulk operations

Most endpoints support bulk operations (e.g. creating schedules), which you should prefer over single-item requests whenever possible to reduce the number of requests you need to make.


# List managed members



<div className="flex items-center rounded-md overflow-hidden w-fit text-base text-white font-bold">
  <span className="px-2 py-1 bg-indigo-500">
    GET
  </span>

  <pre className="px-2 py-1 font-mono bg-gray-600">
    /network/members
  </pre>
</div>

## Overview

This endpoint returns a [paginated](/partner-api/overview#pagination) list of all members in your network, including their profile information and current status.

## Query parameters

| Parameter    | Type    | Required | Default   | Description                                                              |
| ------------ | ------- | -------- | --------- | ------------------------------------------------------------------------ |
| `offset`     | Integer | No       | `0`       | The number of items to skip before returning results (for pagination).   |
| `limit`      | Integer | No       | `25`      | The maximum number of items to return (max: 25).                         |
| `searchTerm` | String  | No       | -         | Filter members by name. The search term is matched against member names. |
| `sortBy`     | String  | No       | `UPDATED` | The field to sort results by. See [Sort options](#sort-options).         |
| `sortDir`    | String  | No       | `DESC`    | Sort direction: `ASC` (ascending) or `DESC` (descending).                |

<Callout title="Pagination">
  This endpoint uses offset-based pagination. See the [Pagination](/partner-api/overview#pagination) section for more details on navigating through large result sets.
</Callout>

### Sort options

The `sortBy` parameter accepts the following values:

| Value       | Description                                        |
| ----------- | -------------------------------------------------- |
| `STATUS`    | Sort by membership status.                         |
| `FOLLOWERS` | Sort by follower count.                            |
| `CREATED`   | Sort by when the member was added to your network. |
| `UPDATED`   | Sort by when the member was last updated.          |

## Response

### Success

Returns a paginated list of network members.

### Response structure

<TypeTable
  type={{
  results: {
    description: <span>List of <a href="/endpoints/network/list-members#network-member-object">network member objects</a>.</span>,
    type: 'NetworkMember[]',
    required: true
  },
  first: {
    description: 'Whether this is the first page of results.',
    type: 'boolean',
    required: true
  },
  last: {
    description: 'Whether this is the last page of results.',
    type: 'boolean',
    required: true
  },
  totalPages: {
    description: 'Total number of pages available.',
    type: 'number',
    required: true
  },
  totalElements: {
    description: 'Total number of members in your network.',
    type: 'number',
    required: true
  },
  size: {
    description: 'Number of items in the current page.',
    type: 'number',
    required: true
  },
}}
/>

### Network member object

<TypeTable
  type={{
  membership_id: {
    description: 'Unique identifier for the membership.',
    type: 'number',
    required: true
  },
  status: {
    description: <span>Current status of the network member, one of <a href="/endpoints/network/list-members#network-member-statuses">these values</a>.</span>,
    type: 'NetworkMemberStatus',
    required: true
  },
  user_id: {
    description: 'Platform-specific user identifier.',
    type: 'string',
    required: true
  },
  name: {
    description: 'Display name of the member.',
    type: 'string',
    required: true
  },
  image_url: {
    description: "URL to the member's profile image.",
    type: 'string',
    required: true
  },
  profile_url: {
    description: "URL to the member's profile on their platform.",
    type: 'string',
    required: true
  },
  followers: {
    description: 'Number of followers the member has.',
    type: 'number',
    required: true
  },
  updated_at: {
    description: 'ISO 8601 timestamp of when the member was last updated.',
    type: 'string',
    required: true
  },
}}
/>

### Network member statuses

| Value              | Description                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `LINKED`           | The user is linked to your account.                                                      |
| `INVALID`          | The user has an invalid connection to our platform, and cannot be used.                  |
| `PENDING`          | The user has been invited to join your network, but has not yet accepted the invitation. |
| `PENDING_APPROVAL` | The user has requested to join your network, and is awaiting your approval.              |
| `UNLINKED`         | The user has unlinked their account from your network.                                   |
| `DECLINED`         | The user has declined the invitation to join your network.                               |

### Error responses

| Code | Description                                                            |
| ---- | ---------------------------------------------------------------------- |
| 400  | Bad Request — Invalid query parameters (e.g., invalid `sortBy` value). |
| 401  | Unauthorized — Missing or invalid API credentials.                     |
| 429  | Too Many Requests — Rate limit exceeded.                               |
| 5xx  | Server Error — Something went wrong on our end. Retry later.           |

## Example

### Request

```bash
curl --request GET \
  --url 'https://api.influenceplanner.com/partner/v1/network/members?offset=0&limit=5' \
  --header 'Authorization: Basic <base64(username:API_KEY)>'
```

### Response

```json
{
  "results": [
    {
      "membership_id": 61400,
      "status": "LINKED",
      "user_id": "SOUNDCLOUD-USER-1234",
      "name": "John Doe",
      "image_url": "https://i1.sndcdn.com/avatars-1234-large.jpg",
      "profile_url": "https://soundcloud.com/john-doe",
      "followers": 9800,
      "updated_at": "2025-07-01T22:24:44Z"
    },
    {
      "membership_id": 61401,
      "status": "INVALID",
      "user_id": "SOUNDCLOUD-USER-4567",
      "name": "Jane Doe",
      "image_url": "https://i1.sndcdn.com/avatars-4567-large.jpg",
      "profile_url": "https://soundcloud.com/jane-doe",
      "followers": 1500,
      "updated_at": "2025-06-29T01:45:29Z"
    },
  ],
  "first": true,
  "last": true,
  "totalPages": 1,
  "totalElements": 2,
  "size": 2
}
```


# Create schedules



<div className="flex items-center rounded-md overflow-hidden w-fit text-base text-white font-bold">
  <span className="px-2 py-1 bg-green-700">
    POST
  </span>

  <pre className="px-2 py-1 font-mono bg-gray-600">
    /schedule/create
  </pre>
</div>

## Overview

This endpoint allows you to create new schedules for actions (reposts, likes, comments) to be performed by members in your network on specified media.

## Request body

<TypeTable
  type={{
  types: {
    description: 'Array of action types to perform. At least one type is required.',
    type: 'ActionType[]',
    required: true,
  },
  medias: {
    description: 'Array of SoundCloud media URLs to schedule actions for. URLs are validated to exist. At least one media URL is required.',
    type: 'string[]',
    required: true,
  },
  targets: {
    description: 'Array of user IDs to perform the actions. Must be members managed by your account. At least one target is required.',
    type: 'string[]',
    required: true,
  },
  settings: {
    description: 'Configuration object for schedule timing. Required.',
    type: 'Settings',
    required: true,
  },
  comment: {
    description: 'Comment text to post (only available when using 3 or fewer targets). Optional.',
    type: 'string | null',
    default: <span>null</span>,
  },
  removeDuplicates: {
    description: 'Skip targets who have already reposted the media. Optional.',
    type: 'boolean',
    default: <span>false</span>,
  },
  shuffle: {
    description: 'Randomize the order of targets. Optional.',
    type: 'boolean',
    default: <span>false</span>,
  },
}}
/>

<Callout title="Comments limitation" type="warning">
  The comment field can only be used when targeting 3 or fewer accounts. Requests with more targets and a non-null comment will be rejected.
</Callout>

### ActionType

The `types` array accepts one or more of the following values:

| Value      | Description                                   |
| ---------- | --------------------------------------------- |
| `REPOST`   | Repost the media to the target's profile.     |
| `UNREPOST` | Remove the repost after a specified duration. |
| `LIKE`     | Like the media.                               |
| `COMMENT`  | Post a comment on the media.                  |

### Settings object

<TypeTable
  type={{
  date: {
    description: 'ISO 8601 timestamp for when the schedule should start. If omitted, the schedule will be auto-scheduled.',
    type: 'string',
  },
  unrepostAfterHours: {
    description: 'Number of hours after which to unrepost (when UNREPOST type is included).',
    type: 'number',
  },
  spreadBetweenAccountsMinutes: {
    description: 'Minutes to wait between each target account performing the action on a given media.',
    type: 'number',
  },
  spreadBetweenTracksMinutes: {
    description: 'Minutes to wait between reposting different media by the same target.',
    type: 'number',
  },
}}
/>

<Callout title="Auto-scheduling">
  Omit the date field in settings to let the system automatically determine the optimal time for your schedule.
</Callout>

## Response

### Success

Returns a list of URLs to successfully created schedules.

### Response structure

<TypeTable
  type={{
  message: {
    description: 'Optional message about the operation.',
    type: 'string | null',
    default: <span>null</span>,
  },
  status: {
    description: 'Status of the operation.',
    type: 'string',
    required: true,
  },
  data: {
    description: 'Array of URLs to successfully created schedules (one per media in the request).',
    type: 'string[]',
    required: true,
  },
}}
/>

### Error responses

| Code | Description                                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------- |
| 400  | Bad Request — Invalid request body, missing required fields, invalid media URLs, or invalid targets. |
| 402  | Payment Required — The requested feature is not available on your current subscription plan.         |
| 401  | Unauthorized — Missing or invalid API credentials.                                                   |
| 429  | Too Many Requests — Rate limit exceeded.                                                             |
| 5xx  | Server Error — Something went wrong on our end. Retry later.                                         |

## Example

### Request

```bash
curl --request POST \
  --url https://api.influenceplanner.com/partner/v1/schedule/create \
  --header 'Authorization: Basic <base64(username:API_KEY)>' \
  --header 'Content-Type: application/json' \
  --data '{
    "types": ["REPOST", "UNREPOST"],
    "medias": ["https://soundcloud.com/example/demo"],
    "targets": ["SOUNDCLOUD-USER-1234", "SOUNDCLOUD-USER-4567"],
    "settings": {
      "date": "2026-01-30T21:00:00.000Z",
      "unrepostAfterHours": 24,
      "spreadBetweenAccountsMinutes": 60,
      "spreadBetweenTracksMinutes": 60
    },
    "comment": null,
    "removeDuplicates": true,
    "shuffle": true
  }'
```

### Response

```json
{
  "message": null,
  "status": "CREATED",
  "data": [
    "https://influenceplanner.com/planned/calendar/schedule/80808ba8-c347-45ed-b878-f3f5c802ed2b"
  ]
}
```