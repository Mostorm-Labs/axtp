# Cast control refresh (unpublished local development)

Adopted by explicit NearCast user acceptance on 2026-10-24. This replaces the
unpublished Layout/entry semantics in 45/46/48; no published release lock changes.
layoutMode is grid/presentation. contentAdaptation is fixed/auto-fit, independent
of layout and native fullscreen. presentationEnabled is removed. display values
are sidebar/grid/focus; meeting.view is omitted in Grid. Primary selection is
automatic/manual inside Presentation only. Complete source withdrawal returns
to Grid. Grid is not a view. presentationGridOnDoubleClick replaces the former
Split-named setting. NearCast defaults Grid, Auto-fit, Automatic primary selection.

Untargeted legacy stopSession stops all connections existing at its finite owner
execution boundary, including authentication and data-only sharing requests.
It does not disable receivers or suppress genuinely later joins. An explicit
session selector never stops another session. Acceptance is not cleanup proof.
Untargeted setMuted is an independent global output gate that covers future
admissions and preserves per-session selection. Targeted audio keeps exact owner
validation. No input/readiness is not evidence of explicit mute.

Legacy lifecycle notifications are aggregate compatibility projections: the first
presentation starts the receiver, the last withdrawal stops it; an individual
failure/stop must not falsify the other presentations. New multi-session events
remain per-source and atomic. AirPlay authentication identities are distinct from
media sessions. Repeated password prompts use displayRequestId, never the secret
as identity. Codes stay in local UI; general snapshots/events/logs contain no
credentials. Do not infer cancellation from ordinary connection teardown.

AirPlay rename is discovery-only and must preserve live media and reader lifetime.
The old name getter/setter use displayName and truthful publishState. Password
protection, capacity and protocol switches remain startup-only for this profile.
No implicit software restart, fixed-PIN setter or receiver persistence is added.
