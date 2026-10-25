# T-021 — Astra input report frontier 110

Status: review. Root adopted and independently reviewed the prepared candidate; push, merge and live Pages verification remain pending at this commit. Parent T-006 remains in progress.

## Evidence and interpretation

The accepted-only frontier is 110 / 1000: 55 successes, 55 valid physical failures and 1805 completed model replies. Every registered condition remains below 20 valid attempts. Success rates and causal input conclusions remain unavailable. Historical 108 cases, runtime strata, cached98 and missing wall-clock values are preserved; historical media references change only by relative URL relocation.

The two new registered PsiBot single-transfer A→B cases use seed 11006. Both are valid geometric failures under the original two-phase safety oracle, with one pickup attempt and zero pickup retries. This metric is separate from the four-phase roundtrip metric.

| Input condition | Actual current RGB cameras | Completed replies | Episode wall / model wait | Result |
|---|---|---:|---:|---|
| minus_third | head, chest (2); third video is result-only | 8 | 477.0939 / 413.0718 s | Valid physical failure |
| minus_S | head, chest, third (3); measured robot-base/end-effector pose and available opening omitted | 19 | 1051.2608 / 904.3111 s | Valid physical failure |

S denotes measured robot state, not scene-object state; M remains textual memory. Both cases retain the original frozen five-gesture library with bounded refinement. Input images and same-episode original videos stay adjacent in each case row. Failure times are censored, not time to success. Episode timing starts after SDK startup and pair preparation; no setup duration was added. These two cases use the actual PRO6000 GPU1/v139 runtime stratum with no reader control, and are not cross-hardware causal comparisons.

The separate v139 H interruption contains four signed pairs (three completed, one failed), with all costs retained and no valid physical outcome credited. Eight never-started conditions are not failures. No success or offset reuse is inferred from this interruption.

## Local validation

- 31 focused data/path/actual-JS checks passed; this was not a rerun of the previous 39/36 suites.
- 21 focused real-Chrome checks passed at desktop 1500 px and mobile 390 px, including exact 2/3-camera inputs, same-episode videos, S semantics, original timing/runtime labels, two brief original head-video plays and no horizontal overflow.
- Four final screenshots were captured after the videos loaded and paused. The earlier pre-play screenshot run is retained separately and is not the final screenshot evidence.
- The 34 new media files (28 original PNG and 6 original MP4) are exact approved copies. Existing full-video, signed-policy and original-image visual acceptance are inherited; no HMAC, full video decoding, model, SDK, GPU or training work was repeated.
- Original 108 CSS is byte-identical; original 27 playback-delivery proofs are retained. CSV retains timing-availability columns.

## Precise sources

- Accepted frontier 110: `9e800490a879054cdfbd72fe3c17860d6e491dd32019e5b4e52fc6781fd399b9`.
- Actual accepted-only append: `fc4e17fad92ccbd6789efbe3d858b9598009267a309230b349c2ac7f8528139c`.
- Original science/media audit: `88fe8356aa2927fe83ec8a3694f07091be1e11f0a8ade17baf233b940fc1c302`.
- Root actual 28-original-image acceptance: `c6bd7118b4d70a540e0df192f2a3b2591cf73e10fd47671da72d88b2e01e12aa`.
- Focused static report: `ff554ccb3e1440360bf39f6d111488fe45df53cfe6d72fbe4d085117c3fd4929`.
- Final focused browser report: `edea4df8824e5d18a6f0943249911a51329d8e5e70dfbd709d7db464aa6ef3f6`.

Intended publication base is the exact merged frontier108 commit `5ec88a97dc287ec6077d1fdcee91e6ccfdca984b`; its tree must match prepared108 tree `161ad6ff0cf6d2074cae2fba5cdb7419f9811a50`. Adoption is limited to a new frontier110 snapshot, this verification record, and the root latest links. All earlier snapshot directories remain untouched.

Root checked every public-file hash and reviewed the four final original desktop/mobile screenshots. Actual inputs and same-episode video remain adjacent; physical failures, pickup retries, reply counts and model-wait times remain distinct. The 45-file staged secret/private-path scan and whitespace check passed. The adopting root source and media review author is independent of the report builder. No n20 cohort or overall task completion is claimed.
