# Getting Started

This guide explains how to get started with `async-http-cache`, a cache middleware for `Async::HTTP` clients and servers.

## Installation

Add the gem to your project:

```bash
$ bundle add async-http-cache
```

## Core Concepts

`async-http-cache` has several core concepts:

- A {Async::HTTP::Cache::General} which represents the main cache middleware that implements a general shared cache according to RFC 9111.
- A cache store system that handles the actual storage and retrieval of cached responses.
- Cache-aware request and response handling that respects HTTP caching headers.

## Usage

The cache middleware can be used with both `Async::HTTP` clients and servers to provide transparent HTTP caching.

### Client Side Caching

Here's how to use the cache with an HTTP client:

```ruby
require "async"
require "async/http"
require "async/http/cache"

endpoint = Async::HTTP::Endpoint.parse("https://www.oriontransfer.co.nz")
client = Async::HTTP::Client.new(endpoint)
cache = Async::HTTP::Cache::General.new(client)

Async do
	2.times do
		response = cache.get("/products/index")
		puts response.inspect
		# <Async::HTTP::Protocol::HTTP2::Response ...>
		# <Async::HTTP::Cache::Response ...>
		response.finish
	end
ensure
	cache.close
end
```

In this example:

1. We create an HTTP client as usual
2. We wrap it with `Async::HTTP::Cache::General` to add caching capability
3. The first request will hit the remote server
4. The second identical request will be served from the cache (if the response is cacheable)

### Caching Behavior

The cache middleware automatically handles:

- **Cacheable Methods**: Only `GET` and `HEAD` requests are cached
- **Cache Headers**: Respects `Cache-Control`, `Expires`, and other standard HTTP caching headers
- **Response Codes**: Only certain response codes (200, 203, 300, 301, 302, 404, 410) are cached
- **Request Validation**: Requests with authorization headers, cookies, or request bodies are not cached

### Important Notes on Vary Header

The `vary` header creates a headache for proxy implementations, because it creates a combinatorial explosion of cache keys, even if the content is the same. Try to avoid it unless absolutely necessary.

## Custom Cache Stores

By default, the cache uses an in-memory store, but you can provide custom storage backends:

```ruby
# Use a custom store
cache = Async::HTTP::Cache::General.new(client, store: MyCustomStore.new)
```

The store must implement the interface defined by {Async::HTTP::Cache::Store}.
