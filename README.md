<div align="center">

# Hi 👋 I'm Durul Dalkanat

### Senior Software Engineer | Mobile Architecture Expert | 🧠 Vision Pro & Spatial Computing

<br>

[![App Store](https://img.shields.io/badge/App_Store-2_Apps_Live-0D96F6?style=for-the-badge&logo=appstore&logoColor=white)](#-live-on-the-app-store)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fabout.me%2Fdurul&style=for-the-badge&logo=safari&logoColor=white)](https://about.me/durul)
[![Stack Overflow](https://img.shields.io/stackexchange/stackoverflow/r/893872?style=for-the-badge&logo=stackoverflow&logoColor=white&color=F58025)](https://stackoverflow.com/users/893872/durul-dalkanat)
[![GitHub followers](https://img.shields.io/github/followers/durul?style=for-the-badge&logo=github&logoColor=white)](https://github.com/durul?tab=followers)

[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://instagram.com/duruldalkanat)
[![Medium](https://img.shields.io/badge/Medium-12100E?style=for-the-badge&logo=medium&logoColor=white)](https://medium.com/@duruldalkanat)
[![Profile Views](https://komarev.com/ghpvc/?username=durul&style=for-the-badge&color=blueviolet)](https://github.com/durul)

</div>

---

## 📱 Live on the App Store

Two apps I built and shipped under my own Apple developer account: one for iPhone and Apple Watch, one for Apple Vision Pro.

### SynoPosture · iPhone + Apple Watch

<a href="https://apps.apple.com/us/app/synoposture/id6747050863">
  <img src="./assets/apps/synoposture-card.svg" alt="SynoPosture, live on the App Store for iPhone and Apple Watch: 25 Hz AirPods motion stream, 8 languages, Swift 6 strict concurrency, 100 ms Live Activity updates" width="100%"/>
</a>

**Neck strain builds quietly during long desk sessions. SynoPosture turns the motion sensors already inside your AirPods into a real-time posture coach**, and nudges you on your iPhone, Lock Screen, Dynamic Island, or with a haptic tap on your wrist when your head stays down too long.

<p align="center">
  <img src="./assets/apps/synoposture-screen-1.jpg" alt="SynoPosture screenshot: live head angle, sensitivity and timer dials showing good posture" width="24%"/>
  &nbsp;
  <img src="./assets/apps/synoposture-screen-2.jpg" alt="SynoPosture screenshot: head-down alert turning the dial red" width="24%"/>
  &nbsp;
  <img src="./assets/apps/synoposture-screen-3.jpg" alt="SynoPosture screenshot: works with AirPods, AirPods Pro, AirPods Max and Powerbeats Pro" width="24%"/>
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/synoposture/id6747050863"><img src="./assets/apps/download-on-the-app-store.svg" alt="Download SynoPosture on the App Store" height="54"/></a>
  <br>
  <sub><b>App Store id6747050863</b> · Released April 2026 · v1.0 (build 35) · Health &amp; Fitness</sub>
  <br>
  <sub>iOS 26+ · Works with AirPods Pro, AirPods Max &amp; Powerbeats Pro · Apple Watch app optional</sub>
</p>

**Under the hood**

- 🎧 **Real-time motion pipeline**: an AirPods gyroscope and IMU pipeline streams pitch, roll, yaw, and accelerometer data at 25 Hz, runs on-device classification with dynamic head-down threshold calibration, and drives a 3D head visualization that mirrors the live sensor stream.
- ⌚ **Apple Watch companion**: posture state syncs over a multi-channel WatchConnectivity pipeline, with 3-second cooldown flood protection on iPhone, 30–60-second freshness validation on Watch, a live on-Watch display, and haptic alerts.
- 🩺 **Crash diagnosis**: traced a recurring crash on Apple Watch reachability flips and retired the real-time `sendMessage` channel in favor of deferred `updateApplicationContext` and `transferUserInfo` delivery.
- ⚡ **Swift 6**: full strict-concurrency migration across all targets.
- 🏝️ **Live Activities & Dynamic Island**: 100 ms update precision with background continuity.
- ♿ **Accessibility in 8 languages**: end-to-end Apple HIG accessibility, including VoiceOver, Dynamic Type across the full range with adaptive layout switching, high contrast, button shapes, Reduce Motion, and custom accessibility actions, in English, Turkish, German, French, Spanish, Arabic, Japanese, and Korean.

### StratoSync · Apple Vision Pro

<a href="https://apps.apple.com/us/app/stratosync/id6747596499">
  <img src="./assets/apps/stratosync-card.svg" alt="StratoSync, live on the App Store for Apple Vision Pro: three GPU-computed skies, live ISS telemetry, real solar-position lighting, Apple Pencil and Logitech Muse stylus drawing" width="100%"/>
</a>

**Most immersive apps load their surroundings. StratoSync computes them.** The sky is generated on the GPU every display refresh, the sunlight comes from the real solar position, and live ISS telemetry moves through the scene, which you can observe, manipulate, share, and understand spatially.

<p align="center">
  <img src="./assets/apps/stratosync-aurora.jpg" alt="StratoSync on Apple Vision Pro: the Aurora environment around Earth, the ISS orbit and the ISS Tracker panel" width="32%"/>
  <img src="./assets/apps/stratosync-star-nest.jpg" alt="StratoSync on Apple Vision Pro: the Star Nest environment with Earth, ISS telemetry and scene controls" width="32%"/>
  <img src="./assets/apps/stratosync-dusty-nebula.jpg" alt="StratoSync on Apple Vision Pro: the Dusty Nebula environment glowing behind Earth" width="32%"/>
  <br>
  <sub><i>Aurora · Star Nest · Dusty Nebula: generated by Metal compute kernels at runtime, not loaded from images</i></sub>
</p>

<p align="center">
  <a href="https://apps.apple.com/us/app/stratosync/id6747596499"><img src="./assets/apps/download-on-the-app-store.svg" alt="Download StratoSync on the App Store" height="54"/></a>
  <br>
  <sub><b>App Store id6747596499</b> · Released September 2026 · v2.1 · Education · visionOS 26+ · Apple Vision Pro · Free</sub>
</p>

**Under the hood**

- 🌌 **Computed, not loaded**: three environments (Aurora, Star Nest, and Dusty Nebula) are generated by Metal compute kernels at runtime instead of shipping as sky images.
- ☀️ **Real sunlight**: Earth is lit from the Sun's current position, so the day/night terminator matches the moment you are in.
- 🛰️ **Live ISS**: real telemetry moves the station through the scene, and you can grab, scale, and inspect it in 3D.
- ✍️ **Spatial drawing**: Apple Pencil and Logitech Muse stylus support for 3D drawing, with scale compensation in immersive space.
- 🌗 **Mixed & full immersion**: synchronized state across both modes, plus SharePlay for exploring together.

> ⭐ **Tried one of them?** A rating or review on the App Store helps an independent developer get discovered.

---

## 📊 GitHub Stats

<div align="center">

<img src="./github-stats.svg" alt="GitHub Stats" height="180"/>
<img src="./github-top-langs.svg" alt="Top Languages" height="180"/>

</div>

---

## 🌍 Open Source Contributions

I contribute across Apple platforms, visionOS, Swift, developer tooling, AI/ML infrastructure, spatial computing, and documentation-heavy open source projects.

### Notable external contributions

| Project                                                                                                           | Area                                    | Contribution                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [SouthwestAir/Vision-Pro-Blender-Live-Streamer](https://github.com/SouthwestAir/Vision-Pro-Blender-Live-Streamer) | visionOS / Blender streaming            | UI, README, status throttling, and AppModel refactors                                                                                                                                                                                                                                         |
| [NVIDIA/NemoClaw](https://github.com/NVIDIA/NemoClaw)                                                             | CLI / sandbox diagnostics               | Merged [PR #2848](https://github.com/NVIDIA/NemoClaw/pull/2848) into NVIDIA's `main`: added the `nemoclaw <name> doctor` CLI command — health checks for sandbox, gateway, inference, messaging, Ollama & cloudflared, with CLI implementation, docs, tests & JSON output                     |
| [kennss/SiliconScope](https://github.com/kennss/SiliconScope)                                                     | **Metal / GPU** · Apple Silicon · Swift | Named the project; shipped the AI-workload bottleneck classifier that emits the **`"LLM (GPU/Metal)"`** engine verdict (Metal/GPU-compute vs ANE/CoreML attribution), plus GPU throttle detection & a compact GPU menu-bar mode (merged); added a no-notarization local `.app` bundle builder |
| [Simbastack-hq/framedex](https://github.com/Simbastack-hq/framedex)                                               | Apple Photos / CLI / media indexing     | Added `fdx-photos` for indexing videos directly from an Apple Photos library                                                                                                                                                                                                                  |
| [tddworks/SkillsManager](https://github.com/tddworks/SkillsManager)                                               | Swift / macOS tooling / security        | Added local `.app` build script and fixed symlink traversal risk                                                                                                                                                                                                                              |
| [vlr-code/dictly](https://github.com/vlr-code/dictly)                                                             | macOS / audio / accessibility           | Added diagnostics, fixed audio device rebinding, improved hotkey recording                                                                                                                                                                                                                    |
| [Jaennaet/pISSStream](https://github.com/Jaennaet/pISSStream)                                                     | visionOS / immersive UI                 | Added visionOS support and immersive experience improvements                                                                                                                                                                                                                                  |
| [nv-tlabs/lyra](https://github.com/nv-tlabs/lyra)                                                                 | AI / ML infrastructure                  | Added RunPod Lyra-2 installation runbook                                                                                                                                                                                                                                                      |
| [LaurieWired/Malimite](https://github.com/LaurieWired/Malimite)                                                   | Reverse engineering tooling docs        | Expanded README with architecture and usage details                                                                                                                                                                                                                                           |

<details>
<summary>More external projects I have contributed to</summary>

<br>

- [tddworks/baguette](https://github.com/tddworks/baguette)
- [TomBadash/Mouser](https://github.com/TomBadash/Mouser)
- [saulsharma/netflix-ui](https://github.com/saulsharma/netflix-ui)
- [khaled-0/Syncara](https://github.com/khaled-0/Syncara)
- [Safal-Shrestha-SS/audio_transcribe](https://github.com/Safal-Shrestha-SS/audio_transcribe)
- [JakeLin/SwiftLanguageWeather](https://github.com/JakeLin/SwiftLanguageWeather)

</details>

## 🐞 Bug Reports Filed Upstream

Platform and tooling bugs I have hit, reduced to a reproducible case, and reported to the vendor, or backed with diagnostic data and design input on existing reports.

| Vendor          | Report                                                                                                                                                                                                                 | Area              | Summary                                                                                                                                     | Filed    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Apple           | `FB25367817`                                                                                                                                                                                                           | Foundation Models | `SystemLanguageModel` reports an unsupported device language as `.modelNotReady`, so apps show a download message instead of a language fix | Oct 2026 |
| Apple           | `FB25367740`                                                                                                                                                                                                           | Foundation Models | `foundation-models-utilities`: the model can still deactivate a `Skill(allowsDeactivation: false)`, even with `strictSchema: true`          | Oct 2026 |
| Apple           | `FB24900015`                                                                                                                                                                                                           | ScreenCaptureKit  | In-app capture (`presentPickerForCurrentApplication`) fails with `RPRecordingErrorDomain -5807` when the app has more than one window open  | Sep 2026 |
| Apple           | `FB22814526`                                                                                                                                                                                                           | ARKit             | `ARWorldTrackingConfiguration` emits `AREnvironmentProbeAnchor` even when `environmentTexturing = .none` (iOS 26.5, iPhone 17 Pro)          | May 2026 |
| Google Research | [harness2#5](https://github.com/google-research/harness2/issues/5#issuecomment-6274854482) <br> ![status](https://img.shields.io/github/issues/detail/state/google-research/harness2/5?style=flat-square&label=status) | Agent harness     | Design input on a `--bench local` proposal: clean copy per rollout, verify by real build/test exit status, keep grades out of agent context | Oct 2026 |
| oMLX            | [omlx#1835](https://github.com/jundot/omlx/issues/1835#issuecomment-6022541666) <br> ![status](https://img.shields.io/github/issues/detail/state/jundot/omlx/1835?style=flat-square&label=status)                      | MLX / macOS 27    | Added a data point: on macOS 27 (M5 Pro), MLX *and* llama.cpp decode dropped 10–20× even at short context, until a reboot                   | Oct 2026 |
| OpenAI          | [codex#34031](https://github.com/openai/codex/issues/34031) <br> ![status](https://img.shields.io/github/issues/detail/state/openai/codex/34031?style=flat-square&label=status)                                        | Codex app         | GPT-5.6 missing from the ChatGPT Classic model picker after the 1.2026.184 update                                                           | Jul 2026 |

> **Seeing the same bug?** For Apple, file your own report in [Feedback Assistant](https://feedbackassistant.apple.com/) and mention the FB number. For GitHub issues, add a 👍. Duplicate reports raise a bug's priority.

## 🔥 Contribution Streak

<div align="center">

<img src="./github-streak.svg" alt="GitHub Streak"/>

</div>

---

## 📈 Activity Graph

<div align="center">

<img src="./github-activity.svg" alt="Contribution Graph"/>

</div>

---

## 🏆 GitHub Trophies

<div align="center">

<img src="./github-trophies.svg" alt="GitHub Trophies"/>

</div>

---

## 📊 Detailed Metrics

<div align="center">

<img src="https://raw.githubusercontent.com/durul/durul/main/github-metrics.svg" alt="GitHub Metrics"/>

</div>

---

<div align="center">

[![](https://visitcount.itsvg.in/api?id=durul&icon=1&color=1)](https://visitcount.itsvg.in)

</div>
