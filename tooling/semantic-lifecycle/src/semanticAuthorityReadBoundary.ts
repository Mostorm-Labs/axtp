import type { ImmutableRevisionRef, CanonicalJsonValue } from "./model.js";

export interface SemanticAuthorityReadBoundary { read(authorityRef: ImmutableRevisionRef): { authorityRef: ImmutableRevisionRef; payload: CanonicalJsonValue } | undefined; }
