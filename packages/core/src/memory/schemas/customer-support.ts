import { defineSchema, createEntityPatterns, createRelationshipPatterns } from '../knowledge-schema';

/**
 * Customer Support Knowledge Schema
 * 
 * Models customer interactions, issues, products, and resolution processes
 * Perfect for customer service and support ticket systems
 */
export const customerSupportSchema = defineSchema({
  name: 'customer-support',
  version: '1.0.0',
  description: 'Knowledge graph for customer support interactions and issue tracking',
  domain: 'customer-service',

  entityTypes: {
    Customer: {
      displayName: 'Customer',
      description: 'A customer or client who uses products/services',
      requiredProperties: ['name'],
      optionalProperties: {
        email: 'string',
        phone: 'string',
        company: 'string',
        tier: 'string', // 'basic', 'premium', 'enterprise'
        joinDate: 'date'
      },
      extraction: {
        patterns: createEntityPatterns({ personNames: true }),
        indicators: ['customer', 'client', 'user'],
        contextClues: ['called', 'reported', 'complained', 'requested'],
        minConfidence: 0.7
      },
      relationships: {
        REPORTS: {
          name: 'REPORTS',
          displayName: 'Reports',
          description: 'Customer reports an issue',
          targetEntityTypes: ['Issue'],
          semantics: {
            verb: 'reports',
            inverseVerb: 'reported by',
            context: 'support'
          },
          multiple: true
        },
        USES: {
          name: 'USES',
          displayName: 'Uses',
          description: 'Customer uses a product',
          targetEntityTypes: ['Product'],
          semantics: {
            verb: 'uses',
            context: 'usage'
          },
          multiple: true
        }
      }
    },

    Agent: {
      displayName: 'Support Agent',
      description: 'Customer support representative',
      requiredProperties: ['name'],
      optionalProperties: {
        email: 'string',
        department: 'string',
        expertise: 'object', // Array of specializations
        hireDate: 'date'
      },
      extraction: {
        patterns: [
          /(?:agent|rep|representative)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/gi,
          /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:handled|resolved|assigned)/gi
        ],
        indicators: ['agent', 'representative', 'support staff'],
        minConfidence: 0.8
      },
      relationships: {
        HANDLES: {
          name: 'HANDLES',
          displayName: 'Handles',
          description: 'Agent handles an issue',
          targetEntityTypes: ['Issue'],
          semantics: {
            verb: 'handles',
            inverseVerb: 'handled by',
            context: 'support'
          },
          multiple: true
        },
        SPECIALIZES_IN: {
          name: 'SPECIALIZES_IN',
          displayName: 'Specializes In',
          description: 'Agent has expertise in product area',
          targetEntityTypes: ['Product', 'Category'],
          semantics: {
            verb: 'specializes in',
            context: 'expertise'
          },
          multiple: true
        }
      }
    },

    Issue: {
      displayName: 'Issue',
      description: 'Customer support issue or ticket',
      requiredProperties: ['title', 'status'],
      optionalProperties: {
        description: 'string',
        priority: 'string', // 'low', 'medium', 'high', 'critical'
        category: 'string',
        resolution: 'string',
        createdAt: 'date',
        resolvedAt: 'date'
      },
      extraction: {
        patterns: [
          /(?:issue|problem|bug|error)\s+(?:with|in|about)\s+([^,.]+)/gi,
          /([^,.]+)\s+(?:not working|broken|failing|down)/gi
        ],
        indicators: ['issue', 'problem', 'bug', 'error', 'ticket'],
        contextClues: ['reported', 'experiencing', 'encountered'],
        minConfidence: 0.6
      },
      relationships: {
        AFFECTS: {
          name: 'AFFECTS',
          displayName: 'Affects',
          description: 'Issue affects a product or feature',
          targetEntityTypes: ['Product', 'Feature'],
          semantics: {
            verb: 'affects',
            inverseVerb: 'affected by',
            context: 'impact'
          },
          multiple: true
        },
        SIMILAR_TO: {
          name: 'SIMILAR_TO',
          displayName: 'Similar To',
          description: 'Issues that are similar or related',
          targetEntityTypes: ['Issue'],
          semantics: {
            verb: 'is similar to',
            context: 'similarity',
            bidirectional: true
          },
          multiple: true
        }
      }
    },

    Product: {
      displayName: 'Product',
      description: 'Product or service offered by the company',
      requiredProperties: ['name'],
      optionalProperties: {
        version: 'string',
        category: 'string',
        description: 'string',
        status: 'string' // 'active', 'deprecated', 'beta'
      },
      extraction: {
        patterns: createEntityPatterns({ 
          companies: true,
          custom: [
            /(?:product|service|platform|app|software)\s+([A-Z][a-zA-Z\s]+)/gi,
            /([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)\s+(?:v\d|version|API)/gi
          ]
        }),
        indicators: ['product', 'service', 'platform', 'app', 'software', 'API'],
        minConfidence: 0.7
      },
      relationships: {
        HAS_FEATURE: {
          name: 'HAS_FEATURE',
          displayName: 'Has Feature',
          description: 'Product includes a feature',
          targetEntityTypes: ['Feature'],
          semantics: {
            verb: 'has feature',
            inverseVerb: 'feature of',
            context: 'functionality'
          },
          multiple: true
        },
        INTEGRATES_WITH: {
          name: 'INTEGRATES_WITH',
          displayName: 'Integrates With',
          description: 'Product integrates with another product',
          targetEntityTypes: ['Product'],
          semantics: {
            verb: 'integrates with',
            context: 'integration',
            bidirectional: true
          },
          multiple: true
        }
      }
    },

    Feature: {
      displayName: 'Feature',
      description: 'Specific feature or functionality',
      requiredProperties: ['name'],
      optionalProperties: {
        description: 'string',
        status: 'string', // 'stable', 'beta', 'deprecated'
        documentation: 'string'
      },
      extraction: {
        patterns: [
          /(?:feature|functionality|capability)\s+([^,.]+)/gi,
          /([A-Z][a-zA-Z\s]+)\s+(?:feature|function|tool)/gi
        ],
        indicators: ['feature', 'functionality', 'capability', 'function', 'tool'],
        minConfidence: 0.6
      }
    },

    Solution: {
      displayName: 'Solution',
      description: 'Solution or resolution to an issue',
      requiredProperties: ['description'],
      optionalProperties: {
        steps: 'object', // Array of steps
        timeToResolve: 'string',
        difficulty: 'string' // 'easy', 'medium', 'hard'
      },
      extraction: {
        patterns: [
          /(?:solution|fix|resolution|workaround):\s+([^.]+)/gi,
          /(?:resolved by|fixed by|solved by)\s+([^.]+)/gi
        ],
        indicators: ['solution', 'fix', 'resolution', 'workaround'],
        contextClues: ['resolved', 'fixed', 'solved'],
        minConfidence: 0.7
      },
      relationships: {
        SOLVES: {
          name: 'SOLVES',
          displayName: 'Solves',
          description: 'Solution resolves an issue',
          targetEntityTypes: ['Issue'],
          semantics: {
            verb: 'solves',
            inverseVerb: 'solved by',
            context: 'resolution'
          },
          multiple: true
        }
      }
    }
  },

  relationshipTypes: {
    ESCALATED_TO: {
      displayName: 'Escalated To',
      description: 'Issue or conversation escalated to another agent or team',
      targetEntityTypes: ['Agent', 'Team'],
      semantics: {
        verb: 'escalated to',
        inverseVerb: 'received escalation from',
        context: 'escalation'
      },
      extraction: {
        patterns: [/escalated?\s+to\s+([^,.]+)/gi],
        verbs: ['escalated', 'transferred', 'forwarded']
      }
    },

    DUPLICATES: {
      displayName: 'Duplicates',
      description: 'Issue is a duplicate of another issue',
      targetEntityTypes: ['Issue'],
      semantics: {
        verb: 'duplicates',
        inverseVerb: 'duplicated by',
        context: 'relationship'
      },
      extraction: {
        patterns: [/duplicate\s+(?:of|to)\s+([^,.]+)/gi],
        verbs: ['duplicates', 'same as']
      }
    },

    CAUSED_BY: {
      displayName: 'Caused By',
      description: 'Issue is caused by another issue or factor',
      targetEntityTypes: ['Issue', 'Feature', 'Product'],
      semantics: {
        verb: 'caused by',
        inverseVerb: 'causes',
        context: 'causation'
      },
      extraction: {
        patterns: [/caused\s+by\s+([^,.]+)/gi],
        verbs: ['caused by', 'due to', 'because of']
      }
    }
  }
});