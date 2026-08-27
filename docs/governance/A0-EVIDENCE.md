# A0 Evidence

Gate state: **Not yet satisfied**.

Required evidence before PASS:

- generator authority-policy tests pass;
- generated drift is clean;
- CONTROL ACCEPT generated schema shows no required TLVs;
- WebSocket pre-identify conformance expects `INVALID_STATE`;
- `framed-binary` required cases contain no `stream.*` cases;
- full repository validation workflow passes on the A0 pull request.
