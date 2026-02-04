# TLC LS2 PAC API Documentation

> **Library:** Handley Regional Library System (Winchester, Virginia)  
> **Catalog URL:** https://catalog.handleyregional.org  
> **Documentation Date:** January 2026  
> **Status:** Reverse-engineered, unofficial

---

## Executive Summary

### How This Documentation Was Created

This API documentation was created through **reverse engineering** the web interface of the Handley Regional Library's online catalog. By inspecting network requests in browser developer tools while using the catalog, we captured the HTTP requests and responses that power the LS2 PAC (Public Access Catalog) web application.

### What This API Is

- **A proprietary JSON-over-HTTP API** used internally by TLC's LS2 PAC web application
- **Not a public API** — there is no official documentation; this is undocumented internal functionality
- **Spring Framework backend** (evidenced by session cookie naming conventions)
- **JavaScript SPA frontend** that communicates via AJAX/XHR requests

### What This API Is NOT

| Protocol | Status | Notes |
|----------|--------|-------|
| **Z39.50** | ❌ Not exposed | Standard library protocol; TLC supports it but not publicly accessible for this library |
| **SRU/SRW** | ❌ Not found | Modern REST-like successor to Z39.50; no evidence of public endpoint |
| **OAI-PMH** | ❌ Not found | Metadata harvesting protocol; not detected |
| **NCIP/SIP2** | ❌ Not applicable | Circulation protocols (check-in/out); would require authentication |
| **OpenSearch** | ❌ Not implemented | Standardized search protocol; not detected |

### Stability & Usage Considerations

⚠️ **This is an internal API that could change without notice.** TLC may modify endpoints, request formats, or authentication requirements in any software update. Use at your own risk for personal projects.

---

## Terminology

| Term | Definition | Confidence |
|------|------------|------------|
| **Resource** | A bibliographic record representing a single work (book, DVD, etc.). Has a unique numeric `id`. | ✅ High |
| **resourceId** | The unique numeric identifier for a resource/bibliographic record | ✅ High |
| **Item** | A physical copy of a resource. One resource can have multiple items (copies) across branches. | ✅ High |
| **itemIdentifier** | Barcode number of a physical item (e.g., `"39925003470542"`) | ✅ High |
| **Branch** | A library location (e.g., "Bowman", "Handley", "Clarke County") | ✅ High |
| **branchIdentifier** | Numeric ID for a branch (e.g., `"2"` = Bowman) | ✅ High |
| **Holdings** | Information about physical copies: location, call number, barcode | ✅ High |
| **Collection** | A categorization within a branch (e.g., "Adult Non-Fiction", "Biography") | ✅ High |
| **collectionCode** | Short code for collection (e.g., `"NF"`, `"BIO"`) | ✅ High |
| **config / Ls2pac-config-name** | Library-specific configuration identifier. For Handley: `"ysm"` | ⚠️ Medium |
| **hostBibliographicId** | 🔍 *Needs research* — appears to be an internal/legacy ID, different from `id` | ❓ Low |
| **rtype** | 🔍 *Needs research* — resource type indicator? Always `1` in observed data | ❓ Low |
| **facetFilters** | Search refinement filters (format, branch, audience, etc.) | ⚠️ Medium |
| **searchTokens** | Individual search criteria within an advanced search | ✅ High |

---

## Required HTTP Headers

All API requests require these headers:

```http
Content-Type: application/json; charset=UTF-8
Accept: application/json, text/javascript, */*; q=0.01
X-Requested-With: XMLHttpRequest
Ls2pac-config-name: ysm
Ls2pac-config-type: pac
```

### Header Notes

| Header | Required | Purpose |
|--------|----------|---------|
| `Ls2pac-config-name` | ✅ Yes | Identifies the library configuration. `ysm` for Handley Regional. |
| `Ls2pac-config-type` | ✅ Yes | Always `pac` for public access catalog |
| `X-Requested-With` | ⚠️ Likely | Standard AJAX marker; server may reject without it |
| `Cookie` (JSESSIONID) | ❓ Unknown | May be required for session tracking; needs testing |

---

## API Endpoints

### 1. Search Catalog

**Endpoint:** `POST /search`

**Purpose:** Search the library catalog with simple or advanced queries.

#### Request Schema

```typescript
interface SearchRequest {
  searchTerm: string;           // JSON-encoded SearchTermObject (see below)
  startIndex: number;           // Pagination offset (0-based)
  hitsPerPage: number;          // Results per page (typically 12)
  facetFilters: FacetFilter[];  // Refinement filters (empty array if none)
  branchFilters: string[];      // Limit to specific branches
  sortCriteria: SortCriteria;   // Sort order
  targetAudience: string;       // Audience filter (empty string if none)
  addToHistory: boolean;        // Add to user's search history
  dbCodes: string[];            // Database codes (empty array typically)
  audienceCharacteristicsFilters: string[];
  readingLevelFilters: null | ReadingLevelFilter;
}

// The searchTerm value is a JSON STRING containing this object:
interface SearchTermObject {
  isAnd: boolean;               // true = AND logic, false = OR logic
  isReadingLevel: null | boolean;
  searchTokens: SearchToken[];
}

interface SearchToken {
  searchString: string;         // The search text
  type: SearchType;             // Match type
  field: SearchField;           // Field to search
}

type SearchType = "BeginsWith" | "Contains" | "ExactMatch" | "NotContains";

type SearchField = 
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

type SortCriteria = "Relevancy" | "Title" | "Author" | "PublicationDate";
// Note: Other sort options may exist
```

#### Response Schema

```typescript
interface SearchResponse {
  totalHits: number;
  facetFilters: FacetFilter[];  // Available refinement options
  resources: Resource[];
}

interface Resource {
  id: number;                   // Unique resource ID
  rtype: number;                // Resource type (observed: 1)
  shortTitle: string;
  shortAuthor: string;
  extent: string;               // Physical description (e.g., "288 p. ;")
  format: string;               // "Book", "DVD", etc.
  hostBibliographicId: string;
  downloadable: boolean;
  serial: boolean;
  standardNumbers: StandardNumber[];
  holdingsInformations: HoldingsInfo[];
  publicationInformations: PublicationInfo[];
  tags: string[];
  reviews: null | Review[];
  imageDisplays: ImageDisplay[];
  ratingInformation: RatingInfo;
  acceleratedReader: ARInfo | null;
  lexile: LexileInfo | null;
  publicationDate: { publicationDate: string };
}

interface StandardNumber {
  id: number;
  type: "Isbn" | "Upc" | "Issn";  // Other types may exist
  data: string;
}

interface HoldingsInfo {
  id: number;
  branchIdentifier: string;
  branchName: string;
  barcode: string;
  callPrefix: string | null;
  callClass: string;            // e.g., "814.54" or "B"
  callCutter: string;           // e.g., "Qui" or "Quindlen"
  collectionCode: string;
  collectionName: string;
  volume: string | null;
  copy: string | null;
  year: string;
  hideFromPublic: boolean;
  reserved: boolean;
}

interface PublicationInfo {
  id: number;
  publicationDate: string;
  publicationPlace: string;
  publisherName: string;
}
```

#### Example: Simple Title Search

```bash
curl -X POST 'https://catalog.handleyregional.org/search?_=1769123245572' \
  -H 'Content-Type: application/json; charset=UTF-8' \
  -H 'Accept: application/json' \
  -H 'X-Requested-With: XMLHttpRequest' \
  -H 'Ls2pac-config-name: ysm' \
  -H 'Ls2pac-config-type: pac' \
  --data-raw '{
    "searchTerm": "{\"isAnd\":true,\"isReadingLevel\":null,\"searchTokens\":[{\"searchString\":\"quindlen\",\"type\":\"Contains\",\"field\":\"Author\"}]}",
    "startIndex": 0,
    "hitsPerPage": 12,
    "facetFilters": [],
    "branchFilters": [],
    "sortCriteria": "Relevancy",
    "targetAudience": "",
    "addToHistory": false,
    "dbCodes": [],
    "audienceCharacteristicsFilters": [],
    "readingLevelFilters": null
  }'
```

**Response (truncated):**
```json
{
  "totalHits": 730,
  "facetFilters": [],
  "resources": [
    {
      "id": 2650073,
      "shortTitle": "Loud and clear",
      "shortAuthor": "Quindlen, Anna.",
      "format": "Book",
      "holdingsInformations": [
        {
          "branchName": "Bowman",
          "barcode": "39925003470542",
          "callClass": "814.54",
          "collectionName": "Adult Non-Fiction"
        }
      ],
      "standardNumbers": [
        { "type": "Isbn", "data": "9781400061129" }
      ]
    }
  ]
}
```

#### Example: Advanced Search (Title AND Author)

```bash
curl -X POST 'https://catalog.handleyregional.org/search' \
  -H 'Content-Type: application/json; charset=UTF-8' \
  -H 'Ls2pac-config-name: ysm' \
  -H 'Ls2pac-config-type: pac' \
  -H 'X-Requested-With: XMLHttpRequest' \
  --data-raw '{
    "searchTerm": "{\"isAnd\":true,\"isReadingLevel\":null,\"searchTokens\":[{\"searchString\":\"gentle\",\"type\":\"Contains\",\"field\":\"Title\"},{\"searchString\":\"quindlen\",\"type\":\"Contains\",\"field\":\"Author\"}]}",
    "startIndex": 0,
    "hitsPerPage": 12,
    "facetFilters": [],
    "branchFilters": [],
    "sortCriteria": "Relevancy",
    "targetAudience": "",
    "addToHistory": false,
    "dbCodes": [],
    "audienceCharacteristicsFilters": [],
    "readingLevelFilters": null
  }'
```

---

### 2. Check Item Availability

**Endpoint:** `POST /availability`

**Purpose:** Check real-time circulation status for specific items (physical copies).

#### Request Schema

```typescript
type AvailabilityRequest = AvailabilityItem[];

interface AvailabilityItem {
  itemIdentifier: string;  // Barcode
  resourceId: number;      // Resource ID the item belongs to
}
```

#### Response Schema

```typescript
interface AvailabilityResponse {
  hostSystemDiag: {
    methodSupported: boolean;
    validHostUser: null | boolean;
    validSessionUser: null | boolean;
    hostSystemFailure: null | string;
  };
  itemAvailabilities: ItemAvailability[];
}

interface ItemAvailability {
  resourceId: number;
  itemIdentifier: string;
  available: boolean;
  status: string;           // Human-readable: "Checked In", "Checked Out", etc.
  statusCode: string;       // Single letter: "I" = In, "O" = Out (needs verification)
  dueDate: string | null;   // ISO date if checked out
  dueDateString: string | null;  // Formatted date string
  modStatus: string | null;
  nonCirculating: boolean;
  onOrder: boolean;
}
```

#### Known Status Codes

| Code | Status | Meaning |
|------|--------|---------|
| `I` | Checked In | Available on shelf |
| `O` | *Presumed* | Checked out (needs verification) |
| *Others* | 🔍 Unknown | More research needed |

#### Example

```bash
curl -X POST 'https://catalog.handleyregional.org/availability' \
  -H 'Content-Type: application/json; charset=UTF-8' \
  -H 'Ls2pac-config-name: ysm' \
  -H 'Ls2pac-config-type: pac' \
  -H 'X-Requested-With: XMLHttpRequest' \
  --data-raw '[
    {"itemIdentifier":"39925003470542","resourceId":2650073},
    {"itemIdentifier":"39925006077419","resourceId":71130252}
  ]'
```

**Response:**
```json
{
  "hostSystemDiag": {
    "methodSupported": true,
    "validHostUser": null,
    "validSessionUser": null,
    "hostSystemFailure": null
  },
  "itemAvailabilities": [
    {
      "resourceId": 2650073,
      "itemIdentifier": "39925003470542",
      "available": true,
      "status": "Checked In",
      "statusCode": "I",
      "dueDate": null,
      "nonCirculating": false,
      "onOrder": false
    },
    {
      "resourceId": 71130252,
      "itemIdentifier": "39925006077419",
      "available": true,
      "status": "Checked In",
      "statusCode": "I",
      "dueDate": null,
      "nonCirculating": false,
      "onOrder": false
    }
  ]
}
```

---

### 3. Get Resource Details

**Endpoint:** `GET /resource/details/{resourceId}`

**Purpose:** Retrieve detailed bibliographic information for a specific resource.

#### Request

- **Method:** GET
- **URL Parameter:** `resourceId` (numeric)
- **Query Parameter:** `_` (cache-busting timestamp, optional)

#### Response Schema

```typescript
type ResourceDetailsResponse = DetailField[];

interface DetailField {
  label: string;              // Field name for display
  detailsValues: DetailValue[];
}

interface DetailValue {
  value: string;              // The actual content
  linkValue: string | null;   // Value to use for follow-up searches
  linkType: LinkType | null;  // Type of link for navigation
}

type LinkType = "author" | "subject" | null;
```

#### Known Labels

| Label | Description |
|-------|-------------|
| `Title` | Full title with statement of responsibility |
| `Authors` | Author names (linkable for author searches) |
| `Subjects` | Subject headings (linkable for subject searches) |
| `Summary` | Book description/synopsis |
| `ISBN` | ISBN numbers (may include format notes) |
| `Length` | Physical extent (pages, duration, etc.) |
| *Others* | Additional fields may appear (Series, Notes, etc.) |

#### Example

```bash
curl -X GET 'https://catalog.handleyregional.org/resource/details/494066' \
  -H 'Accept: application/json' \
  -H 'Ls2pac-config-name: ysm' \
  -H 'Ls2pac-config-type: pac' \
  -H 'X-Requested-With: XMLHttpRequest'
```

**Response:**
```json
[
  {
    "label": "Title",
    "detailsValues": [
      {
        "value": "Every last one : a novel / Anna Quindlen.",
        "linkValue": null,
        "linkType": null
      }
    ]
  },
  {
    "label": "Authors",
    "detailsValues": [
      {
        "value": "Quindlen, Anna.",
        "linkValue": "Quindlen, Anna.",
        "linkType": "author"
      }
    ]
  },
  {
    "label": "Subjects",
    "detailsValues": [
      {
        "value": "Mothers and sons -- Fiction.",
        "linkValue": "Mothers and sons -- Fiction.",
        "linkType": "subject"
      },
      {
        "value": "Families -- Fiction.",
        "linkValue": "Families -- Fiction.",
        "linkType": "subject"
      }
    ]
  },
  {
    "label": "Summary",
    "detailsValues": [
      {
        "value": "Mary Beth Latham is first and foremost a mother...",
        "linkValue": null,
        "linkType": null
      }
    ]
  },
  {
    "label": "ISBN",
    "detailsValues": [
      { "value": "9781400065745 (acid-free paper)", "linkValue": null, "linkType": null },
      { "value": "1400065747", "linkValue": null, "linkType": null }
    ]
  },
  {
    "label": "Length",
    "detailsValues": [
      { "value": "299 p. ;", "linkValue": null, "linkType": null }
    ]
  }
]
```

---

## Discovered But Undocumented Endpoints

These endpoints were referenced in search results or may exist based on patterns:

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/list/dynamic/{listId}` | GET | Retrieve saved/dynamic lists | 🔍 Needs testing |
| `/list/dynamic/{listId}/rss` | GET | RSS feed of a list | 🔍 Needs testing |
| `/branches` | GET? | List of library branches | 🔍 Needs testing |
| `/facets` | GET/POST? | Available search facets | 🔍 Needs testing |

---

## Branch Information (Handley Regional)

Based on observed data:

| branchIdentifier | branchName | Location |
|------------------|------------|----------|
| `2` | Bowman | Stephens City, VA |
| *Unknown* | Handley | Winchester, VA (main branch) |
| *Unknown* | Clarke County | Berryville, VA |

> 🔍 **Research needed:** Full branch list and identifiers

---

## Usage Notes for MCP Server Implementation

### Recommended Tool Design

```typescript
// Suggested MCP tools based on this API

interface LibraryCatalogTools {
  // Search with natural language converted to API format
  search_catalog(params: {
    query: string;
    field?: "title" | "author" | "subject" | "isbn" | "any";
    limit?: number;
  }): Promise<SearchResult[]>;

  // Check if specific items are available
  check_availability(params: {
    items: Array<{ barcode: string; resourceId: number }>;
  }): Promise<AvailabilityResult[]>;

  // Get full details for a resource
  get_book_details(params: {
    resourceId: number;
  }): Promise<BookDetails>;

  // Convenience: Search and return with availability
  find_available_books(params: {
    query: string;
    branch?: string;
  }): Promise<AvailableBook[]>;
}
```

### Implementation Considerations

1. **Double-encoded JSON in searchTerm:** The `searchTerm` field requires JSON inside JSON — stringify the inner object before including in the request body.

2. **Cache-busting parameter:** The `?_=timestamp` query parameter appears optional but may help prevent caching issues.

3. **Session handling:** The `TLCLS2PAC_JSESSIONID` cookie may or may not be required. Test without it first.

4. **Rate limiting:** Unknown. Implement reasonable delays between requests.

5. **Error handling:** Error response format is unknown. Implement defensive parsing.

---

## Appendix: Raw Request Templates

### Minimal Search Request

```bash
curl -X POST 'https://catalog.handleyregional.org/search' \
  -H 'Content-Type: application/json; charset=UTF-8' \
  -H 'Ls2pac-config-name: ysm' \
  -H 'Ls2pac-config-type: pac' \
  -H 'X-Requested-With: XMLHttpRequest' \
  -d '{"searchTerm":"{\"isAnd\":true,\"searchTokens\":[{\"searchString\":\"YOUR_QUERY\",\"type\":\"Contains\",\"field\":\"AnyField\"}]}","startIndex":0,"hitsPerPage":12,"facetFilters":[],"branchFilters":[],"sortCriteria":"Relevancy","targetAudience":"","addToHistory":false,"dbCodes":[],"audienceCharacteristicsFilters":[],"readingLevelFilters":null}'
```

### Minimal Availability Request

```bash
curl -X POST 'https://catalog.handleyregional.org/availability' \
  -H 'Content-Type: application/json; charset=UTF-8' \
  -H 'Ls2pac-config-name: ysm' \
  -H 'Ls2pac-config-type: pac' \
  -H 'X-Requested-With: XMLHttpRequest' \
  -d '[{"itemIdentifier":"BARCODE","resourceId":RESOURCE_ID}]'
```

### Minimal Details Request

```bash
curl -X GET 'https://catalog.handleyregional.org/resource/details/RESOURCE_ID' \
  -H 'Ls2pac-config-name: ysm' \
  -H 'Ls2pac-config-type: pac' \
  -H 'X-Requested-With: XMLHttpRequest'
```

---

## Version History

| Date | Changes |
|------|---------|
| 2026-01-22 | Initial documentation based on reverse engineering |

---

*This documentation is unofficial and provided for educational purposes. TLC and LS2 PAC are products of The Library Corporation.*
