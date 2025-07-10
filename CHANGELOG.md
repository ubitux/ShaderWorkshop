# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added
- Low resolution control

### Changed
- Mouse position is only updated when pressing down

## [0.5.0] - 2025-07-03

### Added
- Color live controls
- FPS indicator
- Mouse position

## [0.4.1] - 2025-06-23

### Fixed
- Add missing `.glsl` include file to packaging

## [0.4.0] - 2025-06-23

### Added
- Uniform live controls for `float`, `int` and `bool`

### Fixed
- `sw-frag --no-header` function has been renamed to `--header`

### Changed
- Error messages do not dump the shader anymore: the error lines in the error
  messages now correspond to the original line numbers in the fragment and
  include files.
- Python minimal requirement is bumped to 3.12

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
[0.4.0]: https://github.com/ubitux/ShaderWorkshop/compare/v0.3.0...v0.4.0
[0.4.1]: https://github.com/ubitux/ShaderWorkshop/compare/v0.4.0...v0.4.1
[0.5.0]: https://github.com/ubitux/ShaderWorkshop/compare/v0.4.1...v0.5.0
