# React 19.1 Optimization Guidelines

## Important: No useCallback or useMemo Required

React v19.1 includes built-in optimizations that make useCallback and useMemo unnecessary in most cases. The React Compiler automatically optimizes component re-renders and function references.

### Key Points:
- DO NOT USE useCallback for function memoization
- DO NOT USE useMemo for computed values
- React 19.1 handles these optimizations automatically
- Focus on clean, simple code without manual optimization hooks

### Migration Strategy:
1. Remove all useCallback wrappers from functions
2. Remove all useMemo wrappers from computed values
3. Let React's built-in optimizations handle performance

This applies to all hooks in the project going forward.