# Releases

## Unreleased

  - Expose shared application state via `Application[..., controller: Controller.new]`.

## v0.16.2

  - Modernize internals and update dependencies.

## v0.16.1

  - Updated game audio tutorial content.

## v0.16.0

  - Updated `live-audio` component dependencies.

## v0.15.1

  - Fixed handling of spaces in asset names.

## v0.15.0

  - Added platformer-style game example.
  - Improved game audio tutorial.

## v0.14.1

  - Added `bake` tasks for release management.

## v0.14.0

  - Fixed guide rendering and test suite.

## v0.13.1

  - Tidied up gem dependencies.

## v0.13.0

  - Added `live-audio` support for background and positional audio in applications.
  - Added game audio example demonstrating audio playback.
  - Fixed serving non-existent asset paths gracefully.
  - Achieved 100% test and documentation coverage.

## v0.12.0

  - Added bundled guides for getting started and tutorials.
  - Added Pacman example application.
  - Improved multiplayer support in flappy bird via `falcon.rb` binding.
  - Fixed chatbot example.

## v0.11.0

  - Added `.wav` audio file support.
  - Added worms multiplayer presentation example.
  - Added tool-assisted AI integration example.
  - Dropped support for Ruby v3.1.

## v0.10.1

  - Fixed missing `require` statements.

## v0.10.0

  - Added touch input support for mobile devices.
  - Added multiplayer support to the flappy bird example.
  - Default asset root is now the local `public/` directory.

## v0.9.0

  - Added `.mp3` audio file support.
  - Added sound effects to the math quest example.

## v0.8.0

  - Server now binds to `localhost` by default for security.
  - Disabled asset caching during development.
  - Added worms example application.

## v0.7.0

  - Added hello-world example application.
  - Updated `@socketry/live` to v0.14.0.
  - Renamed `example/` directory to `examples/`.

## v0.6.0

  - Added `lively` command-line executable.
  - Added several example applications (chatbot, flappy bird, game of life, waves).

## v0.5.0

  - Updated bundled `Live.js` client library.

## v0.4.0

  - Updated dependencies and `live.js`.

## v0.3.0

  - Modernized gem structure.
  - Fixed service environment configuration issues.

## v0.2.1

  - Updated dependencies.
  - Switched to `bake-gem` for release management.

## v0.2.0

  - Public assets are now included in the released gem.
  - Moved example app to a separate repository.
  - Improved event handling and UI styling.

## v0.1.0

  - Initial proof of concept implementation.
