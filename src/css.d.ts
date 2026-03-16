/**
 * CSS Modules declaration
 * Allows TypeScript to recognize .module.css imports
 */

declare module '*.module.css' {
  const content: Record<string, string>
  export default content
}
