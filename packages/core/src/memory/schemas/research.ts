import { defineSchema, createEntityPatterns } from '../knowledge-schema';

/**
 * Research Knowledge Schema
 * 
 * Models research papers, authors, institutions, concepts, and citations
 * Perfect for academic research, literature review, and knowledge discovery
 */
export const researchSchema = defineSchema({
  name: 'research',
  version: '1.0.0',
  description: 'Knowledge graph for research papers, authors, and academic relationships',
  domain: 'academic-research',

  entityTypes: {
    Paper: {
      displayName: 'Research Paper',
      description: 'Academic research paper or publication',
      requiredProperties: ['title'],
      optionalProperties: {
        abstract: 'string',
        doi: 'string',
        arxivId: 'string',
        publishedDate: 'date',
        venue: 'string', // Conference or journal
        citationCount: 'number',
        pdfUrl: 'string',
        keywords: 'object' // Array of keywords
      },
      extraction: {
        patterns: [
          /(?:paper|study|research|article)\s*:?\s*["']([^"']+)["']/gi,
          /titled?\s+["']([^"']+)["']/gi,
          /(?:doi|DOI)\s*:?\s*(10\.\d+\/[^\s]+)/gi
        ],
        indicators: ['paper', 'study', 'research', 'article', 'publication'],
        contextClues: ['published', 'authored', 'cited', 'reviewed'],
        minConfidence: 0.7
      },
      relationships: {
        AUTHORED_BY: {
          name: 'AUTHORED_BY',
          displayName: 'Authored By',
          description: 'Paper was written by an author',
          targetEntityTypes: ['Author'],
          semantics: {
            verb: 'authored by',
            inverseVerb: 'authored',
            context: 'authorship'
          },
          multiple: true
        },
        CITES: {
          name: 'CITES',
          displayName: 'Cites',
          description: 'Paper cites another paper',
          targetEntityTypes: ['Paper'],
          semantics: {
            verb: 'cites',
            inverseVerb: 'cited by',
            context: 'citation'
          },
          multiple: true
        },
        STUDIES: {
          name: 'STUDIES',
          displayName: 'Studies',
          description: 'Paper studies a concept or topic',
          targetEntityTypes: ['Concept'],
          semantics: {
            verb: 'studies',
            inverseVerb: 'studied in',
            context: 'research'
          },
          multiple: true
        }
      }
    },

    Author: {
      displayName: 'Author',
      description: 'Academic researcher or author',
      requiredProperties: ['name'],
      optionalProperties: {
        email: 'string',
        orcid: 'string',
        googleScholarId: 'string',
        hIndex: 'number',
        totalCitations: 'number',
        website: 'string',
        bio: 'string'
      },
      extraction: {
        patterns: createEntityPatterns({ personNames: true }),
        indicators: ['author', 'researcher', 'professor', 'PhD', 'Dr.', 'scientist'],
        contextClues: ['authored', 'researched', 'published', 'co-author'],
        minConfidence: 0.8
      },
      relationships: {
        AFFILIATED_WITH: {
          name: 'AFFILIATED_WITH',
          displayName: 'Affiliated With',
          description: 'Author is affiliated with an institution',
          targetEntityTypes: ['Institution'],
          semantics: {
            verb: 'affiliated with',
            inverseVerb: 'employs',
            context: 'affiliation'
          },
          multiple: true
        },
        COLLABORATES_WITH: {
          name: 'COLLABORATES_WITH',
          displayName: 'Collaborates With',
          description: 'Authors who frequently collaborate',
          targetEntityTypes: ['Author'],
          semantics: {
            verb: 'collaborates with',
            context: 'collaboration',
            bidirectional: true
          },
          multiple: true
        },
        EXPERT_IN: {
          name: 'EXPERT_IN',
          displayName: 'Expert In',
          description: 'Author is an expert in a research area',
          targetEntityTypes: ['Field'],
          semantics: {
            verb: 'expert in',
            context: 'expertise'
          },
          multiple: true
        }
      }
    },

    Institution: {
      displayName: 'Institution',
      description: 'Academic institution, university, or research organization',
      requiredProperties: ['name'],
      optionalProperties: {
        type: 'string', // 'university', 'research_institute', 'company', 'government'
        country: 'string',
        city: 'string',
        ranking: 'number',
        website: 'string',
        established: 'date'
      },
      extraction: {
        patterns: [
          /(?:University|Institute|College|Lab|Laboratory)\s+(?:of\s+)?([A-Z][A-Za-z\s]+)/gi,
          /(MIT|Stanford|Harvard|Berkeley|CMU|Oxford|Cambridge)/gi,
          /([A-Z][A-Za-z\s]+)\s+(?:University|Institute|College)/gi
        ],
        indicators: ['university', 'institute', 'college', 'laboratory', 'center'],
        contextClues: ['affiliated', 'research at', 'professor at'],
        minConfidence: 0.8
      },
      relationships: {
        COLLABORATES_WITH: {
          name: 'COLLABORATES_WITH',
          displayName: 'Collaborates With',
          description: 'Institutions that collaborate on research',
          targetEntityTypes: ['Institution'],
          semantics: {
            verb: 'collaborates with',
            context: 'institutional collaboration',
            bidirectional: true
          },
          multiple: true
        }
      }
    },

    Concept: {
      displayName: 'Research Concept',
      description: 'Research concept, method, or topic',
      requiredProperties: ['name'],
      optionalProperties: {
        definition: 'string',
        category: 'string',
        popularity: 'number', // How often it appears in literature
        firstIntroduced: 'date',
        aliases: 'object' // Alternative names
      },
      extraction: {
        patterns: [
          /(?:concept|method|approach|technique|algorithm)\s+(?:of\s+|called\s+)?([A-Z][A-Za-z\s]+)/gi,
          /([A-Z][A-Za-z\s]+)\s+(?:method|algorithm|approach|technique)/gi,
          /(Machine Learning|Deep Learning|Neural Networks|NLP|Computer Vision|Reinforcement Learning)/gi
        ],
        indicators: ['concept', 'method', 'approach', 'technique', 'algorithm', 'theory'],
        contextClues: ['propose', 'introduce', 'develop', 'study'],
        minConfidence: 0.6
      },
      relationships: {
        RELATED_TO: {
          name: 'RELATED_TO',
          displayName: 'Related To',
          description: 'Concepts that are related or connected',
          targetEntityTypes: ['Concept'],
          semantics: {
            verb: 'related to',
            context: 'conceptual relationship',
            bidirectional: true
          },
          multiple: true
        },
        EXTENDS: {
          name: 'EXTENDS',
          displayName: 'Extends',
          description: 'Concept extends or builds upon another',
          targetEntityTypes: ['Concept'],
          semantics: {
            verb: 'extends',
            inverseVerb: 'extended by',
            context: 'conceptual hierarchy'
          },
          multiple: true
        }
      }
    },

    Field: {
      displayName: 'Research Field',
      description: 'Academic discipline or research field',
      requiredProperties: ['name'],
      optionalProperties: {
        description: 'string',
        parentField: 'string',
        established: 'date',
        keyJournals: 'object', // Array of key journals in this field
        keyConferences: 'object' // Array of key conferences
      },
      extraction: {
        patterns: [
          /(?:field|discipline|area)\s+of\s+([A-Z][A-Za-z\s]+)/gi,
          /(Computer Science|Artificial Intelligence|Machine Learning|Physics|Biology|Chemistry|Mathematics)/gi
        ],
        indicators: ['field', 'discipline', 'area', 'domain', 'science'],
        minConfidence: 0.8
      },
      relationships: {
        SUBFIELD_OF: {
          name: 'SUBFIELD_OF',
          displayName: 'Subfield Of',
          description: 'Field is a subfield of a broader field',
          targetEntityTypes: ['Field'],
          semantics: {
            verb: 'subfield of',
            inverseVerb: 'includes subfield',
            context: 'disciplinary hierarchy'
          }
        }
      }
    },

    Dataset: {
      displayName: 'Dataset',
      description: 'Research dataset used in studies',
      requiredProperties: ['name'],
      optionalProperties: {
        description: 'string',
        size: 'string',
        type: 'string', // 'text', 'image', 'tabular', 'time-series'
        url: 'string',
        license: 'string',
        domain: 'string'
      },
      extraction: {
        patterns: [
          /(?:dataset|corpus|benchmark)\s*:?\s*([A-Z][A-Za-z0-9\s-]+)/gi,
          /(ImageNet|COCO|MNIST|BERT|GPT|Wikipedia)/gi
        ],
        indicators: ['dataset', 'corpus', 'benchmark', 'data'],
        contextClues: ['trained on', 'evaluated on', 'using', 'dataset'],
        minConfidence: 0.7
      },
      relationships: {
        USED_IN: {
          name: 'USED_IN',
          displayName: 'Used In',
          description: 'Dataset was used in a paper',
          targetEntityTypes: ['Paper'],
          semantics: {
            verb: 'used in',
            inverseVerb: 'uses dataset',
            context: 'experimental'
          },
          multiple: true
        }
      }
    }
  },

  relationshipTypes: {
    BUILDS_UPON: {
      displayName: 'Builds Upon',
      description: 'Research that builds upon previous work',
      targetEntityTypes: ['Paper', 'Concept'],
      semantics: {
        verb: 'builds upon',
        inverseVerb: 'foundation for',
        context: 'research development'
      },
      extraction: {
        patterns: [/builds?\s+(?:on|upon)\s+([^,.]+)/gi],
        verbs: ['builds on', 'extends', 'improves upon', 'based on']
      }
    },

    CONTRADICTS: {
      displayName: 'Contradicts',
      description: 'Research that contradicts previous findings',
      targetEntityTypes: ['Paper', 'Concept'],
      semantics: {
        verb: 'contradicts',
        inverseVerb: 'contradicted by',
        context: 'research conflict'
      },
      extraction: {
        patterns: [/contradicts?\s+([^,.]+)/gi],
        verbs: ['contradicts', 'disputes', 'challenges', 'refutes']
      }
    },

    REPLICATES: {
      displayName: 'Replicates',
      description: 'Research that replicates previous study',
      targetEntityTypes: ['Paper'],
      semantics: {
        verb: 'replicates',
        inverseVerb: 'replicated by',
        context: 'research validation'
      },
      extraction: {
        patterns: [/replicates?\s+([^,.]+)/gi],
        verbs: ['replicates', 'reproduces', 'validates']
      }
    },

    INSPIRED_BY: {
      displayName: 'Inspired By',
      description: 'Research inspired by previous work',
      targetEntityTypes: ['Paper', 'Concept', 'Author'],
      semantics: {
        verb: 'inspired by',
        inverseVerb: 'inspired',
        context: 'research influence'
      },
      extraction: {
        patterns: [/inspired\s+by\s+([^,.]+)/gi],
        verbs: ['inspired by', 'motivated by', 'influenced by']
      }
    }
  }
});