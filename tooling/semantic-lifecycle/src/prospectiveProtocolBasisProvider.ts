import type { AdoptedProtocolBasis } from "./model.js";

export interface ProspectiveProtocolBasisProvider { readProspectiveProtocolBasis(): AdoptedProtocolBasis; }
export class StaticProspectiveProtocolBasisProvider implements ProspectiveProtocolBasisProvider {
  constructor(private readonly value: AdoptedProtocolBasis) {}
  readProspectiveProtocolBasis(): AdoptedProtocolBasis { return structuredClone(this.value); }
}
