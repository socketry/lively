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

In order to protect users of this project, we require all contributors to comply with the [Developer Certificate of Origin](https://developercertificate.org/). This ensures that all contributions are properly licensed and attributed.

### Community Guidelines

This project is best served by a collaborative and respectful environment. Treat each other professionally, respect differing viewpoints, and engage constructively. Harassment, discrimination, or harmful behavior is not tolerated. Communicate clearly, listen actively, and support one another. If any issues arise, please inform the project maintainers.

## See Also

  - [live](https://github.com/socketry/live) — Provides client-server communication using websockets.
  - [mayu](https://github.com/mayu-live/framework) — A live streaming server-side component-based VirtualDOM rendering framework.
