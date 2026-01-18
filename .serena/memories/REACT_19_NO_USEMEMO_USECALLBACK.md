# React 19 - NO useMemo or useCallback

**Critical Rule**: This project uses React 19.1+ with the React Compiler (React Forget).

## DO NOT USE:
- `useMemo()`
- `useCallback()`

## Why:
React 19's compiler automatically handles memoization. Manual memoization:
1. Is unnecessary - the compiler does it better
2. Can interfere with compiler optimizations
3. Adds code bloat and maintenance burden

## Instead:
Just write plain JavaScript:

```typescript
// BAD - React 19
const sortedAgents = useMemo(() => 
  agents.sort((a, b) => b.total - a.total), 
  [agents]
);

// GOOD - React 19
const sortedAgents = agents.sort((a, b) => b.total - a.total);
```

```typescript
// BAD - React 19
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// GOOD - React 19
const handleClick = () => {
  doSomething(id);
};
```

## Reference:
- React 19 Compiler: https://react.dev/learn/react-compiler
- Project React version: 19.1+

## Date Added: 2026-01-17
