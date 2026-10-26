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
as identity. General multi-control snapshots/events/logs contain no credentials.
Explicit PIN queries and dedicated PIN events follow the credential channel below. Do not infer cancellation from ordinary connection teardown.

AirPlay rename is discovery-only and must preserve live media and reader lifetime.
The old name getter/setter use displayName and truthful publishState. Password
protection, capacity and protocol switches remain startup-only for this profile.
No implicit software restart, fixed-PIN setter or receiver persistence is added.

## Current usable code query and notification (2026-10-27 correction)

The existing cast.getPinCodeConfig, cast.pinCodeChanged and cast.pinCodeRequired
IDs are preserved. Optional protocol selects airplay (legacy default) or webcast.
includeSecret=true is canonical; includeSensitive=true remains a supported alias.
Default queries omit plaintext. Legacy cast.getStatus(includeSensitive=true) may
include its AirPlay pinCode section; unifiedControl/airplay/webcastBackend state
and events remain secret-free, even with includeSensitive.

AirPlay returns live challenges with exact attemptId/challengeId/displayRequestId
uint64 decimal strings. Optional attemptId narrows the query. A top-level pinCode
is present only for exactly one active challenge. Consumption, replacement and
expiry clear the matching challenge and publish pinCodeChanged; every display
occurrence publishes pinCodeRequired. UI display leases do not expire a credential.
Transport loss is not proof of cancel, and must not rotate a retained password.

WebCast returns only the currently selected ready backend's code for new joins.
backend is cloud/local/none. Retained old-backend peers do not select the code.
Code rotation, availability loss/restoration, or backend switch publishes
pinCodeChanged with config.protocol=webcast, including a clear hasPinCode=false
when unavailable. No stale fallback code may be returned. Stop/start has no replay.

Dedicated PIN events may contain plaintext, carry redactionRequired=true and must
be redacted in diagnostic traffic, copy/export and persistent logs. An explicit
credential display may show the value in memory. Reconnect queries authoritative
current state; event delivery alone is not a durable credential history.
