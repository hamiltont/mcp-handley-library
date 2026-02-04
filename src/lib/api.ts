/**
 * HTTP client for the Handley Regional Library catalog API
 * Based on reverse-engineered TLC LS2 PAC API
 */

const BASE_URL = "https://catalog.handleyregional.org";

// Required headers for all API requests
const REQUIRED_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "X-Requested-With": "XMLHttpRequest",
  "Ls2pac-config-name": "ysm",
  "Ls2pac-config-type": "pac",
};

// --- Type Definitions ---

export type SearchField =
  | "AnyField"
  | "Title"
  | "Author"
  | "Series"
  | "Subject"
  | "Note"
  | "Tag"
  | "ISBN"
  | "UPC"
  | "CallNumber";

export type SearchType = "BeginsWith" | "Contains" | "ExactMatch" | "NotContains";

export type SortCriteria = "Relevancy" | "Title" | "Author" | "PublicationDate";

export interface SearchToken {
  searchString: string;
  type: SearchType;
  field: SearchField;
}

export interface SearchTermObject {
  isAnd: boolean;
  isReadingLevel: null;
  searchTokens: SearchToken[];
}

export interface StandardNumber {
  id: number;
  type: "Isbn" | "Upc" | "Issn";
  data: string;
}

export interface HoldingsInfo {
  id: number;
  branchIdentifier: string;
  branchName: string;
  barcode: string;
  callPrefix: string | null;
  callClass: string;
  callCutter: string;
  collectionCode: string;
  collectionName: string;
  volume: string | null;
  copy: string | null;
  year: string;
  hideFromPublic: boolean;
  reserved: boolean;
}

export interface PublicationInfo {
  id: number;
  publicationDate: string;
  publicationPlace: string;
  publisherName: string;
}

export interface ImageDisplay {
  size: string;
  url: string;
}

export interface Resource {
  id: number;
  rtype: number;
  shortTitle: string;
  shortAuthor: string;
  extent: string;
  format: string;
  hostBibliographicId: string;
  downloadable: boolean;
  serial: boolean;
  standardNumbers: StandardNumber[];
  holdingsInformations: HoldingsInfo[];
  publicationInformations: PublicationInfo[];
  tags: string[];
  reviews: unknown[] | null;
  imageDisplays: ImageDisplay[];
  ratingInformation: unknown;
  acceleratedReader: unknown | null;
  lexile: unknown | null;
  publicationDate: { publicationDate: string };
}

export interface SearchResponse {
  totalHits: number;
  facetFilters: unknown[];
  resources: Resource[];
}

export interface AvailabilityItem {
  itemIdentifier: string;
  resourceId: number;
}

export interface ItemAvailability {
  resourceId: number;
  itemIdentifier: string;
  available: boolean;
  status: string;
  statusCode: string;
  dueDate: string | null;
  dueDateString: string | null;
  modStatus: string | null;
  nonCirculating: boolean;
  onOrder: boolean;
}

export interface AvailabilityResponse {
  hostSystemDiag: {
    methodSupported: boolean;
    validHostUser: null | boolean;
    validSessionUser: null | boolean;
    hostSystemFailure: null | string;
  };
  itemAvailabilities: ItemAvailability[];
}

export interface DetailValue {
  value: string;
  linkValue: string | null;
  linkType: "author" | "subject" | null;
}

export interface DetailField {
  label: string;
  detailsValues: DetailValue[];
}

export type ResourceDetailsResponse = DetailField[];

// --- API Functions ---

/**
 * Search the library catalog
 */
export async function searchCatalog(
  query: string,
  field: SearchField = "AnyField",
  limit: number = 12,
  startIndex: number = 0,
  sortCriteria: SortCriteria = "Relevancy"
): Promise<SearchResponse> {
  // Build the search term object - note it gets double-encoded as JSON string
  const searchTermObject: SearchTermObject = {
    isAnd: true,
    isReadingLevel: null,
    searchTokens: [
      {
        searchString: query,
        type: "Contains",
        field: field,
      },
    ],
  };

  const requestBody = {
    searchTerm: JSON.stringify(searchTermObject), // Double-encoded JSON
    startIndex,
    hitsPerPage: limit,
    facetFilters: [],
    branchFilters: [],
    sortCriteria,
    targetAudience: "",
    addToHistory: false,
    dbCodes: [],
    audienceCharacteristicsFilters: [],
    readingLevelFilters: null,
  };

  const response = await fetch(`${BASE_URL}/search`, {
    method: "POST",
    headers: REQUIRED_HEADERS,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<SearchResponse>;
}

/**
 * Check availability for specific items
 */
export async function checkAvailability(
  items: AvailabilityItem[]
): Promise<AvailabilityResponse> {
  const response = await fetch(`${BASE_URL}/availability`, {
    method: "POST",
    headers: REQUIRED_HEADERS,
    body: JSON.stringify(items),
  });

  if (!response.ok) {
    throw new Error(`Availability check failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<AvailabilityResponse>;
}

/**
 * Get detailed information for a resource
 */
export async function getResourceDetails(
  resourceId: number
): Promise<ResourceDetailsResponse> {
  const response = await fetch(`${BASE_URL}/resource/details/${resourceId}`, {
    method: "GET",
    headers: REQUIRED_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`Get details failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<ResourceDetailsResponse>;
}
