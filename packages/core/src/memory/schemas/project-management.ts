import { defineSchema, createEntityPatterns, createRelationshipPatterns } from '../knowledge-schema';

/**
 * Project Management Knowledge Schema
 * 
 * Models projects, tasks, people, skills, and their relationships
 * Based on the Memgraph knowledge graph example
 */
export const projectManagementSchema = defineSchema({
  name: 'project-management',
  version: '1.0.0',
  description: 'Knowledge graph for project management, task allocation, and skill tracking',
  domain: 'project-management',

  entityTypes: {
    Person: {
      displayName: 'Person',
      description: 'Team member or stakeholder in projects',
      requiredProperties: ['name'],
      optionalProperties: {
        email: 'string',
        role: 'string',
        costPerDay: 'number',
        hireDate: 'date',
        department: 'string'
      },
      extraction: {
        patterns: createEntityPatterns({ personNames: true }),
        indicators: ['developer', 'manager', 'designer', 'analyst', 'engineer'],
        contextClues: ['works', 'assigned', 'responsible', 'team member'],
        minConfidence: 0.8
      },
      relationships: {
        HAS: {
          name: 'HAS',
          displayName: 'Has Skill',
          description: 'Person possesses a skill',
          targetEntityTypes: ['Skill'],
          semantics: {
            verb: 'has',
            inverseVerb: 'possessed by',
            context: 'professional'
          },
          multiple: true
        },
        WORKS_ON: {
          name: 'WORKS_ON',
          displayName: 'Works On',
          description: 'Person is assigned to work on a task',
          targetEntityTypes: ['Task'],
          semantics: {
            verb: 'works on',
            inverseVerb: 'worked on by',
            context: 'assignment'
          },
          multiple: true
        },
        PREFERS: {
          name: 'PREFERS',
          displayName: 'Prefers Domain',
          description: 'Person prefers working in a domain',
          targetEntityTypes: ['Domain'],
          semantics: {
            verb: 'prefers',
            context: 'preference'
          },
          multiple: true
        }
      }
    },

    Skill: {
      displayName: 'Skill',
      description: 'Professional skill or competency',
      requiredProperties: ['name'],
      optionalProperties: {
        level: 'string', // 'beginner', 'intermediate', 'advanced', 'expert'
        category: 'string',
        description: 'string',
        inDemand: 'boolean'
      },
      extraction: {
        patterns: createEntityPatterns({ 
          skills: true,
          custom: [
            /(?:skilled in|expert in|proficient in|knows)\s+([A-Za-z][A-Za-z\s+.#]*)/gi,
            /([A-Za-z][A-Za-z\s+.#]*)\s+(?:skill|experience|knowledge|expertise)/gi,
            /(?:Python|JavaScript|React|Node\.js|SQL|AWS|Docker|Kubernetes|Git)/gi
          ]
        }),
        indicators: ['programming', 'development', 'analysis', 'design', 'management'],
        minConfidence: 0.7
      },
      relationships: {
        BELONGS_TO: {
          name: 'BELONGS_TO',
          displayName: 'Belongs To Domain',
          description: 'Skill belongs to a domain area',
          targetEntityTypes: ['Domain'],
          semantics: {
            verb: 'belongs to',
            inverseVerb: 'contains skill',
            context: 'categorization'
          }
        }
      }
    },

    Task: {
      displayName: 'Task',
      description: 'Work task or deliverable',
      requiredProperties: ['name'],
      optionalProperties: {
        description: 'string',
        status: 'string', // 'todo', 'in-progress', 'done', 'blocked'
        priority: 'string', // 'low', 'medium', 'high', 'critical'
        estimatedDays: 'number',
        actualDays: 'number',
        startDate: 'date',
        dueDate: 'date'
      },
      extraction: {
        patterns: [
          /(?:task|deliverable|work item|story|ticket)\s*:?\s*([^,.]+)/gi,
          /(?:need to|must|should|TODO|FIXME)\s+([^,.]+)/gi,
          /([A-Z][A-Za-z\s]+)\s+(?:task|item|work)/gi
        ],
        indicators: ['task', 'deliverable', 'work', 'story', 'ticket', 'item'],
        contextClues: ['assigned', 'working on', 'complete', 'finish'],
        minConfidence: 0.6
      },
      relationships: {
        NEEDS: {
          name: 'NEEDS',
          displayName: 'Requires Skill',
          description: 'Task requires a specific skill to complete',
          targetEntityTypes: ['Skill'],
          semantics: {
            verb: 'needs',
            inverseVerb: 'needed for',
            context: 'requirement'
          },
          multiple: true
        },
        PART_OF: {
          name: 'PART_OF',
          displayName: 'Part Of',
          description: 'Task is part of a project',
          targetEntityTypes: ['Project'],
          semantics: {
            verb: 'is part of',
            inverseVerb: 'includes',
            context: 'composition'
          }
        },
        DEPENDS_ON: {
          name: 'DEPENDS_ON',
          displayName: 'Depends On',
          description: 'Task depends on completion of another task',
          targetEntityTypes: ['Task'],
          semantics: {
            verb: 'depends on',
            inverseVerb: 'blocks',
            context: 'dependency'
          },
          multiple: true
        }
      }
    },

    Project: {
      displayName: 'Project',
      description: 'Project containing multiple tasks',
      requiredProperties: ['name'],
      optionalProperties: {
        description: 'string',
        status: 'string', // 'planning', 'active', 'completed', 'cancelled', 'on-hold'
        budget: 'number',
        startDate: 'date',
        endDate: 'date',
        client: 'string',
        priority: 'string'
      },
      extraction: {
        patterns: [
          /(?:project|initiative|program)\s*:?\s*([A-Z][A-Za-z\s]+)/gi,
          /([A-Z][A-Za-z\s]+)\s+(?:project|initiative)/gi
        ],
        indicators: ['project', 'initiative', 'program', 'campaign'],
        contextClues: ['working on', 'assigned to', 'leading'],
        minConfidence: 0.8
      },
      relationships: {
        REQUIRES: {
          name: 'REQUIRES',
          displayName: 'Requires Skill',
          description: 'Project requires certain skills overall',
          targetEntityTypes: ['Skill'],
          semantics: {
            verb: 'requires',
            inverseVerb: 'required for',
            context: 'requirement'
          },
          multiple: true
        },
        MANAGED_BY: {
          name: 'MANAGED_BY',
          displayName: 'Managed By',
          description: 'Project is managed by a person',
          targetEntityTypes: ['Person'],
          semantics: {
            verb: 'managed by',
            inverseVerb: 'manages',
            context: 'management'
          }
        }
      }
    },

    Domain: {
      displayName: 'Domain',
      description: 'Domain or area of expertise (e.g., Data Science, Web Development)',
      requiredProperties: ['name'],
      optionalProperties: {
        description: 'string',
        popularity: 'number', // How popular/in-demand this domain is
        growth: 'string' // 'growing', 'stable', 'declining'
      },
      extraction: {
        patterns: [
          /(?:domain|area|field)\s+(?:of\s+)?([A-Z][A-Za-z\s]+)/gi,
          /(Data Science|Machine Learning|Web Development|DevOps|Backend|Frontend|Mobile|AI|Security)/gi
        ],
        indicators: ['domain', 'area', 'field', 'specialty', 'discipline'],
        minConfidence: 0.7
      }
    },

    Company: {
      displayName: 'Company',
      description: 'Client company or organization',
      requiredProperties: ['name'],
      optionalProperties: {
        industry: 'string',
        size: 'string', // 'startup', 'small', 'medium', 'large', 'enterprise'
        location: 'string',
        contractValue: 'number'
      },
      extraction: {
        patterns: createEntityPatterns({ companies: true }),
        indicators: ['client', 'company', 'organization', 'business', 'corp'],
        contextClues: ['contract with', 'working for', 'client'],
        minConfidence: 0.8
      },
      relationships: {
        SPONSORS: {
          name: 'SPONSORS',
          displayName: 'Sponsors',
          description: 'Company sponsors/funds a project',
          targetEntityTypes: ['Project'],
          semantics: {
            verb: 'sponsors',
            inverseVerb: 'sponsored by',
            context: 'funding'
          },
          multiple: true
        }
      }
    }
  },

  relationshipTypes: {
    MENTORS: {
      displayName: 'Mentors',
      description: 'One person mentors another',
      targetEntityTypes: ['Person'],
      semantics: {
        verb: 'mentors',
        inverseVerb: 'mentored by',
        context: 'professional development'
      },
      extraction: {
        patterns: [/(\w+)\s+mentors?\s+(\w+)/gi],
        verbs: ['mentors', 'coaches', 'guides', 'teaches']
      }
    },

    COLLABORATES_WITH: {
      displayName: 'Collaborates With',
      description: 'People who work together frequently',
      targetEntityTypes: ['Person'],
      semantics: {
        verb: 'collaborates with',
        context: 'teamwork',
        bidirectional: true
      },
      extraction: {
        patterns: [/(\w+)\s+(?:collaborates with|works with|partners with)\s+(\w+)/gi],
        verbs: ['collaborates', 'partners', 'teams up']
      }
    },

    SIMILAR_TO: {
      displayName: 'Similar To',
      description: 'Tasks or projects that are similar in nature',
      targetEntityTypes: ['Task', 'Project'],
      semantics: {
        verb: 'is similar to',
        context: 'similarity',
        bidirectional: true
      },
      extraction: {
        patterns: [/similar\s+to\s+([^,.]+)/gi],
        verbs: ['resembles', 'like', 'similar to']
      }
    },

    ALTERNATIVE_TO: {
      displayName: 'Alternative To',
      description: 'Skills that can substitute for each other',
      targetEntityTypes: ['Skill'],
      semantics: {
        verb: 'is alternative to',
        context: 'substitution',
        bidirectional: true
      },
      extraction: {
        patterns: [/alternative\s+to\s+([^,.]+)/gi],
        verbs: ['substitutes', 'replaces', 'alternative']
      }
    }
  }
});