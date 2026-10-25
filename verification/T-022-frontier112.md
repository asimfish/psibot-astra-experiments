# T-022 — accepted frontier112 report candidate

Status: review. Candidate and evidence independently reviewed; publication not yet deployed. The isolated branch starts at the published110 content commit `3d91e28`; historical snapshots remain untouched.

The accepted-only source is112/1000:56 physical successes,56 valid physical failures and1901 completed Astra replies. All50 conditions remain below20 valid trials; no success-rate estimate, necessary-input conclusion, or causal timing claim is made. The original110 cases, environment records, cached98, infrastructure exclusions and missing wall-time nulls are retained.

| New roundtrip seed11001 condition | Actual current/history RGB | Outcome | Completed replies | Pickup attempts / retries | Episode wall / model wait |
|---|---|---|---:|---:|---:|
| minus_S | head, chest, third (3) | Valid failure; request budget exhausted,0/4 phases |60|0/0|4169.567 /3692.748 s|
| minus_third | head, chest (2); third video is audit-only | Original full4/4-phase roundtrip success |36|2/0|1927.078 /1628.530 s|

The successful original phase times are17.525,30.675,38.975 and53.625 simulation seconds: lift atA, release and withdraw atB, regrasp and lift atB, return/release/withdraw atA. These are neither model-wait nor episode-wall times. The native contact-based attempts/retry events remain unchanged, including2 attempts and0 retries; model calls and planned second grasp are not silently relabeled as retries.

Both episodes use the actual currentPRO6000 GPU1/v141 runtime stratum. Episode timing begins after SDK startup and paired-state preparation. Control/render and encode times are retained separately and overlap. The failed episode's time-to-success remains censored. The two single outcomes do not establish an input effect or spatial generalization.

Actual input0/last images and same-episode original videos remain inside the same comparison row. The6 original videos and31 root-viewed original PNGs are exact SHA-preserved copies. The removed third camera's video is clearly labeled audit-only and does not increase input-camera count. The previous delivery proofs are inherited with relative URL relocation only; no new remux, reencoding, HMAC verification, scientific video decode, model, SDK, GPU or training work ran.

Validation:36 focused data/source/path checks and18 real-Chrome checks passed. Chrome tested desktop1500 and mobile390 widths, no page overflow, two brief original-video plays/pauses, real2/3-camera cards, same-episode media, native retries, four-phase completion and all original timing fields. Five local screenshots are retained outside the public tree for root review. This is UI playback verification, not another scientific media audit.

Sources: actual112 frontier SHA `f66937461fc65dea107f2d2455acd17873fd47736ab246673193c190a63840d5`; original accepted-only append `d04af01a506dd458e8e910d70757cebf46d0b1b06552154cc04dbf809235f864`; original science/media audit `f19601a542585761fa0479c40acb4886ff47da9b5ec837d8fec45caa1e344aee`; root31-view acceptance `ad92056cc74a7912a02422d1fe0b09eb28eedcdb3ad25b00bc889bcbf40d68ee`; actual media intake `871b67ce4709dd1261c55e1bfee5d9556ac7173570f8e74ad58f23d69dfdae86`.

The separate execution repository's T-006 remains active under the root owner. Its live claim was not released or overridden. This static publication repository has no `.agent` installation. The candidate is isolated under `/tmp`, pending independent root adoption and the root's publication workflow.

Root adoption: all5 candidate Chrome screenshots actually viewed at original resolution. Independent39-item/source-evidence review passed with no blocking findings (review SHA `986757f0486cdac0db67514f6093153b591fbedfcfcbde39547aa19504082455`). Both actual112 records and all original31 selected views were reviewed before the accepted-only append. The static repository has no agentctl installation; the separate execution T-006 remains in progress, and was not marked complete to publish this bounded report update. No original scientific/HMAC/media audit was repeated.
