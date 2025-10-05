CompTable is using useMemo which is a nono and needs to be refactored w/out useMemo.
React v19.1 you no longer need to use useMemo/useCallback so I'm not sure why you decided to use it.
