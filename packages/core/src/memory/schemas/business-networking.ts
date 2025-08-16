import { defineSchema, createEntityPatterns } from '../knowledge-schema';

/**
 * Business Networking Knowledge Schema
 * 
 * Models professional relationships, companies, events, and business connections
 * Useful for CRM, networking, and relationship management
 */
export const businessNetworkingSchema = defineSchema({
  name: 'business-networking',
  version: '1.0.0',
  description: 'Knowledge graph for business networking and professional relationships',
  domain: 'business-networking',

  entityTypes: {
    Contact: {
      displayName: 'Business Contact',
      description: 'Professional contact or connection',
      requiredProperties: ['name'],
      optionalProperties: {
        email: 'string',
        phone: 'string',
        title: 'string',
        linkedin: 'string',
        meetingFrequency: 'string',
        lastContact: 'date',
        relationship: 'string', // 'colleague', 'client', 'vendor', 'partner'
        notes: 'string'
      },
      extraction: {
        patterns: createEntityPatterns({ personNames: true }),
        indicators: ['contact', 'colleague', 'client', 'partner', 'vendor', 'CEO', 'CTO', 'VP'],
        contextClues: ['met', 'introduced', 'connected', 'works at', 'founded'],
        minConfidence: 0.8
      },
      relationships: {
        WORKS_AT: {
          name: 'WORKS_AT',
          displayName: 'Works At',
          description: 'Contact works at a company',
          targetEntityTypes: ['Company'],
          semantics: {
            verb: 'works at',
            inverseVerb: 'employs',
            context: 'employment'
          }
        },
        KNOWS: {
          name: 'KNOWS',
          displayName: 'Knows',
          description: 'Professional knows another professional',
          targetEntityTypes: ['Contact'],
          semantics: {
            verb: 'knows',
            context: 'acquaintance',
            bidirectional: true
          },
          multiple: true
        }
      }
    },

    Company: {
      displayName: 'Company',
      description: 'Business organization or company',
      requiredProperties: ['name'],
      optionalProperties: {
        industry: 'string',
        size: 'string', // 'startup', 'small', 'medium', 'large', 'enterprise'
        location: 'string',
        website: 'string',
        founded: 'date',
        revenue: 'string',
        description: 'string'
      },
      extraction: {
        patterns: createEntityPatterns({ companies: true }),
        indicators: ['company', 'corporation', 'startup', 'business', 'firm', 'agency'],
        contextClues: ['founded', 'works at', 'client', 'partner'],
        minConfidence: 0.7
      },
      relationships: {
        LOCATED_IN: {
          name: 'LOCATED_IN',
          displayName: 'Located In',
          description: 'Company is located in a city/region',
          targetEntityTypes: ['Location'],
          semantics: {
            verb: 'located in',
            inverseVerb: 'home to',
            context: 'geographic'
          }
        },
        COMPETES_WITH: {
          name: 'COMPETES_WITH',
          displayName: 'Competes With',
          description: 'Company competes with another company',
          targetEntityTypes: ['Company'],
          semantics: {
            verb: 'competes with',
            context: 'competition',
            bidirectional: true
          },
          multiple: true
        },
        PARTNERS_WITH: {
          name: 'PARTNERS_WITH',
          displayName: 'Partners With',
          description: 'Business partnership between companies',
          targetEntityTypes: ['Company'],
          semantics: {
            verb: 'partners with',
            context: 'partnership',
            bidirectional: true
          },
          multiple: true
        }
      }
    },

    Event: {
      displayName: 'Business Event',
      description: 'Networking event, conference, or meeting',
      requiredProperties: ['name'],
      optionalProperties: {
        type: 'string', // 'conference', 'meetup', 'workshop', 'trade show'
        date: 'date',
        location: 'string',
        organizer: 'string',
        attendees: 'number',
        description: 'string',
        website: 'string'
      },
      extraction: {
        patterns: [
          /(?:event|conference|meetup|summit|workshop)\s*:?\s*([A-Z][A-Za-z\s0-9]+)/gi,
          /attended\s+([A-Z][A-Za-z\s0-9]+)/gi,
          /(TechCrunch|SXSW|CES|Web Summit|DevCon)/gi
        ],
        indicators: ['conference', 'meetup', 'summit', 'workshop', 'event', 'gathering'],
        contextClues: ['attended', 'speaking at', 'sponsored', 'organized'],
        minConfidence: 0.6
      },
      relationships: {
        ATTENDED_BY: {
          name: 'ATTENDED_BY',
          displayName: 'Attended By',
          description: 'Event was attended by a contact',
          targetEntityTypes: ['Contact'],
          semantics: {
            verb: 'attended by',
            inverseVerb: 'attended',
            context: 'participation'
          },
          multiple: true
        },
        HOSTED_BY: {
          name: 'HOSTED_BY',
          displayName: 'Hosted By',
          description: 'Event was hosted by a company',
          targetEntityTypes: ['Company'],
          semantics: {
            verb: 'hosted by',
            inverseVerb: 'hosted',
            context: 'organization'
          }
        }
      }
    },

    Opportunity: {
      displayName: 'Business Opportunity',
      description: 'Business opportunity, deal, or potential collaboration',
      requiredProperties: ['name'],
      optionalProperties: {
        type: 'string', // 'sale', 'partnership', 'investment', 'job', 'collaboration'
        status: 'string', // 'prospecting', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'
        value: 'number',
        probability: 'number', // 0-1
        expectedCloseDate: 'date',
        description: 'string'
      },
      extraction: {
        patterns: [
          /(?:opportunity|deal|contract|partnership)\s+(?:with|for)\s+([^,.]+)/gi,
          /([A-Z][A-Za-z\s]+)\s+(?:opportunity|deal|contract)/gi
        ],
        indicators: ['opportunity', 'deal', 'contract', 'partnership', 'collaboration'],
        contextClues: ['discussing', 'negotiating', 'proposing', 'potential'],
        minConfidence: 0.7
      },
      relationships: {
        INVOLVES: {
          name: 'INVOLVES',
          displayName: 'Involves',
          description: 'Opportunity involves a contact or company',
          targetEntityTypes: ['Contact', 'Company'],
          semantics: {
            verb: 'involves',
            inverseVerb: 'involved in',
            context: 'participation'
          },
          multiple: true
        }
      }
    },

    Industry: {
      displayName: 'Industry',
      description: 'Business industry or sector',
      requiredProperties: ['name'],
      optionalProperties: {
        description: 'string',
        growth: 'string', // 'growing', 'stable', 'declining'
        size: 'string' // Market size
      },
      extraction: {
        patterns: [
          /(?:industry|sector|market)\s*:?\s*([A-Z][A-Za-z\s]+)/gi,
          /(Technology|Healthcare|Finance|Retail|Manufacturing|Education|Real Estate|Media)/gi
        ],
        indicators: ['industry', 'sector', 'market', 'vertical'],
        minConfidence: 0.8
      }
    },

    Location: {
      displayName: 'Location',
      description: 'Geographic location (city, region, country)',
      requiredProperties: ['name'],
      optionalProperties: {
        type: 'string', // 'city', 'state', 'country', 'region'
        timezone: 'string',
        businessHub: 'boolean' // Is this a major business hub?
      },
      extraction: {
        patterns: createEntityPatterns({ locations: true }),
        indicators: ['city', 'region', 'area', 'hub', 'market'],
        contextClues: ['located', 'based', 'from', 'in'],
        minConfidence: 0.9
      }
    }
  },

  relationshipTypes: {
    INTRODUCED_BY: {
      displayName: 'Introduced By',
      description: 'One contact introduced by another',
      targetEntityTypes: ['Contact'],
      semantics: {
        verb: 'introduced by',
        inverseVerb: 'introduced',
        context: 'networking'
      },
      extraction: {
        patterns: [/introduced\s+(?:me\s+)?(?:to\s+)?(\w+)\s+(?:by|through)\s+(\w+)/gi],
        verbs: ['introduced', 'connected', 'referred']
      }
    },

    MET_AT: {
      displayName: 'Met At',
      description: 'Contact met at an event or location',
      targetEntityTypes: ['Event', 'Location', 'Company'],
      semantics: {
        verb: 'met at',
        context: 'meeting'
      },
      extraction: {
        patterns: [/met\s+(?:at|during)\s+([^,.]+)/gi],
        verbs: ['met', 'encountered', 'connected']
      }
    },

    COLLABORATED_ON: {
      displayName: 'Collaborated On',
      description: 'Contacts who worked together on an opportunity',
      targetEntityTypes: ['Opportunity'],
      semantics: {
        verb: 'collaborated on',
        context: 'collaboration'
      },
      extraction: {
        patterns: [/collaborated\s+(?:with\s+\w+\s+)?on\s+([^,.]+)/gi],
        verbs: ['collaborated', 'worked together', 'partnered']
      }
    },

    REFERRED: {
      displayName: 'Referred',
      description: 'One contact referred another for an opportunity',
      targetEntityTypes: ['Contact'],
      semantics: {
        verb: 'referred',
        inverseVerb: 'referred by',
        context: 'referral'
      },
      extraction: {
        patterns: [/referred\s+(\w+)\s+(?:to|for)/gi],
        verbs: ['referred', 'recommended', 'suggested']
      }
    },

    ACQUIRED: {
      displayName: 'Acquired',
      description: 'One company acquired another',
      targetEntityTypes: ['Company'],
      semantics: {
        verb: 'acquired',
        inverseVerb: 'acquired by',
        context: 'corporate'
      },
      extraction: {
        patterns: [/(\w+)\s+acquired\s+(\w+)/gi],
        verbs: ['acquired', 'bought', 'purchased', 'merged with']
      }
    }
  }
});