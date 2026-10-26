/* GENERATED FILE — do not edit by hand.
 * Source: branch-schema `npm run build:vocab`.
 * Regenerate after changing src/game.ts or src/types.ts. */
(function (root) {
  root.GOS_VOCAB = {
  "schemaVersion": "branch-schema/1+game/1",
  "entityTypes": [
    "game",
    "person",
    "studio",
    "franchise",
    "mechanic",
    "platform"
  ],
  "relationshipCategories": [
    "credit",
    "affiliation",
    "human-lineage",
    "studio-lineage",
    "franchise-lineage",
    "documented-influence",
    "mechanical-similarity",
    "analogous-design",
    "mechanic-usage",
    "availability"
  ],
  "relationshipCategoryLabels": {
    "credit": "Credits",
    "affiliation": "Affiliations",
    "human-lineage": "Human lineage",
    "studio-lineage": "Studio lineage",
    "franchise-lineage": "Franchise lineage",
    "documented-influence": "Documented influence",
    "mechanical-similarity": "Mechanical similarity",
    "analogous-design": "Analogous design",
    "mechanic-usage": "Mechanics used",
    "availability": "Availability"
  },
  "lineageCategories": [
    "human-lineage",
    "studio-lineage",
    "franchise-lineage"
  ],
  "relationships": [
    {
      "type": "CREATED_BY",
      "category": "credit",
      "label": "created by",
      "inverseLabel": "created",
      "directed": true,
      "lineage": false,
      "from": [
        "game"
      ],
      "to": [
        "studio",
        "person"
      ]
    },
    {
      "type": "DEVELOPED_BY",
      "category": "credit",
      "label": "developed by",
      "inverseLabel": "developed",
      "directed": true,
      "lineage": false,
      "from": [
        "game"
      ],
      "to": [
        "studio",
        "person"
      ]
    },
    {
      "type": "PUBLISHED_BY",
      "category": "credit",
      "label": "published by",
      "inverseLabel": "published",
      "directed": true,
      "lineage": false,
      "from": [
        "game"
      ],
      "to": [
        "studio"
      ]
    },
    {
      "type": "DIRECTED_BY",
      "category": "credit",
      "label": "directed by",
      "inverseLabel": "directed",
      "directed": true,
      "lineage": false,
      "from": [
        "game"
      ],
      "to": [
        "person"
      ]
    },
    {
      "type": "DESIGNED_BY",
      "category": "credit",
      "label": "designed by",
      "inverseLabel": "designed",
      "directed": true,
      "lineage": false,
      "from": [
        "game"
      ],
      "to": [
        "person"
      ]
    },
    {
      "type": "WORKED_ON",
      "category": "credit",
      "label": "worked on",
      "inverseLabel": "worked on by",
      "directed": true,
      "lineage": false,
      "from": [
        "person"
      ],
      "to": [
        "game"
      ]
    },
    {
      "type": "FOUNDED",
      "category": "affiliation",
      "label": "founded",
      "inverseLabel": "founded by",
      "directed": true,
      "lineage": false,
      "from": [
        "person"
      ],
      "to": [
        "studio"
      ]
    },
    {
      "type": "LEFT_TO_FOUND",
      "category": "human-lineage",
      "label": "left to found",
      "inverseLabel": "founded by",
      "directed": true,
      "lineage": true,
      "from": [
        "person"
      ],
      "to": [
        "studio"
      ]
    },
    {
      "type": "MEMBER_OF",
      "category": "affiliation",
      "label": "member of",
      "inverseLabel": "has member",
      "directed": true,
      "lineage": false,
      "from": [
        "person",
        "game",
        "studio"
      ],
      "to": [
        "studio",
        "franchise"
      ]
    },
    {
      "type": "STUDIO_DESCENDANT",
      "category": "studio-lineage",
      "label": "studio descendant of",
      "inverseLabel": "has studio descendant",
      "directed": true,
      "lineage": true,
      "from": [
        "studio"
      ],
      "to": [
        "studio"
      ]
    },
    {
      "type": "FRANCHISE_DESCENDANT",
      "category": "franchise-lineage",
      "label": "franchise descendant of",
      "inverseLabel": "has franchise descendant",
      "directed": true,
      "lineage": true,
      "from": [
        "franchise"
      ],
      "to": [
        "franchise"
      ]
    },
    {
      "type": "SEQUEL_OF",
      "category": "franchise-lineage",
      "label": "sequel of",
      "inverseLabel": "has sequel",
      "directed": true,
      "lineage": true,
      "from": [
        "game"
      ],
      "to": [
        "game"
      ]
    },
    {
      "type": "PREQUEL_OF",
      "category": "franchise-lineage",
      "label": "prequel of",
      "inverseLabel": "has prequel",
      "directed": true,
      "lineage": true,
      "from": [
        "game"
      ],
      "to": [
        "game"
      ]
    },
    {
      "type": "SPINOFF_OF",
      "category": "franchise-lineage",
      "label": "spin-off of",
      "inverseLabel": "has spin-off",
      "directed": true,
      "lineage": true,
      "from": [
        "game"
      ],
      "to": [
        "game"
      ]
    },
    {
      "type": "INFLUENCED_BY",
      "category": "documented-influence",
      "label": "influenced by",
      "inverseLabel": "influenced",
      "directed": true,
      "lineage": false,
      "from": [
        "game",
        "person",
        "studio",
        "franchise",
        "mechanic"
      ],
      "to": [
        "game",
        "person",
        "studio",
        "franchise",
        "mechanic"
      ]
    },
    {
      "type": "MECHANICALLY_RELATED",
      "category": "mechanical-similarity",
      "label": "mechanically related to",
      "inverseLabel": "mechanically related to",
      "directed": false,
      "lineage": false,
      "from": [
        "game"
      ],
      "to": [
        "game"
      ]
    },
    {
      "type": "SPIRITUAL_SUCCESSOR",
      "category": "analogous-design",
      "label": "spiritual successor of",
      "inverseLabel": "has spiritual successor",
      "directed": true,
      "lineage": false,
      "from": [
        "game"
      ],
      "to": [
        "game"
      ]
    },
    {
      "type": "USES_MECHANIC",
      "category": "mechanic-usage",
      "label": "uses mechanic",
      "inverseLabel": "used in",
      "directed": true,
      "lineage": false,
      "from": [
        "game"
      ],
      "to": [
        "mechanic"
      ]
    },
    {
      "type": "AVAILABLE_ON",
      "category": "availability",
      "label": "available on",
      "inverseLabel": "platform for",
      "directed": true,
      "lineage": false,
      "from": [
        "game"
      ],
      "to": [
        "platform"
      ]
    }
  ],
  "confidenceBands": [
    "high",
    "moderate",
    "low",
    "disputed",
    "speculative"
  ],
  "reviewStatuses": [
    "unreviewed",
    "review-in-progress",
    "verified",
    "incomplete",
    "rejected"
  ],
  "resolutionStatuses": [
    "PENDING",
    "FOUND",
    "LIKELY",
    "AMBIGUOUS",
    "NOT_FOUND"
  ]
};
  if (typeof module === 'object' && module.exports) module.exports = root.GOS_VOCAB;
})(typeof globalThis !== 'undefined' ? globalThis : this);
