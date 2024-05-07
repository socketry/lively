# Lively

A Ruby framework for building interactive web applications for creative coding.

[![Development Status](https://github.com/socketry/lively/workflows/Test/badge.svg)](https://github.com/socketry/lively/actions?workflow=Test)

## Usage

See the various examples in the `examples/` directory.

### Live Coding

You can use `entr` to reload the server when files change:

``` bash
$ ls **/*.rb | entr -r bundle exec ./application.rb
```

## Contributing

We welcome contributions to this project.

1.  Fork it.
2.  Create your feature branch (`git checkout -b my-new-feature`).
3.  Commit your changes (`git commit -am 'Add some feature'`).
4.  Push to the branch (`git push origin my-new-feature`).
5.  Create new Pull Request.

### Developer Certificate of Origin

This project uses the [Developer Certificate of Origin](https://developercertificate.org/). All contributors to this project must agree to this document to have their contributions accepted.

### Contributor Covenant

This project is governed by the [Contributor Covenant](https://www.contributor-covenant.org/). All contributors and participants agree to abide by its terms.

## See Also

  - [live](https://github.com/socketry/live) — Provides client-server communication using websockets.
  - [mayu](https://github.com/mayu-live/framework) — A live streaming server-side component-based VirtualDOM rendering framework.
