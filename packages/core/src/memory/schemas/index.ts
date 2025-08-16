/**
 * Built-in knowledge schemas for common use cases
 */

export { customerSupportSchema } from './customer-support';
export { projectManagementSchema } from './project-management';
export { businessNetworkingSchema } from './business-networking';
export { researchSchema } from './research';

// Schema registry for easy access
export const BUILT_IN_SCHEMAS = {
  'customer-support': () => import('./customer-support').then(m => m.customerSupportSchema),
  'project-management': () => import('./project-management').then(m => m.projectManagementSchema),
  'business-networking': () => import('./business-networking').then(m => m.businessNetworkingSchema),
  'research': () => import('./research').then(m => m.researchSchema),
} as const;

export type BuiltInSchemaName = keyof typeof BUILT_IN_SCHEMAS;

/**
 * Load a built-in schema by name
 */
export async function loadBuiltInSchema(name: BuiltInSchemaName) {
  return await BUILT_IN_SCHEMAS[name]();
}