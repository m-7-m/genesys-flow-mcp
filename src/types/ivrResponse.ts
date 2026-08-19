export interface DomainEntityRef {
  id: string;
  name: string;
  selfUri: string;
}

export interface RoutingEntity {
  id: string;
  name: string;
  division: DomainEntityRef;
  description: string;
  version: number;
  dateCreated: string;
  dateModified: string;
  modifiedBy: string;
  createdBy: string;
  state: string;
  modifiedByApp: string;
  createdByApp: string;
  dnis: string[];
  openHoursFlow?: DomainEntityRef;
  closedHoursFlow?: DomainEntityRef;
  holidayHoursFlow?: DomainEntityRef;
  scheduleGroup?: DomainEntityRef;
  selfUri: string;
}

export interface IvrResponse {
  entities: RoutingEntity[];
  pageSize: number;
  pageNumber: number;
  total: number;
  totalNumberOfEntities: number;
  firstUri: string;
  nextUri?: string;
  previousUri?: string;
  lastUri: string;
  selfUri: string;
  pageCount: number;
}
