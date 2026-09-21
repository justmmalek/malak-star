# Stellarium Web Engine build

Upstream: https://github.com/Stellarium/stellarium-web-engine

Revision: 29870744c470ddc62fa869e153178c82a7824fa4

Copyright (c) 2022 Stellarium Labs SRL. GNU AGPL version 3.

The full upstream source is supplied in `upstream-source.tar.gz`. Extract it,
then run `python3 patch-stellarium.py` from the extracted source directory
(use the actual path to the supplied patch script).

Changes: cap canvas DPR at 2; compare backing size correctly; skip hidden or
zero-size frames; use touch client coordinates; expose an `onFrame` callback;
fix freeing the allocated object type string in createObj.

Build, with the patched source directory as the current directory:

```sh
docker run --rm -v "$PWD:/work" -w /work emscripten/emsdk:2.0.11 bash -c 'source /emsdk/emsdk_env.sh && python3 -m pip install SCons==4.1.0.post1 && emscons scons -j4 mode=release werror=0 build/stellarium-web-engine.js'
```

The exact workflow is also provided as `build-stellarium.yml`.
Application integration source is served unminified as `planetarium.mjs`,
`orientation.mjs`, `sky-view-math.mjs`, HTML and CSS and is available at
https://github.com/justmmalek/malak-star under AGPL-3.0.
User-provided audio, photos and certificate are separate media, excluded from
the application source license. Third-party libraries/data retain their licenses.
