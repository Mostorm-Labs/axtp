import type { AssessmentFreshnessBoundary } from "./assessmentFreshnessBoundary.js";
import { GitRegistryProtocolAuthorityMutationPort } from "./gitRegistryProtocolAuthorityMutationPort.js";
import { ProtocolAdoptionGuard, ProtocolAdoptionRoute } from "./protocolAdoptionGuard.js";
import type { ProtocolAdoptionControlRepository } from "./protocolAdoptionControlRepository.js";
import { RegistryProspectiveProtocolBasisProvider } from "./registryProspectiveProtocolBasisProvider.js";
import type { SemanticAuthorityReadBoundary } from "./semanticAuthorityReadBoundary.js";

export interface ProductionProtocolAdoptionRuntimeOptions {
  readonly repositoryPath: string;
  readonly targetRef: string;
  readonly control: ProtocolAdoptionControlRepository;
  readonly assessments: AssessmentFreshnessBoundary;
  readonly semanticAuthorities: SemanticAuthorityReadBoundary;
}

export interface ProductionProtocolAdoptionRuntime {
  readonly protocolAdoption: ProtocolAdoptionRoute;
  readonly prospectiveRegistry: RegistryProspectiveProtocolBasisProvider;
}

/**
 * The sole production composition root for Protocol adoption. The concrete Git
 * writer is captured by Guard and is never returned to workflow callers.
 */
export function createProductionProtocolAdoptionRuntime(options: ProductionProtocolAdoptionRuntimeOptions): ProductionProtocolAdoptionRuntime {
  const prospectiveRegistry = new RegistryProspectiveProtocolBasisProvider(options.repositoryPath);
  const protocolAuthority = new GitRegistryProtocolAuthorityMutationPort({ repositoryPath: options.repositoryPath, targetRef: options.targetRef });
  const dependencies = { control: options.control, assessments: options.assessments, prospective: prospectiveRegistry, semanticAuthorities: options.semanticAuthorities };
  const guard = new ProtocolAdoptionGuard({ ...dependencies, protocolAuthority });
  const protocolAdoption = new ProtocolAdoptionRoute({ ...dependencies, guard });
  return Object.freeze({ protocolAdoption, prospectiveRegistry });
}
