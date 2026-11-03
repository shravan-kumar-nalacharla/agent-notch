# Upstream file map

The matrix links all 64 capabilities to pinned source. Directly inspected documents and implementation excerpts:

- README.md — SHA256 d39a4c2eaed2eb683a2db1f4e61a82619c5666a2f3f1a83526593eb8fbe9e0b6
- docs/features.md — SHA256 4083bb38fc14632585c76fd7ca5aaeaa657c920473d6cf22b0b84bbd11d8c8e7
- docs/notices.md — SHA256 1d38d4afb0c4cfca28ca0ac8e590b0e43da2b2fa907640676adc247f4131570f
- docs/plugins.md — SHA256 114816e280f9c08fc3340630f5a400625d68a8d3ebf59c337f4add1849f503f9
- docs/themes.md — SHA256 269f74ab89fdaf292d9b64a3fa703ff52f1614631f1e82891b7476390f2463b9
- docs/releases/v0.3.3.md — SHA256 dcf411afce48ca14e9d32ffc6bb1121a1ab48ec3a73a3044cb64593197eb1059
- PRIVACY.md — SHA256 a7fc748482fa7399cd33eed963285c28aae2a4f325055010750e760ccfb0ee73
- LICENSE — SHA256 230184f60bae2feaf244f10a8bac053c8ff33a183bcc365b4d8b876d2b7f4809
- package.json — SHA256 7d9ac50714f1ed4f9e1f02b4fd4a3e3bac77912d3036a4c0537c4ff50395bc92
- src-tauri/Cargo.toml — SHA256 16784dc8a2052969180162b29b4abc066c5fe1bbf6780af63dba1e75ae3303c2
- src-tauri/tauri.conf.json — SHA256 8809eaa6c915e548018654a004d69dd8c3ce276f387ba901dee1c9fba38e7b16
- .github/workflows/release.yml — SHA256 349f50b850dfc86d8906595af4ecd00efcd293024553e93c4fd01f5f08f47161
- src-tauri/src/media.rs — SHA256 e36cb877d0faba32d71720d24d0f63cbaa1f3be9853ae069c7aae1f8d28bc5af
- src-tauri/src/lyrics.rs — SHA256 94d565835a6c03d069c9c96ab911457f2ca0be7cd65deba47e39998f3fcf8fa4
- src-tauri/src/display.rs — SHA256 b038a62844dd3875c6f55b55c345876855c0c113769057be7c7cf225a79a1168
- src-tauri/src/screen_policy.rs — SHA256 5aecbb80ea77d6ffe3475c8732c5fa43972c3d7ceb0dcff27bf2a622d7da3459
- src-tauri/src/hit_test.rs — SHA256 c803af8cb23378dff74b0029eecbabf6498f19e8342281d6011ef302ccb1b4cc
- src-tauri/src/plugins.rs — SHA256 36f34753e2fcbb077b6e48f88471fb832bcf8221d9fbbd76aaf40531e0ef67c8
- src-tauri/src/terminal.rs — SHA256 14eb3716675b872be184e0edb7aa7e1319b560b62d8ba5e6118acc11217cd339
- src-tauri/src/notices.rs — SHA256 b6bba10aa681a3c92ff90bb98fd8b56d9e34faa437b264331839f37fec3d4c98

Hashes identify the reference, not test coverage. Additional feature-specific code is inspected as each implementation phase begins. No upstream code is imported.

Additional phase-two behavior excerpts reviewed (reference only; no copied source):

- src/features/convert/units.tsx — SHA256 88bfb6e531e50ef6ac8a230ddbf8dde4ae0d1abd5d547f1ebeaf0a5644cc50cc
- src/features/convert/fx.ts — SHA256 25dfd7112c7164552082e1fc7b261a429a0848122a1dde25aded60fc5e4a7794
- src/features/convert/currency.tsx — SHA256 d8ac3922b17a93607833df527ac3af82f68902385f40e5a69444b69865f6b42d
- src/features/scratchpad/ScratchpadView.tsx — SHA256 a26df62fc4aec7ff9317ea5b53de5140c40fe8c2465648c79a3ee6d3a1940587
- src/features/launcher/apps.ts — SHA256 ea541e8a4a0e3958cc47174e2036c5f45f8fe508a6f70caffbf59ee5d5b0448d
- src-tauri/src/convert.rs — SHA256 730c193a8b5536684b5e603aa4b267caf4023a2c0b32eaa22b52a6a0c1be5d01
- src-tauri/src/power.rs — SHA256 0bf18f4d202ebf2114c0c5a5c529677434ebb851efd3e26644326377b8c5afdb
- src-tauri/src/capture/shot.rs — SHA256 76d443e7d4f284efb2a482e05075868e5bb33c791715968396d90158e01f4b5d
- src-tauri/src/capture/find.rs — SHA256 6b9d3942f78b5f9b3524994cec7f5bf591a0f901c56e08b2d7e0f91f6077e614
- src-tauri/src/github.rs — SHA256 dc80176867dd1b3c1f1550f81fac362498fbec413f261ec7bda9b6bf67442adb
