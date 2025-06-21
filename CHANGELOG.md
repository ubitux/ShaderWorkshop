# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Fixed
- `sw-frag --no-header` function has been renamed to `--header`

### Changed
- Error messages do not dump the shader anymore: the error lines in the error
  messages now correspond to the original line numbers in the fragment and
  include files.

## [0.3.0] - 2025-06-19

### Added
- Support for the `#include` directive
- `sw-frag` tool to get the complete combined fragment shader
- Play/Pause/Reset controls
- Canvas screenshot
- Resolution and aspect ratio controls
- Display fragment shader with line numbers on error

### Fixed
- A few race conditions while loading a new fragment

### Changed
- `shader-workshop` program has been renamed to `sw-server`

## [0.2.0] - 2025-06-11

### Added
- Basic install instructions

### Fixed
- Incorrect changelog release link in previous release

## [0.1.0] - 2025-06-11

First version.

[0.1.0]: https://github.com/ubitux/ShaderWorkshop/releases/tag/v0.1.0
[0.2.0]: https://github.com/ubitux/ShaderWorkshop/compare/v0.1.0...v0.2.0
[0.3.0]: https://github.com/ubitux/ShaderWorkshop/compare/v0.2.0...v0.3.0
